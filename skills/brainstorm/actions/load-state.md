# 01 — Load state & gate

Load the entity map and enforce the precondition: brainstorming needs a confirmed Brief
and at least one persona.

## Inputs
- `project_dir` (required) — `${CLAUDE_PROJECT_DIR}`.

## Outputs

```
ok: true
brief: BRF-001
personas: [PER-001, PER-002]
existing_features: [ ... ]   # to avoid re-proposing duplicates
```
or `ok: false, redirect: /define`.

## Process
1. Load config + digest per `${CLAUDE_PLUGIN_ROOT}/reference/product-model/core-io.md`.
2. **Gate.** `BRF-001` exists **and** `briefConfirmedAt` set in
   `.snap/define-progress.json` **and** ≥ 1 `PER-*`. Any miss ⇒ stop and tell the user to
   run `/define` (`--new` then `--vision`).
3. Collect existing `FEAT-*` so `diverge-features` doesn't re-propose them.

## Test

LLM assertion: with a confirmed brief + persona present, returns `ok: true` and the
persona list; with a missing/unconfirmed brief or no persona, returns `redirect: /define`
and does not proceed.
