# Snap — Notion schema (frontmatter → columns)

The canonical structure for the Notion backend, mandated by
`plan/schema-documentation-produit.md` (D-019) and frozen by **D-032**: **2 pages +
DBs**, not one typed table. The `key` of that schema (`FEAT-001`) **is** Snap's
`snap_id` (D-031) — the universal join key that survives a provider migration.

This file is the contract shared by `snap-provisioner` (creates the columns),
`snap-writer` (fills them), `snap-loader` (reads them back), and `snap-linker`
(wires the native relations). Property **names** below are authoritative — keep them
stable across all four agents.

## Structure (v1 entities)

| Snap entity | Notion object | Notes |
| --- | --- | --- |
| Brief (`BRF-001`) | **Page** (singleton) | PR-FAQ; metadata in a top YAML block (below) |
| Personas (`PER-`) | **Database** | one row per persona |
| Features (`FEAT-`) | **Database** | one row per feature |
| Decisions (`ADR-`) | **Database** | one row per decision (append-only) |
| Roadmap | **View** of Features | grouped by `horizon`; nothing to generate |

Outcomes / Opportunities / Releases / Glossary from the full schema stay **deferred**
(JIT, exactly as in the repo provider).

**The Brief page is the front door.** Provisioning creates the Brief **first**, then
creates the three databases **parented to it** (`parentId == briefPageId`), so the whole
backend hangs under one root (see `persist-notion.md §1`). `parentPageId` is only the
workspace/page the user picked to host that Brief.

## Common columns (every DB row)

| Column (Notion) | Notion type | Source (frontmatter) |
| --- | --- | --- |
| `snap_id` | rich_text | `id` — **the matching key** (D-031). Uniqueness enforced by Snap's lint, not Notion. |
| `Name` | title | `title` |
| `type` | select | `type` |
| `status` | select | `status` (per-type enum, below) |
| `stability` | select | `stability` |
| `language` | select | `language` (`fr`/`en`) |
| `created` | date | `created` |
| `updated` | date | `updated` |
| `parents` | rich_text | `links.parents`, space-separated Snap ids — **canonical** |
| `children` | rich_text | `links.children`, space-separated Snap ids — **canonical** |
| `related` | rich_text | `links.related`, space-separated Snap ids — **canonical** |
| `rel_parents` | relation | native projection of `parents` (pass 2, `snap-linker`) — display only |
| `rel_related` | relation | native projection of `related` (pass 2) — display only |

**Links are canonical as key-text** (`parents`/`children`/`related` rich_text). The
loader reads links **from those**, never from the relations. `rel_*` relations are an
optional display enrichment wired in pass 2 from the `key → page-id` map; they are
**not** read back.

## Per-type extra columns

| Entity | Extra columns (type) |
| --- | --- |
| persona | `persona_type` (select: proto, validé), `niveau_preuve` (select: hypothèse, entretiens, data) |
| feature | `domain` (select: one option per distinct slug — auth, orgs, rgpd, …; **all known slugs declared at create**), `source` (select: discovered, inventoried), `depth` (select: stub, specified), `horizon` (select: Now, Next, Later, Done), `shipped_at` (date — optional, never required), `owner` (rich_text), `value_hypothesis` (rich_text) |
| decision | `risk_type` (select: value, usability, feasibility, viability, ethical), `supersede` (rich_text, Snap ids) |

## Status enums (the `status` select options)

- brief: `draft`, `review`, `approved`
- persona: `actif`, `archivé`
- feature: `idea`, `discovery`, `ready`, `building`, `shipped`, `deprecated`
- decision: `proposée`, `actée`, `supersédée`

`stability` select: `frozen`, `living`, `append-only` (brief=frozen, persona/feature=
living, decision=append-only).

## The Brief page (no DB row)

`/define`'s Brief is a single **Page** (D-032 — the writer does a *page-create*, not a
row-create). To keep its metadata machine-readable for the loader, the page **begins
with a fenced YAML block** holding the same frontmatter keys, then the PR-FAQ body:

````markdown
```yaml
id: BRF-001
type: brief
title: …
status: review
stability: frozen
language: fr
created: 2026-05-31
updated: 2026-05-31
links: { parents: [], children: [], related: [] }
```

# <Brief title>
…PR-FAQ body…
````

The loader extracts that block with the standard frontmatter parser (treat the page
markdown as a document: the YAML block = `fm`, the rest = `body`).

## Body render-layer (markdown → native blocks)

The columns above hold the **frontmatter**; the entity **body** (PR-FAQ, JTBD, PRD
sections) renders to native Notion blocks — headings, callouts (**type = meaning**),
numbered/nested lists, tables. Notion is loss-free on the full template grammar. The
complete capability matrix and the `blockMap` section-anchor idempotency diff live in
`persist-notion.md` (`§Render layer` / `§Idempotency`) — C2: only `snap-writer` reads
those render rules; this schema file stays the *column* contract.

## Tickets (when `providers.tickets = …` also targets a DB-style platform)

For completeness, the delivery entities map the same way with these extras — but the
ticket board normally lives in Jira / GitHub Projects (see `persist-jira.md` /
`persist-github-projects.md`), where the platform's native issue fields replace these
columns:

| Entity | Extra columns |
| --- | --- |
| common | `board_url` (url), `owner` (rich_text) |
| story | `estimate` (number/rich_text), `priority` (select: P0–P3) |
| task | `estimate`, `kind` (select: dev, infra, test, chore, spike) |
| bug | `severity` (select: blocker, critical, major, minor, trivial), `priority` (select) |

## Provisioning output (written to `snap.config.json` → `remote.notion`)

```json
{ "notion": {
    "parentPageId": "<the workspace/page that holds the Brief>",
    "briefPageId": "<the Brief page — parent of the 3 databases>",
    "roadmapViewId": "<the Features roadmap view>",
    "databases": { "personas": "<db-id>", "features": "<db-id>", "decisions": "<db-id>" } } }
```

These ids are **not secrets** — they belong in the config. The Notion token stays in
`.env`.
