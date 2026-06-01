# Authoring playbook — driving the MCP

The exact MCP tool names differ by server and version, so **first inspect the active
server's available tools**, then map them to the four primitives below. Do not assume a
signature — read the tool schema before calling it.

| Primitive | What you need | Typical Penpot tool | Typical Figma tool |
| --- | --- | --- | --- |
| container | a page / section / file | `create_file` / page op | page (often implicit) |
| board | a screen frame at x,y,w,h | `create_frame` / `create_board` | `create_frame` |
| box | a zone rectangle | `create_rectangle` | `create_rectangle` |
| label | a text node | `create_text` | `create_text` |

If the Penpot server exposes **`execute_code`** (run Plugin-SDK JS in the open tab), prefer
it for batch authoring — one call can build a whole board:
`penpot.createBoard(...)`, `penpot.createRectangle(...)`, `penpot.createText(...)`, then
parent the shapes into the board. Fewer round-trips = less exposure to the tab-focus drop.

## Order of operations (per screen)

1. Ensure the **page/section** for the Feature exists (`<FEAT-id> · <title>`); create it once.
2. Create the **board** for the screen+state at the next free slot (see layout grid),
   sized per the chosen frame (mobile 360×800 / desktop 1440×900). Name it
   `WF · <screen> · <state>`; set its description to `FEAT-xxx · STORY-xxx`.
3. Inside the board, create one **rectangle per zone**, stacked top-to-bottom with padding.
4. Add a **text label** inside (or above) each zone box naming it and its placeholder
   content (e.g. `[ Liste — vide ]`).
5. Greyscale only: light-grey fills, mid-grey strokes, dark-grey text. No accent color.

## Layout grid (board placement)

Place boards on an open canvas so the set reads like a flow:

- **Screens** advance **left → right** (flow order): board *n* at `x = n * (W + gutter)`.
- **States** of one screen stack **top → bottom**: state *m* at `y = m * (H + gutter)`.
- Gutter ≈ 120 px. Keep the Feature's boards on its own page/section.

## Zone stacking (inside a board)

- Outer padding ≈ 16 px (mobile) / 24 px (desktop).
- Stack zones vertically with ≈ 12 px gaps; header ≈ 56 px tall, footer ≈ 48 px, content
  fills the remainder, the primary-action button ≈ 44 px tall.
- A zone = one rectangle + one text label. Lists/cards = a few stacked empty rectangles.

## Idempotency

Before creating, check whether a board with the same `WF · <screen> · <state>` name
already exists on the Feature's page. If it does, **update it in place** (clear/redraw its
children) instead of creating a duplicate. Report created vs updated in the summary.

## State-specific cues (Lo-Fi)

- **empty**: content zone shows a single centered `[ Vide ]` placeholder.
- **loading**: content zone shows 2–3 grey skeleton bars.
- **error**: a message strip at top of content, `[ Erreur : … ]`, primary action still shown.
- **success**: a confirmation strip, the next-step CTA highlighted (still greyscale, just bolder label).
- **filled**: representative placeholder rows/fields, no real data.
