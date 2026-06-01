# review-pipeline

Shared reference for the review-side agents (`snap-reviewer-correctness`, `snap-reviewer-security`, `snap-reviewer-conventions`, `snap-reviewer-quality`, `snap-fixer`) and the skill that orchestrates them (`/snap:review`). Implements decisions **D-027 / D-029 / D-037 / D-038**. `plan/plan-review-specs.md` is the planning source; this ships with the plugin.

---

## The one rule

`/review` takes a **change** — a local diff OR a PR/MR — and produces **severity-classed findings**: never a merge, never an auto-approval. The skill holds a **deterministic core** (target resolution, diff acquisition, synthesis, delivery) and delegates the judgment I/O (per-dimension review, fixes) to **agent-adapters**. Read-only by default; only the `--fix` run argument writes (working tree on the `local` path, the PR branch on the `pr` path). Only the **small JSON contracts cross between stages** — diffs and file contents stay inside each agent's isolated context.

---

## Pipeline (6 stages)

```
/snap:review [<TICKET-ID> | <PR#/MR!>] [--base <branch>] [--fix] [--mode gate|autonomous]

0 resolution   [skill]   host ← providers.repository (config | git remote)
                         dimensions ← review.dimensions ; flags --base/--fix/--mode

1 target       [skill]   no arg      → local git diff (base = --base > default branch > merge-base)
                         <PR#/MR!>   → gh pr diff / glab mr diff      (mode=pr)
                         <TICKET-ID> → linked PR/MR (/develop manifest, else gh/glab … list --search)
                         → review-target.json

2 (opt) digest [Haiku]   if a ticket is in scope → snap-digest → work-brief.json (acceptance = lens)

3 fan-out ∥ :  [skill]   spawn the enabled reviewers in one message:
   snap-reviewer-correctness [Opus]    bugs, logic, edge cases     → findings-correctness.json
   snap-reviewer-security    [Sonnet]  vulns, secrets, injection   → findings-security.json
   snap-reviewer-conventions [Haiku]   style, naming, conventions  → findings-conventions.json
   snap-reviewer-quality     [Sonnet]  reuse, simplification       → findings-quality.json

4 synthesis    [skill]   merge + dedupe (file:line+title) + severity sort + verdict
                         → review-report.json

5 delivery     [skill]   mode=pr    → inline gh/glab comments + summary comment
                         mode=local → .snap/tmp/review-<id>.md report
                         (always)   conversation summary (table by severity + verdict)

6 (opt) --fix  [skill]   present fixable findings → approval gate (AskUserQuestion;
                         --mode autonomous skips) → snap-fixer → fix-manifest.json
```

`mode` here gates ONLY `--fix` (review itself is read-only; there is no stop before findings are delivered). `mode` resolution: run arg `--mode` > config `review.mode` (absent → reuse `develop.mode`) > `gate`. All scratch lives under `.snap/tmp/`.

> **`snap-loader` is REMOTE-ONLY (D-029).** It runs only to load a remote **ticket** (when `providers.tickets` is remote) for the digest's acceptance context — one provider + one domain per call. The diff target (the repository) ALWAYS goes through `git` / `gh` / `glab`, never through the loader.

---

## Scratch contracts (`.snap/tmp/`, gitignored)

`.snap/` is already gitignored. Each file has exactly one producer and a fixed shape; **field names are the contract**.

### `review-target.json` — skill, stage 1

```json
{
  "mode": "local|pr",
  "host": "github|gitlab|null",
  "base": "main",
  "head": "HEAD",
  "ticket": "STORY-003|null",
  "pr": { "number": 42, "url": "https://…" },
  "changed": [
    { "path": "src/auth/login.ts", "status": "M|A|D", "additions": 12, "deletions": 3 }
  ],
  "diffCmd": "git diff main...HEAD | gh pr diff 42 | glab mr diff 7"
}
```

### `findings-<dim>.json` — each reviewer, stage 3

```json
{
  "dimension": "correctness|security|conventions|quality",
  "findings": [
    {
      "severity": "blocker|major|minor|nit",
      "file": "src/auth/login.ts",
      "line": 42,
      "title": "Token expiry off-by-one",
      "detail": "…",
      "suggestion": "…",
      "fixable": true
    }
  ]
}
```

### `review-report.json` — skill, stage 4 synthesis

```json
{
  "target": { "mode": "pr", "ticket": "STORY-003", "pr": { "number": 42 } },
  "summary": { "blocker": 1, "major": 2, "minor": 4, "nit": 3 },
  "verdict": "changes-requested|approve",
  "findings": [ /* merged, deduped, severity-sorted */ ],
  "delivered": {
    "channel": "pr-comments|report-file",
    "ref": "https://…|.snap/tmp/review-STORY-003.md"
  }
}
```

### `fix-manifest.json` — snap-fixer, `--fix` only (stage 6)

```json
{
  "applied": [ { "file": "…", "finding": "…" } ],
  "skipped": [ { "finding": "…", "reason": "…" } ],
  "commits": ["<sha> fix(auth): … (STORY-003)"],
  "op": "applied|none|error"
}
```

**Reused contracts** — `work-brief.json` is the snap-digest output (ticket essentials + acceptance criteria), reused from the develop pipeline as the review lens when a ticket is in scope. `state.json` is written only when a remote ticket is loaded via snap-loader (same shape as the remote-backend chain).

---

## Severity model & verdict

| Severity   | Meaning                                                                         |
| ---------- | ------------------------------------------------------------------------------- |
| `blocker`  | Breaks build/runtime, security hole, data loss — must be fixed before merge    |
| `major`    | Real bug / wrong behavior / significant risk — should block merge               |
| `minor`    | Smell, missed edge case, maintainability concern — worth fixing, not blocking   |
| `nit`      | Style/preference, no functional impact — reviewer discretion                   |

**Verdict rule:** `verdict = changes-requested` if there is at least one `blocker` OR `major`; otherwise `approve`. A `changes-requested` verdict is the signal that drives the `/fulldev` loop back to `/develop`.

**Synthesis:** dedupe by `file:line + title` (the same issue found by two dimensions collapses to one finding), then sort by severity descending.

---

## Mode / fix gate

`--fix` is the only writing path. When set and fixable findings exist, the skill presents them and **stops for approval** (`AskUserQuestion`); `--mode autonomous` skips the stop. `snap-fixer` then applies changes to the working tree (`local` mode) or commits and pushes to the PR branch (`pr` mode). Without `--fix`, `/review` never writes anything.

---

## Safety invariants (non-negotiable)

- Read-only by default; writing requires `--fix` to be explicitly passed.
- `--fix` writes only to the working tree (local) or the existing PR/MR branch (pr) — **never** the default branch.
- **Never** `git push --force`.
- **Never** perform a merge.
- **Never** `gh pr review --approve` / `glab mr approve` — Snap posts comments; it does not approve.
- No credential stored in config: `gh`/`glab` use keychain or environment variables; tokens never go into `snap.config.json` or `.mcp.json` (D-033).
- Context isolation: raw diffs and full file contents stay inside each reviewer agent; only the small JSON contracts cross stage boundaries.
- Scratch is local and gitignored: `.snap/tmp/` is never committed or pushed.

---

## /fulldev contract

`/review` exposes `review-report.json.verdict`. In the `/fulldev` chain (`develop → tests → review → qa`), a `changes-requested` verdict routes back to `/develop` with the merged findings as input context. `/review` itself does not orchestrate the loop — it produces the verdict and stops.

---

## Per-provider recipe (progressive disclosure)

See `reference/review-repo.md` for host-specific commands: `gh`/`glab` diff fetch, inline comment posting, summary comment format, and the `--fix` commit+push flow for each provider. The **output rendering** lives in frozen templates under `skills/review/templates/` (`inline-comment.md` / `summary-comment.md` / `report.md`); `review-repo.md → Comment templates` documents the hidden `<!-- snap:review:<file>:<line>:<slug> -->` marker that anchors cross-run idempotence — comments carry the marker, dedupe matches on it (the `file:line + title` text match is the fallback for legacy markerless comments).

For the optional remote ticket load on the digest context path, the loader follows `reference/remote-architecture.md` and the matching `reference/persist-<provider>.md` (e.g. `persist-notion.md`, `persist-jira.md`).
