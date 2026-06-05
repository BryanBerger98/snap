# 01 — Load state & route

Load config + the entity map, detect the playbook mode, and compute which phase the
no-arg router should enter (or which gate a flag invocation must pass).

## Inputs
- `project_dir` (required) — `${CLAUDE_PROJECT_DIR}`.
- `invocation` (optional) — the flag passed (`--new`/`--vision`/`--spec`), else none.

## Outputs

```
mode: greenfield | brownfield
progress: { briefConfirmedAt, roadmapReviewedAt }   # from .snap/define-progress.json
next_phase: draft-brief | define-vision | redirect:/brainstorm | redirect:/roadmap | spec-feature | done
```

## Process
1. Load config and read the state digest per
   `${CLAUDE_PLUGIN_ROOT}/reference/product-model/core-io.md` (§Load config, §Read state).
2. Read `.snap/define-progress.json` (absent ⇒ both signals unset).
3. **Detect mode** (only matters when entering the Brief): empty doc map **and** a real
   codebase (manifests, source beyond Snap's own config/docs) → `brownfield`; empty map,
   no meaningful code → `greenfield`; non-empty map → evolving an existing base.
4. **Flag invocation** → check only that phase's gate (SKILL.md §Gates). Gate fails ⇒
   stop and name the skill to run first.
5. **No-arg** → walk the ladder (SKILL.md §Default flow) against the digest + progress,
   and return the first unmet phase. Steps 3 and 4 of the ladder are **redirects**, not
   actions — return `redirect:/brainstorm` or `redirect:/roadmap`.

## Test

`node ${CLAUDE_PLUGIN_ROOT}/scripts/build-index.mjs <project_dir> --digest` returns a
parseable frontmatter map; LLM assertion: the chosen `next_phase` matches the ladder for
that map + progress (e.g. brief present but `briefConfirmedAt` unset ⇒ still `draft-brief`).
