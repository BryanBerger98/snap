---
name: ds
description: >
  Build and maintain the product's design system directly in the team's design tool
  (Penpot or Figma) through its MCP server — token styles (color, typography, spacing,
  radius, effects) tiered primitive → semantic → component, plus components with their
  variants and states, all bound to the tokens. The design tool is the source of truth;
  code is an import source (seed the system from existing CSS/Tailwind/DTCG) and an
  export target (emit DTCG tokens + CSS variables + a Tailwind theme + a component
  manifest into the app). Use after /define and /wireframe, before /design and /develop.
  Optional argument = tokens | components | import | export | a token group | a component
  name; with no argument, syncs the whole design system.
argument-hint: "[tokens|components|import|export|<group>|<component>]"
disable-model-invocation: false
---

# /ds — Design system in the design tool (via MCP), bridged to code

Define the design system **inside** the team's design tool (Penpot or Figma), reached
through that tool's **MCP server** (declared in the plugin's `.mcp.json`). Like
`/wireframe`, the tool is the **source of truth** — Snap writes **no design-system
artifact into the repo**. Unlike `/wireframe`, `/ds` bridges to **code in both
directions**: it can **import** an existing system from code to seed the tool, and
**export** the system to code (W3C DTCG tokens + CSS variables + a Tailwind theme +
a component manifest) for `/design` and `/develop` to consume. Emitted code lands in
the **user's app** as a generated output — not a Snap-managed artifact.

Two layers:
- **Tokens** — the design decisions (color, typography, spacing, sizing, radius, border,
  shadow, opacity, z-index), tiered **primitive → semantic → component** and authored as
  the tool's **library styles**. The canonical interchange format for code is **W3C DTCG**.
- **Components** — buttons, inputs, cards, etc., authored as the tool's **component
  library**, each with **variants** and **states**, built **from the token styles**
  (no hard-coded values) and documented by an anatomy.

## Reference — read before authoring

- `reference/mcp-setup.md` — how each provider's MCP is enabled, authenticated, and its
  constraints (Penpot needs a live, focused tab; Figma write is a paid beta). `/ds` routes
  by `providers.design` and reuses the same MCP servers as `/wireframe`.
- `reference/ds-conventions.md` — token taxonomy, the three tiers, naming, the DTCG
  mapping, component anatomy, the code export targets, and how `/define` + `/wireframe`
  feed what the system needs.
- `reference/authoring-playbook.md` — provider-specific tool recipes (author token styles,
  author components/variants) plus the import and export order of operations, and how to
  call `tokens-codec.mjs`.

## Algorithm

### 1. Load config
- Read `snap.config.json`. If missing, run
  `node "${CLAUDE_PLUGIN_ROOT}/scripts/bootstrap-config.mjs" "${CLAUDE_PROJECT_DIR}"`
  then re-read it.
- Resolve `language`, the **active provider** `providers.design` (`penpot` | `figma`),
  and `ds.target` (`mcp`), `ds.tokenFormat` (`dtcg`), `ds.exportPath`.
- Label every style, component, and note in `language` (default `fr`).

### 2. Verify the provider's MCP is connected
- The active provider maps to an MCP server: `penpot` → `snap-penpot`, `figma` → `snap-figma`.
- Confirm that server's authoring tools are actually available in this session.
- **If they are not** (server not configured, not running, or not authenticated): **stop**
  and walk the user through `reference/mcp-setup.md` for the active provider. Do **not**
  author blind, and do **not** fall back to writing a design-system file in the repo —
  the chosen target is `mcp`.

### 3. Determine scope & direction
From the argument:
- none → **full sync**: author/refresh tokens, then components; offer to `export`.
- `tokens` → token styles only.
- `components` → components only.
- `import` → **code → tool**: seed/update the system in-tool from existing code.
- `export` → **tool → code**: emit the system to `ds.exportPath`.
- a token group (e.g. `color`) or a component name → that single item.

### 4. Source & context
- **Create / components**: read `<docsPath>/**` for `specified` Features (the product
  surface) and use the existing `/wireframe` boards in the tool to see which UI elements
  recur → derive the component inventory and the tokens they need. Do **not** invent a
  kitchen-sink library; build what the product uses.
- **Import**: locate the code design system — `ds.exportPath` if set, else scan common
  spots (a DTCG `tokens.json`, CSS custom properties / Tailwind v4 `@theme`). Normalize
  to DTCG with the codec:
  `node "${CLAUDE_PLUGIN_ROOT}/skills/ds/scripts/tokens-codec.mjs" --from <css|dtcg> --to dtcg --in <file>`.
  Detect code components best-effort (component files → names/variants); interview the gaps.

### 5. Author in the tool via the MCP (provider-routed)
Follow `reference/authoring-playbook.md` for the active provider:
- **Token styles** — create the library styles for each token, organized
  **primitive → semantic → component**; bind semantic styles to primitives (alias), and
  component styles to semantics. Idempotent: a style with the same name is **updated**, not
  duplicated.
- **Components** — one per recurring UI element, with its **variants** (e.g. size, kind)
  and **states** (default/hover/focus/disabled/error), built from the token styles and
  documented with an anatomy. Idempotent by component name.
- For a large system, the inventory/spec may be drafted by the `snap-drafter` subagent via
  the `Task` tool; keep the MCP authoring and the interview in the main context.

### 6. Export to code (on `export`, or when asked)
- Read the design system **back from the tool** via the MCP → assemble a **DTCG** token
  tree (and a component list with variants/states/token bindings).
- Resolve `ds.exportPath`; if `null`, ask for it (and tell the user to persist it via
  `/snap:init --dsExportPath <path>`).
- Emit with the codec — **never hand-write CSS/Tailwind**:
  - `tokens.json` — DTCG, canonical.
  - `tokens.css` — `node …/tokens-codec.mjs --from dtcg --to css --in tokens.json --out tokens.css`.
  - `tailwind.tokens.json` — `--to tailwind` (drop into `theme.extend`).
  - `components.md` — a manifest (component · variants · states · token bindings) for
    `/design` and `/develop`.
- These files live in the **user's app** (a generated output): re-run `export` to refresh.

### 7. Summarize
Report: the active provider; token styles and components created/updated in-tool; what was
imported from / exported to code (with paths); and state explicitly that the **design tool
is the source of truth** and the emitted code is a **generated output**. If the MCP was
unreachable, say what the user must do to enable it.

## Sub-commands

| Invocation | Effect |
| --- | --- |
| `/ds` | full design-system sync (tokens + components) in the active tool |
| `/ds tokens` | author / refresh only the token styles |
| `/ds components` | author / refresh only the components |
| `/ds import` | seed / update the system in-tool from existing code (tokens + best-effort components) |
| `/ds export` | emit the system to code (DTCG + CSS + Tailwind + component manifest) into `ds.exportPath` |
| `/ds <group>` (e.g. `color`) | (re)author a single token group |
| `/ds <component>` | (re)author a single component |

## Rules
- The design system is canonical **in the active provider's tool** (`target: mcp`). Never
  write a Snap-managed design-system file in the repo. Code that `export` emits is the
  **user's app output** only — a refreshable generation, not a source of truth.
- If the MCP is unavailable, **stop and instruct setup** — never fake or approximate.
- **W3C DTCG** is the canonical interchange for code. Use `tokens-codec.mjs` for **every**
  format conversion (CSS / Tailwind) — do not hand-emit token code.
- Tier tokens **primitive → semantic → component**; bind semantic to primitive via alias.
  Components are built **from the token styles**, never hard-coded values.
- `import` from a Tailwind **v3 JS** config is not supported by the codec (JS is not
  parseable without executing it) → ask for CSS variables / DTCG, or read Tailwind **v4**
  `@theme` as CSS (`--from css`).
- Tokens and components are informed by `/define` Features and `/wireframe` screens —
  derive what the product needs; do not author a generic kitchen-sink library.
- Switching tools = change `providers.design` (`/snap:init --designProvider …`); the skill
  routes by config, it does not pick the tool for the team.
