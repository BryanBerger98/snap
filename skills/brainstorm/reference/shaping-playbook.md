# Shaping playbook — dig the need, then give it a form

The mandate: the user has an idea but can't give it a form. **Dig the need to its root with
them, then propose a shape they correct.** Two failures to avoid: jumping to a shape before
the need is dug, and turning the enquiry into a formal questionnaire.

Everything runs through `AskUserQuestion` — the **options are the hypotheses you advance**,
so each question digs *and* contributes. "Other" always stays open.

## Phase A — Investigate (deep on substance, light on form)
Chase the root, one or two questions at a time. Probes to draw from (never named on screen):

- **Jobs To Be Done** — "When <context>, I want <job>, so I can <outcome>, without <pain>."
  Ask for the context, the real job, the expected outcome, the current workaround.
- **5 whys (light)** — push past the first surface answer to the root pain. 2–3 levels is
  usually enough.
- **Job-adjacency** — the job right *before* and *after* this one; the form often lives
  there.
- **How Might We** — silently reframe the dug pain into the question the shape must answer.

Anchor on the personas / brief / North Star when they exist. Stop when the root job, the
root pain and the expected outcome are clear — or when the user clicks "propose now".

## Phase B — Propose the shape (one pass, corrigeable)
From the enquiry, propose a concrete form via `AskUserQuestion`, each candidate in a
`preview` for side-by-side comparison. A shape has four lines:

- **Intention** — the need in one line (sorts out the *why*).
- **Form** — what it looks like functionally (light breadboard: places + actions, no
  visuals).
- **Slice 1** — the smallest end-to-end deliverable (appetite + vertical slice).
- **Out-of-scope** — what we explicitly exclude (no-gos).

One shape if the idea is clear; 2–3 variants if ambiguous. **Too big → split** into 2–3
shapes rather than inflating one. Refine in 1–2 passes.

## Held silently (never on screen)
Deduce the persona pain and write the value hypothesis ("We believe <X>, measured by <Y>")
yourself. Apply a light INVEST read (Valuable · Testable) so you don't shape empty things.
Never ask for or print any of it.

## Out of scope here
Prioritization is `/roadmap`. The full PRD is `/define --spec`. The brief, vision and
personas are `/define`. This skill stops at a shaped stub the user said "go" on.
