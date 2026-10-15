# RPL ASSESSOR
### An AI-assisted, offline-capable Recognition of Prior Learning tool for India's informally skilled workforce
**Project Proposal / Hackathon Synopsis**

---

## 1. The problem in one sentence

Millions of Indian workers already *do* the trade but hold **no credential to prove it**, and the Recognition of Prior Learning (RPL) route that exists to certify them is bottlenecked by slow, inconsistent, in-person manual assessment — so we built a tool that structures the whole RPL journey, standardises the scoring, and runs with **no network at all**.

---

## 2. Why this problem, evidenced

### 2.1 The workforce is skilled but uncertificated

India's workforce is overwhelmingly informal — the ILO and the *India Employment Report 2024* put informal employment at roughly **90% of all workers**. A large share of these workers acquired real, saleable trade competence through apprenticeship-style, on-the-job experience — an electrician's helper who has terminated thousands of connections, a welder who has run beads for a decade — yet has **never sat a structured, certified assessment**.

The credential matters to the worker (wage premium, mobility, formal employment eligibility) and to employers (verifiable skill signals, contractual requirements). The skill already exists. Only the *proof* is missing.

### 2.2 RPL exists precisely for this — but assessment is the bottleneck

NCVET's Recognition of Prior Learning framework is designed to certify exactly this population against **NSQF levels** without making them repeat training they have effectively already completed. Qualification Packs define **National Occupational Standards (NOS)**, each broken into **Performance Criteria (PC)**, and RPL is meant to assess the worker against these directly.

In practice, RPL assessment is still dominated by **manual practical evaluation by human assessors**. Three failure modes follow:

1. **It does not scale.** One assessor, one worker, one location, one slot. Throughput is a direct function of assessor headcount, which is the scarcest resource.
2. **It is inconsistent.** Without shared anchors, one assessor's "competent" is another's "needs work." The same worker can receive different outcomes in two districts — an integrity problem for the whole credential.
3. **It is hard for workers to access.** Assessment usually means travel and lost workdays, which is exactly what a daily-wage informal worker can least afford — so the people who most need certification are the least able to attend.

### 2.3 The gap is a *throughput and consistency* gap, not a knowledge gap

The hard part is not deciding the standards — the NSQF already publishes them. The hard part is **applying a published standard consistently, at scale, to workers who are offline, remote, and time-poor.** That is a software problem, and it is the one we target.

---

## 3. The landscape gap (why this is not "just another skilling app")

Existing tools and programmes are real and important; we complement them rather than compete with them.

| Capability | Conventional RPL / skilling portals | RPL ASSESSOR |
|---|---|---|
| **Primary function** | Course delivery, enrolment, records, certificates | **Assessment itself** — self-declaration → practical → scored profile |
| **NSQF matching** | Manual: worker or trainer picks a QP by hand | **Automatic ranking** against a QP library with an explained score |
| **Practical evaluation** | Paper/PDF checklists, assessor judgement only | **Guided digital checklists + photo/video evidence** |
| **Scoring consistency** | Assessor-dependent, no anchors | **Anchored 4-level rubrics** + assistive pre-score, measured with kappa |
| **Connectivity** | Assumes online forms and cloud sync | **Offline-first**: IndexedDB capture, durable queue, later sync |
| **Assessor role** | Implicit | **Explicit** — the tool supports, never overrides, the assessor |

The wedge is **standardisation with measured disagreement**. Most tools digitise the *forms*. This tool targets the *variance* — and instruments it so improvement is provable, not asserted.

---

## 4. What we built

A working, offline-capable single-page application covering the full RPL workflow for one trade (**Electrician — Domestic Installation & Maintenance**, NSQF Level 3, with adjacent Level 2/4 packs in the library).

```
        ┌──────────────────────────────────────────────────────────────┐
        │  WORKER                                                       │
        │  1. Structured self-declaration (guided interview)           │
        │       ↓                                                       │
        │  2. NSQF qualification-pack mapping engine                   │
        │       (ranked matches, explained, worker picks/assessor      │
        │        confirms the closest relevant QP + level)             │
        │  3. Guided practical tasks + photo/video evidence capture    │
        │       ↓                                                       │
        ├──────────────────────────────────────────────────────────────┤
        │  ASSESSOR                                                      │
        │  4. Anchored rubric scoring (0-3 with descriptors)           │
        │       + transparent assistive pre-score (accept or override) │
        │  5. NSQF-aligned competency profile (per-NOS)                │
        │  6. Certification recommendation + explicit boundary notice  │
        │  7. Named sign-off → authoritative decision                  │
        └──────────────────────────────────────────────────────────────┘
                 All steps run offline; evidence & records sync later.
```

### 4.1 Structured self-declaration → automatic QP mapping

The worker (with a facilitator) answers a structured interview: trade focus, years of experience, how they learned, which activities they do regularly, which instruments they can use, prior credentials, and the complexity of work they handle independently. Each answer carries **skill tags**. The mapping engine scores every qualification pack against the declared profile on four transparent factors — **skill coverage**, **tool/instrument alignment**, **experience fit**, and **task-complexity fit** — and returns a ranked, explained shortlist plus an estimated NSQF level. Nothing is a black box: every match shows its reasons and the specific skills evidenced or missing.

### 4.2 Guided practical evaluation with evidence aids

Each QP carries practical tasks tied to an NOS, an instruction, and a preferred evidence type (photo, video, measurement, observation). The worker/facilitator captures evidence on the device — camera, file, or live recording — and the task lists the observable checklist items. Evidence is stored locally as a blob. It is an **aid**: it lets a remote or off-site assessor see the work, but it never decides pass/fail by itself.

### 4.3 Standardised scoring rubrics

Every rubric criterion has **four anchored levels** (Not performed / Partially performed / Competent / Proficient) with concrete descriptors, weights, and a *critical* flag for safety and workmanship items. The assessor clicks a level; the same anchors are shown to every assessor everywhere. A transparent **assistive pre-score** reads only factual signals (was evidence captured, is the criterion critical) and proposes a starting level *with its reasoning shown* — the assessor can accept or override it freely.

### 4.4 Competency profile and certification recommendation

The scoring engine computes a **weighted, per-NOS competency profile** (normalised 0–1), flags failed critical criteria, and lists concrete gaps. A pass requires **≥70% weighted** with **no critical criterion below level 2**. The recommendation (recommend / recommend-with-gaps / not-yet) is generated **with its rationale and conditions**, and always carries the boundary notice: it *supports* the assessor and does not *replace* them. Sign-off requires a **named assessor** and at least one evidence item.

### 4.5 Offline-first by construction

Assessments and evidence blobs are written to **IndexedDB** on the device and placed in a **durable sync queue**. A service worker caches the app shell so the tool loads with no connectivity. When a connection returns, the queue is **replayed in order with retry and failure reporting**; nothing is lost while offline. The demo uses an in-browser simulated server; a real deployment points at an HTTP endpoint (`PUT /assessments/:id`, `POST /evidence/:id`).

---

## 5. Measuring consistency (the evidence requirement, made testable)

The strongest claim in this space is also the easiest to fake: *"our tool makes assessors agree more."* We make it **measurable and falsifiable**.

The app ships a **consistency study** (Consistency tab) that scores a test set of worker attempts in two modes — **unassisted manual scoring** and **tool-assisted rubric scoring** — and reports:

- **Mean pairwise agreement**
- **Fleiss' kappa** (agreement across many assessors, corrected for chance)
- **Cohen's kappa vs a referent assessor**
- **Mean absolute error** in score levels

In the demo, assessor behaviour is **modelled** (a persistent leniency/strictness bias plus per-item noise). This is stated plainly in the UI — it is a **simulation**, and the *method* is the real validation method. To produce the field evidence the RPL outcome requires, you replace the simulated scores with **recorded human scores** on the same test set; the metric computation is unchanged. The claim holds if tool-assisted kappa is materially higher than unassisted kappa on the same records.

> **Honesty as a feature.** We do not present simulated agreement numbers as field results. We present the *instrument* for measuring them, and we say exactly which parts are synthetic.

---

## 6. Where the tool supports vs replaces the assessor (certification integrity)

This boundary is a first-class part of the product, not a disclaimer.

| The tool does (support) | The human does (non-negotiable) |
|---|---|
| Structure the self-declaration interview | Verify worker identity |
| Rank and explain QP matches | **Confirm** the correct QP and NSQF level |
| Organise tasks, checklists and evidence | Judge whether evidence is authentic and sufficient |
| Anchor every rubric level with a descriptor | **Decide** every score; override any suggestion |
| Propose a transparent pre-score with reasons | Validate critical safety/workmanship competence |
| Compute the profile, gaps and recommendation | Make and record the **final certification decision** |

**Critical criteria cannot be passed on a suggestion.** The assistive pre-score defaults low with no evidence, is capped in confidence on critical items, and never auto-locks a score. The final record names the assessor and timestamp.

---

## 7. Mapping to the required outcomes

| Required outcome | Where it lives |
|---|---|
| Working workflow: self-declaration → assessor scoring, ≥1 trade | Whole app; Electrician trade end-to-end |
| NSQF qualification-pack mapping engine | `src/engine/mapping.ts` + Mapping tab |
| Evidence of consistency improvement | `src/engine/agreement.ts` + Consistency tab (kappa, MAE) |
| Offline-capable mobile/web interface | IndexedDB + sync queue + service worker (`src/storage`, `public/sw.js`) |
| Support-vs-replace boundary described | About tab, profile recommendation, `BOUNDARY_NOTICE`, §6 above |

---

## 8. Technical architecture

```
┌────────────────────────────────────────────────────────────┐
│ PRESENTATION  React + TypeScript SPA (Vite), hash-routed   │
│  Dashboard · Self-declaration · Mapping · Practical ·      │
│  Scoring · Profile · Consistency · Offline & sync · About  │
├────────────────────────────────────────────────────────────┤
│ ENGINES (pure TS, unit-tested)                             │
│  mapping.ts   profile → ranked QPs (explained)             │
│  scoring.ts   rubric → per-NOS profile + recommendation    │
│  assist.ts    rule-based assistive pre-score (transparent) │
│  agreement.ts Fleiss/Cohen kappa + pairwise + MAE          │
├────────────────────────────────────────────────────────────┤
│ DATA                                                       │
│  qp.ts        illustrative NSQF QPs → swap for official    │
│  questions.ts self-declaration + tag dictionary            │
├────────────────────────────────────────────────────────────┤
│ PERSISTENCE & SYNC                                         │
│  IndexedDB (assessments, evidence blobs, queue, mirror)    │
│  durable sync queue · simulated or HTTP transport          │
│  service worker app-shell cache (offline load)             │
└────────────────────────────────────────────────────────────┘
```

**Stack:** React 18 + TypeScript + Vite; IndexedDB; Service Worker; Vitest. **No backend required** for the demo.

---

## 9. Success metrics (instrumented, not asserted)

| Metric | Target | How measured |
|---|---|---|
| Workflow completion | Self-declaration → signed profile for one worker | End-to-end run |
| Mapping hit rate | Top-ranked QP correct on labelled cases | Engine test set (shipped, unit-tested) |
| Inter-assessor agreement | Tool-assisted Fleiss' kappa materially > unassisted on the same test set | Consistency tab; replace inputs with human scores for field evidence |
| Scoring error | Tool-assisted mean absolute error < unassisted | Same |
| Offline durability | 100% of records survive an offline session and sync on reconnect | Sync queue replay |
| Boundary integrity | 0 auto-submitted decisions; sign-off requires named assessor + evidence | Product rule, enforced in code |

---

## 10. Risks and honest limitations

| # | Risk | Likelihood | Mitigation |
|---|---|---|---|
| 1 | **Assistive pre-score seen as automation of judgement** | Medium | Rule-based and transparent; never auto-locks; critical items need human decision; boundary notice everywhere |
| 2 | **Improper QP data** | High if unmanaged | Ship only authoritative NCVET/NSDC QP text; current data is clearly labelled illustrative |
| 3 | **Photo/video cannot capture every competence** | High | Evidence is an *aid*; direct observation remains for non-observable criteria |
| 4 | **Agreement claim unverified in the field** | High | Demo is explicitly a simulation; the metric is the real method and swaps in human scores |
| 5 | **Device storage limits on long sessions** | Medium | Blob storage is bounded; add compression/retention policy before scale |
| 6 | **Assessment integrity / fraud** | Medium | Named assessor sign-off, evidence retention, later server-side audit trail |
| 7 | **Language and low-literacy access** | High | Interface is guided/visual; add vernacular voice guidance before field deployment |

**Non-negotiable limitation, stated plainly:** this tool **assists** assessment; it does not **certify** by itself. The credential is issued by an NCVET-recognised awarding body through a qualified assessor. This is a research demonstrator, not a certification authority.

---

## 11. Roadmap

| Phase | Horizon | Goal |
|---|---|---|
| **Phase 1 — Demo (now)** | — | Full workflow, mapping engine, agreement instrument, offline capture |
| **Phase 2 — Real QPs & data** | 0–3 mo | Load authoritative QP text; run a multi-assessor study on real workers to replace simulation |
| **Phase 3 — Field pilot** | 3–9 mo | Partner with an SSC / training partner; vernacular UI; low-end Android testing |
| **Phase 4 — Integration** | 9–18 mo | Integrate with an awarding body's assessment & certification workflow; audit trail |

---

## 12. Why a student team can credibly build this

1. **The standards are published.** NSQF/NCVET QPs are public and structured; we engineer to a specification, not a guess.
2. **The hard parts are software.** Matching, rubric standardisation, offline sync, and measured agreement are all buildable with a web stack and no infrastructure.
3. **The validation method is standard.** Fleiss' and Cohen's kappa are textbook; the innovation is applying them to RPL scoring at the point of assessment.
4. **The pain is current and large.** ~90% informal employment; an existing national RPL programme looking for scale.

---

## Appendix A — Key references (verify before submission)

- NCVET — Recognition of Prior Learning framework; NSQF levels and Qualification Packs (NOS + Performance Criteria)
- MSDE / NSDC sector skill councils — QP repository (source of authoritative QP text)
- PMKVY — RPL component certifying candidates with existing skills
- ILO / *India Employment Report 2024* — informal employment share (~90% of workers)
- Fleiss (1971) — *Measuring nominal scale agreement among many raters* (kappa)
- Cohen (1960) — *A coefficient of agreement for nominal scales*

*Note: statistical figures are cited generally; confirm exact values from the primary source before any external submission.*

---

## Appendix B — Running the project

```bash
cd rpl-assessor
npm install
npm run dev        # development server
npm run test       # 15 unit + smoke tests
npm run build      # type-check + production build
npm run preview    # serve the production build
```

Open the app, click **New assessment**, and follow the tabs left to right.

*Prepared as a hackathon project proposal. The tool supports the human assessor; it does not replace the assessor's decision, and it does not itself issue certification.*
