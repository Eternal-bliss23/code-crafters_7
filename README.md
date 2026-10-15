# RPL Assessor — SIH26242 Walkthrough

**An offline-first, AI-assisted Recognition of Prior Learning (RPL) tool for NSQF qualification packs.**

> **Prototype / research demonstrator.** This is a hackathon build, not an official Government of India, NCVET or NSDC product. It produces a competency profile and a certification **recommendation** for a human assessor to sign off — the tool supports the assessor, it never replaces them and never auto-certifies a worker.

This document is a **visual walkthrough of the working prototype**, captured from the live app (`npm run dev`, `http://localhost:5173`) with a scripted headless-browser run. Every screen below is a real screenshot of the running application, driven end-to-end with fictitious demo data.

---

## 1. Problem statement

| Field | Detail |
|---|---|
| PS ID | **SIH26242** |
| Title | AI-Assisted Skill Assessment Tool for Recognition of Prior Learning (RPL) |
| Category | Software |
| Theme | Smart Education |
| Organisation | Ministry of Skill Development and Entrepreneurship (MSDE) |

**The challenge:** a large share of India's workforce learned their trade informally and holds no credential. NCVET's RPL framework certifies such workers against NSQF levels, but manual practical assessment is slow to scale, inconsistent between assessors, and hard to schedule. The tool must guide self-declaration, map to qualification packs, standardise practical scoring, generate an NSQF-aligned profile, and keep working with **no connectivity**.

### How the prototype maps to the problem statement

| PS requirement | Where it lives in the app | Screens |
|---|---|---|
| Structured self-declaration, auto-mapped to nearest QP(s) | Self-declaration → NSQF mapping engine (ranked packs with per-factor explanation) | 3, 4 |
| Guided practical evaluation with task checklists + image/video evidence | Guided practical assessment (NOS-linked tasks, critical flags) | 5, 6 |
| Standardised scoring rubrics to cut assessor-to-assessor variance | Anchored 0–3 rubric per criterion + assistive pre-score; inter-assessor agreement study | 7, 8, 11 |
| NSQF-aligned competency profile + recommendation for assessor sign-off | Competency profile, per-NOS results, conditions, electronic sign-off | 9, 10 |
| Offline data capture and later sync | IndexedDB store + durable sync queue + offline mode | 12–15 |

---

## 2. Prototype identities (fictitious — demo only)

> ⚠️ **All of the following are invented test records used only to demonstrate the workflow. They do not represent real people, real assessments or real credentials.**

| Role | Fictitious name used | Notes |
|---|---|---|
| **Worker being assessed** | **Ramesh Kumar Yadav** | Trade: Electrician · ID `RPL-DEMO-0142` · Maharashtra / Ahilyanagar · "5–10 years", learned on the job, no formal certificate |
| Second worker (offline demo) | **Sunil Patil** | Registered while the app was in offline mode · ID `RPL-DEMO-0143` |
| **Assessor** | **Anita Sharma** | Demo assessor profile · ID `ASM-MH-0421` · Maharashtra / Ahilyanagar |

The qualification-pack content (ELE/Q0100, ELE/Q0101, …) is **illustrative** — it mirrors the structure and vocabulary of real NSQF packs (NOS → performance criteria → practical tasks → rubrics) but the codes and wording are not the official NCVET/NSDC text.

---

## 3. Screenshot walkthrough

### 01 — Assessor sign-in

![Assessor sign-in](screenshots/01-assessor-signin.png)

**What you see:** a local on-device assessor profile — name, optional registration ID, State/UT and district. The banner states plainly this is a demonstration interface, not an official Government of India site.

**How it happens:** the assessor identifies themselves before any assessment. The profile is stored **on the device (IndexedDB)**; nothing leaves the device unless the assessor chooses to sync. There is no password or credential provider — this is deliberately a *local profile*, and the copy says so.

**Why it matters:** every later score and sign-off is stamped with this identity for the audit trail, and the location drives the district lists used across the app.

---

### 02 — Dashboard (worker registration)

![Dashboard](screenshots/02-dashboard.png)

**What you see:** the home screen with live counters (**Assessments**, **Queued for sync**, **On server**, **Current result**), a "Register a worker" form, the current assessment, and a "Recent assessments" table.

**How it happens:** registering a worker (worker name `Ramesh Kumar Yadav`, ID, State/UT = Maharashtra, district, trade = Electrician) and clicking **Create & start self-declaration** writes a new assessment record locally and routes the assessor to the guided interview.

**Why it matters:** the counters are the offline-first story at a glance — assessments and queued records live on the device first; "On server" only moves once a sync happens.

---

### 03 — Self-declaration (guided interview)

![Self-declaration — top](screenshots/03-self-declaration-top.png)

![Self-declaration — skills & tools](screenshots/03b-self-declaration-tools.png)

**What you see:** a structured interview covering *what kind* of electrical work, *how many years*, *how the skills were picked up*, the specific **tasks performed**, the **tools/instruments** used, any **prior certification**, and the **level of complexity** the worker handles.

**How it happens:** the worker (or a facilitator) answers multiple-choice and multi-select questions. For this demo Ramesh declares: domestic/household work, 5–10 years, learned on the job, full tasks independently, no formal certificate, 8 task types and 7 tools. Submitting calls **Map to qualification packs**, which turns these answers into **22 skill tags** and candidate matching signals.

**Why it matters:** this is the "I've done this job for years" moment made structured. The declaration is a *description*, not a test — the answers become the evidence base that drives the mapping engine.

---

### 04 — NSQF qualification-pack mapping

![QP mapping — ranked list](screenshots/04-qp-mapping-top.png)

![QP mapping — per-factor explanation](screenshots/04b-qp-mapping-card.png)

**What you see:** an estimated NSQF level from the declaration (here **NSQF 4**) and a **ranked** list of candidate qualification packs with a match percentage — *Assistant Electrician* 93%, *Electrician (Domestic Installation & Maintenance)* 92% (`ELE/Q0101`, NSQF Level 3), then the panel and solar packs lower down. Each card expands to show *why*: scores for **skill coverage, tool & instrument alignment, experience fit** and **task complexity fit**, the skills evidenced, and the skills the pack expects that were **not declared** (the gaps).

**How it happens:** the mapping engine scores the declared skill tags/tools/experience against each pack's profile and ranks them. The assessor confirms the correct pack — the tool *proposes*, it does not decide. Here the assessor selects **Electrician (Domestic Installation & Maintenance)**.

**Why it matters:** this is the core intelligence of the PS — turning free-form experience into a defensible, explained match against a real NSQF pack, with transparent factors rather than an opaque score.

---

### 05 — Guided practical assessment

![Practical tasks](screenshots/05-practical-tasks.png)

**What you see:** the selected pack split into **6 practical tasks across 4 NOS** — ELE/N0101 (safe working), N0102 (wiring & accessories), N0103 (fixtures & protective devices), N0104 (fault diagnosis). Each task has a plain-language instruction, the **preferred evidence type** (photo / video / measurement / direct observation), and an **assessor checklist of what good looks like**, with **critical** safety/workmanship items flagged.

**How it happens:** the rubric is fixed per task, so every assessor runs the same checklist. The header tracks progress ("0 of 6 tasks have evidence").

**Why it matters:** consistency starts here — an anchored checklist is what stops two assessors judging the same job by two different mental rubrics.

---

### 06 — Evidence capture

![Practical with evidence](screenshots/06-practical-evidence.png)

**What you see:** the same task list now showing **6 of 6 tasks have evidence** — photos for terminations, a video for the two-way circuit, instrument readings for the insulation and earth-continuity tests. (The images in this demo are generated placeholders standing in for real field photos.)

**How it happens:** the assessor attaches photo/video/measurement evidence per task on-device, then marks each task **ready for scoring**. Evidence is stored locally and queued for sync.

**Why it matters:** image/video capture is the PS's "video-/image-based assessment aid". The app is explicit that evidence is **an aid for the assessor, not an automatic pass/fail**.

---

### 07 — Assessor scoring with assistive pre-score

![Scoring interface](screenshots/07-scoring-assistive.png)

**What you see:** **23 rubric criteria**, each anchored at **four levels (0–3)** with concrete descriptors (Not performed → Partially performed → Competent → Proficient), **CRITICAL** flags on safety/workmanship items, and a transparent **ASSISTIVE PRE-SCORE** (here level 2 · 45%) with a one-line rationale and a **Use suggestion** button. A running banner shows "0 / 23 criteria scored".

**How it happens:** the tool computes a *starting* score from the captured evidence and shows its reasoning. The assessor may **accept (Use suggestion) or override** any value by clicking a different level. Nothing is auto-submitted.

**Why it matters:** this is the carefully-drawn line from the problem statement — the AI standardises and suggests, the **human decides**. The anchored descriptors are exactly what reduces variance.

---

### 08 — Scoring complete

![Scoring complete](screenshots/08-scoring-complete.png)

![A scored rubric criterion](screenshots/08b-scoring-rubric.png)

**What you see:** all **23 / 23 criteria scored**, running result **88%**, status **PROFICIENT**. The second image shows an individual criterion after scoring: the chosen level is selected and can still be changed.

**How it happens:** the assessor works down the rubric. In this demo the criteria were scored mainly *Proficient (3)* with some *Competent (2)* — a realistic mixed result, not a clean sweep.

**Why it matters:** the weighted result is computed live from the rubric, so the assessor sees the consequence of each judgement immediately.

---

### 09 — NSQF-aligned competency profile

![Competency profile](screenshots/09-competency-profile-top.png)

**What you see:** the profile for `ELE/Q0101` (NSQF Level 3): **PROFICIENT · 88% weighted · NOS passed 4/4 · evidence coverage 100% · open gaps 0**, a per-NOS table of scores and statuses, and a **certification recommendation** with rationale ("RECOMMEND FOR CERTIFICATION", tool confidence 97%, pass mark 70%) plus the **conditions before sign-off**.

**How it happens:** the engine aggregates the per-criterion scores into per-NOS results, checks the critical-criteria floor, and derives a recommendation. A low-scoring run (e.g. all "Competent") instead produces *"NOT YET COMPETENT — assess again after gap training"*, so the recommendation genuinely tracks the evidence.

**Why it matters:** this is the PS's "NSQF-aligned competency profile and certification recommendation" — in the official format, with the qualifying and failing conditions made explicit.

---

### 10 — Assessor review and electronic sign-off

![Profile signed off](screenshots/10-profile-signed.png)

**What you see:** the **Assessor review & sign-off** block, with the assessor name, free-text **notes/overrides**, and the **Sign off assessment** button — followed by the confirmation *"Signed off by Anita Sharma on …"*.

**How it happens:** the assessor confirms (or overrides) the recommendation, records notes, and signs. The sign-off is stamped with the assessor identity and timestamp and recorded for the audit trail.

**Why it matters:** the final decision is explicitly human and attributable — the integrity requirement of the PS.

---

### 11 — Inter-assessor agreement study

![Consistency study](screenshots/11-consistency.png)

**What you see:** a **simulation** (clearly labelled) over 30 attempts and 115 rubric items with 5 assessors, comparing **unassisted** vs **tool-assisted** scoring:

| Metric | Unassisted | Assisted |
|---|---|---|
| Mean pairwise agreement | 64% | **100%** |
| Fleiss' kappa | 0.443 (moderate) | **1.000 (almost perfect)** |
| Cohen's kappa vs referent | 0.579 | **1.000** |
| Mean absolute error (levels) | 0.277 | **0.000** |

…giving an **agreement gain of +36%** and a **+0.557 kappa gain**.

**How it happens:** the app models assessor behaviour as a persistent leniency/strictness bias plus per-item noise, then applies the real statistical methods (Fleiss' kappa, Cohen's kappa, pairwise agreement, MAE). Replace the simulated scores with recorded human scores and the same screen becomes real field evidence.

**Why it matters:** this is the PS's "evidence of consistency improvement over unassisted manual scoring" — and the app is honest that the numbers here are simulated until real assessor data is dropped in.

---

### 12 — Offline capture & sync queue

![Offline & sync](screenshots/12-offline-queue.png)

**What you see:** the sync console — local persistence via **IndexedDB**, **7 records queued for sync**, **0 on server**, last sync "never". Transport can be the built-in **simulated in-browser server** or a **real HTTP REST endpoint** (`PUT /assessments/:id`, `POST /evidence/:id`).

**How it happens:** every assessment and evidence item is written locally first and placed in a durable, ordered sync queue with retries.

**Why it matters:** most of the informal workforce is semi-urban/rural with patchy connectivity — offline-first is a hard requirement, not a nicety.

---

### 13 — Offline mode: the tool keeps working

![Offline mode](screenshots/13-offline-mode.png)

![Registering a worker while offline](screenshots/13b-offline-registration.png)

![Queue grows while offline](screenshots/13c-offline-queue-grown.png)

**What you see:** the app switches to **Offline**, and while disconnected a *second* worker (**Sunil Patil**) is registered and interviewed. The queue then grows to **8 records** — still **0 on server**.

**How it happens:** simulating loss of connectivity changes only the sync behaviour; all capture, scoring and profiling continue against local storage. This is the "airplane-mode" demo.

**Why it matters:** it proves the capture workflow is genuinely offline-capable rather than a cloud app with a cached shell.

---

### 14 — Reconnect and sync

![After sync](screenshots/14-after-sync.png)

**What you see:** after reconnecting and pressing **Sync now**, the queue drains to **0** and **8 records** are on the server, with a fresh **last sync** timestamp.

**How it happens:** on reconnect the queue is replayed in order (with retries on failure), pushing assessments as JSON and evidence as multipart to the configured transport.

**Why it matters:** nothing captured offline is lost, and the sync is ordered and idempotent — the field-to-server handoff the PS asks for.

---

### 15 — Dashboard after the session

![Final dashboard](screenshots/15-dashboard-final.png)

**What you see:** **2 assessments**, **0 queued**, **8 on server**, and the current result back on the completed worker — **88% · proficient**. The recent-assessments table lists both workers (Ramesh submitted, Sunil declared).

**How it happens:** the same counters from screen 02, now reflecting a full end-to-end session including an offline-registered worker.

**Why it matters:** it closes the loop — declare → map → assess → score → profile → sign off → sync — and shows the device/server state reconciling cleanly.

---

## 4. The result at a glance (this demo run)

| Item | Value |
|---|---|
| Worker (fictitious) | Ramesh Kumar Yadav |
| Trade / pack | Electrician (Domestic Installation & Maintenance) · `ELE/Q0101` · NSQF Level 3 |
| Practical tasks / evidence | 6 tasks across 4 NOS · 6/6 with evidence |
| Rubric criteria scored | 23 / 23 |
| Overall (weighted) | **88%** → **PROFICIENT** |
| NOS passed | 4 / 4 (N0101 85.7% · N0102 86.7% · N0103 88.9% · N0104 91.7%) |
| Recommendation | **RECOMMEND FOR CERTIFICATION** (tool confidence 97%, pass mark 70%) |
| Sign-off | Signed off by Anita Sharma (fictitious) |
| Sync | 8 records on server, 0 queued |

---

## 5. Reproducing this walkthrough

```bash
# from the repository
cd sih26242/rpl-assessor
npm install
npm run dev          # open http://localhost:5173
```

Then follow the workflow: **Dashboard → Self-declaration → QP mapping → Practical → Scoring → Profile → Consistency → Offline & sync**. The screenshots above were captured from exactly this app with a scripted headless-browser run (Chromium via Playwright at a 1440×950 viewport, browser text size raised one step for legibility).

Other useful scripts (see the project README): `npm run build`, `npm run test`, `npm run typecheck`.

---

## 6. Architecture (brief)

```
src/
  engine/     mapping, scoring, assistive pre-score, agreement   (pure TypeScript, unit-tested)
  data/       illustrative NSQF qualification packs + self-declaration questions
  storage/    IndexedDB wrapper + durable sync queue + transports
  components/ UI for each workflow stage
  state.tsx   app state, persistence and sync orchestration
  lib/        ids, formatting, hash router
public/
  sw.js               service worker (offline app shell)
  manifest.webmanifest
```

React 18 · TypeScript · Vite · IndexedDB · Service Worker · Vitest. **No backend required for the demo.**

---

## 7. Assumptions, simulations and boundaries

- **Illustrative QP data.** Pack codes/wording mirror real NSQF structure but are not official NCVET/NSDC text. In production, replace with authoritative QPs — the engines depend on the schema, not the strings.
- **Agreement study is simulated** and labelled as such in the UI. The *methods* (kappa, pairwise agreement, MAE) are real; only the scores are synthetic until real assessor data is supplied.
- **Support, not replacement.** The tool recommends; a qualified human assessor decides and signs. It never auto-certifies.
- **Local-first identity.** Assessor sign-in is an on-device profile, not an authenticated credential provider.
- **Offline transport is simulated** by default; an HTTP REST endpoint can be configured for field use.

---

## 8. A note on the screenshots

All screenshots are of the **live running prototype** and use clearly fictitious data (Ramesh Kumar Yadav, Sunil Patil, Anita Sharma and the generated placeholder evidence images). They were captured automatically by driving the real UI — no mockups, no edited screens.

> *Prepared as a demonstration handout. The RPL Assessor is the SIH26242 (MSDE) prototype; the same repository also contains GOLDEN-10, a separate disaster-response simulation research prototype.*
