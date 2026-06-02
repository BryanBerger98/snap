# Snap — Orchestration recipe (`/snap:fulldev`)

Runtime recipe for invoking the sub-skills, detecting the entry point, and propagating the mode for the `/fulldev` orchestrator (D-041). Read alongside `reference/fulldev-pipeline.md`.

> **Three concerns, one file:** (A) sub-skill invocation and verdict reading; (B) entry-point detection; (C) mode propagation and delivery.

---

## The one rule (fulldev edition)

`/fulldev` **invokes the sub-skills** (`/snap:develop`, `/snap:tests`, `/snap:review`, `/snap:qa`) via the `Skill` tool and **reads their verdicts** from the scratch contracts — it never does their work, never edits source, tests, or gates, never merges. The deterministic loop control lives in `scripts/fulldev-state.mjs`; the next action always comes from `step`, never from improvisation.

---

## Sub-skill invocation

After each invocation, read the verdict from the gate's scratch contract, then call:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/fulldev-state.mjs" step --did <action> [--tests <v>] [--review <v>] [--qa <v>]
```

The command prints `{ action, status, reason }` — obey it for the next iteration.

| Gate | Invoked | Verdict read from | Green / Red |
|---|---|---|---|
| develop | `/snap:develop --mode <m>` | code up to date (draft PR/MR) | — |
| tests | `/snap:tests --mode <m>` | `.snap/tmp/tests-report.json` → `verdict` | `passed` / `tests-failed` |
| review | `/snap:review` (review-only) | `/review` report header/summary → `verdict` | `approved` / `changes-requested` |
| qa | `/snap:qa --mode <m> [--base-url …]` | `.snap/tmp/qa-report.json` → `verdict` | `accepted` / `rejected` |

Rules:

- **`/tests` ∥ `/review`** — invoke both in a single message when `action = gates`; they work on the same diff independently.
- **`/review` is review-only.** Do **not** pass `--fix`. `/develop` owns every fix; routing a red gate back to `/develop` is the only repair path.
- **Skip a blocked gate.** If the state marks a gate `blocked` (its red count has hit `maxPerGate`), do not re-invoke it — pass `step` the last known verdict for that gate and treat it as skipped.
- **Never run `/qa` before tests + review are green.** The state machine enforces this, but the skill must also honour it: `/qa` boots the app — booting against rejected code wastes resources and produces meaningless evidence.
- **Verdict normalisation** (handled by `fulldev-state.mjs`): `passed|pass|green|ok` → green (tests); `approved|clean|no-changes` → green (review); `accepted|pass` → green (qa). The raw string from the scratch file is passed verbatim — the script normalises.
- If the `/review` report does not expose a machine-readable `verdict` field, read the verdict from the report's header or summary line (`approved` / `changes-requested`).

---

## Entry detection

Resolve the ticket first (ticket-first, same pattern as `/qa`): `TICKET-ID` → its CA; no arg → ticket from the current branch/PR; PR/MR number → the ticket it links. Abort with a clear message if no ticket or no acceptance criteria are found.

Then look for a PR/MR linked to the ticket's branch:

| Host | Command | Found → | Not found → |
|---|---|---|---|
| GitHub | `gh pr list --head <branch> --json number,url,isDraft` | `entry = gates` | `entry = develop` |
| GitLab | `glab mr list --source-branch <branch>` | `entry = gates` | `entry = develop` |

- **`entry = gates`** — a linked PR/MR exists; the diff is the existing PR. Skip `/develop` for the first pass and go straight to the gates.
- **`entry = develop`** — no linked PR/MR (greenfield). `/develop` runs first to produce the code and the draft PR/MR; that initial build counts as cycle 1.

If neither `gh` nor `glab` is configured (the host is `null`), fall back to the `/develop` manifest scratch (`.snap/tmp/develop-manifest.json`) to check whether a PR/MR was already opened.

Pass `entry` to the `init` command:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/fulldev-state.mjs" init \
  --ticket <id> --mode <mode> --max-cycles <n> --max-per-gate <k> --entry <develop|gates>
```

---

## Mode propagation

`fulldev.mode` (default `gate`) is the single mode source for the whole chain. Resolution order: `--mode` arg > `fulldev.mode` (config) > `gate`.

The resolved mode **overrides** each sub-skill's own mode setting and is passed explicitly as `--mode <mode>` to every invocation of `/develop`, `/tests`, and `/qa`. `/review` has no mode flag — it is always review-only.

| Mode | Effect on sub-skills |
|---|---|
| `gate` | Every sub-skill stops at its own gate (presents its plan/output and waits for approval before proceeding). |
| `autonomous` | Every sub-skill runs straight through without stopping at its internal gate. |

The plan gate (stage 3) is governed by the same resolved mode: `gate` → present the plan and stop for user approval before driving the chain; `autonomous` → continue immediately.

---

## Delivery

Stage 8 — runs once, after the loop exits with a terminal status (`done-green`, `stopped-budget`, or `stopped-blocked`):

1. **Write the report** — render `skills/fulldev/templates/fulldev-report.md` (filling `{{placeholders}}` from `.snap/tmp/fulldev-report.json`) → `.snap/tmp/fulldev-report-<id>.md`.
2. **Post the synthesis comment** — render `skills/fulldev/templates/fulldev-comment.md` (verdict + gate states condensed + PR link) and post it to the ticket via `persist-<provider>` (idempotent: search for an existing comment by the skill's signature marker, update or append — never duplicate). The sub-skills already posted their own per-gate comments; this is the orchestration summary.
3. **Leave the PR/MR in draft** — the merge is a human decision outside the palette. Never merge, approve, `--force`, or open a new PR/MR.

`persist-<provider>` selection follows the same table as `/qa` (file write for `repository`; `gh issue comment` / item note for `github-projects`; `addCommentToJiraIssue` for `jira`; Notion MCP for `notion`). If no transition mapping exists, comment only — never guess a status column or transition ID.

---

## Safety invariants

- **Never edit source files, test files, or gate config** — `/fulldev` observes and routes; all edits belong to the sub-skills.
- **Only looper** — deterministic loop control via `scripts/fulldev-state.mjs`; the next action is always returned by `step`, never improvised.
- **Never merge / approve / `--force` / open a new PR** — the chain ends with a draft PR/MR ready for human review; the merge is out of palette scope.
- **PR/MR left in draft** — even on `done-green`, the PR is not promoted; the human decides when to merge.
- **No token in config** (D-033) — auth via `gh`/`glab` keychain or provider token in a gitignored `.env`; tokens never enter `snap.config.json` or `.mcp.json`.
- **Scratch gitignored under `.snap/tmp/`** — `fulldev-state.json`, `fulldev-report.json`, `fulldev-report-<id>.md` and all sub-skill scratch are local only, never pushed.
- **Only small verdict contracts cross stages** — diffs, test suites, run logs, and QA evidence stay inside each sub-skill's isolated context and never return in full to the orchestrator.

---

## Caveats

1. **A blocked gate makes global green unreachable.** When ≥1 gate has hit `maxPerGate` reds, `fulldev-state.mjs` emits `stopped-blocked` regardless of the other gates' state. The report names each blocked gate and its last failure detail for the human to action.
2. **The initial greenfield build counts as cycle 1.** `cycle` tracks `/develop` passes. `entry = develop` → the first run of `/develop` is cycle 1, so `maxCycles = 5` means at most 5 total `/develop` passes including the initial build.
3. **A resume re-detects the entry.** Re-running `/fulldev` after a partial run re-executes entry detection from scratch. An existing PR → `entry = gates` → the loop restarts at the gates (the state is re-initialised, the previous partial run's history is not resumed).
4. **Review verdict fallback.** `/review` may not write a machine-readable verdict file for every invocation. If `.snap/tmp/review-<id>.md` has no `verdict:` field, read the verdict from the report's opening header or summary line — `approved` vs `changes-requested`.
5. **`/tests` ∥ `/review` share the same diff.** Both gates read the same PR diff in the same pass. If `/develop` has not yet run (e.g. `entry = gates` with a stale PR), the diff is whatever the existing PR contains — ensure it reflects the latest push before invoking the gates.
