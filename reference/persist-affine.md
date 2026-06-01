# Snap — AFFiNE recipe (doc provider)

Progressive-disclosure reference for `snap-loader`, `snap-writer`, and
`snap-provisioner` when `providers.doc = affine`. Implements the AFFiNE-specific
side of **D-027 / D-032**. Read alongside `remote-architecture.md`.

> **STATUS: CONNECTOR LIVE.**
> The AFFiNE MCP server is registered globally as **`affine`** (user scope,
> `~/.claude.json`) and connects with the `affine-mcp` stdio binary. Tools are
> exposed as `mcp__affine__*` and loaded on demand via `ToolSearch`. The server
> handles its own auth (see below); Snap never touches the token. All operations
> in this recipe are executable today.

---

## The one rule (AFFiNE edition)

AFFiNE is the **exclusive** doc backend when active — no mirror to Notion or the
repo (D-027). The deterministic core (lint / render) is unchanged; only the adapter
differs. AFFiNE stops at **key-text links** (no pass 2, no `snap-linker`).

---

## Auth / secrets

- The `affine` MCP server owns its credentials. It reads an API token from its
  **saved config** (`~/.config/affine-mcp/config`, written by `affine-mcp login`)
  or from `AFFINE_API_TOKEN` in its own process env. **Snap does not manage this
  token** — it never appears in `snap.config.json`, `.mcp.json`, or the plugin's
  `.env`. Verify health with `affine-mcp doctor` (expects HTTP 200 + graphql-auth).
- Only **non-secret** workspace and collection ids go in `snap.config.json` under
  `remote.affine` (parallel to `remote.notion`):

```json
{ "affine": {
    "workspaceId":   "<workspace-id>",
    "briefDocId":    "<the Brief document id>",
    "collections": {
      "personas":  "<collection-id>",
      "features":  "<collection-id>",
      "decisions": "<collection-id>" } } }
```

These ids are not secrets.

---

## Tool map (recipe op → real MCP tool)

| Recipe operation                  | `affine` MCP tool                                  |
| --------------------------------- | -------------------------------------------------- |
| List workspaces / pick target     | `list_workspaces`                                  |
| List / get collections            | `list_collections`, `get_collection`               |
| Create a collection (rule-based)  | `create_collection` (with `rules.filters`)         |
| Create a doc from markdown        | `create_doc_from_markdown` (no `collectionId` arg) |
| Add a doc to a collection allow-list | `add_doc_to_collection`                         |
| Tag a doc (membership + lookup)   | `add_tag_to_doc`, `create_tag`                     |
| Find docs by tag (idempotence)    | `list_docs_by_tag` (exact), `search_docs` (`tag=`) |
| Find docs by title                | `search_docs` (title only — **not** body)          |
| Read a doc's content (YAML + body)| `export_doc_markdown` or `read_doc(includeMarkdown)`|
| Replace a doc's content (update)  | `replace_doc_with_markdown`                        |
| Doc metadata only                 | `get_doc`, `list_docs`                             |

Load each schema with `ToolSearch` (`select:mcp__affine__<name>`) before the call.

---

## Matching key — tags, not body search

`search_docs` matches **document titles only**; it cannot see the YAML `id` field
buried in the body. So the canonical `snap_id` is surfaced as a **tag** to make
docs findable. Every managed doc carries **two tags**:

- `snap:<type>` — e.g. `snap:feature`, `snap:persona`, `snap:decision`. Drives
  **collection membership** via a rule-based collection (see Provisioning).
- `snap:<id>` — e.g. `snap:FEAT-001`. The **unique idempotence handle**.
  `list_docs_by_tag("snap:FEAT-001")` resolves to exactly one doc (its `ref`).

The YAML metadata block remains the **authoritative** source for `fm` and links;
the tags are a search index layered on top. If both disagree, the YAML wins for
content, but a missing `snap:<id>` tag means the writer must add it (self-heal).

---

## Structure

AFFiNE has no native database rows — everything is a **document** inside a
workspace and optionally grouped in a **collection** (a rule-based allow-list).

| Snap entity       | AFFiNE object                       | Notes |
| ----------------- | ----------------------------------- | ----- |
| Brief (`BRF-001`) | Document (singleton)                | PR-FAQ; top YAML metadata block (see below); tag `snap:brief` + `snap:BRF-001` |
| Personas (`PER-`) | Document per persona, in `Personas` collection | top YAML + body; tags `snap:persona` + `snap:<id>` |
| Features (`FEAT-`)| Document per feature, in `Features` collection | top YAML + body; tags `snap:feature` + `snap:<id>` |
| Decisions (`ADR-`)| Document per decision, in `Decisions` collection| top YAML + body; append-only in practice; tags `snap:decision` + `snap:<id>` |
| Roadmap           | Generated index doc grouping features by `horizon` | regenerated on each `/snap:init` |

### Metadata: top YAML block (machine-readable)

Every doc **begins** with a fenced YAML block holding the canonical frontmatter
keys — same shape as the Brief page in `notion-schema.md`. The loader extracts
it as `fm`; the rest of the document is `body`.

```markdown
​```yaml
id: FEAT-001
type: feature
title: …
status: building
stability: living
language: fr
created: 2026-05-31
updated: 2026-05-31
links:
  parents:  [BRF-001]
  children: []
  related:  [PER-001]
​```

# Feature title
…body…
```

`snap_id` **is** the `id` field in this block — it is the canonical matching key
(D-031). It is mirrored as the `snap:<id>` tag for queryability. Uniqueness is
enforced by `lint --from-json` (idCount > 1 → exit 1), not by AFFiNE.

---

## Provisioning (`snap-provisioner`)

**Trigger:** `/snap:init` with `provider=affine domain=doc`.

1. `list_workspaces` → resolve the target `workspaceId` (from input or user-supplied).
   Set it as the default for subsequent calls (or pass it explicitly each time).
2. **Idempotent — collections.** `list_collections`; for each of `Personas`,
   `Features`, `Decisions`, create only if absent via `create_collection` with a
   tag rule so membership is automatic:

   ```json
   { "name": "Features",
     "rules": { "match": "all",
       "filters": [ { "field": "tag", "operator": "equals", "value": "snap:feature" } ] } }
   ```

   Capture each returned collection id.
3. **Idempotent — Brief.** `list_docs_by_tag("snap:BRF-001")`. If empty, create the
   singleton Brief with `create_doc_from_markdown` (stub top YAML block + PR-FAQ
   skeleton), then `add_tag_to_doc` `snap:brief` and `snap:BRF-001`. Capture its id.
4. **Roadmap index doc.** Create (or replace) a generated index doc listing features
   grouped by `horizon`. Tag `snap:roadmap`.
5. Write `.snap/tmp/remote.json` shaped for `init-config.mjs --remoteJson`:

```json
{ "affine": {
    "workspaceId": "<id>",
    "briefDocId":  "<id>",
    "collections": {
      "personas":  "<id>",
      "features":  "<id>",
      "decisions": "<id>" } } }
```

`init-config.mjs` merges this under `snap.config.json → remote.affine`.

> If `create_collection` rules prove unreliable in a given AFFiNE build, fall back
> to manual allow-lists: skip the `rules` block and have the writer call
> `add_doc_to_collection(collectionId, docId)` after each create.

---

## Load (`snap-loader`)

**Input:** `provider=affine domain=doc`, locators from `snap.config.json → remote.affine`,
`withBody`, `scratchPath`.

1. Resolve the doc set. Preferred: per type, `list_docs_by_tag("snap:<type>")` →
   doc ids. Fallback: `get_collection(collectionId)` → allow-list ids. Add the Brief
   (`briefDocId` or `list_docs_by_tag("snap:BRF-001")`).
2. For each document:
   - `export_doc_markdown(docId)` (or `read_doc(docId, includeMarkdown:true)`).
     Always needed for the YAML block; keep `body` only when `withBody`.
   - Parse the **top YAML fenced block** → `fm`. Everything after the closing fence → `body`.
   - Extract `links.{parents,children,related}` from `fm.links.*` (key-text, Snap ids).
   - Set `source = { provider: "affine", ref: "<doc-id>" }`.
3. Normalize to the standard entity shape (D-028):

```json
{ "id": "FEAT-001", "type": "feature",
  "fm": { "id": "FEAT-001", "type": "feature", "title": "…", "status": "building",
          "stability": "living", "language": "fr", "created": "…", "updated": "…",
          "links": { "parents": ["BRF-001"], "children": [], "related": ["PER-001"] } },
  "body": "## …",
  "source": { "provider": "affine", "ref": "<doc-id>" } }
```

4. Write `.snap/tmp/state.json` as `{ "entities": […], "externalIds": [] }`.
5. Return compact digest (one line per entity, same format as the `--digest` scripts).

If a collection/tag is empty or the workspace is not provisioned, write
`{ "entities": [], "externalIds": [] }` and note clearly so the caller routes to
provisioning.

---

## Write (`snap-writer`)

**Input:** standard writer input (see `snap-writer.md`) with `provider=affine`.

### create
1. Render the YAML metadata block from the brief (all frontmatter keys, including
   `links.{parents,children,related}` as Snap id lists).
2. Render the body from the frozen template in `language`.
3. `create_doc_from_markdown({ markdown: yamlBlock + body, title, workspaceId })`.
   Capture the returned doc-id as `ref`.
4. `add_tag_to_doc(ref, "snap:<type>")` and `add_tag_to_doc(ref, "snap:<id>")`.
   (`create_tag` first if the workspace requires pre-registered tags.) With
   rule-based collections this auto-files the doc; otherwise also
   `add_doc_to_collection(collectionId, ref)`.

### update (F1 — load-modify-write)
1. Resolve the target `ref`: from the loader's map, or `list_docs_by_tag("snap:<id>")`.
2. Rewrite the managed YAML metadata block (all frontmatter keys + links) — the
   idempotent part.
3. Rewrite the body **only if it changed** vs the loaded version (compare; skip
   otherwise — do not clobber hand-edited content).
4. `replace_doc_with_markdown({ docId: ref, markdown: yamlBlock + body })`.
5. Self-heal tags: if `snap:<id>` / `snap:<type>` are missing, add them.

Return manifest only: `{ "id": "FEAT-001", "op": "created|updated|skipped|error", "target": "affine", "ref": "<doc-id>" }`.

---

## Links — key-text ONLY (one pass)

AFFiNE has **no usable native relation type**. Links are stored exclusively as
Snap id lists in the YAML metadata block (`links.parents`, `links.children`,
`links.related`). The loader reads them back from there — never from any native
AFFiNE relation mechanism.

**`snap-linker` does NOT run for AFFiNE.** That agent is Notion-only (pass 2 for
native `rel_parents` / `rel_related` relations). For AFFiNE there is no pass 2.

### Human navigation fallback

For readable cross-doc navigation inside AFFiNE, the writer MAY add an
`add_organize_link` entry or embed `create_doc_from_markdown(parentDocId=…)`
hierarchy, and/or surface the `snap:<id>` tags. These are supplemental display
aids — they are never read by the loader. The canonical link data lives only in
the YAML block.

---

## Caveats

1. **Tags are the search index.** `search_docs` is title-only; body content (the
   YAML `id`) is not searchable. The `snap:<id>` / `snap:<type>` tags are therefore
   load-bearing for idempotence, not cosmetic. A doc that loses its `snap:<id>` tag
   becomes invisible to lookup until the writer self-heals it.
2. **Relation limits.** AFFiNE's linking is more limited than Notion's. The key-text
   join is intentionally the only source of truth so that a future provider migration
   (`/snap:migrate-docs --to notion`, D-034) requires no graph traversal — every link
   is readable as plain text from any export.
3. **Roadmap view.** AFFiNE has no native filtered view for grouped roadmaps, so the
   Roadmap is a generated index doc; the provisioner regenerates it on each
   `/snap:init` run.
4. **Duplicate detection.** AFFiNE does not enforce uniqueness on `snap_id`. The
   `lint --from-json` gate (idCount > 1 → exit 1) is the sole enforcement point;
   do not bypass it.
5. **Rule-based collections may vary.** If a given AFFiNE build does not honor tag
   `rules` on collections, fall back to manual `add_doc_to_collection` allow-lists
   (noted in Provisioning) — the tag-for-lookup design is unaffected either way.
