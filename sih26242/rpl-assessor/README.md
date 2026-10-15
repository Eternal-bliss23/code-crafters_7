# RPL Assessor

An AI-assisted, **offline-capable** tool for Recognition of Prior Learning (RPL) against India's **NSQF** qualification packs. It guides an informally skilled worker through a structured self-declaration, maps it to the closest qualification packs, runs a guided practical assessment with photo/video evidence, standardises assessor scoring with anchored rubrics, and produces an NSQF-aligned competency profile and certification **recommendation** — for assessor sign-off.

> **This tool supports the assessor; it does not replace the assessor's decision, and it does not itself issue certification.**

See [`PROJECT_PROPOSAL.md`](./PROJECT_PROPOSAL.md) for the full problem statement, architecture, metrics and honest limitations.

---

## Features

- **Structured self-declaration** → automatic ranking against a qualification-pack library, with an explained score per factor (skill coverage, tool alignment, experience fit, complexity fit) and an estimated NSQF level.
- **Guided practical assessment** for the Electrician (Domestic) trade — task checklists tied to NOS, plus on-device photo/video/measurement evidence capture.
- **Assessor scoring interface** — every rubric criterion anchored at four levels (0–3) with concrete descriptors, a *critical* flag for safety/workmanship, and a transparent **assistive pre-score** the assessor can accept or override.
- **NSQF-aligned competency profile** — weighted per-NOS results, failed critical criteria, concrete gaps, and a certification recommendation with rationale and conditions.
- **Inter-assessor agreement study** — Fleiss' kappa, Cohen's kappa vs a referent, pairwise agreement and mean absolute error, comparing unassisted vs tool-assisted scoring.
- **Offline-first** — IndexedDB storage, a durable sync queue with retry, and a service-worker app-shell cache. Sync to a simulated in-browser server or a real HTTP endpoint.

## Tech stack

React 18 · TypeScript · Vite · IndexedDB · Service Worker · Vitest. No backend required for the demo.

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL (default http://localhost:5173). Then:

1. **Dashboard** → create a worker assessment.
2. **Self-declaration** → answer the guided interview.
3. **QP mapping** → review ranked packs and select one.
4. **Practical** → capture evidence for each task.
5. **Scoring** → score each criterion (accept or override the assistive pre-score).
6. **Profile** → review the competency profile and sign off as assessor.
7. **Consistency** → inspect the agreement study.
8. **Offline & sync** → simulate going offline/online and sync the queue.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run test` | Run the unit + smoke tests (Vitest) |
| `npm run typecheck` | Type-check only |

## Project layout

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

## Important notes on data

The qualification-pack content in `src/data/qp.ts` is **illustrative** — it mirrors the structure and vocabulary of real NSQF qualification packs (NOS → performance criteria → practical tasks with rubrics) but the codes and wording are **not** the official NCVET/NSDC text. In production, replace it with the authoritative QP unmodified; the engines depend only on the schema, not on these strings.

The agreement study is a **simulation** (clearly labelled in the UI). The kappa/error computation is the real validation method — swap the simulated scores for recorded human scores to obtain field evidence.
