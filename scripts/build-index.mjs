/**
 * Snap — build-index.mjs
 *
 * Regenerates two views from the entity frontmatters (Node ESM, no deps):
 *   - <docsPath>/INDEX.md   — the entity map (Brief / Personas / Features / Decisions)
 *   - <docsPath>/ROADMAP.md — Features grouped by horizon (Now/Next/Later/Done)
 *
 * The roadmap is a *view*, never authored by hand (D-019). Invoked by /define
 * after each write (algorithm step 5) and re-runnable by hand. Cross-platform
 * (D-003): pure Node, no shell.
 *
 * Usage: node build-index.mjs [projectDir] [--digest] [--from-json <path>]
 *   projectDir defaults to $CLAUDE_PROJECT_DIR, then process.cwd().
 *   docsPath + language + providers.doc are read from snap.config.json
 *   (defaults: "docs/product/", "fr", "repository").
 *   --digest: print a compact frontmatter map (id/type/status/horizon/depth/links)
 *     to stdout and exit WITHOUT writing the views. Lets /define detect existing
 *     state without globbing + reading every entity body (injected via the skill's
 *     `!`command`` directive). Emits an empty digest (never errors) on a fresh repo.
 *     When providers.doc is remote (notion/affine) it prints a marker instead — a
 *     script can't read a remote base; the skill loads it via the snap-loader agent
 *     (D-029 R1). --from-json overrides the marker.
 *   --from-json <path>: load the normalized state from a JSON file an agent wrote
 *     after a remote MCP fetch (D-028), instead of walking the docs dir.
 *
 * Never throws on a recoverable error: a failed build must not block /define.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { toArr } from "./lib/frontmatter.mjs";
import { loadFromFs, loadFromJson } from "./lib/entities.mjs";

// --- args ------------------------------------------------------------------
const rawArgs = process.argv.slice(2);
const DIGEST = rawArgs.includes("--digest");
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

// --- read config -----------------------------------------------------------
let docsPath = "docs/product/";
let language = "fr";
let docProvider = "repository";
try {
  const cfg = JSON.parse(readFileSync(join(projectDir, "snap.config.json"), "utf8"));
  if (typeof cfg.docsPath === "string") docsPath = cfg.docsPath;
  if (typeof cfg.language === "string") language = cfg.language;
  if (cfg.providers && typeof cfg.providers.doc === "string") docProvider = cfg.providers.doc;
} catch {
  // no config → defaults
}
const REMOTE = docProvider !== "repository" && docProvider !== "repo";

// Provider-aware digest (D-029 R1): a remote doc base can't be read by a script —
// emit a marker so the skill knows to load it via the snap-loader agent (step 2).
// `--from-json` overrides this (the loader already fetched the state into scratch).
if (DIGEST && REMOTE && !fromJson) {
  console.log(
    `# Snap state: provider=${docProvider} — doc base is remote; ` +
      "load it via the snap-loader agent (algorithm step 2), then `lint --from-json`."
  );
  process.exit(0);
}

// --- collect entities (loadFromFs | loadFromJson — D-028) -------------------
const GENERATED = ["INDEX.md", "ROADMAP.md"];
const docsDir = resolve(projectDir, docsPath);
let entities = [];
if (fromJson) {
  try {
    entities = loadFromJson(fromJson);
  } catch (err) {
    console.warn(`[snap] build-index: could not read --from-json ${fromJson}: ${err.message}`);
  }
} else {
  if (!existsSync(docsDir)) {
    if (DIGEST) {
      console.log("# Snap state digest: 0 entities (no docs dir yet — greenfield run).");
      process.exit(0);
    }
    console.warn(`[snap] build-index: docs dir not found (${docsPath}); nothing to index.`);
    process.exit(0);
  }
  entities = loadFromFs(docsDir, { skip: GENERATED });
}

const entries = entities
  .filter((e) => e.id && e.type)
  .map((e) => ({
    id: e.id,
    type: e.type,
    title: e.fm && e.fm.title ? String(e.fm.title) : e.id,
    status: e.fm && e.fm.status ? String(e.fm.status) : "",
    path: e.source.ref,
    fm: e.fm || {},
  }));

// --- helpers ---------------------------------------------------------------
const EN = language === "en";
const byId = (a, b) => a.id.localeCompare(b.id, "en", { numeric: true });
const get = (e, k, d = "") => (e.fm[k] == null || e.fm[k] === "" ? d : String(e.fm[k]));
const ofType = (t) => entries.filter((e) => e.type === t).sort(byId);
const relatedPersonas = (e) =>
  toArr(e.fm.links && e.fm.links.related).filter((x) => String(x).startsWith("PER-"));

function linksCell(fm) {
  const parts = [];
  const parents = toArr(fm.links && fm.links.parents);
  const related = toArr(fm.links && fm.links.related);
  if (parents.length) parts.push("↑ " + parents.join(", "));
  if (related.length) parts.push("↔ " + related.join(", "));
  return parts.length ? parts.join(" · ") : "—";
}

// --- digest mode (read-only state map, no views written) -------------------
if (DIGEST) {
  const pad = (s, n) => String(s).padEnd(n);
  const KNOWN = ["brief", "persona", "feature", "decision"];
  const order = [
    ...KNOWN,
    ...[...new Set(entries.map((e) => e.type))].filter((t) => !KNOWN.includes(t)).sort(),
  ];
  const lines = [];
  for (const t of order) {
    for (const e of ofType(t)) {
      const meta =
        t === "feature"
          ? pad(get(e, "horizon", "-"), 6) + pad(get(e, "depth", "-"), 10)
          : pad("", 16);
      const links = linksCell(e.fm);
      lines.push(
        [pad(e.id, 9), pad(e.type, 9), pad(e.status || "-", 11), meta, links === "—" ? "" : links]
          .join(" ")
          .trimEnd()
      );
    }
  }
  const n = entries.length;
  if (!n) {
    console.log("# Snap state digest: 0 entities (empty — greenfield run).");
  } else {
    console.log(
      `# Snap state digest: ${n} entit${n === 1 ? "y" : "ies"} — frontmatter only; ` +
        "read an entity body only when editing it."
    );
    console.log(lines.join("\n"));
  }
  process.exit(0);
}

const L = EN
  ? { idx: "Product index", rmap: "Roadmap", noEdit: "Auto-generated by Snap `/define`. Do not edit by hand.",
      brief: "Brief", personas: "Personas", features: "Features", decisions: "Decisions",
      id: "ID", title: "Title", status: "Status", stab: "Stability", type: "Type",
      proof: "Evidence", depth: "Depth", horizon: "Horizon", persona: "Persona", links: "Links",
      decided: "About", empty: "_None yet._" }
  : { idx: "Index produit", rmap: "Roadmap", noEdit: "Généré automatiquement par Snap `/define`. Ne pas éditer à la main.",
      brief: "Brief", personas: "Personas", features: "Features", decisions: "Décisions",
      id: "ID", title: "Titre", status: "Statut", stab: "Stabilité", type: "Type",
      proof: "Preuve", depth: "Depth", horizon: "Horizon", persona: "Persona", links: "Liens",
      decided: "Lié à", empty: "_Aucun pour l'instant._" };

const link = (e) => `[${e.title}](${e.path})`;

// --- render INDEX.md -------------------------------------------------------
let idx = `<!-- ${L.noEdit} -->\n# ${L.idx}\n\n`;

function section(label, rows, header, rowFn) {
  let s = `## ${label}\n\n`;
  if (!rows.length) return s + `${L.empty}\n\n`;
  s += `| ${header.join(" | ")} |\n| ${header.map(() => "---").join(" | ")} |\n`;
  for (const e of rows) s += `| ${rowFn(e).join(" | ")} |\n`;
  return s + "\n";
}

idx += section(L.brief, ofType("brief"), [L.id, L.title, L.status, L.stab], (e) =>
  [`\`${e.id}\``, link(e), e.status || "—", get(e, "stability", "—")]
);
idx += section(L.personas, ofType("persona"), [L.id, L.persona, L.type, L.proof, L.status], (e) =>
  [`\`${e.id}\``, link(e), get(e, "persona_type", "—"), get(e, "niveau_preuve", "—"), e.status || "—"]
);
idx += section(L.features, ofType("feature"), [L.id, L.features, L.type, L.depth, L.horizon, L.status, L.links], (e) =>
  [`\`${e.id}\``, link(e), get(e, "type", "—"), get(e, "depth", "—"), get(e, "horizon", "—"), e.status || "—", linksCell(e.fm)]
);
idx += section(L.decisions, ofType("decision"), [L.id, L.title, L.status, L.decided], (e) =>
  [`\`${e.id}\``, link(e), e.status || "—", linksCell(e.fm)]
);

// --- render ROADMAP.md (Features by horizon) -------------------------------
const HORIZONS = ["Now", "Next", "Later", "Done"];
const features = ofType("feature");
let rmap = `<!-- ${L.noEdit} -->\n# ${L.rmap}\n\n`;
for (const h of HORIZONS) {
  const rows = features.filter((e) => get(e, "horizon") === h);
  rmap += `## ${h}\n\n`;
  if (!rows.length) { rmap += `${L.empty}\n\n`; continue; }
  rmap += `| ${L.id} | ${L.features} | ${L.persona} | ${L.depth} | ${L.status} |\n| --- | --- | --- | --- | --- |\n`;
  for (const e of rows) {
    const personas = relatedPersonas(e).join(", ") || "—";
    rmap += `| \`${e.id}\` | ${link(e)} | ${personas} | ${get(e, "depth", "—")} | ${e.status || "—"} |\n`;
  }
  rmap += "\n";
}

// --- write -----------------------------------------------------------------
try {
  writeFileSync(join(docsDir, "INDEX.md"), idx);
  writeFileSync(join(docsDir, "ROADMAP.md"), rmap);
  const n = entries.length;
  console.log(`[snap] build-index: wrote INDEX.md + ROADMAP.md (${n} entit${n === 1 ? "y" : "ies"}).`);
} catch (err) {
  console.warn(`[snap] build-index warning: could not write views: ${err.message}`);
}
