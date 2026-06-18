---
name: brainstorm
description: "Turn one raw idea into a shaped feature, together: first INVESTIGATE the need in depth (a real back-and-forth that digs to the root job/pain), then from that enquiry PROPOSE a concrete shape the user corrects. Every exchange runs through AskUserQuestion — the options are the hypotheses the model puts forward, so each question both digs and contributes. Persona pain and value hypothesis are deduced silently, never asked. Nothing is written until the user says go; survivors land as one-line `FEAT-*` stubs (+ a 2-line shaping body). Use when the user has an idea but can't give it a form. Do NOT use for framing the brief or vision (use /define), prioritizing Now/Next/Later (use /roadmap), or writing a full feature spec (use /define --spec)."
argument-hint: "<the raw idea you want to shape>"
disable-model-invocation: false
allowed-tools: Read, Write, Edit, Glob, Grep, AskUserQuestion, Task, WebSearch, WebFetch, Bash(node *)
---

# /brainstorm — Shape one idea into a feature

The user has ideas but can't give them a form. This skill fixes exactly that: **dig the
need to its root with them, then propose a shape they react to**. The user brings the raw
material; the skill does the forming. Once the need is dug, the form almost falls out.

Two non-negotiables that define this skill:

1. **Investigate before you propose.** Never jump to a feature shape. First run a real
   enquiry that digs the idea down to the root job and pain — *deep* on substance, *light*
   on form. Only then propose.
2. **AskUserQuestion end to end.** Every exchange — the enquiry, the proposed shape, the
   go/no-go — runs through `AskUserQuestion`. The **options are the hypotheses you put
   forward**, so each question digs *and* contributes; "Other" always lets the user escape
   the options. The user clicks instead of writing.

## Available actions

| #  | Action             | Role                                                              | Input            |
| -- | ------------------ | ---------------------------------------------------------------- | ---------------- |
| 01 | `load-state`       | Load product context (brief/personas if any) + the raw idea. No gate. | project dir |
| 02 | `investigate-need` | Dig the need to its root via AskUserQuestion (options = hypotheses)   | idea + context |
| 03 | `propose-shape`    | From the enquiry, propose 1–3 shapes via AskUserQuestion (previews)   | dug need       |
| 04 | `write-stubs`      | **Only after the user's go** — write `FEAT-*` stub + 2-line body + lint + views | shape |

## Default flow

`01 → 02 → 03 → (user's go) → 04`.

- **No hard gate.** A missing brief or persona never stops the session and never redirects
  to `/define` — `load-state` loads whatever exists (to deduce better) and continues.
- **An idea is required, not the brief.** No raw idea given → ask for it (via
  AskUserQuestion when natural) before investigating.
- **Investigate, don't rush.** Stay in `02` until the root job + pain + expected outcome
  are clear, or the user clicks "propose now". Shape only then.
- **Writing waits for a go.** Run `04` only once the user explicitly validates a shape.

## Transversal rules

- **Dig deep, stay light.** *Deep* = don't stop at the surface, chase the root need (the
  real job, the why). *Light* = 1–2 questions at a time, plain wording, no framework on
  screen. In the background you lean on Jobs To Be Done (context · job · outcome · pain ·
  current workaround), "5 whys", and job-adjacency — never name them.
- **Options carry your ideas.** Each `AskUserQuestion` option is a plausible hypothesis you
  advance, so the user picks instead of writing. Use `multiSelect` when several answers
  hold; keep "Other" open; never offer a hollow option.
- **Propose shapes with previews.** When you propose a form, put each candidate shape
  (Intention / Form / Slice 1 / Out-of-scope) in a `preview` so the user compares them
  side by side. One shape if the idea is clear; 2–3 variants if it's ambiguous.
- **Too big → split.** If Slice 1 won't fit, offer to split the idea into 2–3 shapes
  (vertical slicing) rather than inflating one.
- **Deduce silently.** Infer the persona pain and write the value hypothesis yourself, from
  the conversation. Never ask for them, never print them. Empty persona link is allowed.
- **Nothing is written until the user says go.** Then a stub only — the deep PRD comes
  later via `/define --spec` (JIT).

## References (documents to read)

- `reference/shaping-playbook.md` — the enquiry probes + the shaping move (in-scope, light).

## External data (shared product-model core — R7, never copy)

- `${CLAUDE_PLUGIN_ROOT}/reference/interview-engine.md` — the shared elicitation engine. Apply its dig/gate logic **silently** — never surface facets, scores, pains, or hypotheses.
- `${CLAUDE_PLUGIN_ROOT}/reference/product-model/core-io.md` — load / lint / regenerate.
- `${CLAUDE_PLUGIN_ROOT}/reference/product-model/{discovery,id-scheme,frontmatter-schema,checklists}.md`.
- `${CLAUDE_PLUGIN_ROOT}/templates/product-model/feature.md` — frozen feature template (stub shape).
- `${CLAUDE_PLUGIN_ROOT}/scripts/{build-index,lint-docs}.mjs` — view generator + lint gate.

## Current state (auto-injected)

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/build-index.mjs" "${CLAUDE_PROJECT_DIR}" --digest`
