# MCP setup — design tool connection

`/wireframe` authors boards by calling the design tool's **MCP server**. The plugin
declares both servers in `.mcp.json` at its root:

```json
{
  "mcpServers": {
    "snap-penpot": { "type": "http", "url": "${PENPOT_MCP_URL:-http://localhost:4401/mcp}" },
    "snap-figma":  { "type": "http", "url": "${FIGMA_MCP_URL:-https://mcp.figma.com/mcp}" }
  }
}
```

Only the server for the **active provider** (`providers.wireframe`) needs to work. An
unconfigured/offline server is harmless — its tools are simply unavailable and the skill
stops with a setup prompt rather than authoring blind. Disable the one you do not use via
`/mcp`.

Tokens live in `.env` (git-ignored), never in `snap.config.json` or `.mcp.json`.

## Penpot (`snap-penpot`) — default

Penpot's MCP authors through the **Penpot Plugin SDK over a WebSocket to a live browser
tab**. It is **not headless**.

1. Run the Penpot MCP server locally (Node 20+): `npx @penpot/mcp@stable`
   (default endpoints: HTTP `4401`, WebSocket `4402`). Override the URL with
   `PENPOT_MCP_URL` if you self-host or use the hosted endpoint.
2. Open **Penpot in a browser**, open the file/project to draw in, and launch the MCP
   plugin from the plugins menu.
3. **Keep that tab open and focused.** The WebSocket relay drops when the tab loses focus
   or the plugin panel is closed — authoring tools then fail until you refocus.
4. Auth: the **local** server reuses your active browser session (no token). A **hosted**
   endpoint uses a personal access token — create it in Penpot under *Account →
   Integrations → MCP/Access tokens* and set `PENPOT_ACCESS_TOKEN` in `.env`.

Penpot is open-source and free; the live-tab requirement is the cost.

## Figma (`snap-figma`)

Figma's hosted MCP server (`https://mcp.figma.com/mcp`) can **write to the canvas**, and
does **not** require the desktop app open.

1. Connect the server via `/mcp` and complete the **OAuth** flow (no token in `.env`).
2. **Write-to-canvas is a beta** and currently needs a **paid plan** (Pro / Organization /
   Enterprise); it is rate-limited and may become billed after beta.
3. The desktop Dev Mode MCP server is an alternative but needs Figma desktop open in Dev
   Mode — prefer the hosted endpoint for `/wireframe`.

## Checking availability (skill step 2)

Before authoring, confirm the active provider's authoring tools are present in the session.
If they are absent:
- name the missing server (`snap-penpot` / `snap-figma`),
- give the matching setup steps above,
- then stop. Never write wireframes into the repo as a fallback — `wireframe.target` is `mcp`.
