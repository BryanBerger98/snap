---
name: review
description: >
  Review a change for correctness, security, conventions, and quality — over a local
  diff OR a pull/merge request. Resolves the target (no arg → local diff; a PR/MR number
  → that PR/MR; a TICKET-ID → the PR/MR linked to it), fans out four model-typed reviewer
  agents in parallel, synthesizes severity-classed findings, and delivers them on the
  natural channel (inline PR/MR comments, or a local report). Read-only by default; the
  optional --fix applies fixable findings after approval. Invoked as /snap:review.
argument-hint: "[<TICKET-ID> | <PR#/MR!>] [--base <branch>] [--fix] [--mode gate|autonomous]"
disable-model-invocation: true
allowed-tools: Read, Write, AskUserQuestion, Task, Bash(git *), Bash(gh *), Bash(glab *), Bash(node *)
---

# /review — Code review over a local diff or a PR/MR

Take a change and produce **severity-classed findings** — never a merge, never an
auto-approval. The work is split across four model-typed reviewer subagents (D-038); this
skill **orchestrates** them and holds the synthesis. The deterministic git/diff core lives
in this skill; the host-specific commands live in `reference/review-repo.md`; the contract
between stages lives in `reference/review-pipeline.md`. This is the first **quality** skill
of the palette and a building block of `/fulldev` (`develop → tests → review → qa`): a
`changes-requested` verdict (any blocker/major) drives the loop back to `/develop`.

Distinct from its neighbours: `/review` is **code review** (bugs, security, conventions,
quality). `/qa` verifies the **acceptance criteria**; `/tests` writes the tests. Here the
ticket is a **lens**, not the thing under test.

The argument is read in prose: the first token is a `TICKET-ID` (e.g. `STORY-003`), a PR/MR
number (`42`, `#42`, `!7`), or absent; optional `--base <branch>`, `--fix`, and
`--mode gate|autonomous`.

## Algorithm

### 0. Resolve the run
- **host** — `providers.repository` (`github`/`gitlab`). If `null`, detect it from
  `git remote get-url origin` (see `reference/review-repo.md`); confirm `owner`/`repo`.
  A pure-local diff with no remote is fine — host is only needed for the PR/MR paths.
- **dimensions** — `snap.config.json → review.dimensions` (default all four).
- **flags** — `--base`, `--fix`, `--mode` (`--mode` only gates `--fix`; review itself is
  read-only and never stops before findings).

### 1. Resolve the target
- **no argument → local diff.** `base` = `--base` > the repo default branch (detect) >
  the merge-base; `head` = the working tree / `HEAD`. List changed files with
  `git diff --name-status <base>...HEAD` (and the unstaged working tree). `mode = local`.
- **PR/MR number → remote diff.** `gh pr diff <n>` / `glab mr diff <n>`, plus metadata
  (`gh pr view` / `glab mr view`) for the branch + URL. `mode = pr`.
- **TICKET-ID → linked PR/MR.** Find the PR/MR for the ticket: the `/develop` manifest
  (`.snap/tmp/manifest.json`) if present, else `gh pr list --search "<TICKET>"` /
  `glab mr list --search "<TICKET>"`. Falls back to the local diff (with a note) if none
  is found. `mode = pr` when resolved.
- Write `.snap/tmp/review-target.json` (mode, host, base, head, ticket, pr, changed files,
  `diffCmd`). Abort with a clear message if there is nothing to review.

### 2. Optional — ticket context
If a ticket id is known (argument, or the PR links one), spawn **`snap-digest`** with the
resolved ticket source → `.snap/tmp/work-brief.json`. Its acceptance criteria become a
review lens for the correctness and quality reviewers. Skip cleanly when no ticket applies.

### 3. Fan-out the reviewers (parallel)
In a **single message**, spawn one agent per enabled dimension, each reading
`review-target.json` (re-running `diffCmd` / reading the changed files in its own context),
plus `work-brief.json` where relevant:
- **`snap-reviewer-correctness`** (opus) → `.snap/tmp/findings-correctness.json`
- **`snap-reviewer-security`** (sonnet) → `.snap/tmp/findings-security.json`
- **`snap-reviewer-conventions`** (haiku) → `.snap/tmp/findings-conventions.json`
- **`snap-reviewer-quality`** (sonnet) → `.snap/tmp/findings-quality.json`
Each returns only a tiny digest (counts by severity); the diff never returns to this skill.

### 4. Synthesize
Merge the per-dimension findings; **dedupe** by `file:line + title`; sort by severity
(`blocker > major > minor > nit`). Compute `verdict = changes-requested` if there is any
`blocker` or `major`, else `approve`. Write `.snap/tmp/review-report.json`.

### 5. Deliver (adaptive to the target)
Render every output from the frozen templates in `skills/review/templates/`
(`inline-comment.md`, `summary-comment.md`, `report.md`), filling their `{{placeholders}}`
from `review-report.json`. Each posted comment opens with a hidden `<!-- snap:review:… -->`
marker — the idempotence anchor (see the "Idempotent" rule below; the marker spec lives in
`reference/review-repo.md → Comment templates`).
- `mode = pr` → post each finding as an **inline comment** (`gh`/`glab`; see
  `reference/review-repo.md`); collapse `nit`s into the **summary comment**'s `<details>`
  block rather than inline. Post one **summary comment** (counts table + verdict, marker
  `<!-- snap:review:summary -->`, rewritten in place on re-run). Never `gh/glab pr review --approve`.
- `mode = local` → write a Markdown report at `.snap/tmp/review-<id>.md` (same finding
  rendering, no markers).
- **Always** print a conversation summary: a table by severity + the verdict.

### 6. Optional — `--fix`
If `--fix` is set and there are fixable findings, present them and **STOP for approval**
(AskUserQuestion; `--mode autonomous` skips the stop). Then spawn **`snap-fixer`** with the
fixable subset; it applies the changes to the working tree (`mode = local`) or commits and
pushes to the PR branch (`mode = pr`), and writes `.snap/tmp/fix-manifest.json`. Never a new
PR, never the default branch, never `--force`, never a merge.

### 7. Report
Summarize: target (local / PR-MR + URL), counts by severity, the **verdict**, the delivery
channel/ref, and any fixes applied. State plainly that a `changes-requested` verdict means
the change is not ready (the `/fulldev` loop sends it back to `/develop`).

## Rules
- **Read-only by default.** Only `--fix` writes, and only to the working tree or the PR
  branch — never the default branch, never `git push --force`, never a merge, never an
  approval. `/review` posts comments; it does not approve.
- Idempotent: synthesis dedupes by `file:line + title`; on the PR/MR thread, re-running
  posts only findings whose `<!-- snap:review:… -->` marker is absent, and rewrites the one
  summary comment in place (see `reference/review-repo.md → Idempotence`).
- No token anywhere — auth is the `gh`/`glab` keychain or `GITHUB_TOKEN`/`GITLAB_TOKEN` in
  `.env` (gitignored). Tokens never enter `snap.config.json` or `.mcp.json` (D-033).
- Scratch lives under `.snap/tmp/` (gitignored). Reviewer diffs stay in their own context;
  only the small JSON contracts cross between stages.
- A subagent does not spawn subagents; this skill is the only orchestrator.
