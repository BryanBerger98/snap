<!-- Frozen template (D-038). Summary PR/MR comment — ONE per run, mode = pr.
     The marker is the singleton below; on re-run the existing summary is matched
     by it and REWRITTEN in place (edit, never a second post).
       <verdict> : changes-requested | approve
       counts    : from review-report.json.summary
       <ref>     : ticket and/or PR/MR reference, e.g. "STORY-003 · !42";
                   drop the " — {{ref}}" tail when none is known
     nits are NOT posted inline — they collapse into the <details> block, one bullet
     each. Remove the whole <details> block when nit = 0. Render in config.language.
     Strip this guidance comment. -->
<!-- snap:review:summary -->
## Snap review — {{verdict}}

| Severity | Count |
| -------- | ----- |
| blocker  | {{blocker}} |
| major    | {{major}} |
| minor    | {{minor}} |
| nit      | {{nit}} |

**Verdict:** {{verdict}} — {{ref}}

<details><summary>nits ({{nit}})</summary>

- `{{file}}:{{line}}` — {{title}}
</details>
