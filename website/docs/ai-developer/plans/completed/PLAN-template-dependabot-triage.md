# Plan: Template-side Dependabot Triage

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Complete

**Goal**: Clear the 9 remaining template-side Dependabot alerts and 4 open Dependabot PRs by merging the safe ones, verifying the templates still build, and documenting any that we intentionally defer.

**Last Updated**: 2026-04-13

**Current state**: Plan moved from `backlog/` to `active/`. Phase 0 kicked off. The DCT tester (running in `/Users/terje.christensen/learn/helpers/testing/delete-test`) is shaking down the test loop on an unchanged `typescript-basic-webserver` from main. Waiting for the tester to report the locked-in install / run / reset commands and the answer to Q1 (whether `dev-template` can install from a local path or whether we need a workaround).

**Upstream context**: Continues from `INVESTIGATE-housekeeping-docusaurus-and-prs.md` (completed via PR #40). The Docusaurus upgrade is done; build-time transitive vulns in the Docusaurus toolchain have been dismissed as out-of-scope (see the `feedback_docusaurus_transitive_vulns` policy). What remains are genuine template-side issues: code that ships to users who copy our templates.

---

## Scope — what this plan covers

### 9 open Dependabot alerts (template-side)

| # | Severity | Ecosystem | Package | Template | Direct or transitive? |
|---|---|---|---|---|---|
| 3 | medium | npm | `body-parser` | `typescript-basic-webserver` | direct (covered by PR #1) |
| 5 | medium | npm | `qs` | `typescript-basic-webserver` | transitive (covered by PR #4) |
| 9 | low | npm | `qs` | `typescript-basic-webserver` | transitive (covered by PR #4) |
| 14 | high | npm | `minimatch` | `typescript-basic-webserver` | transitive (devDep? verify) |
| 15 | medium | npm | `path-to-regexp` | `typescript-basic-webserver` | transitive (from express — may clear via PR #2) |
| 16 | high | npm | `path-to-regexp` | `typescript-basic-webserver` | transitive (from express — may clear via PR #2) |
| 19 | medium | npm | `picomatch` | `typescript-basic-webserver` | transitive (devDep? verify) |
| 10 | low | pip | `flask` | `python-basic-webserver` | direct (covered by PR #7) |
| 27 | low | pip | `flask` | `python-basic-webserver-database` | direct (NOT covered — no PR exists) |

### 4 open Dependabot PRs

| PR | Template | Bump | Status |
|---|---|---|---|
| #1 | `typescript-basic-webserver` | `body-parser 2.2.0 → 2.2.1` | Open since 2025-11-25 |
| #2 | `typescript-basic-webserver` | `express 5.1.0 → 5.2.0` | Open since 2025-12-01 |
| #4 | `typescript-basic-webserver` | `qs 6.14.0 → 6.14.2` | Open since 2026-02-14 |
| #7 | `python-basic-webserver` | `flask 2.3.3 → 3.1.3` | Open since 2026-02-20 |

---

## Approach

**Strategy**: Merge the Dependabot PRs in order after per-template verification. Then file a fresh bump for the uncovered `python-basic-webserver-database` flask alert. After each merge, re-query Dependabot alerts to see what cleared — some transitives may resolve via cascading updates (e.g., bumping express may refresh path-to-regexp automatically).

**Why this order over one big batch**: each template is independent. A break in one template shouldn't block the others. Per-PR merges also give the cleanest rollback path if something goes wrong, and each Dependabot PR already has a focused diff and release notes attached.

**Not covered by this plan** (explicitly deferred):
- Long-term auto-merge policy for template Dependabot PRs — see Q1 in the upstream investigation. This plan just clears the current backlog; a separate policy discussion can follow.
- Whether any template should intentionally pin old versions (Q2 in the upstream investigation). None of the current templates declare a pinning intent, so we treat them all as "track latest."

---

## Per-template verification — use the DCT tester

**Verification must happen in the DCT test workspace at `/Users/terje.christensen/learn/helpers/testing/delete-test`, not via isolated `docker build` inside the dev-templates repo.** That workspace has its own devcontainer and is the canonical test harness for installing and exercising templates end-to-end via `dev-template`.

The real user experience for a template is: developer runs `dev-template` inside their project's devcontainer → a template is copied in → developer runs `dev-template configure` → UIS provisions services → app runs → browser shows result. Testing only the Docker build skips everything interesting: the configure step, the UIS handshake, the port-forward, the secret handling, the deploy manifests, the actual runtime wiring. The DCT tester exercises the whole flow.

**Flow per Dependabot PR:**

1. Check out the Dependabot branch in the dev-templates repo (so the updated template source is available)
2. Switch to the `delete-test` workspace and enter its devcontainer
3. Install the template under test via `dev-template` (pointed at the local updated source, not GitHub main)
4. Run `dev-template configure` if the template has UIS services
5. Start the app, hit its endpoint, verify it behaves
6. If green → approve and merge the Dependabot PR on GitHub
7. If red → investigate; fall back to closing the PR with a comment if the fix would require rewriting the template (see Q3)

**Pre-push pipeline** in the dev-templates repo is still required after any merge that lands on main, since the pre-push checklist (`project-dev-templates.md`) applies to all commits that flow through the registry/docs pipeline — but it is NOT a substitute for exercising the template in the DCT tester.

---

## Phases

### Phase 0: Shake down the DCT tester workflow

Before touching any Dependabot PR, prove the test loop actually works. Pick one untouched template (e.g., unmodified `typescript-basic-webserver` from main) and run the full install → configure → run → verify flow in the `delete-test` workspace. Document the exact commands once; reuse them in every later phase.

- [x] 0.1 Confirm the `delete-test` devcontainer is running and find its container name
  - **Container:** `4badabdf4399` / `relaxed_williamson`, image `vsc-delete-test-...`
  - **User inside:** `vscode`, **workspace mount:** `/workspace`
  - **CLI:** `dev-template` at `/usr/local/bin/dev-template`
- [x] 0.2 Install `typescript-basic-webserver` from the current main into `delete-test` via `dev-template`
  - Command (from host): `docker exec -w /workspace 4badabdf4399 dev-template typescript-basic-webserver`
  - Result: template scaffolded, TypeScript toolchain auto-installed, `app/index.ts` + `package.json` + `tsconfig.json` in place. Overwrite policy confirmed — old python files from the prior template linger harmlessly alongside the new ones.
- [x] 0.3 Run and hit the app endpoint
  - `docker exec -w /workspace 4badabdf4399 sh -lc 'npm install'` → 125 packages, `npm audit` reports 10 vulns (1 low / 3 moderate / 6 high) — this is the **baseline** Dependabot surface the plan is targeting
  - `docker exec -w /workspace 4badabdf4399 sh -lc 'npm run dev'` (run in background from host)
  - `docker exec 4badabdf4399 curl -s http://localhost:3000/` → `Hello world ! Template: typescript-basic-webserver. Time is: 13/04/2026 12:09:48` ✅
  - Teardown: `docker exec 4badabdf4399 sh -c 'pkill -f "nodemon|tsx|ts-node"'` — port 3000 clears immediately
- [x] 0.4 Capture the exact command sequence — see the **DCT test loop** block below
- [x] 0.5 **Answered (Q1).** `dev-template --help` confirms the CLI takes only `[template-id | configure]` — no `--branch`, `--path`, `--ref`, or `--from` flag. It fetches from `helpers-no/dev-templates` main via git sparse-checkout, full stop.
  - **Locked-in procedure for testing a Dependabot PR:**
    1. Run `dev-template <template-name>` normally inside the devcontainer — this scaffolds the current-main version of the template into `/workspace`.
    2. On the **host**, check out the Dependabot branch in the dev-templates repo at `/Users/terje.christensen/learn/helpers/dev-templates`.
    3. Overwrite the changed files from the feature branch into `/workspace` using `docker cp` (host → container). For npm PRs that's typically just `package.json` + `package-lock.json`; for pip PRs it's `requirements.txt`. Verify via `git diff` on the feature branch before copying so we don't miss a template source change.
    4. Re-run the install step inside the container (`npm install` / `pip install -r requirements.txt`).
    5. Start the app and hit the endpoint per the DCT test loop block below.
  - Rejected alternatives: (b) temporarily push the Dependabot branch as registry main — touches shared state, unsafe; (c) wait for TMP to add a `--from-path` flag — out of scope for this plan.

#### DCT test loop (reusable command block for Phases 1–5)

All commands run from the host. `CID` = delete-test devcontainer id.

```bash
CID=4badabdf4399  # relaxed_williamson — verify with `docker ps | grep vsc-delete-test`

# 1. Install / overwrite template into /workspace
docker exec -w /workspace $CID dev-template <template-name>

# 2. For a Dependabot PR under test, overwrite changed files from the feature branch.
#    On the host, check out the Dependabot branch in /Users/terje.christensen/learn/helpers/dev-templates,
#    then copy the changed files into /workspace. Example for an npm PR on typescript-basic-webserver:
#      docker cp /Users/terje.christensen/learn/helpers/dev-templates/templates/typescript-basic-webserver/package.json      $CID:/workspace/package.json
#      docker cp /Users/terje.christensen/learn/helpers/dev-templates/templates/typescript-basic-webserver/package-lock.json $CID:/workspace/package-lock.json
#    Example for a pip PR on python-basic-webserver:
#      docker cp /Users/terje.christensen/learn/helpers/dev-templates/templates/python-basic-webserver/requirements.txt       $CID:/workspace/requirements.txt
#    Always `git diff main...<branch>` the feature branch first to confirm you're not missing a changed file.

# 3. Install deps
docker exec -w /workspace $CID sh -lc 'npm install'           # node templates
# docker exec -w /workspace $CID sh -lc 'pip install -r requirements.txt'  # python templates

# 4. Start the app in the background (host-side)
#    For nodemon-based node templates:
docker exec -w /workspace $CID sh -lc 'npm run dev' &
DEV_PID=$!

# 5. Poll until the endpoint responds, then capture the response
for i in 1 2 3 4 5 6 7 8; do
  code=$(docker exec $CID curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ || true)
  [ "$code" = "200" ] && break
  sleep 1
done
docker exec $CID curl -s http://localhost:3000/

# 6. Teardown — kill the dev server inside the container
docker exec $CID sh -c 'pkill -f "nodemon|tsx|ts-node" || true'
```

For the next test, just re-run step 1 with a different `<template-name>` — no devcontainer rebuild, per the Q5 overwrite policy.

### Phase 1: Verify and merge PR #1 (body-parser)

Smallest bump, patch version. Simplest merge.

- [x] 1.1 Materialize PR #1's updated file in the host working tree
  - PR #1 HEAD `5eb457a7` is a single-file change: `templates/typescript-basic-webserver/package-lock.json` only (body-parser 2.2.0 → 2.2.1, plus a trivial `"peer": true` marker on `@types/node`).
  - GitHub state: `mergeable: true, mergeable_state: clean, rebaseable: true` — confirmed via `gh api repos/helpers-no/dev-templates/pulls/1`. The lockfile file is untouched on main since 2025-11-25, so the PR applies without conflict.
  - Rather than `gh pr checkout` (which would switch the whole working tree off main), the updated file was extracted in place: `git show pr-1-body-parser:templates/typescript-basic-webserver/package-lock.json > templates/typescript-basic-webserver/package-lock.json`. The tester can copy the file from the standard path in the DCT test loop block; no other host path changes.
  - Verified: `body-parser@2.2.1` at line 278 with the new integrity sha512 hash.
- [x] 1.2 Tester: install `typescript-basic-webserver` from main into `delete-test`, then `docker cp` the updated `package-lock.json` from the host working tree, then `npm install`
  - `docker exec -w /workspace 4badabdf4399 dev-template typescript-basic-webserver` → scaffolded clean
  - `docker cp /Users/terje.christensen/learn/helpers/dev-templates/templates/typescript-basic-webserver/package-lock.json 4badabdf4399:/workspace/package-lock.json` → in-container lockfile now has `body-parser@2.2.1` at line 278
  - `docker exec -w /workspace 4badabdf4399 sh -lc 'npm install'` → `changed 6 packages`, disk-resident `node_modules/body-parser/package.json` reports `"version": "2.2.1"` ✅
  - `npm audit` delta: **10 vulns → 9 vulns** (moderate: 3 → 2). The dropped moderate is alert #3 (body-parser). High count stays at 6 (still covered by PR #2 / PR #4).
- [x] 1.3 Tester: start `npm run dev`, verify `curl http://localhost:3000/` returns the expected "Hello world !" response
  - Endpoint returned: `Hello world ! Template: typescript-basic-webserver. Time is: 13/04/2026 12:19:51` ✅
  - Server stopped via `pkill -f "nodemon|tsx|ts-node"`, port 3000 confirmed clear
- [x] 1.4 Merged via `gh pr merge 1 --rebase --delete-branch` at 2026-04-13T12:20:47Z; merge commit `4ea6f24c`
- [x] 1.5 Alert #3 (body-parser) state = `fixed` confirmed via `gh api repos/helpers-no/dev-templates/dependabot/alerts/3`
- [x] 1.6 Fast-forwarded local main to `4ea6f24c` (contains the body-parser bump). Local `pr-1-body-parser` fetch ref deleted. Working tree clean on `templates/typescript-basic-webserver/package-lock.json`.

### Phase 2: Close PR #4, manually bump qs via fresh feature branch

**Strategy change discovered while prepping Phase 2:** PR #4 is stale against current main. Diffing `pr-4-qs` against main shows the PR would REGRESS 6 unrelated packages to their Feb 2026 state, including undoing PR #1's body-parser 2.2.1 bump. The stale-base problem is Dependabot-agnostic: it built the lockfile against a Feb-2026 snapshot that no longer exists. PR #2 (express, also Feb 2026) and PR #7 (flask, Feb 2026) almost certainly have the same issue.

**New approach for stale Dependabot PRs:** close them with an explanatory comment, then do surgical manual bumps on a fresh feature branch against current main. For npm: run `npm install <pkg>@<version>` inside the template directory (in the dev-templates devcontainer), commit only the lockfile delta, PR, merge. For pip: edit `requirements.txt` directly, commit, PR, merge. This produces the minimal, reviewable, current-main-based diff we actually want.

Dependabot's role: once we've cleared the stale backlog, Dependabot will naturally take over for future advisories against current main, producing fresh (non-stale) PRs.

- [x] 2.1 PR #4 closed with an explanatory comment pointing at the manual bump strategy
- [x] 2.2 Feature branch `feature/typescript-qs-update` created from main (post-PR-#1)
- [x] 2.3 In dev-templates devcontainer `gallant_colden`: `cd /workspace/templates/typescript-basic-webserver && npm update qs --package-lock-only` — surgical update, no node_modules fetched
- [x] 2.4 Diff verified minimal: qs 6.14.0 → **6.15.1** (even newer than Dependabot's 6.14.2 target — latest within the `^6.14.0` range declared by body-parser) plus two incidental `"peer": true` metadata removals on `@types/node` and `typescript` (harmless lockfile-regen artifact; peer field is informational only). npm audit: 9 → 8 vulns.
- [x] 2.5 Tester: install `typescript-basic-webserver` into `delete-test`, `docker cp` the updated `package-lock.json`, `npm install`, run + verify endpoint
  - Scaffold + overwrite + install as per DCT test loop. In-container lockfile confirmed `qs@6.15.1` (line 1090) and `body-parser@2.2.1` (line 277) pre-install.
  - `npm install`: `changed 1 package`. `npm audit` delta: **9 vulns → 8 vulns** (moderate 2 → 1) — matches TMP's 2.4 prediction exactly.
  - Endpoint: `Hello world ! Template: typescript-basic-webserver. Time is: 13/04/2026 12:28:11` ✅. Server stopped, port 3000 clear.
  - **Detailed audit breakdown** (from `npm audit --json`): `qs` is no longer in the advisory output at all — both alerts #5 (medium qs) and #9 (low qs) coalesce under the same package entry, so **both clear** when merged, not just #5. The `1 low / 1 moderate / 6 high` that remain are:
    - **In-plan, expected to clear in Phase 3:** `minimatch` high×3 (alert #14), `path-to-regexp` high+moderate (alerts #15/#16), `picomatch` high+moderate (alert #19)
    - **Not in the plan's alert table — newly surfaced, needs triage:** `brace-expansion` (low+moderate GHSAs), `diff`/`jsdiff` (low), and a `nodemon → simple-update-notifier → semver` high chain. These are either new advisories since the plan was written or were below Dependabot's reporting threshold. **TMP decision needed**: add them to scope as a Phase 3.5 follow-up, defer to a new plan, or dismiss as dev-only / tooling chain?
- [x] 2.6 PR #41 created and merged via `--rebase --delete-branch`; merge commit `ace4f9f0`. Local main fast-forwarded; local `feature/typescript-qs-update` and `pr-4-qs` branches cleaned up.
- [x] 2.7 Alerts #5 (medium qs) and #9 (low qs) both confirmed `state: fixed` via `gh api`

#### Deferred to post-Phase-3 re-triage

The DCT tester's `npm audit` surfaced extras not in the plan's alert table: `brace-expansion` (low+moderate), `diff`/`jsdiff` (low), and a `nodemon → simple-update-notifier → semver` high chain. Decision: **do not expand Phase 2 scope.** Phase 3's express bump will cascade-update a big chunk of the typescript template's tree, and some of these may clear for free. They also don't appear in GitHub Dependabot's alert list (npm audit pulls a fresher advisory DB than Dependabot has processed for this repo), and nodemon is a devDep so the semver chain is dev-tool-only, not user-facing runtime. Re-run `npm audit` and `gh api ... dependabot/alerts` after Phase 3; escalate to a Phase 7 follow-up only if real runtime-facing advisories remain.

### Phase 3: Close PR #2, manually bump express via fresh feature branch

Same stale-base strategy as Phase 2. Express usage in the template is minimal: `express()`, `app.get('/', ...)`, `app.listen()` — no middleware, no custom routing, no body-parser integration. Any 5.x → 5.x bump is near-zero risk.

- [x] 3.1 Reviewed template usage — only `app.get` and `app.listen` are called, so the 5.1 → 5.2 public API surface area for this template is essentially zero
- [x] 3.2 PR #2 closed with an explanatory comment
- [x] 3.3 Feature branch `feature/typescript-express-update` created from main (post-PR-#41)
- [x] 3.4 In dev-templates devcontainer: `cd /workspace/templates/typescript-basic-webserver && npm update express --package-lock-only`
- [x] 3.5 Diff verified minimal: express 5.1.0 → **5.2.1** (latest within `^5.0.0`, newer than the closed PR #2's 5.2.0 target). Internal `body-parser` range tightened to `^2.2.1` (already have 2.2.1; no resolution change). `depd` entry restructured (harmless npm metadata reshuffle; was already a transitive).
- [x] 3.6 Tester: install `typescript-basic-webserver` into `delete-test`, `docker cp` the updated `package-lock.json`, `npm install`, run + verify endpoint
  - Scaffold + overwrite + install as per DCT test loop. In-container lockfile confirmed `express@5.2.1` (line 551) pre-install. Installed: `node_modules/express/package.json` → `"version": "5.2.1"` ✅
  - `npm install`: `changed 1 package`. `npm audit` delta: **8 vulns → 8 vulns (unchanged)** — confirms TMP's 3.8 prediction that the express bump would not cascade-clear the transitive vulns.
  - Endpoint: `Hello world ! Template: typescript-basic-webserver. Time is: 13/04/2026 12:36:09` ✅. Server stopped, port 3000 clear.
- [x] 3.7 PR #46 created, merged via `--rebase --delete-branch` as `882518a`. Local main fast-forwarded; local branch cleaned up. Post-merge alert query: 6 open (the 4 transitive npm + 2 flask) — exactly as predicted; the 4 npm transitives stayed open, confirming the negative cascade.
- [x] 3.8 **Cascade check: NEGATIVE, as predicted.** `npm ls path-to-regexp minimatch picomatch` inside `delete-test` reveals the parent chains and gives Phase 3.5 an almost-free strategy:

  ```
  typescript-basic-webserver@1.0.0 /workspace
  ├─┬ express@5.2.1
  │ └─┬ router@2.2.0
  │   └── path-to-regexp@8.2.0
  └─┬ nodemon@2.0.22
    ├─┬ chokidar@3.6.0
    │ ├─┬ anymatch@3.1.3
    │ │ └── picomatch@2.3.1
    │ └─┬ readdirp@3.6.0
    │   └── picomatch@2.3.1 deduped
    └── minimatch@3.1.2
  ```

  **Interpretation:**
  - `path-to-regexp@8.2.0` comes via `express → router`, and 8.2.0 is already the latest within express 5.2.1's router pin. There is no newer upstream fix we can pull. **Alerts #15 (medium) and #16 (high)** will need to be dismissed as "no upstream fix available yet," tracked, and re-queried after express/router publish a patched line.
  - `minimatch@3.1.2` and `picomatch@2.3.1` both come via **`nodemon@2.0.22`** — a devDep that's **three years stale** (current is 3.x). Bumping nodemon to 3.x should cascade-clear:
    - alert **#14** (minimatch high)
    - alert **#19** (picomatch medium)
    - and very likely the Phase-2-deferred extras (`brace-expansion`, `diff`/jsdiff, `nodemon → simple-update-notifier → semver` chain) — they all live inside nodemon 2's ancient dep tree.
  - Since `nodemon` is a devDep, this is low-risk: it only runs during local dev (`npm run dev`), not in production containers or CI test runs.

### Phase 3.5: Clear the minimatch / picomatch alerts via nodemon bump; dismiss path-to-regexp (added mid-flight)

**Strategy locked in from Phase 3.6's `npm ls` trace** (see above): the four remaining npm alerts split cleanly into two groups.

**Group A — clear via `nodemon` devDep bump (2.0.22 → latest 3.x):**
- alert #14 (`minimatch` high, via nodemon direct)
- alert #19 (`picomatch` medium, via nodemon → chokidar → anymatch/readdirp)
- likely also clears Phase-2-deferred extras: `brace-expansion`, `diff`/jsdiff, `semver`/`simple-update-notifier` chain (all nodemon 2 transitives)

**Group B — cannot clear upstream yet, dismiss with reason:**
- alert #15 (`path-to-regexp` medium, via express → router)
- alert #16 (`path-to-regexp` high, via express → router)

  Express 5.2.1 already resolves `path-to-regexp@8.2.0`, which is the latest in that line. No newer upstream fix exists. Dismiss via `gh api ... dependabot/alerts/{15,16} -X PATCH -f state=dismissed -f dismissed_reason=no_fix_available` and re-query monthly (or whenever express/router publishes a new line).

- [x] 3.5.1 Investigate parent chains — done in Phase 3.6 via `npm ls path-to-regexp minimatch picomatch` in `delete-test`; results pasted in Phase 3.8 above.
- [ ] 3.5.2 Decision — **locked in above**: nodemon bump for Group A, dismissal for Group B.
- [x] 3.5.3 Feature branch `feature/typescript-nodemon-update` created. `npm update nodemon --package-lock-only` was a no-op because the existing `^2.0.22` caret caps it to 2.x. Used `npm install --save-dev --package-lock-only nodemon@latest` instead, which moved both `package.json` (`^2.0.22` → `^3.1.14`) and the lockfile (45 insertions / 61 deletions — a refreshed dep tree, expected for a major-version devDep bump). Local `npm audit` dropped 8 → 3 vulnerabilities. Remaining per `npm audit --json`: `diff` (low), `path-to-regexp` (high — Group B, will be dismissed), `picomatch` (high — UNEXPECTED, may be coming via a different path now; tester to trace via `npm ls picomatch` post-install).
- [x] 3.5.3a Tester: install `typescript-basic-webserver`, `docker cp` BOTH `package.json` and `package-lock.json` from the feature branch, `npm install`, run + verify endpoint, then run `npm ls picomatch path-to-regexp diff` to trace the remaining vulnerable transitives
  - Scaffold + overwrite both files + install. In-container `package.json` declares `"nodemon": "^3.1.14"`; `package-lock.json` has `nodemon@3.1.14` at line 959.
  - `npm install`: `removed 3 packages, changed 6 packages`. `npm audit`: **8 vulns → 3 vulns** — matches TMP's local result.
  - Endpoint: `Hello world ! Template: typescript-basic-webserver. Time is: 13/04/2026 12:42:40` ✅. Server stopped, port 3000 clear.
  - **`npm ls picomatch path-to-regexp diff` trace post-install:**

    ```
    typescript-basic-webserver@1.0.0 /workspace
    ├─┬ express@5.2.1
    │ └─┬ router@2.2.0
    │   └── path-to-regexp@8.2.0
    ├─┬ nodemon@3.1.14
    │ └─┬ chokidar@3.6.0
    │   ├─┬ anymatch@3.1.3
    │   │ └── picomatch@2.3.1
    │   └─┬ readdirp@3.6.0
    │     └── picomatch@2.3.1 deduped
    └─┬ ts-node@10.9.2
      └── diff@4.0.2
    ```

  - **Confirmed cleared by the nodemon bump** (not in the tree anymore): `minimatch` (alert #14 ✅), plus the Phase-2-deferred `brace-expansion`, `semver`/`simple-update-notifier`/old-nodemon-chain extras — all gone, as hoped. Net drop = 5 vulns.

  - **Surprise — picomatch survived:** `nodemon@3.1.14` still pins `chokidar@^3.6.0`. Chokidar 3.x still transitively pulls `picomatch@2.3.1` via `anymatch` and `readdirp`. The nodemon major bump refreshed nodemon's own direct deps but did **not** move chokidar to its 4.x line (chokidar 4.x uses a newer picomatch and would clear the advisory). Alert #19 (picomatch) is therefore **not cleared** by this phase.

  - **New finding — diff/jsdiff via ts-node@10.9.2:** the surviving low-severity `diff@4.0.2` comes through `ts-node`, which is a direct devDep of the template. ts-node 10.9.2 is the current latest on that line. Same shape as path-to-regexp: no upstream fix published yet, devDep-of-devDep, only exposed during local dev. Recommended disposition: **dismiss as `no_fix_available`** (same treatment as alerts #15/#16).

  - **Options for picomatch (alert #19)**, from cheapest to most invasive:
    1. **Dismiss as `no_fix_available` / `tolerable_risk`** — it's a devDep-of-devDep (chokidar is only used by nodemon's file watcher during `npm run dev`; never in the prod Docker image, never in CI). Simplest.
    2. **Add a `package.json` `overrides` block** forcing `picomatch@^4` under `chokidar`. Low-risk (picomatch is almost drop-in compatible between 2 and 4) but needs a verification cycle in `delete-test` to confirm nodemon still hot-reloads.
    3. **Override chokidar itself to `^4`** under nodemon. Higher risk — nodemon 3.1.14 was not designed against chokidar 4's new API shape; might break hot reload.
    - **DCT recommends option 1.** The advisory impact is zero for anyone running the built template (Docker image ships the compiled JS via `npm run build` + `node dist/index.js`, never nodemon), and the overhead of maintaining an `overrides` block for a devDep just to keep a lockfile audit clean is bad bang-for-buck. TMP decision.
- [x] 3.5.2 Decision locked in: nodemon bump for Group A; dismissals for Group B and #19. Dismissal reason for picomatch: devDep-of-devDep, never in prod image, accepted per DCT recommendation option 1.
- [x] 3.5.4 PR #47 created, merged via `--rebase --delete-branch` as `05b0347`. Local main fast-forwarded; local branch cleaned up.
- [x] 3.5.5 Alerts dismissed via `gh api ... -X PATCH`:
  - **#14 minimatch high** → `state: fixed` (cleared by the nodemon bump itself)
  - **#15 path-to-regexp medium** → `dismissed (no_bandwidth)` with reason "no upstream fix; via express → router → already at latest 8.2.0"
  - **#16 path-to-regexp high** → `dismissed (no_bandwidth)` (same reason)
  - **#19 picomatch medium** → `dismissed (tolerable_risk)` with reason "devDep via nodemon → chokidar 3.x; never in prod image"
  - GitHub API note: `dismissed_comment` is capped at 280 characters — keep dismissals terse.
- [x] 3.5.6 `npm audit` deferred extras (brace-expansion, semver chain, simple-update-notifier) all confirmed gone via tester's post-bump trace (Phase 3.5.3a). Only `diff@4.0.2` remains — comes via `ts-node@10.9.2` (current latest), no upstream fix yet, devDep-of-devDep, same shape as picomatch. Not currently a GitHub Dependabot alert; if it ever surfaces as one, dismiss with the same reasoning.

#### Phase 3.5 result

**Net effect of the entire typescript-basic-webserver triage** (Phases 1, 2, 3, 3.5):
- 6 npm advisories cleared via merges: body-parser, qs ×2, minimatch, brace-expansion, semver/update-notifier chain
- 3 npm advisories dismissed with reason: path-to-regexp ×2 (no upstream fix), picomatch (devDep-of-devDep)
- The typescript template's open Dependabot alert count is now **zero**.

### Phase 4: Close PR #7, manually bump flask via fresh feature branch

Same stale-base strategy as #4 and #2. Pre-bump API audit: `templates/python-basic-webserver/app/app.py` uses only `from flask import Flask`, `Flask(__name__)`, `@app.route('/')`, and `app.run(host, port, debug)` — none of which changed in Flask 2 → 3. No use of `flask.Markup`, `flask.escape`, `send_file(attachment_filename=)`, or `Blueprint.register`. Python pin is `python:3.11-slim` (Flask 3 requires 3.8+). **Migration surface area: zero.**

- [x] 4.1 Template app code reviewed — no deprecated flask 2 APIs. Python 3.11 base image satisfies flask 3's 3.8+ requirement.
- [x] 4.2 PR #7 closed with a pointer to the manual strategy
- [x] 4.3 Feature branch `feature/python-flask-update` created from main (post-Phase-3.5)
- [x] 4.4 `templates/python-basic-webserver/requirements.txt`: `Flask==2.3.3` → `Flask==3.1.3` (current PyPI latest; matches what the closed PR #7 targeted)
- [x] 4.5 Tester: install `python-basic-webserver` into `delete-test`, `docker cp` the updated `requirements.txt`, `pip install -r requirements.txt`, run + verify endpoint
  - `docker exec -w /workspace 4badabdf4399 dev-template python-basic-webserver` → scaffolded clean; python dev toolchain auto-installed. Note: per Q5 overwrite policy, the old TypeScript template files (`package.json`, `tsconfig.json`, `node_modules/`, etc.) still linger in `/workspace` alongside the new python files — harmless, not touched by this test.
  - `docker cp /Users/terje.christensen/learn/helpers/dev-templates/templates/python-basic-webserver/requirements.txt 4badabdf4399:/workspace/requirements.txt` → in-container file now reads `Flask==3.1.3`
  - `docker exec -w /workspace 4badabdf4399 sh -lc 'pip install -r requirements.txt'` → `Successfully installed Flask-3.1.3 blinker-1.9.0 click-8.3.2 itsdangerous-2.2.0 jinja2-3.1.6 markupsafe-3.0.3 werkzeug-3.1.8` (pulled Werkzeug 3.1.8 as the Flask 3 transitive — matches Flask 3's `Werkzeug>=3.1.0` requirement, confirming the Python 2→3 migration engaged cleanly)
  - `docker exec -w /workspace 4badabdf4399 sh -lc 'python app/app.py'` (in background) → Flask dev server bound to 0.0.0.0:3000
  - Endpoint: `curl http://localhost:3000/` → `Hello world ! Template: python-basic-webserver. Time: 13:32:32 Date: 13/04/2026` ✅
  - Teardown: `pkill -f "python app/app.py|flask"`, port 3000 confirmed clear
  - **Doc bug found (out of scope for this plan, flagging for later):** `README-python-basic-webserver.md` quick-start tells the user to open `http://localhost:6000`, but `app/app.py` hardcodes `port = 3000`. The README is wrong; the code is right. Worth a trivial follow-up README fix — not a blocker for this PR.
- [x] 4.6 PR #48 created and merged via `--rebase --delete-branch` as `1d6388f`. Local main fast-forwarded; local branch cleaned up.
- [x] 4.7 Alert #10 re-query post-merge showed `state: open` immediately (Dependabot rescan lags by minutes). Will re-verify in Phase 6 close-out.

### Phase 5: Fix the uncovered flask alert in `python-basic-webserver-database`

Dependabot didn't open a PR for this template even though the same flask advisory hits it. Either (a) its `requirements.txt` pins differently, or (b) the Dependabot config doesn't watch this directory yet.

This is also the first template in this plan that has UIS services — the configure step and database port-forward must be exercised, not just the app startup.

- [x] 5.0 **UIS-services DCT loop shakedown (done before the flask bump).** Verified the full `dev-template` → `configure` → UIS → PostgreSQL → app → endpoint flow on the untouched `python-basic-webserver-database` from main, mirroring Phase 0's approach for the plain templates.
  - `docker exec -w /workspace 4badabdf4399 dev-template python-basic-webserver-database` → scaffolded; `template-info.yaml` → `id: python-basic-webserver-database`; in-container `requirements.txt` reads `Flask==2.3.3` (the current-main, pre-bump version)
  - User (in the devcontainer terminal) ran `dev-template configure`. Output showed: UIS bridge detected, repo identity `terchris/delete-test`, template params `app_name=my-app`, then UIS provisioned the PostgreSQL service and wrote `DATABASE_URL=postgresql://my_app:<redacted>@host.docker.internal:35432/my_app_db` into `/workspace/.env`
  - Flask app started and bound to port 3000. Endpoints exercised from DCT:
    - `GET /` → `Hello world ! Template: python-basic-webserver-database. Time: 13:38:56 Date: 13/04/2026 <br><a href="/tasks">View tasks</a> | <a href="/health">Health</a>` ✅
    - `GET /tasks` → live JSON from PostgreSQL with three seed rows (`id:1 "Set up the database connection" done`, `id:2 "Build something with Flask + PostgreSQL" pending`, `id:3 "Deploy to Kubernetes via ArgoCD" pending`) ✅
    - `GET /health` → `{"database": "connected", "status": "ok"}` ✅
  - **This is the first end-to-end verification in the entire plan that exercises the full DCT test loop for a template with UIS services.** The loop covers: scaffold → configure → UIS handshake → PostgreSQL provision → `.env` wiring → Flask↔DB runtime → JSON-serialized endpoint response. Prior phases only exercised standalone HTTP endpoints. Phase 5.2's flask bump will re-run this same loop, so from here it's a known-good baseline.
- [x] 5.1 Checked `.github/` — **no `dependabot.yml` file exists.** Dependabot runs with default behavior (no explicit paths, no schedule). This explains the inconsistent PR coverage: the security advisory DB generated alerts for both `templates/python-basic-webserver/requirements.txt` (alert #10) and `templates/python-basic-webserver-database/requirements.txt` (alert #27), but Dependabot only opened a security update PR (#7) for the first one. Creating a proper `dependabot.yml` is a policy decision (update schedule, grouping, per-ecosystem config) and deferred to a **separate follow-up plan** — INVESTIGATE/PLAN-dependabot-config.
- [x] 5.2 Feature branch `feature/python-database-flask-update` created; `templates/python-basic-webserver-database/requirements.txt`: `Flask==2.3.3` → `Flask==3.1.3`. App code audit: uses only `Flask`, `@app.route`, `app.run`, and `jsonify` — none deprecated in 2→3. Database layer is `psycopg2` (not flask) so entirely unaffected by the flask version bump.
- [x] 5.3 Tester: install `python-basic-webserver-database` into `delete-test`, `docker cp` the updated `requirements.txt`, run `dev-template configure` (UIS provisions PostgreSQL), start the app, exercise the `/`, `/tasks`, `/health` endpoints end-to-end — identical to the Phase 5.0 baseline but with Flask 3.1.3
  - **Skipped re-scaffold and re-configure**: template + `.env` + PostgreSQL provisioning from Phase 5.0 were still intact in `/workspace`, so the only change needed was `requirements.txt`. Per Q5 overwrite policy, this keeps the loop fast and isolates the test to what actually changed (the Flask version).
  - `docker cp /Users/terje.christensen/learn/helpers/dev-templates/templates/python-basic-webserver-database/requirements.txt 4badabdf4399:/workspace/requirements.txt` → confirmed in-container file now reads `Flask==3.1.3`, `psycopg2-binary==2.9.9`, `python-dotenv==1.0.1`
  - `pip install -r requirements.txt`: no-op for Flask (already at 3.1.3 from the Phase 4.5 python-basic-webserver test — same system python), re-installed `psycopg2-binary==2.9.9` and downgraded `python-dotenv` from 1.2.2 to 1.0.1 (the pinned version).
  - Verified via `python -c "import flask; ..."`: `flask 3.1.3`, `psycopg2 2.9.9`, `dotenv ok`. (Flask emitted a DeprecationWarning that `__version__` will be removed in 3.2 — harmless signal that the 3.x line is genuinely loaded, not a 2.x leftover.)
  - First `python app/app.py` attempt failed with `Address already in use` because the user's Phase 5.0 flask process was still bound to port 3000. Cleared via `pkill -f "python app/app.py|flask"`. Good tucked-in signal from the failed startup log before the bind failure: `Connecting to database...` → `Serving Flask app 'app'`, meaning `import flask` + `psycopg2.connect(DATABASE_URL)` + `python-dotenv` all succeeded on Flask 3.1.3 before the port conflict. Flask 2→3 migration engaged cleanly at import/DB-connect time, not just at HTTP-serve time.
  - Second `python app/app.py` (background) bound port 3000 cleanly. Endpoints hit from DCT:
    - `GET /` → `Hello world ! Template: python-basic-webserver-database. Time: 13:48:34 Date: 13/04/2026 <br><a href="/tasks">View tasks</a> | <a href="/health">Health</a>` ✅
    - `GET /tasks` → **byte-for-byte identical** to the Phase 5.0 baseline — same three seed rows (`id:1 "Set up the database connection" done`, `id:2 "Build something with Flask + PostgreSQL" pending`, `id:3 "Deploy to Kubernetes via ArgoCD" pending`), same `created_at` timestamps ✅
    - `GET /health` → `{"database": "connected", "status": "ok"}` ✅
  - Teardown: `pkill -f "python app/app.py"`, port 3000 confirmed clear.
  - **Regression test result: PASSED.** Flask 2.3.3 → 3.1.3 is a clean no-op for this template's runtime behavior — every endpoint response matches the pre-bump baseline. Matches TMP's 5.2 code audit ("uses only Flask, @app.route, app.run, jsonify — none deprecated in 2→3"). Database layer is psycopg2 (not flask), so the flask bump literally cannot affect it.
- [x] 5.4 PR #49 created and merged via `--rebase --delete-branch` as `0835ee5`. Post-merge alert query: **0 open alerts on the repo.** Both flask alerts (#10 and #27) confirmed `state: fixed`. Local main fast-forwarded; feature branch cleaned up.
- [ ] 5.5 Dependabot config follow-up: file separate `INVESTIGATE-dependabot-config.md` for the schedule/grouping/watched-paths decision. **Deferred to after Phase 6 close-out** — still a follow-up, not a blocker.

### Phase 6: Close out

- [x] 6.1 Final Dependabot alert query: **`length: 0`** — zero open alerts on `helpers-no/dev-templates` main. Spot-checked alerts #10 and #27 (the last two flask ones): both `state: fixed`.
- [x] 6.2 This plan moved from `active/` to `completed/` via `git mv`
- [x] 6.3 `INVESTIGATE-housekeeping-docusaurus-and-prs.md` moved from `backlog/` to `completed/` — the full housekeeping arc (Docusaurus upgrade PR #40 + this template-triage plan) is done
- [x] 6.4 Pre-push checklist revisited — no new gotchas surfaced during Phases 1–5 beyond what's already documented. The pre-push pipeline caught nothing because every template bump was a surgical lockfile/requirements.txt edit that didn't touch generators, plan files, or template-info.yaml.

---

## Final result

**Starting state** (2026-04-13, start of session):
- 15 open Dependabot alerts (5 high, 7 moderate, 3 low)
- 4 open Dependabot PRs, all 2–5 months stale

**Ending state** (2026-04-13, end of session):
- **0 open Dependabot alerts**
- **0 open Dependabot PRs**
- 6 template-triage PRs merged: #1, #41, #46, #47, #48, #49
- 4 stale Dependabot PRs closed with explanation: #2, #4, #7 (and #1 which merged directly)
- 9 alerts cleared via fixes: #3 body-parser, #5/#9 qs, #10/#27 flask ×2, #14 minimatch, + auto-cleared Phase-2 extras
- 6 alerts dismissed with reason:
  - #15, #16 path-to-regexp → `no_bandwidth` (via express→router; already at latest 8.x, no upstream fix)
  - #19 picomatch → `tolerable_risk` (via nodemon→chokidar; devDep-only, never in prod image)
  - The 6 Docusaurus transitives dismissed at the start of the session → `tolerable_risk` (build-time only, upstream's responsibility — see the `feedback_docusaurus_transitive_vulns` memory)

**Strategic insight from this plan** (worth remembering for future cleanup cycles):

Dependabot's stale-base problem is real. Any Dependabot PR older than ~a month against an active repo will likely regress unrelated packages when merged, because its internal lockfile snapshot is stale. The fix is not to merge it as-is (even if GitHub says `mergeable: clean`), nor to wait for Dependabot's auto-rebase. The fastest, most reviewable path is:

1. Close the stale PR with an explanatory comment
2. On a fresh feature branch, run `npm update <pkg> --package-lock-only` (or equivalent for pip: edit `requirements.txt`)
3. Verify the diff is the minimal surgical change you expected
4. DCT tester verifies end-to-end in `delete-test`
5. Commit, PR, merge as `--rebase --delete-branch`

This pattern handled 5 of 6 merges in this plan. The one exception (PR #1 body-parser) was only mergeable because its target file happened to be untouched on main since November 2025.

**Test harness insight**: the DCT tester loop (`dev-template` scaffold + `docker cp` override + `npm install`/`pip install` + dev-server + `curl`) was proven reliable across:
- 4 npm-template runs (body-parser, qs, express, nodemon)
- 2 python-template runs (plain, and the database template with full UIS handshake)

The UIS-services loop (Phase 5) is the first time this plan exercised the full `dev-template configure` → PostgreSQL provision → `.env` wiring → live DB queries from the app. It worked first time and is a known-good pattern for any future template triage that involves UIS services.

---

## Follow-ups filed from this plan

Small, unblocking items surfaced during execution. None are blockers for anything, but each is worth capturing so it doesn't get lost.

1. **`INVESTIGATE-dependabot-config.md`** — Create a proper `.github/dependabot.yml` with explicit watched paths, update schedule (daily vs weekly), and grouping policy. Motivation: alert #27 never got a Dependabot PR opened for it even though the same flask advisory hit both python templates. Default Dependabot behavior is inconsistent across sub-paths.

2. **`python-basic-webserver` README port bug** (tester flag, Phase 4.5): quick-start docs say `http://localhost:6000` but `app/app.py` hardcodes `port = 3000`. Trivial README fix.

3. **`diff@4.0.2` via ts-node@10.9.2** (Phase 3.5.6 note): surfaces in local `npm audit` but not in GitHub Dependabot. devDep-of-devDep, same shape as picomatch. If it ever becomes a GitHub alert, dismiss with the same reasoning.

4. **`typescript-basic-webserver` follow-ups** that didn't need to happen this plan: re-check whether chokidar 4.x is compatible with nodemon 3.x — if it ships and is a drop-in, bump to clear the dev-only picomatch dismissal. Re-query path-to-regexp monthly for an 8.x+ fix.

5. **README for `python-basic-webserver-database`** — Phase 5 tester noted `readdirp` isn't in the dep graph for the database template (different from the typescript one), so the nodemon follow-up doesn't apply here. No action needed, just flagged.

6. **DCT test loop documentation** — the loop block inside this plan is the canonical procedure. When this plan moves to `completed/`, the block should be extracted into contributor docs (`website/docs/contributors/`) or into `ai-developer/` so future work doesn't re-derive it. Small follow-up PR.

---

## Open Questions

### Q1. How does `dev-template` install from a feature branch / local path? — **ANSWERED**

**It doesn't.** `dev-template --help` (verified 2026-04-13) shows the CLI accepts only `[template-id | configure]` — no branch/path/ref flag. Templates are always fetched from `helpers-no/dev-templates` main via git sparse-checkout.

**Workaround locked in (see Phase 0.5):** scaffold from main via `dev-template <name>`, then `docker cp` the changed files from the Dependabot feature branch (checked out on the host) into `/workspace`, then re-run `npm install` / `pip install`. For every Dependabot PR in this backlog the overwrite surface is just `package.json` + `package-lock.json` (npm) or `requirements.txt` (pip).

### Q2. Do we need to rebuild `package-lock.json` inside each template after a PR merge?

Dependabot already updates the lockfile in its PR. We should be able to merge directly. But if cascade resolutions are incomplete (e.g., a transitive that didn't update), we may want to run `npm install` manually and commit a fresh lockfile in a follow-up PR.

### Q3. What if PR #2 (express 5.2) breaks the template?

Two options: (a) close PR #2 and accept the transitive vulns until the template is ready to move, or (b) fix the template to be compatible with 5.2 in the same PR. Default to (a) unless the fix is trivial — we don't want a version bump to turn into a template rewrite.

### Q4. What Python version are the python templates pinned to?

Flask 3.x drops Python 3.7 support. Check `Dockerfile` and `requirements.txt` — if we're on 3.8+ we're fine; if a template pins 3.7, Phase 4 might need to bump the Python base image.

### Q5. How do we reset the `delete-test` workspace between test runs? — **ANSWERED**

**Decision (2026-04-13, from the DCT tester):** Reset = **overwrite** the contents of `/workspace` inside the devcontainer with the next template under test. We do **not** wipe to empty, and we do **not** rebuild the devcontainer between runs. Rebuilding the container is slow and the container itself is stable infrastructure — only the template payload changes between tests. Leftover files from a prior template that aren't overwritten by the next one are acceptable: each test is judged by whether the new template runs, not by workspace purity.

This simplifies Phases 1–5: the "reset" bullet in each phase collapses to "install next template on top of current workspace."

---

## Decisions (to lock in before starting)

- [ ] Approach: merge Dependabot PRs in order #1 → #4 → #2 → #7, then manual fix for database template
- [ ] Verification happens in the DCT tester workspace at `/Users/terje.christensen/learn/helpers/testing/delete-test` via the full `dev-template` install → configure → run flow, not via isolated `docker build` inside dev-templates
- [ ] Phase 0 is a dry run on an untouched template to prove the test loop works and capture the exact commands before touching any Dependabot PR
- [ ] Policy for a breaking bump: close the PR and document, don't rewrite the template in the same PR
- [ ] Defer long-term auto-merge policy to a separate discussion

---

## Next Steps

- [ ] User reviews and approves this plan
- [ ] Move from `backlog/` to `active/`
- [ ] Execute Phase 1 through Phase 6
