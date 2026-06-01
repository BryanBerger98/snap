<!-- Frozen template (D-038). Inline PR/MR comment — ONE per finding, mode = pr.
     The first line is the hidden idempotence marker: never drop it, it is what
     dedupes the comment across re-runs.
       <file>     : the finding's path, verbatim
       <line>     : the finding's line; 0 for a file-level finding
       <slug>     : deterministic kebab of <title> — lowercase, non-alphanumerics
                    → "-", collapse repeats, trim, keep the first ~6 words
       <severity> : blocker | major | minor | nit
     Omit the **Suggestion:** line entirely when the finding has no suggestion.
     Render the prose in config.language. Strip this guidance comment. -->
<!-- snap:review:{{file}}:{{line}}:{{slug}} -->
**[{{severity}}] {{title}}**

{{detail}}

**Suggestion:** {{suggestion}}
