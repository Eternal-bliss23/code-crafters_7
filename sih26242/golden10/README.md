# GOLDEN-10

An autonomous drone ("Kite") + amphibious rover ("Rover") first-response network,
simulated end-to-end. The simulation is **pure Python standard library** — no third
party packages are required to run it.

## Requirements

- **Python 3.11+** (uses stdlib `tomllib`).
- **Nothing else.** The core simulation has zero runtime dependencies.

The only optional dependency is the real vision path
(`ultralytics` → torch) for `UltralyticsDetector`. It is **not** needed for the
simulation and is not installed by default.

## Install

```bash
# from the repo root (the folder containing this README and pyproject.toml)
pip install -e .
```

This installs the `golden10` package in editable mode so the relative imports
resolve from anywhere, and adds a `golden10` console script.

Optional (heavy, pulls torch):

```bash
pip install -e ".[vision]"
```

## Run

```bash
python -m golden10              # run the mission, print a summary
python -m golden10 --json       # full result as JSON
python -m golden10 --seed 1234  # reproducible run
python -m golden10 --detector ultralytics   # requires the [vision] extra
```

If you prefer not to install, run it as a package from the `src` directory:

```bash
cd src
python -m golden10
```

> **Do not run the modules directly** (e.g. `python geo.py` or
> `python mission.py`). They use relative imports (`from .types import ...`) and
> only work when imported as part of the `golden10` package — that is what the
> error `attempted relative import with no known parent package` means.

## Package layout

```
src/golden10/
  config.py        TOML config loader (every field has a default)
  types.py         core data types (Vec2, Victim, Detection, MissionResult, ...)
  geo.py           geometry helpers
  scenario.py      digital-twin scenario (terrain, victims, environment)
  mission.py       the orchestrator: plan -> fly -> sense -> fuse -> handoff
  planning/        coverage.py - lawnmower planner + energy model
  perception/      detectors.py (synthetic + ultralytics), fusion.py
  vehicle/         drone.py (Kite), rover.py
  net/             mesh.py (multi-hop / store-and-forward link)
  compliance/      rules.py (altitude, energy, RTH/AFT audit)
  __main__.py      CLI entry point
config/
  default.toml     optional overrides (loaded automatically if present)
```

## Reproducibility

Every run is deterministic for a given `scenario.seed` (default `20260930`).
Pass `--seed` to change it.
