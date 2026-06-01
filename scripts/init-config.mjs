/**
 * Snap — init-config.mjs
 *
 * Applies explicit values to snap.config.json (Node ESM, no deps). Complements
 * bootstrap-config.mjs — which only ensures defaults exist: this one MERGES the
 * values chosen in /snap:init into the config and validates the enums. Existing
 * keys (e.g. providers) are preserved.
 *
 * Usage: node init-config.mjs <projectDir> [--language fr|en] [--docsPath <path>]
 *          [--ticketsPath <path>] [--docProvider repository|notion|affine]
 *          [--ticketsProvider repository|github-projects|jira]
 *          [--repoProvider github|gitlab|auto] [--developMode gate|autonomous]
 *          [--reviewDimensions correctness,security,conventions,quality]
 *          [--remoteJson <path>] [--wireframeProvider penpot|figma]
 *          [--designProvider penpot|figma] [--dsExportPath <path>]
 *          [--designInteractive static|prototype]
 *   projectDir defaults to $CLAUDE_PROJECT_DIR, then process.cwd().
 *   --remoteJson merges a small JSON file (written by the snap-provisioner agent)
 *     into config.remote — the non-secret locators of a remote backend (Notion db
 *     ids, Jira project key, GitHub project). File transport keeps the deterministic
 *     write path; no token is ever accepted here (D-027).
 *
 * Never throws on a recoverable error: a failed write must not block the skill.
 * Problems are reported on stderr as warnings.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--language") out.language = argv[++i];
    else if (a === "--docsPath") out.docsPath = argv[++i];
    else if (a === "--ticketsPath") out.ticketsPath = argv[++i];
    else if (a === "--docProvider") out.docProvider = argv[++i];
    else if (a === "--ticketsProvider") out.ticketsProvider = argv[++i];
    else if (a === "--repoProvider") out.repoProvider = argv[++i];
    else if (a === "--developMode") out.developMode = argv[++i];
    else if (a === "--reviewDimensions") out.reviewDimensions = argv[++i];
    else if (a === "--remoteJson") out.remoteJson = argv[++i];
    else if (a === "--wireframeProvider") out.wireframeProvider = argv[++i];
    else if (a === "--designProvider") out.designProvider = argv[++i];
    else if (a === "--dsExportPath") out.dsExportPath = argv[++i];
    else if (a === "--designInteractive") out.designInteractive = argv[++i];
    else out._.push(a);
  }
  return out;
}

const argv = parseArgs(process.argv.slice(2));
const projectDir = resolve(argv._[0] || process.env.CLAUDE_PROJECT_DIR || process.cwd());

// Kept in sync with bootstrap-config.mjs DEFAULT_CONFIG.
const DEFAULT_CONFIG = {
  version: 1,
  language: "fr",
  docsPath: "docs/product/",
  ticketsPath: "docs/delivery/",
  providers: {
    doc: "repository",
    tickets: "repository",
    repository: null,
    wireframe: "penpot",
    design: "penpot",
  },
  define: { order: "vision-first", validation: "status-checklist" },
  ticket: { hierarchy: "epic-story-task-bug", validation: "status-checklist" },
  wireframe: { fidelity: "lo-fi", target: "mcp" },
  ds: { target: "mcp", tokenFormat: "dtcg", exportPath: null },
  design: { target: "mcp", fidelity: "hi-fi", interactive: "static" },
  develop: { mode: "gate" },
  review: { dimensions: ["correctness", "security", "conventions", "quality"] },
};

const configPath = join(projectDir, "snap.config.json");
let config = { ...DEFAULT_CONFIG };
if (existsSync(configPath)) {
  try {
    config = { ...DEFAULT_CONFIG, ...JSON.parse(readFileSync(configPath, "utf8")) };
  } catch (err) {
    console.warn(`[snap] init: existing config unreadable, using defaults: ${err.message}`);
  }
}

const changes = [];

if (argv.language != null) {
  const lang = String(argv.language).toLowerCase();
  if (lang === "fr" || lang === "en") {
    if (config.language !== lang) { config.language = lang; changes.push(`language=${lang}`); }
  } else {
    console.warn(`[snap] init: ignored invalid --language "${argv.language}" (expected fr|en).`);
  }
}

if (argv.docsPath != null) {
  let p = String(argv.docsPath).trim().split("\\").join("/");
  if (p !== "") {
    if (!p.endsWith("/")) p += "/";
    if (config.docsPath !== p) { config.docsPath = p; changes.push(`docsPath=${p}`); }
  }
}

if (argv.ticketsPath != null) {
  let p = String(argv.ticketsPath).trim().split("\\").join("/");
  if (p !== "") {
    if (!p.endsWith("/")) p += "/";
    if (config.ticketsPath !== p) { config.ticketsPath = p; changes.push(`ticketsPath=${p}`); }
  }
}

const DOC_PROVIDERS = ["repository", "notion", "affine"];
const TICKETS_PROVIDERS = ["repository", "github-projects", "jira"];
function ensureProviders() {
  if (config.providers == null || typeof config.providers !== "object")
    config.providers = { ...DEFAULT_CONFIG.providers };
}

if (argv.docProvider != null) {
  const p = String(argv.docProvider).toLowerCase();
  if (DOC_PROVIDERS.includes(p)) {
    ensureProviders();
    if (config.providers.doc !== p) { config.providers.doc = p; changes.push(`providers.doc=${p}`); }
  } else {
    console.warn(`[snap] init: ignored invalid --docProvider "${argv.docProvider}" (expected ${DOC_PROVIDERS.join("|")}).`);
  }
}

if (argv.ticketsProvider != null) {
  const p = String(argv.ticketsProvider).toLowerCase();
  if (TICKETS_PROVIDERS.includes(p)) {
    ensureProviders();
    if (config.providers.tickets !== p) { config.providers.tickets = p; changes.push(`providers.tickets=${p}`); }
  } else {
    console.warn(`[snap] init: ignored invalid --ticketsProvider "${argv.ticketsProvider}" (expected ${TICKETS_PROVIDERS.join("|")}).`);
  }
}

const REPO_PROVIDERS = ["github", "gitlab"];
if (argv.repoProvider != null) {
  const raw = String(argv.repoProvider).trim().toLowerCase();
  if (raw === "" || raw === "null" || raw === "auto") {
    ensureProviders();
    if (config.providers.repository !== null) { config.providers.repository = null; changes.push(`providers.repository=null`); }
  } else if (REPO_PROVIDERS.includes(raw)) {
    ensureProviders();
    if (config.providers.repository !== raw) { config.providers.repository = raw; changes.push(`providers.repository=${raw}`); }
  } else {
    console.warn(`[snap] init: ignored invalid --repoProvider "${argv.repoProvider}" (expected ${REPO_PROVIDERS.join("|")}|auto).`);
  }
}

const DEVELOP_MODES = ["gate", "autonomous"];
if (argv.developMode != null) {
  const m = String(argv.developMode).toLowerCase();
  if (DEVELOP_MODES.includes(m)) {
    if (config.develop == null || typeof config.develop !== "object") config.develop = { ...DEFAULT_CONFIG.develop };
    if (config.develop.mode !== m) { config.develop.mode = m; changes.push(`develop.mode=${m}`); }
  } else {
    console.warn(`[snap] init: ignored invalid --developMode "${argv.developMode}" (expected ${DEVELOP_MODES.join("|")}).`);
  }
}

const REVIEW_DIMENSIONS = ["correctness", "security", "conventions", "quality"];
if (argv.reviewDimensions != null) {
  const picked = String(argv.reviewDimensions)
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d !== "");
  const valid = picked.filter((d) => REVIEW_DIMENSIONS.includes(d));
  const invalid = picked.filter((d) => !REVIEW_DIMENSIONS.includes(d));
  for (const d of invalid) {
    console.warn(`[snap] init: ignored invalid review dimension "${d}" (expected ${REVIEW_DIMENSIONS.join("|")}).`);
  }
  // de-dupe, preserve canonical order
  const dims = REVIEW_DIMENSIONS.filter((d) => valid.includes(d));
  if (dims.length) {
    if (config.review == null || typeof config.review !== "object") config.review = { ...DEFAULT_CONFIG.review };
    if (JSON.stringify(config.review.dimensions) !== JSON.stringify(dims)) {
      config.review.dimensions = dims;
      changes.push(`review.dimensions=[${dims.join(",")}]`);
    }
  }
}

// Merge provisioning output (non-secret locators) into config.remote via a file
// the snap-provisioner wrote — keeps the deterministic write path; rejects tokens.
if (argv.remoteJson != null) {
  try {
    const parsed = JSON.parse(readFileSync(resolve(projectDir, argv.remoteJson), "utf8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      if (config.remote == null || typeof config.remote !== "object") config.remote = {};
      for (const key of ["notion", "affine", "jira", "githubProjects"]) {
        if (parsed[key] && typeof parsed[key] === "object") {
          config.remote[key] = { ...(config.remote[key] || {}), ...parsed[key] };
          changes.push(`remote.${key}`);
        }
      }
    } else {
      console.warn("[snap] init: --remoteJson must be a JSON object; ignored.");
    }
  } catch (err) {
    console.warn(`[snap] init: could not read --remoteJson "${argv.remoteJson}": ${err.message}`);
  }
}

if (argv.wireframeProvider != null) {
  const prov = String(argv.wireframeProvider).toLowerCase();
  if (prov === "penpot" || prov === "figma") {
    if (config.providers == null || typeof config.providers !== "object") {
      config.providers = { ...DEFAULT_CONFIG.providers };
    }
    if (config.providers.wireframe !== prov) {
      config.providers.wireframe = prov;
      changes.push(`providers.wireframe=${prov}`);
    }
  } else {
    console.warn(`[snap] init: ignored invalid --wireframeProvider "${argv.wireframeProvider}" (expected penpot|figma).`);
  }
}

if (argv.designProvider != null) {
  const prov = String(argv.designProvider).toLowerCase();
  if (prov === "penpot" || prov === "figma") {
    if (config.providers == null || typeof config.providers !== "object") {
      config.providers = { ...DEFAULT_CONFIG.providers };
    }
    if (config.providers.design !== prov) {
      config.providers.design = prov;
      changes.push(`providers.design=${prov}`);
    }
  } else {
    console.warn(`[snap] init: ignored invalid --designProvider "${argv.designProvider}" (expected penpot|figma).`);
  }
}

if (argv.dsExportPath != null) {
  if (config.ds == null || typeof config.ds !== "object") {
    config.ds = { ...DEFAULT_CONFIG.ds };
  }
  const raw = String(argv.dsExportPath).trim();
  if (raw === "" || raw.toLowerCase() === "null") {
    if (config.ds.exportPath !== null) { config.ds.exportPath = null; changes.push(`ds.exportPath=null`); }
  } else {
    let p = raw.split("\\").join("/");
    if (!p.endsWith("/")) p += "/";
    if (config.ds.exportPath !== p) { config.ds.exportPath = p; changes.push(`ds.exportPath=${p}`); }
  }
}

if (argv.designInteractive != null) {
  const mode = String(argv.designInteractive).toLowerCase();
  if (mode === "static" || mode === "prototype") {
    if (config.design == null || typeof config.design !== "object") {
      config.design = { ...DEFAULT_CONFIG.design };
    }
    if (config.design.interactive !== mode) {
      config.design.interactive = mode;
      changes.push(`design.interactive=${mode}`);
    }
  } else {
    console.warn(`[snap] init: ignored invalid --designInteractive "${argv.designInteractive}" (expected static|prototype).`);
  }
}

try {
  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
  console.log(
    changes.length
      ? `[snap] init: config set (${changes.join(", ")}).`
      : `[snap] init: config unchanged (already up to date).`
  );
} catch (err) {
  console.warn(`[snap] init warning: could not write snap.config.json: ${err.message}`);
}
