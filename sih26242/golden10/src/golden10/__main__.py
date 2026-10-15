"""Command-line entry point for GOLDEN-10.

Runs the full simulation with the standard library only:

    python -m golden10
    python -m golden10 --json
    python -m golden10 --detector synthetic --seed 1234

This exists because the package uses relative imports and therefore must be run
*as a package* - never as ``python geo.py`` or ``python mission.py``.
"""

from __future__ import annotations

import argparse
import json
import sys

from .config import load_config
from .mission import Mission
from .scenario import Scenario
from .types import Severity


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="golden10",
        description="GOLDEN-10 - drone + rover first-response simulation.",
    )
    p.add_argument("--config", metavar="PATH", default=None,
                   help="Path to a TOML config file (default: config/default.toml if present).")
    p.add_argument("--scenario", default=None,
                   help="Override the scenario name in the config.")
    p.add_argument("--detector", choices=("synthetic", "ultralytics"), default="synthetic",
                   help="Detection backend (default: synthetic).")
    p.add_argument("--seed", type=int, default=None,
                   help="Override the scenario RNG seed for reproducible runs.")
    p.add_argument("--claims-bvlos", action="store_true",
                   help="Run with a deliberate BVLOS-overclaim flag to demo the compliance auditor.")
    p.add_argument("--json", action="store_true",
                   help="Emit the full mission result as JSON instead of a summary.")
    p.add_argument("--no-telemetry", action="store_true",
                   help="Omit the telemetry array from JSON output.")
    p.add_argument("--out", metavar="PATH", default=None,
                   help="Write the JSON result to PATH (implies --json output to file).")
    p.add_argument("--quiet", action="store_true",
                   help="Print nothing except the JSON if requested.")
    return p


def _fmt_min(seconds: float | None) -> str:
    return "n/a" if seconds is None else f"{seconds / 60.0:.1f} min ({seconds:.0f} s)"


def print_summary(result, stream=sys.stdout) -> None:
    m = result.metrics
    w = stream.write
    w("=" * 68 + "\n")
    w(f" GOLDEN-10 mission {result.mission_id}  |  scenario: {result.scenario}\n")
    w("=" * 68 + "\n")
    w(f" T3 (call -> kit on scene): {_fmt_min(m.t3_golden10_s)}\n")
    w(f" T3 baseline (conventional): {_fmt_min(m.t3_baseline_s)}\n")
    if m.t3_golden10_s:
        w(f" Speed-up: {m.t3_baseline_s / m.t3_golden10_s:.2f}x  "
          f"({(m.t3_baseline_s - m.t3_golden10_s) / 60.0:.1f} min saved)\n")
    w("-" * 68 + "\n")
    w(f" First priority detection : {_fmt_min(m.first_detect_s)}\n")
    w(f" Search complete          : {_fmt_min(m.search_complete_s)}\n")
    w(f" Victims found            : {m.victims_found}/{m.victims_total} "
      f"(recall {m.recall:.0%}, precision {m.precision:.0%}, {m.false_positives} false positives)\n")
    w(f" Heavy kits delivered     : {m.victims_kit_delivered}  |  micro-kits cached: {m.kits_cached}\n")
    w(f" Distance flown / rover   : {m.distance_flown_m:,.0f} m / {m.distance_rover_m:,.0f} m\n")
    w(f" Battery used / final     : {m.energy_used_pct:.0f}% / {m.final_battery_pct:.0f}%\n")
    w(f" Link min quality         : {m.min_link_quality:.2f}  "
      f"({m.comms_degraded_pct:.0f}% of mission degraded)\n")
    w(f" Events delivered/retained: {m.events_delivered}/{m.events_retained}\n")
    w(f" Compliance violations    : {m.total_violations}\n")

    failed = [c for c in result.compliance if not c.passed and c.severity is Severity.CRITICAL]
    if failed:
        w("-" * 68 + "\n")
        w(" Critical compliance findings:\n")
        for c in failed[:8]:
            w(f"   ! {c.rule}: {c.detail}\n")
    w("=" * 68 + "\n")
    for note in result.notes:
        w(f" * {note}\n")


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    cfg = load_config(args.config)
    if args.scenario:
        cfg.scenario.name = args.scenario
    if args.seed is not None:
        cfg.scenario.seed = args.seed

    try:
        scenario = Scenario(cfg)
        mission = Mission(
            cfg,
            scenario=scenario,
            detector_mode=args.detector,
            claims_bvlos=args.claims_bvlos,
        )
    except RuntimeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    result = mission.run()

    if args.out:
        with open(args.out, "w", encoding="utf-8") as fh:
            json.dump(result.to_json(include_telemetry=not args.no_telemetry), fh, indent=2)
        if not args.quiet:
            print(f"wrote {args.out}")
    elif args.json:
        print(json.dumps(result.to_json(include_telemetry=not args.no_telemetry), indent=2))
    elif not args.quiet:
        print_summary(result)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
