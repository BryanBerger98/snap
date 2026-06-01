# Design-system conventions (for /ds)

How `/ds` models the system, names things, maps to W3C DTCG, and bridges to code. The
**design tool is canonical**; the DTCG model below is the **interchange** the codec uses
to import from / export to code.

## 1. Token taxonomy

| Token class | DTCG `$type` | Example value |
| --- | --- | --- |
| Color | `color` | `#0066ff`, `rgb(...)`, `oklch(...)` |
| Typography — family | `fontFamily` | `"Inter"`, `["Inter","sans-serif"]` |
| Typography — weight | `fontWeight` | `400`, `700` |
| Spacing / sizing | `dimension` | `8px`, `1rem` |
| Radius | `dimension` | `4px`, `9999px` |
| Border width | `dimension` | `1px` |
| Shadow / elevation | `shadow` | `{ color, offsetX, offsetY, blur, spread }` |
| Opacity | `number` | `0.5` |
| Z-index | `number` | `100` |
| Duration (motion) | `duration` | `150ms` |

Scalar types round-trip both ways through the codec. `shadow` is a composite object and
currently composes **one-way** (DTCG → CSS `box-shadow`).

## 2. The three tiers

Author tokens in tiers so the system is reasoned, not a flat dump:

1. **Primitive** (raw scale) — `color.blue.500`, `space.4`, `radius.md`. No semantics.
2. **Semantic** (role) — `color.action.background`, `color.text.default`,
   `space.inset.md`. **Aliases** of primitives: DTCG `"$value": "{color.blue.500}"`.
3. **Component** (binding) — `button.background`, `input.border`. Aliases of semantics.

Components in the tool bind to **semantic/component** styles, never to raw primitives or
literal values — so a re-theme touches one tier.

## 3. Naming

- Token path = dot-separated tiers: `color.action.background`. In the tool, mirror this as
  the style name (`color/action/background` or the tool's group separator).
- The codec maps a path to a CSS variable by joining with `-`
  (`color.action.background` ⇄ `--color-action-background`). **Keep each path segment
  dash-free** for a clean round-trip.
- Aliases survive as CSS `var(--…)` and decode back to `{…}`.

## 4. DTCG mapping (the interchange)

A token is `{ "$type": "...", "$value": ... }`; `$type` inherits from the enclosing group.
Example:

```json
{
  "color": {
    "$type": "color",
    "blue": { "500": { "$value": "#0066ff" } },
    "action": { "background": { "$value": "{color.blue.500}" } }
  },
  "space": { "$type": "dimension", "4": { "$value": "16px" } }
}
```

This is what `tokens-codec.mjs` consumes/produces. Code targets it emits:
`tokens.json` (DTCG), `tokens.css` (`:root` custom properties), `tailwind.tokens.json`
(`theme.extend`).

## 5. Component anatomy

Each component authored in the tool carries:
- **Name** — e.g. `Button`, `Input`, `Card`.
- **Variants** — orthogonal axes: `size` (sm/md/lg), `kind` (primary/secondary/ghost), …
- **States** — `default` · `hover` · `focus` · `disabled` · `error` (+ `loading` where it
  applies). One variant combination per state as the tool models it.
- **Anatomy** — the parts (container, label, icon, …) and which **token style** each part
  binds to.

The export **component manifest** (`components.md`) lists, per component: variants, states,
and the token bindings — the contract `/design` (hi-fi) and `/develop` (code) build on.

## 6. Source feed — what the system needs

Do not author a generic kitchen-sink library. Derive scope from the product:
- `/define` **Features** (`specified`) tell you the surfaces and flows.
- `/wireframe` **screens** (boards already in the tool) reveal which UI elements **recur**
  (the buttons, inputs, cards, nav actually used) → that is the component inventory, and
  the tokens those components need.

Import seeds the system from existing code; the feed above fills the gaps and keeps the
library scoped to what ships.
