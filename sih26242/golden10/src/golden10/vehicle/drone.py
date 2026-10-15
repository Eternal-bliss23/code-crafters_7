"""Kite - the aerial scout.

State machine over a planned leg list, with the three safety behaviours the MoCA
trial SOPs actually require, implemented as *hardware-class* guards rather than
operator discipline:

  * hard geofence on altitude
  * mandatory 15% energy reserve -> return to home
  * automatic flight termination below a hard reserve floor

Fault injection hooks exist so the compliance engine can be tested against a
deliberately bad airframe - a violation count of zero is only meaningful if the
auditor would have caught one.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

from ..config import Config
from ..geo import bearing_deg, swath_width_m
from ..planner.coverage import CoveragePlan, EnergyModel, Leg
from ..types import FlightMode, Vec2


@dataclass
class DroneFaults:
    battery_bias: float = 1.0          # >1 drains faster
    altitude_bias_m: float = 0.0       # pushes the airframe past its fence
    disable_rth: bool = False          # simulates an airframe with no return-to-home
    disable_aft: bool = False
    wind_mps: float | None = None


class Kite:
    name = "Kite"

    def __init__(self, cfg: Config, plan: CoveragePlan, faults: DroneFaults | None = None):
        self.cfg = cfg
        self.dc = cfg.drone
        self.plan = plan
        self.faults = faults or DroneFaults()
        self.energy = EnergyModel(self.dc, drain_multiplier=self.faults.battery_bias)

        self.pos = Vec2(0.0, 0.0)
        self.lz = Vec2(0.0, 0.0)
        self.altitude_m = 0.0
        self.mode = FlightMode.IDLE
        self.speed_mps = 0.0
        self.heading_deg = 0.0
        self.leg_index = 0
        self.t_s = 0.0
        self.payload_g = 0.0
        self.distance_flown_m = 0.0
        self.terminated = False
        self.violations: list[str] = []
        self.transitions: list[tuple[float, FlightMode]] = []
        self._last_leg: Leg | None = None

    # ------------------------------------------------------------------
    @property
    def soc_pct(self) -> float:
        return self.energy.soc_pct

    @property
    def swath_m(self) -> float:
        return swath_width_m(max(1.0, self.altitude_m), self.dc.hfov_deg)

    @property
    def wind_mps(self) -> float:
        return self.faults.wind_mps if self.faults.wind_mps is not None else self.dc.wind_mps

    def set_lz(self, p: Vec2) -> None:
        self.lz = p
        self.pos = p

    # ------------------------------------------------------------------
    def step(self, dt_s: float) -> Vec2:
        """Advance one timestep. Returns the drone's ground position for sensing."""
        if self.terminated:
            self._descend(dt_s)
            return self.pos

        self.t_s += dt_s

        # --- safety guards run BEFORE any control input --------------------
        self._guard_geofence()
        self._guard_energy(dt_s)

        if self.terminated:
            self._descend(dt_s)
            return self.pos

        if self.mode is FlightMode.RTH:
            self._fly_home(dt_s)
        else:
            self._follow_plan(dt_s)

        return self.pos

    # ------------------------------------------------------------------
    def _follow_plan(self, dt_s: float) -> None:
        if self.leg_index >= len(self.plan.legs):
            self._enter(FlightMode.LANDED)
            self.speed_mps = 0.0
            return

        leg = self.plan.legs[self.leg_index]
        target_alt = leg.target_altitude_agl_m or self.dc.survey_altitude_agl_m

        # Climb / descend at a sane rate; altitude limit is enforced by the fence.
        climb_rate = 6.0
        if target_alt > self.altitude_m:
            self.altitude_m = min(target_alt, self.altitude_m + climb_rate * dt_s)
        else:
            self.altitude_m = max(target_alt, self.altitude_m - climb_rate * dt_s)

        target = leg.waypoint
        delta = target - self.pos
        dist = delta.norm()

        if dist <= leg.arrive_radius_m:
            self.leg_index += 1
            self._apply_leg_mode(leg)
            return

        want = bearing_deg(self.pos, target)
        self.heading_deg = self._turn_toward(want, dt_s, max_turn_degps=180.0)

        # Slow into the waypoint so overshoot does not break the swath argument.
        desired_speed = self.dc.cruise_speed_mps
        if leg.kind in ("turn", "rth", "transit"):
            desired_speed = self.dc.cruise_speed_mps * 0.62
        desired_speed = min(desired_speed, max(1.2, dist * 0.9))

        # Headwind component, plus a wet-weather penalty on everything.
        wind_factor = max(0.35, 1.0 - 0.055 * max(0.0, self.wind_mps - 4.0) ** 1.15)
        self.speed_mps = desired_speed * wind_factor

        step_m = min(self.speed_mps * dt_s, dist)
        rad = math.radians(self.heading_deg)
        new_pos = Vec2(
            self.pos.x + math.sin(rad) * step_m,
            self.pos.y + math.cos(rad) * step_m,
        )
        self.distance_flown_m += new_pos.dist(self.pos)
        self.pos = new_pos

        self.energy.step(
            dt_s,
            self.speed_mps,
            self.altitude_m,
            self.dc.payload_g + self.payload_g,
        )

    def _apply_leg_mode(self, leg: Leg) -> None:
        if leg.kind == "survey":
            self._enter(FlightMode.SURVEY)
        elif leg.kind in ("rth",):
            self._enter(FlightMode.RTH)
        elif leg.kind == "transit":
            self._enter(FlightMode.TRANSIT)
        elif leg.kind == "takeoff":
            self._enter(FlightMode.TAKEOFF)
        elif leg.kind == "landed":
            self._enter(FlightMode.LANDED)

    # ------------------------------------------------------------------
    def _fly_home(self, dt_s: float) -> None:
        if self.pos.dist(self.lz) <= 5.0:
            self.altitude_m = max(0.0, self.altitude_m - 8.0 * dt_s)
            if self.altitude_m <= 0.5:
                self.speed_mps = 0.0
                self._enter(FlightMode.LANDED)
            return
        self.heading_deg = self._turn_toward(bearing_deg(self.pos, self.lz), dt_s, 160.0)
        speed = self.dc.cruise_speed_mps * 0.7
        step_m = speed * dt_s
        rad = math.radians(self.heading_deg)
        new_pos = Vec2(
            self.pos.x + math.sin(rad) * step_m,
            self.pos.y + math.cos(rad) * step_m,
        )
        if new_pos.dist(self.lz) < self.pos.dist(self.lz):  # never overshoot the pad
            new_pos = self.lz
        self.distance_flown_m += new_pos.dist(self.pos)
        self.pos = new_pos
        self.energy.step(dt_s, speed, self.altitude_m, self.dc.payload_g)

    def _descend(self, dt_s: float) -> None:
        self.altitude_m = max(0.0, self.altitude_m - 7.0 * dt_s)
        self.speed_mps = 0.0

    # ------------------------------------------------------------------
    def _guard_geofence(self) -> None:
        ceiling = self.dc.max_altitude_agl_m + self.faults.altitude_bias_m
        if self.altitude_m > ceiling:
            self.altitude_m = ceiling
            self.violations.append(
                f"altitude clamped to {ceiling:.0f} m AGL at t={self.t_s:.0f}s"
            )

    def _guard_energy(self, dt_s: float) -> None:
        soc = self.soc_pct
        if soc <= self.dc.aft_reserve_pct and not self.faults.disable_aft:
            self._enter(FlightMode.AFT)
            self.terminated = True
            self.violations.append(f"automatic flight termination at {soc:.1f}% SOC")
            return
        if soc <= self.dc.rth_reserve_pct and not self.faults.disable_rth:
            if self.mode is not FlightMode.LANDED:
                self._enter(FlightMode.RTH)

    # ------------------------------------------------------------------
    def _turn_toward(self, want: float, dt_s: float, max_turn_degps: float) -> float:
        diff = (want - self.heading_deg + 540.0) % 360.0 - 180.0
        rate = max_turn_degps * dt_s
        if abs(diff) <= rate:
            return want
        return (self.heading_deg + math.copysign(rate, diff)) % 360.0

    def _enter(self, mode: FlightMode) -> None:
        if mode is not self.mode:
            self.mode = mode
            self.transitions.append((self.t_s, mode))

    # ------------------------------------------------------------------
    def deploy_payload(self, grams: float) -> None:
        """Cache a micro-payload on the ground (or on the rover's manifest)."""
        self.payload_g = max(0.0, self.payload_g - grams)

    def load_payload(self, grams: float) -> None:
        self.payload_g += grams

    @property
    def is_scanning(self) -> bool:
        return self.mode in (FlightMode.SURVEY, FlightMode.TRANSIT, FlightMode.TAKEOFF)
