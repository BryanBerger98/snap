/**
 * Snap — frontmatter.mjs
 *
 * Minimal YAML-frontmatter parser for the subset Snap emits (Node ESM, no deps).
 * Plugin-shared infrastructure: imported by every skill's scripts (`/define`'s
 * build-index + lint-docs, `/ticket`'s build-board + lint-tickets). Handles
 * scalars, quoted strings, inline arrays `[a, b]`, block sequences (`- item`),
 * nested maps (`links:`), and inline flow-maps `{ k: v }`.
 */

export const indentOf = (l) => l.length - l.trimStart().length;

export function unquote(s) {
  const t = s.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1);
  }
  return t;
}

// Split on top-level commas only (ignore commas inside [] or {}).
export function splitTopLevel(s) {
  const out = [];
  let depth = 0, buf = "";
  for (const ch of s) {
    if (ch === "[" || ch === "{") depth++;
    else if (ch === "]" || ch === "}") depth--;
    if (ch === "," && depth === 0) { out.push(buf); buf = ""; }
    else buf += ch;
  }
  if (buf.trim() !== "") out.push(buf);
  return out;
}

export function parseScalar(v) {
  const s = v.trim();
  if (s === "" || s === "null" || s === "~") return s === "" ? "" : null;
  if (s.startsWith("[") && s.endsWith("]")) {
    return splitTopLevel(s.slice(1, -1))
      .map((x) => unquote(x))
      .filter((x) => x !== "");
  }
  if (s.startsWith("{") && s.endsWith("}")) {
    const obj = {};
    for (const pair of splitTopLevel(s.slice(1, -1))) {
      const m = pair.match(/^\s*([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
      if (m) obj[m[1]] = parseScalar(m[2]);
    }
    return obj;
  }
  return unquote(s);
}

// Indentation-aware recursive descent.
function parseNode(lines, i, end, indent) {
  const map = {};
  let seq = null;
  while (i < end) {
    const raw = lines[i];
    if (!raw.trim() || raw.trim().startsWith("#")) { i++; continue; }
    const ind = indentOf(raw);
    if (ind < indent) break;
    if (ind > indent) { i++; continue; }
    const t = raw.trim();
    if (t.startsWith("- ")) {
      if (!seq) seq = [];
      seq.push(unquote(t.slice(2)));
      i++;
      continue;
    }
    const m = t.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) { i++; continue; }
    const key = m[1];
    const rest = m[2];
    if (rest === "") {
      let j = i + 1;
      while (j < end && !lines[j].trim()) j++;
      if (j < end && indentOf(lines[j]) > indent) {
        const [val, ni] = parseNode(lines, i + 1, end, indentOf(lines[j]));
        map[key] = val;
        i = ni;
      } else {
        map[key] = null;
        i++;
      }
    } else {
      map[key] = parseScalar(rest);
      i++;
    }
  }
  return [seq !== null ? seq : map, i];
}

// Parse a document into { data, body }. data is null when no frontmatter.
export function parseDoc(text) {
  const norm = text.replace(/^﻿/, "");
  if (!norm.startsWith("---")) return { data: null, body: norm };
  const lines = norm.split(/\r?\n/);
  let close = -1;
  for (let k = 1; k < lines.length; k++) {
    if (lines[k].trim() === "---" || lines[k].trim() === "...") { close = k; break; }
  }
  if (close === -1) return { data: null, body: norm };
  const [data] = parseNode(lines, 1, close, 0);
  return { data, body: lines.slice(close + 1).join("\n") };
}

export const readFrontmatter = (text) => parseDoc(text).data;

export const toArr = (v) => (Array.isArray(v) ? v : v == null || v === "" ? [] : [v]);
