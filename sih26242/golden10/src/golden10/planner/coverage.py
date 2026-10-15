"""Coverage-path planning and the airframe energy model.

The planning objective is deliberately not "cover everything". It is
**victims reached per minute of flight**, so the search order is nearest-line-first
and the mission ends the moment the energy reserve rule says it must.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Iterator

from ..config import DroneConfig, MissionConfig
from ..geo import bearing_deg, swath_width_m
from ..types import Vec2


@dataclass
class Leg:
    waypoint: Vec2
    kind: str  # "survey" | "turn" | "transit" | "rth"
    target_altitude_agl_m: float = 0.0
    arrive_radius_m: float = 6.0


@dataclass
class CoveragePlan:
    legs: list[Leg]
    swath_m: float
    line_spacing_m: float
    lines: int
    planned_area_m2: float
    estimated_duration_s: float

    def __iter__(self) -> Iterator[Leg]:
        return iter(self.legs)

    def __len__(self) -> int:
        return len(self.legs)


def plan_coverage(
    bounds: tuple[float, float, float, float],
    drone: DroneConfig,
    mission: MissionConfig,
    lz: Vec2,
) -> CoveragePlan:
    """Lawnmower coverage over the search box, ordered nearest-leg-first.

    Nearest-first matters: the golden-hour claim is about the *first* critical victim,
    not about finishing the grid. Sweeping outward from the launch zone reaches the
    likely-near casualty cluster first.
    """
    x0, y0, x1, y1 = bounds
    alt = drone.survey_altitude_agl_m
    swath = swath_width_m(alt, drone.hfov_deg)
    spacing = swath * (1.0 - mission.coverage_overlap)

    legs: list[Leg] = []

    # Launch and climb.
    legs.append(Leg(Vec2(lz.x + 1.0, lz.y + 1.0), "takeoff", 0.0, 4.0))
    legs.append(Leg(lz, "transit", drone.transit_altitude_agl_m, 8.0))

    rows: list[float] = []
    n_rows = max(1, int(math.floor((y1 - y0) / spacing)) + 1)
    for i in range(n_rows):
        rows.append(y0 + i * spacing)

    # Distance of each row's nearest point from the LZ, used for outward sweep order.
    def row_rank(y: float) -> float:
        near_x = min(max(lz.x, x0), x1)
        return math.hypot(near_x - lz.x, y - lz.y)

    order = sorted(range(len(rows)), key=lambda i: (row_rank(rows[i]), i))

    sweep_time = 0.0
    for seq, i in enumerate(order):
        y = rows[i]
        if seq % 2 == 0:  # boustrophedon: alternate sweep direction, no long returns
            start, end = Vec2(x0, y), Vec2(x1, y)
        else:
            start, end = Vec2(x1, y), Vec2(x0, y)

        if legs and legs[-1].kind == "survey":
            legs.append(Leg(start, "turn", alt, 10.0))
            sweep_time += 10.0
        legs.append(Leg(end, "survey", alt, 8.0))
        sweep_time += start.dist(end) / drone.cruise_speed_mps

    legs.append(Leg(lz, "rth", drone.transit_altitude_agl_m, 8.0))
    sweep_time += x1 / drone.cruise_speed_mps

    planned_area = len(rows) * swath * (x1 - x0)

    return CoveragePlan(
        legs=legs,
        swath_m=swath,
        line_spacing_m=spacing,
        lines=len(rows),
        planned_area_m2=planned_area,
        estimated_duration_s=sweep_time,
    )


# ----------------------------------------------------------------------
class EnergyModel:
    """Physics-flavoured power draw for a ~450 mm quadcopter.

    P = P_hover * (1 + k*v^2) * (1 + m_payload/m_max) * (1 + wind term)
    Energy integrates power into a battery state of charge.
    """

    def __init__(self, drone: DroneConfig, drain_multiplier: float = 1.0):
        self.cfg = drone
        self.capacity_wh = drone.battery_capacity_wh
        self.energy_wh = drone.battery_capacity_wh
        self.max_payload_g = 2500.0
        self.drain_multiplier = drain_multiplier

    @property
    def soc_pct(self) -> float:
        return 100.0 * self.energy_wh / self.capacity_wh

    def power_w(self, speed_mps: float, altitude_agl_m: float, payload_g: float) -> float:
        p = self.cfg.hover_power_w
        v_ratio = speed_mps / max(1e-6, self.cfg.cruise_speed_mps)
        p *= 1.0 + self.cfg.induced_power_factor * v_ratio**2
        p *= 1.0 + 0.62 * (payload_g / self.max_payload_g)
        # Wind and rain: the monsoon multiplier that ends flights.
        p *= 1.0 + 0.055 * max(0.0, self.cfg.wind_mps - 4.0) ** 1.25
        p *= 1.0 + 0.004 * altitude_agl_m / 60.0
        return p

    def step(self, dt_s: float, speed_mps: float, altitude_agl_m: float, payload_g: float) -> float:
        """Advance the battery. Returns power drawn during the step (W)."""
        p = self.power_w(speed_mps, altitude_agl_m, payload_g)
        self.energy_wh = max(
            0.0, self.energy_wh - p * self.drain_multiplier * dt_s / 3600.0
        )
        return p

    def can_fly(self, reserve_pct: float) -> bool:
        return self.soc_pct > reserve_pct

    def endurance_s(self, speed_mps: float, altitude_agl_m: float, payload_g: float) -> float:
        usable_wh = self.capacity_wh * (1.0 - reserve_pct / 100.0)
        p = self.power_w(speed_mps, altitude_agl_m, payload_g)
        return 3600.0 * usable_wh / max(1e-6, p)

    def consumed_pct(self) -> float:
        return 100.0 * (1.0 - self.energy_wh / self.capacity_wh)
