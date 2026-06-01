# Authoring playbook (for /design)

Provider-specific recipes for composing Hi-Fi mockups in the tool via MCP — placing DS
component instances, applying token styles, filling real content, and (optionally) wiring
prototype links. Inspect the active server's actual tool list first — names vary; the moves
below are the intent.

## Capability → tool

| Move | Penpot (`snap-penpot`) | Figma (`snap-figma`) |
| --- | --- | --- |
| Place a board (frame) | a board / frame (Plugin SDK via `execute_code`) | a frame |
| Instantiate a DS component | place an **instance** of a library component, set variant | place an **instance** of a component-set, set variant props |
| Apply token styling | bind fill/text to the **library style** | bind to the **variable / style** |
| Real text/content | set text node value | set text node value |
| Prototype link (interactive) | set an **interaction** on the element (Plugin SDK) | set a **reaction** (on-click → navigate) |

Prefer a **batch/code path** when the server exposes one (e.g. Penpot `execute_code` with the
Plugin SDK) — placing dozens of instances one call at a time is slow and error-prone.

## Order of operations (compose a screen)

1. **Resolve the skeleton (hybrid)** — does a `/wireframe` board exist for this screen?
   - **Yes** → open it and upgrade in place (zones → DS instances, greyscale → token styles,
     placeholders → real content). Keep its frame size.
   - **No** → create a new board from the Feature flow and compose from DS components.
2. **Place DS component instances** for each zone (`design-conventions.md` anatomy). Always an
   **instance** of a `/ds` library component — never a hand-built duplicate. Set its variant
   (size/kind) and state (default/hover/disabled…) to match the board's state.
3. **Apply token styles** — color, type, spacing come from the DS **token styles** only. No
   literal hex / font size / pixel padding.
4. **Fill real content** — labels, copy and representative data from the PRD. No lorem ipsum.
5. **One board per state** — repeat for each Story state (empty/loading/error/success/filled),
   swapping component states and content; name `HI · <screen> · <state>`.
6. **Idempotency** — match boards by name. An existing board for this screen/state is
   **updated**, not duplicated. Re-running `/design` converges.

## DS-gap rule

If a zone needs a component the DS does **not** provide:
- **stop that element** (leave the zone empty or a labelled placeholder),
- record the gap (component name + where it's needed),
- route the user to **`/ds`** to author it in the design system,
- then resume `/design` once the component exists.

Never author the missing component inline — the DS is the single source of components, and an
inline copy would drift from it.

## Wiring interactivity (`design.interactive: prototype`)

1. **Navigation links** — for each edge of the user flow (A → B on the primary action), set a
   prototype link on screen A's triggering control → screen B's board.
2. **State transitions** — link state boards in their natural order (filled → loading →
   success; error → filled) on the relevant control.
3. **Graceful degradation** — if the provider's MCP cannot author links (Penpot interaction
   not settable in this build / Figma reaction authoring absent), do **not** stop: write each
   intended transition into the board **description**, order boards along the flow, and report
   the degradation in the summary.

When `design.interactive: static`, skip wiring entirely but still note the intended flow in
the board descriptions.

## Routing & switching

`/design` reads `providers.design` to pick the active tool (the **same key as `/ds`**, so the
DS library is in the same tool), then `snap-penpot` / `snap-figma` accordingly. Switching
tools = `/snap:init --designProvider figma|penpot`; switching the interactivity mode =
`/snap:init --designInteractive static|prototype`. The skill never picks the tool or the mode
for the team — it routes by config.
