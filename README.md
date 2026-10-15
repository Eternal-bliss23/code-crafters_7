# code-crafters_7 — SIH26242

Two hackathon projects from **Team Code-Crafters** built for **Smart India Hackathon (SIH) 2026**, problem statement **SIH26242**.

| Project | Domain | Stack | One-liner |
|---|---|---|---|
| [**GOLDEN-10**](sih26242/golden10/) | Disaster response / Robotics | Python 3.11+ (stdlib-only) | Autonomous drone + amphibious rover first-response network that compresses the emergency "golden hour". |
| [**RPL Assessor**](sih26242/rpl-assessor/) | Skill development / EdTech | React 18 · TypeScript · Vite | Offline-capable, AI-assisted Recognition of Prior Learning assessment against India's NSQF qualification packs. |

---

## Repository contents

```
code-crafters_7-main/
├── README.md                     ← this file
└── sih26242/
    ├── PROJECT_PROPOSAL.md       Full proposal for both problems
    ├── golden10/                 GOLDEN-10 simulation (Python)
    │   ├── src/golden10/         package source
    │   ├── config/default.toml   optional TOML overrides
    │   ├── pyproject.toml
    │   └── README.md
    └── rpl-assessor/             RPL Assessor web app
        ├── src/                  React + TypeScript source
        ├── public/               service worker + web manifest
        ├── package.json
        ├── CHANGES.md
        └── README.md
```

**Archive snapshot**

| Property | Value |
|---|---|
| File | `code-crafters_7-main.zip` |
| Size | ~152 KB |
| Files | 73 (20 Python · 35 TypeScript/TSX) |
| Total lines of code | ~650 KB uncompressed |
| Top-level | `code-crafters_7-main/` |

---

## 1. GOLDEN-10 — Autonomous Drone + Rover First-Response Network

> In India's flood, landslide and highway emergencies, the entire golden hour is spent just getting there. GOLDEN-10 is designed to arrive in the first ten minutes, work at 2 AM, and keep working when the cell towers don't.

Two cooperating vehicles share one brain, one mesh link, and one job: **compress T3** (the time between a call for help and a first responder reaching the scene).

- **Kite** — 450 mm-class quadcopter with RGB + LWIR thermal gimbal, onboard edge inference, 400 ft AGL geofence, and a lawnmower coverage-scan planner.
- **Rover** — wheeled/tracked amphibious ground robot that follows the drone's breadcrumb trail across flooded fields and landslide debris to deliver the heavy kit and hold a comms node.
- **Resilience** — Wi-Fi hotpot → ESP32/LoRa multi-hop mesh (Meshtastic-compatible) → delayed store-and-forward, so losing infrastructure degrades performance but never silences the system.

### Key capabilities

- Night-capable by design (LWIR thermal + IR illumination + acoustic) — the operational gap in every currently authorised Indian medical-drone corridor.
- Automatic on-device victim detection with geotagging and confidence scores (no pilot watching a feed).
- Legal-by-design: hard geofence, 15% energy reserve floor, RTH, AFT, DAA — built to MoCA/DGCA trial conditions.
- Triage **decision-aid** (flags and prioritises; does not diagnose).

### Requirements

- **Python 3.11+** (uses stdlib `tomllib`).
- **Nothing else.** The core simulation has zero runtime dependencies.

### Install & run

```bash
cd sih26242/golden10

pip install -e .          # editable install + `golden10` console script

python -m golden10              # run the mission, print a summary
python -m golden10 --json       # full result as JSON
python -m golden10 --seed 1234  # reproducible run
python -m golden10 --detector ultralytics   # requires the [vision] extra
```

Optional real-vision path (heavy — pulls in `torch`):

```bash
pip install -e ".[vision]"
```

Without installing, run from `src/`:

```bash
cd src && python -m golden10
```

> **Do not run modules directly** (e.g. `python geo.py`). They use relative imports and only work as part of the `golden10` package.

### Package layout

```
src/golden10/
  config.py        TOML config loader (every field has a default)
  types.py         core data types (Vec2, Victim, Detection, MissionResult, ...)
  geo.py           geometry helpers
  scenario.py      digital-twin scenario (terrain, victims, environment)
  mission.py       orchestrator: plan -> fly -> sense -> fuse -> handoff
  planner/         coverage.py — lawnmower planner + energy model
  perception/      detectors.py (synthetic + ultralytics), fusion.py
  vehicle/         drone.py (Kite), rover.py
  net/             mesh.py — multi-hop / store-and-forward link
  compliance/      rules.py — altitude, energy, RTH/AFT audit
  __main__.py      CLI entry point
config/default.toml
```

Every run is **deterministic** for a given `scenario.seed` (default `20260930`).

---

## 2. RPL Assessor — NSQF Recognition of Prior Learning

> This tool supports the assessor; it does not replace the assessor's decision, and it does not itself issue certification.

An **offline-first** web app that guides an informally skilled worker through a structured self-declaration, maps it to the closest NSQF qualification packs, runs a guided practical assessment with photo/video/measurement evidence, standardises assessor scoring with anchored rubrics, and produces an NSQF-aligned competency profile and a certification **recommendation** for assessor sign-off.

### Features

- **Structured self-declaration** → ranked qualification packs with an explained score per factor (skill coverage, tool alignment, experience fit, complexity fit) and an estimated NSQF level.
- **Guided practical assessment** for the Electrician (Domestic) trade — NOS-linked task checklists with on-device evidence capture.
- **Assessor scoring** — four-level (0–3) anchored rubric criteria, critical safety/workmanship flags, and a transparent **assistive pre-score** the assessor may accept or override.
- **NSQF-aligned competency profile** — weighted per-NOS results, failed criticals, concrete gaps, and a certification recommendation with rationale and conditions.
- **Inter-assessor agreement study** — Fleiss' kappa, Cohen's kappa vs a referent, pairwise agreement and mean absolute error (unassisted vs tool-assisted).
- **Offline-first** — IndexedDB storage, durable sync queue with retry, and a service-worker app-shell cache. Syncs to a simulated in-browser server or a real HTTP endpoint.

### Tech stack

React 18 · TypeScript · Vite · IndexedDB · Service Worker · Vitest. **No backend required for the demo.**

### Getting started

```bash
cd sih26242/rpl-assessor
npm install
npm run dev      # open the printed URL, default http://localhost:5173
```

Then walk the workflow: **Dashboard → Self-declaration → QP mapping → Practical → Scoring → Profile → Consistency → Offline & sync**.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run test` | Run unit + smoke tests (Vitest) |
| `npm run typecheck` | Type-check only |

### Project layout

```
src/
  engine/        mapping, scoring, assistive pre-score, agreement (pure TS, tested)
  data/          illustrative NSQF qualification packs + self-declaration questions
  storage/       IndexedDB wrapper + sync queue + transports
  components/    UI for each workflow stage
  state.tsx      app state, persistence and sync orchestration
  lib/           ids, formatting, hash router
public/
  sw.js          service worker (offline app shell)
  manifest.webmanifest
```

> **Data note:** the qualification-pack content in `src/data/qp.ts` is **illustrative** — its structure mirrors real NSQF packs (NOS → performance criteria → practical tasks with rubrics) but the codes and wording are **not** official NCVET/NSDC text. The agreement study is a **simulation**, clearly labelled in the UI.

---

## Documentation

Each sub-project has its own detailed README, and the combined problem statement lives in:

- [`sih26242/PROJECT_PROPOSAL.md`](sih26242/PROJECT_PROPOSAL.md) — full proposal: evidence, architecture, 36-hour execution plan, metrics, risks and roadmap.
- [`sih26242/golden10/README.md`](sih26242/golden10/README.md)
- [`sih26242/rpl-assessor/README.md`](sih26242/rpl-assessor/README.md)
- [`sih26242/rpl-assessor/CHANGES.md`](sih26242/rpl-assessor/CHANGES.md) — UI/UX change log for the RPL Assessor.

---

## Disclaimer

Both projects are **research demonstrators / hackathon prototypes**, not certified products.

- GOLDEN-10 is a **simulation**. It prioritises victims; it does not diagnose them. Any real flight requires prior DGCA authorisation under the Drone Rules, 2021, and the design is VLOS-first and legal-by-design.
- RPL Assessor produces a **recommendation** only; a qualified human assessor makes every certification decision.

---
