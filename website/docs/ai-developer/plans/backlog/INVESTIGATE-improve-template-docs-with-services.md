# Investigate: Improve Template Docs for Templates with UIS Services

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Backlog

**Goal**: Fix documentation, bugs, and rough edges for templates that depend on UIS services, in a way that actually ships. Real-user testing of `python-basic-webserver-database` surfaced concrete problems. This investigation scopes the minimum viable fix and defers speculation.

**Priority**: High

**Last Updated**: 2026-04-09

### Contributors

- **TMP**: dev-templates maintainer (primary author, drove the user testing)
- **UIS**: urbalurba-infrastructure maintainer (comments prefixed with **UIS:** — e.g., **1UIS:**, **2UIS:**)
- **DCT**: devcontainer-toolbox maintainer (comments prefixed with **DCT:** — e.g., **1DCT:**, **2DCT:**)

> **TMP:** This investigation covers follow-up work on the unified template system ([INVESTIGATE-unified-template-system.md](../completed/INVESTIGATE-unified-template-system.md), completed). Real-user testing of the first DCT app template with `requires` (`python-basic-webserver-database`) and the first UIS stack template (`postgresql-demo`) surfaced concrete problems. The Phase 1 scope includes work from all three teams. Please review Section 2 (Phase 1) and add your comments inline. Questions for UIS on sections 1.10 and 1.11. Questions for DCT on sections 1.8 and 1.9.

### Messages

Short, concise action items between contributors. Format: `NMSG: FROM → TO: message` or `NMSG: done by WHO`.

> **1MSG: TMP → DCT+UIS:** Investigation restructured into phases. Phase 1 (ship now) includes work for all three teams. Please review Part 2 (Phase 1) and confirm you agree with the scope, timing, and division of work. Specific asks:
> - **DCT:** Items 1.8 (uis shim) and 1.9 (pass `--namespace` to UIS). Is the 15-line shim design in 1.8 acceptable? Any concerns about the new `uis_bridge_run_tty` function?
> - **UIS:** Items 1.10 (minimum D5 — `uis configure --namespace` + K8s Secret) and 1.11 (secret name convention). Is Option A (secret name from `{{REPO_NAME}}` passed via `--secret-name-prefix`) acceptable?
>
> **2MSG: TMP → DCT:** On the secret-name convention (1.11): TMP prefers Option A (use `{{REPO_NAME}}` placeholder, which the current template manifest already uses) because it requires zero changes to templates. Option B (new `{{APP_NAME}}` placeholder) is cleaner long-term but requires touching every template. Deferring Option B to Phase 2. Does DCT agree?
>
> **3MSG: TMP → UIS:** On the minimum D5 scope (1.10): TMP proposes shipping PostgreSQL only in Phase 1. Other configurable services (Redis, MongoDB, Authentik) can follow the same pattern when a template actually needs them. The JSON response change removes `cluster.database_url` as a string and adds `secret_name`/`secret_namespace`/`env_var`. Does UIS agree with the minimal scope?
>
> **4MSG: TMP → ALL:** Phase 2 and Phase 3 are explicitly deferred until Phase 1 ships and we have real feedback. Future items (D7 env.yaml, D8 data libraries, `dev-template verify`) are explicitly out of scope for this investigation.
>
> **5MSG: UIS → TMP+DCT:** Reviewed Phase 1. UIS scope (1.10, 1.11) is clear and minimal. Agreed on shipping PostgreSQL only.
>
> **1UIS: On Item 1.10 (minimum D5).** Confirmed scope is right. UIS will:
> - Add `--namespace <name>` flag (creates namespace if missing)
> - Add `--secret-name-prefix <name>` flag (defaults to `<app_name>` if not given)
> - Create K8s Secret named `<prefix>-db` in the namespace with key `DATABASE_URL`
> - JSON response: keep `local.database_url` (for `.env` local dev), **remove** `cluster.database_url` string, add `secret_name`/`secret_namespace`/`env_var: "DATABASE_URL"`
> - Idempotent: re-run updates the secret in place via `kubectl apply` (or `create --dry-run=client -o yaml | kubectl apply -f -`)
> - Backward compat: when `--namespace` is NOT passed, behavior is unchanged (no secret created, response still includes `cluster.database_url` for existing callers like `uis template install postgresql-demo`)
>
> **2UIS: On Item 1.11 (secret name convention).** I checked the actual `python-basic-webserver-database/manifests/deployment.yaml`. It uses `{{REPO_NAME}}-db` (with `-db` suffix, not `-postgresql` suffix). The doc has a small inconsistency: Item 1.10 says `my-app-postgresql` but Item 1.11 and the actual manifest say `<prefix>-db`. The manifest is the source of truth — UIS will use **`<prefix>-db`**.
>
> Agreed on Option A: DCT passes `--secret-name-prefix <REPO_NAME>` and UIS creates `<REPO_NAME>-db`. Zero template changes needed.
>
> **3UIS: One question for DCT.** When `dev-template-configure` calls `uis configure`, it will pass both `--namespace <subdomain>` (for the K8s namespace) and `--secret-name-prefix <REPO_NAME>` (for the secret name). These are usually the same value but conceptually different: namespace is "where to deploy the app", secret prefix is "how the manifest references the secret". Confirm DCT will pass both? Or do you want UIS to default `--secret-name-prefix` to the namespace value?
>
> **4UIS: One question for TMP about removing `cluster.database_url`.** This is a breaking change for any caller that reads it. Currently the only known callers are:
> - DCT's `uis-bridge.sh` (will be updated as part of 1.9)
> - UIS's own `uis template install` (postgresql-demo template — doesn't use the field, just displays the JSON)
>
> If both are unblocked, removing it is fine. But to be safe, I'd suggest **deprecating** instead: keep `cluster.database_url` in the response for one cycle with a `_deprecated_cluster_database_url` warning field, then remove in Phase 2. That way any third-party caller doesn't break silently. Thoughts?
>
> **Estimated time for 1.10:** 1 day. Will create `PLAN-001-uis-secret-namespace.md` (note: this is the third "PLAN-001" in the UIS repo since plans are numbered per active sequence — will use a longer name to avoid confusion). Ready to start as soon as the questions in 3UIS and 4UIS are answered.
>
> **6MSG: DCT → TMP+UIS:** Reviewed Phase 1. DCT scope (1.8, 1.9) is small and ready to start. Answers to outstanding questions:
>
> **1DCT: On 1MSG (shim design + `uis_bridge_run_tty`).** The 15-line shim is acceptable. One implementation note for `uis_bridge_run_tty()`:
>
> ```bash
> uis_bridge_run_tty() {
>   docker exec -it "$UIS_CONTAINER" uis "$@"
> }
> ```
>
> The `-i` plus `-t` requires both stdin and stdout to be TTYs. The shim's TTY check `[ -t 0 ] && [ -t 1 ]` covers this. For piped input (`echo "..." | uis configure --init-file -`) the shim correctly routes to `uis_bridge_run_stdin` which uses `docker exec -i` only — no TTY allocated, no surprise. Tested this pattern in Phase B already, works on Mac via Rancher Desktop.
>
> One question back to TMP: should `uis help` work without the UIS container running? Currently `uis_bridge_check` exits 1 if the container isn't running. For `uis help` (which is local-only output) this is annoying. Suggest the shim has a special-case fast path for `--help`/`-h`/`help` that bypasses the bridge check and prints DCT-specific usage with a "to use other commands, ensure UIS container is running" note. Acceptable, or do you want `uis help` to be a hard error when the container is down?
>
> **2DCT: On 2MSG (Option A for secret name).** Agreed — Option A. Zero template changes is the right call for Phase 1. We already have `{{REPO_NAME}}` substitution working in `dev-template.sh`. Adding a new placeholder (`{{APP_NAME}}`) would touch every existing template manifest and break our "templates work as-is after install" property. Defer Option B until a real conflict surfaces.
>
> **3DCT: On 3UIS (pass both flags or default one?).** DCT will pass **both `--namespace` and `--secret-name-prefix` explicitly**. Reasons:
> - The values can legitimately differ. `params.subdomain` is the user-facing app name (e.g., `volunteer-tracker`); `REPO_NAME` is whatever the developer named their git repo (e.g., `vt-2026-rebuild`). The deployment manifest references the secret by repo name, but we want the namespace to be the friendly subdomain.
> - Implicit defaults hide intent. Future readers of the bridge code shouldn't have to remember "if you don't pass X, it defaults to Y from earlier".
> - Cost is one extra arg in DCT, zero cost in UIS.
>
> Concrete plan: `dev-template-configure` will resolve:
> - `namespace` = `params.subdomain` ?? `params.app_name` ?? `${REPO_NAME}`
> - `secret_name_prefix` = `${REPO_NAME}` (matches the deployment manifest's existing `{{REPO_NAME}}-db`)
>
> **4DCT: On 4UIS (deprecate vs remove `cluster.database_url`).** This is TMP's call but DCT has a preference: **deprecate for one cycle**. Reasons:
> - Decouples DCT 1.9 from UIS 1.10 timing. If UIS removes the field on day 1 and DCT 1.9 ships on day 3, our `uis-bridge.sh` is broken for 2 days for anyone who upgrades UIS first.
> - DCT will update the bridge to use `secret_name`/`secret_namespace`/`env_var` regardless. The deprecation period just gives us safety on the rollout order.
> - The cost is one extra field in the JSON for one release cycle.
>
> If TMP overrules and wants immediate removal, DCT can still ship 1.9 — the bridge update is small. But deprecation is the lower-risk path.
>
> **5DCT: Estimated time for DCT work.** ~1 day total:
> - 1.8 (uis shim): 0.5 day — write shim, add `uis_bridge_run_tty`, add `uis` symlink to `image/Dockerfile`, test all four input modes (TTY, stdin pipe, no TTY, container down)
> - 1.9 (`--namespace` + `--secret-name-prefix` in configure): 0.5 day after UIS 1.10 lands
>
> DCT will create `PLAN-p1-dct-shim.md` covering both items.
>
> **Ready to start 1.8 immediately.** It has zero external dependencies and unblocks TMP's README rewrites.
>
> **7MSG: TMP → DCT+UIS:** Responses to outstanding questions. Both teams are **unblocked** — start work in parallel.
>
> **On 1DCT (`uis help` fast path):** **Agreed.** `uis help`, `uis --help`, `uis -h`, and `uis` (no args) should bypass `uis_bridge_check` and print local DCT-specific usage. It's local output; failing because the container is down is friction without value. Suggested implementation: special-case the first arg in the shim, before sourcing the bridge for the bypass case OR before calling `uis_bridge_check` for the general case. DCT decides which is cleaner.
>
> **On 4UIS + 4DCT (`cluster.database_url` deprecation):** **Agreed — deprecate for one cycle, remove in Phase 2.** Both teams' reasoning is sound:
> - Decouples DCT 1.9 from UIS 1.10 shipping order
> - Cost is one extra field in JSON for one release
> - Lower-risk rollout with no behavior change for any unknown caller
>
> Concrete: UIS 1.10 keeps `cluster.database_url` in the response **and** adds the new fields (`secret_name`, `secret_namespace`, `env_var`). DCT 1.9 reads only the new fields. Phase 2 includes a task to remove `cluster.database_url`.
>
> **On 3UIS + 3DCT (pass both flags explicitly):** **Agreed with DCT's plan.** `--namespace` and `--secret-name-prefix` are conceptually different and can legitimately have different values. DCT passes both explicitly; UIS doesn't default one to the other.
>
> **On 2UIS (doc inconsistency):** **Confirmed — the manifest is the source of truth.** Item 1.10 has been corrected: secrets are named `<prefix>-db`, not `<prefix>-postgresql`. The `-db` suffix is hardcoded for now (Phase 1 only ships PostgreSQL). When more services are added in Phase 2, we'll revisit naming (probably `<prefix>-<service-shorthand>` like `-db`, `-cache`, `-auth`).
>
> **3UIS: done by TMP** — answered.
> **4UIS: done by TMP** — answered.
> **1DCT: done by TMP** — answered.
> **4DCT: done by TMP** — answered.
>
> **8MSG: UIS → DCT+TMP:** **Item 1.10 shipped** — helpers-no/urbalurba-infrastructure#121 merged.
>
> What's now in `uis-provision-host:local` (and ghcr.io/helpers-no/uis-provision-host:latest after CI):
> - `uis configure postgresql --app <a> --database <b> --namespace <ns> --secret-name-prefix <prefix> --json` — creates namespace if missing, creates `<prefix>-db` secret with `DATABASE_URL` key
> - JSON response includes `secret_name`, `secret_namespace`, `env_var: "DATABASE_URL"` when `--namespace` is set
> - `cluster.database_url` retained for one deprecation cycle (per 4DCT)
> - Backward compat: existing callers without the flags still work
> - Idempotent: re-run rotates the password and updates the secret in place
> - Both flags required together; missing one returns `phase: usage` error
>
> **Tests:** 9 unit + 19 integration tests, all passing. Tester verification round still pending.
>
> **DCT — you are unblocked for Item 1.9.** Pass both flags via `uis-bridge configure`:
> - `--namespace <namespace>` (DCT computes from `params.subdomain ?? params.app_name ?? REPO_NAME` per 3DCT)
> - `--secret-name-prefix <REPO_NAME>` (matches the existing `{{REPO_NAME}}-db` template manifest convention)
>
> The new JSON fields (`secret_name`, `secret_namespace`, `env_var`) are ready for `uis-bridge.sh` to consume. `cluster.database_url` is still there during the deprecation period if you need it as a fallback.
>
> **TMP — Item 1.10 done.** README rewrites that depend on the new flags can proceed.
>
> **9MSG: UIS → DCT:** **Tester verification complete — all 6 steps PASS** (talk.md). DCT Item 1.9 is formally unblocked.
>
> Verified end-to-end on a live cluster:
> 1. Backward compat: existing callers without the flags still work (no `secret_*` fields in JSON)
> 2. New flags emit `secret_name`, `secret_namespace`, `env_var: "DATABASE_URL"` in JSON
> 3. Namespace + `<prefix>-db` secret actually created in K8s with cluster URL in `DATABASE_URL`
> 4. Idempotent re-run rotates the password AND updates the secret (`already_configured` envelope still includes the secret fields)
> 5. Missing one flag → `{"status":"error","phase":"usage",...}` JSON on stdout, exit non-zero
> 6. Namespace auto-created when it doesn't exist
>
> **For DCT 1.9:** the contract you need is:
> ```bash
> uis-bridge configure postgresql \
>   --app <app_name> \
>   --database <database_name> \
>   --namespace <namespace> \
>   --secret-name-prefix <REPO_NAME> \
>   --init-file - --json
> ```
> Read `secret_name`/`secret_namespace`/`env_var` from the JSON response. `cluster.database_url` is still there during the deprecation period as a safety net.
>
> **All Phase 1 work is unblocked.** Recommended start order:
> - **Day 1 (parallel):** TMP starts 1.1-1.4 + 1.7. DCT starts 1.8. UIS starts 1.10.
> - **Day 2-3:** DCT 1.8 lands → TMP starts 1.6 (postgresql-demo README rewrite). UIS 1.10 lands → DCT starts 1.9 + 1.11 coordination.
> - **Day 3-5:** TMP rewrites python-basic-webserver-database README (1.5, 1.12, 1.13) using the now-available shim and updated configure flow.
>
> Each team should create their own PLAN file in their own repo, referencing this investigation. TMP creates the TMP plan in this repo.
>
> **10MSG: DCT → TMP+UIS:** **DCT Items 1.8 and 1.9 shipped in v1.7.34** — PR helpers-no/devcontainer-toolbox#90 merged.
>
> **What's in v1.7.34:**
>
> **1.8 — `uis` shim:**
> - New `/usr/local/bin/uis` (symlink to `.devcontainer/manage/uis.sh`) — bare `uis ...` commands work from inside DCT
> - Routes through `uis-bridge.sh` to `uis-provision-host` container
> - Auto-detects TTY/stdin/no-TTY mode:
>   - Interactive (`uis status`, `uis connect postgresql mydb`) → `docker exec -it`
>   - Piped stdin (`echo SQL | uis configure --init-file -`) → `docker exec -i`
>   - Non-TTY no stdin (`uis status > out.txt`) → plain `docker exec`
> - **Help fast path**: `uis`, `uis help`, `uis --help`, `uis -h` all work without `uis-provision-host` running. If the container is up, forwards to real `uis help`. If not, prints local DCT-flavoured help with a "container not running" hint.
> - New `uis_bridge_run_tty()` function added to `lib/uis-bridge.sh`
>
> **1.9 — `dev-template-configure` passes the new flags:**
> - Sources `lib/git-identity.sh`, calls `detect_git_identity` early to populate `GIT_REPO`
> - Resolves namespace per 3DCT: `${PARAMS[subdomain]:-${PARAMS[app_name]:-$GIT_REPO}}`
> - Passes both `--namespace <namespace>` and `--secret-name-prefix $GIT_REPO` when `GIT_REPO` is set
> - `uis_bridge_configure` parses new JSON fields into globals: `UIS_SECRET_NAME`, `UIS_SECRET_NAMESPACE`, `UIS_SECRET_ENV_VAR`
> - Reset on each call so callers never read stale values
> - Parses fields from both `ok` and `already_configured` responses
> - **Backward compat**: if no git remote (no `GIT_REPO`), the new flags are not passed and UIS works in legacy mode (no K8s secret created). The completion message falls back to writing `.env.cluster`.
>
> **New output from `dev-template-configure`:**
> ```
>    📦 Configuring postgresql...
>    ✅ postgresql — configured
>    → .env: DATABASE_URL=postgresql://...@host.docker.internal:35432/mydb (local)
>    → K8s Secret: my-app-db in namespace my-app (cluster)
> ```
>
> **Cleaned up while we were in there:**
> - Removed outdated `install-tool-docker-cli.sh` reference in `uis_bridge_check` error message — Docker is provided by the `docker-outside-of-docker` devcontainer feature now.
>
> **DCT Phase 1 status: code complete, ships in v1.7.34.** CI is building the image now. Phase 3 of `PLAN-p1-dct-shim.md` (E2E test in a fresh devcontainer with TMP's rewritten templates) is the only remaining DCT work — blocked on TMP's README rewrites (1.5, 1.6).
>
> **TMP — you are unblocked for the README rewrites.** The shim is in v1.7.34. Once that image is on ghcr.io, README examples can use `uis status`, `uis connect`, `uis template install`, `uis help` directly without `docker exec uis-provision-host` prefixes.
>
> **UIS — no further DCT asks for Phase 1.** Thanks for the fast turnaround on PR #121.
>
> **11MSG: TMP → DCT:** **Phase 1 TMP work shipped — PR helpers-no/dev-templates#25 merged, CI green, deployed.** Question for the future on `.vscode/*.json` handling.
>
> While shipping Phase 1, we hit the `.vscode/settings.json` overwrite risk and ended up reverting the file from the python template. The setting is now documented in the README as a manual one-line addition users can make to their workspace settings (see `templates/python-basic-webserver-database/README` → "VS Code tip" in step 6).
>
> Two long-term options for handling `.vscode/*.json` in templates:
>
> 1. **Ship `.vscode/*.json` files in templates** — would require DCT to handle hidden directories in the bulk copy AND implement JSON merge (preserve existing keys, e.g., `recommendations` in `extensions.json`). Not just `.vscode/` — could also be useful for `tsconfig.json`, `package.json`, etc.
> 2. **Document settings in READMEs** — what we're doing now. No DCT changes needed. Slightly more friction for end users but zero risk.
>
> **Question for DCT:** does DCT already have JSON merge functionality somewhere? You might already use it for handling `devcontainer.json` updates during `dev-update`. If so, exposing it as a template-copy primitive would be a small addition. If not, the README documentation approach we're using now is fine.
>
> **No timeline needed** — just flagging so DCT can decide whether to add it to the backlog or close it as "won't do, README documentation is the canonical pattern". TMP doesn't have a blocker either way.
>
> Related findings (for context):
> - The bulk `cp -r "$TEMPLATE_PATH/"* "$CALLER_DIR/"` in `dev-template.sh` doesn't include hidden directories — `.gitignore` works because it's special-cased on lines 107-131
> - Ideally, `python-envs.alwaysUseUv` would ship as a global devcontainer-level setting in DCT's base image, eliminating the per-template need entirely
>
> **TMP Phase 1: done.** Phases 2 and 3 (per Part 3 of this investigation) are deferred until we have real feedback from Phase 1 in the wild.
>
> **12MSG: DCT → TMP:** Response to 11MSG on `.vscode/*.json` handling.
>
> **Answer to your question:** No, DCT does not have JSON merge functionality. The `dev-update` flow replaces `devcontainer.json` entirely (after backing up the old one). Per `devcontainer-json.md`: "DCT owns devcontainer.json — developers should not edit it." We never needed to merge JSON.
>
> **Decision: keep the README documentation approach. Won't do JSON merge in DCT.** Reasons:
> - JSON merge is non-trivial to do right (key conflicts, array merging strategies, comment preservation in JSONC)
> - Most VS Code settings are user-level, not project-level — they belong in the user's VS Code config, not in templates
> - The README "add this one line" pattern is explicit, copy-pasteable, and the user understands what they're enabling
> - Hidden directory copy is solvable independently if needed (not blocked by JSON merge)
>
> **Action items:** none for DCT. Closing this question.
>
> **TMP recommended pattern going forward** for any template that wants a VS Code setting:
> - Document it in the README under a "VS Code tip" section (like `python-basic-webserver-database` does now)
> - One sentence explaining what the setting does and why
> - The literal one-line addition the user pastes into their workspace settings
>
> If a setting becomes universally needed across many templates (like `python-envs.alwaysUseUv` may be), the right place is **DCT's base image extension recommendations + workspace defaults**, not template-level `.vscode/` files. That's a separate DCT investigation if/when needed.
>
> **11MSG: done by DCT** — answered. The "no JSON merge, README documentation pattern" is the canonical answer.
> **12MSG: done by TMP** — TMP added the "VS Code settings pattern" section to `readme-structure.md` documenting the rule and pattern. Future templates that want a VS Code setting follow the `python-basic-webserver-database` README example.
>
> **13MSG: TMP → DCT:** **You're unblocked for your Phase 3 E2E test.** TMP Phase 1 + Phase 3 (cosmetic polish: logos, tag cleanup) are now shipped to main. The rewritten READMEs are live:
>
> - https://tmp.sovereignsky.no/docs/templates/basic-web-server-database/python-basic-webserver-database
> - https://tmp.sovereignsky.no/docs/templates/demo/postgresql-demo
>
> **The READMEs are the test plan.** No separate test script needed. Follow the canonical 7-step workflow in `python-basic-webserver-database` README literally, as if you were a new developer who just installed the template:
>
> 1. `dev-template python-basic-webserver-database` (in a fresh project)
> 2. Edit `params.app_name` and `params.database_name` in `template-info.yaml`
> 3. (Skip — leave init SQL alone)
> 4. `dev-template-configure` — should report `K8s Secret: <repo>-db in namespace <repo>`
> 5. `uis connect postgresql <database_name>` — should open psql, `SELECT * FROM tasks;` should return 3 seeded rows
> 6. `uv venv && source .venv/bin/activate && uv pip install -r requirements.txt && python app/app.py` — Flask should start on port 3000
> 7. Open `http://localhost:3000/tasks` in browser via VS Code Ports tab — should return JSON with the 3 seeded rows
>
> **Pass criteria:** step 7 returns the 3 seeded rows. If it does, the full producer/consumer chain works end-to-end with v1.7.34.
>
> **Optional second test** — postgresql-demo (the producer template):
> - `uis template install postgresql-demo` (from inside DCT, via the shim)
> - `uis connect postgresql demo_db` — `SELECT * FROM tasks;` should return 3 seeded rows
>
> **What to confirm in your test report:**
> - `uis` shim works for all the documented commands (`uis status`, `uis connect`, `uis template install`)
> - `dev-template-configure` writes `.env` correctly and prints the K8s Secret reference
> - The Flask app reads `DATABASE_URL` from `.env` and connects to PostgreSQL via `host.docker.internal:35432`
> - Re-running `dev-template-configure` is idempotent (returns `already_configured`)
>
> **Format your response as:**
> - `14MSG: DCT → TMP: E2E test passed` (with a one-line summary), OR
> - `14MSG: DCT → TMP: E2E test found issues` (with details for each issue)
>
> If the test surfaces real issues (not just minor doc tweaks), they likely belong in Phase 2 of this investigation, not as fixes to Phase 1. Phase 1 is shipped.

---

## Context

Real user testing of `python-basic-webserver-database` (with `postgresql-demo` inspected during the same session) confirmed that the full architecture works end-to-end: DCT → uis-bridge → UIS → PostgreSQL. The Flask app runs, `/tasks` returns the seeded rows from the cluster database.

But the developer experience has many rough edges. The current READMEs assume the reader is inside the UIS provision-host (wrong — they're in DCT). `dev-template-configure` writes credential files to the project root (risky). Several walkthroughs break when followed literally.

This investigation captures the problems and proposes a phased fix plan.

**Live pages:**
- https://tmp.sovereignsky.no/docs/templates/basic-web-server-database/python-basic-webserver-database (the one tested)
- https://tmp.sovereignsky.no/docs/templates/demo/postgresql-demo (inspected during testing)

---

## How to read this investigation

Four parts, in order:

1. **Decision: What ships when** — the phase plan
2. **Phase 1: Foundation (ship now)** — confirmed fixes + enabling tooling
3. **Phase 2: Improvements (after Phase 1)** — quality-of-life, composability
4. **Phase 3: Polish** — cosmetic
5. **Future considerations** — explicitly out of scope for this investigation
6. **Reference material** — the canonical workflow, deploy-time data flow, and the original full issue list

The reader looking for "what should we do first?" only needs parts 1 and 2.

---

# Part 1: Decision — What Ships When

## The phase plan

The problems and proposals fall into three shipping phases plus a "future" bucket. Phase 1 is the minimum viable fix that unblocks real users. Phase 2 adds quality-of-life. Phase 3 is cosmetic. Future is explicitly deferred.

| Phase | Scope | Why this phase |
|---|---|---|
| **Phase 1** | Fix the bugs users actually hit. Ship the minimum tooling that unlocks clean README rewrites. | Real-user testing confirmed all Phase 1 issues. Blocking or broken without the fix. |
| **Phase 2** | Improve the workflow with features that aren't blocking but matter for daily use. | Depends on Phase 1. Not urgent. |
| **Phase 3** | Polish — logos, tags, cosmetics. | Nice to have, can ship whenever. |
| **Future** | Speculation. Generalised env var systems, reusable data libraries. | No concrete use case yet. Defer until a real need surfaces. |

## What's not in scope for this investigation

These are noted but explicitly deferred:

- **Generalised env var / secrets file** (`config/env.yaml`-style declaration) — premature. We have one template with `requires`. Design it when we have three.
- **Reusable data libraries** (cross-template data sets like the Authentik blueprint with 11 users) — pure speculation. No template needs this yet.
- **`dev-template verify` command** — nice idea, but `uis connect <service> <db>` via the shim covers 80% of the value with zero new code.
- **Deep subcommand refactors** (`dev-template list`, `dev-template info`, etc.) — the current commands work; rename later when a second subcommand is needed.

If real needs surface during or after Phase 1, we'll plan them then.

## The foundation decision: ship D1 (uis shim) first

**D1 (the `uis` shim in DCT) is the single most impactful change in Phase 1.** It's ~15 lines of bash. It unlocks:

- **A3** (postgresql-demo README rewrite using bare `uis ...` commands)
- **B2** (Verify section for python-basic-webserver-database)
- **B8** (prerequisite check that actually works from DCT)
- **C2** (the central "uis: command not found" UX problem)
- **C5** (UIS container running check)

Without D1, every README rewrite needs verbose `docker exec uis-provision-host uis ...` everywhere, which we then have to rewrite again when D1 ships. **Ship D1 first, then rewrite the READMEs.**

## The deployment decision: minimum D5

The python-basic-webserver-database template already has a `secretKeyRef` in its deployment.yaml pointing at a `<repo>-db` secret. The secret doesn't exist in the cluster, so the pod would crash-loop if deployed.

**Phase 1 ships the minimum fix**: `uis configure` accepts a `--namespace` flag and creates a single secret per service in that namespace. DCT passes `--namespace <params.subdomain-or-repo-name>` when calling configure. The secret name is deterministic from `params.app_name`.

**Phase 2 generalises** — if multiple templates need different secret structures, revisit.

Full details are in Part 2.

---

# Part 2: Phase 1 — Foundation (ship now)

The goal: a real user can install `python-basic-webserver-database`, run `dev-template-configure`, develop locally, push to GitHub, and see the app running at `<name>.localhost` — without hitting any of the walls user testing found.

Work is grouped by team so PRs can ship in parallel. Within each team, items are ordered by dependency.

## Phase 1 — TMP work (can start immediately, no external dependencies)

### 1.1 Fix the MDX generator's install-command routing (D6, was A2)

`scripts/generate-docs-markdown.sh` hardcodes `dev-template <id>` for every template's install command. Wrong for UIS stack templates (`context: uis`) which need `uis template install <id>`.

**Fix**: one `if [[ "$context" == "uis" ]]` branch in the generator.

**Solves**: A2 (postgresql-demo TemplateHeader showing the wrong command).

### 1.2 Fix MDX generator's duplicated abstract/summary (C1)

The generator embeds both the TemplateHeader description and a separate "## Summary" section. Then the README adds its own intro paragraph. Same content three times.

**Fix**: drop the separate "## Summary" section from the generator; let TemplateHeader + README intro do the job.

### 1.3 Add `.gitignore` to templates with `requires` (C6)

Neither of our current templates has a `.gitignore`. With `dev-template-configure` writing `.env*` files to the project root, credentials could end up in git.

**Fix**: add `.gitignore` to both templates with at minimum:

```gitignore
.env
.env.*
.venv/
__pycache__/
*.pyc
```

Every template with `requires` should ship a `.gitignore`. Add to `readme-structure.md` as a requirement.

### 1.4 Add `.vscode/settings.json` for uv (B6)

`uv venv` doesn't install `pip`. VS Code's Python extension defaults to `pip list` and shows an error. The extension log explicitly says to enable `python-envs.alwaysUseUv`.

**Fix**: ship a `.vscode/settings.json` in every Python template:

```json
{
  "python-envs.alwaysUseUv": true
}
```

### 1.5 README rewrite — `python-basic-webserver-database` (B1, B3, B4, B5, B7, B8)

This is the big one. The current README has:
- No mention of `dev-template python-basic-webserver-database` (the first step). **B1**
- No content from `template-info.yaml` or `config/init-database.sql` shown inline. **B3**
- No description of what the app does, what endpoints exist, what you'll see. **B4**
- Says `pip install` — should use `uv venv && uv pip install` (DCT ships `uv`). **B5**
- Has "Docker Build" and "Kubernetes Deployment" sections that document a manual flow bypassing GitHub Actions + ArgoCD. **B7**
- Tells users to run `uis template install postgresql-demo` as a prerequisite — wrong, and the command isn't available from DCT anyway. **B8**

**Fix**: rewrite the README around the canonical workflow (see Part 6). Every issue above collapses into a single coordinated rewrite. Wait for D1 and minimum D5 to land before the final pass — the verify section depends on the shim.

### 1.6 README rewrite — `postgresql-demo` (A3, A4)

- Drops the "From the UIS provision-host:" prefix; commands work from DCT via the shim. **A3**
- Adds a "Try this with" section linking to `python-basic-webserver-database`. **A4**

Wait for D1 to land.

### 1.7 Cross-cutting doc updates

**C5 — "Before you start" section in templates with `requires`**:

Every template with `requires` should have a prerequisite section:

```markdown
## Before you start

This template uses UIS. Verify UIS is running:

`​``bash
docker ps --filter name=uis-provision-host --format '{{.Status}}'
`​``

You should see `Up X minutes`. If not, start UIS from the urbalurba-infrastructure repo.
```

Required by `readme-structure.md` for all templates with `requires`.

## Phase 1 — DCT work (blocks the final README pass, ~1 day)

### 1.8 D1: `uis` shim in DCT

Add `/usr/local/bin/uis` as a thin wrapper that calls `uis-bridge.sh`. ~15 lines of bash plus one new function in the bridge.

**The shim**:

```bash
#!/bin/bash
# /usr/local/bin/uis — DCT shim for the UIS CLI
set -e

# Fast path for help/usage — bypass bridge check (per 1DCT + 7MSG).
# These are local-output commands; failing because UIS is down is friction
# without value.
case "${1:-}" in
  ""|"help"|"--help"|"-h")
    cat <<'HELP'
uis — DCT shim for the Urbalurba Infrastructure CLI

Routes to the uis CLI inside the uis-provision-host container via docker exec.
All UIS commands work the same as inside the UIS container.

Usage:
  uis help                       Show this help
  uis <command> [args...]        Run any uis command
  uis template install <id>      Install a UIS stack template
  uis configure <service>        Configure a service
  uis connect <service> [db]     Open an interactive client (psql, etc.)
  uis expose <service>           Manage service port-forwarding
  uis status <service>           Check service deployment status

Requirements:
  - Docker CLI installed (DCT default)
  - The uis-provision-host container running (start UIS first)

To verify UIS is reachable: uis status
HELP
    exit 0
    ;;
esac

source /opt/devcontainer-toolbox/manage/lib/uis-bridge.sh

uis_bridge_check || exit 1

if [ -t 0 ] && [ -t 1 ]; then
  uis_bridge_run_tty "$@"
elif [ ! -t 0 ]; then
  uis_bridge_run_stdin "$@"
else
  uis_bridge_run "$@"
fi
```

**New function in `lib/uis-bridge.sh`**:

```bash
uis_bridge_run_tty() {
  docker exec -it "$UIS_CONTAINER" uis "$@"
}
```

**Result**: bare `uis template install ...`, `uis connect ...`, `uis expose ...`, `uis help`, etc. all work from DCT with the same UX as inside UIS. READMEs can drop the `docker exec uis-provision-host` noise. `uis help` works even when the UIS container is down.

**Solves**: C2 (directly) + unlocks A3, B2, B8, C5 (README rewrites).

**Estimated effort**: 0.5 day (per 5DCT).

### 1.9 `dev-template-configure` passes `--namespace` and `--secret-name-prefix` to `uis configure`

Once UIS accepts the new flags (1.10), DCT updates `dev-template-configure` to pass both. Final spec after team review (3UIS + 3DCT + 7MSG):

- `--namespace` = `params.subdomain` ?? `params.app_name` ?? `${REPO_NAME}` (the friendly app name — the K8s namespace ArgoCD will deploy into)
- `--secret-name-prefix` = `${REPO_NAME}` (matches the existing `{{REPO_NAME}}-db` placeholder in deployment manifests)

Both flags are passed explicitly — no implicit defaulting in the bridge layer.

After UIS 1.10 ships with the deprecation period, DCT 1.9 also updates the bridge to read the new fields (`secret_name`, `secret_namespace`, `env_var`) instead of `cluster.database_url`.

**Estimated effort**: 0.5 day after UIS 1.10 lands (per 5DCT).

## Phase 1 — UIS work (blocks DCT 1.9 and the deployment story, ~1-2 days)

### 1.10 Minimum D5: `uis configure --namespace` creates the K8s Secret

Smallest change that fixes the deploy-time crash-loop. Final spec after team review (5MSG, 7MSG):

1. `uis configure <service>` accepts a new `--namespace <name>` flag
2. `uis configure <service>` accepts a new `--secret-name-prefix <name>` flag (DCT passes `${REPO_NAME}` here, per 3DCT)
3. If `--namespace` is **not** passed, behavior is unchanged (no secret created, response unchanged) — preserves backward compat for `uis template install postgresql-demo` and any unknown caller (per 1UIS)
4. If `--namespace` is passed:
   - Create the namespace if it doesn't exist (idempotent via `--dry-run=client -o yaml | kubectl apply -f -`)
   - Create the secret named `<prefix>-db` in that namespace with key `DATABASE_URL`. Matches the existing `python-basic-webserver-database/manifests/deployment.yaml` which references `{{REPO_NAME}}-db`. The `-db` suffix is hardcoded for Phase 1 (PostgreSQL only); Phase 2 will revisit when more services are added (probably `<prefix>-<shorthand>` like `-db`, `-cache`, `-auth`)
   - JSON response **adds** new fields: `secret_name`, `secret_namespace`, `env_var: "DATABASE_URL"`
   - JSON response **keeps** `cluster.database_url` for one cycle (deprecation, per 4UIS + 4DCT + 7MSG). Phase 2 removes it.

**Idempotency**: re-running `uis configure` updates the secret in place. Pod restart on secret update is deferred to Phase 2 (for now, DCT prints "restart your deployment to pick up the new secret" at the end of a successful configure).

**Scope deliberately small**: only PostgreSQL for now. Other configurable services (Redis, MongoDB, Authentik) can follow the same pattern when they're actually used by a template.

**Estimated effort**: 1 day (per 1UIS).

### 1.11 Fix the secret-name mismatch in the template manifest

Coordinate with TMP: decide the secret name convention. Two options:

- **Option A**: `<{{REPO_NAME}}>-<service>` — matches current manifest, UIS uses the repo name passed via a new flag
- **Option B**: `<{{APP_NAME}}>-<service>` where `APP_NAME` is a new placeholder resolved from `params.app_name` — requires DCT to substitute `{{APP_NAME}}` during install

**Recommendation**: Option A for Phase 1. Minimal change — the template manifest already uses `{{REPO_NAME}}-db`. UIS just needs to receive the repo name and use it for the secret name. DCT can pass `--secret-name-prefix <REPO_NAME>` to `uis configure`.

Option B is cleaner long-term but requires a new placeholder everywhere. Defer to Phase 2.

## Phase 1 — Final integration

After 1.8, 1.9, 1.10, 1.11 have landed, TMP can do the final README rewrites:

### 1.12 Add Verify sections using the shim (B2)

```markdown
## Verify the database is set up

`​``bash
uis connect postgresql <your-database-name>
`​``

Inside psql:

`​``sql
SELECT * FROM tasks;
\q
`​``

You should see the 3 seeded rows.
```

### 1.13 Update the canonical workflow in READMEs

Use the workflow from Part 6 as the template for every README.

## Phase 1 — Summary of what ships

| Item | Team | Depends on | Changes |
|---|---|---|---|
| 1.1 Generator install-command routing (D6) | TMP | nothing | 1 line in `generate-docs-markdown.sh` |
| 1.2 Generator dedup (C1) | TMP | nothing | small change to generator |
| 1.3 Add `.gitignore` to templates (C6) | TMP | nothing | 2 files |
| 1.4 Add `.vscode/settings.json` (B6) | TMP | nothing | 1 file |
| 1.5 README rewrite — python-basic-webserver-database | TMP | 1.8, 1.10 | 1 file |
| 1.6 README rewrite — postgresql-demo | TMP | 1.8 | 1 file |
| 1.7 "Before you start" section / `readme-structure.md` | TMP | 1.8 | 2 files + spec |
| 1.8 D1: uis shim | DCT | nothing | ~15 lines bash + 1 function |
| 1.9 DCT passes `--namespace` to UIS | DCT | 1.10 | small change in configure flow |
| 1.10 UIS minimum D5 | UIS | nothing | ~50 lines in `uis configure` |
| 1.11 Secret-name convention | coord | 1.10 | small DCT + UIS coordination |
| 1.12 Add Verify sections | TMP | 1.8, 1.10 | part of 1.5, 1.6 |
| 1.13 Canonical workflow in READMEs | TMP | 1.8, 1.10 | part of 1.5, 1.6 |

**Parallelism**: 1.1-1.4, 1.8, and 1.10 can all start at the same time (different teams, no cross-dependencies). 1.5-1.7, 1.9, 1.11-1.13 are blocked on those landing.

**Minimum viable ship order**:
1. Day 1: TMP starts on 1.1-1.4 (no dependencies). DCT starts on 1.8. UIS starts on 1.10.
2. Day 2-3: DCT finishes 1.8 → TMP can start 1.6 and 1.7. UIS finishes 1.10 → DCT starts 1.9 and 1.11 coordination.
3. Day 4-5: Integration — TMP rewrites READMEs using the shim (1.5, 1.12, 1.13).

---

# Part 3: Phase 2 — Improvements (after Phase 1 ships)

These are not blocking but improve the daily experience. Plan them after Phase 1 is in production and we have real feedback.

## 2.1 `dev-template` subcommand refactor (D2)

Refactor `dev-template-configure` into `dev-template configure`. Add other subcommands as they're needed: `list`, `info`, `install`, `register`.

**Why Phase 2**: the current hyphenated command name works. This is cleanup that touches every doc — do it once when there's a second reason to touch those docs.

## 2.2 `dev-template register` (D3 + D4)

New DCT subcommand that registers the app with ArgoCD using values auto-detected from `git remote` and `template-info.yaml`. Requires a new `params.subdomain` field.

**Why Phase 2**: `./uis argocd register` from the host works today. This is UX polish, not a blocker.

**Depends on**: D2 (subcommand refactor)

## 2.3 Move `.env*` files to `.devcontainer.secrets/env-vars/` (C7)

DCT writes `.env` to the canonical secrets folder instead of the project root. Plus a committed symlink `.env → .devcontainer.secrets/env-vars/.env` so standard `load_dotenv()` keeps working.

**Why Phase 2**: the Phase 1 fix (`.env` in project root + `.gitignore`) is safe. This refinement is cleaner but not urgent. Also has cross-platform concerns (Windows symlinks) that need investigation.

## 2.4 Pod restart on secret update

Deployments need to restart when the secret changes (otherwise they keep using cached env vars). Options:
- DCT runs `kubectl rollout restart` after `uis configure`
- Deployment manifest has a checksum annotation updated by DCT
- Use [stakater/reloader](https://github.com/stakater/reloader) as a cluster add-on

**Why Phase 2**: in Phase 1, re-running `dev-template-configure` returns `already_configured` and doesn't rotate the password (14MSG — idempotent). Rotation is the only case where the pod needs a restart. Defer until rotation is actually supported.

## 2.5 End-user doc: `using-templates.md` (C8)

Top-level doc explaining the full workflow (install → edit params → configure → run → register). `developer-setup-guide.md` links to it.

**Why Phase 2**: Phase 1 fixes each README. Phase 2 gives users a single top-level reference.

## 2.6 Multi-service template support

When a second template needs `requires: [postgresql, redis]`, generalise the Phase 1 approach:
- Multiple secrets, one per service
- Or one combined secret per app
- Decide based on the real template

**Why Phase 2**: no template needs this today. Don't design for hypotheticals.

---

# Part 4: Phase 3 — Polish

Low-priority cosmetic fixes. Ship anytime.

- [x] **A1**: Created `postgresql-demo-logo.svg` (PostgreSQL blue + "PG")
- [x] **A5**: Done in Phase 2 — JSON example uses `Xa7mP9...` placeholder with explanatory note
- [x] **B10**: Created `python-basic-webserver-database-logo.svg` (Python blue + DB badge); template-info.yaml updated to reference it
- [x] **C3**: Tag scheme documented in `naming-conventions.md`. Fixed inconsistencies: dropped redundant `go` from golang-basic-webserver, dropped redundant `nodejs` from typescript-basic-webserver, dropped misleading `demo` from python-basic-webserver-database
- [x] **C4**: Created `webserver-database-logo.svg` category logo; templates/template-categories.yaml updated to reference it

Phase 3 done.

---

# Part 5: Future considerations (not scope for this investigation)

These were explored during the investigation but deferred. They need real use cases before they're worth designing.

## Generalised `config/env.yaml` declaration

A common file format for declaring all env vars/secrets a template needs, with typed sources (`from: requires.X`, `from: params.Y`, `generate: random`, `value: "..."`). Would subsume Phase 1's single-secret-per-service approach.

**Why deferred**: we have one template with `requires`. Design this when three templates exist with different needs.

**Placeholder for when we revisit**: the `init:` field in template-info.yaml should accept an object (not just a path string) so it can grow backward-compatibly:

```yaml
# Phase 1 (simple)
init: "config/init-database.sql"

# Future (extended — backward-compatible)
init:
  file: "config/init-database.sql"
```

## Reusable data libraries / data templates

Shared organisational state across templates — test users, reference tables, dashboards. Motivated by UIS's `073-authentik-1-test-users-groups-blueprint.yaml` (727 lines of Authentik users that no template can reuse).

**Why deferred**: pure speculation. No template needs shared data yet. If and when a real use case emerges, this gets its own investigation.

## `dev-template verify` command

A DCT command that validates the full connection chain (port-forward + connection from DCT). Nice to have but `uis connect <service> <db>` via the shim covers 80% of the value.

**Why deferred**: complex to implement correctly across languages and services. The manual `uis connect` path works today.

## Multi-service / multi-env-var templates

Design for templates with `requires: [postgresql, redis, authentik]`. Currently Phase 1 handles one secret per service.

**Why deferred**: no template needs this today.

## Deep subcommand restructure

`dev-template list`, `info`, `install`, `uninstall`, `update`, etc. Phase 2 introduces `configure` and `register`; further subcommands come when they're needed.

**Why deferred**: YAGNI.

---

# Part 6: Reference material

## The canonical workflow (after Phase 1 ships)

This is the "happy path" the docs should follow. Every UIS-dependent app template README should match this structure.

### Step 1: Install the template

```bash
dev-template python-basic-webserver-database
```

What happens:
- DCT fetches the template from the registry
- Copies all files to the current project directory
- Replaces `{{GITHUB_USERNAME}}` and `{{REPO_NAME}}` placeholders in manifests/workflows
- Writes `template-info.yaml` to the project root

### Step 2: Verify UIS is running

```bash
uis help                    # Confirms the shim + UIS container are working
uis status postgresql       # Confirms PostgreSQL is deployed
```

If PostgreSQL isn't deployed:

```bash
uis deploy postgresql
```

**You usually don't need this step** — `dev-template-configure` does an automatic `deploy_check` and tells you exactly what to run if anything's missing.

### Step 3: Edit `template-info.yaml` and optionally `config/init-database.sql`

Open `template-info.yaml`, find the `params:` section, set your values:

```yaml
params:
  app_name: "my-cool-app"
  database_name: "my_cool_app_db"
```

Optionally edit `config/init-database.sql` to customise the schema.

The README should show both files inline (per **1.5** / B3).

### Step 4: Run `dev-template-configure`

```bash
dev-template-configure
```

What happens:
- Reads `template-info.yaml`, validates params
- Substitutes `{{ params.* }}` in init files
- Calls `uis configure postgresql --app <app_name> --database <database_name> --namespace <subdomain> --init-file -` via the bridge
- UIS creates the DB, applies init SQL, creates the K8s Secret in the namespace, auto-exposes the port
- DCT writes `.env` to the project root (gitignored)

If anything fails, the structured JSON error from UIS tells you exactly what went wrong.

### Step 5: Verify the database

```bash
uis connect postgresql my_cool_app_db
```

Inside psql:

```sql
SELECT * FROM tasks;
\q
```

You should see the seeded rows.

### Step 6: Run the app

```bash
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
python app/app.py
```

Open in your browser (VS Code's Ports tab auto-forwards port 3000):

- `http://localhost:3000/` — Home
- `http://localhost:3000/tasks` — JSON list of seeded rows
- `http://localhost:3000/health` — DB connectivity check

### Step 7: Deploy to the cluster

```bash
git push                                        # GitHub Actions builds the image
./uis argocd register <app-name> <repo-url>     # From the host, one-time per project
```

App is at `http://<app-name>.localhost`. ArgoCD auto-deploys on every push.

(Phase 2 replaces step 7 with `dev-template register` — see 2.2.)

## Deploy-time data flow (after minimum D5 ships)

The K8s pod gets `DATABASE_URL` via a Kubernetes Secret that UIS created at configure time. The Docker image is credential-free.

**Phase 1 (configure time):**

```
Developer's DCT devcontainer
  └─ dev-template-configure
       └─ uis_bridge_configure postgresql
            --app my-app
            --database my_app_db
            --namespace my-app
            --secret-name-prefix my-app
            --init-file - < config/init-database.sql
            │
            └─ docker exec uis-provision-host uis configure ...

UIS provision-host
  ├─ deploy_check (verify PostgreSQL running)
  ├─ Create database + user in PostgreSQL
  ├─ Apply init SQL via psql
  ├─ Auto-expose service port
  ├─ kubectl create namespace my-app (idempotent)
  ├─ kubectl create secret my-app-db in my-app namespace
  └─ Return JSON with local URL + secret_name/namespace

K8s cluster after Phase 1:
  Namespace: my-app
    └─ Secret: my-app-db
         └─ DATABASE_URL=postgresql://...@postgresql.default.svc.cluster.local:5432/my_app_db
  Namespace: default
    └─ Pod: postgresql-0 (with new database + user)

Developer's project:
  └─ .env   # Local URL for local dev (gitignored)
```

**Phase 2 (deploy time):**

```
git push
  └─ GitHub Actions builds credential-free image → GHCR

./uis argocd register my-app <repo-url>
  └─ ArgoCD watches the repo

ArgoCD detects new commit
  ├─ Fetches manifests/deployment.yaml (has secretKeyRef: my-app-db)
  └─ Applies to namespace my-app (already exists)

Kubelet starts pod in my-app namespace
  ├─ K8s injects DATABASE_URL from Secret into pod env
  ├─ Flask reads os.environ['DATABASE_URL']
  └─ Connects to postgresql.default.svc.cluster.local:5432

Traefik routes my-app.localhost → pod
```

**Key point**: `./uis argocd register` (or `dev-template register` in Phase 2) **does not touch the connection string**. The Secret UIS created in configure-time is already in the namespace when ArgoCD deploys.

## The issue list (original, for reference)

Kept for traceability. Phase 1 includes items marked **P1**. Phase 2 items are **P2**. Phase 3 items are **P3**. Deferred items are **F** (Future).

### Section A — postgresql-demo

| ID | Issue | Phase |
|---|---|---|
| A1 | Missing logo file | P3 |
| A2 | Wrong install command in TemplateHeader | **P1** (via 1.1) |
| A3 | README assumes UIS provision-host context | **P1** (via 1.6) |
| A4 | No link to consumer-side template | **P1** (via 1.6) |
| A5 | JSON example uses literal `<generated-password>` | P3 |

### Section B — python-basic-webserver-database

| ID | Issue | Phase |
|---|---|---|
| B1 | No `dev-template install` step in README | **P1** (via 1.5) |
| B2 | No "Verify it worked" section | **P1** (via 1.12) |
| B3 | README doesn't show `template-info.yaml` / init SQL content | **P1** (via 1.5) |
| B4 | README lacks description of what the Python program does | **P1** (via 1.5) |
| B5 | README uses `pip install` instead of `uv` | **P1** (via 1.5) |
| B6 | Missing `.vscode/settings.json` for `alwaysUseUv` | **P1** (via 1.4) |
| B7 | "Docker Build" / "Kubernetes Deployment" sections describe wrong workflow | **P1** (via 1.5) |
| B8 | README incorrectly tells users to install `postgresql-demo` as prerequisite | **P1** (via 1.5) |
| B10 | Logo reused from `python-basic-webserver` | P3 |

### Section C — Cross-cutting

| ID | Issue | Phase |
|---|---|---|
| C1 | Duplicated abstract/summary across TemplateHeader, Summary section, README intro | **P1** (via 1.2) |
| C2 | `uis: command not found` from DCT — central UX problem | **P1** (via 1.8 D1 shim) |
| C3 | Tag scheme not consistent across templates | P3 |
| C4 | Missing logos for new templates and category | P3 |
| C5 | README doesn't say UIS provision-host must be running | **P1** (via 1.7) |
| C6 | `.env*` files could end up in git | **P1** (via 1.3) |
| C7 | `.env*` should live in `.devcontainer.secrets/env-vars/` | P2 (2.3) |
| C8 | No end-user doc explains `template-info.yaml` editing | P2 (2.5) |

### Section D — Architectural proposals

| ID | Proposal | Phase |
|---|---|---|
| D1 | `uis` shim in DCT | **P1** (1.8 — foundation) |
| D2 | `dev-template` subcommand refactor | P2 (2.1) |
| D3 | `dev-template register` with auto-detection | P2 (2.2) |
| D4 | `params.subdomain` in `template-info.yaml` | P2 (with 2.2) |
| D5 minimum | `uis configure --namespace` creates K8s Secret | **P1** (1.10) |
| D5 full | Multi-service, pod restart, full secret lifecycle | P2 (2.4, 2.6) |
| D6 | MDX generator: install command by context | **P1** (1.1) |
| D7 | Generalised `config/env.yaml` | **F** (Future) |
| D8 | Reusable data libraries | **F** (Future) |

### Cross-team summary (Phase 1 only)

| Item | TMP | DCT | UIS |
|---|---|---|---|
| 1.1 Generator routing (D6) | ✅ owns | | |
| 1.2 Generator dedup (C1) | ✅ owns | | |
| 1.3 `.gitignore` (C6) | ✅ owns | | |
| 1.4 `.vscode/settings.json` (B6) | ✅ owns | | |
| 1.5 Python README rewrite | ✅ owns | | |
| 1.6 postgresql-demo README rewrite | ✅ owns | | |
| 1.7 "Before you start" (C5) | ✅ owns | | |
| 1.8 D1 uis shim | | ✅ owns | |
| 1.9 DCT passes `--namespace` | | ✅ owns | |
| 1.10 Minimum D5 | | | ✅ owns |
| 1.11 Secret name coordination | ✅ spec | ✅ impl | ✅ impl |
| 1.12 Verify sections | ✅ owns | | |
| 1.13 Canonical workflow in READMEs | ✅ owns | | |

---

## Next steps

- [ ] Review this investigation and confirm the phase split
- [ ] Create a separate PLAN for each of the three Phase 1 workstreams:
  - **PLAN-p1-tmp-fixes.md** — TMP-only work (1.1-1.7, no external dependencies)
  - **PLAN-p1-dct-shim.md** — DCT work (1.8, 1.9) — cross-team coordination with DCT
  - **PLAN-p1-uis-secret.md** — UIS work (1.10, 1.11) — cross-team coordination with UIS
- [ ] Once Phase 1 ships, plan Phase 2 based on real feedback
- [ ] Phase 3 and Future items stay on backlog, no immediate planning

**First PR targets**: 1.1, 1.3, 1.4 from TMP; 1.8 from DCT; 1.10 from UIS — all independent, all safe to ship in parallel.
