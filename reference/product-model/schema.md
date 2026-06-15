# Product model — entry point

The entity model is the Markdown rendering of the layered product schema (D-019).
This file is a **pointer** (R7 — never copy the model). For the actual rules, read:

- `id-scheme.md` — argument ↔ type ↔ dir ↔ prefix, numbering, slugs, epics.
- `frontmatter-schema.md` — the YAML contract (common keys + per-entity keys).
- `checklists.md` — mandatory sections (Definition of Done) + per-entity status lifecycle.
- `discovery.md` — interview posture + quality bar shared by every phase.
- `core-io.md` — load / gate / regenerate procedure shared by the three skills.
- `${CLAUDE_PLUGIN_ROOT}/templates/product-model/*.md` — frozen entity templates.

## v1 entities (one file + frontmatter each; relations = `id` links)

| Entity | Prefix | Produced by | Notes |
| --- | --- | --- | --- |
| Brief (PR-FAQ) | `BRF-` | `/define --new` | singleton (`BRF-001`) |
| Persona | `PER-` | `/define --vision` | 1–3, kept `proto` |
| Feature (stub) | `FEAT-` | `/brainstorm` | catalogue row: title + persona + value hypothesis |
| Feature (specified) | `FEAT-` | `/define --spec` | PRD body when `depth: specified` (Now only) |
| Decision (ADR) | `ADR-` | `/define --spec`, `/roadmap` | append-only |

Generated views (`README.md`, `ROADMAP.md`) are never authored by hand — see `core-io.md`.
The canonical layered schema lives at `${CLAUDE_PROJECT_DIR}`-independent source
`plan/schema-documentation-produit.md` in the Snap repo.
