/**
 * Snap — fulldev-state.mjs
 *
 * Deterministic loop brain for the /fulldev orchestrator (Node ESM, no deps).
 * /fulldev chains develop → tests → review → qa in a BOUNDED loop; this script is
 * the pure state machine that decides the next action and the terminal verdict —
 * the skill only invokes sub-skills, reads their verdicts, and calls `step`.
 *
 * Decision (D-041):
 *   - Stop = per-gate cap + global budget. Each gate (tests/review/qa) counts reds;
 *     at `maxPerGate` reds the gate is BLOCKED (never re-run). `maxCycles` caps the
 *     number of /develop passes in the run.
 *   - Gates per round = tests ∥ review, THEN qa (only if tests+review are green —
 *     qa boots the app, never on already-rejected code).
 *   - A /develop pass changes the code → previously-green gates are reset to pending
 *     (re-evaluated next round); blocked gates stay skipped.
 *   - Terminal verdicts: done-green | stopped-budget | stopped-blocked.
 *
 * CLI:
 *   node fulldev-state.mjs init --ticket T --mode gate|autonomous \
 *        --max-cycles N --max-per-gate K --entry develop|gates [--state <path>]
 *   node fulldev-state.mjs step --did none|develop|gates|qa \
 *        [--tests V] [--review V] [--qa V] [--state <path>]
 *   node fulldev-state.mjs --selftest
 *
 * Both `init` and `step` write `.snap/tmp/fulldev-state.json` (or --state) and print
 * the decision `{ action, status, reason }` on stdout for the skill to parse.
 *
 * Never throws on a recoverable error: a failed read falls back to a fresh state.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const GATES = ["tests", "review", "qa"];
const DEFAULT_STATE_PATH = ".snap/tmp/fulldev-state.json";

const GREEN = new Set([
  "passed", "pass", "green", "ok", "success",
  "approved", "clean", "no-changes", "nochanges",
  "accepted",
]);
const RED = new Set([
  "tests-failed", "failed", "fail", "red", "error",
  "changes-requested", "rejected",
]);

/** Normalize a sub-skill verdict to 'green' | 'red' | null (unknown/not-run). */
function normVerdict(v) {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (s === "") return null;
  if (GREEN.has(s)) return "green";
  if (RED.has(s)) return "red";
  return null;
}

/** Parse an integer with a floor and a fallback. */
function intOr(v, def, min) {
  const n = Number(String(v ?? "").trim());
  if (Number.isInteger(n) && n >= min) return n;
  return def;
}

function freshGate() {
  return { red: 0, blocked: false, last: "pending" };
}

export function initState({ ticket, mode, maxCycles, maxPerGate, entry } = {}) {
  return {
    ticket: ticket != null && ticket !== "" ? String(ticket) : null,
    mode: mode === "autonomous" ? "autonomous" : "gate",
    maxCycles: intOr(maxCycles, 5, 1),
    maxPerGate: intOr(maxPerGate, 3, 1),
    entry: entry === "gates" ? "gates" : "develop",
    cycle: 0,
    phase: "start",
    gates: { tests: freshGate(), review: freshGate(), qa: freshGate() },
    status: "running",
    history: [],
  };
}

const isGreen = (st, k) => st.gates[k].last === "green";
const isBlocked = (st, k) => st.gates[k].blocked === true;
/** qa is only reachable if its prerequisites (tests, review) are not blocked. */
function reachable(st, k) {
  if (k === "qa") return !isBlocked(st, "tests") && !isBlocked(st, "review");
  return true;
}
/** An "open" gate still needs (and can make) progress toward green. */
function isOpen(st, k) {
  return !isBlocked(st, k) && st.gates[k].last !== "green" && reachable(st, k);
}

/** Record one gate verdict: set last, count reds, block at the cap. */
function applyGate(st, k, verdict) {
  const v = normVerdict(verdict);
  if (v == null || isBlocked(st, k)) return; // unknown or already blocked → no-op
  st.gates[k].last = v;
  if (v === "red") {
    st.gates[k].red += 1;
    if (st.gates[k].red >= st.maxPerGate) st.gates[k].blocked = true;
  }
}

/**
 * Apply the verdicts of the action just performed (`did`) to the state, mutating it.
 * `did` ∈ none | develop | gates | qa. `verdicts` = { tests, review, qa }.
 */
export function applyStep(st, did, verdicts = {}) {
  if (did === "develop") {
    st.cycle += 1;
    st.phase = "develop";
    // new code invalidates prior gate outcomes; blocked gates stay skipped.
    for (const k of GATES) if (!isBlocked(st, k)) st.gates[k].last = "pending";
    st.history.push({ cycle: st.cycle, did: "develop" });
  } else if (did === "gates") {
    st.phase = "gates";
    applyGate(st, "tests", verdicts.tests);
    applyGate(st, "review", verdicts.review);
    st.history.push({
      cycle: st.cycle,
      did: "gates",
      verdicts: { tests: verdicts.tests ?? null, review: verdicts.review ?? null },
    });
  } else if (did === "qa") {
    st.phase = "qa";
    applyGate(st, "qa", verdicts.qa);
    st.history.push({ cycle: st.cycle, did: "qa", verdicts: { qa: verdicts.qa ?? null } });
  }
  return st;
}

function terminal(st, status, reason) {
  st.status = status;
  st.phase = "done";
  return { action: "stop", status, reason };
}

/**
 * Decide the next action given the current state and the action just performed.
 * Returns { action: develop|gates|qa|stop, status, reason } and updates st.status.
 */
export function decideNext(st, did) {
  // 1. All three green → done.
  if (GATES.every((k) => isGreen(st, k))) {
    return terminal(st, "done-green", "all gates green — draft PR ready for human review");
  }

  const anyBlocked = GATES.some((k) => isBlocked(st, k));
  const openGates = GATES.filter((k) => isOpen(st, k));

  // 2. Nothing left to progress → terminal.
  if (openGates.length === 0) {
    return anyBlocked
      ? terminal(st, "stopped-blocked", `blocked: ${GATES.filter((k) => isBlocked(st, k)).join(", ")}`)
      : terminal(st, "stopped-budget", "no progress possible within budget");
  }

  // 3. Choose the next action by what was just done.
  if (did === "none") {
    st.status = "running";
    return st.entry === "gates"
      ? { action: "gates", status: "running", reason: "entry: existing PR → run tests∥review" }
      : { action: "develop", status: "running", reason: "entry: greenfield → build first" };
  }

  if (did === "develop") {
    st.status = "running";
    return { action: "gates", status: "running", reason: `cycle ${st.cycle}: run tests∥review` };
  }

  if (did === "gates") {
    if (isGreen(st, "tests") && isGreen(st, "review")) {
      st.status = "running";
      return { action: "qa", status: "running", reason: "tests+review green → validate live (qa)" };
    }
    if (st.cycle < st.maxCycles) {
      st.status = "running";
      return { action: "develop", status: "running", reason: "gate red → back to /develop with feedback" };
    }
    return anyBlocked
      ? terminal(st, "stopped-blocked", `budget spent with gate(s) blocked: ${GATES.filter((k) => isBlocked(st, k)).join(", ")}`)
      : terminal(st, "stopped-budget", `maxCycles (${st.maxCycles}) reached, gates still red`);
  }

  if (did === "qa") {
    // qa green with tests+review green is caught by the all-green check above.
    if (st.cycle < st.maxCycles) {
      st.status = "running";
      return { action: "develop", status: "running", reason: "qa rejected → back to /develop" };
    }
    return anyBlocked
      ? terminal(st, "stopped-blocked", `budget spent with gate(s) blocked: ${GATES.filter((k) => isBlocked(st, k)).join(", ")}`)
      : terminal(st, "stopped-budget", `maxCycles (${st.maxCycles}) reached, qa still rejected`);
  }

  // Unknown `did` → no-op decision.
  st.status = "running";
  return { action: "stop", status: st.status, reason: `unknown action "${did}"` };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--selftest") out.selftest = true;
    else if (a === "--ticket") out.ticket = argv[++i];
    else if (a === "--mode") out.mode = argv[++i];
    else if (a === "--max-cycles") out.maxCycles = argv[++i];
    else if (a === "--max-per-gate") out.maxPerGate = argv[++i];
    else if (a === "--entry") out.entry = argv[++i];
    else if (a === "--did") out.did = argv[++i];
    else if (a === "--tests") out.tests = argv[++i];
    else if (a === "--review") out.review = argv[++i];
    else if (a === "--qa") out.qa = argv[++i];
    else if (a === "--state") out.state = argv[++i];
    else out._.push(a);
  }
  return out;
}

function loadState(path) {
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, "utf8"));
    } catch (err) {
      console.warn(`[snap] fulldev-state: unreadable state, starting fresh: ${err.message}`);
    }
  }
  return initState({});
}

function saveState(path, st) {
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(st, null, 2) + "\n");
  } catch (err) {
    console.warn(`[snap] fulldev-state: could not write state: ${err.message}`);
  }
}

function runSelftest() {
  const checks = [];
  const ok = (name, cond) => checks.push({ name, pass: !!cond });

  // Scenario A — greenfield, everything green on the first try.
  {
    let s = initState({ entry: "develop", maxCycles: 5, maxPerGate: 3 });
    let d = decideNext(s, "none");
    ok("A.entry=develop", d.action === "develop");
    applyStep(s, "develop");
    d = decideNext(s, "develop");
    ok("A.develop→gates", d.action === "gates" && s.cycle === 1);
    applyStep(s, "gates", { tests: "passed", review: "approved" });
    d = decideNext(s, "gates");
    ok("A.gates green→qa", d.action === "qa");
    applyStep(s, "qa", { qa: "accepted" });
    d = decideNext(s, "qa");
    ok("A.qa green→done-green", d.action === "stop" && d.status === "done-green");
  }

  // Scenario B — one tests-failed, fixed on the next develop, then all green.
  {
    let s = initState({ entry: "develop", maxCycles: 5, maxPerGate: 3 });
    decideNext(s, "none");
    applyStep(s, "develop");
    decideNext(s, "develop");
    applyStep(s, "gates", { tests: "tests-failed", review: "approved" });
    let d = decideNext(s, "gates");
    ok("B.tests red→develop", d.action === "develop" && s.gates.tests.red === 1);
    applyStep(s, "develop");
    d = decideNext(s, "develop");
    ok("B.review reset to pending", s.gates.review.last === "pending" && d.action === "gates");
    applyStep(s, "gates", { tests: "passed", review: "approved" });
    d = decideNext(s, "gates");
    ok("B.both green→qa", d.action === "qa");
    applyStep(s, "qa", { qa: "accepted" });
    d = decideNext(s, "qa");
    ok("B.done-green cycle=2", d.status === "done-green" && s.cycle === 2);
  }

  // Scenario C — review never converges → blocked at maxPerGate=2 → stopped-blocked.
  {
    let s = initState({ entry: "develop", maxCycles: 9, maxPerGate: 2 });
    decideNext(s, "none");
    applyStep(s, "develop");
    decideNext(s, "develop");
    applyStep(s, "gates", { tests: "passed", review: "changes-requested" });
    let d = decideNext(s, "gates");
    ok("C.review red #1→develop", d.action === "develop" && s.gates.review.red === 1);
    applyStep(s, "develop");
    decideNext(s, "develop");
    applyStep(s, "gates", { tests: "passed", review: "changes-requested" });
    d = decideNext(s, "gates");
    ok("C.review red #2→blocked", s.gates.review.blocked === true);
    ok("C.stopped-blocked", d.action === "stop" && d.status === "stopped-blocked");
  }

  // Scenario D — qa keeps rejecting until the global budget is spent.
  {
    let s = initState({ entry: "develop", maxCycles: 2, maxPerGate: 9 });
    decideNext(s, "none");
    applyStep(s, "develop"); // cycle 1
    decideNext(s, "develop");
    applyStep(s, "gates", { tests: "passed", review: "approved" });
    decideNext(s, "gates");
    applyStep(s, "qa", { qa: "rejected" });
    let d = decideNext(s, "qa");
    ok("D.qa red, budget left→develop", d.action === "develop");
    applyStep(s, "develop"); // cycle 2 = maxCycles
    decideNext(s, "develop");
    applyStep(s, "gates", { tests: "passed", review: "approved" });
    decideNext(s, "gates");
    applyStep(s, "qa", { qa: "rejected" });
    d = decideNext(s, "qa");
    ok("D.budget spent→stopped-budget", d.action === "stop" && d.status === "stopped-budget");
  }

  // Scenario E — entry=gates (existing PR) runs gates first, no initial develop.
  {
    let s = initState({ entry: "gates", maxCycles: 5, maxPerGate: 3 });
    let d = decideNext(s, "none");
    ok("E.entry=gates→gates first", d.action === "gates" && s.cycle === 0);
    applyStep(s, "gates", { tests: "passed", review: "approved" });
    d = decideNext(s, "gates");
    ok("E.green→qa, cycle still 0", d.action === "qa" && s.cycle === 0);
  }

  const failed = checks.filter((c) => !c.pass);
  for (const c of checks) console.log(`${c.pass ? "ok  " : "FAIL"} ${c.name}`);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed.`);
  return failed.length === 0;
}

const argv = parseArgs(process.argv.slice(2));

if (argv.selftest) {
  process.exit(runSelftest() ? 0 : 1);
}

const cmd = argv._[0];
const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const statePath = resolve(projectDir, argv.state || DEFAULT_STATE_PATH);

if (cmd === "init") {
  const st = initState({
    ticket: argv.ticket,
    mode: argv.mode,
    maxCycles: argv.maxCycles,
    maxPerGate: argv.maxPerGate,
    entry: argv.entry,
  });
  const decision = decideNext(st, "none");
  saveState(statePath, st);
  console.log(JSON.stringify(decision));
} else if (cmd === "step") {
  const st = loadState(statePath);
  const did = argv.did || "none";
  applyStep(st, did, { tests: argv.tests, review: argv.review, qa: argv.qa });
  const decision = decideNext(st, did);
  saveState(statePath, st);
  console.log(JSON.stringify(decision));
} else {
  console.error(
    "usage: fulldev-state.mjs init|step [...] | --selftest (see file header)."
  );
  process.exit(2);
}
