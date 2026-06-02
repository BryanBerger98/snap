<!-- Frozen template (D-041). Orchestration plan presented at the gate (mode=gate), BEFORE the
     chain is driven. Filled from work-brief.json (ticket + acceptance criteria) and the resolved
     run (entry, gates, budget, mode).
       <entry> : "existing PR #42 → start at the gates" or "greenfield → /develop first"
       <mode>  : gate | autonomous
     Render in config.language. Strip this guidance comment. -->
# Snap /fulldev plan — {{ticket}}

**Target:** {{target}}
**Entry:** {{entry}}
**Mode:** {{mode}} (overrides each sub-skill)
**Budget:** up to {{max_cycles}} /develop cycles · {{max_per_gate}} reds per gate before it blocks

## Chain

`develop → (tests ∥ review) → qa`, looped. Each round runs **tests ∥ review** on the diff; only when
both are green does **qa** run live. Any red routes back to **/develop**. qa boots the app
(test/staging only — never prod).

## Acceptance criteria (the yardstick)

| Acceptance criterion | Validated by |
| -------------------- | ------------ |
| {{ca}} | {{gate}} |

## Stops when

- **done-green** — all gates green (draft PR ready for human review/merge), or
- **stopped-budget** — {{max_cycles}} /develop cycles spent without all-green, or
- **stopped-blocked** — a gate hits {{max_per_gate}} reds (global green unreachable).
