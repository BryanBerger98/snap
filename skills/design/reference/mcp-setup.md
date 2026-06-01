# MCP setup — design tool connection (for /design)

`/design` composes Hi-Fi mockups by calling the design tool's **MCP server** — the **same
two servers** `/wireframe` and `/ds` use, declared once in `.mcp.json` at the plugin root:

```json
{
  "mcpServers": {
    "snap-penpot": { "type": "http", "url": "${PENPOT_MCP_URL:-http://localhost:4401/mcp}" },
    "snap-figma":  { "type": "http", "url": "${FIGMA_MCP_URL:-https://mcp.figma.com/mcp}" }
  }
}
```

`/design` routes by **`providers.design`** — the **same key as `/ds`** (the besoin's "Design"
domain). A team that runs its design system in one tool composes its mockups in that same
tool, so the DS components are available as a library. Only the server for the active provider
needs to work; an unconfigured/offline server is harmless (its tools are unavailable and the
skill stops with a setup prompt). Disable the one you do not use via `/mcp`.

Tokens live in `.env` (git-ignored), never in `snap.config.json` or `.mcp.json`.

## What `/design` authors (vs `/wireframe` and `/ds`)

- `/wireframe` draws disposable Lo-Fi boards (frames, rectangles, text).
- `/ds` writes the tool's **reusable libraries** — token styles + components.
- `/design` **consumes** those libraries: it places **component instances** and applies
  **token styles** onto Hi-Fi boards, with real content — and, when interactive, wires
  **prototype links** between boards.

So beyond frame/rect/text the MCP must expose:
- **component-instance placement** (instantiate a library component, set its variant/props),
- **style application** (bind fills/text to the DS token styles),
- and — **only when `design.interactive: prototype`** — **prototype-link authoring**
  (board → board interactions).

Inspect the active server's tool list first. If component-instance placement is missing, the
DS cannot be composed; stop and report it. If only prototype-link authoring is missing, the
skill **degrades gracefully** (static boards + documented transitions) — it does not stop.

## Penpot (`snap-penpot`) — default

Same connection as `/wireframe` / `/ds`: run `npx @penpot/mcp@stable` (HTTP `4401` / WS `4402`,
override via `PENPOT_MCP_URL`), open Penpot in a browser, launch the MCP plugin, and **keep
that tab open and focused** (the WebSocket relay drops on focus loss — **not headless**).
Local server = active browser session (no token); hosted endpoint = `PENPOT_ACCESS_TOKEN` in
`.env`. Compose the mockups in a file that **links the `/ds` shared library**, so component
instances stay connected to the source components. Prototyping (Penpot interactions) is
authored via the Plugin SDK (`execute_code`); if a given build can't set interactions, fall
back to documented transitions.

## Figma (`snap-figma`)

Same connection as `/wireframe` / `/ds`: connect the hosted server (`https://mcp.figma.com/mcp`)
via `/mcp` + OAuth. **Write-to-canvas is a paid beta**, rate-limited. Compose with **instances
of the published DS components**, bound to **variables/styles**. Figma **prototype** reactions
(on-click → navigate-to) author the clickable flow when `design.interactive: prototype`; if the
beta surface doesn't expose reaction authoring, degrade to documented transitions.

## Checking availability (skill step 2 & 3)

Before authoring:
1. confirm the active provider's **component-instance / style** authoring tools are present —
   if absent, name the missing server (`snap-penpot` / `snap-figma`), give the setup steps
   above, then stop. Never write a mockup file into the repo as a fallback — `design.target`
   is `mcp`.
2. confirm the **design system itself is present** in the tool (token styles + component
   library from `/ds`). If absent or thin, route to **`/ds`** first — `/design` composes the
   DS, it does not invent it.
3. if `design.interactive: prototype`, check for **prototype-link** authoring; absent → note
   it and plan for graceful degradation (do not stop on this alone).
