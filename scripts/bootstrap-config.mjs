/**
 * Snap — bootstrap-config.mjs
 *
 * Cross-platform config bootstrapper (Node ESM, no deps). NOT run automatically:
 * config setup is manual via /snap:init. The Snap skills also call this as a
 * self-heal safety net when they find snap.config.json missing. It never runs on
 * SessionStart — Snap must not write config into projects that don't use it.
 *
 * Responsibilities (idempotent):
 *   1. Create snap.config.json (default) if absent.
 *   2. Create .env.example (documented template) if absent.
 *   3. Guard: ensure ".env" is listed in .gitignore (anti-leak, D-006).
 *
 * Usage: node bootstrap-config.mjs [projectDir]
 *   projectDir defaults to $CLAUDE_PROJECT_DIR, then process.cwd().
 *
 * Never throws on a recoverable error: a failed bootstrap must not block the
 * session. Problems are reported on stderr as warnings.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const projectDir = resolve(
  process.argv[2] || process.env.CLAUDE_PROJECT_DIR || process.cwd()
);

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
  define: {
    order: "vision-first",
    validation: "status-checklist",
  },
  ticket: {
    hierarchy: "epic-story-task-bug",
    validation: "status-checklist",
  },
  wireframe: {
    fidelity: "lo-fi",
    target: "mcp",
  },
  ds: {
    target: "mcp",
    tokenFormat: "dtcg",
    exportPath: null,
  },
  design: {
    target: "mcp",
    fidelity: "hi-fi",
    interactive: "static",
  },
  develop: {
    mode: "gate",
  },
  review: {
    dimensions: ["correctness", "security", "conventions", "quality"],
  },
  tests: {
    levels: ["unit", "integration", "e2e"],
    maxIterations: 3,
  },
  qa: {
    surfaces: ["web", "api", "cli"],
  },
  fulldev: {
    mode: "gate",
    maxCycles: 5,
    maxPerGate: 3,
  },
};

const ENV_EXAMPLE = `# Snap — secrets template (copy to .env, keep .env out of git).
# No secret is required when providers.doc / providers.tickets = "repository"
# (artifacts live in the repo). A remote backend reaches its tool through an MCP
# server (D-027); only the tool's TOKEN is a secret and lives here. The non-secret
# locators it provisions (Notion database ids, Jira project key, GitHub project) go
# into snap.config.json under "remote" — never a token there or in .mcp.json.
#
# providers.doc: notion        → NOTION_TOKEN
# providers.tickets: jira       → JIRA_API_TOKEN
# providers.tickets: github-projects → GITHUB_TOKEN
# NOTION_TOKEN=
# JIRA_API_TOKEN=
# GITHUB_TOKEN=
#
# /develop (routed by providers.repository) opens a draft PR/MR through the gh/glab
# CLI. Authenticate once (gh auth login / glab auth login) OR set the token here; the
# CLI picks it up. A token never goes into snap.config.json or .mcp.json (D-033).
# providers.repository: github  → GITHUB_TOKEN (or gh auth)
# providers.repository: gitlab  → GITLAB_TOKEN (or glab auth)
# GITLAB_TOKEN=
#
# /wireframe (routed by providers.wireframe) and /ds + /design (routed by
# providers.design) all drive the design tool through its MCP server (see .mcp.json):
#   Penpot (default): run a local MCP server and keep a Penpot tab open, OR
#     point at a hosted endpoint + token.
# PENPOT_MCP_URL=http://localhost:4401/mcp
# PENPOT_ACCESS_TOKEN=
#   Figma: the hosted MCP server uses OAuth (no token here); write needs a paid plan.
# FIGMA_MCP_URL=https://mcp.figma.com/mcp
`;

const changes = [];
const warnings = [];

// 1. snap.config.json
const configPath = join(projectDir, "snap.config.json");
if (!existsSync(configPath)) {
  try {
    writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n");
    changes.push("created snap.config.json");
  } catch (err) {
    warnings.push(`could not create snap.config.json: ${err.message}`);
  }
}

// 2. .env.example
const envExamplePath = join(projectDir, ".env.example");
if (!existsSync(envExamplePath)) {
  try {
    writeFileSync(envExamplePath, ENV_EXAMPLE);
    changes.push("created .env.example");
  } catch (err) {
    warnings.push(`could not create .env.example: ${err.message}`);
  }
}

// 3. .gitignore guard — ensure ".env" (secrets, D-006) and ".snap/" (remote scratch,
//    D-028) are ignored.
const gitignorePath = join(projectDir, ".gitignore");
const NEEDED = [
  { pats: [".env", "/.env"], line: ".env" },
  { pats: [".snap/", ".snap", "/.snap/", "/.snap"], line: ".snap/" },
];
try {
  const had = existsSync(gitignorePath);
  let content = had ? readFileSync(gitignorePath, "utf8") : "";
  const lines = content.split(/\r?\n/).map((l) => l.trim());
  const missing = NEEDED.filter((n) => !n.pats.some((p) => lines.includes(p)));
  if (missing.length) {
    const sep = content === "" || content.endsWith("\n") ? "" : "\n";
    content += `${sep}\n# Snap — local secrets + scratch\n${missing.map((m) => m.line).join("\n")}\n`;
    writeFileSync(gitignorePath, content);
    changes.push(`${had ? "updated" : "created"} .gitignore (+ ${missing.map((m) => m.line).join(", ")})`);
  }
} catch (err) {
  warnings.push(`could not update .gitignore: ${err.message}`);
}

// Report only when something happened (quiet on a clean session).
if (changes.length) {
  console.log(`[snap] bootstrap: ${changes.join(", ")}.`);
}
for (const w of warnings) {
  console.warn(`[snap] bootstrap warning: ${w}`);
}
