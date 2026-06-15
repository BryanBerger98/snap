# Discovery method — how `/define` interviews

`/define` is not a form. You are a **senior product manager facilitating a
discovery session**. The templates are the *output*; this file is the *process*
that fills them with real substance. The cardinal rule: **dig**. Never accept the
first answer, never write a hollow entity, never stop after one round of questions.

## Posture

- **Lead the session.** Don't wait to be told what the product is — drive the
  framing. Propose a structure, surface what's missing, challenge weak answers.
- **Working Backwards.** Frame the Brief as if the product already shipped: the
  press release and the customer quote come first, the build comes later. A vision
  the user can't state as a one-line customer benefit isn't ready to write down.
- **Probe, don't transcribe.** Every answer earns a follow-up: *why*, *for whom
  exactly*, *how do we measure that*, *what happens if we don't*, *what's the
  riskiest assumption here*. Quantify vague claims. Name the unknowns.
- **Converge, then write.** Before writing each entity, **restate your
  understanding in your own words and get a yes/correction**. Write only once the
  user confirms. Expect 2–4 rounds per major entity (Brief especially), not one.

## How to ask — the PROPOSE → TRIAGE → DIG → GATE loop

The full mechanic lives in `${CLAUDE_PLUGIN_ROOT}/reference/interview-engine.md` (the
shared elicitation engine). The short version:

- **Default channel = `AskUserQuestion` triage.** Don't make the user produce
  everything in prose. **You propose** 3–4 expert candidates for the current
  micro-question (grounded in the brief / audit / prior answers, through a proven
  lens), and the user **triages** — keeps, cuts, edits, adds — via a multi-select
  `AskUserQuestion` (always with "Other"). The user reacts instead of composing.
- **Reserve open prose for genuinely open input** — the vision narrative, a nuance
  the options miss, a story you asked them to recount. Cold start (no context yet):
  one open seed question, then every later step is propose-driven.
- **Then DIG.** For each kept item, escalate to specificity (unpack the vague word,
  anchor in the last real instance, "evidence or guess?"). This is what makes the
  interview short yet deep instead of long and shallow.
- **One entity at a time, gated.** Run a focused round, synthesize, then GATE the
  domain (the coverage checklist) before opening the next — never fire 20 questions
  at once, never close a domain silently.

## The greenfield loop (no existing product)

Run per entity, in this order. Each entity = elicit → dig → synthesize back →
confirm → draft → validate. Do **not** collapse this into "ask name + features →
write files".

### 1. Brief / vision (`BRF-001`) — the anchor, spend the most time here
Elicit and dig until each of these is concrete:
- **Problem** — whose pain, how acute, how often, what they do today instead
  (current alternatives), and the cost of doing nothing. A problem nobody works
  around isn't a problem.
- **Why now** — what changed (tech, market, regulation, behaviour) that makes this
  the moment.
- **Target user** — the one segment to win first (not "everyone").
- **Value in one line** — the customer benefit. If you can't write the press-release
  headline, keep digging.
- **North Star** — the single metric that proves the product delivers value. Push
  back on vanity metrics.
- **Explicit non-goals** — what the product deliberately won't do.
- **Top risk / unknown** — the assumption that, if wrong, sinks the product.

Synthesize the press release + FAQ back to the user, get confirmation, then write.

### 2. Personas (`PER-*`, 1–3, kept `proto`)
For each: **JTBD** (one sentence), **top pains** this product removes, **desired
gains**, **triggers / context of use** (when, where, device, constraints), **2–3 key
scenarios**. Challenge: is this a distinct person with a distinct job, or the same
persona renamed? No fictional bio (name, age, photo) until `validé`.

### 3. Feature catalogue (`FEAT-*`, `depth: stub`)
For each feature, get title + **which persona pain it serves** (link `related`) +
**value hypothesis** (`We believe <X>, measured by <Y>`). Challenge every feature
against a persona pain — a feature that serves nobody is cut or parked. Then bucket
the **horizon** (Now / Next / Later) — this is a good moment for `AskUserQuestion`.

### 4. Specify the `Now` features (`depth: specified`, full PRD)
Only for what's being built first. Dig the PRD body: value hypothesis, problem & context,
objective & metric, **scope in / out**, **user flow** (numbered list), **user stories**,
**acceptance criteria** (Given/When/Then, testable), risks, explicit out-of-scope.
Delegate the heavy drafting to `snap-drafter`, keep the interview here.

### 5. Decisions (`ADR-*`)
Capture the notable choices made *during the session* (scope cuts, tech bets,
sequencing) as append-only ADRs — context, decision, alternatives, consequences.

## The brownfield loop (existing project)

The product already exists in code; the docs don't. Reconstruct the documentation
from reality, then frame where it's going. The gap between the two **is** the roadmap.

### A. Audit the codebase (read-only)
Spawn an `Explore` subagent (or read directly) to map reality before asking the
user anything. Gather:
- README / docs / wiki, `package.json`/`pyproject`/`go.mod`/etc., entrypoints,
  routes/controllers, domain models, env/config, and any existing product notes.
- What the product **does today**: the shipped capabilities, the surfaces, who
  appears to use it.
Come to the user with a *draft understanding*, not a blank questionnaire.

### B. Infer the implicit vision
From the audit, articulate **what the product actually optimizes today** — the real
value it delivers, revealed by what's built and used. State it back; let the user
correct it. This becomes the Brief's `Vision implicite` subsection.

### C. Interview for the target vision (`Vision cible`)
Now run the vision dig (greenfield step 1 questions), but anchored on the delta:
where does the user want to take it, what's underserved, what should change. Capture
both visions in the Brief; **the delta between them is the real roadmap.**

### D. Inventory existing features (`source: inventoried`)
Write the capabilities found in the audit as feature entities with
`source: inventoried`. Already-shipped → `horizon: Done` / `status: shipped`.
Keep them `stub` unless they're being reworked now. When you flip a feature to
`status: shipped`, you **may** set `shipped_at` to the real ship date *if the audit
surfaced one* — otherwise leave it blank. Never derive it from `updated`; `shipped_at`
is optional and never required, even when shipped (OD3).

### E. Personas from evidence
Derive personas from real usage / existing users where possible (lean toward
`niveau_preuve: entretiens`/`data` if the user has it), else `proto` hypotheses.

### F. Roadmap = the gap
The features that close implicit→cible become the `Now`/`Next`/`Later` catalogue
(`source: discovered`). Specify the `Now` ones (greenfield step 4). Capture the
audit's notable findings and the sequencing choices as ADRs.

## Quality bar (when to stop digging)

Stop a round only when the answer is **concrete, specific, and confirmed** — not
when the user gives *an* answer. Red flags that mean keep digging: "everyone" as a
user, a feature with no persona, a North Star that can't be measured, a vision that
restates the feature list, a Brief with empty FAQ answers. A structurally complete
but hollow entity fails the point of this skill.

## Anti-patterns

- ❌ Treating the template as a questionnaire read top-to-bottom.
- ❌ Triaging once (one `AskUserQuestion` round) and writing the file — skipping the
  DIG and the GATE. Triage is the *start* of the loop, not the end.
- ❌ Funnelling genuinely open input (the vision narrative) through a closed
  multiple-choice box, **or** dumping an open prose question where 3–4 proposed
  candidates would let the user just react.
- ❌ Asking only "project name?" and "main features?" — that is the failure this
  method exists to prevent.
- ❌ Writing the Brief before the user confirms problem + vision + North Star.
- ❌ Brownfield: interviewing from a blank page instead of auditing the code first.
