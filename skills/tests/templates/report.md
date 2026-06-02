<!-- Frozen template (D-039). Final tests report — mode = local, written to
     .snap/tmp/tests-report-<id>.md; also the base for the conversation summary.
     Filled from tests-report.json. The CA coverage table and the verdict are the
     key blocks.
       <target>  : "local diff (<base>...HEAD)", "PR #42 — <url>", or "acceptance
                   criteria of STORY-003"
       <verdict> : passed | tests-failed
       covered   : render ✅ when true, ❌ when false
       kind      : test-bug | source-bug
     Omit the whole "## Failures" section when there are none.
     Render in config.language. Strip this guidance comment. -->
# Snap tests — {{verdict}}

**Target:** {{target}}
**Levels:** {{levels}}
**Verdict:** {{verdict}}

**Suite:** {{passed}}/{{total}} passed, {{failed}} failed — {{iterations}} iteration(s) · `{{cmd}}`

## CA coverage

| Acceptance criterion | Covered | Tests |
| -------------------- | ------- | ----- |
| {{ca}} | {{covered}} | {{tests}} |

## Failures

### {{test}}
`{{file}}` — {{kind}} (covers {{ca}})

{{detail}}
