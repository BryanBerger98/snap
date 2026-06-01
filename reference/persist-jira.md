# Snap — Jira recipe (tickets provider)

Progressive-disclosure reference for `snap-loader`, `snap-writer`, and
`snap-provisioner` when `providers.tickets = jira`. Implements the Jira-specific
side of **D-027 / D-033**. Read alongside `remote-architecture.md`.

> **MCP status:** The Atlassian MCP (`mcp__claude_ai_Atlassian_Rovo__*`) is
> **connected in this session**. All tools listed below are callable as-is.

---

## The one rule (Jira edition)

Jira is the **exclusive** tickets backend when active — no mirror to the repo or
GitHub Projects (D-027 / D-033). The deterministic core (lint / render) is unchanged;
only the adapter differs. Snap never creates a Jira project — it connects to one.

---

## Auth / secrets

- `JIRA_API_TOKEN` lives in `.env` (never in `snap.config.json` or `.mcp.json`).
  The Atlassian MCP server reads it from there; agents never touch it.
- Non-secret locators go in `snap.config.json` under `remote.jira`:

```json
{ "jira": {
    "cloudId":    "<cloudId from getAccessibleAtlassianResources>",
    "projectKey": "<KEY, e.g. MYPROJ>" } }
```

These two values are not secrets. Everything else (the token, the user email) stays
in `.env`.

---

## Entity mapping

### Issue types

Snap ticket types map to Jira issue types. **Issue type names vary per project** —
always confirm them with `getJiraProjectIssueTypesMetadata` during provisioning and
store the verified names; never hardcode `"Epic"`, `"Story"`, etc.

| Snap type | Expected Jira type | Notes |
| --------- | ------------------ | ----- |
| `epic`    | `Epic`             | top-level delivery container |
| `story`   | `Story`            | belongs to an Epic |
| `task`    | `Task`             | belongs to a Story or Epic |
| `bug`     | `Bug`              | belongs to a Story / Epic / directly |

### Field mapping

| Snap frontmatter key | Jira field | Notes |
| -------------------- | ---------- | ----- |
| `title`              | `summary`  | plain text |
| body (Markdown)      | `description` | Jira accepts Atlassian Document Format (ADF); pass Markdown and let the MCP render it, or convert manually |
| `status`             | workflow status | **transition only** — see Status / workflow below |
| `story.estimate`     | Story Points custom field | field id discovered via `getJiraIssueTypeMetaWithFields`; never hardcoded |
| `story.priority` / `bug.priority` | `priority` | Jira priority names: `Highest` / `High` / `Medium` / `Low` / `Lowest`; map P0→Highest … P3→Low |
| `task.kind`          | `labels`   | add as `kind:<value>`, e.g. `kind:spike` |
| `bug.severity`       | `labels`   | add as `severity:<value>`, e.g. `severity:blocker` |
| `owner`              | `assignee` | resolve with `lookupJiraAccountId` before writing |
| `board_url`          | n/a (derived) | the issue's browse URL: `https://<domain>/browse/<KEY-nnn>`; written back into the ticket frontmatter after create/update |
| `created` / `updated` | `created` / `updated` | read-only on Jira; the loader maps them back to `fm` for display; on create the snap fields are set from the brief |
| `links.parents`      | parent / Epic Link field | see Hierarchy below |
| `links.children`     | child issues | set on parent after children exist |
| `links.related`      | issue links (`relates to`) | created with `createIssueLink` |
| `snap_id`            | label `snap_id:<ID>` | see Idempotence below |

### Status / workflow

Status is **not** a free field. The writer must:
1. Call `getTransitionsForJiraIssue` to list the transitions available **from the
   issue's current state**.
2. Pick the transition whose `name` or `to.name` matches the target Snap status
   (see the mapping table below).
3. Call `transitionJiraIssue` with that transition id.

Never pass `status` directly to `editJiraIssue` — it will silently fail or error.

Snap → Jira status mapping (approximate; verify against the project's workflow):

| Snap status | Jira status (typical) |
| ----------- | --------------------- |
| `todo`      | `To Do`               |
| `backlog`   | `Backlog`             |
| `doing`     | `In Progress`         |
| `review`    | `In Review`           |
| `done`      | `Done`                |
| `open`      | `Open` (bugs)         |
| `resolved`  | `Resolved` (bugs)     |
| `closed`    | `Closed` (bugs)       |

### Hierarchy (Epic → Story → Task / Bug)

Jira's parent-child mechanism differs between project types:

- **Company-managed projects:** use the `Epic Link` custom field (field id from
  `getJiraIssueTypeMetaWithFields`) to attach a Story/Task/Bug to an Epic; use the
  `parent` field for sub-tasks.
- **Team-managed projects (next-gen):** use the `parent` field directly for all
  levels; `Epic Link` does not exist.

Discover the project type and the correct field during provisioning. Store the
resolved field id in `snap.config.json → remote.jira` (e.g. `epicLinkFieldId`).

---

## `snap_id` matching key (D-031)

The canonical Snap id (e.g. `EPIC-001`, `STORY-003`) is stored as a **label** on
every Jira issue:

```
snap_id:EPIC-001
```

This is the idempotence key — exactly analogous to the `snap_id` rich_text column
in Notion. The loader finds issues by this label; the parent decides create vs update
vs skip before spawning any writer.

If the project has a custom text field dedicated to Snap ids (discoverable via
`getJiraIssueTypeMetaWithFields`), use that field instead and record its id in
`snap.config.json → remote.jira.snapIdFieldId`. The label fallback is always
sufficient.

Duplicates (same snap_id label on two issues) → `lint --from-json` exits 1 →
the gate blocks the write. Never resolve silently.

---

## Provisioning (`snap-provisioner`)

**Trigger:** `/snap:init` with `provider=jira domain=tickets`.

Do **not** create a project. Verify and connect to the user-given project.

1. `getAccessibleAtlassianResources` → capture `cloudId`.
2. `getVisibleJiraProjects` → verify the user-supplied `projectKey` exists and is
   reachable; abort with a clear error if not.
3. `getJiraProjectIssueTypesMetadata` → confirm the project has issue types mapping
   to epic / story / task / bug (record the exact type names — they vary).
4. For each issue type: `getJiraIssueTypeMetaWithFields` → locate:
   - The **Story Points** custom field id (often `story_points` or `customfield_10016`
     — do not assume; read the field list).
   - The **Epic Link** custom field id (company-managed) or confirm `parent` is used
     (team-managed).
   - A **snap_id custom field** if one exists; otherwise the label strategy is used.
5. Write `.snap/tmp/remote.json` shaped for `init-config.mjs --remoteJson`:

```json
{ "jira": {
    "cloudId":           "<id>",
    "projectKey":        "MYPROJ",
    "issueTypes":        { "epic": "Epic", "story": "Story", "task": "Task", "bug": "Bug" },
    "storyPointsFieldId": "customfield_10016",
    "epicLinkFieldId":   "customfield_10014",
    "snapIdFieldId":     null
} }
```

`init-config.mjs` merges this under `snap.config.json → remote.jira`. Return a
short human summary listing what was confirmed and the resolved field ids.

---

## Load (`snap-loader`)

**Input:** `provider=jira domain=tickets`, locators from `snap.config.json → remote.jira`,
`withBody`, `scratchPath`.

1. Fetch all issues in the project with the snap_id label pattern:
   ```
   searchJiraIssuesUsingJql  →  project = "<KEY>" ORDER BY created ASC
   ```
   Page through all results (use `startAt` / `maxResults`). For each issue, request:
   the `summary`, `status`, `issuetype`, `labels`, `priority`, `assignee`,
   `created`, `updated`, `parent`, the Epic Link field, issue links, and — only if
   `withBody` — `description`.

2. For each issue:
   - Extract the snap_id label (`snap_id:<ID>` → strip prefix → `id`).
   - If no snap_id label exists on an issue, skip it (it is not a Snap-managed entity).
   - Reconstruct `fm` from the Jira fields (reverse of the field mapping table above).
   - Reconstruct `links.parents` from the Epic Link / `parent` field (map the linked
     issue's snap_id label back to a Snap id).
   - Reconstruct `links.related` from issue links typed `"relates to"` (map by
     snap_id label of the linked issue).
   - Set `source = { provider: "jira", ref: "<ISSUE-KEY>" }`.
   - Collect cross-root ids (`FEAT-*`, `PER-*`) from `links.related` into `externalIds`.

3. Normalize to the standard entity shape (D-028):

```json
{ "id": "EPIC-001", "type": "epic",
  "fm": { "id": "EPIC-001", "type": "epic", "title": "…", "status": "todo",
          "stability": "living", "language": "fr",
          "created": "2026-06-01", "updated": "2026-06-01",
          "board_url": "https://<domain>/browse/MYPROJ-1",
          "owner": "",
          "links": { "parents": ["FEAT-001"], "children": ["STORY-001"], "related": [] } },
  "source": { "provider": "jira", "ref": "MYPROJ-1" } }
```

4. Write `.snap/tmp/state.json` as `{ "entities": […], "externalIds": ["FEAT-001"] }`.
5. Return compact digest (one line per entity, same format as `--digest` scripts).

If the project is empty or not provisioned, write `{ "entities": [], "externalIds": [] }`
and note clearly so the caller routes to provisioning.

---

## Write (`snap-writer`)

**Input:** standard writer input (see `snap-writer.md`) with `provider=jira`.
The caller hands `op` (`create` | `update`) and, for update, the target `ref`
(issue-key from the loader's map). The writer never queries existence.

### create

1. If `owner` is set: `lookupJiraAccountId` → resolve the account id.
2. Build the fields object:
   - `summary` = `title`
   - `description` = body (Markdown / ADF)
   - `issuetype.name` = the verified issue type name from config
   - `labels` = `["snap_id:<ID>", "kind:<value>"]` (plus any severity label)
   - `priority.name` = mapped from Snap priority (if set)
   - `assignee.accountId` = resolved account id (if set)
   - Story Points custom field = `estimate` (story type only; use the field id from config)
3. `createJiraIssue` with the fields object.
4. Capture the resulting issue key as `ref` (e.g. `MYPROJ-12`).
5. If `links.parents` is set: set the Epic Link / `parent` field via
   `editJiraIssue` on this issue (parent must already exist).
6. If `links.related` is set: for each related Snap id, look up the corresponding
   issue key (from the loader's map) and call `createIssueLink` with type
   `"Relates"`.
7. Derive `board_url = https://<domain>/browse/<ref>` and return it in the manifest
   so the caller can write it back into the ticket frontmatter.

### update (F1 — load-modify-write)

The caller hands the target `ref` (issue-key). Fields the loader already read are
current; the writer overwrites only the **managed** properties.

1. `editJiraIssue` — update `summary`, `description` (only if body changed),
   `labels` (keep non-Snap labels; replace `snap_id:*` and `kind:*` / `severity:*`),
   `priority`, `assignee`, Story Points field.
2. If `status` changed: `getTransitionsForJiraIssue` → find the matching transition →
   `transitionJiraIssue`. Never skip this — a direct status edit is invalid.
3. If parent changed: `editJiraIssue` on the Epic Link / `parent` field.
4. If `links.related` changed: `createIssueLink` for additions; no automated removal
   (Jira has no safe bulk-delete of links; leave orphan links for the user to clean).

Return manifest only:
`{ "id": "EPIC-001", "op": "created|updated|skipped|error", "target": "jira", "ref": "MYPROJ-1", "board_url": "https://…/browse/MYPROJ-1" }`.

---

## Idempotence

The parent matches each Snap entity to a Jira issue before spawning any writer:

```
searchJiraIssuesUsingJql → project = "<KEY>" AND labels = "snap_id:<ID>"
```

- 0 results → `op = create`
- 1 result → `op = update`, `ref = <issue-key>`
- 2+ results → duplicate; `lint --from-json` exits 1; the gate blocks all writes.

Writers never query existence — this is decided in the parent, then handed to each
writer spawn.

---

## Caveats

1. **Status is a workflow transition.** Always call `getTransitionsForJiraIssue` to
   get the available transitions from the issue's *current* state before calling
   `transitionJiraIssue`. A transition that is available from `To Do` may not be
   available from `In Progress`.
2. **Issue type names vary.** The names `Epic`, `Story`, `Task`, `Bug` are defaults
   on standard Jira templates but are not guaranteed. Always resolve them with
   `getJiraProjectIssueTypesMetadata` during provisioning; store the exact strings.
3. **Custom field ids must be discovered.** Story Points, Epic Link, and any snap_id
   custom field have opaque ids (e.g. `customfield_10016`). These are resolved once
   during provisioning via `getJiraIssueTypeMetaWithFields` and stored in
   `snap.config.json → remote.jira`. Never hardcode them in agent logic.
4. **Epic hierarchy differs by project type.** Company-managed projects use the
   `Epic Link` custom field; team-managed (next-gen) projects use the `parent` field
   for all levels. Provisioning determines which applies and records it.
5. **`board_url` is derived, not stored on Jira.** Construct it as
   `https://<domain>/browse/<issue-key>` after create/update and write it back to
   the local ticket frontmatter via the manifest. This is the doc↔ticket bridge key.
6. **Link removal.** Snap does not auto-delete Jira issue links on update. Removed
   entries in `links.related` produce a warning in the manifest; a human cleans
   orphan links in Jira.
