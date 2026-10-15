# GOLDEN-10
### An Autonomous Drone + Rover First-Response Network for India's Golden Hour
**Project Proposal / Hackathon Synopsis**

---

## 1. The Problem in One Sentence

In India's flood, landslide and highway emergencies, **the entire golden hour is spent just getting there** — so we built a system that arrives in the first ten minutes, works at 2 AM, and keeps working when the cell towers don't.

---

## 2. Why This Problem, Evidenced

### 2.1 The golden hour is consumed before care begins

A 2024 study of road-accident emergency timelines on Indian national highways (Sarkar et al., *Journal of Emergency Medicine and Disaster Management*) decomposes the 60-minute golden hour as follows:

| Stage | Description | Time consumed |
|---|---|---|
| **T1** | Crash occurs → crowd recognises need for help | ~5 min |
| **T2** | Good Samaritan calls ambulance | ~5 min |
| **T3** | Ambulance reaches scene + extrication | **25–30 min** |
| **T4** | Transport to trauma centre | **20 min** (bimodal; often >40 min) |
| | **Total to definitive care** | **55–60+ min** |

The finding is devastating and precise: **the golden hour is spent almost entirely on T3 — the approach.** By the time a patient reaches a trauma centre, there is "very meagre time left" for actual emergency care. T3 is the only stage that robotics can compress.

Maharashtra's 108 (MEMS) service confirms this at scale: median emergency response times of 20–25 minutes across districts (32 min in Amravati), with ~25% of all emergencies exceeding 30 minutes, at a coverage ratio of one ambulance per 118,605 people. Rural ambulance utilisation sits between 9% and 20% in several multi-state studies.

### 2.2 Disasters make the gap fatal, not merely inconvenient

Per Ministry of Home Affairs data reported in June 2026, **India has recorded ~5,000 deaths from floods and landslides in the last three years**, with 30 states/UTs identified as vulnerable and 132 NDRF teams deployed. Specific 2026 incidents illustrate the operational gap:

- **Assam (July 2026):** 87 confirmed deaths, 705,000+ affected, thousands displaced. Official reporting notes many people **remain missing and possibly buried under debris and silt**, explicitly increasing "the need for drone assessments to support search efforts."
- **Gujarat, Dholka (July 2026):** >790 people evacuated by the Indian Army; in Petli village >100 were stranded with 58 rescued by NDRF. Local response relied on boats and tractors. Mehsana-based Prime UAV was brought in for aerial surveillance — **including after sunset, when ground operations became unsafe** — and for payload drops to areas boats could not reach.
- **Assam & Nagaland:** IAF helicopters evacuated 458 people over ten days and moved 9+ tonnes of relief.

Two patterns are visible in every one of these operations, and they define our target:
1. **Detection is manual and slow.** A human pilot spots a person in a live video feed. That is the bottleneck. It scales linearly with area and daylight.
2. **Recovery is the last mile, and the last mile is the hardest.** Boats, tractors and helicopters are expensive, slow to mobilise, and unavailable in exactly the terrain where people are trapped.

### 2.3 The missing ten minutes

For drowning, hemorrhage, cardiac arrest and crush trauma, survival falls sharply when definitive care is delayed. A system that reliably places a trained responder's kit — and a trained human's judgement — at the victim within ten minutes is not an optimisation. It is the whole game.

---

## 3. The Competitive Gap (Why This Is Not "Another Delivery Drone")

Judges will ask why this isn't Airbound, Redwing, or Telangana's "Medicine from the Sky." Fair question — those systems are real, funded, and working. We do not compete with them. **They deliver cargo. We deliver care — and we cover the conditions they explicitly cannot.**

| Capability | Deployed Indian medical-drone systems | GOLDEN-10 |
|---|---|---|
| **Primary function** | Transport of samples, blood bags, vaccines | Transport **+ on-scene stabilisation + automatic victim detection** |
| **Operating hours** | Daylight only — MoCA trial SOPs mandate **VMC conditions, sunrise to sunset** | **Night-capable by design** (LWIR thermal + IR illumination + acoustic) |
| **Detection** | Human pilot watches a video feed and calls it in | **Onboard edge AI**: automatic detection, geotagging, confidence-scored, works on 100% of scan area unattended |
| **Comms** | Assumes a cellular / network data link exists | **Multi-hop mesh** (drone ↔ rover ↔ bystander phones); functions with towers down |
| **Terrain coverage** | Fixed point-to-point corridor, road- or river-adjacent | **Heterogeneous pair**: drone covers the open span, amphibious rover covers the final 50–100 m where roads end |
| **Regulatory posture** | BVLOS authorisation still case-by-case; narrow state/ICMR exemptions | **Legal-by-design from day one** — 400 ft AGL hard cap, VLOS-first, documented corridor-expansion path |
| **Accessibility** | Proprietary, venture-funded | Fully open-source stack, buildable on a ₹0–₹25k budget |

### Why the night gap is the wedge

The single most important line in India's own medical-drone trial conditions is this: **flights are permitted only during local sunrise to local sunset, in Visual Meteorological Conditions.** Every authorised medical drone corridor in India today therefore *cannot fly at night*.

Flood rescues happen at night. Cardiac arrests happen at night. Assam's missing victims were under debris at night. **The hours when the need is highest are the hours the current regulatory and operational envelope forbids flight.** Closing this gap — legally, technically, and inexpensively — is both the biggest real-world impact and the cleanest space for a student team to own.

---

## 4. Our Solution: A Heterogeneous First-Response Pair

Two cooperating vehicles with one shared brain, one shared mesh link, and one job: close T3.

### 4.1 "Kite" — the aerial scout and relay

- Quadcopter, ~450 mm class, VTOL, geofence-locked at **400 ft AGL**
- **RGB + LWIR thermal** gimbal for all-weather, low-light detection
- **Onboard edge inference** (quantised detector, no cloud dependency) — detects persons in water, on debris, in rubble, and against thermal backgrounds
- Deploys: micro-payload (blood bag in PCM cold-chain, trauma kit, ORS, thermal blanket) **and** a comm-relay + GPS-marker pod
- Flies a **systematic lawnmower/coverage scan pattern** rather than free flight — maximises detected area per battery minute, which is the metric that matters
- Compliant by construction: geofencing, RTH, automatic flight termination, 15% minimum energy reserve, conspicuous paint + strobe, DAA-ready

### 4.2 "Rover" — the last-50-metres responder

- Wheeled/tracked amphibious ground robot (~300 mm class), sealed for mud and standing water
- Carries the **heavy** kit the drone cannot: defibrillator, trauma shears, splints, tourniquet, larger blood units
- Traverses landslide debris, flooded paddy fields, broken ghats roads — surfaces that end T3 for ground vehicles
- Follows the drone's cached breadcrumb trail to the victim, then **establishes a stable comms node** so remote medical staff can guide a human responder

### 4.3 The handoff (the core innovation)

```
[108 / bystander call] ──► Mission Console (offline-capable)
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
        KITE: scan + detect              ROVER: staged at LZ
                │                               │
        geotag victims, cache               ▲
        payload + relay pod ─────────────►  └── follow breadcrumbs,
                                                carry heavy kit,
                                                hold comms node
                                │
                                ▼
                    Triage dashboard: who, where, how critical,
                    what kit is on the ground, ETA of human responder
```

The drone is the eyes and the ears. The rover is the hands. Neither alone closes T3; the pairing does.

### 4.4 Triage support (decision-*aid*, not diagnosis)

Every detected victim is scored on observable, non-clinical factors — **motion, thermal signature, submersion state, responsiveness to a remote audio/light stimulus** — and mapped to a four-level urgency band. **This system flags and prioritises; it does not diagnose.** A qualified human medical professional makes every clinical call. Presenting this boundary explicitly is a requirement, not a caveat.

---

## 5. Technical Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  EDGE LAYER (onboard, no internet required)                │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │ RGB detector│  │ LWIR thermal │  │ Acoustic (drowning/│ │
│  │             │  │  detector    │  │ distress beacon)   │ │
│  └──────┬──────┘  └──────┬───────┘  └─────────┬──────────┘ │
│         └────────────────┼───────────────────┘            │
│              Multisensor fusion + geotagging                │
│                          │                                 │
│              Coverage-path planner (max area/battery-min)  │
└──────────────────────────┬───────────────────────────────┘
                           │  MESH LINK (survives tower loss)
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
   ┌─────────┐      ┌───────────┐     ┌────────────────┐
   │  Kite   │◄────►│  Rover    │◄───►│ Mission Console│
   │ (drone) │      │ (ground)  │     │  + Dashboard   │
   └─────────┘      └───────────┘     └───────┬────────┘
                                               │
                              ┌────────────────┼────────────────┐
                              ▼                ▼                ▼
                     108 / MEMS / NDRF     Hospital          AAI / ATC
                     control room        (triage)      airspace awareness
```

### 5.1 Communications (the resilience claim, made real)

Primary: Wi-Fi AP on the drone as a local hotspot.
Secondary: **ESP32/LoRa multi-hop mesh** (Meshtastic-compatible) for beyond-line-of-sight relay through the rover and volunteer phones.
Fallback: **delayed store-and-forward** — detection records persist on-device and sync on any reconnection, so no event is ever lost.

Every layer degrades gracefully. Losing all infrastructure reduces performance; it never silences the system.

### 5.2 Regulatory-by-design compliance

Built against the actual conditions in MoCA's own BVLOS trial SOPs and the Drone Rules, 2021:

| Condition | Our design response |
|---|---|
| 400 ft AGL maximum | Hard geofence in flight firmware, not a software toggle |
| 15% energy reserve minimum | Hard floor in the mission planner's return logic |
| Geofencing, RTH, automatic flight termination | All three implemented and demonstrable in sim |
| 360° obstacle avoidance + DAA | Simulated with an injected manned-aircraft track |
| Daylight/VMC operations | **Architected as a night-capable superset**, so a future authorisation is a config change, not a redesign |
| Barometric sensor, strobe, conspicuous livery | Spec'd into the bill of materials |
| UTM / airspace data exchange | Dashboard publishes live trajectory + identity feed in the format ATC trials require |
| BVLOS authorisation | **Explicitly NOT claimed.** We present a staged path: authorised VLOS trial → corridor-specific trial corridor → authorisation application |

> **Regulatory honesty as a feature.** DGCA's public notice of 4 July 2026 made clear that no notified framework currently permits BVLOS, and that this prohibition extends to *advertising, promoting or offering* such operations. Civil Aviation Minister Kinjarapu Rammohan Naidu indicated on 19 August 2026 that a refined BVLOS certification framework is targeted by end-2026 — a reported timeline, not a notified framework. **We therefore build VLOS-first and legally, and we do not market anything beyond our authorisation.** For a judging panel that includes regulators and NDRF-adjacent stakeholders, this is the difference between a credible proposal and a disqualified one.

---

## 6. Zero-Budget Build Plan (₹0)

The entire demo runs on simulation, open source, and hardware the team already owns or can borrow. **Nothing in the critical path requires purchase.**

| Layer | Tool | Cost |
|---|---|---|
| Flight simulation | **PX4 SITL** + **Gazebo / Ignition** | ₹0 |
| Ground robot simulation | **Webots** or **Isaac Sim (free)** | ₹0 |
| Detection models | Ultralytics YOLO + LWIR fine-tune; quantise to INT8 | ₹0 |
| Thermal datasets | Public thermal-person datasets + self-captured via phone FLIR app | ₹0 |
| Mesh networking | ns-3 / OMNeT++ simulation; ESP32 mesh only if borrowed | ₹0 |
| Mission console | React + Leaflet/MapLibre + WebSocket telemetry | ₹0 |
| Dashboards | Grafana + InfluxDB + Postgres/PostGIS | ₹0 |
| Digital twin | QGIS + OpenStreetMap (flood-village scenario, e.g. ASR district) | ₹0 |
| Compute | Existing laptop / college lab; free-tier cloud only for training, never for inference | ₹0 |

### 6.1 The demo that wins

Judges decide in the first 90 seconds. Ours is a **live digital-twin scenario**, not a slide deck:

1. **Hook (30 s):** A live dashboard showing a flood village at **02:14 AM** — no sunlight, rain, cells down. A simulated 108 call fires from a stranded villager.
2. **Ignition (90 s):** Kite launches from a simulated staging point. Its feed shows **thermal detection lighting up victims the naked eye cannot see** at night — the exact thing no authorised Indian medical drone can currently do. Detections geotag live on the map; the console auto-generates a priority list.
3. **Handoff (60 s):** Rover deploys, follows breadcrumbs across simulated floodwater and debris, arrives, drops the trauma kit, and holds a comms node.
4. **Punchline (30 s):** Console prints the T3 delta: *"Conventional response: 31 min. GOLDEN-10: 9 min 40 s."* Then the compliance panel opens: geofence at 400 ft, energy reserve, RTH, AFT, trajectory feed — every regulatory condition, demonstrated live.

Optionally, a **physical breadboard drone** on a test bench flies a scripted figure-eight with the detection pipeline running on a phone, to prove the software is not a video edit.

---

## 7. 36-Hour Execution Plan

| Sprint | Hours | Deliverable | Owner |
|---|---|---|---|
| **S0 — Recon** | 0–3 | Scenario digital twin built; PX4 SITL flying; repo + CI live; problem statement pinned to measurable T3 target | All |
| **S1 — Perception** | 3–10 | RGB + thermal detectors training; fusion + geotagging producing a live victim list on the dashboard | Perception ×2 |
| **S2 — Air** | 6–14 | Coverage-path planner; geofence, RTH, AFT, energy-reserve logic integrated into SITL; telemetry to console | Airframe ×2 |
| **S3 — Ground** | 10–18 | Rover sim: amphibious locomotion, breadcrumb following, payload drop, comms node hold | Ground ×2 |
| **S4 — Mesh** | 14–22 | Link-loss injection test; store-and-forward persistence; graceful-degradation demo | Comms ×1 |
| **S5 — Console** | 16–26 | Integrated dashboard: map, victim priority, live telemetry, compliance panel, T3 delta | Full-stack ×1 |
| **S6 — Rehearse** | 26–32 | End-to-end dry runs ×5; failure injection (comms loss, low battery, false positives); narrative locked | All |
| **S7 — Polish** | 32–36 | Demo video backup, README, submission docs, 3-min pitch cuts | All |

**Critical path:** S1 → S5. If perception slips, cut S4 mesh to simulation-only and keep the demo story intact.

### Team (4–6)

| Role | Owns |
|---|---|
| Perception / AI ×2 | Detectors, fusion, edge quantisation |
| Flight & controls ×1 | PX4, geofence, compliance logic |
| Robotics / sim ×1 | Rover dynamics, locomotion |
| Comms ×1 | Mesh, resilience, telemetry |
| Full-stack / pitch ×1 | Dashboard, narrative, submission |

---

## 8. Success Metrics

Judges discount vague impact claims. Ours are instrumented and displayed live on the dashboard.

| Metric | Target | How measured |
|---|---|---|
| **T3 compression (headline)** | ≤10 min to victim, vs 25–30 min baseline | Sim mission log |
| **Night detection recall** | >85% on thermal eval set | Held-out labelled set |
| **Night false-positive rate** | <10% | Same |
| **Comms-loss degradation** | Detection continues at ≥70% capability with all infrastructure offline | Injected-failure test |
| **Mission completion with 15% reserve** | 100% of runs | Automated assertion |
| **Geofence violation count** | 0, across all runs including fault injection | Flight-log audit |

---

## 9. Risks and Honest Limitations

| # | Risk | Likelihood | Mitigation |
|---|---|---|---|
| 1 | **Thermal false positives** (hot roofs, engines, debris) | High | Multi-sensor fusion with acoustic + motion gating; confidence scoring with human-in-the-loop |
| 2 | **Regulatory misstep** — overclaiming BVLOS | Medium | VLOS-first architecture; legal-by-design geofencing; compliance panel in the demo; no unauthorised claims anywhere in the pitch or submission |
| 3 | **Perception model underperforms on night data** | High | Start with public thermal datasets; fine-tune; degrade gracefully to daytime-only with an explicit on-screen indicator rather than a silent failure |
| 4 | **Scope creep across two vehicles** | Medium | Rover is a follower, not an autonomous explorer — a deliberately narrow, achievable autonomy scope |
| 5 | **Weather (rain, wind) degrades flight** | High | Wind/rain thresholds in the planner; documented abort-and-hold behaviour; rover takes over when air does not |
| 6 | **Robotics community sees "just simulation"** | Medium | Simulation is a *budget* response, not a capability limit. Publish the sim→real parameter delta so the path to hardware is explicit and reviewable |
| 7 | **No hardware validation** | High | Recruit a drone cell / college robotics club as a hardware partner post-hackathon; PVG/AGPL licensing keeps the real build open |

**Non-negotiable limitation, stated plainly:** this system **prioritises** victims; it does not **diagnose** them. Remote clinical decisions remain with licensed professionals. Blood and vaccine carriage requires cold-chain validation under medical device and drug transport regulation before any real deployment. This project is a research demonstrator, not a certified medical device.

---

## 10. Impact & Sustainability

- **Design for existing infrastructure, not against it.** GOLDEN-10 is a force multiplier for 108/MEMS control rooms, NDRF teams (132 deployed across India), SDRFs and the SDMA — not a replacement for any of them.
- **Open-source from commit one.** Everything we build is permissively licensed and reproducible on ₹0 hardware, so a district administration or a college in Assam can reproduce and adapt it. This is how a student prototype becomes public infrastructure.
- **Unit economics.** Every existing system reports per-flight cost (Airbound: ~₹24 today, targeting ₹1). Our target: **₹0 marginal cost per mission after deployment**, because the expensive part — the aircraft — is amortised across an entire district's emergency load rather than flown per-sample.
- **Local skill.** The Andhra Pradesh tribal network trained 25+ local youth in drone operations. Our deployment model assumes and funds the same: **operate with local youth, build with Indian components.**

---

## 11. 36-Month Roadmap

| Phase | Horizon | Goal |
|---|---|---|
| **Phase 1 — Simulation** | 0–12 mo | Validated algorithms, published paper, open-source release, hackathon → institutional project |
| **Phase 2 — College Prototype** | 12–24 mo | Real hardware on a ₹1–2L build: small quad + thermal module + tracked rover; VLOS field trials on college land |
| **Phase 3 — Authorised Pilot** | 24–36 mo | Partner with a state health department / NDRF cell; apply for an authorised trial under the Drone Rules, 2021 and the MoCA trial SOPs; field data from a real flood or highway corridor |

**Phase 3 is explicitly contingent on regulatory authorisation.** We do not fly before we are permitted to.

---

## 12. Why a Student Team Can Credibly Do This

1. **The hard parts are software and modelling** — perception, coverage planning, resilience, interface design. All of it is buildable at ₹0 and is where this proposal concentrates its effort.
2. **The domain context is available.** India's medical-drone pilots are public, documented, and actively seeking technical partners. MDoNER's SIH 2026 problem statements on NER landslide early-warning and logistics accessibility confirm active government attention to exactly this terrain.
3. **The regulation is written down.** MoCA's trial conditions are published, specific, and implementable. That is a gift: we can engineer to a published specification instead of guessing.
4. **The pain is unambiguous and current.** ~5,000 flood and landslide deaths in three years; a 60-minute golden hour that is 50 minutes of *driving*; victims under debris right now.

---

## Appendix A — Key Sources

**Emergency & disaster context**
- Ministry of Home Affairs data via ETV Bharat (15 Jun 2026): ~5,000 flood/landslide deaths in 3 years; 30 vulnerable states/UTs; 132 NDRF teams
- India Floods 2026 Situation Report, HAI / ReliefWeb (5 Aug 2026): Assam 87 deaths, 705,000+ affected, missing persons under debris
- Times of India / PTI (27 Jul 2026): Gujarat Dholka floods; Army evacuated 790+; Prime UAV night surveillance and payload drops
- India Defence Wire (28 Jul 2026): IAF evacuated 458 across Assam/Nagaland in 10 days, 9+ tonnes relief

**Golden hour & EMS performance**
- Sarkar et al., *J. Emergency Medicine and Disaster Management* (2024) — highway accident T1–T4 timeline, PMC11006034
- Sarkar et al. (2024), *Cogent Public Health* — Maharashtra 108/MEMS response time analysis, 38,823 calls
- EPW (2018), "108 in Crisis" — CAG audit data: mean response 41–47 min in Madhya Pradesh; 1 ambulance per 118,605 people
- GVK EMRI epidemiological study (2016) — mean response 15 min (Goa) to 32 min (Assam)

**Regulation**
- DGCA public notice, 4 Jul 2026 — no notified BVLOS framework; prohibition extends to advertising/promoting/offering; type certificate ≠ authorisation
- MoCA / DGCA conditional exemptions — ICMR (Andaman & Nicobar, Manipur, Nagaland, 10 Sep 2021); DoHFW Meghalaya (Mawkyrwat → Ranikor, 2 Jul 2021), incl. full trial condition set
- The Drone Rules, 2021 (G.S.R. 589(E), 25 Aug 2021) and Drone (Amendment) Rules, 2023
- Ministry of Civil Aviation (19 Aug 2026, Kurnool) — reported end-2026 BVLOS certification framework timeline

**Prior art & competitive landscape**
- Redwing × AP Health Dept, ASR district tribal network — 1,800+ flights, 71,000+ km, 24,500+ patients, 596 sickle-cell samples, 9,000 tests, 8 facilities from Paderu GH (Aug–Sep 2026)
- Airbound × Narayana Health — 700+ flights over 54 days, 4 km route in 10 min, 40 samples/flight, zero failures, $8.65M seed, blended-wing-body tailsitter
- Apollo × The ePlane Company MoU (Jul 2026) — e200X air ambulances + Amber Wings medical drones
- Telangana Drone Corridor "Medicine from the Sky"; ICMR/DoHFW trial corridors

---

*Prepared as a hackathon project proposal. All operational claims are scoped as research demonstrators. Any real flight requires prior DGCA authorisation under the Drone Rules, 2021.*
