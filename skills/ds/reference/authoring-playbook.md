# Authoring playbook (for /ds)

Provider-specific recipes for authoring the design system in the tool via MCP, plus the
import (code → tool) and export (tool → code) order of operations. Inspect the active
server's actual tool list first — names vary; the moves below are the intent.

## Primitive → tool capability

| DS primitive | Penpot (`snap-penpot`) | Figma (`snap-figma`) |
| --- | --- | --- |
| Color token | a color **library style** (Plugin SDK via `execute_code`) | a **variable** (color) / paint style |
| Typography token | a text **library style** | a text style / typography variable |
| Spacing / radius token | a saved value / token style | a **number variable** |
| Shadow token | an effect **library style** | an effect style |
| Component | a **component** + variants | a **component set** with variants |

Prefer a **batch/code path** when the server exposes one (e.g. Penpot `execute_code` with
the Plugin SDK) — authoring dozens of styles one call at a time is slow and error-prone.

## Order of operations (author)

1. **Primitives first** — create the raw scales (color ramp, spacing scale, radii, type
   families/weights, shadows) as library styles.
2. **Semantic tier** — create role styles that **alias** primitives (`color.action.background`
   → `{color.blue.500}`). Use the tool's alias/reference mechanism (Figma variable alias;
   Penpot referenced style) so a re-theme is one edit.
3. **Component tier + components** — author each component from `ds-conventions.md §6` with
   its variants and states, binding parts to **semantic/component** styles (never literals).
4. **Idempotency** — match by name. A style/component that already exists is **updated**,
   not duplicated. Re-running `/ds` converges; it does not pile up copies.

## Import (code → tool)

1. Locate the code system: `ds.exportPath` if set, else scan for a DTCG `tokens.json`, CSS
   custom properties, or Tailwind **v4** `@theme` (which is CSS custom properties).
2. Normalize to DTCG with the codec:
   ```
   node "${CLAUDE_PLUGIN_ROOT}/skills/ds/scripts/tokens-codec.mjs" --from css  --to dtcg --in src/styles/tokens.css
   node "${CLAUDE_PLUGIN_ROOT}/skills/ds/scripts/tokens-codec.mjs" --from dtcg --to dtcg --in tokens.json   # passthrough/normalize
   ```
   (Tailwind **v3 JS** config is not parseable — ask for CSS vars / DTCG instead.)
3. Author the resulting tokens in the tool (order above). For **components in code**, list
   component files best-effort (names, obvious variants) and author stubs; interview the
   rest. Then continue with the normal author flow to fill gaps.

## Export (tool → code)

1. Read the system **back from the tool** via MCP (styles + components, with their tiers
   and bindings) and assemble a **DTCG** tree (`tokens.json`).
2. Resolve `ds.exportPath`; if `null`, ask and tell the user to persist it via
   `/snap:init --dsExportPath <path>`.
3. Emit with the codec — **never hand-write** CSS/Tailwind:
   ```
   node "${CLAUDE_PLUGIN_ROOT}/skills/ds/scripts/tokens-codec.mjs" --from dtcg --to css      --in <exportPath>/tokens.json --out <exportPath>/tokens.css
   node "${CLAUDE_PLUGIN_ROOT}/skills/ds/scripts/tokens-codec.mjs" --from dtcg --to tailwind  --in <exportPath>/tokens.json --out <exportPath>/tailwind.tokens.json
   ```
4. Write `tokens.json` (DTCG, canonical interchange) and `components.md` (the manifest:
   component · variants · states · token bindings) alongside.
5. These files are a **generated output in the user's app** — re-run `export` to refresh.
   They are not a Snap-managed artifact and not the source of truth (the tool is).

## Routing & switching

`/ds` reads `providers.design` to pick the active tool, then `snap-penpot` / `snap-figma`
accordingly. Switching tools = `/snap:init --designProvider figma|penpot` — the skill never
picks the tool for the team.
