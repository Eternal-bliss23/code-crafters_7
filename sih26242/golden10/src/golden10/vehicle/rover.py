"""Rover - the last 50 metres.

Follows the drone's cached breadcrumbs across terrain that ends ground vehicles:
standing water, mud and landslide debris. Carries the heavy kit the drone cannot,
then holds position as a comms node so a human responder can be guided in.

Autonomy scope is deliberately narrow: follow, arrive, drop, relay. It does not
explore. A scoped-down ground agent that demonstrably works beats an ambitious one
that does not.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

from ..config import Config
from ..scenario import Scenario, TerrainCell
from ..types import Breadcrumb, RoverMode, Urgency, Vec2


@dataclass
class RoverFaults:
    traction_factor: float = 1.0
    disable_amphibious: bool = False


class Rover:
    name = "Rover"

    def __init__(
        self,
        cfg: Config,
        scenario: Scenario,
        faults: RoverFaults | None = None,
    ):
        self.cfg = cfg
        self.rc = cfg.rover
        self.scenario = scenario
        self.faults = faults or RoverFaults()

        self.pos = Vec2(0.0, 0.0)
        self.lz = Vec2(0.0, 0.0)
        self.mode = RoverMode.STAGED
        self.trail: list[Vec2] = []
        self.trail.append(self.pos)
        self.target: Breadcrumb | None = None
        self.speed_mps = 0.0
        self.arrived_at: float | None = None
        self.t_s = 0.0
        self.distance_m = 0.0
        self.manifest_g = 1450.0  # defib, trauma shears, splints, tourniquet, blood unit
        self.delivered: list[str] = []
        self.blocked_reason: str | None = None
        self.relaying = False

    def set_lz(self, p: Vec2) -> None:
        self.lz = p
        self.pos = p
        self.trail = [p]

    # ------------------------------------------------------------------
    def assign(self, bc: Breadcrumb) -> bool:
        """Accept a drone handoff. Refuses to chase a lower priority than an
        active assignment - the rover is single-purpose, not a queue."""
        if self.mode in (RoverMode.ON_SCENE, RoverMode.RELAY):
            return False
        if self.target is not None and int(self.target.urgency) < int(bc.urgency):
            return False
        self.target = bc
        self.mode = RoverMode.FOLLOWING
        self.relaying = True  # relays the drone's mesh link while it moves
        return True

    # ------------------------------------------------------------------
    def terrain_speed(self, cell: TerrainCell) -> float:
        if self.faults.disable_amphibious and cell.kind == "water":
            self.blocked_reason = "floodwater impassable (traction fault)"
            return 0.0
        base = {
            "dry": self.rc.speed_dry_mps,
            "water": self.rc.speed_water_mps,
            "debris": self.rc.speed_debris_mps,
        }.get(cell.kind, self.rc.speed_dry_mps)
        return base * cell.rover_speed_factor * self.faults.traction_factor

    def step(self, dt_s: float) -> None:
        self.t_s += dt_s
        if self.mode in (RoverMode.STAGED, RoverMode.ON_SCENE, RoverMode.RELAY):
            self.speed_mps = 0.0
            if self.mode is RoverMode.ON_SCENE and self.t_s - (self.arrived_at or 0) > 240:
                # Hold the node, then go back for the next breadcrumb.
                self.mode = RoverMode.RETURNING
                self.target = None
            return

        if self.target is None:
            self.mode = RoverMode.STAGED
            return

        cell = self.scenario.terrain_at(self.pos)
        speed = self.terrain_speed(cell)
        self.blocked_reason = None if speed > 0 else self.blocked_reason

        goal = self.target.pos
        d = self.pos.dist(goal)

        if d <= self.rc.arrive_tolerance_m:
            self.mode = RoverMode.ON_SCENE
            self.arrived_at = self.t_s
            self.speed_mps = 0.0
            self.delivered.append(self.target.detection_id)
            self.manifest_g = max(0.0, self.manifest_g - 520.0)
            return

        if speed <= 0.0:
            self.speed_mps = 0.0
            return

        step_m = min(speed * dt_s, d)
        rad = math.atan2(goal.x - self.pos.x, goal.y - self.pos.y)
        self.pos = Vec2(
            self.pos.x + math.sin(rad) * step_m,
            self.pos.y + math.cos(rad) * step_m,
        )
        self.distance_m += step_m
        self.trail.append(self.pos)
        self.speed_mps = speed

    # ------------------------------------------------------------------
    def terrain_underfoot(self) -> str:
        return self.scenario.terrain_at(self.pos).kind

    @property
    def handoff_complete(self) -> bool:
        return self.mode is RoverMode.ON_SCENE
