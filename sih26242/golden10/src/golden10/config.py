"""Configuration loader.

Reads TOML via stdlib ``tomllib`` (Python 3.11+). Every field has a default so the
project runs with no config file at all; ``config/default.toml`` documents and
overrides them.
"""

from __future__ import annotations

import os
import tomllib
from dataclasses import dataclass, field
from typing import Any

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(os.path.dirname(_HERE))


@dataclass
class DroneConfig:
    cruise_speed_mps: float = 12.0
    survey_altitude_agl_m: float = 60.0
    max_altitude_agl_m: float = 120.0  # hard geofence (400 ft AGL regulatory ceiling)
    hfov_deg: float = 62.0
    battery_capacity_wh: float = 33.3  # 6S 1500 mAh
    hover_power_w: float = 155.0
    induced_power_factor: float = 0.28
    payload_g: float = 350.0
    wind_mps: float = 6.0
    takeoff_s: float = 8.0
    transit_altitude_agl_m: float = 100.0
    rth_reserve_pct: float = 15.0  # MoCA trial condition: 15% energy reserve
    aft_reserve_pct: float = 5.0
    max_range_m: float = 95.0  # slant range to a usable detection


@dataclass
class RoverConfig:
    speed_dry_mps: float = 2.0
    speed_water_mps: float = 0.85
    speed_debris_mps: float = 0.55
    arrive_tolerance_m: float = 6.0
    payload_drop_s: float = 45.0


@dataclass
class SensorConfig:
    # Night is the whole thesis: RGB collapses, LWIR carries the mission.
    rgb_confidence_night: float = 0.28
    rgb_confidence_day: float = 0.86
    lwir_confidence_night: float = 0.93
    lwir_confidence_day: float = 0.81
    acoustic_confidence_submerged: float = 0.78
    acoustic_confidence_dry: float = 0.14
    detection_threshold: float = 0.55
    range_falloff_per_100m: float = 0.28
    false_positives_per_scan: float = 0.11


@dataclass
class NetConfig:
    cellular_baseline: float = 0.95
    towers_down: bool = True
    mesh_floor: float = 0.32
    mesh_degraded_at: float = 0.45
    max_queue: int = 400


@dataclass
class ScenarioConfig:
    name: str = "flood_village_night"
    bounds_m: tuple[float, float, float, float] = (-40.0, -40.0, 780.0, 620.0)
    is_night: bool = True
    ambient_c: float = 27.0
    baseline_t3_s: float = 1770.0  # 29.5 min, from published Indian highway/MEMS data
    seed: int = 20260930


@dataclass
class MissionConfig:
    dt_s: float = 1.0
    max_duration_s: float = 2400.0
    coverage_overlap: float = 0.80
    telemetry_stride: int = 3
    event_log_limit: int = 1200


@dataclass
class Config:
    drone: DroneConfig = field(default_factory=DroneConfig)
    rover: RoverConfig = field(default_factory=RoverConfig)
    sensors: SensorConfig = field(default_factory=SensorConfig)
    net: NetConfig = field(default_factory=NetConfig)
    scenario: ScenarioConfig = field(default_factory=ScenarioConfig)
    mission: MissionConfig = field(default_factory=MissionConfig)
    origin_lat: float = 18.3256  # Alluri Sitarama Raju district, AP - tribal hill terrain
    origin_lon: float = 82.8785
    source_path: str | None = None


def _sub(obj: Any, data: dict[str, Any]) -> Any:
    for k, v in data.items():
        if not hasattr(obj, k):
            raise KeyError(f"unknown config key '{k}' for {type(obj).__name__}")
        cur = getattr(obj, k)
        if isinstance(cur, tuple) and isinstance(v, list):
            v = tuple(v)
        setattr(obj, k, v)
    return obj


def load_config(path: str | os.PathLike[str] | None = None) -> Config:
    cfg = Config()
    if path is None:
        default = os.path.join(_ROOT, "config", "default.toml")
        if not os.path.exists(default):
            return cfg
        path = default
    with open(path, "rb") as fh:
        raw = tomllib.load(fh)
    for name in ("drone", "rover", "sensors", "net", "scenario", "mission"):
        if name in raw:
            setattr(cfg, name, _sub(getattr(cfg, name), raw[name]))
    for key in ("origin_lat", "origin_lon"):
        if key in raw:
            setattr(cfg, key, float(raw[key]))
    cfg.source_path = str(path)
    return cfg
