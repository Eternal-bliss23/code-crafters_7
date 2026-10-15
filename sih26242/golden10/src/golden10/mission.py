"""Mission orchestrator.

Runs the full loop: plan -> fly -> sense -> fuse -> triage -> handoff -> deliver -> audit.

The headline output is T3, the time from an emergency call to a responder's kit being
on the ground beside the patient. T3 is the stage that a helicopter or ambulance
spends most of the golden hour on, and the only stage this system is trying to move.
"""

from __future__ import annotations

import itertools
from datetime import datetime, timezone
from typing import Callable

from .compliance.rules import ComplianceEngine
from .config import Config
from .net.mesh import MeshLink, NetFaults
from .perception.detectors import SyntheticDetector, build_detector
from .perception.fusion import FusionTracker
from .planner.coverage import plan_coverage
from .scenario import Scenario
from .types import (
    Breadcrumb,
    Detection,
    FlightMode,
    LinkMode,
    MissionEvent,
    MissionMetrics,
    MissionResult,
    RoverMode,
    Telemetry,
    Urgency,
    Vec2,
)
from .vehicle.drone import DroneFaults, Kite
from .vehicle.rover import Rover, RoverFaults

ProgressFn = Callable[[MissionResult], None]

_mission_ids = itertools.count(1)


class Mission:
    def __init__(
        self,
        cfg: Config,
        scenario: Scenario | None = None,
        detector_mode: str = "synthetic",
        drone_faults: DroneFaults | None = None,
        rover_faults: RoverFaults | None = None,
        net_faults: NetFaults | None = None,
        claims_bvlos: bool = False,
        label: str = "",
    ):
        self.cfg = cfg
        self.scenario = scenario or Scenario(cfg)
        self.claims_bvlos = claims_bvlos
        self.label = label or self.scenario.name

        self.plan = plan_coverage(self.scenario.bounds, cfg.drone, cfg.mission, Vec2(0.0, 0.0))
        self.drone = Kite(cfg, self.plan, drone_faults)
        self.rover = Rover(cfg, self.scenario, rover_faults)
        self.detector = build_detector(cfg, self.scenario, detector_mode)
        self.fusion = FusionTracker(cfg, truth=self.scenario.victims)
        self.mesh = MeshLink(cfg, net_faults)
        self.compliance = ComplianceEngine(cfg)

        lz = Vec2(0.0, 0.0)
        self.drone.set_lz(lz)
        self.rover.set_lz(lz)

        self.result = MissionResult(
            mission_id=f"G10-{next(_mission_ids):04d}",
            scenario=self.label,
            started_iso=datetime.now(timezone.utc).isoformat(timespec="seconds"),
            lz=lz,
            bounds=self.scenario.bounds,
        )
        self.result.metrics.t3_baseline_s = cfg.scenario.baseline_t3_s
        self.result.metrics.victims_total = len(self.scenario.victims)

        self.t_s = 0.0
        self._telemetry_accum = 0
        self._micro_payload_g = cfg.drone.payload_g
        self._kits_cached = 0
        self._first_kit_cached_s: float | None = None
        self._rover_assigned: Breadcrumb | None = None
        self._delivered_detections: set[str] = set()
        self._stop = False

    # ------------------------------------------------------------------
    def log(self, channel: str, message: str, level: str = "info") -> None:
        self.result.events.append(MissionEvent(self.t_s, channel, message, level))

    # ------------------------------------------------------------------
    def run(self, progress: ProgressFn | None = None) -> MissionResult:
        self.log(
            "system",
            f"{self.label} | local time {self.scenario.env['local_time']} | "
            f"rain {self.scenario.env['rain_mmph']} mph | wind {self.cfg.drone.wind_mps} m/s | "
            f"cellular {'DOWN' if self.cfg.net.towers_down else 'up'}",
        )
        self.log(
            "air",
            f"coverage plan: {self.plan.lines} lines, swath {self.plan.swath_m:.0f} m, "
            f"spacing {self.plan.line_spacing_m:.0f} m, est {self.plan.estimated_duration_s/60:.1f} min",
        )
        self.log(
            "system",
            f"baseline T3 for this scenario: {self.cfg.scenario.baseline_t3_s/60:.1f} min "
            f"(published Indian highway/MEMS ambulance data)",
        )
        self.compliance.check_vmc(0.0, self.scenario.env["is_night"])
        self.compliance.manifest(claims_bvlos=self.claims_bvlos)

        dt = self.cfg.mission.dt_s
        while self.t_s < self.cfg.mission.max_duration_s and not self._stop:
            self._tick(dt)
            if progress is not None and int(self.t_s) % 10 == 0:
                progress(self.result)

        self._finish()
        if progress is not None:
            progress(self.result)
        return self.result

    # ------------------------------------------------------------------
    def _tick(self, dt: float) -> None:
        self.t_s += dt

        pos = self.drone.step(dt)

        if self.drone.is_scanning and not self.drone.terminated:
            raws = self.detector.detect(pos, self.drone.altitude_m, self.t_s)
            for det in self.fusion.update(raws):
                self._on_detection(det)

        self.rover.step(dt)
        q = self.mesh.publish(self.t_s, self.drone.pos, self.rover.pos)
        self._relay_heartbeat(q)

        self._audit()
        self._record_telemetry(q)

        if self.drone.mode is FlightMode.LANDED and self.rover.mode in (
            RoverMode.STAGED,
            RoverMode.ON_SCENE,
            RoverMode.RELAY,
        ):
            self._stop = True

    # ------------------------------------------------------------------
    def _on_detection(self, det: Detection) -> None:
        self.mesh.enqueue({"t_s": self.t_s, "kind": "detection", "detection": det.to_json()})
        self.log(
            "perception",
            f"{det.did} {'!FALSE POSITIVE' if det.false_positive else 'confirmed'} "
            f"conf {det.confidence:.2f} via {'+'.join(det.sources)} "
            f"-> {det.urgency.label} at ({det.pos.x:.0f}, {det.pos.y:.0f}) m",
            "warn" if det.false_positive else "info",
        )

        if det.urgency not in (Urgency.CRITICAL, Urgency.URGENT):
            return
        if self.result.metrics.first_detect_s is None:
            self.result.metrics.first_detect_s = self.t_s
            self.log(
                "system",
                f"FIRST PRIORITY DETECTION at t={self.t_s/60:.1f} min - "
                f"{self.t_s/60:.1f} min versus a {self.cfg.scenario.baseline_t3_s/60:.1f} min baseline",
            )

        # The drone caches a micro-kit wherever it is overhead. Cheap, immediate,
        # and it does not consume the rover's single heavy run.
        if self._micro_payload_g >= 250.0:
            self._micro_payload_g -= 250.0
            self.drone.deploy_payload(250.0)
            self._kits_cached += 1
            if self._first_kit_cached_s is None:
                self._first_kit_cached_s = self.t_s
            self.log(
                "air",
                f"micro-kit cached at {det.did} "
                f"(t={self.t_s/60:.1f} min) - trauma shears, tourniquet, thermal blanket, ORS",
            )

        # The rover makes exactly one heavy run, to the highest-priority target.
        if self._rover_assigned is None or int(det.urgency) < int(self._rover_assigned.urgency):
            if self.rover.mode in (RoverMode.RETURNING,):
                self.rover.mode = RoverMode.STAGED
            bc = Breadcrumb(
                detection_id=det.did,
                pos=det.pos,
                urgency=det.urgency,
                t_s=self.t_s,
            )
            if self.rover.assign(bc):
                self._rover_assigned = bc
                self.log(
                    "ground",
                    f"handoff accepted: rover tasked to {det.did} ({det.urgency.label}), "
                    f"{bc.pos.dist(self.rover.pos):.0f} m over "
                    f"{self.rover.scenario.terrain_at(bc.pos).kind} - "
                    f"carrying defibrillator and blood unit",
                )
            elif self._rover_assigned is not None:
                self.log(
                    "ground",
                    f"{det.did} is {det.urgency.label} but the rover is committed to "
                    f"{self._rover_assigned.detection_id}; micro-kit only",
                    "warn",
                )

    # ------------------------------------------------------------------
    def _relay_heartbeat(self, q: float) -> None:
        beat = {"t_s": self.t_s, "kind": "telemetry", "link_q": round(q, 3)}
        if self.mesh.mode in (LinkMode.STORE_FORWARD, LinkMode.DEGRADED):
            self.mesh.enqueue(beat)
        elif self.t_s % 15 == 0:
            self.mesh.delivered += 1

    def _audit(self) -> None:
        airborne = self.drone.altitude_m > 0.5 and not self.drone.terminated
        self.compliance.check_altitude(self.t_s, self.drone.altitude_m)
        self.compliance.check_energy(self.t_s, self.drone.soc_pct, airborne)
        self.compliance.check_safety_functions(
            self.t_s,
            airborne,
            rth_armed=not self.drone.faults.disable_rth,
            aft_armed=not self.drone.faults.disable_aft,
        )

    def _record_telemetry(self, q: float) -> None:
        self._telemetry_accum += 1
        if self._telemetry_accum < self.cfg.mission.telemetry_stride:
            return
        self._telemetry_accum = 0
        t = Telemetry(
            t_s=self.t_s,
            drone_pos=self.drone.pos,
            rover_pos=self.rover.pos,
            altitude_agl_m=self.drone.altitude_m,
            battery_pct=self.drone.soc_pct,
            flight_mode=self.drone.mode,
            rover_mode=self.rover.mode,
            heading_deg=self.drone.heading_deg,
            speed_mps=self.drone.speed_mps,
            ground_speed_mps=self.rover.speed_mps,
            swath_m=self.drone.swath_m,
            link_quality=q,
            link_mode=self.mesh.mode,
            queue_depth=len(self.mesh.queue),
            violations=self.compliance.violation_count,
        )
        self.result.telemetry.append(t)
        self.result.drone_track.append((self.drone.pos.x, self.drone.pos.y))
        if self.rover.speed_mps > 0:
            self.result.rover_track.append((self.rover.pos.x, self.rover.pos.y))

        if self.rover.mode is RoverMode.ON_SCENE and self._rover_assigned is not None:
            did = self._rover_assigned.detection_id
            if did not in self._delivered_detections:
                self._delivered_detections.add(did)
                if self.result.metrics.t3_golden10_s is None:
                    self.result.metrics.t3_golden10_s = self.rover.arrived_at or self.t_s
                    m = self.result.metrics
                    self.log(
                        "system",
                        f"T3 = {m.t3_golden10_s/60:.1f} min versus {m.t3_baseline_s/60:.1f} min baseline "
                        f"-> {m.t3_baseline_s/m.t3_golden10_s:.1f}x faster, "
                        f"{(m.t3_baseline_s-m.t3_golden10_s)/60:.1f} min saved",
                    )
                self.log(
                    "ground",
                    f"kit on scene at {did} at t={self.t_s/60:.1f} min; rover now a comms relay node",
                )

    # ------------------------------------------------------------------
    def _finish(self) -> None:
        r = self.result
        m = r.metrics
        m.search_complete_s = self.t_s
        m.distance_flown_m = self.drone.distance_flown_m
        m.distance_rover_m = self.rover.distance_m
        m.energy_used_pct = self.drone.energy.consumed_pct()
        m.final_battery_pct = self.drone.soc_pct
        m.kits_cached = self._kits_cached
        m.min_link_quality = self.mesh.min_quality
        m.comms_degraded_pct = self.mesh.degraded_fraction * 100.0
        m.store_forward_peak = self.mesh.peak_queue
        m.events_delivered = self.mesh.delivered
        m.events_retained = self.mesh.events_retained
        m.total_violations = self.compliance.violation_count

        dets = self.fusion.detections
        tp = sum(1 for d in dets if not d.false_positive)
        m.false_positives = len(dets) - tp
        m.victims_found = len({d.matched_victim_id for d in dets if d.matched_victim_id})
        m.victims_kit_delivered = len(self._delivered_detections)
        m.recall = m.victims_found / m.victims_total if m.victims_total else 0.0
        m.precision = tp / len(dets) if dets else 0.0

        r.detections = dets
        r.compliance = self.compliance.events
        r.metrics = m

        if self.drone.violations:
            for v in self.drone.violations:
                r.events.append(MissionEvent(self.t_s, "air", f"AIRFRAME GUARD: {v}", "warn"))
        r.notes.append(
            f"{len(self.scenario.victims)} people in scenario; {m.victims_found} located, "
            f"{m.victims_kit_delivered} heavy-kit delivery, {m.kits_cached} micro-kits cached"
        )
        r.notes.append(
            f"link min quality {m.min_link_quality:.2f}; {m.comms_degraded_pct:.0f}% of mission in "
            f"degraded mode; {m.events_delivered} events transmitted, "
            f"{m.events_retained - m.events_delivered} held on device and queued for sync"
        )
        r.notes.append(
            "Triage output is decision support for a human operator. It is not a diagnosis "
            "and not a substitute for a licensed clinician. Not a certified medical device."
        )
        self.log("system", "mission complete", "info")
