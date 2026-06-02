<!-- Frozen template (D-040). Final QA report, written to .snap/tmp/qa-report-<id>.md; also the
     base for the conversation summary. Filled from qa-report.json. The CA matrix and the verdict
     are the key blocks.
       <target>  : "ticket STORY-003" (+ " · PR #42 — <url>" when linked)
       <verdict> : accepted | rejected
       <env>     : "reused <baseUrl>" or "booted <runCmd>"
       outcome   : met ✅ | partial ⚠️ | unmet ❌
     Omit the whole "## Rejected criteria" section when the verdict is accepted.
     Render in config.language. Strip this guidance comment. -->
# Snap QA — {{verdict}}

**Target:** {{target}}
**Surfaces:** {{surfaces}}
**Environment:** {{env}} — test/staging
**Verdict:** {{verdict}}

## CA matrix

| Acceptance criterion | Surface | Outcome | Evidence |
| -------------------- | ------- | ------- | -------- |
| {{ca}} | {{surface}} | {{outcome}} | {{evidence}} |

## Rejected criteria

### {{ca}} — {{outcome}} ({{surface}})
{{detail}}

Observed: {{observed}}
