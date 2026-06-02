<!-- Frozen template (D-039). Test plan presented at the GATE (stage 4) before writing tests.
     Filled from tests-target + work-brief (acceptance criteria) + codebase-map.
     <source> = "acceptance criteria of <ticket>" or "the diff <base>...HEAD" or "PR #<n>"
     One row per planned (CA × level). Render in config.language. Strip this guidance comment. -->
# Snap test plan — {{target}}

**Source:** {{source}}
**Runner:** {{runner}}
**Levels:** {{levels}}

## Planned coverage

| Acceptance criterion | Level(s) | Test file | Cases |
| -------------------- | --------- | --------- | ----- |
| {{ca}} | {{levels_for_ca}} | {{file}} | {{cases}} |

## Not covered (gaps)

- {{ca}} — {{reason}}
