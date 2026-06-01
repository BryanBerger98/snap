<!-- Frozen template (D-038). Local Markdown report — mode = local, written to
     .snap/tmp/review-<id>.md. No hidden markers (there is no thread to dedupe
     against). One ### block per finding, sorted by severity descending
     (blocker > major > minor > nit). Omit the **Suggestion:** line when absent.
       <target>   : "local diff (<base>...HEAD)" or "PR #42 — <url>"
       <verdict>  : changes-requested | approve
       <severity> : blocker | major | minor | nit
     Render in config.language. Strip this guidance comment. -->
# Snap review — {{verdict}}

**Target:** {{target}}
**Verdict:** {{verdict}}

| Severity | Count |
| -------- | ----- |
| blocker  | {{blocker}} |
| major    | {{major}} |
| minor    | {{minor}} |
| nit      | {{nit}} |

## Findings

### [{{severity}}] {{title}}
`{{file}}:{{line}}`

{{detail}}

**Suggestion:** {{suggestion}}
