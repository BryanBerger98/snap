<!-- Frozen template (D-040). QA plan presented at the gate (mode=gate), BEFORE the app is
     booted (running it has side effects). Filled from qa-target.json + work-brief.json
     (acceptance criteria) + codebase-map.json (run command / surfaces). Lists each in-scope
     criterion, the surface it will be exercised on, and how.
       <surface> : web | api | cli
       <env>     : "reuse <baseUrl>" (provided) or "boot: <runCmd>" (boot)
     Render in config.language. Strip this guidance comment. -->
# Snap QA plan — {{ticket}}

**Target:** {{target}}
**Surfaces:** {{surfaces}}
**Environment:** {{env}} — ⚠ test/staging only, never production

## Planned validation

| Acceptance criterion | Surface | How exercised |
| -------------------- | ------- | ------------- |
| {{ca}} | {{surface}} | {{steps}} |

## Not exercised (gaps)

| Acceptance criterion | Reason |
| -------------------- | ------ |
| {{ca}} | {{reason}} |
