# 04 — Define vision & personas

Dig who the product is for, why, and how success is measured. Writes the personas and
enriches the Brief's vision — no new entity type. **Skippable**: the user may waive the
deep interview (a proto-persona is auto-derived) or defer it to do later themselves.

## Inputs
- `confirmed_brief` (required) — `BRF-001` with `briefConfirmedAt` set.
- `invoked_via` (optional) — `--vision` flag (⇒ run **full mode** directly, no entry
  choice) vs router/brief continuation (⇒ present the entry choice first).

## Outputs

- **Full** — `<docsPath>/02-personas/PER-*.md` (1–3, `proto`) from
  `templates/product-model/persona.md`, plus an updated `BRF-001` (vision + success-metric
  answers in the FAQ).
- **Skip** — a single lean proto-`PER-001`, auto-drafted from the Brief **then confirmed
  by the user**, + `visionSkippedAt` stamped in `.snap/define-progress.json`.
- **Defer** — nothing written + `visionDeferredAt` stamped.

## Depends on
- `load-state` (gate: `BRF-001` exists **and** `briefConfirmedAt` set)

## Entry choice (skip the choice when invoked via `--vision` → run full mode)

If neither `visionSkippedAt` nor `visionDeferredAt` is set, present **one
`AskUserQuestion`** before any work (it is also offered at the end of `draft-brief`):

| Choice | Effect |
| --- | --- |
| Continue to Vision | run **full mode** (below) |
| Skip → brainstorm   | **skip mode**, then redirect the user to `/brainstorm` |
| Skip → stop         | **skip mode**, then stop with a summary |
| Vision later        | **defer**: stamp `visionDeferredAt`, write nothing, stop |

`--vision` bypasses this — the flag is an explicit request for the full interview.

## Process — full mode
1. **Gate.** If the brief is missing or unconfirmed, stop and route to `/define --new`.
2. Read `reference/vision-playbook.md`.
3. Per persona: dig JTBD (one sentence), top pains this product removes, desired gains,
   triggers/context of use, 2–3 key scenarios. Challenge: distinct person + distinct job,
   or the same persona renamed? No fictional bio until `validé`.
4. Dig the **vision + success metric** (the single North Star that proves value); push
   back on vanity metrics. Update `BRF-001` FAQ (`Pour qui` → `PER-*`, `Comment on mesure
   le succès`).
5. Restate, confirm, write `PER-*` and the brief update. Keep links in sync
   (`PER-*.parents = [BRF-001]`). Clear `visionDeferredAt` if it was set. Run `finalize`.

## Process — skip mode (auto-draft + validate one proto-persona)
1. **Gate** as above (a confirmed Brief is still required).
2. **Explain why ≥ 1 persona is non-negotiable.** Tell the user, in one or two lines, that
   downstream `/brainstorm` challenges **every** feature against a real persona pain — so
   the chain needs at least one persona to converge; skipping the interview doesn't remove
   that need, it just means we seed a thin one from the Brief now and deepen it later.
3. **Auto-draft one** proto-`PER-001` from the Brief — no interview: identity from the
   target customer (`F2`), primary job + top pain from the problem (`F1`), gain from the
   value line. Fill all template sections, **every item tagged 🔴** (assumption);
   `persona_type: proto`, `niveau_preuve: hypothèse`. The `> [!WARNING] À valider` box
   reads *"Persona auto-dérivé du Brief — lancer `/define -v` pour l'enrichir."*
4. **Validate (light, single round — not the full JTBD interview).** Show the drafted
   persona, ask the user to confirm or correct it, apply the correction. Do **not** write
   before this confirmation (same quality bar as every other entity — no hollow write).
5. Write `PER-001` (`links.parents = [BRF-001]`), link the Brief's `Pour qui` → `PER-001`;
   do **not** touch the North Star (that deep work is exactly what's being skipped).
6. Mark the `discover` facets `waived` (reason: *"vision skipped — proto-persona validated
   by user"*) in `.snap/interview-state.json`; leave `gatePassedAt: null`.
7. Stamp `visionSkippedAt`. Run `finalize`.
8. Route per the entry choice: **→ brainstorm** (tell the user to run `/brainstorm`) or
   **→ stop** (summary noting the persona is a thin, user-confirmed placeholder).

## Process — defer
Stamp `visionDeferredAt`, write nothing, and stop with: *"Vision différée — relance
`/define -v` quand tu veux la définir."* The router will **not** re-propose Vision.

## Test

- **Full** — `lint-docs` exits 0; ≥ 1 persona with all mandatory sections; `BRF-001`'s
  success answer is non-empty; persona↔brief links are two-way.
- **Skip** — `lint-docs` exits 0; exactly one `PER-001` (`proto`, all items 🔴, "À valider"
  box present), **written only after the user confirmed the draft** (the rationale for
  requiring ≥ 1 persona was surfaced); `visionSkippedAt` set; `BRF-001` North Star unchanged.
- **Defer** — no `PER-*` written; `visionDeferredAt` set; a later no-arg `/define` does
  **not** return `define-vision`.
