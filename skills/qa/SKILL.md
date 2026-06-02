---
name: qa
description: >
  Validate that a ticket's acceptance criteria are actually met by the delivered product —
  by running the real app and exercising each criterion live. Resolves the target (a TICKET-ID;
  no arg → the ticket of the current branch/PR; a PR/MR number → the linked ticket), digests its
  acceptance criteria, maps how to run the app, plans the exercise (optional gate), boots or
  reuses a running instance (test/staging only — never prod), fans out one validator per surface
  (web/api/cli) that exercises its criteria sequentially, tears down what it booted, then emits a
  binary verdict (accepted | rejected) with a per-criterion evidence matrix and transitions the
  ticket. Never edits the source. Invoked as /snap:qa.
argument-hint: "[<TICKET-ID> | <PR#/MR!>] [--base-url <url>] [--surfaces web,api,cli] [--mode gate|autonomous]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, AskUserQuestion, Task, Bash(git *), Bash(gh *), Bash(glab *), Bash(node *), Bash(curl *)
---

# /qa — Validate the acceptance criteria against the running product

Take a ticket, **run the real app**, and **exercise each acceptance criterion (CA) live** to
judge whether the delivered product actually satisfies it — then emit a **binary verdict**
(`accepted` | `rejected`) with a per-CA evidence matrix. The exercise is split across
surface-typed subagents (D-040); this skill **orchestrates** them, owns the app's lifecycle
deterministically (boot / readiness / teardown), and holds the synthesis. The runtime + ticket
recipes live in `reference/qa-runtime.md`; the contract between stages lives in
`reference/qa-pipeline.md`. This is the **last quality** skill of the palette and the final gate
of `/fulldev` (`develop → tests → review → qa`): a `rejected` verdict drives the loop back to
`/develop`.

Distinct from its neighbours: `/tests` **writes/runs** the tests (truth = tests). `/review`
reviews the code. `/qa` **exercises the delivered product** against the CA — the truth is the
**real behavior observed** on the running app.

The argument is read in prose: the first token is a `TICKET-ID` (e.g. `STORY-003`), a PR/MR number
(`42`, `#42`, `!7`), or absent; optional `--base-url <url>`, `--surfaces web,api,cli`, and
`--mode gate|autonomous`.

## Algorithm

### 0. Resolve the run
- **host** — `providers.repository` (`github`/`gitlab`). If `null`, detect it from
  `git remote get-url origin` (see `reference/qa-runtime.md`). The host is only needed for the
  PR/MR and ticket-transition paths.
- **surfaces** — run arg `--surfaces` (CSV `web,api,cli`) > `qa.surfaces` (config) > all three.
- **mode** — run arg `--mode` > `qa.mode` > `develop.mode` > `gate`. Gates **only** the app boot
  (stage 4), because running the app has side effects.
- **env** — `--base-url` (or `qa.run.url`) → reuse a running instance (`env.mode = provided`);
  otherwise boot it (`env.mode = boot`) from `qa.run.cmd` > the command detected by
  `snap-explorer`. Never resolve to a production URL — abort if it looks like prod.

### 1. Resolve the target
- **TICKET-ID** → the ticket's acceptance criteria are the yardstick.
- **no argument** → infer the ticket from the current branch / open PR (the `/develop` manifest,
  else `gh/glab … list --search <branch>`). If none can be inferred, ask for a `TICKET-ID`.
- **PR/MR number** → the ticket it links (manifest, else the PR/MR body/branch).
- Resolve the ticket source by provider (D-029, stage 2). If the ticket has a PR/MR, record it for
  context. Write `.snap/tmp/qa-target.json` (host, ticket, pr, surfaces, env, criteria).
  **Abort with a clear message if there is no ticket / no acceptance criteria** — there is nothing
  to validate.

### 2. Digest the acceptance criteria
Resolve the ticket source by provider:
- `providers.tickets = repository` → the local ticket file under `ticketsPath` (+ linked
  FEAT/PER product files under `docsPath`). **No loader.**
- `providers.tickets` is remote → spawn `snap-loader` (`provider=<tickets> domain=tickets`)
  → `.snap/tmp/state.json`.

Then spawn **`snap-digest`** → `.snap/tmp/work-brief.json` — its **acceptance criteria are the
yardstick** of the validation. Each CA gets an id (e.g. `CA-1`). Abort if no CA can be extracted.

### 3. Map the codebase (how to run + which surfaces)
Spawn **`snap-explorer`** → `.snap/tmp/codebase-map.json` — the stack, the **run command** for the
app (dev server / compose / API binary), the port / health endpoint, and which **surfaces**
(web / HTTP API / CLI) the product exposes. The boot and the per-surface validators follow this map.

### 4. Plan the exercise — boot gate (mode)
Route each in-scope CA to a **surface** and build the **QA plan** from the frozen template
`skills/qa/templates/qa-plan.md`, filling its `{{placeholders}}` from `qa-target.json` +
`work-brief.json` (CA) + `codebase-map.json` (run/surfaces): which CA, on which surface, how it
will be exercised, with which env / run command. Record the routing back into `qa-target.json`
(`criteria[].surface`).
- `mode = gate` → present the plan and **STOP** for approval (AskUserQuestion) **before booting the
  app** — running it has side effects. Apply any adjustments first.
- `mode = autonomous` → continue without stopping.

### 5. Bring the environment up
Deterministically, via Bash (see `reference/qa-runtime.md`):
- `env.mode = provided` → confirm the running instance answers (poll `readyWhen`/port). **Do not
  boot, do not later tear down.**
- `env.mode = boot` → start the app in the **background** (test/staging profile, ephemeral DB),
  wait for **readiness** (`qa.run.readyWhen` health path → HTTP 200, or the port to open) within a
  sane timeout. On readiness failure → abort cleanly (never exercise blind). **Never boot against
  production.** Record the resolved base URL into `qa-target.json`.

### 6. Fan-out the validators (parallel by surface)
In a **single message**, spawn one **`snap-qa-validator`** per active surface, each reading
`qa-target.json` + `work-brief.json` + `codebase-map.json` and the base URL, exercising **its
surface's CA sequentially** against the live instance (web → agent-browser; api → `curl`;
cli → the binary), capturing evidence under `.snap/tmp/qa-evidence/`, and writing a per-surface
contract:
- surface `web` → `.snap/tmp/qa-web.json`
- surface `api` → `.snap/tmp/qa-api.json`
- surface `cli` → `.snap/tmp/qa-cli.json`
Each judges every assigned CA `met` / `partial` / `unmet` with cited evidence, and lists any CA it
could **not** exercise (a gap — never guessed as met). Run logs, screenshots, and HTTP/CLI dumps
stay in the validator's context (and the evidence dir); only the JSON contract returns.

### 7. Bring the environment down
If `env.mode = boot`, **tear down** the instance (kill the process group, or run `qa.run.teardown`).
A user-provided instance is **left running**. This step **always** runs — even if the exercise
errored (`try/finally`-style): never leave a booted app dangling.

### 8. Synthesize the verdict
Merge the per-surface results into a per-CA matrix in `.snap/tmp/qa-report.json`. Compute
`verdict = rejected` if **any** in-scope CA is `partial` or `unmet` (incl. a required CA that no
surface could exercise); else `accepted`. Every CA carries its `outcome`, `surface`, and an
evidence pointer.

### 9. Deliver
- Always write the report from `skills/qa/templates/qa-report.md` to
  `.snap/tmp/qa-report-<id>.md`.
- **Transition the ticket** (never the source): post the structured QA comment from
  `skills/qa/templates/qa-comment.md` to the ticket via `persist-<provider>`, and **transition its
  state only if a mapping exists** (`qa.transitions` or the provider default) — otherwise comment
  only (never guess a column/status). See `reference/qa-runtime.md`.

### 10. Report
Summarize: target (ticket + linked PR/MR), surfaces run, the **CA matrix** (per-criterion
met/partial/unmet with evidence), the **verdict**, the env used (provided/booted), the delivery
channel (report + ticket), and any not-exercised CA. State plainly that a `rejected` verdict means
the product does not satisfy a criterion (the `/fulldev` loop sends it back to `/develop`).

## Rules
- **Never touches the source.** `/qa` only writes: the scratch JSON, the evidence files, the report,
  and the ticket (comment + state transition). It never edits, creates, or deletes a source file —
  a failing CA is a `rejected` verdict, not a patch (the `/develop` frontier, by design).
- **Never against production.** QA runs the app on a **test/staging** profile with a disposable DB;
  it refuses a production base URL and never boots a prod env.
- **Owns the app lifecycle deterministically.** Boot, readiness, and teardown are done by this skill
  via Bash — not by an agent. Teardown always runs for an instance QA booted; a user-provided
  instance is left running.
- **Verdict = acceptance criteria, observed live.** Each in-scope CA gets a real-exercise outcome;
  there is no line coverage and no internal re-validation loop (one pass — the retry loop belongs to
  `/fulldev`, so there is no `qa.maxIterations`).
- Idempotent: re-running re-exercises and overwrites the scratch/report; the ticket comment is
  updated/appended, never duplicated; the state transition is a no-op if already in the target state.
- Never `git push --force`, never open a new PR/MR, never merge, never approve. The only tracker
  writes are a QA comment and (if mapped) a state transition.
- No token anywhere — auth is the `gh`/`glab` keychain or the provider token in `.env` (gitignored).
  Tokens never enter `snap.config.json` or `.mcp.json` (D-033).
- Scratch + evidence live under `.snap/tmp/` (gitignored). Run logs, screenshots, and dumps stay in
  the subagents' context; only the small JSON contracts cross between stages.
- A subagent does not spawn subagents; this skill is the only orchestrator, the only runner of the
  app, and the only writer of the verdict.
