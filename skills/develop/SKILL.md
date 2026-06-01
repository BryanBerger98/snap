---
name: develop
description: >
  Turn one delivery ticket into code on a feature branch and a draft PR/MR. Loads the
  ticket (+ linked product context), maps the codebase, gathers the docs the change
  needs, plans the implementation, optionally stops for approval, then writes the code,
  commits, and opens a draft pull/merge request linked to the ticket. Use after /ticket
  to implement a specific Epic/Story/Task/Bug. Invoked as /snap:develop <TICKET-ID>.
argument-hint: "<TICKET-ID> [--mode gate|autonomous]"
disable-model-invocation: true
allowed-tools: Read, Write, AskUserQuestion, Task, Bash(git *), Bash(gh *), Bash(glab *), Bash(node *)
---

# /develop — Implement a ticket into a draft PR/MR

Take a single ticket produced by `/ticket` and deliver it as code: a feature branch,
conventional commits, and a **draft** PR/MR linked back to the ticket. The work is
decomposed across five model-typed subagents (D-037); this skill **orchestrates** them
and holds the synthesis. The deterministic git core lives in the `snap-developer` agent
and `reference/develop-repo.md`; the contract between stages lives in
`reference/develop-pipeline.md`. The developer **never codes blind** — a work-brief, a
codebase map, and a docs bundle are preconditions.

The argument is read in prose (the first token is the `TICKET-ID`, e.g. `STORY-003`; an
optional `--mode gate|autonomous` overrides the configured mode). No argument → ask the
user which ticket to implement.

## Algorithm

### 0. Resolve the run
- **mode** — run argument `--mode` > `snap.config.json → develop.mode` > `gate`.
- **repo host** — `providers.repository` (`github`/`gitlab`). If `null`, detect it from
  `git remote get-url origin` (see `reference/develop-repo.md`); confirm `owner`/`repo`.
- **ticket + doc backends** — read `providers.tickets` and `providers.doc`.
- Verify the ticket id exists; abort with a clear message if not.

### 1. Resolve the ticket source (branch on provider — D-029)
- `providers.tickets = repository` → resolve the **local ticket file path** under
  `ticketsPath`, plus the linked product entity files (FEAT/PER/BRF from the ticket's
  frontmatter `links`) under `docsPath`. **No loader.**
- `providers.tickets` is remote → spawn `snap-loader` (`provider=<tickets> domain=tickets`)
  and, if `providers.doc` is also remote, `domain=doc` — it writes `.snap/tmp/state.json`.

### 2. Digest the ticket → work-brief
Spawn **`snap-digest`** with the resolved local paths **or** `state.json`. It writes
`.snap/tmp/work-brief.json` (ticket essentials + linked product summary) and returns a
short digest only.

### 3. Map ∥ docs (parallel)
In a **single message**, spawn both:
- **`snap-explorer`** → `.snap/tmp/codebase-map.json` (impacted files + conventions).
- **`snap-docs`** → `.snap/tmp/docs-bundle.json` (library docs via the `snap-context7`
  MCP server, degrading to WebFetch then `gaps[]`; plus product/technical pointers).

### 4. Plan
Spawn **`snap-planner`** (work-brief + map + bundle) → `.snap/tmp/plan.json` and a
human-readable plan summary.

### 5. Docs-readiness gate
For every library in `plan.json → libraries`, require a matching `resolved: true` entry
in `docs-bundle.json → libraries`. If any is missing (present in `gaps[]`):
- re-spawn `snap-docs` targeted at the missing libraries; if still unresolved,
- **present the gap to the user** and get an explicit decision before continuing.
Never let the developer code a library that has no doc.

### 6. Approval gate (mode)
- `mode = gate` → present the plan summary (steps, branch, risks) and **STOP** for human
  approval (AskUserQuestion). Apply any adjustments before proceeding.
- `mode = autonomous` → continue without stopping (review happens later on the draft PR).

### 7. Develop
Spawn **`snap-developer`** (plan + bundle + map; repo host + owner/repo + ticket id/URL).
It checks out `snap/<TICKET-ID>-<slug>`, writes the code, commits (conventional, ticket
ref), pushes, and opens a **draft** PR/MR linked to the ticket. It writes
`.snap/tmp/manifest.json` and returns only that manifest.

### 8. Optional — advance the ticket
If `providers.tickets` is remote and the user wants it, spawn `snap-writer`
(`domain=tickets`) to transition the ticket status to `review`.

### 9. Report
Summarize: branch, commits, the **draft** PR/MR URL, the mode used, and any unresolved
doc gaps. State plainly that the PR/MR is a draft and needs human review before merge.

## Rules
- Branch name `snap/<TICKET-ID>-<slug>` (slug = lowercased title, non-alphanumeric → `-`).
- Never `git push --force`. Never commit on the default branch. The PR/MR is **always**
  `--draft`; never auto-merge.
- Idempotent: if the branch already exists, resume on it (new commits); detect an open
  PR/MR for the branch instead of creating a duplicate.
- No token anywhere — auth is the `gh`/`glab` keychain or `GITHUB_TOKEN`/`GITLAB_TOKEN`
  in `.env` (gitignored). Tokens never enter `snap.config.json` or `.mcp.json` (D-033).
- Scratch lives under `.snap/tmp/` (gitignored). Subagent bodies/diffs stay in their own
  context; only the small JSON contracts cross between stages.
- A subagent does not spawn subagents; this skill is the only orchestrator.
