/**
 * Snap — tokens-codec.mjs
 *
 * Deterministic design-token format codec (Node ESM, no deps). The /ds skill keeps
 * the design system canonical IN THE DESIGN TOOL (Penpot/Figma, via MCP); this codec
 * is the bridge to/from CODE only:
 *   - import  : read the user's code tokens (CSS custom properties or DTCG JSON) and
 *               normalize them to the canonical W3C DTCG model, ready to author in-tool.
 *   - export  : take the DTCG model (read back from the tool) and emit code —
 *               CSS custom properties or a Tailwind theme — into the user's app.
 *
 * Canonical model = W3C Design Tokens Community Group (DTCG): nested groups, `$type`
 * (inherited from the enclosing group), `$value` (scalar, alias `{a.b.c}`, or a shadow
 * object). This file owns the format conversions; the tool I/O is the skill's job.
 *
 * Usage:
 *   node tokens-codec.mjs --from <dtcg|css> --to <dtcg|css|tailwind> [--in <file>] [--out <file>]
 *   node tokens-codec.mjs --selftest        # round-trip a built-in fixture, exit 0/1
 *
 * Conventions / limits (v1, documented on purpose):
 *   - A token path maps to a CSS var name by joining segments with "-" (and back by
 *     splitting on "-"). Keep each path segment dash-free for a clean round-trip.
 *   - `from tailwind` is NOT supported: a tailwind.config.js is arbitrary JS, not parseable
 *     without executing it. Import from Tailwind v4 `@theme { --x: ... }` instead (it is CSS
 *     custom properties → use `--from css`).
 *   - Scalar types round-trip both ways (color, dimension, fontFamily, fontWeight, number,
 *     duration, cubicBezier). `shadow` composes one-way (DTCG → CSS box-shadow).
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";

/* ------------------------------------------------------------------ parsing args */

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--from") out.from = argv[++i];
    else if (a === "--to") out.to = argv[++i];
    else if (a === "--in") out.in = argv[++i];
    else if (a === "--out") out.out = argv[++i];
    else if (a === "--selftest") out.selftest = true;
    else out._.push(a);
  }
  return out;
}

/* --------------------------------------------------------------- value detection */

const RE_ALIAS = /^\{([^}]+)\}$/;
const RE_HEX = /^#([0-9a-fA-F]{3,8})$/;
const RE_FUNC_COLOR = /^(rgb|rgba|hsl|hsla|oklch|color)\(/i;
const RE_DIMENSION = /^-?\d*\.?\d+(px|rem|em|%|vh|vw|vmin|vmax|pt|ch)$/;
const RE_DURATION = /^-?\d*\.?\d+(ms|s)$/;
const RE_NUMBER = /^-?\d*\.?\d+$/;
const RE_VAR = /^var\(\s*--([a-zA-Z0-9-]+)\s*\)$/;

function isColor(v) {
  return typeof v === "string" && (RE_HEX.test(v) || RE_FUNC_COLOR.test(v));
}

function inferType(value) {
  if (typeof value !== "string") return undefined;
  if (RE_ALIAS.test(value)) return undefined; // alias: type comes from the target
  if (isColor(value)) return "color";
  if (RE_DURATION.test(value)) return "duration";
  if (RE_DIMENSION.test(value)) return "dimension";
  if (RE_NUMBER.test(value)) return "number";
  return undefined; // unknown scalar (e.g. fontFamily string) — left untyped
}

/* ----------------------------------------------------- DTCG <-> flat token list */

// Flatten a DTCG object into [{ path:[...], type, value }]. `$type` inherits down groups.
function dtcgToTokens(obj, path = [], inheritedType = undefined, acc = []) {
  const type = obj.$type ?? inheritedType;
  if (Object.prototype.hasOwnProperty.call(obj, "$value")) {
    acc.push({ path, type, value: obj.$value });
    return acc;
  }
  for (const key of Object.keys(obj)) {
    if (key.startsWith("$")) continue; // $type, $description, $extensions…
    const child = obj[key];
    if (child && typeof child === "object") {
      dtcgToTokens(child, [...path, key], type, acc);
    }
  }
  return acc;
}

function setNested(root, path, leaf) {
  let node = root;
  for (let i = 0; i < path.length - 1; i++) {
    const seg = path[i];
    if (node[seg] == null || typeof node[seg] !== "object") node[seg] = {};
    node = node[seg];
  }
  node[path[path.length - 1]] = leaf;
}

// Rebuild a DTCG object from a flat token list (each leaf carries $type + $value).
function tokensToDtcg(tokens) {
  const root = {};
  for (const t of tokens) {
    const leaf = {};
    if (t.type) leaf.$type = t.type;
    leaf.$value = t.value;
    setNested(root, t.path, leaf);
  }
  return root;
}

/* ----------------------------------------------------------------- CSS emit/parse */

function aliasToCssVar(ref) {
  return `var(--${ref.split(".").join("-")})`;
}

function cssVarToAlias(name) {
  return `{${name.split("-").join(".")}}`;
}

function shadowToCss(v) {
  const parts = [v.offsetX, v.offsetY, v.blur, v.spread, v.color].filter((p) => p != null && p !== "");
  return parts.join(" ");
}

function tokenValueToCss(t) {
  const v = t.value;
  if (typeof v === "string") {
    const m = v.match(RE_ALIAS);
    return m ? aliasToCssVar(m[1]) : v;
  }
  if (t.type === "shadow" && v && typeof v === "object") return shadowToCss(v);
  return String(v);
}

function tokensToCss(tokens) {
  const lines = tokens.map((t) => `  --${t.path.join("-")}: ${tokenValueToCss(t)};`);
  return `:root {\n${lines.join("\n")}\n}\n`;
}

function cssToTokens(css) {
  const tokens = [];
  const re = /--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    const name = m[1];
    const raw = m[2].trim();
    const path = name.split("-");
    const varRef = raw.match(RE_VAR);
    if (varRef) {
      tokens.push({ path, type: undefined, value: cssVarToAlias(varRef[1]) });
    } else {
      tokens.push({ path, type: inferType(raw), value: raw });
    }
  }
  return tokens;
}

/* -------------------------------------------------------------- Tailwind emit only */

// Map a DTCG $type to the Tailwind theme scale that consumes it.
const TYPE_TO_TW_SCALE = {
  color: "colors",
  dimension: "spacing",
  fontFamily: "fontFamily",
  fontFamilies: "fontFamily",
  fontWeight: "fontWeight",
  duration: "transitionDuration",
  number: "spacing",
};

function tokensToTailwind(tokens) {
  const extend = {};
  for (const t of tokens) {
    const scale = TYPE_TO_TW_SCALE[t.type] || "extend";
    if (extend[scale] == null) extend[scale] = {};
    // Drop the leading category segment (the scale already encodes it); keep the rest.
    let rest = t.path.slice(1);
    if (rest.length === 0) rest = [t.path[0]];
    let value = t.value;
    if (typeof value === "string") {
      const m = value.match(RE_ALIAS);
      if (m) value = aliasToCssVar(m[1]);
    }
    setNested(extend[scale], rest, value);
  }
  return { theme: { extend } };
}

/* ---------------------------------------------------------------------- pipeline */

function decode(from, text) {
  if (from === "dtcg") return dtcgToTokens(JSON.parse(text));
  if (from === "css") return cssToTokens(text);
  throw new Error(`unsupported --from "${from}" (expected dtcg|css)`);
}

function encode(to, tokens) {
  if (to === "dtcg") return JSON.stringify(tokensToDtcg(tokens), null, 2) + "\n";
  if (to === "css") return tokensToCss(tokens);
  if (to === "tailwind") return JSON.stringify(tokensToTailwind(tokens), null, 2) + "\n";
  throw new Error(`unsupported --to "${to}" (expected dtcg|css|tailwind)`);
}

/* ----------------------------------------------------------------------- selftest */

const FIXTURE = {
  color: {
    $type: "color",
    primary: { 500: { $value: "#0066ff" } },
    action: { background: { $value: "{color.primary.500}" } },
  },
  spacing: {
    $type: "dimension",
    sm: { $value: "8px" },
    md: { $value: "16px" },
  },
  font: {
    weight: { $type: "fontWeight", bold: { $value: 700 } },
  },
};

function selftest() {
  const t0 = dtcgToTokens(FIXTURE);
  // Round-trip: DTCG -> CSS -> DTCG must preserve paths, scalar values, and aliases.
  const css = tokensToCss(t0);
  const t1 = cssToTokens(css);
  const norm = (arr) =>
    arr
      .map((t) => `${t.path.join(".")}=${typeof t.value === "object" ? JSON.stringify(t.value) : t.value}`)
      .sort()
      .join("\n");
  const errors = [];
  if (norm(t0) !== norm(t1)) {
    errors.push("DTCG -> CSS -> DTCG round-trip changed values:\n--- before ---\n" + norm(t0) + "\n--- after ---\n" + norm(t1));
  }
  // Alias must survive as a CSS var and decode back to a {ref}.
  if (!css.includes("var(--color-primary-500)")) errors.push("alias did not emit as var(--color-primary-500)");
  const back = t1.find((t) => t.path.join(".") === "color.action.background");
  if (!back || back.value !== "{color.primary.500}") errors.push("CSS var did not decode back to {color.primary.500}");
  // Tailwind emit must place the color under theme.extend.colors.primary.500.
  const tw = tokensToTailwind(t0);
  if (tw?.theme?.extend?.colors?.primary?.["500"] !== "#0066ff") errors.push("tailwind emit missing colors.primary.500");
  if (errors.length) {
    console.error("[snap] tokens-codec selftest FAILED:\n" + errors.join("\n"));
    process.exit(1);
  }
  console.log("[snap] tokens-codec selftest OK (DTCG<->CSS round-trip + alias + tailwind emit).");
}

/* --------------------------------------------------------------------------- main */

const argv = parseArgs(process.argv.slice(2));

if (argv.selftest) {
  selftest();
} else {
  if (!argv.from || !argv.to) {
    console.error("usage: node tokens-codec.mjs --from <dtcg|css> --to <dtcg|css|tailwind> [--in <file>] [--out <file>] | --selftest");
    process.exit(2);
  }
  let input = "";
  if (argv.in) {
    if (!existsSync(argv.in)) {
      console.error(`[snap] tokens-codec: input file not found: ${argv.in}`);
      process.exit(2);
    }
    input = readFileSync(argv.in, "utf8");
  } else {
    input = readFileSync(0, "utf8"); // stdin
  }
  let output;
  try {
    output = encode(argv.to, decode(argv.from, input));
  } catch (err) {
    console.error(`[snap] tokens-codec: ${err.message}`);
    process.exit(1);
  }
  if (argv.out) {
    writeFileSync(argv.out, output);
    console.log(`[snap] tokens-codec: wrote ${argv.to} → ${argv.out}`);
  } else {
    process.stdout.write(output);
  }
}
