---
name: wireframe
description: >
  Turn specified Features and their Stories into Lo-Fi wireframes authored
  directly in the team's design tool (Penpot or Figma) through its MCP server —
  one board per screen, child frames for zones, placeholder labels, separate
  boards for states (empty/loading/error/success). Nothing is written to the
  repo: the design tool is the source of truth for wireframes. Use after
  /define and /ticket to visualize screens before development. Optional argument
  = a FEAT-id, a STORY-id, or a screen name; with no argument, wireframes every
  specified Feature that has a user flow.
argument-hint: "[FEAT-xxx|STORY-xxx|screen name]"
disable-model-invocation: false
---

# /wireframe — Lo-Fi wireframes in the design tool (via MCP)

Visualize the product: each `specified` Feature's user flow becomes a set of
**screens**, each Story becomes a screen **state/variant**, and they are drawn as
**Lo-Fi boards** in the team's design tool. Unlike `/define` and `/ticket`, this
skill writes **nothing to the repo** — the boards live in Penpot or Figma, reached
through that tool's **MCP server** (declared in the plugin's `.mcp.json`). Traceability
back to `FEAT-*`/`STORY-*` is carried in the **board names and descriptions**.

Lo-Fi means structure, not styling: grey boxes, placeholder labels, no real copy,
no color, no imagery. The goal is layout and flow, fast and disposable.

## Reference — read before authoring

- `reference/mcp-setup.md` — how each provider's MCP is enabled, authenticated, and
  its constraints (Penpot needs a live, focused tab; Figma write is a paid beta).
- `reference/wireframe-conventions.md` — screen anatomy (zones), the state taxonomy,
  naming, and how Features + Stories map to screens + states.
- `reference/authoring-playbook.md` — provider-specific tool recipes (Penpot vs Figma)
  and the layout heuristics (board sizes, grid, spacing, order of operations).

## Algorithm

### 1. Load config
- Read `snap.config.json`. If missing, run
  `node "${CLAUDE_PLUGIN_ROOT}/scripts/bootstrap-config.mjs" "${CLAUDE_PROJECT_DIR}"`
  then re-read it.
- Resolve `language`, `docsPath`, `ticketsPath`, the **active provider**
  `providers.wireframe` (`penpot` | `figma`), and `wireframe.fidelity` / `wireframe.target`.
- Label every board, zone, and note in `language` (default `fr`).

### 2. Verify the provider's MCP is connected
- The active provider maps to an MCP server: `penpot` → `snap-penpot`, `figma` → `snap-figma`.
- Confirm that server's authoring tools are actually available in this session.
- **If they are not** (server not configured, not running, or not authenticated): **stop**
  and walk the user through `reference/mcp-setup.md` for the active provider. Do **not**
  attempt to author blind, and do **not** silently fall back to writing files in the repo —
  the chosen target is `mcp`.

### 3. Load the source
- Glob `<docsPath>/**/*.md`; read the **`specified` Features** and their **user flow**
  (the flow section / Mermaid in the PRD body). A `stub` Feature has no flow → tell the
  user to `/define features` first.
- Glob `<ticketsPath>/**/*.md`; for each Feature's Epic, read its **Stories** — each Story
  is a screen **state/variant** to wireframe (its acceptance criteria describe the states).
- If no specified Feature exists, stop and route to `/define`.

### 4. Determine scope
- Argument = a `FEAT-id` (or feature title) → wireframe that Feature's flow (every screen).
- Argument = a `STORY-id` → wireframe that Story's screen + its states.
- Argument = a screen name → (re)draw that single screen.
- No argument → wireframe **every `specified` Feature that has a user flow**.

### 5. Plan screens & states
Derive, then confirm only the gaps with `AskUserQuestion` (≤ 4 q/round — which screens,
which states matter, mobile vs desktop frame):
1. **Screens** — walk the Feature's user flow; one screen per meaningful step/view.
2. **Zones** — per screen, the layout regions (header/nav · content · primary action ·
   secondary · footer) as placeholder boxes (see `wireframe-conventions.md`).
3. **States** — per screen, the Story-driven variants (empty · loading · error · success
   · filled). One board per state, not one board with everything.
4. **Frame** — mobile (≈360×800) or desktop (≈1440×900) per the product context.

For a large flow, the screen-by-screen plan may be drafted by the `snap-drafter`
subagent via the `Task` tool (a structured brief + the conventions); keep the MCP
authoring and the interview in the main context.

### 6. Author via the MCP (provider-routed)
Follow `reference/authoring-playbook.md` for the active provider:
- One **page / section per Feature**, named with its `FEAT-id` + title.
- One **board (frame) per screen**, then per **state**; name it
  `WF · <screen> · <state>` and put `FEAT-xxx · STORY-xxx` in the board **description**
  (or a caption text node) so the traceability survives in-tool.
- Inside each board: child **frames/rectangles** for the zones and **text** nodes for the
  placeholder labels. Greyscale only.
- Work incrementally and idempotently: if a board with the same name already exists for
  this screen/state, update it rather than duplicating.

### 7. Summarize
Report: the active provider, the screens and states authored (with their board names),
the page/section they landed in and any URLs the MCP returned, and which `FEAT-*`/`STORY-*`
each traces to. State explicitly that **nothing was written to the repo** (by design) and,
if the MCP was unreachable, what the user must do to enable it.

## Sub-commands

| Invocation | Effect |
| --- | --- |
| `/wireframe` | wireframe every `specified` Feature that has a user flow |
| `/wireframe FEAT-xxx` | wireframe that Feature's flow (all screens) |
| `/wireframe STORY-xxx` | wireframe that Story's screen + its states |
| `/wireframe <screen name>` | (re)draw a single screen |

## Rules
- Author **only** through the active provider's MCP; never write wireframe files into the
  repo (`target: mcp` — the design tool is the source of truth).
- If the MCP is unavailable, **stop and instruct setup** — do not fake or approximate.
- Lo-Fi only: boxes + labels, greyscale, placeholder copy. No color, type scale, or imagery.
- Screens come from the Feature **user flow**; states come from the **Stories** — derive,
  never invent screens the flow does not describe.
- Carry `FEAT-*`/`STORY-*` traceability in every board's name/description.
- Switching tools = change `providers.wireframe` (`/snap:init --wireframeProvider …`); the
  skill routes by config, it does not pick the tool for the team.
