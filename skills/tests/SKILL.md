---
name: tests
description: >
  Write the tests a change needs — from a ticket's acceptance criteria OR a local diff /
  a PR/MR — then run them and loop to green, repairing only the tests, never the source.
  Resolves the target (no arg → local diff; a PR/MR number → that PR/MR; a TICKET-ID → the
  ticket's acceptance criteria), maps the test runner, plans the coverage (optional gate),
  fans out one tester per enabled level (unit/integration/e2e), runs the suite, and triages
  each failure as a test-bug (fix it) or a source-bug (stop, the code is wrong). Writes test
  files; never edits the source. Invoked as /snap:tests.
argument-hint: "[<TICKET-ID> | <PR#/MR!>] [--base <branch>] [--levels u,i,e] [--mode gate|autonomous]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, AskUserQuestion, Task, Bash(git *), Bash(gh *), Bash(glab *), Bash(node *)
---

# /tests — Write the tests for a change and loop to green

Take a change (a ticket's acceptance criteria, a local diff, or a PR/MR) and produce
**tests that prove it** — then run them and drive the suite to green, **fixing only the
tests, never the source**. The work is split across model-typed subagents (D-039); this
skill **orchestrates** them, runs the suite deterministically, and holds the synthesis.
The host-specific commands live in `reference/tests-repo.md`; the contract between stages
lives in `reference/tests-pipeline.md`. This is the second **quality** skill of the palette
and a building block of `/fulldev` (`develop → tests → review → qa`): a `tests-failed`
verdict (a real source bug) drives the loop back to `/develop`.

Distinct from its neighbours: `/tests` **writes the tests**. `/review` reviews the code;
`/qa` verifies the acceptance criteria are met. Here the tests become the **truth** that
judges the code — the ticket/diff says *what* to test.

The argument is read in prose: the first token is a `TICKET-ID` (e.g. `STORY-003`), a PR/MR
number (`42`, `#42`, `!7`), or absent; optional `--base <branch>`, `--levels u,i,e`, and
`--mode gate|autonomous`.

## Algorithm

### 0. Resolve the run
- **host** — `providers.repository` (`github`/`gitlab`). If `null`, detect it from
  `git remote get-url origin` (see `reference/tests-repo.md`); confirm `owner`/`repo`.
  A pure-local run with no remote is fine — the host is only needed for the PR/MR paths.
- **levels** — run arg `--levels` (CSV `u,i,e` → `unit,integration,e2e`) > `tests.levels`
  (config) > all three.
- **mode** — run arg `--mode` > `tests.mode` > `develop.mode` > `gate`. Gates **only** the
  write step (stage 4); the run + loop always follow.
- **maxIterations** — `tests.maxIterations` (default `3`).

### 1. Resolve the target
- **no argument → local diff** (`source = change`). `base` = `--base` > the repo default
  branch (detect) > the merge-base; `head` = the working tree / `HEAD`. List changed files
  with `git diff --name-status <base>...HEAD` (and the unstaged working tree). `mode = local`.
- **PR/MR number → remote diff** (`mode = pr`, `source = change`). `gh pr diff <n>` /
  `glab mr diff <n>`, plus metadata (`gh pr view` / `glab mr view`) for the branch + URL.
- **TICKET-ID → acceptance criteria** (`source = ca`). The ticket's CA are the source of the
  tests; the code is context. Resolve the ticket source by provider (D-029, stage 2). If the
  ticket also has a PR/MR (the `/develop` manifest, else `gh/glab … list --search`), use its
  diff as the change under test; otherwise the working tree.
- Write `.snap/tmp/tests-target.json` (mode, source, host, base, head, ticket, pr, levels,
  changed files, `diffCmd`). Abort with a clear message if there is nothing to test.

### 2. Optional — ticket context (digest)
If a ticket is in scope (argument, or the PR links one), resolve its source by provider:
- `providers.tickets = repository` → the local ticket file under `ticketsPath` (+ linked
  FEAT/PER product files under `docsPath`). **No loader.**
- `providers.tickets` is remote → spawn `snap-loader` (`provider=<tickets> domain=tickets`)
  → `.snap/tmp/state.json`.

Then spawn **`snap-digest`** → `.snap/tmp/work-brief.json` — its **acceptance criteria are
the source of the tests** when `source = ca`, and a coverage lens otherwise. Skip cleanly
when no ticket applies.

### 3. Map the codebase (test runner + conventions)
Spawn **`snap-explorer`** → `.snap/tmp/codebase-map.json` — the stack, the **test runner**,
the tests `dir`, the run `cmd`, the test-file naming + conventions, and any E2E harness.
The testers and the suite run both follow this map.

### 4. Plan the coverage — write gate (mode)
Build the **test plan** from the frozen template `skills/tests/templates/test-plan.md`,
filling its `{{placeholders}}` from `tests-target.json` + `work-brief.json` (acceptance
criteria) + `codebase-map.json` (runner/dir): which tests, for which criteria/changed
behavior, at which levels.
- `mode = gate` → present the plan and **STOP** for approval (AskUserQuestion). Apply any
  adjustments before writing.
- `mode = autonomous` → continue without stopping.

### 5. Fan-out the testers (parallel)
In a **single message**, spawn one **`snap-tester`** per enabled level, each reading
`tests-target.json` + `codebase-map.json` (+ `work-brief.json` when present), writing real
test files in the repo's own runner/conventions and a tiny per-level contract:
- level `unit` → `.snap/tmp/tests-unit.json`
- level `integration` → `.snap/tmp/tests-integration.json`
- level `e2e` → `.snap/tmp/tests-e2e.json`
Each maps its files to the CA they cover and lists any `uncovered` criterion (a gap — never
silently installs a missing harness). Test code stays in the tester's context; only the JSON
contract returns.

### 6. Run the suite + loop to green
Run the suite deterministically via `codebase-map.tests.cmd` (filtered to the written
levels/files when the runner allows), capturing pass/fail.
- **Green** → stage 7.
- **Red** → spawn **`snap-test-triage`** → `.snap/tmp/triage.json`, classifying each failure:
  - `test-bug` → re-spawn the matching-level **`snap-tester`** in **fix mode** (it reads
    `triage.json`, repairs only the test files), then **re-run**. Bounded by `maxIterations`.
  - `source-bug` → **exit the loop** — never edit the source (the `/develop` frontier).
    Keep the failure for the verdict.
- On exhausting `maxIterations` with `test-bug`s left: mark them as **test debt** (they do not
  affect the verdict) and `log()` the cap reached — no silent truncation.

### 7. Synthesize + deliver
Merge the per-level coverage + suite stats + triage into `.snap/tmp/tests-report.json`.
Compute `verdict = tests-failed` if any failure is a `source-bug` **or** any in-scope CA is
uncoverable without a source change; else `passed`.
- `mode = local` → leave the tests in the working tree; write the report from
  `skills/tests/templates/report.md` to `.snap/tmp/tests-report-<id>.md`.
- `mode = pr` → commit the test files (conventional message from
  `skills/tests/templates/commit-message.txt`) and push to the **existing** PR branch (never
  the default branch, never `--force`, never a new PR — see `reference/tests-repo.md`).
- **Always** print a conversation summary: a table of levels/CA coverage + the verdict.

### 8. Report
Summarize: target (local / PR-MR + URL / ticket), levels run, CA coverage, suite stats
(passed/failed, iterations), the **verdict**, the delivery channel/ref, and any test debt or
gaps. State plainly that a `tests-failed` verdict means the code does not satisfy a criterion
(the `/fulldev` loop sends it back to `/develop`).

## Rules
- **Writes tests, never source.** Every write is a test file (or the scratch JSON). The
  testers and the loop never edit the source under test — a `source-bug` exits to the verdict;
  it is not patched here (the `/develop` frontier, by design).
- **Coverage = acceptance criteria, not lines.** Each in-scope criterion needs ≥1 covering
  test. Line/percentage coverage is out of scope (v1).
- Idempotent: re-running updates the existing test files in place (the tester reads what is
  there); on the `pr` path it commits onto the existing branch — never a parallel branch,
  never a duplicate PR/MR.
- Never `git push --force`. Never commit on the default branch. Never open a new PR/MR, never
  merge, never approve.
- No token anywhere — auth is the `gh`/`glab` keychain or `GITHUB_TOKEN`/`GITLAB_TOKEN` in
  `.env` (gitignored). Tokens never enter `snap.config.json` or `.mcp.json` (D-033).
- Scratch lives under `.snap/tmp/` (gitignored). Test code, diffs, and suite logs stay in the
  subagents' context; only the small JSON contracts cross between stages.
- A subagent does not spawn subagents; this skill is the only orchestrator and the only runner
  of the suite.
