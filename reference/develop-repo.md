# Snap — Repo-host recipe (`/snap:develop`)

Progressive-disclosure reference for the `snap-developer` agent when running
`/snap:develop`. Covers **both** repo hosts via CLI: `providers.repository = github`
→ `gh`, `providers.repository = gitlab` → `glab`. Implements the repo-host side of
**D-018 / D-033**. Read alongside `develop-pipeline.md`.

> **Driver:** the host CLI — `gh` for GitHub, `glab` for GitLab (no repo-host MCP
> server is connected in this session). The deterministic git core does the branch
> and commit work via `git`; the host CLI only opens and links the draft PR/MR.
> Install `gh` / `glab` and authenticate before any remote operation.

---

## The one rule (develop edition)

`/develop` produces, per ticket, a **branch + commits + a DRAFT PR/MR** — and
**nothing mergeable without human review**. The git core is deterministic and host-
agnostic (`git checkout -b`, `git commit`, `git push`); only the final step — opening
and linking the pull/merge request — is host-specific (`gh` vs `glab`). Never merge,
never push `--force`, never commit on the default branch. The draft flag is mandatory.

---

## Auth / secrets

- Authenticate once with `gh auth login` / `glab auth login` (interactive), **or** set
  `GITHUB_TOKEN` / `GITLAB_TOKEN` in `.env` (gitignored). Each CLI picks up its env
  token automatically when present.
- Required scopes:
  - **GitHub:** `repo` (push + open PRs).
  - **GitLab:** `api`, `write_repository` (push + open MRs).
- **Never echo the token.** Verify auth silently:

  ```bash
  gh auth status      # GitHub
  glab auth status    # GitLab
  ```

- **Nothing secret to persist, no provisioning.** `owner`/`repo` are **derived** from
  the git remote, not configured:

  ```bash
  git remote get-url origin
  ```

  There is no `remote.*` block and no provisioner for the repository provider — the
  token lives in `.env` or the CLI keychain, and the locators come straight from the
  remote URL.

---

## Host detection

The host and `owner`/`repo` are parsed from the origin remote, unless overridden.

```bash
git remote get-url origin
# git@github.com:acme/widgets.git      → host=github  owner=acme  repo=widgets
# https://github.com/acme/widgets.git  → host=github  owner=acme  repo=widgets
# git@gitlab.com:acme/widgets.git      → host=gitlab  owner=acme  repo=widgets
# https://gitlab.com/grp/sub/app.git   → host=gitlab  owner=grp/sub repo=app
```

- Match the hostname: `github.com` (or `github.*` enterprise) → `github`; `gitlab.com`
  (or a self-hosted GitLab host) → `gitlab`.
- Strip a trailing `.git`; split owner/repo on the last `/`. GitLab subgroups make the
  owner a `/`-joined path (`grp/sub`) — keep the full path as the project namespace.
- **Respect the explicit override.** If `providers.repository` is set in
  `snap.config.json` (`github` | `gitlab`), it wins over detection; only fall back to
  parsing the remote when it is `null`. If the override and the detected host disagree,
  abort with a clear error rather than guessing.

---

## Op → command mapping

| Op | `github` (`gh`) | `gitlab` (`glab`) |
| --- | --- | --- |
| Detect host / owner / repo | `git remote get-url origin` → parse hostname + path | idem (parse the same remote) |
| Verify auth (silent) | `gh auth status` | `glab auth status` |
| Create / checkout branch | `git checkout -b snap/<ID>-<slug>` | idem (`git`, host-agnostic) |
| Commit (conventional, ref ticket) | `git commit -m "feat(scope): … (<TICKET-ID>)"` | idem (`git`, host-agnostic) |
| Push branch (never `--force`) | `git push -u origin snap/<ID>-<slug>` | idem (`git`, host-agnostic) |
| Open **draft** PR/MR | `gh pr create --draft --title "<title>" --body "<body>"` | `glab mr create --draft --title "<title>" --description "<body>"` |
| Detect existing PR/MR for branch | `gh pr list --head snap/<ID>-<slug> --json number,url,state` | `glab mr list --source-branch snap/<ID>-<slug>` |
| Link the ticket | body: ticket URL/id; `Closes <id>` / `Relates <id>` **only if** the ticket lives on the same host | idem (`Closes`/`Relates` only when board host == code host) |

> **Flag names differ.** PR/MR body is `--body` on `gh`, `--description` on `glab`.
> Existing-branch lookup is `--head <branch>` on `gh`, `--source-branch <branch>` on
> `glab`. Always emit the form matching the resolved host.

---

## Branch + commit conventions

### Branch

```
snap/<TICKET-ID>-<slug>
```

- `<TICKET-ID>` is the ticket id verbatim (e.g. `STORY-003`).
- `<slug>` = the ticket **title**, lowercased, every non-alphanumeric run collapsed to
  a single `-`, trimmed of leading/trailing `-`.

  ```
  "Login form (OAuth)" → login-form-oauth
  → branch: snap/STORY-003-login-form-oauth
  ```

### Commits

- **Conventional commits**, with the ticket id referenced in the subject (or trailer):

  ```bash
  git commit -m "feat(auth): add login form (STORY-003)"
  git commit -m "test(auth): cover invalid-credentials path (STORY-003)"
  ```

- One logical change per commit; map the plan steps to commits where it reads cleanly.

### PR/MR body

The draft body is rendered from the work-brief and is the same shape on both hosts:

```
Implements <TICKET-ID> — <ticket title>.

Ticket: <ticket URL or id>

## Acceptance criteria
- [ ] <criterion 1>
- [ ] <criterion 2>

Closes <TICKET-ID>        ← only when the board lives on this same host
```

- The acceptance-criteria checklist comes from the work-brief (`ticket.acceptance`).
- Use `Closes`/`Relates` keywords **only** when the ticket board is on the same host
  as the code repo (so the host can auto-resolve the reference). Otherwise link the
  ticket by plain URL only (see Caveats).

---

## Idempotence

- **Resume an existing branch.** If `snap/<ID>-<slug>` already exists (locally or on
  the remote), check it out and add new commits — do not create a parallel branch.

  ```bash
  git rev-parse --verify snap/STORY-003-login-form 2>/dev/null \
    && git checkout snap/STORY-003-login-form \
    || git checkout -b snap/STORY-003-login-form
  ```

- **Detect an existing draft PR/MR** for the branch before opening one — never create a
  duplicate. If one exists, push the new commits to its source branch (it updates in
  place) and reuse its URL/number in the manifest.

  ```bash
  gh pr list   --head snap/STORY-003-login-form --json number,url,state   # GitHub
  glab mr list --source-branch snap/STORY-003-login-form                  # GitLab
  ```

- The manifest records `op: created | updated` accordingly (see `develop-pipeline.md`).

---

## Caveats

1. **Draft is mandatory.** Always pass `--draft`. `/develop` ships nothing mergeable
   without a human review pass — the PR/MR is a review artifact, not a merge request.
2. **Never force-push.** Use `git push -u origin <branch>`; never `--force` /
   `--force-with-lease`. Resuming a branch only ever *adds* commits.
3. **Never commit on the default branch.** Always work on `snap/<ID>-<slug>`. If the
   checkout lands on `main`/`master`, abort and branch first.
4. **No auto-merge.** Do not enable auto-merge, do not merge, do not approve. The draft
   stays a draft until a human takes over.
5. **Token never in `snap.config.json` / `.mcp.json` (D-018 / D-033).** Auth is fully
   delegated to the CLI (keychain or `.env`). There is no remote-locator block and no
   provisioner for the repository provider.
6. **`gh` and `glab` flag names differ — emit the right one.** Body: `--body` (`gh`)
   vs `--description` (`glab`). Existing-branch lookup: `--head` (`gh`) vs
   `--source-branch` (`glab`). The op→command table above is the source of truth.
7. **Different host for board vs code → link by plain URL, no auto-close.** When
   `providers.tickets` resolves to a host other than the code repo (e.g. Jira board,
   GitHub repo on GitLab code), put the ticket URL in the body but **omit**
   `Closes`/`Relates` — those keywords only resolve against same-host issues, and a
   cross-host keyword would silently no-op.
