# qa-pipeline

Shared reference for the qa-side agent (`snap-qa-validator`) and the orchestrating skill (`/snap:qa`). Implements decisions **D-027 / D-029 / D-037 / D-040**. `plan/plan-qa-specs.md` is the planning source; this ships with the plugin.

---

## The one rule

`/qa` takes a **ticket's acceptance criteria**, **runs the real app** (reuses a provided URL or boots one — test/staging only, never prod), **exercises each CA live** on the running product, and emits a **binary verdict** (`accepted`/`rejected`). The skill holds a **deterministic core** (target resolution, CA digest, app lifecycle — boot/readiness/teardown, verdict synthesis, delivery) and delegates the live exercising to **surface-typed agent-adapters**. `/qa` NEVER edits source — its only writes are a ticket comment + optional state transition, evidence files, and scratch contracts. Only the **small JSON contracts cross between stages** — run logs, screenshots, HTTP dumps, and CLI output stay inside each agent's isolated context (and under `.snap/tmp/qa-evidence/`).

---

## Pipeline (11 stages)

```
/snap:qa [<TICKET-ID> | <PR#/MR!>] [--base-url <url>] [--surfaces web,api,cli] [--mode gate|autonomous]

0 resolution   [skill]  parse arg (ticket | PR/MR | none) + --base-url + --surfaces + --mode ;
                        host     ← providers.repository (config | detected git remote) ;
                        surfaces ← --surfaces > qa.surfaces (config) > web,api,cli ;
                        mode     ← --mode > qa.mode > develop.mode > gate ;
                        env      ← --base-url provided ? reuse : boot (qa.run | codebase-map)

1 target       [skill]  <TICKET-ID> → CA from ticket (acceptance criteria = ground truth)
                        no arg      → infer ticket (develop manifest, current branch/PR)
                        <PR#/MR!>   → linked ticket
                        → qa-target.json ; ABORT if no ticket/CA (nothing to validate)

2 digest       [Haiku]  snap-digest (+ snap-loader if remote ticket, D-029) → work-brief.json
                          (acceptance criteria = the validation baseline)

3 explore      [Haiku]  snap-explorer → codebase-map.json
                          (stack, run command, port/health, detected surfaces web/api/cli)

4 [gate]       [skill]  build QA PLAN (template qa-plan.md : per CA → surface, how exercised,
                        env/run command) ; mode=gate → present plan + STOP BEFORE boot ;
                        mode=autonomous → continue immediately

5 env up       [skill]  --base-url provided → reuse running instance ;
                        else → boot (Bash background) via qa.run.cmd | codebase-map ;
                        wait readiness (port/health) ; ⚠ test/staging profile — NEVER prod

6 fan-out ∥ :  [skill]  spawn one snap-qa-validator per active surface in one message:
   snap-qa-validator (surface=web) [Sonnet] → qa-web.json + evidence (sequential on its CA)
   snap-qa-validator (surface=api) [Sonnet] → qa-api.json + evidence (sequential on its CA)
   snap-qa-validator (surface=cli) [Sonnet] → qa-cli.json + evidence (sequential on its CA)

7 env down     [skill]  teardown IF QA booted the instance ; leave a provided URL running ;
                        ALWAYS executed, even on exercise error (try/finally)

8 verdict      [skill]  merge per-CA matrix from all surfaces → qa-report.json ;
                        any CA partial/unmet in scope → verdict=rejected ; else accepted

9 delivery     [skill]  report .snap/tmp/qa-report-<id>.md (template qa-report.md) +
                        ticket transition (comment qa-comment.md + state if mapped) via
                        persist-<provider> ; NEVER source

10 report      [skill]  conversation summary (CA matrix + verdict) + /fulldev loopback note
```

`mode` gates **only the app boot** (stage 4, before any side effects); the exercise and verdict always follow. Mode resolution: `--mode` > `qa.mode` > `develop.mode` > `gate`. All scratch lives under `.snap/tmp/`.

> **`snap-loader` is REMOTE-ONLY (D-029).** It runs only to load a remote **ticket** (when `providers.tickets` is remote) to feed the CA digest — one provider + one domain per call. The code target (repository, PR) ALWAYS goes through `git` / `gh` / `glab`, never through the loader.

> **The running app is the instrument, not an agent.** Boot, readiness, and teardown are **deterministic** — executed by the **skill** (Bash background). Validators only exercise the live instance via their surface (agent-browser / curl / CLI invocation).

---

## Scratch contracts (`.snap/tmp/`, gitignored)

`.snap/` is already gitignored. Each file has exactly one producer and a fixed shape; **field names are the contract**.

### `qa-target.json` — skill, stage 1

```json
{
  "host": "github|gitlab|null",
  "ticket": "STORY-003",
  "pr": { "number": 42, "url": "https://…" },
  "surfaces": ["web", "api", "cli"],
  "env": { "mode": "provided|boot", "baseUrl": "http://localhost:3000",
           "runCmd": "npm run dev:test", "readyWhen": "/health", "teardown": "auto|<cmd>" },
  "criteria": [ { "id": "CA-1", "surface": "web", "statement": "…" } ]
}
```

### `qa-<surface>.json` — snap-qa-validator (one per surface), stage 6

```json
{
  "surface": "web|api|cli",
  "results": [
    {
      "ca": "CA-1",
      "outcome": "met|partial|unmet",
      "steps": "navigate /login → submit bad creds → expect error toast",
      "observed": "error toast 'Invalid credentials' shown, stays on /login",
      "evidence": ".snap/tmp/qa-evidence/CA-1-web.txt",
      "detail": "…"
    }
  ],
  "notExercised": [ { "ca": "CA-4", "reason": "no UI surface for this criterion" } ]
}
```

### `qa-report.json` — skill, stage 8 synthesis

```json
{
  "target": { "ticket": "STORY-003", "pr": { "number": 42 }, "surfaces": ["web", "api"] },
  "env": { "mode": "boot", "baseUrl": "http://localhost:3000" },
  "matrix": [
    { "ca": "CA-1", "surface": "web", "outcome": "met", "evidence": ".snap/tmp/qa-evidence/CA-1-web.txt" }
  ],
  "verdict": "accepted|rejected",
  "rejected": [ { "ca": "CA-2", "surface": "api", "outcome": "unmet", "detail": "…" } ],
  "delivered": { "channel": "report-file|ticket-comment|ticket-transition", "ref": "…" }
}
```

**Reused contracts** — `work-brief.json` (snap-digest, CA), `codebase-map.json` (snap-explorer, run command/surfaces), `state.json` (snap-loader, remote ticket only). Raw evidence (screenshots, HTTP dumps, CLI output) lives under `.snap/tmp/qa-evidence/` — never inside the JSON contracts.

---

## Verdict & coverage model

Coverage is measured against **acceptance criteria, observed live** — each CA in scope receives an `outcome` (`met`/`partial`/`unmet`) proven by a real exercise on the running app.

**Verdict rule:**

| Verdict | Condition |
|---|---|
| `accepted` | All in-scope CA are `met` |
| `rejected` | ≥1 CA is `partial` or `unmet` (the product does not satisfy a criterion) |

`rejected` is symmetric to `/review`'s `changes-requested` and `/tests`'s `tests-failed` — it is the signal that routes the `/fulldev` loop back to `/develop` with the rejected matrix as input context.

A `notExercised` CA (no surface could cover it, e.g. a non-observable criterion) is **surfaced explicitly** — no silent truncation. It does not count as `met`; if it is in scope and required, it weighs as `unmet` and drives the verdict to `rejected`.

There is **no triage loop** (unlike `/tests`): the verdict is binary. A CA is satisfied or it is not. `snap-qa-validator` never re-runs or retries; the skill is the sole orchestrator and produces the verdict in one pass.

---

## Environment lifecycle

Choice D-040: **auto — reuse URL if provided, else boot**.

1. **`--base-url` provided (or `qa.run.url` set)** → `env.mode = provided`. QA reuses the running instance. **No boot, no teardown** (the user owns the lifecycle).
2. **Otherwise** → `env.mode = boot`. The skill starts the app in **Bash background** via, in order: `qa.run.cmd` (config) > the command detected by `snap-explorer` (`codebase-map`). It waits for **readiness**: `qa.run.readyWhen` (health path → poll HTTP 200) or open port, with a reasonable time cap. Readiness failure → clean abort (no blind exercising).
3. **Teardown** (stage 7): only if QA booted (`env.mode = boot`). Kills the process group or runs `qa.run.teardown` if provided. **Always** executed, even on exercise error (`try/finally`). A user-provided instance is left running.
4. **⚠ Never prod.** QA requires a **test/staging** profile: rejects a `baseUrl` pointing to a production domain; boots with a test env (ephemeral/disposable DB). See `reference/qa-runtime.md` for the host/stack recipe.

---

## Safety invariants (non-negotiable)

- **Never edit source.** `/qa` is read-only with respect to the codebase; its only writes are the tracker comment + optional state transition, evidence files, and scratch.
- **Never run against production.** Test/staging profile only; disposable DB. A prod-pointing `baseUrl` is rejected outright.
- **Skill owns app lifecycle.** If QA booted the instance, it tears it down — always, even on error. A provided instance is left running exactly as found.
- **One pass, no `qa.maxIterations`.** QA validates once; re-validation after fixes belongs to `/fulldev`.
- **Only two tracker writes.** A QA comment (structured verdict + CA matrix) and, if a transition mapping exists, a state transition. Never a new PR/merge/approve/`--force`; never the default branch.
- **No credential in config.** Token never in `snap.config.json` or `.mcp.json` (D-033); auth is the CLI keychain or `.env`.
- **Scratch and evidence are gitignored.** `.snap/tmp/` (contracts) and `.snap/tmp/qa-evidence/` (raw evidence) are never committed or pushed.
- **Context isolation.** Only small JSON contracts cross stage boundaries; run logs, screenshots, HTTP dumps, and CLI output stay inside each agent's isolated context.

---

## /fulldev contract

`/qa` exposes `qa-report.json.verdict`. In the `/fulldev` chain (`develop → tests → review → qa`), a `rejected` verdict routes back to `/develop` with the `rejected` matrix as input context — listing each unmet/partial CA, its surface, and the observed detail. `/qa` produces the verdict and stops; it does not orchestrate the loop.

| Signal | Source | Routes to |
|---|---|---|
| `accepted` | `qa-report.json` | end of chain |
| `rejected` | `qa-report.json` | `/develop` (with `rejected[]` matrix) |

---

## Per-provider recipe (progressive disclosure)

See `reference/qa-runtime.md` for the app boot/readiness/teardown recipe per stack (web dev server, `docker compose`, API binary) and the ticket-transition commands per provider (comment + state mapping for `repository`, `github-projects`, and `jira`).

For the optional remote ticket load on the digest context path (stage 2), the loader follows `reference/remote-architecture.md` and the matching `reference/persist-<provider>.md` (e.g. `persist-notion.md`, `persist-jira.md`).
