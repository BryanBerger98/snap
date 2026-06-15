/**
 * Snap — lint-docs.mjs
 *
 * Deterministic structural validator for the /define knowledge base (Node ESM,
 * no deps). Language-independent checks only — body-section wording is left to the
 * skill (it varies with `language`); this gate covers frontmatter, enums, id /
 * prefix / type / filename consistency, link integrity, singletons, and the
 * stub-vs-specified body shape.
 *
 * Usage: node lint-docs.mjs [projectDir] [--from-json <path>]
 *   projectDir defaults to $CLAUDE_PROJECT_DIR, then process.cwd().
 *   docsPath is read from snap.config.json (default "docs/product/").
 *   --from-json <path>: validate the normalized state from a JSON file an agent
 *     wrote after a remote MCP fetch (D-028) instead of the docs dir. The gate is
 *     preserved on every provider; off-repo, the id↔filename check is skipped
 *     (no filename remotely) — every other check runs unchanged.
 *
 * Exit code: 1 if any ERROR, else 0. Warnings never fail the gate.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { toArr } from "./lib/frontmatter.mjs";
import { loadFromFs, loadFromJson } from "./lib/entities.mjs";

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
let docsPath = "docs/product/";
let cfgLanguage = "fr";
try {
  const cfg = JSON.parse(readFileSync(join(projectDir, "snap.config.json"), "utf8"));
  if (typeof cfg.docsPath === "string") docsPath = cfg.docsPath;
  if (typeof cfg.language === "string") cfgLanguage = cfg.language;
} catch {
  // defaults
}

const docsDir = resolve(projectDir, docsPath);
if (!fromJson && !existsSync(docsDir)) {
  console.log(`[snap] lint: docs dir not found (${docsPath}); nothing to lint.`);
  process.exit(0);
}

// --- contract --------------------------------------------------------------
const PREFIX_BY_TYPE = { brief: "BRF", persona: "PER", feature: "FEAT", decision: "ADR",
  outcome: "OUT", opportunity: "OPP", release: "REL", glossary: "GLO" };
const TYPE_BY_PREFIX = { BRF: "brief", PER: "persona", FEAT: "feature", ADR: "decision",
  OUT: "outcome", OPP: "opportunity", REL: "release", GLO: "glossary" };
const STATUS_ENUM = {
  brief: ["draft", "review", "approved"],
  persona: ["actif", "archivé"],
  feature: ["idea", "discovery", "ready", "building", "shipped", "deprecated"],
  decision: ["proposée", "actée", "supersédée"],
  outcome: ["proposé", "actif", "atteint", "abandonné"],
  opportunity: ["à explorer", "en test", "retenue", "écartée"],
  release: ["publiée"],
  glossary: ["actif"],
};
const STABILITY_VALID = ["frozen", "living", "append-only"];
const STABILITY_EXPECTED = { brief: "frozen", persona: "living", feature: "living", decision: "append-only",
  outcome: "living", opportunity: "living", release: "append-only", glossary: "living" };
// NO `epic`: epics are project-management (ticket board), not product doc. Functional
// grouping is the feature `domain` field. See reference/product-model/id-scheme.md.
const FEATURE_TYPE = ["feature", "enhancement"];
const FEATURE_SOURCE = ["discovered", "inventoried"];
const FEATURE_DEPTH = ["stub", "specified"];
const FEATURE_HORIZON = ["Now", "Next", "Later", "Done"];
const DECISION_RISK_TYPE = ["value", "usability", "feasibility", "viability", "ethical"];
const COMMON_KEYS = ["id", "type", "title", "status", "stability", "language", "created", "updated", "links"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// --- collect (loadFromFs | loadFromJson — D-028) ---------------------------
const GENERATED = ["README.md", "ROADMAP.md"];
let entities = [];
if (fromJson) {
  try {
    entities = loadFromJson(fromJson);
  } catch (e) {
    console.error(`[snap] lint: could not read --from-json ${fromJson}: ${e.message}`);
    process.exit(1);
  }
} else {
  entities = loadFromFs(docsDir, { withBody: true, skip: GENERATED });
}
// Adapt to the local doc shape: path/base/data/body. `base` is the filename for a
// repo entity, null otherwise → the id↔filename check below is repo-only (D-028).
const docs = entities.map((e) => ({
  path: e.source.ref || e.id || "(unknown)",
  base: e.source.provider === "repo" ? String(e.source.ref).split("/").pop() : null,
  data: e.fm,
  body: e.body == null ? "" : e.body,
}));

const problems = [];
const err = (path, msg) => problems.push({ level: "error", path, msg });
const warn = (path, msg) => problems.push({ level: "warn", path, msg });

// index of declared ids (for link integrity + duplicate detection)
const idCount = new Map();
for (const d of docs) {
  const id = d.data && d.data.id ? String(d.data.id) : null;
  if (id) idCount.set(id, (idCount.get(id) || 0) + 1);
}
const idSet = new Set(idCount.keys());
const byId = new Map(docs.filter((d) => d.data && d.data.id).map((d) => [String(d.data.id), d]));

// --- per-document checks ---------------------------------------------------
const briefs = [];
for (const d of docs) {
  const { path, base, data, body } = d;
  if (!data) { err(path, "no YAML frontmatter"); continue; }

  for (const k of COMMON_KEYS) {
    if (data[k] == null || data[k] === "") err(path, `missing required key \`${k}\``);
  }
  const type = data.type ? String(data.type) : null;
  const id = data.id ? String(data.id) : null;
  if (type && !PREFIX_BY_TYPE[type]) { err(path, `unknown type \`${type}\``); }

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
  if (data.stability != null && !STABILITY_VALID.includes(String(data.stability)))
    err(path, `stability \`${data.stability}\` not in [${STABILITY_VALID.join(", ")}]`);
  else if (type && STABILITY_EXPECTED[type] && data.stability && String(data.stability) !== STABILITY_EXPECTED[type])
    warn(path, `stability \`${data.stability}\` unusual for ${type} (expected ${STABILITY_EXPECTED[type]})`);

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
      if (!idSet.has(String(ref))) err(path, `dangling link links.${rel} → \`${ref}\` (no such id)`);
    }
  }
  // children ⇒ reciprocal parent
  for (const c of toArr(links.children)) {
    const child = byId.get(String(c));
    if (child && !toArr(child.data.links && child.data.links.parents).map(String).includes(id))
      warn(path, `children \`${c}\` does not list \`${id}\` as parent (one-way link)`);
  }

  // type-specific
  if (type === "brief") briefs.push(d);

  if (type === "decision") {
    const sup = data.supersede;
    if (sup) for (const s of toArr(sup)) if (!idSet.has(String(s))) err(path, `supersede → \`${s}\` (no such id)`);
    // risk_type ∈ enum when present (optional; one ADR settles one Cagan risk).
    if (data.risk_type != null && data.risk_type !== "" && !DECISION_RISK_TYPE.includes(String(data.risk_type)))
      err(path, `risk_type \`${data.risk_type}\` not in [${DECISION_RISK_TYPE.join(", ")}]`);
  }

  if (type === "persona") {
    if (data.persona_type && !["proto", "validé"].includes(String(data.persona_type)))
      err(path, `persona_type \`${data.persona_type}\` not in [proto, validé]`);
    if (data.niveau_preuve && !["hypothèse", "entretiens", "data"].includes(String(data.niveau_preuve)))
      err(path, `niveau_preuve \`${data.niveau_preuve}\` not in [hypothèse, entretiens, data]`);
  }

  if (type === "feature") {
    for (const [k, enumv] of [["type", FEATURE_TYPE], ["source", FEATURE_SOURCE], ["depth", FEATURE_DEPTH], ["horizon", FEATURE_HORIZON]]) {
      if (data[k] == null || data[k] === "") err(path, `feature missing \`${k}\``);
      else if (!enumv.includes(String(data[k]))) err(path, `feature ${k} \`${data[k]}\` not in [${enumv.join(", ")}]`);
    }
    // shipped_at: optional, NEVER required — valid even when status:shipped, and an
    // empty value is always fine (OD3). Only constraint: when present, it must be ISO.
    if (data.shipped_at != null && data.shipped_at !== "" && !ISO_DATE.test(String(data.shipped_at)))
      err(path, `shipped_at \`${data.shipped_at}\` is not ISO YYYY-MM-DD`);
    if (data.domain == null || data.domain === "")
      warn(path, "feature missing `domain` (functional grouping; sets the `03-features/<slug>/` subfolder)");
    // domain ↔ subfolder agreement (repo-only — the path carries the folder).
    // Layout: 03-features/<slug>/FEAT-xxx.md ⇒ the parent folder must equal fm.domain
    // (two views of one fact; closes silent drift — id-scheme.md › nesting).
    else if (base) {
      const segs = String(path).split("/");
      const fi = segs.indexOf("03-features");
      if (fi !== -1 && fi + 2 < segs.length) {
        const folder = segs[fi + 1];
        if (folder !== String(data.domain))
          err(path, `feature domain \`${data.domain}\` ≠ its 03-features/ subfolder \`${folder}\` (must match — id-scheme.md › nesting)`);
      } else if (fi !== -1 && fi + 2 === segs.length) {
        warn(path, `feature sits directly under 03-features/ — expected to nest in \`${data.domain}/\` (03-features/${data.domain}/)`);
      }
    }
    const h2 = (body.match(/^##\s+/gm) || []).length;
    const hasMermaid = /```mermaid/.test(body);
    const depth = String(data.depth || "");
    if (depth === "specified") {
      if (body.trim() === "" || h2 === 0) err(path, "depth: specified but the PRD body is empty");
      else {
        if (hasMermaid) warn(path, "feature uses a ```mermaid block — replace it with a numbered user-flow list");
        if (h2 < 5) warn(path, `specified feature has only ${h2} H2 section(s) (expected the full PRD body)`);
      }
    } else if (depth === "stub") {
      if (!data.value_hypothesis) warn(path, "stub feature has an empty value_hypothesis");
      if (relatedPersonasOf(data).length === 0) warn(path, "stub feature has no persona in links.related");
      if (h2 >= 3) warn(path, `stub feature has ${h2} H2 section(s) — looks specified (set depth: specified?)`);
    }
  }
}

function relatedPersonasOf(data) {
  return toArr(data.links && data.links.related).filter((x) => String(x).startsWith("PER-"));
}

// brief singleton
if (briefs.length > 1) err(briefs.map((b) => b.path).join(", "), `more than one brief (${briefs.length}); brief is a singleton`);
for (const b of briefs) if (String(b.data.id) !== "BRF-001") warn(b.path, `brief id \`${b.data.id}\` should be BRF-001 (singleton)`);

// --- report ----------------------------------------------------------------
const errors = problems.filter((p) => p.level === "error");
const warns = problems.filter((p) => p.level === "warn");
for (const p of [...errors, ...warns]) {
  console.log(`${p.level === "error" ? "ERROR" : "WARN "}  ${p.path}: ${p.msg}`);
}
console.log(`[snap] lint: ${docs.length} entit${docs.length === 1 ? "y" : "ies"}, ${errors.length} error${errors.length === 1 ? "" : "s"}, ${warns.length} warning${warns.length === 1 ? "" : "s"}.`);
process.exit(errors.length ? 1 : 0);
