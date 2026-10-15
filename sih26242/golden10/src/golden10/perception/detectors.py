"""Detector backends.

``Detector`` is the seam between simulation and reality. The synthetic backend is a
ground-truth-driven sensor simulator so the whole mission runs with zero hardware.
``UltralyticsDetector`` is the real path: drop in weights and a live RGB + LWIR feed
and the rest of the stack is unchanged.

The synthetic backend models the physics that actually matters at 02:14 in rain:
RGB collapses, LWIR carries the mission, and acoustic only helps on submerged targets.
"""

from __future__ import annotations

import math
import random
from typing import Protocol, Sequence

from ..config import Config
from ..geo import swath_width_m
from ..scenario import Scenario
from ..types import RawDetection, Vec2, Victim

SOURCES = ("rgb", "lwir", "acoustic")


class Detector(Protocol):
    def detect(
        self,
        drone_pos: Vec2,
        altitude_agl_m: float,
        t_s: float,
    ) -> list[RawDetection]:
        ...


class SyntheticDetector:
    """Physics-grounded sensor simulator over the digital twin's ground truth.

    Not a detector in the ML sense - it is the oracle a real detector is trained to
    approximate. It deliberately reproduces the three effects that make the night
    problem hard: RGB signal collapse, thermal-contrast loss under water, and
    transient sensor noise that persistence filtering must reject.
    """

    def __init__(self, cfg: Config, scenario: Scenario):
        self.cfg = cfg
        self.scenario = scenario
        self.rng = random.Random(cfg.scenario.seed ^ 0x5EED)
        self.noise = cfg.sensors.range_falloff_per_100m
        self._revealed: set[str] = set()
        self.scans = 0

    # -- per-source physics -------------------------------------------------
    def _rgb_confidence(self, v: Victim, slant_m: float) -> float:
        base = (
            self.cfg.sensors.rgb_confidence_night
            if self.scenario.env["is_night"]
            else self.cfg.sensors.rgb_confidence_day
        )
        # Rain and darkness are compounding losses for a visible-light camera.
        base *= 1.0 - 0.004 * self.scenario.env["rain_mmph"]
        return max(0.0, min(1.0, base))

    def _lwir_confidence(self, v: Victim, slant_m: float) -> float:
        base = (
            self.cfg.sensors.lwir_confidence_night
            if self.scenario.env["is_night"]
            else self.cfg.sensors.lwir_confidence_day
        )
        # Water is nearly transparent in LWIR: contrast collapses with submersion.
        contrast = max(0.15, min(1.0, v.thermal_delta_c / 7.0))
        return max(0.0, min(1.0, base * (0.45 + 0.55 * contrast)))

    def _acoustic_confidence(self, v: Victim, slant_m: float) -> float:
        cfg = self.cfg.sensors
        if v.submersion >= 0.30 or v.motion >= 0.55:
            base = cfg.acoustic_confidence_submerged
        else:
            base = cfg.acoustic_confidence_dry
        # A drowning victim's struggling is far easier to hear than a still body.
        if v.submersion > 0.5:
            base *= 0.6 + 0.8 * v.motion
        # Rain is broadband noise; it masks the acoustic channel hard.
        base *= max(0.25, 1.0 - 0.012 * self.scenario.env["rain_mmph"])
        return max(0.0, min(1.0, base))

    def _range_penalty(self, slant_m: float) -> float:
        return max(0.05, 1.0 - self.noise * (slant_m / 100.0))

    def _in_swath(self, v: Victim, drone_pos: Vec2, half_swath: float) -> bool:
        return abs(v.pos.x - drone_pos.x) <= half_swath

    # -- main ---------------------------------------------------------------
    def detect(
        self,
        drone_pos: Vec2,
        altitude_agl_m: float,
        t_s: float,
    ) -> list[RawDetection]:
        self.scans += 1
        half_swath = swath_width_m(altitude_agl_m, self.cfg.drone.hfov_deg) / 2.0
        out: list[RawDetection] = []
        max_r = self.cfg.drone.max_range_m

        for v in self.scenario.victims:
            if v.vid in self._revealed:
                # Thermal reacquisition: after a first lock the tracker holds it,
                # but subsequent frames are slightly noisier (intermittent dropouts).
                continue
            if not self._in_swath(v, drone_pos, half_swath):
                continue
            slant = math.hypot(v.pos.x - drone_pos.x, v.pos.y - drone_pos.y, altitude_agl_m)
            if slant > max_r:
                continue

            pen = self._range_penalty(slant)
            fired: dict[str, float] = {}

            p_rgb = self._rgb_confidence(v, slant) * pen
            if self.rng.random() < p_rgb:
                fired["rgb"] = p_rgb

            p_lwir = self._lwir_confidence(v, slant) * pen
            if self.rng.random() < p_lwir:
                fired["lwir"] = p_lwir

            p_acu = self._acoustic_confidence(v, slant) * pen
            if self.rng.random() < p_acu:
                fired["acoustic"] = p_acu

            if fired:
                # Small geolocation error grows with slant range.
                jitter = 0.8 + 0.035 * slant
                pos = Vec2(
                    v.pos.x + self.rng.gauss(0.0, jitter),
                    v.pos.y + self.rng.gauss(0.0, jitter),
                )
                for src, conf in fired.items():
                    out.append(RawDetection(src, pos, min(1.0, conf), slant, t_s))

            if fired and max(fired.values()) >= self.cfg.sensors.detection_threshold:
                self._revealed.add(v.vid)

        out.extend(self._inject_noise(drone_pos, altitude_agl_m, half_swath, t_s, max_r))
        return out

    def _inject_noise(
        self,
        drone_pos: Vec2,
        altitude_agl_m: float,
        half_swath: float,
        t_s: float,
        max_r: float,
    ) -> list[RawDetection]:
        """Transient single-source false positives: hot exhausts, rain-streaked
        reflections, wind-blown debris. Always single-channel, never persistent -
        which is precisely what the fusion tracker's persistence filter exists to kill."""
        n_expected = self.cfg.sensors.false_positives_per_scan
        if self.rng.random() > n_expected:
            return []
        x0, y0, x1, y1 = self.scenario.bounds
        pos = Vec2(self.rng.uniform(x0, x1), self.rng.uniform(y0, y1))
        if pos.dist(drone_pos) > max_r:
            return []
        # Noise lands at or just under the promotion threshold - a hard case, not a gift.
        conf = self.rng.uniform(0.44, 0.72)
        src = self.rng.choices(("lwir", "rgb", "acoustic"), weights=(0.6, 0.25, 0.15))[0]
        return [RawDetection(src, pos, conf, pos.dist(drone_pos), t_s)]


class UltralyticsDetector:
    """Real path. Same interface as SyntheticDetector.

    Usage on hardware:
        det = UltralyticsDetector(cfg, weights="kite-lwir-int8.pt")
        raw = det.detect(rgb_frame=frame_rgb, lwir_frame=frame_lwir, pose=pose)
    """

    def __init__(self, cfg: Config, weights: str = "kite-lwir-int8.pt", device: str = "cpu"):
        try:
            from ultralytics import YOLO  # type: ignore
        except ImportError as exc:  # pragma: no cover - optional dependency
            raise RuntimeError(
                "ultralytics is not installed. `pip install ultralytics` or use "
                "SyntheticDetector for simulation."
            ) from exc
        self.cfg = cfg
        self.model = YOLO(weights)
        self.device = device

    def detect(  # type: ignore[override]
        self,
        drone_pos: Vec2,
        altitude_agl_m: float,
        t_s: float,
    ) -> list[RawDetection]:
        raise NotImplementedError(
            "UltralyticsDetector.detect requires an attached camera pipeline; "
            "see README 'Swapping in the real detector'."
        )


def build_detector(cfg: Config, scenario: Scenario, mode: str = "synthetic") -> Detector:
    if mode == "synthetic":
        return SyntheticDetector(cfg, scenario)
    if mode == "ultralytics":
        return UltralyticsDetector(cfg)
    raise ValueError(f"unknown detector mode: {mode!r}")
