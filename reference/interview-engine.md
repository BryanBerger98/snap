# The interview engine — how snap elicits a product definition

> The shared elicitation engine behind the product-definition skills (`/define`
> and `/brainstorm`). Both load this file; it is the single source of truth for
> **how** the interview runs. The templates are the *output*; this is the *method*.
>
> It replaces open, verbose interviewing with an **expert copilot**: Claude
> proposes, the user triages, and no domain closes until it is genuinely covered.
> Grounded in recognized product-discovery frameworks (sourced per phase below).

---

## 0. The inversion — why this exists

The previous skills had the **load inverted**: they asked open questions ("describe
the vision", "what are the pains?") and the user had to produce everything in prose.
Result — long, unspecific interviews and generic, hollow artifacts, because the user
carried the whole production and the skill never checked it had covered the ground.

The engine inverts it:

- **Claude diverges** (proposes expert candidates grounded in context); **the user
  converges** (selects, corrects, adds). The user reacts instead of composing.
- **Domain by domain.** One subject is fully explored before the next opens.
- **Gated.** A domain cannot be left until its facets are covered — or explicitly
  waived with a reason.
- **Evidence-aware.** Nothing is written as fact unless it is grounded; guesses are
  tagged and surfaced, never laundered into certainty.

---

## 1. The loop — PROPOSE → TRIAGE → DIG → GATE

Every domain runs the same four-beat loop.

```
1. PROPOSE   Claude generates 3–4 candidates for the current micro-question,
             grounded in the brief / audit / prior answers, through an EXPERT LENS
             (§2.1). Cold start (no context yet): one open seed question, then
             every later step is propose-driven.

2. TRIAGE    AskUserQuestion (multi-select + always "Other"). The user keeps,
             cuts, edits, adds. This is the DEFAULT channel — prose is reserved
             for genuinely open input (vision narrative, a nuance the options miss).

3. DIG       For each kept item, escalate to specificity with targeted probes
             (§2.3). Unpack vague words, anchor in the last real instance, ask
             "evidence or guess?". This is what makes the interview short yet deep
             instead of long and shallow.

4. GATE      Before leaving the domain, render the coverage checklist (§2.6):
               Covered: A 🟢, B 🟡   Missing: C   Unverified (🔴): 2 items
             Then ask explicitly: "dig the gap, or waive it (with a reason) and
             move on?" The domain never closes silently.
```

### Calibration (locked)

| Knob | Setting | Behaviour |
| --- | --- | --- |
| **Gate rigidity** | **Strict but escapable** | Each facet must be either covered (🟢/🟡) **or** marked `N/A — reason: …`. Real rigor, but the user can always pass by justifying. Never a hard block. |
| **Evidence tag** | **Visible in the artifact** | Every captured item carries 🟢/🟡/🔴 through to the final document; each artifact ends with a **"À valider"** box listing its 🔴 items. |
| **Default depth** | **Always deep** | All facets, all probes, every session. The engine optimizes for thoroughness over speed (the user's explicit preference). A future `--quick` flag may relax this; not the default. |

---

## 2. Cross-cutting mechanics

### 2.1 Propose lenses

Claude never proposes "by feel". Each phase has a set of **lenses** — proven grids it
diverges through, so candidates are expert-grade and systematically complete. Example:
for *pains*, it sweeps the three job types (functional / emotional / social) rather
than only the functional one — the single most documented blind spot. Lenses are
listed per phase in §4.

### 2.2 The blind-spot bank

The heart of "help me cover what I didn't think of". Each phase carries a curated list
of **what teams routinely forget**, drawn from the framework research. The gate checks
it explicitly. This is what makes the engine an *aide*, not a transcriber.

### 2.3 The Dig toolkit (anti-superficial probes)

When an answer is vague or thin, escalate instead of accepting it:

- **Unpack the vague word** — "faster than what?", "complicated how, exactly?"
- **Anchor in the last real instance** — "tell me about the last time this happened;
  what did you do, step by step?" (past behaviour, never a hypothetical).
  *Source: The Mom Test; Continuous Discovery (Torres).*
- **5 Whys** — drill from symptom to root motivation.
- **Forces of progress** — push (frustration) / pull (attraction) / anxiety / habit.
  *Source: JTBD switch interview (Christensen, Moesta).*
- **Evidence or guess?** — "do you know this from a real instance, or are we assuming?"

### 2.4 Evidence tagging

Every captured item is tagged:

- 🟢 **Evidence** — observed past behaviour, real data, a concrete instance.
- 🟡 **Belief** — informed conviction, no hard evidence yet.
- 🔴 **Assumption** — a guess that needs validation.

A domain that is mostly 🔴 is written as **hypotheses to validate**, not as fact. Each
artifact rolls its 🔴 items into a **"À valider"** box. *Source: Value Proposition
Canvas evidence marking; Lean Startup leap-of-faith assumptions.*

### 2.5 Anti-rationalization guardrails (The Mom Test)

The user is often the only informant (solo projects), so the engine must **challenge**,
not just record:

- Don't pitch, then ask if they like it — ask what they do **today**.
- Treat "I would / I always / I never" (fluff) and compliments as **bad data** —
  redirect to a concrete past instance.
- Prefer commitment/behaviour signals over stated enthusiasm.

### 2.6 Coverage gate spec

A gate is a checklist of the domain's **facets** (§4). For each facet the state is one
of: `covered` (🟢/🟡), `missing`, or `N/A — reason`. The gate:

1. Renders the checklist (every facet + its state + evidence tag).
2. Lists the 🔴 (unverified) items.
3. Asks the **dig-or-waive** question for every facet still `missing`.

It is **strict but escapable** (§1): no facet may stay silently `missing` — it is
either dug to `covered` or explicitly `N/A — reason`. State persists across the
session (§5).

### 2.7 Convergence bar (diverge phases only)

Phases that diverge (Discover, Ideate) must converge through an explicit bar before
output — e.g. a feature survives only if it serves a real 🟢 pain, is not Kano
*Indifferent*, and scores above the batch on opportunity. Defined per phase in §4.

---

## 3. The phase map — 5 phases → artifacts

Reconciled from Double Diamond, Design Thinking, Lean Startup, Dual-track Agile,
Continuous Discovery and Cagan/SVPG — all sharing a **diverge → converge** rhythm.
Snap covers the **definition** arc (not delivery).

| # | Phase | Rhythm | Snap artifact | Skill / action | Governing frameworks |
| - | --- | --- | --- | --- | --- |
| 1 | **Frame** | converge on ONE problem | `BRF-001` (Brief / PR-FAQ) | `/define` → `draft-brief` | Working Backwards, Cagan Opportunity Assessment, Lean Canvas, North Star, Double Diamond *Define* |
| 2 | **Discover** | diverge then converge | `PER-*` (Personas) | `/define` → `define-vision` | JTBD (Christensen + Ulwick), Value Prop Canvas, The Mom Test, Empathy Map, Continuous Discovery |
| 3 | **Ideate** | diverge wide then cut | `FEAT-*` (`depth: stub`) | `/brainstorm` → `write-stubs` | HMW, Crazy 8s, SCAMPER, persona×pain, Opportunity Solution Tree, Kano / RICE / Opportunity Scoring |
| 4 | **Specify** | converge deep | `FEAT-*` (`depth: specified`) | `/define` → `spec-feature` | User Story Mapping (Patton), INVEST, Given/When/Then, MVP slicing |
| 5 | **De-risk** | converge | `ADR-*` + risk register | `/define` → `tech-review` | Four Big Risks (Cagan), DVF (IDEO), Assumption Mapping, RAT |

> **Gap this fixes:** the old `tech-review` only covered feasibility-type concerns
> (security / resilience / data / performance / deps). The literature insists on
> **four risks** — value, usability, feasibility, viability (+ ethical). Value and
> viability were missing — exactly where products die. Phase 5 closes this.

---

## 4. The bank — per phase

Each phase lists: **goal**, **facets** (the gate checklist), **blind spots**, **propose
lenses**, **dig probes**, **convergence bar** (if diverging), and **output**.

### Phase 1 — FRAME → Brief / PR-FAQ (`draft-brief`)

**Goal:** converge on a single problem worth solving, for a specific customer, with a
reason to act now and a credible measure of success.

**Facets (gate):**
- `F1` Problem — the core pain today, from the customer's view (not the solution).
- `F2` Target customer — a specific segment, and who comes *first*. Never "everyone".
- `F3` Current alternatives / workaround — what they use today and why it falls short.
- `F4` Why now — the timing / market window that makes this the moment.
- `F5` Value proposition & differentiator — meaningful, unique, **defensible** (MUD).
- `F6` North Star / success metric — leading, value-reflecting, actionable.
- `F7` Non-goals / anti-goals — what we explicitly will NOT do, and the trade-off.
- `F8` Opportunity size — how big (TAM / segment), enough to justify the work.
- `F9` Riskiest assumption — the leap of faith that, if wrong, sinks the idea.

**Blind spots:** why-now skipped · non-goals absent · "for everyone" · differentiator
not actually defensible · vanity North Star · competitors / existing workaround ignored
· solution proposed before the problem is established.

**Propose lenses:** Working Backwards PR-FAQ question set (customer, problem, solution,
quote, FAQ) · Cagan's 10 opportunity-assessment questions · Lean Canvas (problem / UVP /
unfair advantage / why-now) · North Star 3 tests (leading? real value? actionable?) ·
Moore elevator-pitch slots for the differentiator (`For … who … unlike … our product …`).

**Dig probes:** "for everyone → who *specifically*, who first?" · "why hasn't this been
solved already?" · North Star perverse-incentive check: "name 3 ways this metric could
rise while users are worse off" · "if this metric dropped 15% overnight, would every
team care?" (true North Star test).

**Convergence:** name the ONE problem that matters most for user *and* business; the
rest is explicitly parked (Double Diamond *Define*).

**Output:** `BRF-001` (singleton). The 8 FAQ answers map to F1–F8; the **Hypothèse la
plus risquée** section is F9. 🔴 assumptions → the "À valider" box.

---

### Phase 2 — DISCOVER → Personas (`define-vision`)

**Goal:** an evidence-based understanding of who the users are and what progress they
are trying to make — deep enough that features can be challenged against real pains.

**Facets (per persona):**
- `D1` Identity — role / segment, **lean**: only fields that change a decision.
- `D2` Jobs — functional **and** emotional **and** social (three distinct jobs, Ulwick).
- `D3` Pains — functional / emotional / social / risk, each with a severity.
- `D4` Gains / desired outcomes — in `minimize|maximize + metric + object` form.
- `D5` Current workaround — how they solve it today (reveals the real bar).
- `D6` Trigger & context — when / where / how often / what device.
- `D7` Forces of progress — push / pull / anxiety / habit around switching.
- `D8` Evidence level — every item tagged 🟢/🟡/🔴.

**Blind spots:** only functional jobs (miss emotional/social) · decorative persona
fields (age/hobbies that change nothing) · workaround omitted · trigger & frequency
missing · aspirational instead of observed behaviour · assumption treated as fact.

**Propose lenses:** Value Proposition Canvas trigger questions (jobs / pains / gains) ·
Ulwick desired-outcome statement format · Empathy Map (says / thinks / does / feels) ·
NN/g persona mandatory-field checklist (goal, motivation, pain, behaviour, context,
quote) · proto vs research-based persona (mark which one this is).

**Dig probes:** "tell me about the last time…" (story-based, not survey) · unpack vague
words ("faster than what?") · 5 Whys to root motivation · tag each statement to a force
(push/pull/anxiety/habit) · redirect compliments & "I always/would" fluff to a concrete
instance (Mom Test) · "evidence or guess?" on every pain.

**Convergence bar:** every persona is someone who actually has the job (no straw users);
pains ranked by severity × frequency; emotional/social jobs captured, not only functional.

**Output:** `PER-*` with evidence tags + a per-persona "À valider" box.

---

### Phase 3 — IDEATE → Feature catalogue (`write-stubs`)

**Goal:** diverge broadly on possible solutions, then converge on the ones that serve a
real pain and ladder to the North Star.

**Facets (gate):**
- `I1` Divergence coverage — every persona×pain cell explored; jobs-adjacency (the job
  before and after ours); features for emotional/social jobs; competitor whitespace;
  SCAMPER on any existing feature.
- `I2` Value hypothesis per candidate — "We believe `<X>`, measured by `<Y>`."
- `I3` Each survivor linked to a real 🟢 persona pain.
- `I4` Functional domain slug per feature (becomes the `03-features/<domain>/` subfolder).
- `I5` Convergence scoring — Kano category · Opportunity Score · quick four-risk read.

**Blind spots:** only functional-job features · converging too early (filtering while
generating) · orphan features (serve no pain) · ignoring Kano *Indifferent / Reverse*
(building things nobody wants) · single-angle group-think.

**Propose lenses:** persona×pain matrix (≥2 ideas/cell) · JTBD adjacency prompts
(before/after job) · How-Might-We reframes (5 per top pain) · SCAMPER (substitute,
combine, eliminate…) · Crazy-8s framing · competitor teardown (gap / parity / whitespace)
· Opportunity Solution Tree (outcome → opportunity → solution).

**Dig probes:** "what job comes *before* / *after* this one?" · "functional, emotional,
or social job?" · "what would make this 10× better than the best competitor version?"

**Convergence bar:** a feature survives only if it (a) serves a real 🟢 pain, (b) is not
Kano *Indifferent*, (c) scores above the batch on Opportunity = `Importance +
max(Importance − Satisfaction, 0)`, and (d) ladders to the North Star.

**Output:** `FEAT-*` (`depth: stub`) = title + persona(s) + value hypothesis + domain.

---

### Phase 4 — SPECIFY → Feature, specified (`spec-feature`)

**Goal:** converge one `Now` feature into a buildable spec.

**Facets (gate):**
- `S1` Problem / job & today's workaround.
- `S2` Objective & metric — the **outcome** it moves (behaviour change), not an output.
- `S3` Scope in / out — the thinnest valuable slice; **explicit exclusions**.
- `S4` User flow.
- `S5` User stories — "As a `<persona>`, I want `<action>`, so that `<benefit>`"; INVEST.
- `S6` Acceptance criteria — Given/When/Then; happy path **and** at least one sad path.
- `S7` Non-functional requirements — latency · security · accessibility (a11y) ·
  observability · scale · compatibility · localisation.
- `S8` Dependencies — features / services / third parties.
- `S9` Instrumentation — the analytics events needed to measure `S2`.
- `S10` Rollout & migration — flag / segment; existing-data handling; kill-switch.
- `S11` Open questions / risks.

**Blind spots:** error/sad paths unspecified · exclusions not written → scope creep ·
NFRs omitted · analytics not specced → success unmeasurable · migration / kill-switch
forgotten · value phrased for the system, not the user.

**Propose lenses:** User Story Mapping backbone (activities → tasks → details) ·
Given/When/Then scenarios · INVEST checklist · in/out-of-scope table · NFR checklist ·
Seiden outcome format (who / does what / by how much).

**Dig probes:** "what happens when it fails / the user has no data / too much data?" ·
"if this item were missing on launch day, would we delay?" (scope test) · "outcome or
output?" on the objective.

**Convergence:** passes Definition of Ready — persona named, AC testable, sized,
dependencies known, NFRs called out.

**Output:** feature `depth: specified` (full PRD body) + 🔴 box.

---

### Phase 5 — DE-RISK → ADR + risk register (`tech-review`)

**Goal:** surface every material risk and resolve it — into a decision or a planned test
— before build starts. **The four big risks + ethical** (this replaces the old
feasibility-only NFR pass; feasibility is now just `R3`).

**Facets (gate):**
- `R1` **Value** — will they use / buy it? Is there evidence, or only stakeholder opinion?
- `R2` **Usability** — can they figure it out without help?
- `R3` **Feasibility** — can we build it (tech, skills, constraints)? *(the old
  tech-review NFR grid — security, resilience, data protection, performance,
  dependencies — lives here.)*
- `R4` **Viability** — legal, finance, compliance, brand, sales, data protection (RGPD).
- `R5` **Ethical** — harm, privacy, fairness, manipulation, exclusion.

Each risk resolves to either an **ADR** (decision made) or an **assumption to test** with
a success criterion ("We believe… we'll know it's true when…"). Every ADR carries a
`risk_type` ∈ `value | usability | feasibility | viability | ethical`.

**Blind spots:** testing only feasibility ("can we code it?") · value answered by "we
asked stakeholders" not user evidence · viability ignored for internal tools · assuming
regulatory approval is automatic · perverse incentives unexamined.

**Propose lenses:** Cagan four risks · DVF (desirability / viability / feasibility) ·
Assumption Mapping 2×2 (importance × confidence — test the high-importance /
low-confidence quadrant first) · Riskiest Assumption Test template.

**Dig probes:** "if this assumption is false, does the whole thing fail?" · "what is our
confidence based on — data, an interview, or a hunch?"

**Convergence:** no risk left "unknown" — each is an ADR or a scheduled test. The
register rolls up every 🔴 from phases 1–4.

**Output:** `ADR-*` (append-only, each with `risk_type`) + a consolidated risk register.

---

## 5. Gate-state persistence — `.snap/interview-state.json`

Coverage survives across sessions so a resumed interview knows what is already covered.
This file complements `.snap/define-progress.json` (which holds the **phase-level** gates
`briefConfirmedAt` / `roadmapReviewedAt`); `interview-state.json` holds the **within-phase
facet** coverage. It is scratch state — never written to `<docsPath>`, never linted.

```json
{
  "version": 1,
  "phases": {
    "frame":    { "artifact": "BRF-001", "facets": { "F1": {"state": "covered", "evidence": "🟢"}, "F7": {"state": "waived", "reason": "single-purpose tool, no non-goals yet"} }, "openAssumptions": ["willingness to pay for alerts"], "gatePassedAt": "2026-06-15" },
    "discover": { "perEntity": { "PER-001": { "facets": { "D2": {"state": "covered", "evidence": "🟡"} }, "openAssumptions": [], "gatePassedAt": null } } },
    "ideate":   { "facets": {}, "openAssumptions": [], "gatePassedAt": null },
    "specify":  { "perEntity": {} },
    "derisk":   { "facets": {}, "openAssumptions": [], "gatePassedAt": null }
  }
}
```

Rules:
- **Facet `state`** ∈ `covered | missing | waived`. `covered` carries an `evidence` tag
  (🟢/🟡/🔴); `waived` carries a `reason` (the strict-but-escapable escape hatch).
- **Per-entity phases** (Discover, Specify) nest facet maps under `perEntity[<id>]`;
  singleton phases (Frame, Ideate, De-risk) key facets directly.
- **`openAssumptions`** is the running 🔴 list that the GATE renders and the artifact's
  "À valider" box reflects.
- **`gatePassedAt`** is stamped (date) only when every facet is `covered` or `waived`.
- Write atomically after each GATE; `mkdir -p .snap` first. If the file is absent or
  malformed, treat every facet as `missing` (safe default — re-asks, never skips).

---

## 6. Worked example — Discover (one persona, one pass)

```
STEP  Primary job
  PROPOSE  From the brief, 3 candidate jobs — one per type:
             • functional: "track an order's delivery status without calling support"
             • emotional:  "feel in control / not anxious about a late parcel"
             • social:     "look reliable to the client they resold to"
           → AskUserQuestion (multi-select + Other)
  DIG      on the kept job: "Tell me about the last time you needed this.
           What did you do, step by step?"   (past instance, not hypothetical)

STEP  Pains
  PROPOSE  4 pains, each pre-tagged by likely evidence level:
             🟢 "calls support to get a status" (observed)
             🟡 "loses trust after one late parcel"
             🔴 "would pay for proactive alerts"  ← guess
  DIG      "loses trust" → "after how many? what did they actually do next?"

GATE
  Covered : D2 functional job 🟢 · D2 emotional job 🟡 · D3 pains 🟢 · D5 workaround 🟢
  Missing : D6 trigger/context · D3 frequency × severity
  Unverified 🔴 : 1 (willingness to pay for alerts)
  → "Dig the trigger, or waive it with a reason and move to the next persona?"
```

Claude does the expert divergence; the user triages; nothing reaches the artifact as
"fact" without being tagged for what it is.

---

## Source frameworks (per phase, recognized references)

- **Process / phases:** Double Diamond (Design Council) · Design Thinking (IDEO,
  Stanford d.school) · Lean Startup (Ries) · Dual-track Agile (Cagan, Patton) ·
  Continuous Discovery Habits / Opportunity Solution Tree (Torres).
- **Problem & customer:** JTBD (Christensen; Ulwick ODI) · The Mom Test (Fitzpatrick) ·
  Value Proposition Canvas (Osterwalder/Strategyzer) · Empathy Map · Personas (NN/g).
- **Vision & metrics:** Working Backwards / PR-FAQ (Amazon) · Product Vision Board
  (Pichler) · Elevator pitch (Moore) · North Star (Amplitude, Ellis) · OKRs / outcomes
  (Doerr, Seiden, Gothelf) · Lean Canvas (Maurya) · Non-goals (Doshi, Google).
- **Spec & prioritization:** User Story Mapping (Patton) · INVEST (Wake) · Given/When/
  Then (BDD) · RICE (Intercom) · Kano · MoSCoW · Opportunity Scoring (Ulwick) · MVP
  slicing.
- **De-risking:** Four Big Risks (Cagan/SVPG) · DVF (IDEO) · Assumption Mapping
  (Gothelf/Seiden) · Riskiest Assumption Test.
