/**
 * Snap — entities.mjs
 *
 * Shared entity loader for the ports & adapters core (Node ESM, no deps).
 * Materializes the normalized entity model decided in D-028 and used by every
 * deterministic script (`build-index`, `build-board`, `lint-docs`, `lint-tickets`)
 * — the seam that lets the same validator / view-generator run on a repo source
 * (local Markdown) OR a remote source (Notion / AFFiNE / Jira / GitHub Projects)
 * fetched by an agent and handed over as a normalized JSON file.
 *
 * Normalized entity (D-028):
 *   {
 *     id,    // String | null  — fm.id, hoisted for convenience
 *     type,  // String | null  — fm.type, hoisted
 *     fm,    // Object | null  — raw parsed frontmatter, kept verbatim
 *     body?, // String         — present iff withBody (lint + write need it; views/digest skip it)
 *     source: { provider, ref } // "repo" + .md path | "notion" + page-id | "jira" + issue-key | …
 *   }
 *
 * Two loaders, one shape:
 *   - loadFromFs(dir, {withBody, skip}) — the disk walk (readdirSync + parseDoc),
 *     factored out of the duplicated loops in build-index / lint-docs.
 *   - loadFromJson(path) — the scratch file an agent writes after a remote MCP
 *     fetch (the `--from-json` transport, D-028 point 2). Same normalized shape.
 *
 * No throw on a recoverable error: a missing dir yields [] (never blocks a skill).
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseDoc } from "./frontmatter.mjs";

const nonEmpty = (v) => (v != null && v !== "" ? String(v) : null);

/** Build a normalized entity from parsed frontmatter + body + source. */
export function toEntity(data, body, source, withBody = false) {
  const ent = {
    id: data ? nonEmpty(data.id) : null,
    type: data ? nonEmpty(data.type) : null,
    fm: data || null,
    source,
  };
  if (withBody) ent.body = body == null ? "" : String(body);
  return ent;
}

/**
 * Load every Markdown entity under `dir` as normalized entities.
 * @param {string} dir absolute directory
 * @param {{withBody?:boolean, skip?:string[]}} opts
 *   withBody: also carry the body (lint + write); default false (views + digest).
 *   skip: basenames to ignore (generated views — INDEX.md, BOARD.md, …).
 * Entities with no/invalid frontmatter are kept (id/type null, fm null) so the
 * linter can still report "no frontmatter"; the view generators filter them out.
 */
export function loadFromFs(dir, { withBody = false, skip = [] } = {}) {
  const out = [];
  if (!existsSync(dir)) return out;
  const skipSet = new Set(skip);
  let rels;
  try {
    rels = readdirSync(dir, { recursive: true });
  } catch {
    return out;
  }
  for (const rel of rels) {
    const relStr = String(rel).split("\\").join("/");
    if (!relStr.endsWith(".md")) continue;
    if (skipSet.has(relStr.split("/").pop())) continue;
    let text;
    try {
      text = readFileSync(join(dir, relStr), "utf8");
    } catch {
      continue;
    }
    const { data, body } = parseDoc(text);
    out.push(toEntity(data, body, { provider: "repo", ref: relStr }, withBody));
  }
  return out;
}

/**
 * Parse a normalized state file written by an agent after a remote fetch.
 * Accepts either a bare array of entities or a wrapper
 *   { entities: [...], externalIds?: [...] }
 * (externalIds lets a ticket lint resolve cross-root links — FEAT- / PER- — when
 * the doc base lives on another provider; absent ⇒ resolved from disk by caller).
 * @returns {{entities: object[], externalIds: string[]}}
 */
export function parseStateFile(path) {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const list = Array.isArray(raw)
    ? raw
    : raw && Array.isArray(raw.entities)
    ? raw.entities
    : [];
  const entities = list.map((e) => {
    const fm = e && e.fm && typeof e.fm === "object" ? e.fm : null;
    const src = e && e.source && typeof e.source === "object" ? e.source : {};
    const ent = {
      id: nonEmpty(e && e.id) ?? (fm ? nonEmpty(fm.id) : null),
      type: nonEmpty(e && e.type) ?? (fm ? nonEmpty(fm.type) : null),
      fm,
      source: {
        provider: String(src.provider || "unknown"),
        ref: src.ref == null ? "" : String(src.ref),
      },
    };
    if (e && "body" in e) ent.body = e.body == null ? "" : String(e.body);
    return ent;
  });
  const externalIds =
    raw && Array.isArray(raw.externalIds) ? raw.externalIds.map(String) : [];
  return { entities, externalIds };
}

/** Load normalized entities from a scratch JSON file (D-028 `--from-json`). */
export function loadFromJson(path) {
  return parseStateFile(path).entities;
}

// --- self-test (node entities.mjs --selftest) -------------------------------
// Round-trips both loaders against a throwaway fixture in the OS temp dir and
// asserts they yield the same normalized shape. Self-contained (no repo state).
if (process.argv.includes("--selftest")) {
  const { mkdtempSync, writeFileSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const assert = (cond, msg) => {
    if (!cond) {
      console.error(`FAIL: ${msg}`);
      process.exit(1);
    }
  };

  const dir = mkdtempSync(join(tmpdir(), "snap-entities-"));
  try {
    writeFileSync(
      join(dir, "FEAT-001-x.md"),
      "---\nid: FEAT-001\ntype: feature\ntitle: X\nstatus: ready\n---\n\n## Body\nhello\n"
    );
    writeFileSync(join(dir, "INDEX.md"), "# generated, no frontmatter\n");
    writeFileSync(join(dir, "broken.md"), "no frontmatter here\n");

    // loadFromFs without body, skipping the generated view
    const fs1 = loadFromFs(dir, { skip: ["INDEX.md"] });
    assert(fs1.length === 2, `fs: expected 2 entities, got ${fs1.length}`);
    const feat = fs1.find((e) => e.id === "FEAT-001");
    assert(feat && feat.type === "feature", "fs: FEAT-001 type");
    assert(feat.source.provider === "repo", "fs: provider repo");
    assert(feat.source.ref === "FEAT-001-x.md", "fs: ref = path");
    assert(!("body" in feat), "fs: no body when withBody=false");
    const broken = fs1.find((e) => e.source.ref === "broken.md");
    assert(broken && broken.id === null && broken.fm === null, "fs: broken kept with null id");

    // loadFromFs with body
    const fs2 = loadFromFs(dir, { withBody: true, skip: ["INDEX.md"] });
    const feat2 = fs2.find((e) => e.id === "FEAT-001");
    assert(feat2.body.includes("hello"), "fs: body carried when withBody=true");

    // loadFromJson — bare array + wrapper + externalIds
    const jsonPath = join(dir, "state.json");
    writeFileSync(
      jsonPath,
      JSON.stringify({
        entities: [
          {
            id: "FEAT-001",
            type: "feature",
            fm: { id: "FEAT-001", type: "feature", title: "X", status: "ready" },
            body: "## Body\nhello",
            source: { provider: "notion", ref: "page-abc" },
          },
        ],
        externalIds: ["PER-001"],
      })
    );
    const { entities, externalIds } = parseStateFile(jsonPath);
    assert(entities.length === 1, "json: 1 entity");
    assert(entities[0].source.provider === "notion", "json: provider notion");
    assert(entities[0].source.ref === "page-abc", "json: ref = page-id");
    assert(entities[0].body.includes("hello"), "json: body carried");
    assert(externalIds[0] === "PER-001", "json: externalIds");

    console.log("[snap] entities self-test: OK");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
