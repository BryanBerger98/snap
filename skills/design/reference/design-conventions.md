# Design conventions (Hi-Fi)

Hi-Fi = the finished thing, composed from the design system — not a sketch. Where a
wireframe is greyscale boxes and placeholder labels, a Hi-Fi board is **real component
instances** from `/ds`, **token-driven** styling, **real content** from the PRD, and **every
state** a Story describes. The aim is a mockup a stakeholder could mistake for the product.

## What makes it Hi-Fi (and what would make it not)

| Must | Must not |
| --- | --- |
| Instances of the **`/ds` components** (button, input, card…) | Hand-built widgets that duplicate a DS component |
| Color / type / spacing from the **DS token styles** | Hard-coded hex, font sizes, pixel paddings |
| **Real content** from the PRD (labels, copy, sample data) | Lorem ipsum, "Button", grey rectangles |
| **Every Story state** as its own board | One board hand-waving several states |
| Real iconography / imagery placeholders sized correctly | Missing or mis-sized media |

If a needed component is **not in the DS**, that is a `/ds` gap — record it and route to
`/ds`; do **not** author the component inline (it would drift from the source library).

## Source → Hi-Fi mapping

```
FEATURE (specified, has a user flow)  →  a Page / Section of boards
  each step/view of the flow          →  one SCREEN  (one Hi-Fi board)
    each Story on that screen         →  one STATE   (one board per state)
      acceptance criteria of a Story  →  the content + components that must be present
  the flow's edges (A → B on action)  →  prototype links   (when interactive: prototype)
```

- **Screens come from the Feature user flow** (the numbered flow section in the PRD).
- **States come from the Stories** (their acceptance criteria spell out empty / loading /
  error / success / filled). Derive — never invent a screen the flow does not describe.
- **Content comes from the PRD** (real labels, copy, representative data).
- **Components + styling come from `/ds`** (instances + token styles).

## Hybrid structure resolution

For each screen, resolve the layout skeleton before composing:

1. **A matching `/wireframe` board exists** → use it as the skeleton and **upgrade in place**:
   placeholder zones become DS component instances, greyscale becomes token styling,
   placeholder labels become real content. The Lo-Fi layout work is preserved.
2. **No wireframe board** → derive the structure from the Feature's **user flow** and compose
   from DS components directly.

Either way the result is the same kind of Hi-Fi board; the wireframe is a head start, not a
requirement.

## Screen anatomy — zones (now filled with DS components)

Same regions as a wireframe, but each zone is realised with DS component instances:

| Zone | Realised with |
| --- | --- |
| **Header / nav** | DS app-bar / nav component, real title, real menu |
| **Content** | DS list / form / card components, real data |
| **Primary action** | DS button (primary variant), real label |
| **Secondary** | DS tabs / filters / links |
| **Footer / status** | DS status / pagination / toast components |

Include only the zones the flow needs.

## State taxonomy

One board per state a Story implies — typically a subset of:

- **empty** — no data yet (first run); DS empty-state component, real guidance copy.
- **loading** — request in flight; DS skeleton/spinner.
- **filled / default** — the nominal populated screen with representative data.
- **error** — a failure path; DS error/validation component, the real message.
- **success** — confirmation after the primary action; DS success/toast component.

One board per state. Do not cram several states into one board.

## Interactivity model (config `design.interactive`)

- **`static`** (default — "hi-fi simple") — finished, styled, complete boards with **no**
  prototype links. The intended flow is noted in each board's description so it can be wired
  later. This is the default because clickable prototyping via MCP is the least mature path.
- **`prototype`** — wire **prototype links** between boards following the user flow:
  - **navigation**: screen A → screen B on the primary action (one link per flow edge).
  - **state transitions**: filled → loading → success, error → filled, etc.
  Set the interaction on the triggering element (the DS button/control). If the provider's
  MCP **cannot** author links, **degrade gracefully**: document each transition in the board
  description and order the boards along the flow — and say so in the summary. Never silently
  drop interactivity.

Switch the mode with `/snap:init --designInteractive static|prototype`.

## Naming & traceability

Because nothing is written to the repo, the **board name and description carry the link**:

- **Page / Section**: `<FEAT-id> · <Feature title>` — e.g. `FEAT-001 · Sessions Pomodoro`.
- **Board**: `HI · <screen> · <state>` — e.g. `HI · Connexion · erreur`.
- **Description** (or a small caption text node): the upstream ids + the DS components used
  + the intended transition, e.g. `FEAT-001 · STORY-002 · [Button, Input, Alert] · → Accueil`.

## Frame sizes

- **Mobile**: ≈ 360 × 800.
- **Desktop**: ≈ 1440 × 900.

Pick one per the product context; keep it consistent within a Feature's page (match the
wireframe frame when upgrading one).

## What Hi-Fi is NOT

- Not a place to **invent** components — missing ones go to `/ds`.
- Not a place to **redefine** tokens — styling is the DS token styles, full stop.
- Not a repo artifact — the design tool is the source of truth (`design.target: mcp`).
