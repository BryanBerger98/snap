# Wireframe conventions (Lo-Fi)

Lo-Fi = structure and flow, not styling. Every board is greyscale boxes plus short
placeholder labels. No real copy, no brand color, no type scale, no imagery, no icons
beyond a labelled box. Fast to make, cheap to throw away.

## Source → wireframe mapping

```
FEATURE (specified, has a user flow)  →  a Page / Section of boards
  each step/view of the flow          →  one SCREEN  (one board)
    each Story on that screen         →  one STATE   (one board per state)
      acceptance criteria of a Story  →  the zones/content that must be visible
```

- **Screens come from the Feature user flow** (the numbered flow section in the PRD).
- **States come from the Stories** (their acceptance criteria spell out empty / error /
  success / filled). Derive — never invent a screen the flow does not describe.

## Screen anatomy — zones

Lay each screen out as labelled regions (placeholder boxes), top to bottom:

| Zone | Holds |
| --- | --- |
| **Header / nav** | title, back/menu, primary nav |
| **Content** | the main region — lists, forms, cards (as empty boxes + labels) |
| **Primary action** | the screen's main CTA (a single labelled button box) |
| **Secondary** | filters, secondary links, tabs |
| **Footer / status** | status bar, pagination, system messages |

Not every screen has every zone — include only what the flow needs.

## State taxonomy

Draw the states a Story actually implies — typically a subset of:

- **empty** — no data yet (first run, nothing created).
- **loading** — request in flight (skeleton boxes).
- **filled / default** — the nominal populated screen.
- **error** — a failure path (validation, network) with the message zone visible.
- **success** — confirmation after the primary action.

One board per state. Do not cram several states into one board.

## Naming & traceability

Because nothing is written to the repo, the **board name and description carry the link**:

- **Page / Section**: `<FEAT-id> · <Feature title>` — e.g. `FEAT-001 · Sessions Pomodoro`.
- **Board**: `WF · <screen> · <state>` — e.g. `WF · Connexion · erreur`.
- **Description** (or a small caption text node on the board): the upstream ids, e.g.
  `FEAT-001 · STORY-002` so a reader can trace back to the spec.

## Frame sizes

- **Mobile**: ≈ 360 × 800.
- **Desktop**: ≈ 1440 × 900.

Pick one per the product context; keep it consistent within a Feature's page.

## What Lo-Fi is NOT

- Not pixel-accurate, not branded, not final copy.
- Not a design-system artifact — components, tokens, and real styling are `/ds` and
  `/design`, downstream of this skill.
