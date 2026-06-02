# fulldev-pipeline

Shared reference for the `/snap:fulldev` orchestrator. Implements decisions **D-027 / D-037 / D-038 / D-039 / D-040 / D-041**. `plan/plan-fulldev-specs.md` is the planning source; this ships with the plugin.

---

## The one rule

`/fulldev` chains `develop → tests → review → qa` in a **bounded loop** until all gates are green or the budget is spent. It is the **only looper** of the palette; the four sub-skills are **single-pass verdict emitters**. It **invokes** them (`Skill` tool), **reads their verdicts** (scratch contracts), and feeds the deterministic loop brain `scripts/fulldev-state.mjs`. `/fulldev` NEVER edits the source or the gates — a red gate is routed back to `/develop`, which owns every fix. NEVER merges: the draft PR is left for a human. Only **small verdict contracts cross between stages** — diffs, test suites, run logs, and evidence stay inside each sub-skill's isolated context and never return to the orchestrator.

---

## Pipeline (9 stages + loop)

```
/snap:fulldev [<TICKET-ID> | <PR#/MR!>] [--mode gate|autonomous] [--max-cycles N] [--max-per-gate K] [--base-url <url>]

0 resolution   [skill]  parse arg (ticket | PR/MR | none) + --mode/--max-cycles/--max-per-gate/--base-url ;
                        mode       ← --mode > fulldev.mode > gate ;
                        maxCycles  ← --max-cycles > fulldev.maxCycles > 5 ;
                        maxPerGate ← --max-per-gate > fulldev.maxPerGate > 3 ;
                        host       ← providers.repository (config | detected git remote)

1 target       [skill]  ticket-first: <TICKET-ID> → its CA ;
                        no arg      → infer ticket (branch/PR, /develop manifest) ;
                        <PR#/MR!>   → linked ticket.
                        → work-brief.json ; ABORT if no ticket/CA (nothing to orchestrate)

2 entry        [skill]  PR/MR linked to ticket/branch exists (gh pr list --head / glab mr list --source-branch) ?
                        yes → entry=gates (diff = the existing PR — start at the gates)
                        no  → entry=develop (greenfield — build first)

3 plan [gate]  [skill]  build the PLAN (template fulldev-plan.md : ticket, detected entry,
                        gates, budget maxCycles/maxPerGate, mode) ; mode=gate → present + STOP ;
                        mode=autonomous → continue immediately

4 init state   [skill]  node fulldev-state.mjs init … → .snap/tmp/fulldev-state.json

5 LOOP :       [skill]  node fulldev-state.mjs step --did <none|develop|gates|qa> [--tests/--review/--qa V]
                        → { action, status, reason } ; while action ≠ stop :
   action=develop      → Skill /snap:develop (--mode) ; new code invalidates previously-green gates
   action=gates        → Skill /snap:tests (--mode) ∥ /snap:review (review-only, no --fix) on the diff ;
                          read tests-report.json.verdict + /review report verdict ; skip a blocked gate
   action=qa           → (tests+review green) Skill /snap:qa (--mode, --base-url) ; read qa-report.json.verdict
                        each action → step --did <action> --<gate> <verdict> → update counters/blocked/cycle

6 stop         [skill]  status ∈ { done-green, stopped-budget, stopped-blocked }

7 synthesize   [skill]  aggregate history + per-gate final status → fulldev-report.json

8 deliver      [skill]  report .snap/tmp/fulldev-report-<id>.md (template fulldev-report.md) +
                        synthesis comment on ticket (fulldev-comment.md) via persist-<provider> ;
                        PR left in draft — NEVER merge

9 report       [skill]  conversation summary : target, detected entry, cycles used, per-gate status,
                        terminal verdict, PR link
```

`mode` is **propagated** to each sub-skill (overrides their own mode) — `gate` makes every sub-skill stop at its own gate; `autonomous` runs straight through. Mode resolution: `--mode` > `fulldev.mode` > `gate`. All scratch lives under `.snap/tmp/`.

> **`/fulldev` is the only looper; sub-skills are single-pass.** It invokes each sub-skill via the `Skill` tool and reads their verdict scratch. The loop logic (when to develop / gates / qa / stop) is **deterministic** → `scripts/fulldev-state.mjs`. The orchestrator only invokes, reads a verdict, and calls `step`.

> **A `/develop` pass invalidates the gates.** New code → previously-green gates are reset to `pending` (re-evaluated next round). **Blocked** gates (cap reached) stay skipped — they are never re-run.

---

## State machine (`fulldev-state.mjs`)

Deterministic loop brain (Node ESM, no deps, `--selftest`). Reads and writes `.snap/tmp/fulldev-state.json`; prints the decision `{ action, status, reason }` on stdout for the skill to parse.

**Two CLI subcommands:**

- `node fulldev-state.mjs init --ticket T --mode gate|autonomous --max-cycles N --max-per-gate K --entry develop|gates [--state <path>]`
  → writes initial state + prints the first decision.
- `node fulldev-state.mjs step --did <none|develop|gates|qa> [--tests V] [--review V] [--qa V] [--state <path>]`
  → applies verdicts from the last round, updates state, prints the next decision.

**Verdict normalization** (tolerant):
- tests: `passed|pass|green|ok|success` → green ; `tests-failed|failed|fail|red|error` → red.
- review: `approved|clean|no-changes|nochanges` → green ; `changes-requested|rejected` → red.
- qa: `accepted|pass|green|ok|success` → green ; `rejected|failed|fail|red|error` → red.

**Transition rules** (applied after verdicts):

1. All three gates green → `done-green`, action `stop`.
2. `did=develop` (or `none` at greenfield entry) → resets non-blocked gates to `pending`, `cycle++`; if tests **and** review are both blocked → `stopped-blocked`, `stop`; otherwise action `gates`.
3. `did=gates`:
   - tests **and** review green → if qa blocked: `stopped-blocked`, `stop`; otherwise action `qa`.
   - otherwise (≥1 red) → increment red counters for red gates (blocked at `maxPerGate`); if an open gate remains **and** `cycle < maxCycles` → action `develop`; otherwise `stopped-budget` (or `stopped-blocked` if ≥1 gate blocked), `stop`.
4. `did=qa`:
   - qa green → `done-green`, `stop` (caught by the all-green check first).
   - qa red → increment qa red counter (blocked at `maxPerGate`); budget remaining → action `develop`; otherwise `stopped-budget`/`stopped-blocked`, `stop`.

`cycle` = number of `/develop` passes in the run (capped by `maxCycles`). A gate is **blocked** when its red count reaches `maxPerGate` — it is never re-run. `qa` is only reachable when both `tests` and `review` are not blocked. Terminal verdicts: `done-green`, `stopped-budget`, `stopped-blocked`.

---

## Scratch contracts (`.snap/tmp/`, gitignored)

`.snap/` is already gitignored. Each file has exactly one producer and a fixed shape; **field names are the contract**.

### `fulldev-state.json` — script (state machine), stages 4–5

```json
{
  "ticket": "STORY-003",
  "mode": "gate",
  "maxCycles": 5,
  "maxPerGate": 3,
  "entry": "develop|gates",
  "cycle": 2,
  "phase": "start|develop|gates|qa|done",
  "gates": {
    "tests":  { "red": 1, "blocked": false, "last": "pending|green|red" },
    "review": { "red": 0, "blocked": false, "last": "green" },
    "qa":     { "red": 0, "blocked": false, "last": "pending" }
  },
  "status": "running|done-green|stopped-budget|stopped-blocked",
  "history": [ { "cycle": 1, "did": "develop" },
               { "cycle": 1, "did": "gates", "verdicts": { "tests": "passed", "review": "changes-requested" } } ]
}
```

### `fulldev-report.json` — skill, stage 7 (synthesis)

```json
{
  "target": { "ticket": "STORY-003", "pr": { "number": 42, "url": "https://…" } },
  "entry": "develop|gates",
  "mode": "gate",
  "budget": { "maxCycles": 5, "maxPerGate": 3, "cyclesUsed": 3 },
  "gates": {
    "tests":  { "final": "green|red|blocked", "red": 1 },
    "review": { "final": "green", "red": 0 },
    "qa":     { "final": "green", "red": 0 }
  },
  "verdict": "done-green|stopped-budget|stopped-blocked",
  "blocked": ["tests"],
  "history": [ { "cycle": 1, "did": "develop" }, { "cycle": 1, "did": "gates", "verdicts": {} } ],
  "delivered": { "channel": "report-file|ticket-comment", "ref": "…" }
}
```

**Reused contracts** — `tests-report.json` (verdict from `/tests`), `qa-report.json` (verdict from `/qa`), the `/review` report (verdict), `work-brief.json` (acceptance criteria). `/fulldev` reads these verdicts; it never re-reads the diffs, test suites, or evidence — they stay inside each sub-skill's isolated context.

---

## Verdict & stop model

Coverage is measured against **acceptance criteria, exercised live at every gate** — each gate emits a binary verdict in a single pass.

| Verdict | Condition |
|---|---|
| `done-green` | All three gates green: tests `passed` + review `approved` + qa `accepted`. The draft PR is ready for human review/merge. |
| `stopped-budget` | `maxCycles` `/develop` passes exhausted without all-green; no gate blocked. |
| `stopped-blocked` | ≥1 gate reached `maxPerGate` reds — global green is unreachable. The report lists each blocked gate and its last failure detail. |

None of these verdicts merge or approve. `stopped-*` hands back to a human with full state (cycle history + per-gate detail); a later resume simply re-runs `/fulldev`, which re-detects the entry point (existing PR → restart at gates).

---

## Safety invariants (non-negotiable)

- **Never edit source or gates.** `/fulldev` is a pure orchestrator; its only writes are the synthesis comment + ticket transition, the state machine file, and scratch. It never touches the codebase, the tests, or the review/qa output.
- **Only looper; loop control is deterministic.** `/fulldev` is the sole skill that loops; the sub-skills are single-pass. The next action and the terminal verdict come exclusively from `scripts/fulldev-state.mjs` — never from improvisation.
- **`fulldev.mode` overrides sub-skills.** The resolved mode is passed as `--mode` to each invoked skill. `gate` makes every sub-skill stop at its own gate; `autonomous` runs straight through.
- **qa only after tests + review are green.** Booting the app is costly; never validate live a diff already rejected by tests or review. The state machine enforces this — qa only becomes reachable when neither tests nor review is blocked.
- **Never merge / approve / `--force` / new PR.** The chain ends with a **draft** PR/MR ready for a human; merge and approval are outside the palette scope.
- **No credential in config.** Token never in `snap.config.json` or `.mcp.json` (D-033); auth is the `gh`/`glab` keychain or the provider token in `.env` (gitignored).
- **Scratch is gitignored.** `.snap/tmp/` (state + report contracts) is never committed or pushed.
- **Context isolation.** Only small verdict JSON contracts cross stage boundaries; diffs, test suites, run logs, and QA evidence stay inside each sub-skill's isolated context and never return to the orchestrator.

---

## Sub-skill invocation

`/review` is invoked review-only (no `--fix`) — `/develop` owns all fixes.

| Gate | Invoked | Verdict read from | Green / Red |
|---|---|---|---|
| develop | `/snap:develop --mode <m>` | code updated (draft PR/MR) | — (no verdict, invalidates gates) |
| tests | `/snap:tests --mode <m>` | `.snap/tmp/tests-report.json` `.verdict` | `passed` / `tests-failed` |
| review | `/snap:review` (review-only) | `/review` report verdict field | `approved` / `changes-requested` |
| qa | `/snap:qa --mode <m> [--base-url …]` | `.snap/tmp/qa-report.json` `.verdict` | `accepted` / `rejected` |

For `action=gates`, `/snap:tests` and `/snap:review` are invoked in a **single message** (∥). A gate already marked `blocked` in the state is skipped — not re-invoked.

---

## Per-provider recipe (progressive disclosure)

See `reference/fulldev-orchestration.md` for the full invocation recipe: sub-skill calls with `--mode` propagation, entry-point detection (`gh pr list --head` / `glab mr list --source-branch`), and the mode-propagation + safety invariants in detail.

For each gate's own contract — what the sub-skill does internally, its scratch shape, and its per-provider delivery — see the matching gate reference:
- tests: `reference/tests-pipeline.md`
- review: `reference/review-pipeline.md`
- qa: `reference/qa-pipeline.md`
