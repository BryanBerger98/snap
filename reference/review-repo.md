# Snap — Repo-host recipe (`/snap:review`)

Progressive-disclosure reference for the agent when running the skill. Covers BOTH hosts via CLI: `providers.repository = github` → `gh`, `gitlab` → `glab`. Implements D-018/D-033/D-038. Read alongside the pipeline doc.

> **Driver:** the host CLI is the driver (no repo-host MCP). Install and authenticate before running `/review`.

---

## The one rule (review edition)

`/review` fetches a **diff** (local or PR/MR) and **posts findings as comments** — it never merges, never approves, never pushes code unless `--fix` is set. Diff acquisition and comment posting are host-specific (`gh` vs `glab`); the deterministic core (git diff, dedupe, synthesis) is host-agnostic. The host-specific path is engaged only for two operations: pulling a PR/MR diff by number and writing comments back to the PR/MR thread. Everything in between — parsing, deduplication, severity ranking — runs identically regardless of host.

---

## Auth / secrets

Authenticate once before the first run:

```bash
# GitHub
gh auth login

# GitLab
glab auth login
```

Alternatively, export the token in `.env` (gitignored — never commit):

```bash
GITHUB_TOKEN=ghp_…
GITLAB_TOKEN=glpat-…
```

Required scopes:
- **GitHub:** `repo` (read and write). For review without `--fix`, only `repo:read` / `read:discussion` are strictly required, but `repo` is the conventional grant.
- **GitLab:** `api` + `write_repository` if `--fix` is in use; `read_api` + `read_repository` suffice for comment-only runs.

Never echo the token; verify silently:

```bash
gh auth status      # GitHub
glab auth status    # GitLab
```

Owner and repo are derived from the git remote — nothing to provision, no entry in `snap.config.json` or `.mcp.json`.

---

## Host detection

Parse host, owner, and repo from the origin remote:

```bash
git remote get-url origin
```

Examples:

| Remote URL | host | owner | repo |
|---|---|---|---|
| `git@github.com:acme/widgets.git` | github | acme | widgets |
| `https://github.com/acme/widgets.git` | github | acme | widgets |
| `git@gitlab.com:acme/platform/widgets.git` | gitlab | acme/platform | widgets |
| `https://gitlab.com/acme/platform/widgets.git` | gitlab | acme/platform | widgets |

GitLab subgroups keep the `/`-joined owner path as-is.

If `providers.repository` is set explicitly in `snap.config.json`, respect that override. If the override and the detected hostname disagree, **abort** with a clear error — never silently continue against the wrong host.

---

## Op → command mapping

| Op | `github` (`gh`) | `gitlab` (`glab`) |
|---|---|---|
| Detect host / owner / repo | `git remote get-url origin` → parse hostname + path | idem |
| Verify auth (silent) | `gh auth status` | `glab auth status` |
| Local diff | `git diff <base>...HEAD` (host-agnostic) | idem |
| PR/MR diff | `gh pr diff <n>` | `glab mr diff <n>` |
| PR/MR metadata (branch, url) | `gh pr view <n> --json headRefName,url,state` | `glab mr view <n>` |
| Find the PR/MR for a ticket | `gh pr list --search "<TICKET-ID>" --json number,url,headRefName` | `glab mr list --search "<TICKET-ID>"` |
| Summary comment | `gh pr comment <n> --body "<summary>"` | `glab mr note <n> --message "<summary>"` |
| Inline comment | `gh api repos/<owner>/<repo>/pulls/<n>/comments -f body=… -f commit_id=… -f path=… -F line=… -f side=RIGHT` | Post a note referencing `path:line` (GitLab inline discussion needs base/head/start SHAs via the discussions API; if unavailable, **degrade** to a summary note quoting `path:line`) |
| Fix push (`--fix`, pr mode) | `git push origin <pr branch>` (never `--force`) | idem |
| Default branch | `gh repo view --json defaultBranchRef -q .defaultBranchRef.name` or `git remote show origin` | `glab repo view` / `git remote show origin` |

**Note on flag differences:** flag names differ (`--body` on `gh` vs `--message` on `glab` for notes); always emit the form matching the resolved host. The inline-comment API differs significantly between hosts — GitHub's `pulls/comments` endpoint takes `path` + `line` + `commit_id`; GitLab inline discussions need position SHAs, so when those aren't cheaply available, fall back to a single summary note that lists `file:line — finding` lines. Graceful degradation: never fail the review run over comment placement.

---

## Comment templates

The exact rendering lives in **frozen templates** under `skills/review/templates/` — one file per output. Read the matching template and fill its `{{placeholders}}` from `review-report.json` (fields `severity`, `file`, `line`, `title`, `detail`, `suggestion`).

| Template | Output | Notes |
|---|---|---|
| `inline-comment.md` | one inline PR/MR comment per finding (`mode = pr`) | opens with the hidden marker |
| `summary-comment.md` | the single summary comment per run (`mode = pr`) | singleton marker, rewritten in place |
| `report.md` | the local Markdown report (`mode = local`) | no markers |

**Marker (idempotence anchor).** Every posted comment opens with a hidden HTML marker — invisible in the rendered thread, parsed on re-run to dedupe:

```
<!-- snap:review:<file>:<line>:<slug> -->
```

- `<file>` — the finding's path, verbatim.
- `<line>` — the finding's line (`0` when the finding is file-level, no line).
- `<slug>` — deterministic kebab of the `title`: lowercase, non-alphanumerics → `-`, collapse repeats, trim, keep the first ~6 words. Same finding ⇒ same slug ⇒ same marker. Two findings on one line stay distinct via their slugs.
- The summary comment uses the singleton marker `<!-- snap:review:summary -->`.

**Posting.** Inline goes through the host inline endpoint (`gh api … pulls/<n>/comments -f body=… -f path=… -F line=…`); on GitLab inline degradation, the rendered body goes into a summary note prefixed with `` `<file>:<line>` — ``. The local report is written verbatim to `.snap/tmp/review-<id>.md`.

---

## Idempotence

Before posting, the skill fetches the existing review comments on the PR/MR (`gh pr view <n> --json comments` / `glab mr note list <n>`, plus the inline review comments) and scans them for `<!-- snap:review:… -->` markers. A finding is posted only when its marker `<!-- snap:review:<file>:<line>:<slug> -->` is **absent** from the thread. The summary comment is matched by `<!-- snap:review:summary -->` and **rewritten in place** (edit, not re-post). Re-running `/review` on the same PR/MR therefore adds only genuinely new findings and refreshes the one summary — no duplicates, no stacking.

> Marker match is the primary key. The `file:line + title` synthesis-time dedupe (collapsing the same issue found by two dimensions) still runs first; the marker then prevents re-posting across separate runs. If a thread has legacy comments without markers, fall back to `file:line + title` text match for those.

On `--fix`: the existing PR branch is resumed — the skill commits the fix and pushes to that branch. It never opens a parallel branch, never opens a new PR/MR. `git push origin <branch>` only, never `--force`.

---

## Caveats

1. **Never approve, never merge.** `/review` posts comments only. `gh pr review --approve`, merge, and auto-merge commands are forbidden. A human approves.
2. **Read-only unless `--fix`.** Without `--fix` the skill makes zero writes to the repo or the PR branch. Comments are review metadata applied via the comment endpoints, not code changes. `--fix` is the only path that commits and pushes, and only to the existing PR branch (pr mode) or working tree (local mode) — never the default branch, never `--force`.
3. **PR state-agnostic.** Review works on a draft or a ready PR/MR; it does not change the draft flag.
4. **GitLab inline degradation.** If positioned inline comments aren't available, degrade to a summary note — do not fail the run.
5. **Token never in `snap.config.json` / `.mcp.json` (D-018/D-033).** Auth is the CLI keychain or `.env`. No remote-locator block, no provisioner for the repository provider.
6. **`gh` and `glab` flags differ — emit the right one.** The op→command table is the source of truth.
7. **Cross-host board.** If the ticket lives on a different host than the code (e.g. a Jira board backing a GitHub repo), reference it by plain URL in the summary comment; do not rely on host auto-linking keywords.
