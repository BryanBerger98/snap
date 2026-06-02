# tests-pipeline

Shared reference for the tests-side agents (`snap-tester`, `snap-test-triage`) and the orchestrating skill (`/snap:tests`). Implements decisions **D-027 / D-029 / D-037 / D-039**. `plan/plan-tests-specs.md` is the planning source; this ships with the plugin.

---

## The one rule

`/tests` takes a **change** (local diff or PR/MR) **or a ticket's acceptance criteria** and **writes tests, runs the suite, and loops to green** — fixing only tests, never source. The skill holds a **deterministic core** (target resolution, diff/CA acquisition, suite run, synthesis, delivery) and delegates the judgment I/O (writing tests, failure triage) to **agent-adapters**. `/tests` is not read-only: it always writes test files. It never modifies source. Only the **small JSON contracts cross between stages** — test code, diffs, and suite logs stay inside each agent's isolated context.

---

## Pipeline (8 stages)

```
/snap:tests [<TICKET-ID> | <PR#/MR!>] [--base <branch>] [--levels u,i,e] [--mode gate|autonomous]

0 resolution   [skill]   parse arg (ticket | PR/MR | none) + --base + --levels + --mode
                         host ← providers.repository (config | git remote)
                         levels ← --levels > tests.levels (config)
                         mode  ← --mode > tests.mode > develop.mode > gate
                         maxIterations ← tests.maxIterations (default 3)

1 target       [skill]   no arg      → local git diff (source=change) : base = --base >
                           default branch > merge-base ; head = working tree/HEAD
                         <PR#/MR!>   → gh pr diff / glab mr diff      (mode=pr, source=change)
                         <TICKET-ID> → ticket's acceptance criteria    (source=ca, code=context)
                         → tests-target.json

2 (opt) digest [Haiku]   if ticket in scope → snap-digest → work-brief.json
                           (acceptance criteria = source of the tests)

3 explore      [Haiku]   snap-explorer → codebase-map.json
                           (lang, frameworks, testRunner, test dir, conventions, E2E harness)

4 [gate]       [skill]   build test plan (template test-plan.md : per CA / file × level)
                         mode=gate → present plan + STOP (AskUserQuestion)
                         mode=autonomous → continue immediately

5 fan-out ∥ :  [skill]   spawn one snap-tester per active level in one message:
   snap-tester (level=unit)        [Sonnet]  → tests-unit.json + test files
   snap-tester (level=integration) [Sonnet]  → tests-integration.json + test files
   snap-tester (level=e2e)         [Sonnet]  → tests-e2e.json + test files

6 run+loop     [skill]   run suite (Bash, deterministic) via codebase-map.tests.cmd
                         green → stage 7
                         red   → snap-test-triage [Sonnet] → triage.json
                           test-bug   → re-spawn snap-tester (fix mode) for that level
                                        → re-run ; bounded by maxIterations
                           source-bug → exit loop ; never edit source ; carry to verdict
                         on iteration exhaustion with remaining test-bugs:
                           → mark as test debt (log(), no silent truncation)
                           → does not affect verdict

7 synthesis +  [skill]   merge CA coverage + suite stats + verdict → tests-report.json
  delivery               mode=local → test files in working tree + report (.snap/tmp/tests-report-<id>.md)
                         mode=pr    → commit (template commit-message.txt) + push PR branch
                         (always)   conversation summary (levels/CA table + verdict)
```

`mode` gates **only the write step** (stage 4); the run+loop always follows. Mode resolution: run arg `--mode` > `tests.mode` > `develop.mode` > `gate`. All scratch lives under `.snap/tmp/`.

> **`snap-loader` is REMOTE-ONLY (D-029).** It runs only to load a remote **ticket** (when `providers.tickets` is remote) for the digest's acceptance context — one provider + one domain per call. The code target (the repository) ALWAYS goes through `git` / `gh` / `glab`, never through the loader.

---

## Scratch contracts (`.snap/tmp/`, gitignored)

`.snap/` is already gitignored. Each file has exactly one producer and a fixed shape; **field names are the contract**.

### `tests-target.json` — skill, stage 1

```json
{
  "mode": "local|pr",
  "source": "ca|change",
  "host": "github|gitlab|null",
  "base": "main",
  "head": "HEAD",
  "ticket": "STORY-003|null",
  "pr": { "number": 42, "url": "https://…" },
  "levels": ["unit", "integration", "e2e"],
  "changed": [
    { "path": "src/auth/login.ts", "status": "M|A|D" }
  ],
  "diffCmd": "git diff main...HEAD | gh pr diff 42 | glab mr diff 7"
}
```

### `tests-<level>.json` — snap-tester (one per level), stage 5

```json
{
  "level": "unit|integration|e2e",
  "runner": "vitest|jest|pytest|playwright|…",
  "files": [
    {
      "path": "tests/auth/login.spec.ts",
      "op": "created|updated",
      "covers": ["CA-1", "CA-3"],
      "cases": 4
    }
  ],
  "uncovered": [
    { "ca": "CA-2", "reason": "needs running backend, e2e disabled" }
  ]
}
```

### `triage.json` — snap-test-triage, stage 6 (on red)

```json
{
  "failures": [
    {
      "test": "login rejects expired token",
      "file": "tests/auth/login.spec.ts",
      "ca": "CA-1",
      "kind": "test-bug|source-bug",
      "detail": "…",
      "fixSuggestion": "…"
    }
  ],
  "counts": { "test-bug": 1, "source-bug": 2 }
}
```

### `tests-report.json` — skill, stage 7 synthesis

```json
{
  "target": { "mode": "pr", "source": "ca", "ticket": "STORY-003", "pr": { "number": 42 } },
  "levels": ["unit", "integration"],
  "coverage": [
    { "ca": "CA-1", "covered": true, "tests": ["tests/auth/login.spec.ts"] }
  ],
  "suite": { "total": 24, "passed": 22, "failed": 2, "iterations": 2, "cmd": "vitest run" },
  "failures": [
    { "test": "…", "ca": "CA-2", "kind": "source-bug", "detail": "…" }
  ],
  "verdict": "passed|tests-failed",
  "delivered": { "channel": "working-tree|pr-branch|report-file", "ref": "…" }
}
```

**Reused contracts** — `work-brief.json` (snap-digest, CA), `codebase-map.json` (snap-explorer, runner/dir/cmd), `state.json` (snap-loader, remote ticket only).

---

## Verdict & coverage model

Coverage is measured against **acceptance criteria, not lines**. Each CA in scope must have at least one test that covers it (`coverage[].covered = true`). Line coverage (thresholds, percentages) is **out of scope for v1**.

**Verdict rule:**

| Verdict | Condition |
|---|---|
| `passed` | Suite is green **and** every in-scope CA has at least one covering test |
| `tests-failed` | ≥1 failure classified `source-bug` (the code does not satisfy a CA), **or** an in-scope CA cannot be covered without a source change |

`tests-failed` is symmetric to `/review`'s `changes-requested` — it is the signal that routes the `/fulldev` loop back to `/develop`.

**test-bug failures never enter the verdict.** They are fixed in the loop (re-spawn + re-run) or, if maxIterations is exhausted, listed as test debt. Test debt does not invalidate the verdict and does not block `passed`.

---

## Write+run+green loop

1. After the write step (stage 5), the skill runs the suite via `codebase-map.tests.cmd`, filtered to the active levels and the written files when the runner supports it.
2. **Green** → proceed to stage 7 (synthesis).
3. **Red** → invoke `snap-test-triage`, which classifies each failure:
   - `test-bug` → re-spawn `snap-tester` in fix mode for the affected level, passing `triage.json` as context; re-run the suite. Each re-run counts as one iteration. Bounded by `tests.maxIterations` (default **3**).
   - `source-bug` → exit the loop immediately; the failure is carried forward to the verdict. **Never edit source.**
4. On iteration exhaustion with remaining `test-bug` failures: mark them as **test debt** in `tests-report.json`, `log()` that the cap was reached — no silent truncation. Test debt does not affect the `passed`/`tests-failed` verdict.

---

## Safety invariants (non-negotiable)

- **Write test files only, NEVER source.** The loop fixes only tests; source is immutable throughout.
- **Never commit on the default branch.** Test commits go to the existing PR branch (`mode=pr`) only.
- **Never `git push --force`.**
- **Never open a new PR/MR, perform a merge, or post an approval.** `mode=pr` commits and pushes test files onto the existing PR branch only; `mode=local` leaves tests in the working tree (the user commits).
- **No credential in config.** Token never in `snap.config.json` or `.mcp.json` (D-033); auth is the CLI keychain or `.env`.
- **Context isolation.** Test code, diffs, and suite logs stay inside each agent's context; only the small JSON contracts cross stage boundaries.
- **Scratch is local and gitignored.** `.snap/tmp/` is never committed or pushed.

---

## /fulldev contract

`/tests` exposes `tests-report.json.verdict`. In the `/fulldev` chain (`develop → tests → review → qa`), a `tests-failed` verdict routes back to `/develop` with `failures` and `triage` as input context. `/tests` itself does not orchestrate the loop — it produces the verdict and stops.

---

## Per-provider recipe (progressive disclosure)

See `reference/tests-repo.md` for host-specific commands: `gh`/`glab` diff fetch, PR/MR metadata, and the `pr` mode commit+push flow for each provider.

For the optional remote ticket load on the digest context path (stage 2), the loader follows `reference/remote-architecture.md` and the matching `reference/persist-<provider>.md` (e.g. `persist-notion.md`, `persist-jira.md`).
