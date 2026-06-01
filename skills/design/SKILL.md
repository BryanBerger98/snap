---
name: design
description: >
  Turn specified Features and their Stories into complete Hi-Fi mockups authored
  directly in the team's design tool (Penpot or Figma) through its MCP server, by
  composing the design system built with /ds — real content, real styling, every
  state. Structure is hybrid: it upgrades the matching /wireframe board when one
  exists, otherwise it derives the layout from the Feature's user flow. Optional
  interactivity (config design.interactive: static | prototype) wires the screens
  into a clickable prototype following the flow. Nothing is written to the repo:
  the design tool is the source of truth. Missing component? It routes to /ds
  rather than authoring it inline. Use after /define, /ticket, /wireframe and /ds.
  Optional argument = a FEAT-id, a STORY-id, or a screen name; with no argument,
  designs every specified Feature that has a user flow.
argument-hint: "[FEAT-xxx|STORY-xxx|screen name]"
disable-model-invocation: false
---

# /design — Complete Hi-Fi mockups in the design tool (via MCP)

Bring the product to life: each `specified` Feature's user flow becomes a set of
**Hi-Fi screens**, each Story becomes a screen **state/variant**, and they are
composed from the **design system** (tokens + components authored by `/ds`) as
**high-fidelity boards** in the team's design tool. Like `/wireframe` and `/ds`,
this skill writes **nothing to the repo** — the mockups live in Penpot or Figma,
reached through that tool's **MCP server** (declared in the plugin's `.mcp.json`),
and traceability back to `FEAT-*`/`STORY-*` is carried in the **board names and
descriptions**.

Hi-Fi means the real thing, not a sketch: **real component instances** from the
design system (no hand-built widgets), **token-driven** color/typography/spacing
(no hard-coded values), **real content** from the PRD (no lorem ipsum), and
**every state** a Story describes. This is the synthesis step — it composes
`/wireframe` (structure), `/ds` (style + components) and `/define` + `/ticket`
(content, flow, states) into the finished, optionally clickable, mockups.

## Reference — read before authoring

- `reference/mcp-setup.md` — how each provider's MCP is enabled, authenticated, and
  its constraints (Penpot needs a live, focused tab; Figma write is a paid beta).
  `/design` routes by `providers.design` and reuses the same MCP servers as `/ds`.
- `reference/design-conventions.md` — what Hi-Fi means here, screen anatomy, the
  state taxonomy, the interactivity model, naming, and how `/wireframe` boards +
  `/define` flow + `/ds` components map to Hi-Fi screens.
- `reference/authoring-playbook.md` — provider-specific recipes (place DS component
  instances, bind to token styles, apply real content, wire prototype links), the
  hybrid structure resolution, the order of operations, and the DS-gap → `/ds` rule.

## Algorithm

### 1. Load config
- Read `snap.config.json`. If missing, run
  `node "${CLAUDE_PLUGIN_ROOT}/scripts/bootstrap-config.mjs" "${CLAUDE_PROJECT_DIR}"`
  then re-read it.
- Resolve `language`, `docsPath`, `ticketsPath`, the **active provider**
  `providers.design` (`penpot` | `figma`), and `design.target` (`mcp`),
  `design.fidelity` (`hi-fi`), `design.interactive` (`static` | `prototype`).
- Label every board, section, and note in `language` (default `fr`).

### 2. Verify the provider's MCP is connected
- The active provider maps to an MCP server: `penpot` → `snap-penpot`, `figma` → `snap-figma`
  (the **same servers** as `/ds`, routed by `providers.design`).
- Confirm that server's authoring tools are available: component-instance placement and,
  when `design.interactive` is `prototype`, prototype-link authoring.
- **If they are not** (server not configured, not running, or not authenticated): **stop**
  and walk the user through `reference/mcp-setup.md` for the active provider. Do **not**
  author blind, and do **not** silently fall back to writing files in the repo — the chosen
  target is `mcp`.

### 3. Verify the design system is present in the tool
- `/design` **consumes** the design system authored by `/ds`. Confirm the active tool holds
  the DS **token styles** and **component library**.
- **If the DS is absent or thin**: stop and route to **`/ds`** first (Hi-Fi composed from
  hard-coded values, not DS components, would defeat the purpose). Offer to run `/ds`.

### 4. Load the source & resolve scope
- Glob `<docsPath>/**/*.md`; read the **`specified` Features** — their **user flow**
  (flow section / Mermaid in the PRD body) and the **real copy/content** the screens show.
  A `stub` Feature has no flow → tell the user to `/define features` first.
- Glob `<ticketsPath>/**/*.md`; for each Feature's Epic, read its **Stories** — each Story
  is a screen **state/variant** (its acceptance criteria describe the states).
- Scope from the argument:
  - `FEAT-id` (or title) → design that Feature's flow (every screen).
  - `STORY-id` → design that Story's screen + its states.
  - screen name → (re)compose that single screen.
  - none → design **every `specified` Feature that has a user flow**.
- If no specified Feature exists, stop and route to `/define`.

### 5. Resolve structure (hybrid) & plan screens/states
For each target screen, resolve the layout skeleton **hybrid**:
- **If a matching `/wireframe` board exists** in the tool (same screen) → use it as the
  skeleton and **upgrade it to Hi-Fi** (replace placeholder zones with DS component
  instances, greyscale → token styling, placeholder labels → real content).
- **Else** → derive the structure from the Feature's **user flow** and compose from DS
  components directly.

Then derive the plan and confirm only the gaps with `AskUserQuestion` (≤ 4 q/round — which
screens, which states matter, mobile vs desktop frame, real-content gaps):
1. **Screens** — one per meaningful step/view in the flow.
2. **States** — the Story-driven variants (empty · loading · error · success · filled);
   one board per state.
3. **Frame** — mobile (≈360×800) or desktop (≈1440×900) per product context.

For a large flow, the screen-by-screen plan may be drafted by the `snap-drafter` subagent
via the `Task` tool (a structured brief + the conventions); keep the MCP authoring and the
interview in the main context.

### 6. Author Hi-Fi via the MCP (provider-routed)
Follow `reference/authoring-playbook.md` for the active provider:
- One **page / section per Feature**, named with its `FEAT-id` + title.
- One **board (frame) per screen**, then per **state**; name it
  `HI · <screen> · <state>` and put `FEAT-xxx · STORY-xxx` in the board **description**
  (or a caption text node) so traceability survives in-tool.
- Inside each board: place **instances of the `/ds` components** (no hand-built widgets),
  styled **only** through the DS **token styles** (no hard-coded color/type/spacing), filled
  with **real content** from the PRD.
- **DS gap** — if a screen needs a component the design system does not have, **do not author
  it inline**: stop that element, record the gap, and route the user to **`/ds`** to add it,
  then resume. (The DS stays the single source of components.)
- Work incrementally and idempotently: if a board with the same name already exists for this
  screen/state, update it rather than duplicating.

### 7. Wire interactivity (per `design.interactive`)
- `prototype` → add **prototype links** between boards following the user **flow**
  (screen → screen on the primary action) and the **state transitions** (e.g. filled →
  loading → success). If the provider's MCP **cannot** author prototype links, **degrade
  gracefully**: document each intended transition in the board description and link boards by
  naming/flow order — and say so in the summary. Never silently skip.
- `static` (default — "hi-fi simple") → no prototype links; note the intended flow in the
  board descriptions so it can be wired later.

### 8. Summarize
Report: the active provider; the screens and states composed (with board names and which DS
components they used); the **interactivity mode** and what was actually wired (or what
degraded); any **DS gaps routed to `/ds`**; the page/section and any URLs the MCP returned;
and which `FEAT-*`/`STORY-*` each board traces to. State explicitly that the **design tool is
the source of truth** and **nothing was written to the repo**. If the MCP (or the DS) was
unreachable, say what the user must do to enable it.

## Sub-commands

| Invocation | Effect |
| --- | --- |
| `/design` | design every `specified` Feature that has a user flow |
| `/design FEAT-xxx` | design that Feature's flow (all screens) |
| `/design STORY-xxx` | design that Story's screen + its states |
| `/design <screen name>` | (re)compose a single screen |

## Rules
- Author **only** through the active provider's MCP; never write mockup files into the repo
  (`target: mcp` — the design tool is the source of truth).
- If the MCP is unavailable, **stop and instruct setup** — do not fake or approximate.
- Hi-Fi composes the **design system**: real **component instances** from `/ds`, styled only
  through **token styles**, with **real content** from the PRD. No hand-built widgets, no
  hard-coded values, no lorem ipsum.
- **Missing component → route to `/ds`**, never author it inline. The DS is the single source
  of components; `/design` composes, it does not extend it.
- **Hybrid structure**: upgrade the matching `/wireframe` board when present, otherwise derive
  from the Feature **user flow**. Screens come from the flow, states from the **Stories** —
  derive, never invent screens the flow does not describe.
- **Interactivity is config-driven** (`design.interactive`): `static` by default, `prototype`
  to wire a clickable prototype; degrade gracefully if the MCP can't author links.
- Carry `FEAT-*`/`STORY-*` traceability in every board's name/description.
- Switching tools = change `providers.design` (`/snap:init --designProvider …`); the skill
  routes by config, it does not pick the tool for the team. `/ds` and `/design` share this key
  and the same MCP servers.
