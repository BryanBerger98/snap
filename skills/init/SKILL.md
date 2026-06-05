---
name: init
description: >
  Initialize or reconfigure the Snap project config (snap.config.json): choose the
  artifact language and the docs path, and ensure the secrets guardrails (.env.example
  + .env gitignored). Run once when adopting Snap in a repo, or to change the config
  later. Invoked as /snap:init.
argument-hint: ""
disable-model-invocation: true
allowed-tools: Read, Write, AskUserQuestion, Task, Bash(node *)
---

# /snap:init — Initialize the project config

Explicit, interactive setup of `snap.config.json` at the project root. This is the
**only** thing that sets up Snap in a repo — nothing runs on session start, so Snap
never writes config into a project that doesn't use it. Run this once when adopting
Snap, or again to reconfigure later. (Each Snap skill also self-heals a missing
config silently, but the user-chosen values come from here.)

## Algorithm

### 1. Ensure the baseline
Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/bootstrap-config.mjs" "${CLAUDE_PROJECT_DIR}"`.
This creates `snap.config.json` (defaults), `.env.example`, and guards that `.env`
is in `.gitignore` — all idempotent.

### 2. Read the current state
Read `snap.config.json`. Show the current `language` and `docsPath` so the user
sees what they're changing.

### 3. Interview (AskUserQuestion)
Ask, defaulting to the current values:
- **language** — `fr` or `en` (artifact language, D-007).
- **docsPath** — where the product docs live (default `docs/product/`). Offer the
  default + a couple of common alternatives (`docs/`, `product/`); free text via "Other".
- **doc backend** (`providers.doc`) — `repository` (default, Markdown in the repo),
  `notion`, or `affine`. Exclusive: one home per project, no mirror/sync (D-027).
- **tickets backend** (`providers.tickets`) — `repository` (default), `github-projects`,
  or `jira` (D-033).
- **code host** (`providers.repository`) — `github`, `gitlab`, or **auto** (leave `null`,
  detect from the git remote at `/snap:develop` time). Drives `/develop`'s draft PR/MR via
  the `gh`/`glab` CLI (D-037). No project to provision — `owner`/`repo` come from the remote.
- **develop mode** (`develop.mode`) — `gate` (default, stop for approval after the plan)
  or `autonomous` (run straight to a draft PR/MR). Overridable per run.
- **review dimensions** (`review.dimensions`) — which axes `/review` runs in parallel
  (default all four: `correctness`, `security`, `conventions`, `quality`). A team can
  narrow the set; `/review` is read-only unless run with `--fix` (D-038).
- **test levels** (`tests.levels`) — which levels `/tests` writes in parallel (default all
  three: `unit`, `integration`, `e2e`). Also `tests.mode` (`gate`/`autonomous`; absent →
  inherits `develop.mode`) and `tests.maxIterations` (green-loop cap, default `3`). `/tests`
  writes test files and loops to green, never touching the source (D-039).
- **qa surfaces** (`qa.surfaces`) — which surfaces `/qa` exercises in parallel (default all
  three: `web`, `api`, `cli`). Also `qa.mode` (`gate`/`autonomous`; absent → inherits
  `develop.mode`). `/qa` runs the real app on a **test/staging** profile and validates each
  acceptance criterion live, never touching the source (D-040). The run command / base URL
  (`qa.run`) is detected by `snap-explorer` or passed at run time via `--base-url` — never point
  it at production.
- **fulldev orchestration** (`fulldev`) — `fulldev.mode` (`gate`/`autonomous`, default `gate`),
  which **overrides** each sub-skill's mode when `/fulldev` chains them; `fulldev.maxCycles`
  (global budget of `/develop` passes, default `5`) and `fulldev.maxPerGate` (reds before a gate
  blocks, default `3`). `/fulldev` loops `develop → tests → review → qa` to green, never editing the
  source or merging (the draft PR is left for a human, D-041).

Keep `repository` (no secret, git history, offline) unless the user wants a remote tool.
The wireframe/design providers are set by their own skills — leave them untouched here.

### 4. Apply the config
Run, with the chosen values:
```
node "${CLAUDE_PLUGIN_ROOT}/scripts/init-config.mjs" "${CLAUDE_PROJECT_DIR}" \
  --language <fr|en> --docsPath <path> \
  --docProvider <repository|notion|affine> --ticketsProvider <repository|github-projects|jira> \
  --repoProvider <github|gitlab|auto> --developMode <gate|autonomous> \
  --reviewDimensions <correctness,security,conventions,quality> \
  --testLevels <unit,integration,e2e> --testMode <gate|autonomous> \
  --testMaxIterations <n> \
  --qaSurfaces <web,api,cli> --qaMode <gate|autonomous> \
  --fulldevMode <gate|autonomous> --fulldevMaxCycles <n> --fulldevMaxPerGate <n>
```
The script merges the values (preserving other keys) and validates the enums.

### 4-bis. Provision a remote backend (only if a remote provider was chosen)
For each class set to a remote provider, spawn the `snap-provisioner` agent (`Task`),
then persist its locators — never hand-edit `snap.config.json`:
- **`providers.doc` = notion** — ask for the **parent Notion page/workspace** to host
  the bases. The provisioner creates (idempotently) the Personas/Features/Decisions
  databases + Brief page + Roadmap view + columns incl. `snap_id` (D-032), and writes
  `.snap/tmp/remote.json`.
- **`providers.doc` = affine** — same shape, via the live `affine` MCP server: the
  provisioner creates (idempotently) the Personas/Features/Decisions collections +
  Brief doc + Roadmap index, tagging each doc `snap:<type>` / `snap:<id>` for lookup
  (see `reference/persist-affine.md`).
- **`providers.tickets` = jira / github-projects** — ask for the **existing project**
  (Jira project key / GitHub owner + project number). The provisioner **connects** to
  it (it does not create a project — D-033) and writes `.snap/tmp/remote.json`.

Merge the (non-secret) locators into the config:
```
node "${CLAUDE_PLUGIN_ROOT}/scripts/init-config.mjs" "${CLAUDE_PROJECT_DIR}" --remoteJson .snap/tmp/remote.json
```
Then remind the user to put the provider **token** in `.env` (gitignored) —
`NOTION_TOKEN`, `JIRA_API_TOKEN`, or authenticate `gh`. A token never goes into
`snap.config.json` or `.mcp.json`. Ensure `.snap/` is gitignored.

If `providers.repository` was set (`github`/`gitlab`), no provisioning runs — `owner`/`repo`
are derived from the git remote at `/snap:develop` time. Just remind the user to authenticate
the code host once: `gh auth login` (or `GITHUB_TOKEN`) / `glab auth login` (or `GITLAB_TOKEN`
in `.env`). Same rule: the token never goes into `snap.config.json` or `.mcp.json` (D-037).

### 5. Confirm
Re-read `snap.config.json`. Sanity-check it against
`${CLAUDE_PLUGIN_ROOT}/snap.config.schema.json` (required keys present, `language`
in `fr|en`, `version` = 1). If a remote provider is set, confirm the matching
`remote.*` locators are present and that the token reminder was given. Report the
final config.

### 6. Next step
Tell the user the project is ready and the next step is `/snap:define` to produce the
first artifacts (Brief → Personas → Features → Decisions).

## Rules
- Do not write `snap.config.json` by hand — go through `init-config.mjs` (deterministic
  + validated); remote locators go through `--remoteJson`.
- Never write a token anywhere. Only ensure `.env` is gitignored (via
  `bootstrap-config.mjs`); the user fills the token themselves.
- Provisioning is idempotent: re-running `/snap:init` must not duplicate Notion bases
  (the `snap-provisioner` searches before creating) and must not create a Jira/GitHub
  project (it connects to an existing one).
- Idempotent overall: re-running `/snap:init` is safe; it reports "unchanged" when
  nothing moves.
