"""Compliance engine.

Every rule traces to a published condition, not to our own opinion. The point of
running this on every mission - including deliberately broken ones - is that a
violation count of zero is only worth reporting if the auditor demonstrably would
have caught a violation.

Sources
-------
Drone Rules, 2021 (G.S.R. 589(E), 25 Aug 2021) and Drone (Amendment) Rules, 2023.
MoCA conditional exemptions granting trial BVLOS flights, whose Annexure 1 states
the operating conditions in detail - notably 400 ft AGL, a 15% energy reserve,
mandatory geofencing / return-to-home / automatic flight termination, and daylight
Visual Meteorological Conditions only.
DGCA public notice, 4 July 2026: no notified framework currently permits BVLOS,
and neither a Type Certificate nor a Remote Pilot Certificate authorises it.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from ..config import Config
from ..types import ComplianceEvent, Severity


@dataclass
class Rule:
    key: str
    title: str
    reference: str
    severity: Severity = Severity.CRITICAL


RULES: dict[str, Rule] = {
    "GEOFENCE_ALT": Rule(
        "GEOFENCE_ALT",
        "Altitude must not exceed the 120 m / 400 ft AGL ceiling",
        "MoCA trial SOP Annexure 1, cond. 3",
    ),
    "ENERGY_RESERVE": Rule(
        "ENERGY_RESERVE",
        "15% energy reserve must be retained; flight ends at the floor",
        "MoCA trial SOP Annexure 1, cond. 3",
    ),
    "AFT_PRESENT": Rule(
        "AFT_PRESENT",
        "Automatic flight termination must remain armed in flight",
        "MoCA trial SOP Annexure 1, cond. 11(h)",
    ),
    "RTH_PRESENT": Rule(
        "RTH_PRESENT",
        "Return-to-home must remain armed in flight",
        "MoCA trial SOP Annexure 1, cond. 11(h)",
    ),
    "VMC_WINDOW": Rule(
        "VMC_WINDOW",
        "Flights authorised under trial SOPs are limited to local sunrise to sunset",
        "MoCA trial SOP Annexure 1, cond. 10",
        Severity.WARN,
    ),
    "NO_BVLOS_CLAIM": Rule(
        "NO_BVLOS_CLAIM",
        "No BVLOS operation may be conducted, advertised or offered without specific "
        "DGCA authorisation; a Type Certificate is not an authorisation",
        "DGCA public notice, 4 July 2026",
    ),
    "PAYLOAD_RESTRICTED": Rule(
        "PAYLOAD_RESTRICTED",
        "Payload restricted to the proposed use case; no hazardous material",
        "MoCA trial SOP Annexure 1, cond. 12",
    ),
    "TELEMETRY_LIVE": Rule(
        "TELEMETRY_LIVE",
        "Live trajectory and identity data must be available to ATC/IAF",
        "MoCA trial SOP Annexure 1, cond. 13",
    ),
    "DAA_CAPABLE": Rule(
        "DAA_CAPABLE",
        "Detect-and-avoid and 360-degree collision avoidance required for trial corridors",
        "MoCA trial SOP Annexure 1, cond. 11(j)(k)",
    ),
    "CLINICAL_HUMAN_IN_LOOP": Rule(
        "CLINICAL_HUMAN_IN_LOOP",
        "System ranks and prioritises; clinical decisions remain with licensed staff",
        "System safety boundary - research demonstrator, not a medical device",
    ),
}


class ComplianceEngine:
    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.events: list[ComplianceEvent] = []
        self._seen: set[tuple[str, int]] = set()

    # ------------------------------------------------------------------
    def record(
        self,
        rule: str,
        t_s: float,
        passed: bool,
        detail: str,
        dedupe_window_s: float = 20.0,
    ) -> ComplianceEvent:
        r = RULES[rule]
        bucket = int(t_s // max(1.0, dedupe_window_s))
        if not passed:
            key = (rule, bucket)
            if key in self._seen:
                for e in reversed(self.events):
                    if e.rule == rule and not e.passed:
                        return e
            self._seen.add(key)
        ev = ComplianceEvent(
            rule=rule,
            t_s=t_s,
            severity=Severity.INFO if passed else r.severity,
            passed=passed,
            detail=detail,
            reference=r.reference,
        )
        self.events.append(ev)
        return ev

    # ------------------------------------------------------------------
    def check_altitude(self, t_s: float, altitude_m: float) -> None:
        cap = self.cfg.drone.max_altitude_agl_m
        ok = altitude_m <= cap + 0.5
        self.record(
            "GEOFENCE_ALT",
            t_s,
            ok,
            f"{altitude_m:.1f} m AGL vs {cap:.0f} m cap"
            + ("" if ok else "  <- FENCE BREACHED"),
            dedupe_window_s=10.0,
        )

    def check_energy(self, t_s: float, soc_pct: float, airborne: bool) -> None:
        floor = self.cfg.drone.rth_reserve_pct
        ok = (not airborne) or soc_pct > floor
        self.record(
            "ENERGY_RESERVE",
            t_s,
            ok,
            f"SOC {soc_pct:.1f}% vs {floor:.0f}% reserve floor"
            + ("" if ok else "  <- RESERVE BREACHED"),
            dedupe_window_s=10.0,
        )

    def check_safety_functions(self, t_s: float, airborne: bool, rth_armed: bool, aft_armed: bool) -> None:
        self.record(
            "RTH_PRESENT",
            t_s,
            (not airborne) or rth_armed,
            "RTH armed in flight" if rth_armed else "RTH not armed",
            dedupe_window_s=60.0,
        )
        self.record(
            "AFT_PRESENT",
            t_s,
            (not airborne) or aft_armed,
            "AFT armed in flight" if aft_armed else "AFT not armed",
            dedupe_window_s=60.0,
        )

    def check_vmc(self, t_s: float, is_night: bool) -> None:
        """Night flight is exactly what no current Indian medical-drone corridor is
        authorised for. Flagged as a deviation-to-be-authorised, never as compliant."""
        self.record(
            "VMC_WINDOW",
            t_s,
            not is_night,
            "daylight window" if not is_night else "NIGHT OPERATION - outside VMC trial window",
            dedupe_window_s=600.0,
        )

    # ------------------------------------------------------------------
    @property
    def violations(self) -> list[ComplianceEvent]:
        return [e for e in self.events if not e.passed and e.severity is Severity.CRITICAL]

    @property
    def warnings(self) -> list[ComplianceEvent]:
        return [e for e in self.events if not e.passed and e.severity is Severity.WARN]

    @property
    def violation_count(self) -> int:
        return len(self.violations)

    def manifest(self, claims_bvlos: bool = False, payload_is_medical_only: bool = True,
                 telemetry_published: bool = True, daa_enabled: bool = True) -> list[ComplianceEvent]:
        """Static, once-per-mission attestations."""
        self.record(
            "NO_BVLOS_CLAIM",
            0.0,
            not claims_bvlos,
            "mission operated VLOS; no BVLOS authorisation claimed"
            if not claims_bvlos
            else "BVLOS claimed without DGCA authorisation",
            dedupe_window_s=1e9,
        )
        self.record(
            "PAYLOAD_RESTRICTED",
            0.0,
            payload_is_medical_only,
            "payload is medical aid only; no hazardous material",
            dedupe_window_s=1e9,
        )
        self.record(
            "TELEMETRY_LIVE",
            0.0,
            telemetry_published,
            "live trajectory and identity feed published to the console",
            dedupe_window_s=1e9,
        )
        self.record(
            "DAA_CAPABLE",
            0.0,
            daa_enabled,
            "360-degree obstacle avoidance and DAA active",
            dedupe_window_s=1e9,
        )
        self.record(
            "CLINICAL_HUMAN_IN_LOOP",
            0.0,
            True,
            "triage output is decision support; clinical judgement stays with the operator",
            dedupe_window_s=1e9,
        )
        return self.events

    def summary(self) -> dict:
        return {
            "rules_evaluated": sorted(RULES),
            "total_checks": len(self.events),
            "violations": self.violation_count,
            "warnings": len(self.warnings),
            "violation_detail": [e.to_json() for e in self.violations[:20]],
            "warning_detail": [e.to_json() for e in self.warnings[:20]],
            "by_rule": {
                r: {
                    "checks": sum(1 for e in self.events if e.rule == r),
                    "failures": sum(1 for e in self.events if e.rule == r and not e.passed),
                }
                for r in sorted(RULES)
            },
        }
