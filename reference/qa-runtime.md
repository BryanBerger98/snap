# Snap — Runtime + ticket recipe (`/snap:qa`)

Progressive-disclosure reference for the skill at run time. Covers the environment lifecycle (boot-or-reuse) and writing the QA verdict back to the ticket. Implements D-018/D-029/D-033/D-037/D-040. Read alongside `reference/qa-pipeline.md`.

> **Two concerns, one file:** (A) standing up and tearing down the app under test; (B) posting the result to the tracker.

---

## The one rule (qa edition)

`/qa` **runs the real app on a test/staging profile** — reusing a provided URL or booting one — **exercises each acceptance criterion live**, then **writes the verdict back to the ticket** (a structured QA comment, plus an optional state transition if a mapping exists). It never edits source. It never runs against production.

---

## Environment lifecycle (url-or-boot)

### Reuse (provided)

`--base-url <url>` given, or `qa.run.url` set in `snap.config.json` → `env.mode = provided`.

Confirm the instance answers before exercising anything:

```bash
# health-path check (qa.run.readyWhen, e.g. "/health")
curl -fsS <baseUrl><readyWhen>          # expect HTTP 200

# or, for a plain port check
nc -z localhost <port> && echo ready
```

**No boot. No teardown.** The user owns that instance's lifecycle.

### Boot

No `--base-url` and no `qa.run.url` → `env.mode = boot`.

Start in the background using, in priority order: `qa.run.cmd` (config) › the command detected by `snap-explorer` (`codebase-map`).

Capture the process group so it can be killed cleanly:

```bash
setsid <run-cmd> &> .snap/tmp/qa-app.log &
APP_PID=$!
```

Per-stack examples:

| Stack | Typical command |
|---|---|
| Web dev server (Node) | `npm run dev:test` / `pnpm dev --mode test` |
| Full-stack (compose) | `docker compose -f docker-compose.test.yml up -d` |
| API binary / server | `./bin/server --env test --port 3001` |
| Next.js / Vite | `NEXT_PUBLIC_ENV=test next dev -p 3001` |

### Readiness

Poll until the health path returns HTTP 200 (or the port is open). Hard timeout ~60 s, interval ~3 s:

```bash
for i in $(seq 1 20); do
  curl -fsS "${BASE_URL}${READY_WHEN}" && break
  sleep 3
done || { echo "App did not become ready"; kill -- -$APP_PID 2>/dev/null; exit 1; }
```

On timeout → **abort cleanly** (kill the process group, then exit). **Never exercise a blind instance.**

### Teardown

Only for an instance QA booted (`env.mode = boot`). Always runs — even when exercise fails (`try/finally`):

```bash
# process group
kill -- -$APP_PID 2>/dev/null

# compose
docker compose -f docker-compose.test.yml down -v
```

If `qa.run.teardown` is set, run that command instead of the default kill. A **provided** instance is left running untouched.

### ⚠ NEVER production

QA requires a **test or staging profile** backed by a **disposable database**. Before any boot or exercise, check the base URL:

- If the hostname looks like a production domain (no `localhost`, `staging`, `test`, `dev`, `preview`, or `review` segment → abort with a clear message and exit non-zero.
- If booting, require a test-profile env var or compose file (`docker-compose.test.yml`, `NODE_ENV=test`, `APP_ENV=staging`, …).

This is a **hard invariant** — when in doubt, abort and ask the user.

---

## Surfaces

Each `snap-qa-validator` instance exercises one surface. Evidence is captured under `.snap/tmp/qa-evidence/`.

| Surface | Tool | How to use | Evidence captured |
|---|---|---|---|
| `web` | `agent-browser` | `snapshot` → read accessibility tree; interact via element refs (`@e1`, `@e2`). Install: `npm i -g agent-browser && agent-browser install` | Accessibility-tree snapshot, interaction trace |
| `api` | `curl` | `curl -fsS -o /dev/null -w "%{http_code}" …` — assert status code + body fragment | HTTP status + response body dump |
| `cli` | product CLI (from `codebase-map`) | invoke the command directly; assert `stdout` + exit code | stdout/stderr capture, exit code |

Only the surface tools are invoked — validators never read or write source files.

---

## Ticket transition (write the verdict back)

Reuses the `persist-<provider>` adapters. Op→command table by provider:

| Op | `repository` | `github-projects` (`gh`) | `jira` (MCP / API) |
|---|---|---|---|
| QA comment | Write into the ticket file (QA section, idempotent) | `gh issue comment <n> --body "…"` / item note | `addCommentToJiraIssue` |
| State transition | Update the `status:` field in the ticket file | `gh project item-edit … --field Status=<col>` (mapped column) | `transitionJiraIssue` (if transition is available) |
| No mapping | — | **comment only** (never guess a column) | **comment only** |

Rules:

- The **state transition is attempted only if a mapping exists** (`qa.transitions` in config, or a provider default). Otherwise `/qa` posts a comment only — it never guesses a status column or transition ID.
- **Idempotent comment:** search for an existing QA comment by the skill's signature marker before posting; update or append — never duplicate.
- A transition already in the target state is a **no-op** (not an error).
- **NEVER** merge, approve, open a PR/MR, edit issue description/title, or push anything via `--force`.

---

## Auth / secrets

Authenticate the tracker host once, before the first run:

```bash
# GitHub (tracker or code host)
gh auth login

# GitLab
glab auth login

# Jira — export in .env (gitignored)
JIRA_BASE_URL=https://acme.atlassian.net
JIRA_API_TOKEN=…
JIRA_USER_EMAIL=you@acme.com

# Notion
NOTION_TOKEN=secret_…
```

Token **never** in `snap.config.json` or `.mcp.json` (D-033). Auth lives in the CLI keychain or a gitignored `.env`. For a `repository`-provider ticket (local file), no auth is needed.

Verify silently:

```bash
gh auth status      # GitHub
glab auth status    # GitLab
```

---

## Safety invariants

The following are non-negotiable:

- **Never edit source files** — `/qa` observes; it never modifies source.
- **Never exercise against production** — test/staging profile + disposable DB only; abort on a prod-looking URL.
- **Always tear down a booted instance** — even on exercise error (`try/finally`); a provided instance is left running.
- **Only tracker writes: QA comment + optional mapped state transition** — no merge, no approve, no PR/MR creation, no `--force`.
- **Token never in `snap.config.json` / `.mcp.json`** (D-033) — CLI keychain or `.env` only.
- Scratch files and evidence under `.snap/tmp/` are **gitignored and never pushed**.

---

## Caveats

1. **Reuse mode needs no boot or teardown.** Providing `--base-url` (or `qa.run.url`) fully bypasses the boot/readiness/teardown path — the lifecycle section does not apply.
2. **Missing run command.** If no run command can be detected from the codebase and none is configured in `qa.run.cmd`, and no `--base-url` is given, `/qa` aborts before exercising — it never exercises blind.
3. **Surface-tool flags differ.** `agent-browser`, `curl`, and the product CLI each have distinct invocation conventions; always emit the form appropriate to the active surface (see the Surfaces table above).
4. **Cross-host tickets.** The ticket may live on a different provider than the code (e.g. a Jira board backed by a GitHub repo). The ticket is always loaded via `providers.tickets` (`snap-loader`); the code target is resolved from the git remote. Both channels operate independently.
5. **The never-prod check is heuristic.** It catches common production patterns in the hostname, but it cannot enumerate every production domain. When in doubt, abort and ask the user to confirm the environment is safe to exercise.
