# Snap — Repo-host recipe (`/snap:tests`)

Progressive-disclosure reference for the agent when running the skill. Covers BOTH hosts via CLI: `providers.repository = github` → `gh`, `gitlab` → `glab`. Implements D-018/D-033/D-037/D-039. Read alongside the pipeline doc.

> **Driver:** the host CLI is the driver (no repo-host MCP). Install and authenticate before running `/tests`.

---

## The one rule (tests edition)

`/tests` fetches a **diff or ticket CA**, **writes test files**, **runs the suite**, and **loops to green** — fixing only tests, never source. On the `pr` path, written test files are committed and pushed to the **existing PR branch** (and only that branch). On the `local` path, test files are left in the working tree for the user to commit. The host-specific path is engaged for three operations: pulling a PR/MR diff by number, reading PR/MR metadata (branch name, URL), and pushing the test commit back to the PR branch. Everything else — test writing, suite execution, loop logic — runs identically regardless of host.

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
- **GitHub:** `repo` (read and write). The `repo` scope is required on the `pr` path since the skill commits and pushes test files to the PR branch. A read-only `repo:read` suffices for the `local` path.
- **GitLab:** `api` + `write_repository` on the `pr` path (push); `read_api` + `read_repository` suffice for the `local` path.

Never echo the token; verify silently:

```bash
gh auth status      # GitHub
glab auth status    # GitLab
```

Owner and repo are derived from the git remote — nothing to provision, no entry in `snap.config.json` or `.mcp.json`.

---

## Host detection

Parse host, owner, and repo from the origin remote (identical to `develop-repo.md` / `review-repo.md`):

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
| Default branch | `gh repo view --json defaultBranchRef -q .defaultBranchRef.name` or `git remote show origin` | `glab repo view` / `git remote show origin` |
| Commit tests (pr mode) | `git commit -m "test(scope): … (<TICKET>)"` | idem |
| Push test branch (pr mode) | `git push origin <head>` (never `--force`) | idem |

**Note on flag differences:** flag names differ between hosts (`gh` vs `glab`); always emit the form matching the resolved host. The `local` diff path is host-agnostic — only the pr commit/push path is host-specific. Graceful degradation: a push failure should surface a clear error, never silently drop the test files.

---

## Safety invariants

The following are non-negotiable:

- **Never edit source files** — `/tests` writes test files only; source is immutable.
- **Never commit on the default branch** — test commits go to the existing PR branch (`mode=pr`) only.
- **Never `git push --force`.**
- **Never open a new PR/MR, perform a merge, or post an approval** — `mode=pr` commits and pushes test files onto the existing PR branch only; `mode=local` leaves tests in the working tree (the user commits).
- **Token never in `snap.config.json` / `.mcp.json` (D-033).** Auth is the CLI keychain or `.env`.
- Scratch `.snap/tmp/` is gitignored and never pushed.

---

## Caveats

1. **`local` mode is host-agnostic.** Only the `pr` commit/push path touches host-specific CLI commands. Running `/tests` against a local diff requires no auth at all.
2. **Cross-host board.** If the ticket lives on a different host than the code (e.g. a Jira board backing a GitHub repo), the ticket is loaded via `providers.tickets` (snap-loader); the code target is always resolved from the git remote. Reference the ticket by plain ID or URL in commit messages.
3. **`gh` and `glab` flags differ — emit the right one.** The op→command table above is the source of truth.
4. **No runner detection on the `tests` path.** Runner/dir/conventions come from `snap-explorer` via `codebase-map.json` (stage 3 of the pipeline). If no test runner is detected, the skill aborts with a clear message before writing any files.
5. **E2E harness absent.** If no E2E runner is detected and `e2e` is in the active levels, `snap-tester` records it as `uncovered` in `tests-<level>.json` — it does not silently install a harness.
