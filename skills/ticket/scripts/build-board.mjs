/**
 * Snap — build-board.mjs
 *
 * Regenerates two views from the ticket frontmatters (Node ESM, no deps):
 *   - <ticketsPath>/BACKLOG.md — hierarchy: Epic → Story → Task/Bug
 *   - <ticketsPath>/BOARD.md   — kanban by lane (To do / Doing / Review / Done)
 *
 * Both are *views*, never authored by hand (D-021). Invoked by /ticket after each
 * write and re-runnable by hand. Cross-platform (D-003): pure Node, no shell.
 *
 * Usage: node build-board.mjs [projectDir] [--digest] [--from-json <path>]
 *   projectDir defaults to $CLAUDE_PROJECT_DIR, then process.cwd().
 *   ticketsPath + language + providers.tickets are read from snap.config.json
 *   (defaults "docs/delivery/", "fr", "repository").
 *   --digest prints a compact frontmatter-only ticket map to stdout and exits
 *     WITHOUT writing the views — the state map injected into /ticket at skill load.
 *     When providers.tickets is remote (jira/github-projects) it prints a marker
 *     instead; the skill loads the base via the snap-loader agent (D-029/D-033).
 *   --from-json <path>: load the normalized ticket state from a JSON file an agent
 *     wrote after a remote MCP fetch (D-028), instead of walking the tickets dir.
 *
 * Never throws on a recoverable error: a failed build must not block /ticket.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { toArr } from "../../../scripts/lib/frontmatter.mjs";
import { loadFromFs, loadFromJson } from "../../../scripts/lib/entities.mjs";

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
let ticketsPath = "docs/delivery/";
let language = "fr";
let ticketsProvider = "repository";
try {
  const cfg = JSON.parse(readFileSync(join(projectDir, "snap.config.json"), "utf8"));
  if (typeof cfg.ticketsPath === "string") ticketsPath = cfg.ticketsPath;
  if (typeof cfg.language === "string") language = cfg.language;
  if (cfg.providers && typeof cfg.providers.tickets === "string") ticketsProvider = cfg.providers.tickets;
} catch {
  // defaults
}
const REMOTE = ticketsProvider !== "repository" && ticketsProvider !== "repo";

// Provider-aware digest (D-029 R1, extended to the delivery base by D-033): a
// remote ticket base (jira / github-projects) can't be read by a script — emit a
// marker so the skill loads it via the snap-loader agent. --from-json overrides.
if (DIGEST && REMOTE && !fromJson) {
  console.log(
    `# Snap ticket state: provider=${ticketsProvider} — delivery base is remote; ` +
      "load it via the snap-loader agent (algorithm step 2), then `lint --from-json`."
  );
  process.exit(0);
}

// --- collect tickets (loadFromFs | loadFromJson — D-028) --------------------
const GENERATED = ["BOARD.md", "BACKLOG.md"];
const ticketsDir = resolve(projectDir, ticketsPath);
let entities = [];
if (fromJson) {
  try {
    entities = loadFromJson(fromJson);
  } catch (err) {
    console.warn(`[snap] build-board: could not read --from-json ${fromJson}: ${err.message}`);
  }
} else {
  if (!existsSync(ticketsDir)) {
    if (DIGEST) {
      console.log("# Snap ticket digest: 0 tickets (no delivery dir yet — none created).");
      process.exit(0);
    }
    console.warn(`[snap] build-board: tickets dir not found (${ticketsPath}); nothing to build.`);
    process.exit(0);
  }
  entities = loadFromFs(ticketsDir, { skip: GENERATED });
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
const byIdNum = (a, b) => a.id.localeCompare(b.id, "en", { numeric: true });
const get = (e, k, d = "") => (e.fm[k] == null || e.fm[k] === "" ? d : String(e.fm[k]));
const ofType = (t) => entries.filter((e) => e.type === t).sort(byIdNum);
const parentsOf = (e) => toArr(e.fm.links && e.fm.links.parents).map(String);
const link = (e) => `[${e.title}](${e.path})`;

// --- digest mode (read-only ticket state map, no views written) ------------
if (DIGEST) {
  const pad = (s, n) => String(s).padEnd(n);
  const KNOWN = ["epic", "story", "task", "bug"];
  const order = [
    ...KNOWN,
    ...[...new Set(entries.map((e) => e.type))].filter((t) => !KNOWN.includes(t)).sort(),
  ];
  const metaCell = (e) => {
    const bits = [];
    if (e.type === "story") {
      if (get(e, "priority")) bits.push(get(e, "priority"));
      if (get(e, "estimate")) bits.push(get(e, "estimate"));
    }
    if (e.type === "bug" && get(e, "severity")) bits.push(get(e, "severity"));
    if (e.type === "task" && get(e, "kind")) bits.push(get(e, "kind"));
    return bits.join(",");
  };
  const lines = [];
  for (const t of order) {
    for (const e of ofType(t)) {
      const parents = parentsOf(e).join(" ");
      lines.push(
        [pad(e.id, 9), pad(e.type, 6), pad(e.status || "-", 9), pad(metaCell(e), 12), parents ? "↑ " + parents : ""]
          .join(" ")
          .trimEnd()
      );
    }
  }
  const n = entries.length;
  if (!n) {
    console.log("# Snap ticket digest: 0 tickets (empty — none created yet).");
  } else {
    console.log(
      `# Snap ticket digest: ${n} ticket${n === 1 ? "" : "s"} — frontmatter only; ` +
        "read a ticket body only when editing it."
    );
    console.log(lines.join("\n"));
  }
  process.exit(0);
}

const L = EN
  ? { board: "Board", backlog: "Backlog", noEdit: "Auto-generated by Snap `/ticket`. Do not edit by hand.",
      todo: "To do", doing: "Doing", review: "Review", done: "Done",
      orphans: "Unparented", id: "ID", type: "Type", title: "Title", status: "Status", links: "Parent", empty: "_None yet._" }
  : { board: "Board", backlog: "Backlog", noEdit: "Généré automatiquement par Snap `/ticket`. Ne pas éditer à la main.",
      todo: "À faire", doing: "En cours", review: "Revue", done: "Terminé",
      orphans: "Sans parent", id: "ID", type: "Type", title: "Titre", status: "Statut", links: "Parent", empty: "_Aucun pour l'instant._" };

const epics = ofType("epic");
const stories = ofType("story");
const tasks = ofType("task");
const bugs = ofType("bug");
const subs = [...tasks, ...bugs].sort(byIdNum);

// --- render BACKLOG.md (hierarchy) -----------------------------------------
const placed = new Set();
const meta = (e) => {
  const bits = [e.status || "—"];
  if (e.type === "story") {
    if (get(e, "priority")) bits.push(get(e, "priority"));
    if (get(e, "estimate")) bits.push(get(e, "estimate"));
  }
  if (e.type === "bug" && get(e, "severity")) bits.push(get(e, "severity"));
  if (e.type === "task" && get(e, "kind")) bits.push(get(e, "kind"));
  return bits.join(" · ");
};

let backlog = `<!-- ${L.noEdit} -->\n# ${L.backlog}\n\n`;
if (!epics.length && !stories.length && !subs.length) backlog += `${L.empty}\n`;

for (const ep of epics) {
  placed.add(ep.id);
  const feat = parentsOf(ep).filter((p) => p.startsWith("FEAT-"));
  const featCell = feat.length ? `  ·  ↑ ${feat.join(", ")}` : "";
  backlog += `## \`${ep.id}\` ${link(ep)}  ·  ${meta(ep)}${featCell}\n\n`;

  const epStories = stories.filter((s) => parentsOf(s).includes(ep.id));
  const epSubs = subs.filter((x) => parentsOf(x).includes(ep.id));
  if (!epStories.length && !epSubs.length) backlog += `${L.empty}\n\n`;

  for (const s of epStories) {
    placed.add(s.id);
    backlog += `- \`${s.id}\` ${link(s)} · ${meta(s)}\n`;
    const stSubs = subs.filter((x) => parentsOf(x).includes(s.id));
    for (const x of stSubs) {
      placed.add(x.id);
      backlog += `  - \`${x.id}\` ${link(x)} · ${meta(x)}\n`;
    }
  }
  // epic-level tasks/bugs (cross-cutting, parented directly to the epic)
  for (const x of epSubs) {
    placed.add(x.id);
    backlog += `- \`${x.id}\` ${link(x)} · ${meta(x)}\n`;
  }
  backlog += "\n";
}

// orphans: anything not placed under an epic/story
const orphans = [...stories, ...subs].filter((e) => !placed.has(e.id)).sort(byIdNum);
if (orphans.length) {
  backlog += `## ${L.orphans}\n\n`;
  for (const e of orphans) backlog += `- \`${e.id}\` ${link(e)} · ${meta(e)}  ·  ↑ ${parentsOf(e).join(", ") || "—"}\n`;
  backlog += "\n";
}

// --- render BOARD.md (kanban by lane) --------------------------------------
const LANE_OF = (status) => {
  if (["doing"].includes(status)) return "doing";
  if (["review"].includes(status)) return "review";
  if (["done", "resolved", "closed"].includes(status)) return "done";
  return "todo"; // backlog, todo, open, ""
};
const LANES = [["todo", L.todo], ["doing", L.doing], ["review", L.review], ["done", L.done]];
const boardItems = [...stories, ...subs]; // epics are containers, shown in BACKLOG

let board = `<!-- ${L.noEdit} -->\n# ${L.board}\n\n`;
for (const [lane, label] of LANES) {
  const rows = boardItems.filter((e) => LANE_OF(e.status) === lane).sort(byIdNum);
  board += `## ${label}\n\n`;
  if (!rows.length) { board += `${L.empty}\n\n`; continue; }
  board += `| ${L.id} | ${L.type} | ${L.title} | ${L.status} | ${L.links} |\n| --- | --- | --- | --- | --- |\n`;
  for (const e of rows) {
    const parent = parentsOf(e).join(", ") || "—";
    board += `| \`${e.id}\` | ${e.type} | ${link(e)} | ${e.status || "—"} | ${parent} |\n`;
  }
  board += "\n";
}

// --- write -----------------------------------------------------------------
try {
  writeFileSync(join(ticketsDir, "BACKLOG.md"), backlog);
  writeFileSync(join(ticketsDir, "BOARD.md"), board);
  const n = entries.length;
  console.log(`[snap] build-board: wrote BACKLOG.md + BOARD.md (${n} ticket${n === 1 ? "" : "s"}).`);
} catch (err) {
  console.warn(`[snap] build-board warning: could not write views: ${err.message}`);
}
