# Snap — `/snap:develop` pipeline architecture (scratch contract)

Shared reference for the develop-side agents (`snap-digest`, `snap-explorer`,
`snap-docs`, `snap-planner`, `snap-developer`) and the skill that orchestrates
them (`/snap:develop`). Implements decisions **D-027 / D-029 / D-037**. This is
the authoritative restatement of the pipeline + scratch contracts the agents
agree on — `plan/plan-develop-specs.md` is the planning source; this ships with
the plugin.

## The one rule

`/develop` takes **one ticket** and produces **code on a branch + a draft
PR/MR**. The skill holds a **deterministic core** (git plumbing, resolution,
gates) and delegates the judgment I/O — synthesis, exploration, doc research,
plan, code — to **agent-adapters**. **The developer never codes blind**:
`work-brief.json` + `codebase-map.json` + `docs-bundle.json` are preconditions,
and a library with no resolved doc blocks the run.

Only the **small JSON contracts cross between stages**. Ticket bodies, library
docs, and diffs stay inside each agent's isolated context — they never return to
the skill's context.

## Pipeline (7 stages)

```
/snap:develop <TICKET-ID> [--mode gate|autonomous]

0 resolution     [skill]   mode (arg > config > gate) ; providers.repository
                           (config | detected from git remote) + owner/repo ;
                           providers.tickets / providers.doc ; verify ticket exists
1 ticket source  [skill]   providers.tickets = repository → resolve local file paths
                             (ticketsPath + linked product entities under docsPath)
                           providers.tickets = remote     → snap-loader domain=tickets
                             [+ domain=doc if providers.doc remote] → state.json
2 snap-digest    [Haiku]   ticket + product (local files OR state.json) → work-brief.json
3 parallel:
   snap-explorer [Haiku]   read-only codebase map + conventions  → codebase-map.json
   snap-docs     [Sonnet]  library docs (Context7 → WebFetch → gap) + product pointers
                                                                   → docs-bundle.json
4 snap-planner   [Opus]    plan ← work-brief + map + bundle       → plan.json
   └─ docs-readiness gate [skill]: every plan library must have a resolved doc,
                           else re-fetch snap-docs or flag the gap to the user
5 mode gate      [skill]   mode=gate → present plan, STOP for human approval
                           mode=autonomous → continue
6 snap-developer [Sonnet]  branch snap/<ID>-slug + code + conventional commits
7 draft PR/MR    snap-developer (gh|glab) → draft, body links the ticket → manifest.json
```

`mode` resolution: run argument **>** config `develop.mode` **>** default `gate`.
All scratch lives under `.snap/tmp/`.

> **`snap-loader` is REMOTE-ONLY** (D-029): it runs only when the provider is
> remote (Notion / Jira / GitHub-Projects), single provider+domain per
> call. For `providers.* = repository` (default), the skill resolves **local file
> paths** and `snap-digest` reads the files directly (bodies stay out of the skill
> context). **Never load a local file through the loader.**

## Scratch contracts (`.snap/tmp/`, gitignored)

`.snap/` is already gitignored — the target repo is never polluted by the handoff
JSON. Each file has one producer and a fixed shape. Field names below are the
contract; do not rename them.

### `work-brief.json` (snap-digest)
```json
{ "ticket": { "id": "STORY-003", "title": "…", "type": "story", "status": "todo",
              "acceptance": ["…", "…"], "constraints": ["…"] },
  "product": { "feature": "FEAT-001", "personas": ["PER-002"], "brief": "BRF-001",
               "summary": "1-3 phrases du pourquoi produit" },
  "links": { "parents": ["FEAT-001"], "related": ["PER-002"] } }
```

### `codebase-map.json` (snap-explorer)
```json
{ "stack": { "lang": "…", "frameworks": ["…"], "pkgManager": "…", "testRunner": "…" },
  "conventions": { "style": "…", "commit": "conventional|other", "dirs": "…" },
  "impacted": [ { "path": "src/…", "why": "…", "kind": "edit|new|read" } ],
  "entrypoints": ["…"], "tests": { "dir": "…", "cmd": "…" } }
```

### `docs-bundle.json` (snap-docs)
```json
{ "libraries": [ { "name": "react", "context7Id": "/facebook/react", "version": "…",
                   "resolved": true, "notes": "hooks API …", "snippets": ["…"] } ],
  "product": [ { "id": "FEAT-001", "ref": "…", "summary": "…" } ],
  "technical": [ { "source": "README|ADR|repo", "ref": "…", "summary": "…" } ],
  "gaps": [ { "library": "foo", "resolved": false, "reason": "no Context7 match" } ] }
```
Non-empty `gaps` ⇒ docs-readiness gate fires.

### `plan.json` (snap-planner)
```json
{ "steps": [ { "n": 1, "action": "…", "files": ["…"], "rationale": "…" } ],
  "libraries": ["react", "zod"], "tests": ["…"], "risks": ["…"],
  "branch": "snap/STORY-003-login-form", "commits": ["feat(auth): …"] }
```
`libraries` is the **source of truth** for the docs-readiness gate (crossed with
`docs-bundle.libraries` / `gaps`).

### `manifest.json` (snap-developer)
```json
{ "ticket": "STORY-003", "branch": "snap/STORY-003-login-form",
  "commits": ["<sha> feat(auth): …"], "host": "github|gitlab",
  "pr": { "url": "…", "number": 12, "draft": true }, "op": "created|updated|error" }
```

### `state.json` (snap-loader — remote only)
Written only when `providers.tickets` / `providers.doc` is remote (same shape as
the remote-backend chain): `{ "entities": [ …normalized… ], "externalIds": [ … ] }`.
`snap-digest` reads it instead of local files. Absent on the `repository` path.

## Docs-readiness gate

After `snap-planner`, before the mode gate. **Every `plan.json.libraries` entry
must have a matching `docs-bundle.json.libraries` entry with `resolved:true`.**

1. For each library in `plan.json.libraries`, find a `resolved:true` match in
   `docs-bundle.json.libraries`.
2. An unmatched library — present in `docs-bundle.json.gaps[]`, or missing
   entirely — **blocks `develop`**. The skill re-runs `snap-docs` targeted at that
   library.
3. Still unresolved ⇒ **present the gap to the user** and require an explicit flag
   to proceed. Never resolved silently.

**The developer never codes a library with no doc.** This is the precondition
that makes "code blind" impossible.

## Mode gate

`develop.mode` (config, schema default `gate`):

- **`gate`** (default) — after the plan passes the docs-readiness gate, present
  `plan.json` (steps + risks + branch) and **STOP for human approval** before
  `snap-developer` runs.
- **`autonomous`** — no stop; flow continues straight to the developer.

The run argument `--mode gate|autonomous` **overrides** the config value.

## Safety invariants (non-negotiable)

- **Draft only**: every PR/MR is opened `--draft`. Nothing is mergeable without
  human review.
- **No force-push**: `git push --force` is never used.
- **No commit on the default branch**: work always lands on `snap/<ID>-slug`;
  if the branch exists, resume on it (no duplicate PR/MR).
- **No token anywhere persisted**: auth is delegated to the `gh` / `glab` CLI
  (keychain) or `GITHUB_TOKEN` / `GITLAB_TOKEN` in `.env` (gitignored). Never a
  token in `snap.config.json` or `.mcp.json`.
- **Context isolation**: bodies, library docs, and diffs stay inside the agents;
  only the small JSON contracts above cross between stages.
- **Scratch stays local**: `.snap/tmp/` is gitignored; the handoff JSON never
  reaches the target repo.

## Per-provider recipe (progressive disclosure)

For the host-specific commands (`gh` / `glab`: branch, commits, push, draft
PR/MR, existing-PR detection, ticket linking), read `reference/develop-repo.md`.
For the remote ticket/doc load on the remote path, the loader follows
`reference/remote-architecture.md` + the matching `persist-*.md`.
