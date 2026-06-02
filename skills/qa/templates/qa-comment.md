<!-- Frozen template (D-040). QA result comment posted to the ticket (stage 9) via
     persist-<provider>. Condensed from qa-report.json — the verdict + a compact matrix + a pointer
     to the local report/evidence. Idempotent: updated/appended on re-run, never duplicated.
       <verdict> : accepted | rejected
       outcome   : met ✅ | partial ⚠️ | unmet ❌
     Keep ONE closing line: the "Rejected" line when verdict = rejected (list the failing CA),
     else the "accepted" line. Render in config.language. Strip this guidance comment. -->
**Snap QA — {{verdict}}** · {{ticket}}

Exercised {{surfaces}} live against the running product ({{env}}).

| Acceptance criterion | Surface | Outcome |
| -------------------- | ------- | ------- |
| {{ca}} | {{surface}} | {{outcome}} |

➡️ **Rejected** — the product does not yet satisfy {{rejected_list}}; routed back to `/develop`.
✅ All acceptance criteria met.

_Full report + evidence: `{{report_path}}` (local, not committed)._
