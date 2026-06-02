<!-- Frozen template (D-041). Final orchestration report, written to .snap/tmp/fulldev-report-<id>.md;
     also the base for the conversation summary. Filled from fulldev-report.json. The per-gate final
     status and the terminal verdict are the key blocks.
       <verdict> : done-green | stopped-budget | stopped-blocked
       <entry>   : develop | gates
       final     : green ✅ | red ❌ | blocked ⛔
     Omit the "## Blocked gates" section when nothing is blocked.
     Render in config.language. Strip this guidance comment. -->
# Snap /fulldev — {{verdict}}

**Target:** {{target}}
**Entry:** {{entry}}
**Mode:** {{mode}}
**Budget:** {{cycles_used}} / {{max_cycles}} /develop cycles · {{max_per_gate}} reds per gate
**Verdict:** {{verdict}}

## Gate status

| Gate | Final | Reds |
| ---- | ----- | ---- |
| tests | {{tests_final}} | {{tests_red}} |
| review | {{review_final}} | {{review_red}} |
| qa | {{qa_final}} | {{qa_red}} |

## Cycle history

| Cycle | Step | Verdicts |
| ----- | ---- | -------- |
| {{cycle}} | {{did}} | {{verdicts}} |

## Blocked gates

{{blocked_gate}} — reached the per-gate cap ({{max_per_gate}} reds); last failure: {{detail}}.

## Next

{{next_line}}
