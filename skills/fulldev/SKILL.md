---
name: fulldev
description: >
  Orchestrate the full delivery chain for a ticket — develop → tests → review → qa — in a
  bounded loop until every gate is green or the budget is spent. Resolves the target (a TICKET-ID;
  no arg → the ticket of the current branch/PR; a PR/MR number → the linked ticket), auto-detects
  the entry point (an existing PR → start at the gates; otherwise → /develop first), then loops:
  each round runs /tests ∥ /review on the diff and, only if both are green, /qa live; any red
  routes back to /develop. Stops at done-green, or when the global cycle budget is spent, or when a
  gate hits its per-gate retry cap (blocked). Drives the sub-skills and reads their verdicts; never
  edits the source or the gates, never merges. Invoked as /snap:fulldev.
argument-hint: "[<TICKET-ID> | <PR#/MR!>] [--mode gate|autonomous] [--max-cycles N] [--max-per-gate K] [--base-url <url>]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, AskUserQuestion, Task, Skill, Bash(git *), Bash(gh *), Bash(glab *), Bash(node *)
---

# /fulldev — Orchestrate develop → tests → review → qa to green

Take a ticket and drive the whole delivery chain to a green state: build it with `/develop`, then
loop the quality gates (`/tests` ∥ `/review`, then `/qa`) until all pass — or until the bounded
budget stops the loop (D-041). This skill is the **only looper** of the palette; the four
sub-skills are **single-pass verdict emitters**. It **invokes** them, **reads their verdicts**, and
feeds the deterministic loop brain `scripts/fulldev-state.mjs` — it never does their work, never
edits the source or the gates, never merges. The loop mechanics live in
`reference/fulldev-pipeline.md`; the invocation + entry recipes in `reference/fulldev-orchestration.md`.

The argument is read in prose: the first token is a `TICKET-ID` (e.g. `STORY-003`), a PR/MR number
(`42`, `#42`, `!7`), or absent; optional `--mode gate|autonomous`, `--max-cycles N`,
`--max-per-gate K`, and `--base-url <url>` (passed through to `/qa`).

## Algorithm

### 0. Resolve the run
- **host** — `providers.repository` (`github`/`gitlab`); if `null`, detect from
  `git remote get-url origin`.
- **mode** — run arg `--mode` > `fulldev.mode` (config) > `gate`. This mode **overrides** each
  sub-skill's own mode (passed as `--mode` to `/develop`, `/tests`, `/qa`).
- **maxCycles** — `--max-cycles` > `fulldev.maxCycles` > `5` (max `/develop` passes in the run).
- **maxPerGate** — `--max-per-gate` > `fulldev.maxPerGate` > `3` (reds before a gate is blocked).
- **base-url** — `--base-url` (or `qa.run.url`) is remembered and passed through to `/qa`.

### 1. Resolve the target (ticket-first)
- **TICKET-ID** → its acceptance criteria are the yardstick of the whole chain.
- **no argument** → infer the ticket from the current branch / open PR (the `/develop` manifest,
  else `gh/glab … list --search <branch>`).
- **PR/MR number** → the ticket it links.
- Digest the ticket's acceptance criteria (spawn `snap-digest`, + `snap-loader` first if the ticket
  is remote — D-029) → `.snap/tmp/work-brief.json`. **Abort with a clear message if there is no
  ticket / no acceptance criteria** — there is nothing to orchestrate.

### 2. Detect the entry point
Look for a PR/MR linked to the ticket's branch (`gh pr list --head <branch>` /
`glab mr list --source-branch <branch>`, else the `/develop` manifest). See
`reference/fulldev-orchestration.md`:
- **a linked PR/MR exists** → `entry = gates` (the diff is the existing PR — start at the gates).
- **none** → `entry = develop` (greenfield — build first).

### 3. Plan — gate (mode)
Build the **plan** from the frozen template `skills/fulldev/templates/fulldev-plan.md`, filling its
`{{placeholders}}` from `work-brief.json` (ticket + CA) and the resolved run (entry, gates, budget
`maxCycles`/`maxPerGate`, mode).
- `mode = gate` → present the plan and **STOP** for approval (AskUserQuestion) before driving the
  chain. Apply any adjustments first.
- `mode = autonomous` → continue without stopping.

### 4. Initialize the loop state
Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/fulldev-state.mjs" init --ticket <id> --mode <mode>
--max-cycles <n> --max-per-gate <k> --entry <develop|gates>`. It writes
`.snap/tmp/fulldev-state.json` and prints the first decision `{ action, status, reason }`.

### 5. Drive the loop
Repeat until the decision's `action` is `stop`. For each decision, perform its `action`, then call
`step` with what you did and the verdict(s) to get the next decision:

- **`action = develop`** → invoke `/snap:develop --mode <mode>` (Skill tool). It (re)builds the code
  and updates the draft PR/MR. The new code invalidates previously-green gates (the state machine
  resets them). Then: `fulldev-state.mjs step --did develop`.
- **`action = gates`** → in a **single message**, invoke `/snap:tests --mode <mode>` **and**
  `/snap:review` (review-only — `/develop` owns the fixes, so do **not** pass `--fix`) on the diff.
  Skip a gate the state already marks `blocked`. Read each verdict from its scratch — tests:
  `.snap/tmp/tests-report.json` `verdict` (`passed`/`tests-failed`); review: the `/review` report
  verdict (`approved`/`changes-requested`). Then:
  `fulldev-state.mjs step --did gates --tests <verdict> --review <verdict>`.
- **`action = qa`** → invoke `/snap:qa --mode <mode> [--base-url <url>]` (Skill tool). Read the
  verdict from `.snap/tmp/qa-report.json` `verdict` (`accepted`/`rejected`). Then:
  `fulldev-state.mjs step --did qa --qa <verdict>`.

Pass the resolved `--state` path implicitly (default `.snap/tmp/fulldev-state.json`). Each `step`
prints the next `{ action, status, reason }`; loop on it. Never run a gate the state skips; never
run `/qa` before `tests` + `review` are green (the state machine guarantees this — qa boots the
app, never on rejected code).

### 6. Stop
The loop ends when `status` is terminal: `done-green` (all gates green — the draft PR is ready for
human review), `stopped-budget` (`maxCycles` `/develop` passes spent without all-green), or
`stopped-blocked` (≥1 gate hit `maxPerGate` reds — global green is unreachable).

### 7. Synthesize
Read `.snap/tmp/fulldev-state.json` and assemble `.snap/tmp/fulldev-report.json`: the target
(ticket + PR), entry, mode, budget (with `cyclesUsed`), per-gate final status (`green`/`red`/
`blocked` + red count), the terminal `verdict`, the `blocked` list, and the cycle history.

### 8. Deliver (never merge)
- Write the report from `skills/fulldev/templates/fulldev-report.md` to
  `.snap/tmp/fulldev-report-<id>.md`.
- Post the synthesis comment from `skills/fulldev/templates/fulldev-comment.md` to the ticket via
  `persist-<provider>` (idempotent — updated/appended, never duplicated). The sub-skills already
  posted their own per-gate comments; this is the orchestration summary.
- **Leave the PR/MR in draft.** Never merge, approve, `--force`, or open a new PR — the merge is a
  human decision, outside the palette.

### 9. Report
Summarize: the target (ticket + PR/MR), the detected **entry**, the number of cycles used, the
**per-gate final status**, the terminal **verdict**, and the PR link. On `stopped-blocked`, name
each blocked gate and its last failure detail; on `stopped-budget`, state the budget was spent. On
`done-green`, say the draft PR is ready for human review/merge.

## Rules
- **Only looper; never does the gates' work.** `/fulldev` invokes `/develop`, `/tests`, `/review`,
  `/qa` and reads their verdicts. It never edits the source, the tests, or the review/qa output — a
  red gate is routed back to `/develop`, which owns every fix.
- **Loop control is deterministic.** The next action and the terminal verdict come from
  `scripts/fulldev-state.mjs` — not from improvisation. Always `step` after each action and obey the
  returned `action`/`status`.
- **`fulldev.mode` overrides the sub-skills.** The resolved mode is passed as `--mode` to each
  invoked skill. `gate` makes every sub-skill stop at its own gate; `autonomous` runs straight
  through.
- **qa only after tests + review are green.** Booting the app is costly; never validate live a diff
  already rejected by tests or review (the state machine enforces this).
- **Never merge / approve / `--force` / new PR.** The chain ends with a **draft** PR/MR ready for a
  human; the merge is out of palette scope.
- **No token anywhere** — auth is the `gh`/`glab` keychain or the provider token in `.env`
  (gitignored). Tokens never enter `snap.config.json` or `.mcp.json` (D-033).
- Idempotent: re-running re-detects the entry (an existing PR → restart at the gates), overwrites
  the scratch/report, and updates the ticket comment in place.
- Scratch lives under `.snap/tmp/` (gitignored). Only the small verdict contracts cross between
  stages; diffs, suites, run logs, and evidence stay inside each sub-skill's isolated context.
- This skill orchestrates but spawns no gate work of its own beyond `snap-digest`/`snap-loader`
  (for the CA) and the sub-skills; the sub-skills spawn their own agents.
