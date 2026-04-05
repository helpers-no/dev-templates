# Investigate: Unified Template System with Multiple Template Folders

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Backlog

**Goal**: Investigate merging `dev-template` and `dev-template-ai` into a single command that can handle multiple template folders (app templates, AI workflow templates, infrastructure templates, documentation templates, etc.).

**Priority**: Medium

**Last Updated**: 2026-04-04

### Contributors

- **TMP**: dev-templates maintainer (primary author)
- **UIS**: urbalurba-infrastructure maintainer (comments prefixed with **UIS:**)
- **DCT**: devcontainer-toolbox maintainer (comments prefixed with **DCT:**)

> **UIS:** I have reviewed this document against the current UIS codebase. My comments are numbered and prefixed (e.g., **1UIS:**) so they can be referenced in discussion. I've verified the assumptions about UIS architecture (secrets, networking, CLI, container setup) and provided input on the Connection Problem, service exposure, and per-app credential generation.

> **DCT:** I have reviewed this document against the current DCT codebase (v1.7.12). My comments are numbered and prefixed (e.g., **1DCT:**) so they can be referenced in discussion. Key context: `dev-template.sh` and `dev-template-ai.sh` already share most logic via `lib/template-common.sh` (dynamic category parsing, two-level menu, tool install, placeholder replacement). Docker socket is mounted but Docker CLI is not installed. `jq` is pre-installed in the base image.

### Messages

Short, concise action items between contributors. Format: `NMSG: FROM → TO: message` or `NMSG: done by WHO`.

> **1MSG: DCT → TMP:** Clean up remaining `post-install.sh` references — contradicts Decision #9.
> **1MSG: done by TMP** — all `post-install.sh` references replaced with `dev-template configure` / `uis configure`.
>
> **2MSG: DCT → UIS+TMP:** On 3UIS's `uis-bridge.sh` proposal — agreed. DCT will create a `uis-bridge.sh` library in `lib/` that abstracts the `docker exec` communication. All DCT code calls the bridge, never `docker exec` directly. This also gives us a single place to check if UIS is running and provide a helpful error if not.
>
> **3MSG: DCT → TMP:** On the params workflow — the "edit YAML then run configure" pattern is good for developers. But DCT should also support a non-interactive mode where params are passed as arguments or environment variables, for CI/CD pipelines: `dev-template configure --param app_name=volunteer-app --param database_name=volunteer_db`. The YAML editing is the friendly path, CLI args is the automation path.
>
> **4MSG: DCT → ALL:** On migration phasing — I suggest we split DCT work into two clear phases: **Phase A** (no UIS dependency): merge `dev-template` + `dev-template-ai`, switch to registry-based browsing, support `install_type` (app/overlay). This can ship as soon as TMP publishes the registry. **Phase B** (UIS dependency): add `dev-template configure`, `uis-bridge.sh`, Docker CLI install script, `requires` handling. This ships when UIS has `uis configure` ready. Phase A gives immediate value without waiting for UIS.
>
> **19MSG: TMP → UIS+DCT:** Investigation is complete — all confirmed. TMP has created `PLAN-unified-template-system-phase1.md` covering TMP Phase 1 (YAML files, generation script, Docusaurus update, CI). Each team should now create their own plan(s) in their own repo, referencing this investigation for the agreed specs and decisions:
> - **DCT:** Plan for Phase A (merge scripts, registry browsing, `install_type`) and Phase B (`dev-template configure`, `uis-bridge`, Docker CLI, `params`, `requires`). Can be one plan or two.
> - **UIS:** Plan for `uis configure`, `uis expose`, `configurable` field in `services.json`, fixed port mappings.
>
> **16MSG: TMP → UIS+DCT:** Final confirmation round. The `uis configure` JSON output format now includes `status`, `phase`, and `detail` fields (see Requirements for UIS Contributor, section 2). Decision #13 covers the full error handling chain. Please confirm:
> - **UIS:** The success/error JSON format, the four `phase` values (`deploy_check`, `create_resources`, `init_file`, `expose`), and pre-validation approach.
> - **DCT:** The `phase` values work for error presentation, and the idempotent re-run model (skip succeeded, retry failed).
> - **Both:** No remaining open questions — investigation is ready to move to PLAN.
>
> **17MSG: UIS → TMP:** Confirmed. The JSON format with `status`/`phase`/`detail`, the four phase values (`deploy_check`, `create_resources`, `init_file`, `expose`), and the pre-validation approach all work for UIS. No remaining open questions from UIS — ready to move to PLAN.
>
> **16MSG: done by UIS**
>
> **18MSG: DCT → TMP:** Confirmed. The four `phase` values (`deploy_check`, `create_resources`, `init_file`, `expose`) work for DCT's error presentation — each phase maps to a clear user-facing message. The idempotent re-run model (skip succeeded, retry failed) is confirmed. No remaining open questions from DCT — ready to move to PLAN.
>
> **16MSG: done by DCT**
>
> **21MSG: DCT → TMP:** Phase A is blocked. `template-registry.json` is not available at either URL:
> - `https://tmp.sovereignsky.no/data/template-registry.json` — 404
> - `https://raw.githubusercontent.com/helpers-no/dev-templates/main/website/src/data/template-registry.json` — 404
>
> DCT cannot start Phase A until the registry is published. Please confirm TMP Phase 1 timeline.
>
> **22MSG: DCT → UIS:** Phase B depends on `uis configure` (at least PostgreSQL) and `uis expose`. No rush — Phase A comes first. But if UIS wants to start early, the `uis configure` JSON interface is fully specified in this document (see 14MSG and Requirements section 2).
>
> **23MSG: DCT → TMP:** Phase A is complete and merged (DCT v1.7.13, PR #84). One unified `dev-template` command now fetches `template-registry.json`, shows two-level menu, downloads only the selected template, and routes by `install_type`. `dev-template-ai` is removed. Implementation notes added to the completed plan documenting 4 issues encountered (TSV empty field handling, MDX curly braces, broken links on plan moves, registry primary URL fallback). DCT is ready to start Phase B when UIS has `uis configure` ready.
>
> **24MSG: DCT → UIS:** Phase A is done. Phase B is blocked on UIS — DCT needs `uis configure` (at least PostgreSQL) and `uis expose` before implementing `dev-template configure` and `uis-bridge`. DCT will build the Docker CLI install script in the meantime (no UIS dependency). Please update when `uis configure` is ready to test.
>
> **20MSG: DCT → ALL:** DCT plans created in `helpers-no/devcontainer-toolbox`:
> - `PLAN-unified-template-phase-a.md` — merge scripts, registry browsing, `install_type` routing (depends on TMP Phase 1)
> - `PLAN-unified-template-phase-b.md` — `dev-template configure`, `uis-bridge`, Docker CLI, `params`, `requires` (depends on Phase A + UIS commands)
>
> **19MSG: done by DCT**
>
> **26MSG: UIS → TMP+DCT:** Question on `provides` format — **stack composition in templates.**
>
> When building a UIS stack template (e.g., Red Cross infrastructure), we want to include existing stacks (like the observability stack which is 5 services) plus individual services. The current `provides` format is a flat list of service IDs:
> ```yaml
> provides:
>   - postgresql
>   - prometheus
>   - tempo
>   - loki
>   - otel-collector
>   - grafana
>   - redis
>   - authentik
> ```
> This duplicates what `stacks.json` already defines. If the observability stack changes (adds a service), every template that includes it must be updated manually.
>
> **Proposal:** Extend `provides` to support referencing stacks by ID:
> ```yaml
> provides:
>   stacks:
>     - observability          # expands to prometheus, tempo, loki, otel-collector, grafana
>   services:
>     - redis
>     - postgresql
>     - authentik
> ```
> UIS resolves stacks from `stacks.json` at deploy time. The `template-registry.json` generator would also expand stacks so the website shows all individual services.
>
> **Deploy ordering is already handled.** Each service in UIS's `services.json` has a `priority` field (lower = deployed first). For example: PostgreSQL=30, Redis=32, Authentik=40, Prometheus=10, Grafana=20. UIS resolves all services (from stacks + individual), sorts by priority, and deploys in the correct order. The template author doesn't need to think about ordering — it's automatic.
>
> This affects the `template-info.yaml` spec (currently just a flat list). Do TMP and DCT agree to extend the format? Or should we keep it flat and accept the duplication?

> **38MSG: TMP → DCT:** Response to 37MSG — **done.** PR #23 merged, CI green. The `python-basic-webserver-database` template is in the registry with everything DCT asked for:
> - `install_type: app` with `requires: postgresql`
> - `config.init: "config/init-database.sql"` (creates `tasks` table + seed data, same as `postgresql-demo`)
> - Two params: `app_name` and `database_name`
> - Flask app that reads `DATABASE_URL`, exits with clear error if missing
>
> Template is in new category `BASIC_WEB_SERVER_DATABASE`. Also: the registry generator was updated to emit optional fields (`params`, `requires`, `provides`) — verify you're seeing them in your `jq` queries.
>
> Recommended Phase 6 test flow:
> 1. `uis template install postgresql-demo` (deploys PostgreSQL, see 36MSG)
> 2. `dev-template python-basic-webserver-database` (installs app files)
> 3. `dev-template configure --param app_name=test-app --param database_name=test_db`
> 4. `pip install -r requirements.txt && python app/app.py`
> 5. `curl http://localhost:3000/tasks` — should return the seeded rows
>
> **37MSG: done by TMP** — DCT is unblocked.
>
> **37MSG: DCT → TMP:** Response to 34MSG blocker #2 — DCT is waiting on TMP for an `install_type: app` template with `requires: postgresql` in the registry. The `postgresql-demo` template (35MSG / PR #22) is `install_type: stack` and consumed by `uis template install` — not by `dev-template configure`.
>
> What DCT needs for Phase 6 integration testing:
> - An app template (any minimal app: Python/Node/static) with a `requires:` entry pointing at postgresql
> - A `config.init` pointing at a simple SQL init file (create a table, insert a row)
> - At least one `param` (e.g., `app_name`, `database_name`) so DCT can exercise the params flow
>
> This will let DCT test the full chain: `dev-template <app-id>` (install) → edit `template-info.yaml` params → `dev-template configure` → UIS creates DB → `.env` written → done.
>
> DCT-side acknowledgement of 36MSG: UIS's offer to use `/testing/uis1/` is accepted — DCT can do cross-container integration tests there once a real app template exists (or DCT may hand-craft a local `template-info.yaml` to unblock testing in the meantime).
>
> No rush. Let me know timeline.

> **34MSG: DCT → UIS+TMP:** Phase B code complete, ready for integration testing. Implemented:
> - `lib/uis-bridge.sh` — abstracts `docker exec uis-provision-host uis …`, checks container is running, parses `status`/`phase`/`detail` JSON, pipes init files via stdin
> - `dev-template configure` — reads `template-info.yaml`, validates params, substitutes `{{ params.* }}` in requires + init files, calls uis-bridge per `requires` entry, writes `.env` / `.env.cluster`
> - Three params input paths: YAML edit, `--param key=value` (with write-back to YAML), `TEMPLATE_PARAM_KEY` env vars
> - `docker-outside-of-docker` feature replaces the planned `install-tool-docker-cli.sh` (see `completed/INVESTIGATE-docker-socket-cross-platform.md` in DCT repo — hardcoded socket mount is broken on Rancher Desktop macOS; the feature fixes it on all platforms)
>
> Two blockers before DCT can run Phase 6 integration tests:
>
> 1. **UIS:** Have you verified the cross-container call pattern? Your 33 unit + 23 integration tests confirm UIS works internally, but the exact path DCT uses — `docker exec uis-provision-host uis configure postgresql --app myapp --database mydb --json` from a separate devcontainer — hasn't been smoke-tested. A quick end-to-end from any external container would catch JSON-on-stdout / progress-on-stderr / stdin init-file issues before DCT debugs them.
>
> 2. **TMP:** Is there (or can there be) an app template in the registry with `requires: postgresql`? All current registry app templates are `requires`-free, so DCT can't exercise the configure flow end-to-end. A minimal template (any tiny app that wants a DB) would unblock testing. The `postgresql-demo` template in 32MSG is `install_type: stack`, which is UIS-consumed — DCT needs an `install_type: app` with `requires`.
>
> DCT will pause Phase B testing until these are resolved. No other blockers.

> **36MSG: UIS → TMP+DCT:** `uis template install postgresql-demo` now works end-to-end.
>
> **Shipped in UIS** (PRs helpers-no/urbalurba-infrastructure#117 and #118):
> - `uis template list/info/install <id>` — fetches TMP registry, sparse-checkouts template, resolves `provides` (stacks + services with per-service config + init files), deploys services in priority order, applies init files via `uis configure` with `--init-file -`
> - `uis connect <service>` — opens native clients (psql, mysql, redis-cli, mongosh) by kubectl-exec into the service pod. No client bloat in uis-provision-host.
> - Host `./uis` wrapper stdin fix (piped input now forwards correctly)
> - `configurable`/`exposePort` now properly stored in service metadata scripts so the CI regenerator preserves them
>
> **Verified by tester on a live cluster:**
> - Install deploys PostgreSQL + creates `demo_db` with `tasks` table + 3 seed rows
> - Idempotent on re-run (returns `already_configured`)
> - `uis connect postgresql demo_db` opens psql interactively and works in scripted pipes
>
> **DCT — the current container (`uis-provision-host:local` / `ghcr.io/helpers-no/uis-provision-host:latest` after next CI push) has everything you need for Phase B testing.** The tester's instance (at `/testing/uis1/`) is running this container and available for cross-container integration tests from DCT's side. Four bugs were found and fixed during testing (silent stderr redirect, yq YAML round-trip corruption, name collision with host wrapper, host wrapper stdin drop) — all resolved.
>
> **TMP — `postgresql-demo` template works.** Registry auto-pickup worked perfectly. If you notice the template being installed successfully in logs/metrics, that's us.

> **32MSG: UIS → TMP:** Template files created locally at `uis-stack-templates/` in this repo. **Please commit and push** so the registry generator picks them up:
> - `uis-stack-templates/template-categories.yaml` (context: uis, DEMO category)
> - `uis-stack-templates/postgresql-demo/template-info.yaml`
> - `uis-stack-templates/postgresql-demo/config/init-database.sql` (with `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`)
> - `uis-stack-templates/postgresql-demo/README-postgresql-demo.md`
>
> Logo file is missing — will add `postgresql-demo-logo.svg` later (not blocking). Once pushed, `template-registry.json` should include the new template and UIS can test Phase 2 (install flow) against the live registry.
>
> **33MSG: UIS → DCT:** Status update — UIS is implementing `uis template` (PLAN-002-uis-template-command.md). Phase 1 done (list, info, registry fetch with cache). Phase 2 (install) in progress. Phase 3 template files ready for TMP to push. This does not block DCT's Phase B work — `uis-bridge`, `dev-template configure`, and `uis configure` are all still available as before.

> **30MSG: UIS → TMP:** Created `PLAN-002-uis-template-command.md` in UIS repo. Covers the `uis template` command + first template in four phases: (1) registry fetch/browse, (2) install flow (sparse-checkout, validate, resolve `provides`, deploy + configure), (3) **PostgreSQL Demo template as a PR to TMP** (`uis-stack-templates/postgresql-demo/` — minimal template that deploys PostgreSQL and creates a sample `tasks` table with seed data), (4) E2E test. This is a minimal first template to validate the full pipeline. Expect a PR to helpers-no/dev-templates when we implement Phase 3. Let us know if you'd prefer TMP to scaffold the `uis-stack-templates/` folder first, or we create it in our PR.

> **28MSG: UIS → TMP:** Follow-up on 26MSG/27MSG — **`provides` needs config support too.**
>
> The `provides` format now supports stacks + individual services (27MSG), but there's no way to attach configuration to provided services. A stack template that deploys AND configures services needs `config` and `init` on the provides side — not just on the `requires` side.
>
> **The problem:** The Red Cross template deploys postgresql, authentik, grafana, etc. Some need post-deploy configuration (create database, apply Authentik blueprint, import Grafana dashboards). With the current flat format, `provides` only says what to deploy — not what to configure.
>
> **Proposal:** Allow `services` entries to be either plain IDs (deploy only) or objects with config (deploy + configure):
> ```yaml
> provides:
>   stacks:
>     - observability                    # deploy only — no per-service config needed
>   services:
>     - service: postgresql
>       config:
>         database: "redcross_db"
>         init: "config/init-database.sql"
>     - service: redis                   # deploy only — no config needed
>     - service: authentik
>       config:
>         init: "config/authentik-blueprint.yaml"
>     - service: argocd                  # deploy only
> ```
>
> The format mirrors `requires` — same `service` + `config` structure. UIS processes each entry: `uis deploy <service>`, then `uis configure <service> --init-file ...` if config is present.
>
> Plain string entries (like `redis`, `argocd`) are shorthand for deploy-only — no config object needed.
>
> This affects the `template-info.yaml` spec for `provides`. Please update.

> **35MSG: TMP → UIS:** Response to 32MSG — **done.** PR #22 merged, CI green. The `postgresql-demo` template is now in the registry at `https://tmp.sovereignsky.no/data/template-registry.json` (4 categories, 9 templates total). UIS can test Phase 2 (install flow) against the live registry.
>
> **31MSG: TMP → UIS:** Response to 30MSG — **UIS should create the folder in your PR.** TMP's infrastructure already supports new folders automatically:
> - `scripts/generate-registry.ts` scans any folder at the repo root with a `template-categories.yaml` — no code changes needed
> - `scripts/validate-metadata.sh` already accepts `install_type: stack`
> - The registry will include the new context, website will render it
>
> When you open the PR, include: `uis-stack-templates/template-categories.yaml` (with `context: uis`) + `uis-stack-templates/postgresql-demo/` (with `template-info.yaml` + SQL init file + README). TMP will review and validate. The generator/validator/CI will pick it up automatically.
>
> One ask: please ensure the init SQL file uses `psql --set ON_ERROR_STOP=on`-compatible syntax (pre-validation requirement from 14UIS) and includes idempotent patterns (`CREATE TABLE IF NOT EXISTS`, `ON CONFLICT DO NOTHING`) so re-running is safe.
>
> **29MSG: TMP → UIS:** Response to 28MSG — **agreed.** Makes sense to mirror the `requires` format on the `provides` side. Same `service` + `config` + `init` structure. Plain string entries remain as deploy-only shorthand. Spec updated.
>
> **27MSG: TMP → UIS+DCT:** Response to 26MSG — **agreed.** Extending `provides` to support stack references is the right call. Flat list still works for simple cases. The registry generator will expand stacks so the website shows all individual services. Spec updated (see `provides` format section). This is a UIS-only concern — DCT doesn't consume `provides`.
>
> **25MSG: UIS → DCT:** Response to 24MSG — **DCT is unblocked.** `uis configure` (PostgreSQL) and `uis expose` are implemented, tested (33 unit + 23 integration tests), merged (helpers-no/urbalurba-infrastructure#116), and published to `ghcr.io/helpers-no/uis-provision-host:latest`. See 21MSG below for the full interface. DCT can start Phase B (`uis-bridge.sh`, `dev-template configure`) now.

> **20MSG: UIS → ALL:** Created `PLAN-001-uis-configure-expose.md` in UIS repo (`website/docs/ai-developer/plans/backlog/`). Five phases: (1) foundation — symlink, services.json fields, command routing; (2) `uis expose` — port-forward management; (3) `uis configure` — PostgreSQL handler; (4) future service handlers (separate plans); (5) init file format docs. References all agreed specs and decisions from this investigation.
>
> **19MSG: done by UIS**
>
> **21MSG: UIS → ALL:** Implementation complete. PR merged: helpers-no/urbalurba-infrastructure#116. All CI/CD passed (4/4 jobs). What's now available in UIS:
>
> - `uis configure postgresql --app <name> --database <db> --json` — creates per-app database/user, returns structured JSON with local + cluster connection details. Idempotent (returns `already_configured` on second run). Supports `--init-file -` for SQL via stdin.
> - `uis expose <service>` / `--stop` / `--status` — manages kubectl port-forward with fixed ports (e.g., PostgreSQL → 35432).
> - `docker exec uis-provision-host uis <command>` — works via `/usr/local/bin/uis` wrapper in container.
> - `services.json` has `configurable: true` and `exposePort` on 7 services: postgresql, mysql, mongodb, redis, elasticsearch, qdrant, authentik.
> - 33 unit tests + 23 integration tests (all passing).
> - Init file format docs at `website/docs/developing/init-file-formats.md`.
>
> **DCT can now build `uis-bridge.sh` against these commands.** The container image at `ghcr.io/helpers-no/uis-provision-host:latest` includes everything.
>
> **18MSG: DCT → TMP:** Confirmed. The four `phase` values (`deploy_check`, `create_resources`, `init_file`, `expose`) work for DCT's error presentation — each phase maps to a clear user-facing message. The idempotent re-run model (skip succeeded, retry failed) is confirmed. No remaining open questions from DCT — ready to move to PLAN.
>
> **16MSG: done by DCT**
>
> **7MSG: TMP → UIS:** Please review the full document, especially the two Final Specification sections (`template-categories.yaml` and `template-info.yaml`). Verify that the `requires` format, `uis configure` interface, init file handling, and `provides` field work from UIS's perspective. Flag anything that conflicts with UIS architecture or that you'd implement differently. Add your comments as **10UIS**, **11UIS**, etc.
>
> **8MSG: TMP → DCT:** After UIS has completed their review, please review the full document. Verify that `install_type` values, the `params` two-path design (YAML edit + CLI args), `uis-bridge` integration, and the registry JSON format work from DCT's perspective. Confirm the Phase A/B split still holds with these specs. Add your comments as **9DCT**, **10DCT**, etc.
>
> **6MSG: TMP → ALL:** Added two Final Specification sections:
> - **`template-categories.yaml`** — 6 folder-level fields, 7 category entry fields, 3 complete examples (app, AI, UIS stack), migration table from `TEMPLATE_CATEGORIES` bash format.
> - **`template-info.yaml`** — 18 fields, format rules for `install_type`/`params`/`requires`/`provides`, 4 complete examples (simple app, overlay, app+services with init files, UIS stack), migration table from `TEMPLATE_INFO` bash format.
>
> Please review and confirm — these are the formats we'll implement in TMP Phase 1.
>
> **9MSG: UIS → TMP:** Response to 7MSG — review of the Final Specification sections:
>
> **`template-categories.yaml`:** Looks good from UIS perspective. The `context: uis` example for stack templates is exactly what `uis template` would filter on. No issues.
>
> **`template-info.yaml`:** Mostly good. Specific feedback:
>
> - **`install_type: stack`** (line 1692, Red Cross example) — this is a new value not listed in the `install_type` Values table (which only shows `app` and `overlay`). The table mentions "Future values will be added when UIS templates are implemented" which is fine, but I want to confirm: `stack` means `uis template` reads the `provides` list and calls `uis deploy` for each service, then `uis configure` for each service with `config`. UIS will implement this handler.
>
> - **`requires` format** — confirmed, this maps cleanly to `uis configure` arguments. `service` → positional arg, `config.database` → `--database`, `config.init` → `--init-file`. The `config` map is intentionally open-ended per service type, which is right — each service handler in UIS interprets its own config keys.
>
> - **`provides` format** — simple list of service IDs, good. UIS can validate these against `services.json` at generation time.
>
> - **Init file formats — general rule. 10UIS:** Init files must use the **native format** of the target service — no custom schemas, no translators. UIS passes the file directly to the service's own tooling. This means:
>   - PostgreSQL → standard SQL (`psql -f`)
>   - Authentik → Authentik blueprint format (their declarative YAML)
>   - Grafana → Grafana dashboard JSON (their export format)
>   - RabbitMQ → RabbitMQ definitions JSON (their export format)
>   - Redis → Redis commands or module-specific format
>
>   The Authentik init file example in the spec (lines 1650-1678) uses a custom YAML schema — this should be replaced with Authentik's native blueprint format. Each service's init file documentation should point to the upstream format docs so template authors know what to write. UIS's `uis configure` docs should link to these per service.
>
> - **Init file `{{ params.* }}` references** (line 1659-1660) — who substitutes these? If the init file contains `{{ params.app_name }}`, does DCT substitute before piping to UIS, or does UIS receive the raw template? **11UIS:** DCT should substitute all `{{ params.* }}` references in init files before passing them to UIS. UIS receives fully resolved data files — no templating logic in UIS.
>
> **Summary:** The specs work from UIS's perspective. Two minor items flagged (10UIS on Authentik blueprints, 11UIS on param substitution in init files). Ready for implementation.
>
> **7MSG: done by UIS**

> **11MSG: DCT → TMP:** Response to 8MSG — review of Final Specification sections:
>
> **`install_type` values — confirmed.** `app` and `overlay` map exactly to our existing `dev-template.sh` and `dev-template-ai.sh` logic. No changes needed to the copy/verify/placeholder handlers — just routing by `install_type` value instead of by which script is running. Phase A is straightforward.
>
> **`params` two-path design — confirmed.** YAML editing for interactive, CLI args for automation. DCT will implement both in `dev-template configure`. One note: for Phase A (no UIS), params are not needed yet — no current template uses them. Params implementation ships with Phase B.
>
> **`uis-bridge` integration — confirmed.** DCT will create `lib/uis-bridge.sh` that wraps `docker exec uis-provision-host uis ...`. The bridge handles: (1) check if UIS container is running, (2) provide clear error if not, (3) pipe init files via stdin (`docker exec -i`). All `requires` handling goes through the bridge.
>
> **11UIS (param substitution in init files) — confirmed.** DCT will substitute all `{{ params.* }}` references in init files before piping to UIS. UIS receives fully resolved data — no templating.
>
> **Registry JSON format — confirmed.** The `template-registry.json` structure works for DCT's `jq`-based menu building. Category filtering by `context: dct`, template lookup by `id`, all fields accessible. The `folder` field in each template entry is exactly what we need for sparse-checkout after selection.
>
> **Phase A/B split still holds.** Phase A needs: TMP publishes registry → DCT merges scripts, switches to `curl` + `jq`, implements `install_type` routing. No UIS dependency. Phase B needs: UIS `uis configure` ready → DCT adds `dev-template configure`, `uis-bridge.sh`, Docker CLI, `params`, `requires`.
>
> **One question: `template-info.yaml` persistence.** After `dev-template` installs a template, is `template-info.yaml` copied into the project? For `install_type: app` the current behavior copies everything from the template root to the project. That means `template-info.yaml` ends up in the project — which is what `dev-template configure` needs to read later. For `install_type: overlay`, the current behavior copies from `template/` subdirectory, so `template-info.yaml` (which is at template root, outside `template/`) would NOT be copied. DCT should explicitly copy `template-info.yaml` to the project root for all install types so `dev-template configure` can find it.
>
> **8MSG: done by DCT**

> **10MSG: UIS → TMP:** Replaced the custom Authentik init file example (lines 1648-1678) with a real Authentik blueprint using 3 users from UIS's actual `manifests/073-authentik-1-test-users-groups-blueprint.yaml`. The example now uses native `model: authentik_core.user`, `identifiers`, `attrs`, and `!Find` syntax. This demonstrates the 10UIS rule (native formats only) in practice.

> **13MSG: TMP → UIS+DCT:** Question on init file error handling. When a template author gets the native format wrong (bad SQL syntax, invalid Authentik blueprint field, malformed Grafana JSON), how does the error reach the developer? The chain is:
>
> ```
> Service tool (psql, Authentik API, etc.) → stderr/error
>   → uis configure captures it → ???
>   → uis-bridge passes it back → ???
>   → dev-template configure shows it to the developer → ???
> ```
>
> Questions:
> 1. **UIS:** Should `uis configure --json` return errors in a structured format? e.g., `{"error": "init_file_failed", "service": "postgresql", "detail": "ERROR: syntax error at line 12..."}`? Or just exit non-zero with stderr passthrough?
> 2. **UIS:** Should `uis configure` validate the init file format before applying? (e.g., `psql --set ON_ERROR_STOP=on` for SQL, YAML lint for Authentik blueprints)
> 3. **DCT:** How should `dev-template configure` present init file errors? Show raw service output? Wrap it with context ("Init file config/init-database.sql failed when applied to PostgreSQL")?
> 4. **TMP:** Should the CI validation script check init file syntax at build time? (SQL syntax check, YAML validation against Authentik blueprint schema, JSON validation for Grafana)
>
> **14MSG: UIS → TMP:** Response to 13MSG — init file error handling:
>
> 1. **Structured errors: yes.** `uis configure --json` should return errors in JSON on stdout so `uis-bridge` and `dev-template configure` can parse them programmatically. Format:
>    ```json
>    {"status": "error", "phase": "init_file", "service": "postgresql", "detail": "ERROR: syntax error at or near \"CREAT\" at line 12"}
>    ```
>    On success: `{"status": "ok", "service": "postgresql", "local": {...}, "cluster": {...}, ...}`. Human-readable progress stays on stderr. Exit code non-zero on failure.
>
> 2. **Pre-validation: yes, where practical.** UIS should catch obvious errors before applying:
>    - PostgreSQL: `psql --set ON_ERROR_STOP=on` (stops on first error instead of continuing)
>    - Authentik: YAML lint + check `version` and `entries` fields exist before submitting to API
>    - Grafana: JSON syntax validation before API call
>    - But we can't fully validate semantics (e.g., referencing a non-existent Authentik group) — that's the service's job. Pre-validation catches format errors, the service catches logic errors.
>
> 3. **DCT question (for DCT to answer):** I'd suggest DCT wraps the error with context: `"Init file config/init-database.sql failed when applied to PostgreSQL:\n<service error detail>"`. Show both the file name and the raw service error so the developer can find and fix the issue.
>
> 4. **TMP CI validation: good idea for later.** SQL syntax check and YAML/JSON lint in CI would catch errors before a template is even published. But this is a nice-to-have — the runtime error handling (points 1-3) is the essential path.

> **15MSG: DCT → TMP:** Response to 13MSG question 3 — init file error presentation:
>
> Agreed with UIS's suggestion. `dev-template configure` will wrap init file errors with context:
>
> ```
> ❌ Init file failed: config/init-database.sql (applied to postgresql)
>
>    ERROR: syntax error at or near "CREAT" at line 12
>
>    Fix the init file and run: dev-template configure
> ```
>
> DCT parses the structured JSON error from `uis-bridge` (`"phase": "init_file"`, `"detail": "..."`), adds the file name and service, shows the raw service error, and tells the developer what to do next. If multiple `requires` entries exist and one fails, DCT reports the failure and skips remaining services (don't leave things half-configured) with a summary:
>
> ```
> ❌ Configuration incomplete:
>    ✅ postgresql — database created
>    ❌ authentik — init file failed (see error above)
>
>    Fix the issue and run: dev-template configure
> ```
>
> `dev-template configure` is idempotent — re-running skips already-configured services (UIS returns "already configured" per 2UIS) and retries failed ones.
>
> **13MSG question 3: done by DCT**

> **12MSG: TMP → ALL:** Responses to UIS/DCT spec review:
>
> - **On `template-info.yaml` persistence (DCT question in 11MSG):** Agreed — DCT must always copy `template-info.yaml` to the project root regardless of `install_type`. For `app` this happens naturally (copies everything). For `overlay` DCT needs an explicit copy step before copying `template/` contents. This is a DCT implementation detail — added as Decision #12.
> - **On 10UIS (native init file formats):** Added as an explicit rule in the `requires` format section.
> - **On 11UIS (param substitution in init files):** Added as an explicit rule in the `params` format section. DCT substitutes all `{{ params.* }}` in both `template-info.yaml` and init files before passing anything to UIS. UIS never sees template syntax.
>
> **5MSG: TMP → ALL:** Responses to team input:
>
> - **On 4MSG (Phase A/B split):** Agreed — this is the right approach. TMP's Phase 1 (create YAML files, generate registry, update Docusaurus) directly enables DCT Phase A with no blockers. We'll align the Next Steps to reflect this dependency chain: TMP Phase 1 → DCT Phase A → UIS commands → DCT Phase B.
> - **On 3MSG (non-interactive params):** Good addition. The `template-info.yaml` format already supports this — `params` is just YAML data, readable by CLI args or YAML edit. TMP will document both paths in the params section.
> - **On 1UIS (Ansible vs ArgoCD):** Accepted. Ansible is the deployment engine for stack templates (Decision #11). ArgoCD GitOps for infrastructure is out of scope — separate future project if ever needed.
> - **On 9UIS (`configurable` field):** Agreed — TMP's validation script should only accept `requires` values for services marked `configurable: true` in UIS's `services.json`. Added to the Next Steps as a dependency.
> - **On 2UIS (per-app credentials):** Clear — DCT persists credentials in `.env`, UIS does not store them. `uis configure` idempotency uses option (b): detect "already configured" and tell DCT to use stored credentials.

**Related**:
- [INVESTIGATE-dct-template-metadata-update.md](../completed/INVESTIGATE-dct-template-metadata-update.md) — DCT metadata changes (completed)
- `helpers-no/devcontainer-toolbox` → `INVESTIGATE-template-categories-dynamic.md` — DCT dynamic categories
- `helpers-no/devcontainer-toolbox` → `INVESTIGATE-advanced-templates.md` — DCT investigation covering advanced templates with backend dependencies, infrastructure templates, documentation templates, and coding rules templates. Contains detailed analysis of multiple future template types.

---

## Vision: An Open Developer Platform

Backstage is an **internal** developer portal — built for a single organisation's private use, deployed as a server, managing internal services and teams.

Note: I think that we will rebrand TMP to ODP (Open developer Portal) later

What we are building is an **open** developer platform — a place to openly share templates, tools, and infrastructure definitions that anyone can use:

| | Backstage (Internal) | Our Platform (Open) |
|---|---|---|
| **Audience** | One organisation's developers | Any developer, any organisation |
| **Deployment** | Server running in your infra | No server — Git repos + static sites |
| **Templates** | Private, org-specific | Public, reusable, shareable |
| **Catalog** | Tracks internal services | Registry of available templates |
| **Access** | Behind auth/VPN | Open source on GitHub |

The three projects together form this open platform:

- **DCT** (devcontainer-toolbox) — the developer environment. Install tools, configure the workspace. Like Backstage's "Tech Radar" but for dev tools.
- **TMP** (dev-templates) — the template library. Scaffold projects, AI workflows, infrastructure, documentation. Like Backstage's "Software Templates" but open and Git-native.
- **UIS** (urbalurba-infrastructure) — the infrastructure platform. Deploy services, manage clusters. Like Backstage's "Service Catalog" but for Kubernetes infrastructure.

TMP is the glue — it connects DCT (tools) with UIS (services) through templates that wire them together. A developer picks a template, the tools get installed (DCT), the infrastructure gets deployed (UIS), and the project is scaffolded (TMP) — all pre-wired.

---

## Current State

### Two separate systems

| | App Templates | AI Templates |
|---|---|---|
| **Folder** | `templates/` | `ai-templates/` |
| **DCT script** | `dev-template.sh` | `dev-template-ai.sh` |
| **DCT command** | `dev-template` | `dev-template-ai` |
| **Sparse-checkout** | `git sparse-checkout set templates` | `git sparse-checkout set ai-templates` |
| **Categories** | BASIC_WEB_SERVER, WEB_APP | WORKFLOW |
| **Installation** | Copies to project root, replaces placeholders | Copies `template/` contents preserving paths |
| **TEMPLATE_CATEGORIES** | `templates/TEMPLATE_CATEGORIES` | `ai-templates/TEMPLATE_CATEGORIES` (same file) |

### Problems with the current approach

1. **Two scripts doing almost the same thing** — `dev-template.sh` and `dev-template-ai.sh` share most logic via `lib/template-common.sh`, but each has its own `scan_templates()`, `select_template()`, category grouping, and menu building
2. **Adding a new template type requires a new script** — if we want infrastructure templates, documentation templates, etc., we'd need `dev-template-infra.sh`, `dev-template-docs.sh`, etc.
3. **Users need to know which command to run** — they need to know the template type before they can select
4. **TEMPLATE_CATEGORIES is duplicated** — same file copied to both folders

---

## Future Template Types

From DCT's `INVESTIGATE-advanced-templates.md` and our own planning:

| Folder | Category Examples | What it installs | Installation behaviour |
|--------|------------------|------------------|----------------------|
| `templates/` | BASIC_WEB_SERVER, WEB_APP | App code, Dockerfile, manifests, CI/CD | Copy to root, replace placeholders |
| `ai-templates/` | WORKFLOW | AI dev workflow docs, CLAUDE.md, plan folders | Copy `template/` preserving paths, handle CLAUDE.md conflict |
| `infra-templates/` | DATABASE, MESSAGE_QUEUE, MONITORING | UIS service setup, Helm charts, post-deploy scripts | May trigger `uis deploy`, create databases, generate `.env` |
| `doc-templates/` | DOC_SITE, DOC_TYPES | Documentation sites and document types — see below | Copy docs into project, same pattern as ai-templates |
| `rules-templates/` | LINTING, AI_RULES, SECURITY | ESLint/Prettier configs, CLAUDE.md, .cursorrules, git hooks | Merge or overlay config files, composable/layerable |

### doc-templates in Detail

Doc templates work the same way as ai-templates — they copy files into the project's docs folder. Two sub-categories:

**DOC_SITE — Documentation site scaffolding:**
- Docusaurus site setup
- MkDocs site setup
- Docs folder structure with sidebar config

**DOC_TYPES — Document type templates:**
These are individual document templates that get added to an existing project. Each copies a few files into `docs/`:

| Template | What it adds |
|----------|-------------|
| Runbook template | `docs/runbooks/` with runbook structure, incident response template |
| ADR (Architecture Decision Records) | `docs/adr/` with ADR template and index |
| API documentation | `docs/api/` with OpenAPI scaffold, endpoint docs |
| Onboarding guide | `docs/onboarding/` with new developer guide template |
| Changelog | `CHANGELOG.md` with keep-a-changelog format |
| Contributing guide | `CONTRIBUTING.md` with PR process, coding standards |
| Incident report | `docs/incidents/` with post-mortem template |
| SLA/SLO definitions | `docs/sla/` with service level templates |

These are simple — same `template/` subdirectory pattern as ai-templates, just copying docs files into the project. A user could run `dev-template` and pick "ADR Template" to instantly get a well-structured ADR folder.

### Key insight from DCT investigation

Infrastructure templates are the **producer** side (deploy PostgreSQL, create database, export connection details) and app templates are the **consumer** side (read `.env`, connect to database). They need to compose — user picks "Next.js + PostgreSQL" and both run. This is a future challenge.

---

## Questions to Answer

1. ~~Should there be one command or multiple?~~ — **Revised**: One unified template repo, but **two installer scripts** in different execution contexts. `dev-template` runs in the devcontainer (DCT) for app/ai/doc templates. `uis template` runs in the provision-host (UIS) for infrastructure/stack templates. Same repo, same metadata format, different execution context.
2. ~~Should all template folders be combined into one folder?~~ — **No**: Keep separate folders. The folder determines which installer handles it and which execution context it runs in.
3. ~~Does the installation behaviour differ by template type?~~ — **Decided**: `install_type` field in `template-info.yaml` tells the trusted installer how to copy files. No executable scripts in templates — see Security section below.
4. ~~How does `TEMPLATE_CATEGORIES` work?~~ — **Per-folder** via `template-categories.yaml`. Each folder defines its own categories. No central categories file.
5. ~~What happens to `dev-template-ai`?~~ — **Merged into `dev-template`**. App, AI, and doc templates all run in the devcontainer — no reason for separate commands. Only UIS templates need a separate command because they run in a different container.

---

## Decided Architecture: One Repo, Two Installers

### The Model

```
helpers-no/dev-templates (this repo)
│
│  Devcontainer templates (dev-template)
├── templates/              # App templates
├── ai-templates/           # AI workflow templates
├── doc-templates/          # Documentation templates (future)
├── rules-templates/        # Coding rules/linting (future)
│
│  UIS templates (uis template)
├── uis-infra-templates/    # Infrastructure service templates (future)
├── uis-stack-templates/    # Multi-service stack compositions (future)
│
│  Shared
├── scripts/                          # Generation and validation scripts
└── website/                # Docusaurus shows everything
```

Both sides use subfolders for the same reason — we don't know what the future brings. New template types get their own folder and category without restructuring.

### Two Execution Contexts

| | Devcontainer Templates | UIS Templates |
|---|---|---|
| **Folders** | `templates/`, `ai-templates/`, `doc-templates/`, `rules-templates/` | `uis-infra-templates/`, `uis-stack-templates/` |
| **Runs in** | Devcontainer (DCT) | provision-host (UIS) |
| **Command** | `dev-template` | `uis template` (or similar) |
| **Script lives in** | DCT repo (`devcontainer-toolbox`) | UIS repo (`urbalurba-infrastructure`) |
| **Has access to** | Project workspace, npm, code editors | kubectl, helm, Ansible, UIS services |
| **Installs** | Files into user's project | Services into K8s cluster |
| **Sparse-checkout** | Folders where CONTEXT=`dct` in `TEMPLATE_FOLDERS` | Folders where CONTEXT=`uis` in `TEMPLATE_FOLDERS` |
| **Post-install** | `dev-template configure` reads YAML, installs tools, calls UIS | `uis configure` creates databases, exposes ports |

### Generated Registry: `template-registry.json`

All template metadata is assembled into one JSON file at `website/src/data/template-registry.json`. This is **auto-generated** from `template-categories.yaml` + `template-info.yaml` files — never hand-edited. It replaces the current `templates.json` + `categories.json` with a single file that serves both Docusaurus and installer scripts.

```json
{
  "categories": [
    {
      "id": "BASIC_WEB_SERVER",
      "order": 0,
      "name": "Basic Web Server Templates",
      "description": "Minimal web server templates that demonstrate Hello World in multiple languages",
      "tags": "webserver backend hello-world starter",
      "logo": "webserver-logo.svg",
      "emoji": "🌐",
      "context": "dct"
    },
    {
      "id": "WEB_APP",
      "order": 1,
      "name": "Web Application Templates",
      "description": "Frontend web application starter templates",
      "tags": "webapp frontend react vite",
      "logo": "webapp-logo.svg",
      "emoji": "📱",
      "context": "dct"
    },
    {
      "id": "WORKFLOW",
      "order": 2,
      "name": "Workflow Templates",
      "description": "AI-assisted development workflow templates",
      "tags": "ai workflow planning automation",
      "logo": "workflow-logo.svg",
      "emoji": "🤖",
      "context": "dct"
    }
  ],
  "templates": [
    {
      "id": "python-basic-webserver",
      "folder": "templates/python-basic-webserver",
      "version": "1.0.0",
      "name": "Python Basic Webserver",
      "description": "Minimal Flask server with health endpoint and Docker support",
      "category": "BASIC_WEB_SERVER",
      "abstract": "Provides a minimal starting point for developers who want to build a Python web server using Flask",
      "tools": "dev-python",
      "readme": "README-python-basic-webserver.md",
      "tags": "python flask webserver api rest",
      "logo": "python-basic-webserver-logo.svg",
      "website": "",
      "docs": "https://github.com/helpers-no/dev-templates/tree/main/templates/python-basic-webserver",
      "summary": "A minimal Python web server using Flask...",
      "related": "php-basic-webserver typescript-basic-webserver"
    }
  ]
}
```

### Two-Step Flow

**Step 1: Fetch registry** (one `curl`, small JSON file)
```bash
curl -sL "https://tmp.sovereignsky.no/data/template-registry.json" > /tmp/registry.json
```

**Step 2: Build menu from registry** (no git operations yet)
```bash
# Get all dct categories
jq -r '.categories[] | select(.context == "dct") | "\(.emoji) \(.name)"' /tmp/registry.json

# Get templates for a category
jq -r '.templates[] | select(.category == "BASIC_WEB_SERVER") | .name' /tmp/registry.json
```

The user can browse categories, read descriptions, go back and forth — all from this one file. No downloads, no sparse-checkout.

**Step 3: Sparse-checkout only the selected template** (after user picks)
```bash
# User selected python-basic-webserver
folder=$(jq -r '.templates[] | select(.id == "python-basic-webserver") | .folder' /tmp/registry.json)
git sparse-checkout set "$folder"
```

Only the chosen template's folder is downloaded. Fast, minimal.

> **1DCT:** This two-step flow (curl registry → sparse-checkout only selected template) is a significant improvement over the current approach. Today we sparse-checkout the entire `templates/` or `ai-templates/` folder upfront just to show the menu. Fetching a small JSON registry first means faster browsing and smaller downloads. The menu can be instant — no git operations until the user confirms a selection.

### Decided File Architecture

| File | Location | Maintained | Purpose |
|------|----------|-----------|---------|
| `template-categories.yaml` | Per template type folder | By hand (YAML) | Folder context, name, description, category definitions |
| `template-info.yaml` | Per template | By hand (YAML) | Template metadata (replaces current `TEMPLATE_INFO` bash format) |
| `template-registry.json` | `website/src/data/template-registry.json` | Auto-generated (TypeScript/CI) | Single JSON consumed by Docusaurus AND installer scripts |

**`template-categories.yaml`** (per folder, maintained by hand):

```yaml
# template-categories.yaml — category definitions for this template folder

context: dct
name: App Templates
description: App project templates (web servers, web apps)
order: 0
emoji: "🌐"

categories:
  - id: BASIC_WEB_SERVER
    order: 0
    name: Basic Web Server Templates
    description: Minimal web server templates that demonstrate Hello World
    tags: webserver backend hello-world starter
    logo: webserver-logo.svg
    emoji: "🌐"

  - id: WEB_APP
    order: 1
    name: Web Application Templates
    description: Frontend web application starter templates
    tags: webapp frontend react vite
    logo: webapp-logo.svg
    emoji: "📱"
```

**`template-info.yaml`** — see [Final `template-info.yaml` Specification](#final-template-infoyaml-specification) below for the complete field reference.

Quick example (simple app template — no services):

```yaml
id: python-basic-webserver
version: "1.0.0"
name: Python Basic Webserver
description: Minimal Flask server with health endpoint and Docker support
category: BASIC_WEB_SERVER
install_type: app
tools: dev-python
readme: README-python-basic-webserver.md
tags: [python, flask, webserver, api, rest]
logo: python-basic-webserver-logo.svg
```

The `category` value must match a category defined in the parent folder's `template-categories.yaml`.

**Repo structure:**

```
templates/
├── template-categories.yaml          # context=dct, defines BASIC_WEB_SERVER + WEB_APP
├── python-basic-webserver/
│   └── template-info.yaml
└── designsystemet-basic-react-app/
    └── template-info.yaml

ai-templates/
├── template-categories.yaml          # context=dct, defines WORKFLOW
└── plan-based-workflow/
    └── template-info.yaml

uis-stack-templates/                  # future
├── template-categories.yaml          # context=uis, defines ORGANISATION_STACK
└── red-cross-infrastructure/
    └── template-info.yaml
```

Each folder is **self-describing**. Adding a new folder = create it + add `template-categories.yaml` + add templates. No central file to edit.

**Generation:** A TypeScript script (runs in CI) scans all `*/template-categories.yaml` + `*/*/template-info.yaml` → outputs `website/src/data/template-registry.json`.

**What goes away:**
- `scripts/lib/TEMPLATE_CATEGORIES` — replaced by `template-categories.yaml` per folder
- `templates/TEMPLATE_CATEGORIES` copies — no longer needed
- `ai-templates/TEMPLATE_CATEGORIES` copies — no longer needed
- `website/src/data/templates.json` — merged into registry
- `website/src/data/categories.json` — merged into registry
- CI sync step for TEMPLATE_CATEGORIES — no longer needed

### One Generated File Serves Everything

`template-registry.json` lives at `website/src/data/template-registry.json` and serves two consumers:

**Docusaurus website:**
- React components import it directly — one file instead of two
- Shows all templates from all contexts (dct + uis)

**DCT/UIS installer scripts:**
- Fetch from the live Docusaurus site:
  ```bash
  curl -sL "https://tmp.sovereignsky.no/data/template-registry.json"
  ```
- Or fetch from raw GitHub as fallback:
  ```bash
  curl -sL "https://raw.githubusercontent.com/helpers-no/dev-templates/main/website/src/data/template-registry.json"
  ```
- Parse with `jq`, filter by context, build menu — no git operations needed for browsing

### Why JSON

- Parsed safely with `jq` (already a dependency)
- No ambiguity — strict format, no quoting issues
- Imported directly by Docusaurus React components
- Backstage field mapping is straightforward
- No bash sourcing needed

### What's Unified

- **Same repo** — all templates in `helpers-no/dev-templates`
- **Same `template-info.yaml` format** — all fields work the same
- **Same `template-categories.yaml` format** — consistent folder declarations
- **Same `template-registry.json`** — one generated file for website and all installers
- **Same Docusaurus website** — shows all templates from all contexts
- **Same validation** — `validate-metadata.sh` checks everything

### What's Different

- **Installer script** — DCT has `dev-template`, UIS has `uis template`
- **Execution context** — devcontainer vs provision-host
- **Context filter** — each installer shows only its context from the registry
- **Configure capabilities** — DCT's `dev-template configure` has npm/pip, UIS's `uis configure` has kubectl/helm/ArgoCD
- **Installation target** — user's project directory vs K8s cluster

### Migration Path

1. Create `template-categories.yaml` for `templates/` and `ai-templates/`
2. Create TypeScript generation script → outputs `website/src/data/template-registry.json`
3. Update CI to run `generate-registry.sh`
4. Update Docusaurus React components to import `template-registry.json`
5. Update `generate-docs-markdown.sh` to read from registry
6. Update DCT `dev-template.sh` to fetch and parse registry with `jq`
7. Merge `dev-template.sh` and `dev-template-ai.sh` into one script filtering by context
8. Remove old files: `TEMPLATE_CATEGORIES`, `templates.json`, `categories.json`
9. **Future**: Add `uis template` in UIS repo for infrastructure templates

> **6DCT:** On `jq` dependency — the registry-based approach requires `jq` to parse JSON in bash. `jq` is already pre-installed in the DCT base image, so this is not a blocker.
>
> **7DCT:** On the migration path (steps 6-7) — merging the two scripts and switching to registry-based browsing is a complete rewrite of the scanning/menu code in `template-common.sh`. Currently DCT sources `TEMPLATE_CATEGORIES` as a bash file and scans directories. Switching to `curl` + `jq` on `template-registry.json` replaces all of that. Not difficult, but needs to happen in coordination with TMP publishing the registry to the live Docusaurus site.

---

## Installation Behaviour Differences

This is the key challenge. Different template types install differently:

| Type | Installation behaviour |
|------|----------------------|
| App templates | Copy all files to project root. Replace `{{GITHUB_USERNAME}}` and `{{REPO_NAME}}` in manifests/workflows. |
| AI templates | Copy `template/` subdirectory contents preserving directory structure. Handle CLAUDE.md conflict. |
| Infra templates (future) | May need Helm chart installation, K8s apply, or UIS service registration |
| Doc templates (future) | May need npm install, Docusaurus init, or similar setup |

This could be handled by an `install_type` field in `template-info.yaml`:
```yaml
install_type: app        # Copy to root, replace placeholders
install_type: overlay    # Copy template/ preserving paths, handle conflicts
install_type: custom     # Requires dev-template configure for service setup
```

> **2DCT:** Merging `dev-template` and `dev-template-ai` is straightforward. The scripts are already 80% shared library. The remaining script-specific logic is: `verify_template()` (different validation rules), `copy_template_files()` (different copy strategies), `process_template_files()` (different placeholder patterns), and `cleanup_and_complete()` (different completion messages). With `install_type` in `template-info.yaml`, these become handlers in the shared library keyed by type.
>
> **3DCT:** On `install_type` — the three types proposed (`app`, `overlay`, `custom`) map cleanly to what we already have:
> - `app` = current `dev-template.sh` behavior (copy to root, replace placeholders, setup workflows, merge gitignore)
> - `overlay` = current `dev-template-ai.sh` behavior (copy `template/` preserving paths, handle CLAUDE.md, safe re-run logic)
> - `custom` = future, would need `dev-template configure` as described in the Security section

---

## TMP as the Glue Layer Across Projects

### The Pattern

TMP (dev-templates) already serves as the glue between DCT and user projects:

```
DCT (dev-setup)          →  installs tools (golang, python, typescript)
TMP (dev-template)       →  scaffolds a project using those tools
User project             →  the result
```

The same pattern could apply to UIS:

```
UIS (uis deploy)         →  installs services (postgresql, redis, grafana)
TMP (uis-template?)      →  scaffolds config/apps that connect to those services
User project             →  the result, pre-wired to UIS services
```

### What UIS Templates Could Look Like

**App + Service compositions:**
- `nextjs-postgres` → Next.js app pre-configured with DATABASE_URL, .env, Prisma schema, migration setup
- `flask-redis` → Flask app with Redis caching, connection code, health checks
- `express-rabbitmq` → Express API with RabbitMQ consumer/publisher, message schemas

**Infrastructure compositions (service stacks):**
- `observability-stack` → deploys Prometheus + Grafana + Loki with pre-configured dashboards and alerts
- `data-pipeline` → deploys PostgreSQL + RabbitMQ + worker service with connection wiring
- `ai-local-stack` → deploys Ollama + LiteLLM + Open WebUI as a complete local AI setup

**Configuration overlays:**
- `add-database` → adds PostgreSQL connection to an existing project (.env, connection code, migration folder)
- `add-monitoring` → adds OTEL instrumentation and Grafana dashboard to an existing app
- `add-auth` → adds Authentik SSO configuration to an existing app

### Where UIS Templates Live — Decided

**In dev-templates.** All templates (DCT and UIS) live in one repo. Each folder has its own `template-categories.yaml` with `context: uis`. The `uis template` installer fetches the registry, filters by `context: uis`, and shows only infrastructure templates.

### Organisation-Level Infrastructure Templates

Beyond single-service templates, we could describe **complete infrastructure stacks for an organisation**. For example:

**"Red Cross Volunteer Platform" stack:**
- PostgreSQL (user database)
- Authentik (SSO/authentication)
- Tailscale (VPN/networking)
- Grafana + Prometheus (monitoring)
- ArgoCD (user app deployment)

A template for this would contain:
1. A service list that `uis template` deploys via `uis deploy` (Ansible playbooks — see Decision #11)
2. Init files for post-deploy configuration (create databases, configure SSO providers, set up dashboards)
3. `.env` files and connection details for app templates to consume
4. Documentation about what was deployed and how to manage it

### Deployment Engine Decision

> **1UIS:** **Decided: Ansible-based deployment, no ArgoCD GitOps for infrastructure.**
>
> UIS uses **Ansible playbooks** as the deployment engine — `uis deploy <service>` runs Ansible which does `helm upgrade --install`, waits for pods, runs health checks. ArgoCD is deployed as a service but is only used for **user app deployment** (`uis argocd register` points ArgoCD at a user's GitHub repo). The UIS infrastructure itself is not managed by ArgoCD in GitOps mode.
>
> Stack templates will use the existing Ansible deployment: `uis template` reads the template's service list and calls `uis deploy` + `uis configure` for each service. No ArgoCD ApplicationSets needed.
>
> ArgoCD GitOps for infrastructure management (ArgoCD watching the UIS repo and auto-reconciling) is out of scope for this project. It may be explored as a separate future project.

### Real Example: "Red Cross Infrastructure" Template

A UIS template that deploys and configures an entire organisation's platform:

```
uis-stack-templates/
├── template-categories.yaml                    # context=uis, defines ORGANISATION_STACK category
└── red-cross-infrastructure/
    ├── template-info.yaml               # category=ORGANISATION_STACK, lists services to deploy
    ├── README-red-cross-infrastructure.md
    ├── config/                     # Init files for uis configure
    │   ├── authentik-providers.yaml
    │   ├── grafana-dashboards.json
    │   └── postgresql-databases.sql
    └── (no scripts — uis template orchestrates via uis deploy + uis configure)
```

**User flow:**

```
1. uis template
   → picks "Red Cross Infrastructure"
   → sparse-checkout just this template folder

2. uis template reads template-info.yaml in provision-host:
   → calls uis deploy for each service (runs Ansible playbooks — see 1UIS)
   → calls uis configure for each service that needs app-specific setup
   → returns connection details as JSON

3. Result: complete Red Cross platform running in K8s
   (deployed via Ansible — see Decision #11)
```

**Then a developer scaffolds an app on top:**

```
4. dev-template (in devcontainer)
   → picks "Next.js Volunteer App"
   → dev-template configure reads template-info.yaml
   → calls uis-bridge for each required service
   → generates .env with DATABASE_URL, AUTH_URL, etc.

5. Result: app scaffolded and pre-wired to the running infrastructure
```

This is the **full producer/consumer chain**:
- UIS template **produces** the infrastructure (databases, auth, monitoring) via `uis deploy` (Ansible)
- DCT template **consumes** it (app wired to those services via `uis configure`)

**On the website:**

```
🏢 Organisation Stacks (uis)
  - Red Cross Infrastructure
  - (future: other org stacks)

🌐 Basic Web Server Templates (dct)
  - Python Basic Webserver
  - TypeScript Basic Webserver

📱 Web Application Templates (dct)
  - Next.js Volunteer App (consumes Red Cross Infrastructure)
```

The same template system handles everything — from a simple Hello World webserver to a complete organisational infrastructure. Same `template-info.yaml` format, same `template-registry.json`, same Docusaurus website, same validation.

### The Connection Problem — Detailed Analysis

The key challenge: a DCT template running in the devcontainer needs database connection details, but only UIS (running in the provision-host container) has access to `kubectl`, Helm, manifests, Ansible playbooks and the credentials.

**UIS secrets architecture** (from `website/docs/contributors/architecture/secrets.md`):
- All services share credentials through one Kubernetes Secret (`urbalurba-secrets`)
- Development defaults are preset so services run immediately — standard userids/passwords
- Credentials are defined in `.uis.secrets/secrets-config/00-common-values.env.template`
- The provision-host generates and applies secrets: `./uis secrets generate` → `./uis secrets apply`

Note: UIS can always just read the current secrets in the cluster using kubectl

> **2UIS:** Confirmed accurate. The secrets system uses `envsubst` to render `00-master-secrets.yml.template` with variables from `00-common-values.env.template`. The generated `kubernetes-secrets.yml` creates `urbalurba-secrets` in all namespaces. Key detail: all services currently share a single `DEFAULT_DATABASE_PASSWORD`. For `uis configure` to create per-app credentials (which it must — we can't hand out admin passwords to every app), UIS uses the admin credentials from `urbalurba-secrets` internally to connect to the service, then creates the app-specific database/user/password directly in the running service (e.g., `CREATE USER ... CREATE DATABASE ...` in PostgreSQL). The per-app credentials are returned in the JSON output to DCT — **UIS does not store them**. It is DCT's responsibility to persist them (e.g., in `.env`). The UIS secrets system (`urbalurba-secrets`) is not involved in per-app credentials at all — it only provides the admin access that `uis configure` uses internally.

**The gap:**
```
DCT devcontainer                    UIS provision-host
├── No kubectl                      ├── Has kubectl
├── No Helm                         ├── Has Helm
├── No K8s access                   ├── Has K8s access
├── Needs DATABASE_URL              ├── Knows credentials
├── Needs to create a database      ├── Can create databases
└── Runs dev-template               └── Runs uis deploy / uis template
```

**The two-step problem:**

1. **Deploy the service** — `uis deploy postgresql` (runs in uis-provision-host, deploys PostgreSQL to K8s with preset credentials)
2. **Configure for the app** — create a specific database + user for this app, generate `.env` with connection details

Step 1 is UIS's job. Step 2 is where the bridge is needed — who creates the database and how does the connection info get to the devcontainer?

**Proposed solution: `uis configure` command**

A new UIS command that `dev-template configure` calls via `uis-bridge` (see 3UIS):

```bash
# In provision-host:
uis configure postgresql --app volunteer-app --database volunteer_db
```

This would:
1. Connect to the running PostgreSQL (using known preset credentials)
2. Create the database `volunteer_db` and a user for it
3. Write connection details to a **shared location** that the devcontainer can read

> **3UIS:** The `docker exec` bridge approach is sound. However, DCT should **not call `docker exec` directly** in its code. Instead, encapsulate the communication in a wrapper script (e.g., `uis-bridge.sh` in DCT) that handles container discovery, `docker exec`, stdin piping for init files, and error handling. All DCT code calls the bridge, never `docker exec` directly.
>
> This way, if we later change the communication method (e.g., REST API, Unix socket, shared volume, or UIS running as a sidecar), only the bridge script changes — no rewrites in `dev-template configure` or any template logic.
>
> ```bash
> # DCT calls this (abstracted):
> uis-bridge configure postgresql --app volunteer-app --json
>
> # The bridge script internally does (today):
> docker exec uis-provision-host uis configure postgresql --app volunteer-app --json
> ```
>
> UIS will ensure the `uis` command is available at a well-known path inside the container.
>
> *UIS internal note: add `RUN ln -s /mnt/urbalurbadisk/provision-host/uis/manage/uis-cli.sh /usr/local/bin/uis` to `Dockerfile.uis-provision-host`.*

**Decided approach: DCT uses `uis-bridge` to run commands in UIS container**

DCT communicates with UIS through `uis-bridge.sh` (see 3UIS). The bridge abstracts the transport — today it uses `docker exec`, but this can change without affecting any calling code.

```bash
# In DCT devcontainer, dev-template configure internally does:

# Call UIS via the bridge (never docker exec directly)
CONNECTION_INFO=$(uis-bridge configure postgresql --app volunteer-app --json)

# Parse and write .env
echo "DATABASE_URL=$(echo $CONNECTION_INFO | jq -r '.database_url')" >> .env
```

**What's needed:**

| Task | Who | Status |
|------|-----|--------|
| Docker CLI install script (see DCT `website/docs/contributors/adding-tools`) | DCT maintainer | Not started |
| Docker socket mount in devcontainer.json | DCT | Already configured |
| `uis configure` command that creates databases and outputs connection info as JSON | UIS maintainer | Not started |
| Templates declare `requires` in `template-info.yaml` | TMP | Format defined |

**The flow:**

```
1. User picks "Next.js Volunteer App" in dev-template → files copied to project
2. User runs: dev-template configure
3. dev-template configure reads template-info.yaml, sees requires: postgresql
4. dev-template configure runs: uis-bridge configure postgresql --app volunteer-app --json
5. UIS creates database, returns connection details as JSON
6. dev-template configure writes .env with DATABASE_URL, etc.
7. App is scaffolded and pre-wired
```

**What this means for templates:**

A DCT template's `template-info.yaml` would declare:
```yaml
requires:
  - service: postgresql
    config:
      database: "{{app_name}}_db"
```

**Benefits:**
- Clean separation — DCT doesn't need kubectl/Helm, just Docker CLI
- UIS handles all K8s/service logic
- The `uis-bridge` abstraction keeps DCT decoupled from the transport mechanism
- No shared filesystems needed between containers
- Connection details flow through stdout/JSON — simple and parseable

> **4UIS:** On the `requires` lifecycle — `uis deploy` is idempotent. Both Ansible (`helm upgrade --install`) and `kubectl apply` are safe to re-run when a service is already running. So DCT/TMP could simply always call `uis deploy postgresql` before `uis configure postgresql`. However, a deploy on an already-running service still takes 30-60 seconds (runs through all playbook tasks and health checks even when nothing changes).
>
> **Recommendation:** `uis configure` should handle this itself — check if the service is running first (fast kubectl check), and if not, return a clear error with the deploy command. This keeps the fast path fast (service already running → straight to configure) while avoiding silent slow deploys. If DCT wants to pre-check, `uis status <service> --json` can return the running state before presenting the template to the user.
>
> *UIS internal note: consider adding a fast-path to `uis deploy` that skips the full playbook when the service is already healthy — would make the "always deploy first" pattern viable.*

### Two Environments: Development vs In-Cluster

An app like "Next.js + PostgreSQL" needs to reach PostgreSQL in two different environments:

**1. Local development (developer running app in DCT devcontainer):**
```
DCT container → host.docker.internal:<port> → Host machine → K8s PostgreSQL
```

**2. In-cluster (app built and deployed by ArgoCD):**
```
Next.js pod → postgresql.default.svc.cluster.local:5432 → K8s internal DNS
```

The template generates both connection configs:
```env
# .env.development (used locally in DCT devcontainer)
DATABASE_URL=postgresql://user:pass@host.docker.internal:5432/volunteer_db

# In-cluster connection (in K8s deployment manifest / Secret)
DATABASE_URL=postgresql://user:pass@postgresql.default.svc.cluster.local:5432/volunteer_db
```

`host.docker.internal` is a Docker DNS name that resolves to the host machine from inside any Docker container. It works on macOS, Windows, and Linux (Docker 20.10+).

**The key requirement:** PostgreSQL's port must be reachable from the DCT container. This is a UIS responsibility — see requirements below.

> **5UIS:** Confirmed — `host.docker.internal` is the correct approach. I've verified the networking:
> - UIS provision-host runs with `--network host` (shares host network stack directly)
> - DCT devcontainer runs on Docker's **default bridge network** (no `--network host` in its `runArgs`)
> - Therefore DCT cannot use `localhost` to reach the host — it must use `host.docker.internal`
> - Any port UIS exposes on the host (via NodePort or port-forward) is reachable from DCT via `host.docker.internal:<port>`
> - Since UIS uses `--network host`, port-forwards inside the provision-host bind directly to the host machine — no extra hops needed

### Future: Remote K8s Clusters

Today DCT, UIS, and K8s (k3s via Rancher Desktop) all run locally on the developer's machine. But in the future K8s may run elsewhere:

```
Today:
  Developer's machine
  ├── DCT devcontainer
  ├── UIS provision-host
  └── Rancher Desktop (k3s) ← K8s is local

Future:
  Developer's machine
  ├── DCT devcontainer
  └── UIS provision-host (has kubectl to remote cluster)

  Remote (Azure, another machine, cloud)
  └── K8s cluster ← K8s is remote
```

UIS already handles this through kubeconfig — `uis-provision-host` connects to whatever cluster is configured in `.uis.secrets/generated/kubeconfig/kubeconf-all`. The `uis deploy` and `uis configure` commands work the same regardless of where K8s runs.

**Impact on the connection problem:**

The only guaranteed path from DCT to K8s services is **through UIS**. DCT cannot reach the remote K8s directly — there's no kubectl, no firewall access, no VPN. Only UIS has the connection.

This means **UIS must proxy the connection** for DCT:

```
DCT container
  → uis-bridge expose postgresql
  → UIS runs kubectl port-forward (it has kubectl access to any cluster)
  → UIS binds the port locally
  → DCT connects via host.docker.internal:<port>
```

The pattern is the same regardless of whether K8s is local or remote:

1. DCT asks UIS to expose a service (via `uis-bridge`)
2. UIS handles the connection internally (NodePort for local, port-forward for remote)
3. UIS makes the service reachable on a local port
4. DCT connects — it never needs to know where K8s actually runs

**This is the critical insight:** DCT's only connection to K8s is through UIS. Templates should never assume direct K8s access. The `uis expose` and `uis configure` commands abstract away the cluster location completely.

**One path, always:**

```
Development:   DCT → uis-bridge → UIS → kubectl → K8s (local or remote)
In-cluster:    App pod → K8s internal DNS → Service (always the same)
```

No special cases for local vs remote. UIS always proxies the connection. DCT always connects the same way. This keeps templates simple — they don't need to know or care where K8s runs.

### Requirements for UIS Contributor

This section summarises what TMP and DCT need from UIS to make service-dependent templates work.

**1. Service port exposure for local development**

When a developer runs an app locally in the DCT devcontainer, the app needs to reach K8s services (PostgreSQL, Redis, etc.) via `host.docker.internal:<port>`.

This means UIS must expose service ports to the host machine. Options (UIS decides which):
- **NodePort** — K8s Service type NodePort exposes the service on a high port on the host. Persistent, survives restarts.
- **Traefik TCP routing** — Traefik can route TCP connections (not just HTTP). Requires adding TCP entrypoints.
- **kubectl port-forward** — forwards a pod port to the host. Simple but needs a running process.

> **6UIS:** Current state — all services use **ClusterIP** (except JupyterHub which uses NodePort). My recommendation is a **hybrid approach**:
>
> - **Default: `kubectl port-forward`** — simplest to implement, works for both local and remote clusters, and since UIS runs with `--network host` the forwarded port is immediately available on the host machine. The `uis expose` command would manage the port-forward process (start/stop/status).
> - **Persistent option: NodePort** — for services the developer wants always available (survives restarts). `uis expose postgresql --persistent` could patch the service to NodePort.
> - **Traefik TCP routing** — I'd defer this. It adds complexity (TCP entrypoint configuration, SNI routing) and doesn't solve a problem the other two options don't already handle.
>
> **Port assignment:** I propose fixed well-known port mappings per service to keep things predictable. For example: PostgreSQL → 35432, Redis → 36379, MongoDB → 37017, MySQL → 33306. These avoid conflicts with any local installations on standard ports. The mappings would live in UIS's `services.json` (new field: `exposePort`). `uis configure` would return the actual port in its JSON output regardless of approach used.

**Requirement:** The developer should be able to easily enable/disable/check the connection. Something like:
```bash
# In provision-host:
uis expose postgresql          # make PostgreSQL reachable from host
uis expose postgresql --stop   # stop exposing
uis expose --status            # show what's currently exposed
```

**2. `uis configure` command**

A command that creates app-specific resources in a deployed service and returns connection details as JSON:

```bash
# In provision-host:
uis configure postgresql --app volunteer-app --database volunteer_db --json
```

Success output:
```json
{
  "status": "ok",
  "service": "postgresql",
  "local": {
    "host": "host.docker.internal",
    "port": 35432,
    "database_url": "postgresql://volunteer_app:pass@host.docker.internal:35432/volunteer_db"
  },
  "cluster": {
    "host": "postgresql.default.svc.cluster.local",
    "port": 5432,
    "database_url": "postgresql://volunteer_app:pass@postgresql.default.svc.cluster.local:5432/volunteer_db"
  },
  "database": "volunteer_db",
  "username": "volunteer_app",
  "password": "generated-password"
}
```

Error output (Decision #13):
```json
{
  "status": "error",
  "phase": "init_file",
  "service": "postgresql",
  "detail": "ERROR: syntax error at or near \"CREAT\" at line 12"
}
```

- `status` — `"ok"` on success, `"error"` on failure. DCT checks this first.
- `phase` — where the error occurred: `"deploy_check"` (service not running), `"create_resources"` (database/user creation failed), `"init_file"` (init file application failed), `"expose"` (port exposure failed).
- `detail` — raw error message from the service tool. DCT shows this to the developer.
- `local` — UIS determines the host and port. The port is whatever UIS has exposed (could be 5432 if available, or a high port like 35432). DCT doesn't choose the port — UIS does.
- `cluster` — standard K8s internal DNS, always the same pattern.
- Human-readable progress on stderr. Exit code non-zero on failure.

The template uses `local` for `.env.development` and `cluster` for the K8s deployment manifest.

> **7UIS:** The JSON output format looks good. Here is the full `uis configure` interface as UIS understands it from the `requires` block in `template-info.yaml`:
>
> **Command interface:**
> ```bash
> uis configure <service> --app <app-name> [--database <db-name>] [--init-file <path>] --json
> ```
>
> - `<service>` — must match a UIS service ID from `services.json` (e.g., `postgresql`, `redis`, `authentik`)
> - `--app` — the app name, used to derive username (e.g., `volunteer-app` → user `volunteer_app`)
> - `--database` — service-specific: database name for PostgreSQL/MySQL/MongoDB, key prefix for Redis, etc.
> - `--init-file` — optional data file (SQL, YAML, JSON) to apply after creating resources. UIS applies it using the appropriate service tool (`psql -f` for PostgreSQL, API calls for Authentik/Grafana). The file is data, not executable code — UIS validates and applies it safely.
> - `--json` — return connection details as JSON on stdout. Human-readable progress on stderr.
>
> **What UIS does internally:**
> 1. Check service is deployed (fast kubectl check — fail with helpful error if not, see **4UIS**)
> 2. Read admin credentials from `urbalurba-secrets`
> 3. Generate per-app password
> 4. Create database/user/resources in the running service
> 5. Apply init file if provided
> 6. Auto-expose the service port if not already exposed (see **6UIS**)
> 7. Return JSON with `local` and `cluster` connection details
>
> **Idempotency:** Running `uis configure` twice with the same args must not fail — it detects existing resources and returns the current connection details. However, note that on a second run, the generated password from the first run is lost (UIS doesn't store it, see **2UIS**). UIS would need to either: (a) reset the password to a new one and return it, or (b) detect "already configured" and return a message telling DCT to use its stored credentials. Option (b) is safer — avoids invalidating a working `.env`.
>
> **Per-service handlers:** Each configurable service needs its own handler in `provision-host/uis/lib/configure-<service>.sh`. Start with PostgreSQL, then Redis, MongoDB, MySQL, Authentik.
>
> *UIS internal note: the `--init-file` path is tricky — the file lives in DCT's filesystem, not inside the UIS container. DCT will need to pipe the file content via stdin or use `docker exec` with `-i` flag: `docker exec -i uis-provision-host uis configure postgresql --init-file - < config/init-database.sql`*

**3. Docker CLI in DCT**

DCT needs a Docker CLI install script so that `uis-bridge.sh` can communicate with the UIS provision-host container. The Docker socket is already mounted in the DCT devcontainer.json. See DCT `website/docs/contributors/adding-tools` for how to create install scripts.

> **5DCT:** DCT does NOT currently have a Docker CLI install script. The Docker socket is mounted (`/var/run/docker.sock`) but the `docker` command is not available inside the devcontainer. We need to create `install-tool-docker-cli.sh`. This is a prerequisite for any template that `requires` UIS services. Note: this is a static binary install (similar to how Hugo is installed) — no apt repository needed.

**4. UIS container discovery**

DCT needs a reliable way to find the UIS uis-provision-host container. Options:
- Fixed container name (UIS sets `container_name: uis-provision-host` in its Docker Compose)
- Label-based discovery (`docker ps --filter "label=uis.role=provision-host"`)
- Image-based discovery (`docker ps --filter "ancestor=ghcr.io/helpers-no/uis-provision-host"`)

> **8UIS:** Use the **fixed container name `uis-provision-host`**. This is already hardcoded in the `./uis` host wrapper script and is the only container name UIS uses. It's the simplest and most reliable option. No labels are currently set on the container, and image-based discovery is fragile (the image can be overridden via `UIS_IMAGE` env var, or locally built as `uis-provision-host:local`).
>
> DCT should use: `docker exec uis-provision-host uis <command>` (see **3UIS** for symlink proposal)
>
> To check if UIS is running: `docker ps --filter "name=uis-provision-host" --format '{{.Status}}'`

**5. Service names must match UIS service IDs**

When a template declares `requires: postgresql`, that name must match the UIS service ID exactly. The canonical service IDs are defined in UIS at `website/src/data/services.json`. 
Online at: https://raw.githubusercontent.com/helpers-no/urbalurba-infrastructure/refs/heads/main/website/src/data/services.json
Current services:

```
litellm, openwebui, jupyterhub, openmetadata, spark, unity-catalog,
elasticsearch, mongodb, mysql, postgresql, qdrant, redis, authentik,
enonic, gravitee, rabbitmq, argocd, backstage, nextcloud, nginx,
pgadmin, redisinsight, whoami, cloudflare-tunnel, tailscale-tunnel,
grafana, loki, otel-collector, prometheus, tempo
```

Templates must use these exact IDs — no aliases, no abbreviations. The validation script should check that `requires` values match known UIS service IDs (fetched from UIS `services.json` or a cached copy).

> **9UIS:** Confirmed — `services.json` is the canonical source for service IDs. Each service entry also includes `namespace`, `requires` (inter-service dependencies), and `helmChart` fields that `uis configure` will use internally. Note that not all services in `services.json` are "configurable" in the `uis configure` sense — only data services (postgresql, mysql, mongodb, redis, elasticsearch, qdrant) and identity services (authentik) would have configure handlers. Services like grafana, prometheus, argocd are infrastructure that apps don't connect to directly. We should add a `configurable: true/false` field to `services.json` so TMP's validation can distinguish between services you can `requires` and services you can't.

**Summary of UIS tasks:**

| Task | Description | UIS Status |
|------|-------------|------------|
| Service port exposure | Expose K8s service ports to host machine so DCT containers can reach them via `host.docker.internal` | Not started — recommend hybrid port-forward + NodePort approach |
| `uis expose` command | Enable/disable/check service port exposure | Not started — fits into existing CLI command structure |
| `uis configure` command | Create app-specific databases/users, return connection details as JSON | Not started — start with PostgreSQL, expand to other data services |
| Container naming/labels | Make the provision-host container reliably discoverable by DCT | **Already done** — fixed name `uis-provision-host` in host wrapper |
| `configurable` field in `services.json` | Mark which services support `uis configure` | Not started — needed for TMP validation |
| Fixed port mappings in `services.json` | Add `exposePort` field for predictable port assignments | Not started |
| Init file format docs | Document the native format for each configurable service's init files, with links to upstream docs (10UIS) | Not started — needed for template authors |

---

## Security: No Executable Scripts in Templates

### The Problem

Running a `post-install.sh` script from a downloaded template means executing untrusted code inside the developer's container. Templates are open — anyone can contribute. A malicious `post-install.sh` could steal credentials, modify files, or compromise the development environment.

### The Decision

**Templates contain only data — never executable code.**

- `template-info.yaml` — YAML declarations of what's needed
- `template-categories.yaml` — YAML category definitions
- Template files — source code, configs, manifests (copied, not executed)

All executable logic lives in **trusted code** maintained by the DCT and UIS platform teams:

| Action | Who executes | Where the code lives |
|--------|-------------|---------------------|
| Copy template files | DCT `dev-template` | DCT repo (trusted) |
| Install dev tools | DCT `dev-template configure` | DCT repo (trusted) |
| Deploy K8s services | UIS `uis deploy` / `uis configure` | UIS repo (trusted) |
| Expose service ports | UIS `uis expose` | UIS repo (trusted) |
| Create databases/users | UIS `uis configure` | UIS repo (trusted) |

### How It Works

The template author declares **what** is needed in `template-info.yaml`:

```yaml
install_type: app
tools: dev-typescript
requires:
  - service: postgresql
    config:
      database: volunteer_db
```

After template files are copied, the developer runs a trusted DCT command:

```bash
dev-template configure
```

This trusted command reads `template-info.yaml` and:
1. Reads `tools: dev-typescript` → installs TypeScript (DCT code)
2. Reads `requires: postgresql` → calls `uis-bridge configure postgresql --json` (UIS code via bridge)
3. Writes `.env` with connection details returned by UIS

The template author never writes executable code. The DCT and UIS maintainers implement the handlers for each `install_type` and service type.

> **4DCT:** On the Security decision (no executable `post-install.sh` in templates) — I agree. Currently neither template script runs any code from the downloaded templates. All logic is in DCT's trusted code. The `dev-template configure` command proposed here is the right way to handle infrastructure setup without executing untrusted code.

### Parameters: Edit YAML Before Configure

Inspired by Backstage's parameters concept, `template-info.yaml` can include a `params` section with fields the developer fills in before running `dev-template configure`.

After `dev-template` copies files to the project, the developer sees:

```yaml
# template-info.yaml — edit params below, then run: dev-template configure

id: nextjs-volunteer-app
install_type: app
tools: dev-typescript

params:
  app_name: ""              # Required — your app name
  database_name: ""         # Required — database to create in PostgreSQL
  auth_provider: ""         # Optional — authentik, or leave empty for no auth

requires:
  - service: postgresql
    config:
      database: "{{ params.database_name }}"
```

The developer edits the YAML:

```yaml
params:
  app_name: "volunteer-app"
  database_name: "volunteer_db"
  auth_provider: "authentik"
```

Then runs `dev-template configure`. The trusted DCT command:

1. Reads `template-info.yaml`
2. Validates all required params are filled — if not:
   ```
   ❌ Missing required parameters in template-info.yaml:
      params.app_name — your app name
      params.database_name — database to create

   Edit template-info.yaml and run dev-template configure again.
   ```
3. Substitutes `{{ params.* }}` references in `requires` and other fields
4. Proceeds with tool installation and service configuration

**Benefits:**
- Developer controls the values — no surprises
- Required fields are validated before any actions run
- The YAML file is reviewable and editable — not a black box
- Same pattern works in CI/CD — fill params from environment variables
- No interactive prompts needed (but could be added as convenience)
- **Two paths (see 3MSG):** developers edit YAML then run `dev-template configure`; CI/CD passes params as CLI args: `dev-template configure --param app_name=volunteer-app --param database_name=volunteer_db`

### Init Files: Templates Reference Data Files for Service Configuration

Templates can include data files (SQL, YAML, JSON) that UIS applies during `uis configure`. The `template-info.yaml` references them via an `init` field:

```yaml
requires:
  - service: postgresql
    config:
      database: "{{ params.database_name }}"
      init: "config/init-database.sql"

  - service: authentik
    config:
      provider: "{{ params.app_name }}"
      init: "config/authentik-setup.yaml"
```

The template folder contains the data files:

```
nextjs-volunteer-app/
├── template-info.yaml
├── config/
│   ├── init-database.sql          # CREATE TABLE, seed data, indexes
│   ├── authentik-setup.yaml       # Users, groups, OAuth app, permissions
│   └── grafana-dashboards.json    # Pre-built monitoring dashboards
├── app/
│   └── ...
```

`dev-template configure` passes the file to UIS via `uis-bridge`:

```bash
uis-bridge configure postgresql \
  --app volunteer-app \
  --database volunteer_db \
  --init-file config/init-database.sql \
  --json
```

UIS applies the file using the appropriate tool for each service:
- PostgreSQL → `psql -f init-database.sql`
- Authentik → API calls from the YAML definition
- Grafana → dashboard import API from JSON

**Security:** Init files are data — not executable code. SQL, YAML, and JSON are processed by the trusted UIS service handlers. The template author writes data definitions, UIS decides how to apply them safely.

**Examples of init files:**

| Service | Init file | What it does |
|---------|-----------|-------------|
| PostgreSQL | `init-database.sql` | Create tables, seed data, create indexes |
| Authentik | `authentik-setup.yaml` | Create OAuth app, users, groups, permissions |
| Grafana | `grafana-dashboards.json` | Import pre-built dashboards |
| Redis | `redis-init.yaml` | Create namespaces/key prefixes |
| RabbitMQ | `rabbitmq-setup.yaml` | Create queues, exchanges, bindings |

### Responsibility Split

| Who | Maintains | Does |
|-----|-----------|------|
| **Template author** | `template-info.yaml` (data only) | Declares what the template needs |
| **DCT maintainer** | `dev-template configure` command | Reads YAML, installs tools, calls UIS |
| **UIS maintainer** | `uis configure`, `uis expose` commands | Creates databases, exposes ports, returns connection JSON |

> **8DCT:** On `dev-template configure` — this is a new command that doesn't exist yet. It would read `template-info.yaml` from the project directory (left behind after template install), check `requires`, and call `uis-bridge configure ...`. This is Phase 2 work and depends on UIS having `uis configure` ready. The `template-info.yaml` file must be kept in the project after install (currently `TEMPLATE_INFO` bash files are copied but not used post-install).

---

## Backstage Comparison and Ideas

Backstage (Spotify's open-source developer portal) solves many of the same problems. Comparing what we have, what Backstage does, and what ideas we can adopt.

### What's Similar

| Our System | Backstage Equivalent |
|------------|---------------------|
| `template-info.yaml` metadata | `template.yaml` — declarative metadata describing the template |
| `template-categories.yaml` | Software Catalog `kind: Template` with categories/tags |
| `dev-template` dialog menu | Backstage Scaffolder UI — user picks template, fills parameters |
| Template file copying + placeholder replacement | Scaffolder `fetch:template` action with Nunjucks templating |
| `tools` (auto-install) | Scaffolder custom actions — run post-scaffold steps |
| Docusaurus template cards/pages | Backstage Software Catalog — browsable catalog of templates |
| `readme` (completion message) | Scaffolder task output — shows result and next steps |

### What Backstage Has That We Could Use

1. **Parameters/Input Forms** — Backstage templates define input parameters (project name, language, features) that the user fills in before scaffolding. We only have `{{GITHUB_USERNAME}}` and `{{REPO_NAME}}`. Future templates (database name, API key, etc.) would need this. Could add a `params` field in `template-info.yaml` or a separate `params.yaml` file per template.

2. **Multi-Step Actions** — Backstage scaffolder runs a pipeline of actions: fetch template, create repo, register in catalog, create CI/CD, notify Slack. Our installation is a single copy step. For infra templates that need `uis deploy` + create database + generate `.env`, a step pipeline would be useful. Could define a `steps` field in `template-info.yaml`.

3. **Custom Actions** — Backstage lets you write custom scaffolder actions (e.g., `action: create-database`). Our equivalent is the `requires` field in `template-info.yaml` — the trusted `dev-template configure` and `uis configure` commands handle the actions. No untrusted code in templates.

4. **Software Catalog** — Backstage registers every scaffolded project in a central catalog with ownership, dependencies, and API docs. We don't track what was scaffolded — templates are fire-and-forget. Not needed now, but useful for organisations managing many projects.

5. **Dry Run** — Backstage supports running templates in dry-run mode to validate before executing. We have `validate-metadata.sh` but no way to preview what a template will do to the user's project.

6. **Template Versioning** — Backstage templates are versioned and users can pick which version. We have `version` but don't offer version selection — always latest from `main`.

7. **Infrastructure Integration** — 2026 Backstage plugins include Pulumi, Terraform, and Kubernetes scaffolder actions for self-service infra provisioning directly from templates. Aligns with our future infra-templates concept.

8. **Composability** — Backstage lets you chain templates and actions. We could allow `requires: postgresql-setup` in `template-info.yaml` to trigger infra templates before app templates.

### What We Have That Backstage Doesn't (for our use case)

1. **Terminal-native** — works in any devcontainer via `dialog`, no web UI needed
2. **Zero infrastructure** — no Backstage server to deploy and maintain
3. **Git-native** — templates stored in a regular Git repo, no catalog database
4. **Simple** — bash scripts, no TypeScript/React/PostgreSQL stack to maintain
5. **Lightweight** — works offline after sparse-checkout, no API calls

### Ideas to Adopt (prioritised)

**Short term:**
- **`dev-template configure`** — a trusted DCT command that reads `template-info.yaml` and performs setup (install tools, call UIS for services). No untrusted scripts in templates.

**Medium term:**
- **`params`** — define additional parameters beyond username/repo in `template-info.yaml`. The install script prompts for them via `dialog` before scaffolding.
- **Composability** — `requires: postgresql-setup` in `template-info.yaml` triggers prerequisite templates. Infra templates produce `.env`, app templates consume it.

**Long term:**
- **Step pipeline** — ordered steps per template for complex multi-action installations
- **Dry run** — preview what files will be created/modified before executing
- **Backstage compatibility** — export templates as Backstage `template.yaml` for organisations that adopt Backstage

### Dependency Map and Lightweight Catalog

Backstage has a software catalog that tracks service dependencies and creates dependency maps. We don't have this today, but the need emerges naturally when templates start declaring dependencies:

```yaml
# template-info.yaml for nextjs-volunteer-app
id: nextjs-volunteer-app
requires:
  - postgresql-setup
  - authentik-setup
```

```yaml
# template-info.yaml for red-cross-infrastructure
id: red-cross-infrastructure
provides:
  - postgresql
  - authentik
  - tailscale
  - grafana
```

Note: the DCT actually have a script that is backstage compatible that build dependencies of the services in UIS. eg authentik needs postgresql

With `requires` and `provides` fields, we can build a dependency map:

```
red-cross-infrastructure ──provides──> postgresql
                         ──provides──> authentik

nextjs-volunteer-app ──requires──> postgresql-setup
                     ──requires──> authentik-setup
```

This could be:
- **Displayed on the Docusaurus website** — show which templates depend on which infrastructure
- **Used by the installer** — when user picks "Next.js Volunteer App", warn if PostgreSQL isn't deployed, or offer to deploy it first
- **Visualised as a dependency graph** — like Backstage's catalog graph, but generated from `template-info.yaml` fields

This doesn't need a running catalog server. The `template-registry.json` already has all the data — a React component on the website can render the graph from it. The installer can check dependencies at install time.

Not needed now, but the `requires` and `provides` fields should be considered when finalising the `template-info.yaml` format.

### Field Name Alignment with Backstage (reference)

We considered aligning our field names with Backstage's `template.yaml`. Key differences:

| Our field | Backstage field | Decision |
|-----------|----------------|----------|
| `id` | `metadata.name` | Keep `id` — same meaning |
| `name` | `metadata.title` | Keep `name` — consistent with DCT, UIS, TMP |
| `description` | `metadata.description` | Same |
| `tags` | `metadata.tags` | Same |
| `category` | `spec.type` | Keep `category` — richer concept than Backstage's `type` |

**Decision:** Keep our own field names for consistency across DCT, UIS, and TMP. Backstage compatibility is handled by the generation script (`INVESTIGATE-backstage.md`) that maps our fields to Backstage's when generating `template.yaml` files.

### References

- [Backstage Software Templates](https://backstage.io/docs/features/software-templates/)
- [Writing Templates](https://backstage.io/docs/features/software-templates/writing-templates/)
- [Top Backstage Plugins for Infrastructure Automation (2026 Edition)](https://stackgen.com/blog/top-backstage-plugins-for-infrastructure-automation-2026-edition)
- [Backstage Software Templates GitHub](https://github.com/backstage/software-templates)
- [Backstage in Production: From Developer Portal to Platform Operating System](https://medium.com/@sumit.kaul.87/backstage-in-production-from-developer-portal-to-platform-operating-system-0083121c28b1)
- [Backstage - The Ultimate Guide 2026](https://roadie.io/backstage-spotify/)
- [The Backstage Scaffolder, a Powerful New Orchestration Tool](https://thenewstack.io/the-backstage-scaffolder-a-powerful-new-orchestration-tool/)

---

## Final `template-categories.yaml` Specification

One file per template type folder. Defines the folder's execution context and the categories available within it.

### Folder-Level Fields

| # | Field | Type | Required | Current equivalent | Description |
|---|-------|------|----------|-------------------|-------------|
| 1 | `context` | string | Yes | *(new)* | Execution context. Values: `dct` (devcontainer — `dev-template`) or `uis` (provision-host — `uis template`). Determines which installer handles templates in this folder. |
| 2 | `name` | string | Yes | *(new)* | Human-readable name for this template folder. Shown as a top-level grouping on the website and in menus. |
| 3 | `description` | string | Yes | *(new)* | One-line description of this template folder. |
| 4 | `order` | integer | Yes | *(new)* | Display order among folders. Lower numbers first. Folders with the same `context` are sorted by this value. |
| 5 | `emoji` | string | Yes | *(new)* | Emoji shown next to the folder name in terminal menus. |
| 6 | `categories` | list | Yes | `TEMPLATE_CATEGORY_TABLE` | List of category definitions. See below. |

### Category Entry Fields

Each entry in the `categories` list:

| # | Field | Type | Required | Current `TEMPLATE_CATEGORIES` column | Description |
|---|-------|------|----------|--------------------------------------|-------------|
| 1 | `id` | string | Yes | `ID` (column 2) | Category identifier. `UPPERCASE_UNDERSCORE` format. Referenced by `template-info.yaml` `category` field. Must be unique across all folders. |
| 2 | `order` | integer | Yes | `ORDER` (column 1) | Display order within this folder. Lower numbers first. |
| 3 | `name` | string | Yes | `NAME` (column 3) | Human-readable category name. |
| 4 | `description` | string | Yes | `DESCRIPTION` (column 4) | Category description, 50–150 characters. |
| 5 | `tags` | string | Yes | `TAGS` (column 5) | Space-separated tags for search/filtering. |
| 6 | `logo` | string | Yes | `LOGO` (column 6) | Logo filename in `website/static/img/categories/`. |
| 7 | `emoji` | string | Yes | `EMOJI` (column 7) | Emoji shown in terminal menus next to category name. |

### Complete Examples

**App templates folder (`templates/template-categories.yaml`):**

```yaml
# template-categories.yaml — category definitions for app templates

context: dct
name: App Templates
description: App project templates (web servers, web apps)
order: 0
emoji: "🌐"

categories:
  - id: BASIC_WEB_SERVER
    order: 0
    name: Basic Web Server Templates
    description: Minimal web server templates that demonstrate Hello World in multiple languages
    tags: webserver backend hello-world starter
    logo: webserver-logo.svg
    emoji: "🌐"

  - id: WEB_APP
    order: 1
    name: Web Application Templates
    description: Frontend web application starter templates
    tags: webapp frontend react vite
    logo: webapp-logo.svg
    emoji: "📱"
```

**AI workflow templates folder (`ai-templates/template-categories.yaml`):**

```yaml
# template-categories.yaml — category definitions for AI workflow templates

context: dct
name: AI Workflow Templates
description: AI-assisted development workflow templates
order: 1
emoji: "🤖"

categories:
  - id: WORKFLOW
    order: 0
    name: Workflow Templates
    description: AI-assisted development workflow templates
    tags: ai workflow planning automation
    logo: workflow-logo.svg
    emoji: "🤖"
```

**UIS stack templates folder (`uis-stack-templates/template-categories.yaml`) — future:**

```yaml
# template-categories.yaml — category definitions for UIS stack templates

context: uis
name: Infrastructure Stacks
description: Multi-service infrastructure compositions deployed via UIS
order: 0
emoji: "🏢"

categories:
  - id: ORGANISATION_STACK
    order: 0
    name: Organisation Stacks
    description: Complete infrastructure stacks for an organisation or project
    tags: infrastructure stack deployment organisation
    logo: organisation-stack-logo.svg
    emoji: "🏢"
```

### Migration from `TEMPLATE_CATEGORIES`

| Current (bash pipe-delimited) | `template-categories.yaml` | Notes |
|-------------------------------|---------------------------|-------|
| `ORDER` column | Category `order` | Same |
| `ID` column | Category `id` | Same |
| `NAME` column | Category `name` | Same |
| `DESCRIPTION` column | Category `description` | Same |
| `TAGS` column | Category `tags` | Same (stays space-separated) |
| `LOGO` column | Category `logo` | Same |
| `EMOJI` column | Category `emoji` | Same |
| *(none)* | `context` | **New.** Folder-level. `dct` or `uis`. |
| *(none)* | Folder `name` | **New.** Human-readable folder name. |
| *(none)* | Folder `description` | **New.** One-line folder description. |
| *(none)* | Folder `order` | **New.** Display order among folders. |
| *(none)* | Folder `emoji` | **New.** Emoji for folder-level display. |

### Rules

- One `template-categories.yaml` per template type folder — no central categories file
- Category `id` values must be unique across **all** folders (the generation script validates this)
- Adding a new template type = create a folder + add `template-categories.yaml` + add templates
- CI copies nothing — each folder is self-contained (unlike the current `TEMPLATE_CATEGORIES` sync)

### What Goes Away

- `scripts/lib/TEMPLATE_CATEGORIES` — replaced by per-folder YAML files
- `templates/TEMPLATE_CATEGORIES` (CI-copied) — no longer needed
- `ai-templates/TEMPLATE_CATEGORIES` (CI-copied) — no longer needed
- CI sync step that copies `TEMPLATE_CATEGORIES` to template folders — no longer needed

---

## Final `template-info.yaml` Specification

This is the canonical field reference. All contributors should review and confirm.

### Field Reference

| # | Field | Type | Required | Current `TEMPLATE_INFO` equivalent | Description |
|---|-------|------|----------|-------------------------------------|-------------|
| 1 | `id` | string | Yes | `TEMPLATE_ID` | Must exactly match the directory name. Used as the unique identifier everywhere. |
| 2 | `version` | string | Yes | `TEMPLATE_VER` | Semantic version. Quote it: `"1.0.0"` (YAML would parse `1.0` as a float). |
| 3 | `name` | string | Yes | `TEMPLATE_NAME` | Human-readable display name. |
| 4 | `description` | string | Yes | `TEMPLATE_DESCRIPTION` | One-line description. Shown in menus and template cards. |
| 5 | `category` | string | Yes | `TEMPLATE_CATEGORY` | Must match a category `id` in the parent folder's `template-categories.yaml`. |
| 6 | `install_type` | string | Yes | *(new)* | How the trusted installer copies files. Values: `app`, `overlay`. See below. |
| 7 | `abstract` | string | Yes | `TEMPLATE_ABSTRACT` | One-paragraph explanation shown in the template detail page. Supports multi-line YAML (`>`). |
| 8 | `tools` | string | No | `TEMPLATE_TOOLS` | Space-separated DCT tool IDs to auto-install. Empty string or omit if none. |
| 9 | `readme` | string | Yes | `TEMPLATE_README` | Filename of the template README (e.g., `README-python-basic-webserver.md`). |
| 10 | `tags` | list | Yes | `TEMPLATE_TAGS` | YAML list of tags for search/filtering. |
| 11 | `logo` | string | Yes | `TEMPLATE_LOGO` | Logo filename in `website/static/img/templates/`. |
| 12 | `website` | string | No | `TEMPLATE_WEBSITE` | External website URL. Empty string or omit if none. |
| 13 | `docs` | string | Yes | `TEMPLATE_DOCS` | URL to the template's source on GitHub. |
| 14 | `summary` | string | Yes | `TEMPLATE_SUMMARY` | Multi-sentence summary for the detail page body and registry. Supports multi-line YAML (`>`). |
| 15 | `related` | list | No | `TEMPLATE_RELATED` | YAML list of related template IDs. Empty list or omit if none. |
| 16 | `params` | map | No | *(new)* | Key-value pairs the developer fills in before `dev-template configure`. See Params section. |
| 17 | `requires` | list | No | *(new)* | UIS services this template needs. See Requires section. |
| 18 | `provides` | list or map | No | *(new)* | Services this template makes available (UIS stack templates only). Flat list of service IDs, or extended format with `stacks` + `services` keys (26MSG). |

### `install_type` Values

| Value | Behaviour | Used by |
|-------|-----------|---------|
| `app` | Copy all files to project root. Replace `{{GITHUB_USERNAME}}` and `{{REPO_NAME}}` in manifests/workflows. Setup GitHub workflows. Merge `.gitignore`. | App templates (`templates/`) |
| `overlay` | Copy `template/` subdirectory contents preserving directory structure. Handle file conflicts (e.g., CLAUDE.md merge). Safe to re-run. | AI templates (`ai-templates/`), doc templates (`doc-templates/`), rules templates (`rules-templates/`) |

Future `install_type` values (e.g., `stack` for UIS stack templates) will be added when UIS templates are implemented.

### `params` Format

Optional. Only needed for templates that require developer input before `dev-template configure`.

```yaml
params:
  app_name: ""              # Required — your app name (used in database user, service name)
  database_name: ""         # Required — database to create in PostgreSQL
  auth_provider: ""         # Optional — authentik, or leave empty for no auth
```

Rules:
- Keys are simple identifiers (lowercase, underscores)
- Values are strings — empty string means "required, must be filled in"
- Referenced elsewhere in the file as `{{ params.key_name }}`
- DCT validates that all empty params are filled before running configure
- **Two input paths (3MSG):** edit YAML for interactive use, `--param key=value` CLI args for CI/CD
- **Substitution scope (11UIS):** DCT substitutes all `{{ params.* }}` references in both `template-info.yaml` fields and init files before passing anything to UIS. UIS receives fully resolved data — no template syntax.

### `requires` Format

Optional. Only needed for templates that depend on UIS services.

```yaml
requires:
  - service: postgresql                    # Must match a UIS service ID (configurable: true)
    config:
      database: "{{ params.database_name }}"
      init: "config/init-database.sql"     # Optional — data file applied by UIS

  - service: authentik
    config:
      provider: "{{ params.app_name }}"
      init: "config/authentik-setup.yaml"
```

Rules:
- `service` must be a UIS service ID from `services.json` with `configurable: true` (see 9UIS)
- `config` fields are service-specific — passed to `uis configure` as arguments
- `init` references a data file relative to the template directory — piped to UIS via `uis-bridge`
- `{{ params.* }}` references are substituted by DCT before calling UIS
- Init files must use the **native format** of the target service (10UIS) — standard SQL for PostgreSQL, Authentik blueprint YAML for Authentik, Grafana dashboard export JSON for Grafana, etc. UIS passes them directly to the service's own tooling with no translation.

### `provides` Format

Optional. Only for UIS stack templates that deploy services. Supports stack references (26MSG) and per-service config (28MSG):

```yaml
provides:
  stacks:
    - observability                    # deploy only — expands from stacks.json
  services:
    - service: postgresql              # deploy + configure
      config:
        database: "redcross_db"
        init: "config/init-database.sql"
    - service: redis                   # deploy only — no config needed
    - service: authentik               # deploy + configure
      config:
        init: "config/authentik-blueprint.yaml"
    - service: argocd                  # deploy only
```

Service entries can be either:
- **Plain string** (e.g., `redis`) — deploy only, no post-deploy configuration
- **Object with `service` + `config`** — deploy then configure. Same `config` structure as `requires` (service-specific fields + optional `init` file)

Rules:
- Service IDs must match UIS `services.json`
- Stack IDs must match UIS `stacks.json`
- `config` fields mirror the `requires` format — same keys, same `init` file handling (28MSG)
- Init files use native service formats (10UIS) and are applied by `uis configure`
- UIS resolves stacks at deploy time — sorts all services by `priority` field and deploys in correct order
- The registry generator expands stacks so the website shows all individual services
- Template authors don't need to think about deploy ordering — it's automatic
- Used for dependency mapping on the website and in the installer

### Complete Examples

**Simple app template (no services):**

```yaml
# templates/python-basic-webserver/template-info.yaml

id: python-basic-webserver
version: "1.0.0"
name: Python Basic Webserver
description: Minimal Flask server with health endpoint and Docker support
category: BASIC_WEB_SERVER
install_type: app
abstract: >
  Provides a minimal starting point for developers who want to
  build a Python web server using Flask.
tools: dev-python
readme: README-python-basic-webserver.md
tags:
  - python
  - flask
  - webserver
  - api
  - rest
logo: python-basic-webserver-logo.svg
website: ""
docs: https://github.com/helpers-no/dev-templates/tree/main/templates/python-basic-webserver
summary: >
  A minimal Python web server using Flask with a health check endpoint,
  Docker containerization, Kubernetes deployment manifests, and GitHub
  Actions CI/CD workflow. Ideal for microservices and API backends.
related:
  - php-basic-webserver
  - typescript-basic-webserver
```

**AI workflow template (overlay, no services):**

```yaml
# ai-templates/plan-based-workflow/template-info.yaml

id: plan-based-workflow
version: "1.0.0"
name: Plan-Based AI Workflow
description: Structured AI development with plans, phases, and validation
category: WORKFLOW
install_type: overlay
abstract: >
  Provides a complete AI-assisted development workflow with investigation
  plans, phased implementation, and human-in-the-loop validation.
  Includes CLAUDE.md, plan templates, and git safety rules.
tools: ""
readme: README-plan-based-workflow.md
tags:
  - ai
  - workflow
  - planning
  - claude
  - devcontainer
logo: plan-based-workflow-logo.svg
website: ""
docs: https://github.com/helpers-no/dev-templates/tree/main/ai-templates/plan-based-workflow
summary: >
  A structured AI development workflow that guides AI coding assistants
  through investigation, planning, and phased implementation. Includes
  CLAUDE.md, 6 portable docs, plan templates, and git safety rules.
  Designed for human-in-the-loop collaboration.
related: []
```

**App template with service dependencies (future):**

```yaml
# templates/nextjs-volunteer-app/template-info.yaml

id: nextjs-volunteer-app
version: "1.0.0"
name: Next.js Volunteer App
description: Next.js app with PostgreSQL database and Authentik SSO
category: WEB_APP
install_type: app
abstract: >
  A full-stack Next.js application pre-wired to PostgreSQL for data
  storage and Authentik for authentication. Includes Prisma ORM setup,
  migration scaffold, and OAuth configuration.
tools: dev-typescript
readme: README-nextjs-volunteer-app.md
tags:
  - typescript
  - nextjs
  - react
  - postgresql
  - authentik
  - fullstack
logo: nextjs-volunteer-app-logo.svg
website: ""
docs: https://github.com/helpers-no/dev-templates/tree/main/templates/nextjs-volunteer-app
summary: >
  A full-stack Next.js application with PostgreSQL database via Prisma ORM,
  Authentik SSO integration, Docker containerization, and Kubernetes
  deployment manifests. Run dev-template configure to create the database
  and wire up authentication.
related:
  - typescript-basic-webserver
params:
  app_name: ""
  database_name: ""
  auth_provider: ""
requires:
  - service: postgresql
    config:
      database: "{{ params.database_name }}"
      init: "config/init-database.sql"
  - service: authentik
    config:
      provider: "{{ params.app_name }}"
      init: "config/authentik-setup.yaml"
```

**Template folder structure with init files:**

```
templates/nextjs-volunteer-app/
├── template-info.yaml
├── README-nextjs-volunteer-app.md
├── config/                          # Init files — data only, applied by UIS
│   ├── init-database.sql            # PostgreSQL schema + seed data
│   └── authentik-setup.yaml         # Authentik OAuth app + users/groups
├── src/                             # App source code
├── manifests/                       # K8s deployment manifests
├── .github/workflows/               # CI/CD
└── Dockerfile
```

**Example init file — `config/init-database.sql`:**

```sql
-- Init file for nextjs-volunteer-app
-- Applied by: uis configure postgresql --init-file -
-- Creates tables and seed data in the app's database

CREATE TABLE IF NOT EXISTS volunteers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    volunteer_id INTEGER REFERENCES volunteers(id),
    role VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    start_date DATE,
    end_date DATE
);

CREATE INDEX IF NOT EXISTS idx_volunteers_email ON volunteers(email);
CREATE INDEX IF NOT EXISTS idx_assignments_volunteer ON assignments(volunteer_id);

-- Seed data for development
INSERT INTO volunteers (name, email, status) VALUES
    ('Test User', 'test@example.com', 'active')
ON CONFLICT (email) DO NOTHING;
```

**Example init file — `config/authentik-setup.yaml`:**

```yaml
# Init file for nextjs-volunteer-app
# Applied by: uis configure authentik --init-file -
# Uses native Authentik blueprint format — see https://docs.goauthentik.io/docs/blueprints/
# yaml-language-server: $schema=https://goauthentik.io/blueprints/schema.json
version: 1
metadata:
  name: "Volunteer App Test Users"
  labels:
    blueprints.goauthentik.io/instantiate: "true"

entries:
  # Groups
  - model: authentik_core.group
    state: present
    identifiers:
      name: "volunteers"
    attrs:
      name: "volunteers"
      is_superuser: false

  - model: authentik_core.group
    state: present
    identifiers:
      name: "coordinators"
    attrs:
      name: "coordinators"
      is_superuser: false

  # Test users (3 of 11 — see full set in UIS manifests/073-authentik-1-test-users-groups-blueprint.yaml)
  - model: authentik_core.user
    state: present
    identifiers:
      username: "ok1"
    attrs:
      username: "ok1"
      name: "Ola Nordmann"
      email: "ok1@urbalurba.no"
      password: "Password123"
      is_active: true
      attributes:
        department: "Økonomi og administrasjon"
        title: "Økonomi- og administrasjonsmedarbeider"
      groups:
        - !Find [authentik_core.group, [name, "coordinators"]]

  - model: authentik_core.user
    state: present
    identifiers:
      username: "it1"
    attrs:
      username: "it1"
      name: "Erik Larsen"
      email: "it1@urbalurba.no"
      password: "Password123"
      is_active: true
      attributes:
        department: "IT"
        title: "IT Specialist"
      groups:
        - !Find [authentik_core.group, [name, "coordinators"]]

  - model: authentik_core.user
    state: present
    identifiers:
      username: "dist1"
    attrs:
      username: "dist1"
      name: "Bjørn Nilsen"
      email: "dist1@urbalurba.no"
      password: "Password123"
      is_active: true
      attributes:
        department: "Distriktskontor"
        title: "Distriktsmedarbeider"
      groups:
        - !Find [authentik_core.group, [name, "volunteers"]]
```

Note: init files are **data only** and must use the **native format** of the target service (10UIS). UIS passes them directly to the service's own tooling — no translation layer. PostgreSQL gets standard SQL (`psql -f`), Authentik gets native blueprint YAML (applied via blueprint API). Template authors should refer to the upstream format documentation for each service. See the [Init Files](#init-files-templates-reference-data-files-for-service-configuration) section and 7UIS for details.

**UIS stack template (future):**

```yaml
# uis-stack-templates/red-cross-infrastructure/template-info.yaml

id: red-cross-infrastructure
version: "1.0.0"
name: Red Cross Volunteer Platform Infrastructure
description: Complete infrastructure stack for a volunteer management platform
category: ORGANISATION_STACK
install_type: stack
abstract: >
  Deploys and configures a complete infrastructure stack for the Red Cross
  volunteer management platform, including database, authentication,
  networking, and monitoring.
tools: ""
readme: README-red-cross-infrastructure.md
tags:
  - infrastructure
  - stack
  - postgresql
  - authentik
  - monitoring
  - organisation
logo: red-cross-infrastructure-logo.svg
website: ""
docs: https://github.com/helpers-no/dev-templates/tree/main/uis-stack-templates/red-cross-infrastructure
summary: >
  Deploys PostgreSQL, Authentik, Tailscale, Grafana, and Prometheus as a
  complete platform stack via UIS Ansible playbooks. Includes init files
  for database schema, SSO provider configuration, and monitoring dashboards.
related: []
provides:
  stacks:
    - observability         # prometheus, tempo, loki, otel-collector, grafana
  services:
    - service: postgresql
      config:
        database: "redcross_db"
        init: "config/init-database.sql"
    - service: authentik
      config:
        init: "config/authentik-blueprint.yaml"
    - service: tailscale    # deploy only
    - service: argocd       # deploy only
```

### Migration from `TEMPLATE_INFO`

Direct field mapping — no fields lost, four fields added:

| `TEMPLATE_INFO` (bash) | `template-info.yaml` (YAML) | Notes |
|-------------------------|-----------------------------|-------|
| `TEMPLATE_ID` | `id` | Same |
| `TEMPLATE_VER` | `version` | Must be quoted: `"1.0.0"` |
| `TEMPLATE_NAME` | `name` | Same |
| `TEMPLATE_DESCRIPTION` | `description` | Same |
| `TEMPLATE_CATEGORY` | `category` | Same |
| *(none)* | `install_type` | **New.** `app` for current app templates, `overlay` for current AI templates |
| `TEMPLATE_ABSTRACT` | `abstract` | Same (use `>` for multi-line) |
| `TEMPLATE_TOOLS` | `tools` | Same |
| `TEMPLATE_README` | `readme` | Same |
| `TEMPLATE_TAGS` | `tags` | Changed from space-separated string to YAML list |
| `TEMPLATE_LOGO` | `logo` | Same |
| `TEMPLATE_WEBSITE` | `website` | Same |
| `TEMPLATE_DOCS` | `docs` | Same |
| `TEMPLATE_SUMMARY` | `summary` | Same (use `>` for multi-line) |
| `TEMPLATE_RELATED` | `related` | Changed from space-separated string to YAML list |
| *(none)* | `params` | **New.** Only for templates needing developer input |
| *(none)* | `requires` | **New.** Only for templates needing UIS services |
| *(none)* | `provides` | **New.** Only for UIS stack templates |

---

## Decisions Made

1. ~~One command or multiple?~~ — **Two commands** (`dev-template` in DCT, `uis template` in UIS) but **one unified repo and registry**
2. ~~Folder structure?~~ — **Multiple folders** with `template-categories.yaml` per folder, categories scoped per folder
3. ~~Installation behaviour?~~ — **No executable scripts in templates** (security). `install_type` in `template-info.yaml` tells the trusted installer how to copy. `dev-template configure` reads YAML and performs setup using trusted DCT/UIS code.
4. ~~Category management?~~ — **Per-folder** via `template-categories.yaml`, no central categories file
5. ~~Data format?~~ — **JSON** (`template-registry.json`) generated from `template-categories.yaml` + `template-info.yaml`
6. ~~Registry location?~~ — **`website/src/data/template-registry.json`** serves both Docusaurus and installer scripts
7. ~~How installers get data?~~ — **`curl` the registry** before any git operations, browse menu from JSON, sparse-checkout only the picked template
8. ~~Docusaurus structure?~~ — **Three levels**: context (dct/uis) → category → template
9. ~~Security?~~ — **Templates are data only**. No `post-install.sh`. All executable logic in trusted DCT/UIS code. Template authors declare what's needed, platform maintainers implement the how.
10. ~~DCT → K8s connection?~~ — **Always through UIS**: `DCT → uis-bridge → UIS → kubectl → K8s`. Works for both local and remote clusters.
11. ~~Stack deployment engine?~~ — **Ansible** (existing `uis deploy` playbooks). ArgoCD GitOps for infrastructure is out of scope — separate future project if needed.
12. ~~`template-info.yaml` persistence?~~ — **Always copied to project root** by the installer, regardless of `install_type`. Needed by `dev-template configure` in Phase B.
13. ~~Init file error handling?~~ — **Structured JSON errors** from UIS (`{"status": "error", "phase": "init_file", ...}`), pre-validation where practical (SQL `ON_ERROR_STOP`, YAML lint), DCT wraps with context (file name, service, actionable message). `dev-template configure` is idempotent — re-run skips succeeded, retries failed.

## Next Steps

Aligned with DCT's Phase A/B split (4MSG). Dependency chain: TMP Phase 1 → DCT Phase A → UIS commands → DCT Phase B.

### TMP Phase 1 — Registry and metadata (no dependencies)
- [x] Define `template-categories.yaml` format in detail — see Final Specification section
- [x] Define `template-info.yaml` final field list (18 fields including `install_type`, `requires`, `provides`, `params`) — see Final Specification section
- [ ] Create `template-categories.yaml` for `templates/` and `ai-templates/`
- [ ] Create `template-info.yaml` for all existing templates
- [ ] Create TypeScript generation script → `template-registry.json`
- [ ] Update CI pipeline to run generation
- [ ] Update Docusaurus components to use `template-registry.json`
- [ ] Create PLAN for TMP Phase 1

### DCT Phase A — Merge scripts, registry browsing (depends on: TMP Phase 1)
- [ ] Merge `dev-template.sh` + `dev-template-ai.sh` into one command
- [ ] Switch to registry-based browsing (`curl` + `jq`)
- [ ] Support `install_type` (app/overlay)
- [ ] Create PLAN for DCT Phase A

### UIS — New commands (independent, can start anytime)
- [ ] UIS maintainer creates `uis configure` command (start with PostgreSQL)
- [ ] UIS maintainer creates `uis expose` command (port-forward + persistent NodePort)
- [ ] UIS adds `configurable: true/false` field to `services.json` (needed for TMP validation)
- [ ] UIS adds `exposePort` field to `services.json` for fixed port mappings
- [ ] Create PLAN for UIS commands

### DCT Phase B — Service integration (depends on: UIS commands ready)
- [ ] DCT maintainer creates Docker CLI install script
- [ ] DCT creates `uis-bridge.sh` library (2MSG)
- [ ] DCT creates `dev-template configure` command
- [ ] Support `requires` handling, `params` (interactive + CLI args per 3MSG)
- [ ] Create PLAN for DCT Phase B

### Future
- [ ] `uis template` command in UIS repo for infrastructure templates
- [ ] TMP validation checks `requires` against UIS `services.json` (only `configurable` services)
