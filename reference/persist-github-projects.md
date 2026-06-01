# Snap — GitHub Projects recipe (tickets provider)

Progressive-disclosure reference for `snap-loader`, `snap-writer`, and
`snap-provisioner` when `providers.tickets = github-projects`. Implements the
GitHub-specific side of **D-027 / D-033**. Read alongside `remote-architecture.md`.

> **Driver:** the `gh` CLI (no GitHub MCP server is connected in this session).
> Projects v2 fields and option ids are accessed via `gh project field-list` and
> `gh api graphql`. Install `gh` and authenticate before any remote operation.

---

## The one rule (GitHub Projects edition)

GitHub Projects is the **exclusive** tickets backend when active — no mirror to Jira
or the repo (D-027 / D-033). The deterministic core (lint / render) is unchanged;
only the adapter differs. `snap-linker` does **not** run for GitHub Projects (that
agent is Notion-only).

---

## Auth / secrets

- Authenticate once with `gh auth login` (interactive) or set `GITHUB_TOKEN` in `.env`
  (gitignored). The CLI picks up `GITHUB_TOKEN` automatically when present.
- Required scopes: `repo`, `project` (read + write to Projects v2).
- **Never echo the token.** Verify auth silently: `gh auth status`.
- Non-secret locators go in `snap.config.json` under `remote.githubProjects`:

```json
{ "githubProjects": {
    "owner":         "<org-or-user>",
    "projectNumber": 42
} }
```

`owner` and `projectNumber` are not secrets. The token stays in `.env` or in the
`gh` keychain.

---

## Model

Each Snap ticket maps to **one GitHub Issue** added as a **Project v2 item**:

| Snap concept          | GitHub representation                                |
| --------------------- | ---------------------------------------------------- |
| `title`               | Issue title                                          |
| body (rendered MD)    | Issue body                                           |
| `status`              | Project "Status" single-select field                 |
| `type` (epic/story/task/bug) | "Type" single-select field OR label `type:epic` etc. |
| `estimate`            | "Estimate" number or text field (if provisioned)     |
| `priority`            | "Priority" single-select field (if provisioned)      |
| `kind` (task)         | "Kind" single-select field OR label `kind:dev` etc.  |
| `severity` (bug)      | "Severity" single-select field OR label `severity:blocker` etc. |
| `owner`               | Issue assignee (`--assignee`)                        |
| `board_url`           | Issue HTML URL (also the project item URL)           |
| cross-root links      | `links.parents/children/related` — text in issue body + labels |

The project item's **node id** is the update target (`source.ref`) the loader
returns; the issue number / URL is the human handle.

---

## snap_id matching key (D-031)

The canonical join key is a **label** on the issue: `snap_id:EPIC-001`.

- Applied at create time by the writer alongside any other labels.
- The loader queries by this label to match existing issues.
- Duplicates (same `snap_id` label on two issues) are caught by `lint --from-json`
  (idCount > 1 → exit 1). Never silently resolve — that is a bug, not a tie.
- Label format: `snap_id:<ID>` with a colon (GitHub allows colons in label names).

---

## Provisioning (`snap-provisioner`)

**Trigger:** `/snap:init` with `provider=github-projects domain=tickets`.

Do **not** create a project. Connect to the existing one.

### 1 — Verify the project

```bash
gh project list --owner <owner> --format json
gh project view <projectNumber> --owner <owner> --format json
```

Confirm the project is reachable and the authenticated user has write access. If not
found or access denied, abort with a clear error — do not proceed.

### 2 — Discover field ids

```bash
gh project field-list <projectNumber> --owner <owner> --format json
```

Parse the JSON to find:
- The **Status** single-select field: capture its `id` (`PVTSSF_…`) and the
  `options` array (each option has `id` and `name`). Map Snap status values to
  option ids:

  | Snap status | Expected Status option name (must exist) |
  | ----------- | ---------------------------------------- |
  | `todo`      | `Todo`                                   |
  | `doing`     | `In Progress`                            |
  | `review`    | `In Review`                              |
  | `done`      | `Done`                                   |
  | `backlog`   | `Backlog`                                |
  | `open`      | `Open`                                   |
  | `resolved`  | `Resolved`                               |
  | `closed`    | `Closed`                                 |

  If a required option is missing from the Status field, warn the user — the
  project's Status column must contain those option names before writes will work.
  Field option ids are **not** persisted to `snap.config.json`; re-discover at write
  time.

- Any **custom fields** (Estimate, Priority, Type, Kind, Severity, etc.) — capture
  their field ids and option ids so the writer can set them.

### 3 — Emit locators

Write `.snap/tmp/remote.json` for `init-config.mjs --remoteJson`:

```json
{ "githubProjects": {
    "owner":         "<org-or-user>",
    "projectNumber": 42
} }
```

`init-config.mjs` merges this under `snap.config.json → remote.githubProjects`.

Return a human summary: project name, item count, Status options found, custom fields
found (ids are safe to show).

---

## Load (`snap-loader`)

**Input:** `provider=github-projects domain=tickets`, locators from
`snap.config.json → remote.githubProjects`, `withBody`, `scratchPath`.

### 1 — Fetch issues with snap_id labels

```bash
gh issue list --repo <owner/repo> \
  --label "snap_id:" \
  --json number,title,body,labels,assignees,url,nodeId,state \
  --limit 1000
```

> `gh issue list` does not accept a label prefix glob. Instead fetch **all** issues
> that carry **any** `snap_id:*` label by listing and filtering client-side, or use
> the GraphQL search:

```bash
gh api graphql -f query='
query($owner:String!, $repo:String!, $cursor:String) {
  repository(owner:$owner, name:$repo) {
    issues(first:100, after:$cursor, labels:["snap_id:PLACEHOLDER"]) {
      pageInfo { hasNextPage endCursor }
      nodes { number title body url nodeId
        labels(first:20) { nodes { name } }
        assignees(first:1) { nodes { login } }
      }
    }
  }
}' -f owner=<owner> -f repo=<repo>
```

In practice: fetch all issues (`gh issue list --json ...`), then filter those whose
labels array contains any entry starting with `snap_id:`. Page through with `--limit`
or GraphQL cursor if the repo has many issues.

### 2 — Fetch Project v2 item field values

For each issue's `nodeId`, fetch the corresponding Project v2 item and its field
values (Status, Estimate, Priority, Type, etc.) via GraphQL:

```bash
gh api graphql -f query='
query($projectId:ID!, $cursor:String) {
  node(id:$projectId) {
    ... on ProjectV2 {
      items(first:100, after:$cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          content { ... on Issue { nodeId number } }
          fieldValues(first:20) {
            nodes {
              ... on ProjectV2ItemFieldSingleSelectValue {
                name field { ... on ProjectV2SingleSelectField { name } }
              }
              ... on ProjectV2ItemFieldNumberValue {
                number field { ... on ProjectV2Field { name } }
              }
              ... on ProjectV2ItemFieldTextValue {
                text field { ... on ProjectV2Field { name } }
              }
            }
          }
        }
      }
    }
  }
}' -f projectId=<project-node-id>
```

Get the project node id once:

```bash
gh api graphql -f query='
query($owner:String!, $number:Int!) {
  user(login:$owner) {
    projectV2(number:$number) { id }
  }
}' -f owner=<owner> -F number=<projectNumber>
```

(Substitute `organization` for `user` if `owner` is an org.)

### 3 — Normalize

For each issue matched to a Project v2 item:
- Extract `snap_id` from the label (`snap_id:EPIC-001` → `EPIC-001`).
- Reconstruct `fm` from issue fields + project field values (see mapping table above).
- Extract `links.{parents,children,related}` from labels: labels like
  `parent:EPIC-001`, `child:STORY-002`, `related:FEAT-003` OR from a structured
  section in the issue body (e.g. a `## Links` block with Snap id lists).
- Set `source = { provider: "github-projects", ref: "<project-item-node-id>" }`.
- Collect `externalIds`: all `FEAT-*` / `PER-*` / `BRF-*` / `ADR-*` ids found in
  `links.related` (cross-root references for the lint gate).

### 4 — Write scratch + return digest

Write `.snap/tmp/state.json`:
```json
{ "entities": [ …normalized… ], "externalIds": [ "FEAT-001", "PER-002" ] }
```

Return compact digest (one line per entity):
```
provider=github-projects domain=tickets entities=12 withBody=true
EPIC-001  epic   todo    "Auth epic"         ↑ FEAT-001
STORY-003 story  doing   "Login form"        ↑ EPIC-001 ↔ PER-002
…
```

If no issues carry `snap_id:*` labels (project not yet populated), write
`{ "entities": [], "externalIds": [] }` and note clearly so the caller routes to
the first write pass.

---

## Write (`snap-writer`)

**Input:** standard writer input (see `snap-writer.md`) with `provider=github-projects`.
Field option ids are re-discovered at write time via `gh project field-list`.

### create

1. Render the issue body from the frozen template in `language`. Include a `## Links`
   section listing `parents`, `children`, `related` as Snap id lists (plain text —
   the loader reads them back from here).
2. Build the label list: `snap_id:<ID>` + `type:<type>` + any `parent:<id>` /
   `child:<id>` / `related:<id>` link labels + user-supplied labels.
3. Create the backing issue:
   ```bash
   gh issue create \
     --repo <owner/repo> \
     --title "<title>" \
     --body "<rendered-body>" \
     --label "snap_id:EPIC-001,type:epic,parent:FEAT-001" \
     --assignee "<owner-login-or-empty>"
   ```
   Capture the returned issue URL.
4. Add to the project board:
   ```bash
   gh project item-add <projectNumber> --owner <owner> --url <issue-url>
   ```
   Capture the returned item id (needed for field edits).
5. Set Status and custom fields — discover option id first:
   ```bash
   gh project field-list <projectNumber> --owner <owner> --format json
   # find Status field id + the option id for the snap status value
   gh project item-edit \
     --id <item-id> \
     --field-id <status-field-id> \
     --project-id <project-node-id> \
     --single-select-option-id <option-id>
   # repeat for Estimate (--number / --text), Priority, Type, Kind, Severity
   ```
6. Set `board_url` = the issue HTML URL (returned by `gh issue create`).

### update (F1 — load-modify-write)

The caller hands the target `ref` (project item node id from the loader's map) and
the issue URL.

1. **Issue side** — update body and labels only if changed:
   ```bash
   gh issue edit <issue-url> \
     --body "<new-rendered-body>" \
     --add-label "..." \
     --remove-label "..."
   ```
   Compare the loaded body with the new render; skip if identical (do not clobber
   hand-edited content).
2. **Project item side** — always rewrite the managed fields (idempotent):
   ```bash
   gh project item-edit \
     --id <item-id> \
     --field-id <status-field-id> \
     --project-id <project-node-id> \
     --single-select-option-id <new-option-id>
   # repeat for other managed fields
   ```
3. User-added labels (not in the Snap-managed set) and custom project columns are
   left untouched.

Return manifest only:
```json
{ "id": "EPIC-001", "op": "created", "target": "github-projects", "ref": "<item-node-id>" }
```

---

## Idempotence

- The parent matches each entity to write by its `snap_id:*` label (returned by the
  loader). `create` only if no matching label exists; `update` if found; `skip` if
  unchanged.
- Duplicates (two issues with the same `snap_id:*` label) → `lint --from-json` exits
  1. The gate blocks the write. Do not silently resolve.
- The loader must run (`withBody=true`) before any write pass so the parent has the
  full current map.

---

## Caveats

1. **Projects v2 requires GraphQL for field values.** `gh project item-edit` covers
   writes, but reading field values back (for the loader) requires `gh api graphql`.
   The REST API does not expose Projects v2 field values.
2. **Status option ids are project-specific and must be discovered at runtime** via
   `gh project field-list`. Never hardcode option ids — they differ per project.
3. **The Status field's option names must already contain the Snap status values**
   (`Todo`, `In Progress`, `In Review`, `Done`, `Backlog`, `Open`, `Resolved`,
   `Closed`). If options are missing, add them in the GitHub UI before running writes;
   the provisioner will warn but will not modify the Status field's option set.
4. **`gh` must be authenticated with the `project` scope.** A token with only `repo`
   scope cannot read or write Projects v2.
5. **Owner type matters.** Use `organization(login:$owner)` in GraphQL when `owner`
   is an org; use `user(login:$owner)` when it is a personal account. The provisioner
   detects this with `gh api /users/<owner>` (check `type` field: `Organization` vs
   `User`).
6. **`snap-linker` does not run for GitHub Projects.** There is no native relation
   type to wire. Links are stored exclusively as labels and as Snap id lists in the
   issue body `## Links` section.
