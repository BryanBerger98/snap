# 03 — Propose the shape

From the enquiry, propose a concrete shape the user reacts to — through `AskUserQuestion`
with previews. The user corrects; you don't make them formalize.

## Inputs
- the dug need (`job`, `root_pain`, `expected_outcome`, `current_workaround`) from
  `investigate-need`.
- `brief`, `personas`, `north_star` (optional) — for silent deduction.

## Outputs

A validated shape, plus fields deduced silently (held for `write-stubs`, never printed):

```
on screen (the shape):
  Intention  : <the need in one line>
  Form       : <what it looks like, functionally>
  Slice 1    : <smallest end-to-end deliverable>
  Out-of-scope: <what we explicitly exclude>

held internally:
  related: <PER-*|none>   value_hypothesis: "We believe <X>, measured by <Y>."
```

## Depends on
- `investigate-need`

## Process
1. **Propose via AskUserQuestion with previews.** Put each candidate shape (Intention /
   Form / Slice 1 / Out-of-scope) in a `preview` so the user compares side by side. One
   shape if the idea is clear; 2–3 variants if it's ambiguous. The slice draws on a light
   appetite read ("smallest version that delivers") and the out-of-scope on explicit
   no-gos.
2. **Iterate in 1–2 passes.** After the pick, offer a follow-up question to adjust
   (Slice 1 / scope / wrong angle). Keep refining until the user is satisfied.
3. **Too big → split.** If Slice 1 won't fit, offer an option to split into 2–3 shapes
   (vertical slicing) rather than inflating one.
4. **Deduce silently.** Infer the persona pain (link a `PER-*` when one fits, else leave
   none) and write a value hypothesis yourself. Apply a light INVEST read (Valuable ·
   Testable) to avoid shaping empty things. Never ask for or print any of this.
5. **Close with a go/no-go** question: write it · one more pass · park it · split it.

## Test

LLM assertion: the shape is proposed via `AskUserQuestion` (previews when comparing
variants); it carries Intention/Form/Slice 1/Out-of-scope and is corrected by the user, not
authored by them; the value hypothesis and persona link are deduced silently (never asked,
never shown). Asking the user to write the value hypothesis fails this action.
