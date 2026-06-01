/**
 * Snap — lint-tickets.mjs
 *
 * Deterministic structural validator for the /ticket delivery base (Node ESM, no
 * deps). Language-independent checks only — body wording is left to the skill;
 * this gate covers frontmatter, status/stability enums, id / prefix / type /
 * filename consistency, link integrity (across BOTH roots), the hierarchy parent
 * rules, and the per-type extra keys.
 *
 * Usage: node lint-tickets.mjs [projectDir] [--from-json <path>]
 *   projectDir defaults to $CLAUDE_PROJECT_DIR, then process.cwd().
 *   ticketsPath + docsPath are read from snap.config.json
 *   (defaults "docs/delivery/" and "docs/product/").
 *   --from-json <path>: validate the normalized ticket state from a JSON file an
 *     agent wrote after a remote MCP fetch (D-028). The same file may carry
 *     `externalIds` (FEAT-/PER- ids) so cross-root links resolve when the doc base
 *     lives on another provider (D-033). Off-repo, the id↔filename check is skipped.
 *
 * Exit code: 1 if any ERROR, else 0. Warnings never fail the gate.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { toArr } from "../../../scripts/lib/frontmatter.mjs";
import { loadFromFs, parseStateFile } from "../../../scripts/lib/entities.mjs";

// --- args ------------------------------------------------------------------
const rawArgs = process.argv.slice(2);
let fromJson = null;
const positional = [];
for (let i = 0; i < rawArgs.length; i++) {
  const a = rawArgs[i];
  if (a === "--from-json") fromJson = rawArgs[++i];
  else if (!a.startsWith("--")) positional.push(a);
}
const projectDir = resolve(
  positional[0] || process.env.CLAUDE_PROJECT_DIR || process.cwd()
);

// --- config ----------------------------------------------------------------
let ticketsPath = "docs/delivery/";
let docsPath = "docs/product/";
let cfgLanguage = "fr";
try {
  const cfg = JSON.parse(readFileSync(join(projectDir, "snap.config.json"), "utf8"));
  if (typeof cfg.ticketsPath === "string") ticketsPath = cfg.ticketsPath;
  if (typeof cfg.docsPath === "string") docsPath = cfg.docsPath;
  if (typeof cfg.language === "string") cfgLanguage = cfg.language;
} catch {
  // defaults
}

const ticketsDir = resolve(projectDir, ticketsPath);
if (!fromJson && !existsSync(ticketsDir)) {
  console.log(`[snap] lint: tickets dir not found (${ticketsPath}); nothing to lint.`);
  process.exit(0);
}

// --- contract --------------------------------------------------------------
const PREFIX_BY_TYPE = { epic: "EPIC", story: "STORY", task: "TASK", bug: "BUG" };
const TYPE_BY_PREFIX = { EPIC: "epic", STORY: "story", TASK: "task", BUG: "bug" };
const STATUS_ENUM = {
  epic: ["todo", "doing", "done"],
  story: ["backlog", "todo", "doing", "review", "done"],
  task: ["todo", "doing", "done"],
  bug: ["open", "doing", "resolved", "closed"],
};
const COMMON_KEYS = ["id", "type", "title", "status", "stability", "language", "created", "updated", "links", "board_url", "owner"];
// allowed parent prefixes per type (≥1 required)
const PARENT_PREFIXES = {
  epic: ["FEAT"],
  story: ["EPIC"],
  task: ["STORY", "EPIC"],
  bug: ["STORY", "EPIC", "FEAT"],
};
const EXTRA_KEYS = { story: ["estimate", "priority"], task: ["estimate", "kind"], bug: ["severity", "priority"] };
const PRIORITY = ["P0", "P1", "P2", "P3"];
const TASK_KIND = ["dev", "infra", "test", "chore", "spike"];
const BUG_SEVERITY = ["blocker", "critical", "major", "minor", "trivial"];
const EXPECTED_H2 = { epic: 4, story: 5, task: 3, bug: 5 };
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// --- collect tickets (loadFromFs | parseStateFile — D-028) -----------------
const GENERATED = ["BOARD.md", "BACKLOG.md"];
let entities = [];
let jsonExternalIds = [];
if (fromJson) {
  try {
    const state = parseStateFile(fromJson);
    entities = state.entities;
    jsonExternalIds = state.externalIds;
  } catch (e) {
    console.error(`[snap] lint: could not read --from-json ${fromJson}: ${e.message}`);
    process.exit(1);
  }
} else {
  entities = loadFromFs(ticketsDir, { withBody: true, skip: GENERATED });
}
// Adapt to the local doc shape: path/base/data/body. `base` is null off-repo so the
// id↔filename check below is repo-only (D-028).
const docs = entities.map((e) => ({
  path: e.source.ref || e.id || "(unknown)",
  base: e.source.provider === "repo" ? String(e.source.ref).split("/").pop() : null,
  data: e.fm,
  body: e.body == null ? "" : e.body,
}));

// External ids for cross-root link integrity (FEAT-/PER-/BRF-/ADR-). In repo mode
// they come from the product docs root; off-repo the snap-loader supplies them in
// the state file (the doc base may live on another provider — D-033).
const externalIds = new Set(jsonExternalIds);
if (!fromJson) {
  const docsDir = resolve(projectDir, docsPath);
  for (const e of loadFromFs(docsDir)) if (e.id) externalIds.add(e.id);
}

const problems = [];
const err = (path, msg) => problems.push({ level: "error", path, msg });
const warn = (path, msg) => problems.push({ level: "warn", path, msg });

// index of declared ids (for link integrity + duplicate detection)
const idCount = new Map();
for (const d of docs) {
  const id = d.data && d.data.id ? String(d.data.id) : null;
  if (id) idCount.set(id, (idCount.get(id) || 0) + 1);
}
const localIds = new Set(idCount.keys());
const knownIds = new Set([...localIds, ...externalIds]);
const byId = new Map(docs.filter((d) => d.data && d.data.id).map((d) => [String(d.data.id), d]));

// --- per-document checks ---------------------------------------------------
for (const d of docs) {
  const { path, base, data, body } = d;
  if (!data) { err(path, "no YAML frontmatter"); continue; }

  for (const k of COMMON_KEYS) {
    if (data[k] == null || (data[k] === "" && k !== "board_url" && k !== "owner"))
      err(path, `missing required key \`${k}\``);
  }
  const type = data.type ? String(data.type) : null;
  const id = data.id ? String(data.id) : null;
  if (type && !PREFIX_BY_TYPE[type]) err(path, `unknown type \`${type}\``);

  // id ↔ prefix ↔ type ↔ filename
  if (id) {
    if (idCount.get(id) > 1) err(path, `duplicate id \`${id}\``);
    const prefix = id.split("-")[0];
    const expectType = TYPE_BY_PREFIX[prefix];
    if (!expectType) err(path, `id \`${id}\` has unknown prefix \`${prefix}-\``);
    else if (type && expectType !== type) err(path, `id prefix \`${prefix}-\` ≠ type \`${type}\` (expected ${PREFIX_BY_TYPE[type]}-)`);
    if (base && !base.startsWith(id + "-")) warn(path, `filename should start with \`${id}-\``);
  }

  // status / stability
  if (type && STATUS_ENUM[type] && data.status != null) {
    if (!STATUS_ENUM[type].includes(String(data.status)))
      err(path, `status \`${data.status}\` not in [${STATUS_ENUM[type].join(", ")}]`);
  }
  if (data.stability != null && String(data.stability) !== "living")
    err(path, `stability \`${data.stability}\` must be \`living\` for a ticket`);

  // dates
  for (const k of ["created", "updated"]) {
    if (data[k] && !ISO_DATE.test(String(data[k]))) warn(path, `${k} \`${data[k]}\` is not ISO YYYY-MM-DD`);
  }
  // language consistency
  if (data.language && String(data.language) !== cfgLanguage)
    warn(path, `language \`${data.language}\` differs from config (\`${cfgLanguage}\`)`);

  // links shape + integrity
  const links = data.links && typeof data.links === "object" ? data.links : {};
  for (const rel of ["parents", "children", "related"]) {
    if (links[rel] == null) { if (data.links) err(path, `links.${rel} missing`); continue; }
    for (const ref of toArr(links[rel])) {
      if (!knownIds.has(String(ref))) err(path, `dangling link links.${rel} → \`${ref}\` (no such id in either root)`);
    }
  }
  // children ⇒ reciprocal parent (only for local tickets)
  for (const c of toArr(links.children)) {
    const child = byId.get(String(c));
    if (child && !toArr(child.data.links && child.data.links.parents).map(String).includes(id))
      warn(path, `children \`${c}\` does not list \`${id}\` as parent (one-way link)`);
  }

  // hierarchy: required parent prefix
  if (type && PARENT_PREFIXES[type]) {
    const parents = toArr(links.parents).map(String);
    const prefixes = parents.map((p) => p.split("-")[0]);
    const ok = prefixes.some((p) => PARENT_PREFIXES[type].includes(p));
    if (!ok) err(path, `${type} needs ≥1 parent of type [${PARENT_PREFIXES[type].join("-/")}-]`);
    if (type === "story" && parents.filter((p) => p.startsWith("EPIC-")).length > 1)
      warn(path, `story has ${parents.filter((p) => p.startsWith("EPIC-")).length} EPIC parents (expected exactly one)`);
  }

  // per-type extra keys
  if (type && EXTRA_KEYS[type]) {
    for (const k of EXTRA_KEYS[type]) if (!(k in data)) warn(path, `${type} missing key \`${k}\``);
  }
  if (type === "story" && data.priority && !PRIORITY.includes(String(data.priority)))
    warn(path, `priority \`${data.priority}\` not in [${PRIORITY.join(", ")}]`);
  if (type === "task" && data.kind && !TASK_KIND.includes(String(data.kind)))
    warn(path, `kind \`${data.kind}\` not in [${TASK_KIND.join(", ")}]`);
  if (type === "bug") {
    if (data.severity && !BUG_SEVERITY.includes(String(data.severity)))
      warn(path, `severity \`${data.severity}\` not in [${BUG_SEVERITY.join(", ")}]`);
    if (data.priority && !PRIORITY.includes(String(data.priority)))
      warn(path, `priority \`${data.priority}\` not in [${PRIORITY.join(", ")}]`);
  }

  // body shape
  const h2 = (body.match(/^##\s+/gm) || []).length;
  if (type === "story" && body.trim() === "") err(path, "story body is empty (needs user story + acceptance criteria)");
  else if (type && EXPECTED_H2[type] && h2 < EXPECTED_H2[type])
    warn(path, `${type} has ${h2} H2 section(s) (expected ${EXPECTED_H2[type]})`);
}

// --- report ----------------------------------------------------------------
const errors = problems.filter((p) => p.level === "error");
const warns = problems.filter((p) => p.level === "warn");
for (const p of [...errors, ...warns]) {
  console.log(`${p.level === "error" ? "ERROR" : "WARN "}  ${p.path}: ${p.msg}`);
}
console.log(`[snap] lint: ${docs.length} ticket${docs.length === 1 ? "" : "s"}, ${errors.length} error${errors.length === 1 ? "" : "s"}, ${warns.length} warning${warns.length === 1 ? "" : "s"}.`);
process.exit(errors.length ? 1 : 0);
