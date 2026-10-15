"""GOLDEN-10 core data types.

All geometry uses a local East-North-Up (ENU) frame in metres, origin at the
staging point / launch zone (LZ). Conversions to lat/lon happen only for display.
"""

from __future__ import annotations

import math
import time
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Any


def now_ms() -> float:
    return time.time() * 1000.0


class Urgency(int, Enum):
    """Decision-support bands. This ranks observable state. It does NOT diagnose."""

    ROUTINE = 4
    SERIOUS = 3
    URGENT = 2
    CRITICAL = 1

    @property
    def label(self) -> str:
        return {
            Urgency.ROUTINE: "P4 routine",
            Urgency.SERIOUS: "P3 serious",
            Urgency.URGENT: "P2 urgent",
            Urgency.CRITICAL: "P1 critical",
        }[self]


class FlightMode(str, Enum):
    IDLE = "idle"
    TAKEOFF = "takeoff"
    TRANSIT = "transit"
    SURVEY = "survey"
    RTH = "return-to-home"
    AFT = "automatic-flight-termination"
    LANDED = "landed"


class RoverMode(str, Enum):
    STAGED = "staged"
    FOLLOWING = "following-breadcrumbs"
    ON_SCENE = "on-scene"
    RELAY = "relay-node"
    RETURNING = "returning"


class LinkMode(str, Enum):
    CELLULAR = "cellular"
    MESH = "mesh"
    STORE_FORWARD = "store-and-forward"
    DEGRADED = "degraded-store-forward"


class Severity(str, Enum):
    INFO = "info"
    WARN = "warn"
    CRITICAL = "critical"


@dataclass(frozen=True)
class Vec2:
    """East (x) / North (y) in metres from LZ origin."""

    x: float
    y: float

    def dist(self, other: "Vec2") -> float:
        return math.hypot(self.x - other.x, self.y - other.y)

    def norm(self) -> float:
        return math.hypot(self.x, self.y)

    def as_tuple(self) -> tuple[float, float]:
        return (self.x, self.y)

    def __add__(self, o: "Vec2") -> "Vec2":
        return Vec2(self.x + o.x, self.y + o.y)

    def __sub__(self, o: "Vec2") -> "Vec2":
        return Vec2(self.x - o.x, self.y - o.y)

    def __mul__(self, k: float) -> "Vec2":
        return Vec2(self.x * k, self.y * k)


@dataclass
class Victim:
    """A person in need. All fields are *observable* physical state.

    ``thermal_delta_c``  temperature rise above ambient, from LWIR.
    ``motion``           0 = motionless, 1 = vigorous struggling.
    ``submersion``       0 = dry, 1 = fully submerged.
    ``responsiveness``   response to remote audio/light stimulus probe.
    """

    vid: str
    pos: Vec2
    label: str = ""
    submersion: float = 0.0
    motion: float = 0.5
    thermal_delta_c: float = 2.0
    responsiveness: float = 0.6
    terrain: str = "dry"

    @property
    def display(self) -> str:
        return self.label or self.vid


@dataclass
class TerrainCell:
    """Terrain lookup for the digital twin."""

    x0: float
    y0: float
    x1: float
    y1: float
    kind: str
    rover_speed_factor: float
    flood_depth_m: float = 0.0


@dataclass
class RawDetection:
    """One un-fused sensor hit."""

    source: str  # "rgb" | "lwir" | "acoustic"
    pos: Vec2
    confidence: float
    slant_range_m: float
    timestamp_s: float


@dataclass
class Detection:
    """A fused, geotagged victim candidate."""

    did: str
    pos: Vec2
    confidence: float
    sources: list[str]
    urgency: Urgency
    features: dict[str, Any]
    first_seen_s: float
    last_seen_s: float
    sightings: int = 1
    false_positive: bool = False
    matched_victim_id: str | None = None

    def to_json(self) -> dict[str, Any]:
        d = asdict(self)
        d["urgency"] = self.urgency.name
        d["urgency_label"] = self.urgency.label
        d["pos"] = {"x": self.pos.x, "y": self.pos.y}
        return d


@dataclass
class Telemetry:
    t_s: float
    drone_pos: Vec2
    rover_pos: Vec2
    altitude_agl_m: float
    battery_pct: float
    flight_mode: FlightMode
    rover_mode: RoverMode
    heading_deg: float
    speed_mps: float
    ground_speed_mps: float
    swath_m: float
    link_quality: float
    link_mode: LinkMode
    queue_depth: int
    violations: int


@dataclass
class ComplianceEvent:
    rule: str
    t_s: float
    severity: Severity
    passed: bool
    detail: str
    reference: str = ""

    def to_json(self) -> dict[str, Any]:
        return {
            "rule": self.rule,
            "t_s": round(self.t_s, 2),
            "severity": self.severity.name,
            "passed": self.passed,
            "detail": self.detail,
            "reference": self.reference,
        }


@dataclass
class MissionEvent:
    t_s: float
    channel: str  # "system" | "perception" | "air" | "ground" | "net" | "compliance"
    message: str
    level: str = "info"

    def to_json(self) -> dict[str, Any]:
        return {
            "t_s": round(self.t_s, 2),
            "channel": self.channel,
            "message": self.message,
            "level": self.level,
        }


@dataclass
class Breadcrumb:
    """Drone -> rover handoff token."""

    detection_id: str
    pos: Vec2
    urgency: Urgency
    t_s: float
    payload: str = "micro-kit"


@dataclass
class MissionMetrics:
    t3_golden10_s: float | None = None
    t3_baseline_s: float = 0.0
    first_detect_s: float | None = None
    search_complete_s: float | None = None
    victims_total: int = 0
    victims_found: int = 0
    victims_kit_delivered: int = 0
    kits_cached: int = 0
    recall: float = 0.0
    precision: float = 0.0
    false_positives: int = 0
    min_link_quality: float = 1.0
    comms_degraded_pct: float = 0.0
    store_forward_peak: int = 0
    events_delivered: int = 0
    events_retained: int = 0
    total_violations: int = 0
    distance_flown_m: float = 0.0
    distance_rover_m: float = 0.0
    energy_used_pct: float = 0.0
    final_battery_pct: float = 100.0

    def to_json(self) -> dict[str, Any]:
        d = asdict(self)
        for k, v in d.items():
            if isinstance(v, float):
                d[k] = round(v, 3)
        if self.t3_golden10_s is not None and self.t3_baseline_s:
            d["t3_speedup_x"] = round(self.t3_baseline_s / self.t3_golden10_s, 2)
            d["t3_saved_s"] = round(self.t3_baseline_s - self.t3_golden10_s, 1)
        return d


@dataclass
class MissionResult:
    mission_id: str
    scenario: str
    started_iso: str
    metrics: MissionMetrics = field(default_factory=MissionMetrics)
    detections: list[Detection] = field(default_factory=list)
    compliance: list[ComplianceEvent] = field(default_factory=list)
    events: list[MissionEvent] = field(default_factory=list)
    telemetry: list[Telemetry] = field(default_factory=list)
    drone_track: list[tuple[float, float]] = field(default_factory=list)
    rover_track: list[tuple[float, float]] = field(default_factory=list)
    lz: Vec2 = field(default_factory=lambda: Vec2(0.0, 0.0))
    bounds: tuple[float, float, float, float] = (0.0, 0.0, 800.0, 600.0)
    notes: list[str] = field(default_factory=list)

    def to_json(self, include_telemetry: bool = True) -> dict[str, Any]:
        out: dict[str, Any] = {
            "mission_id": self.mission_id,
            "scenario": self.scenario,
            "started_iso": self.started_iso,
            "metrics": self.metrics.to_json(),
            "detections": [d.to_json() for d in self.detections],
            "compliance": [c.to_json() for c in self.compliance],
            "events": [e.to_json() for e in self.events[-400:]],
            "drone_track": [[round(x, 1), round(y, 1)] for x, y in self.drone_track],
            "rover_track": [[round(x, 1), round(y, 1)] for x, y in self.rover_track],
            "lz": {"x": self.lz.x, "y": self.lz.y},
            "bounds": list(self.bounds),
            "notes": self.notes,
        }
        if include_telemetry:
            out["telemetry"] = [
                {
                    "t_s": round(t.t_s, 1),
                    "dx": round(t.drone_pos.x, 1),
                    "dy": round(t.drone_pos.y, 1),
                    "alt": round(t.altitude_agl_m, 1),
                    "batt": round(t.battery_pct, 2),
                    "mode": t.flight_mode.name,
                    "rx": round(t.rover_pos.x, 1),
                    "ry": round(t.rover_pos.y, 1),
                    "link": round(t.link_quality, 3),
                    "link_mode": t.link_mode.name,
                    "q": t.queue_depth,
                }
                for t in self.telemetry
            ]
        return out
