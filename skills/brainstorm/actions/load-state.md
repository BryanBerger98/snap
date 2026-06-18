# 01 — Load context & idea

Load whatever product context exists and capture the raw idea. **No gate** — a missing
brief or persona never stops the session.

## Inputs
- `project_dir` (required) — `${CLAUDE_PROJECT_DIR}`.
- `idea` (required) — the raw idea the user wants to shape (argument or first message).

## Outputs

```
ok: true
idea: "<the raw idea, verbatim>"
brief: BRF-001 | null            # used to deduce context, not required
personas: [PER-001, ...] | []    # used to deduce pain + anchor the enquiry, not required
north_star: "<…>" | null         # used to keep the shape laddering up, silently
existing_features: [ ... ]       # near the idea — to avoid re-shaping a duplicate
```

## Process
1. Load config + digest per `${CLAUDE_PLUGIN_ROOT}/reference/product-model/core-io.md`.
   Pull the brief, personas and North Star **if they exist** — they feed the silent
   deduction in `investigate-need`/`propose-shape`. Their absence is fine: continue,
   never redirect to `/define`.
2. **Capture the idea.** If the user gave a raw idea (argument or message), lock onto it.
   If none was given, ask "what idea do you want to shape?" (via `AskUserQuestion` when
   natural) and wait.
3. Collect existing `FEAT-*` near the idea so we don't re-shape a duplicate.

## Test

LLM assertion: returns `ok: true` with the captured `idea` whether or not a brief/persona
exists (never redirects to `/define`); when no idea was given, asks for one before
proceeding.
