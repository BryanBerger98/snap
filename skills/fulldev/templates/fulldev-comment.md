<!-- Frozen template (D-041). Orchestration summary comment posted to the ticket (stage 8) via
     persist-<provider>. Condensed from fulldev-report.json — the terminal verdict + a compact gate
     status + a pointer to the local report. The sub-skills already posted their own per-gate
     comments; this is the chain-level summary. Idempotent: updated/appended on re-run, never
     duplicated.
       <verdict> : done-green | stopped-budget | stopped-blocked
       final     : green ✅ | red ❌ | blocked ⛔
     Keep ONE closing line matching the verdict. Render in config.language. Strip this guidance comment. -->
**Snap /fulldev — {{verdict}}** · {{ticket}}

Ran `develop → tests → review → qa` for {{cycles_used}} cycle(s) ({{mode}} mode).

| Gate | Final |
| ---- | ----- |
| tests | {{tests_final}} |
| review | {{review_final}} |
| qa | {{qa_final}} |

✅ **done-green** — all gates pass; the draft PR ({{pr}}) is ready for human review/merge.
🟠 **stopped-budget** — {{max_cycles}} /develop cycles spent without all-green; routed back to `/develop` on resume.
⛔ **stopped-blocked** — {{blocked_list}} reached the retry cap; needs human attention before re-running.

_Full report: `{{report_path}}` (local, not committed)._
