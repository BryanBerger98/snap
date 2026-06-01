# MCP setup — design tool connection (for /ds)

`/ds` authors the design system by calling the design tool's **MCP server** — the **same
two servers** `/wireframe` uses, declared once in `.mcp.json` at the plugin root:

```json
{
  "mcpServers": {
    "snap-penpot": { "type": "http", "url": "${PENPOT_MCP_URL:-http://localhost:4401/mcp}" },
    "snap-figma":  { "type": "http", "url": "${FIGMA_MCP_URL:-https://mcp.figma.com/mcp}" }
  }
}
```

The difference from `/wireframe` is **which config key routes**: `/ds` follows
`providers.design` (not `providers.wireframe`). A team can wireframe in one tool and run
the design system in another, but both default to `penpot` and hit the same servers. Only
the server for the active provider needs to work; an unconfigured/offline server is harmless
(its tools are simply unavailable and the skill stops with a setup prompt). Disable the one
you do not use via `/mcp`.

Tokens live in `.env` (git-ignored), never in `snap.config.json` or `.mcp.json`.

## What `/ds` authors (vs `/wireframe`)

`/wireframe` draws disposable Lo-Fi boards. `/ds` writes into the tool's **reusable
libraries**:
- **Token styles** — color / text (typography) / effect (shadow) / and spacing &
  radius values, as the tool's shared/library styles.
- **Components** — the tool's component library, with variants and states.

So the MCP must expose **style and component** authoring, not just frame/rectangle/text.
Inspect the active server's tool list first (styles, components, variants) and prefer a
batch/code path when available (e.g. Penpot's `execute_code` with the Plugin SDK).

## Penpot (`snap-penpot`) — default

Same connection as `/wireframe`: run `npx @penpot/mcp@stable` (HTTP `4401` / WS `4402`,
override via `PENPOT_MCP_URL`), open Penpot in a browser, launch the MCP plugin, and **keep
that tab open and focused** (the WebSocket relay drops on focus loss — **not headless**).
Local server = active browser session (no token); hosted endpoint = `PENPOT_ACCESS_TOKEN`
in `.env`. For the design system, author into a **shared library** file so the styles and
components are reusable by `/design`.

## Figma (`snap-figma`)

Same connection as `/wireframe`: connect the hosted server (`https://mcp.figma.com/mcp`) via
`/mcp` + OAuth. **Write-to-canvas is a paid beta**, rate-limited. For the design system,
author **variables/styles** (Figma variables map cleanly to DTCG tokens) and **components
with variants**, ideally in a published **library** file.

## Checking availability (skill step 2)

Before authoring, confirm the active provider's style/component authoring tools are present.
If absent:
- name the missing server (`snap-penpot` / `snap-figma`),
- give the matching setup steps above,
- then stop. Never write a design-system file into the repo as a fallback — `ds.target`
  is `mcp`. (Code emitted by `/ds export` is the user's app output, a separate concern.)
