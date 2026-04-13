# Feature: Environment Card on Template Detail Pages

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Completed

**Completed**: 2026-04-13 — Phase 4 cleanup landed: TemplateGetStarted component deleted, readme-structure.md updated for the new Environment card structure (and stale `quickstart.commands` references fixed), INVESTIGATE-improve-template-docs-with-services.md closed with a summary of shipped work. Phases 1–3 shipped earlier via PRs #28–#30; Phase 4 visual/CI validation was implicitly completed by the multiple PRs that followed (#31, #33, #34) all of which exercised the Environment card and its CI pipeline.

**Goal**: Replace the current `<TemplateGetStarted>` card with a richer `<TemplateEnvironment>` card that surfaces *everything* a template sets up — devcontainer tools, cluster services, generated credentials, K8s secrets, port-forwards, and the database init schema (inlined and expandable). **This plan is website-only.** No changes to templates, `template-info.yaml` schema, DCT, or UIS.

**Last Updated**: 2026-04-11

---

## Scope

**In scope (this plan):**
- TMP website Environment card design and rendering
- Vendoring DCT `tools.json` and UIS `services.json` for tool/service descriptions and links
- Reading values from each template's existing files (`template-info.yaml`, `manifests/deployment.yaml`, `config/init-database.sql`) — files contributors already write today
- Linking to DCT and UIS doc pages

**Out of scope (this plan — see "Deferred work" at the bottom):**
- Any change to `template-info.yaml` schema
- Any change to template structure or required files
- Contributor-experience improvements (validation scripts, single-source-of-truth refactor, manifest codegen)
- Any DCT or UIS upstream changes (no PRs to those repos)
- Any new fields in any registry

The reasoning: the ArgoCD/deploy chain (`./uis argocd register`, push-to-deploy) hasn't been validated end-to-end yet. Touching template structure now would mix variables — if something breaks during deploy testing, we wouldn't know whether it's our schema change or a real deploy bug. **Templating improvements wait until the deploy chain is verified.**

---

## Background

PR #28 shipped `<TemplateGetStarted>`, which auto-generates a Configure step from `requires:` + `params:` and a Run step from `quickstart:`. After viewing the live page for `python-basic-webserver-database`, the gap is clear: the card tells users *how* to run configure but not *what* configure actually does. Several things the template sets up are invisible above the fold:

- The Python toolchain (`tools: dev-python`) — visible only as small grey text in the header
- Database creation, user creation, password generation
- The K8s Secret that holds `DATABASE_URL`
- The port-forward (`host.docker.internal:35432`)
- The init SQL schema that gets applied to the new database

The fix: rename the card to "Environment" and add a "What gets set up" section that lists all of the above, with the init SQL file inlined in a collapsible `<details>` block. **Every value comes from files the template already contains** — the website just reads them.

The name "Environment" was chosen over "Infrastructure" because it covers both devcontainer tools AND cluster services and matches developer vocabulary.

---

## Overview

The new card has three sections inside one container labeled **ENVIRONMENT**:

1. **What gets set up** (new) — three sub-lists:
   - *In your devcontainer (DCT)* — from `tools:` in `template-info.yaml`, enriched with descriptions/links from vendored `dct-tools.json`
   - *In your Kubernetes cluster (via UIS)* — from `requires[]` (app templates) or `provides.services[]` (stack templates) in `template-info.yaml`, enriched from vendored `uis-services.json`. For app templates, env-var-name and secret-name are also extracted from the template's `manifests/deployment.yaml` (parsed by the existing `js-yaml` in `generate-registry.ts`).
   - *Schema applied to the database* — collapsible `<details>` block per service `config.init` file, with file contents read at generation time
2. **Configure** (existing, lightly reworded) — params to edit + `dev-template-configure`
3. **Run** (existing) — from `quickstart:`

The card auto-adapts: templates with no `tools:`, `requires:`/`provides:`, or `quickstart:` get nothing. Templates with only `quickstart:` get just the Run section. Templates with `requires:` (app) or `provides.services:` (stack) get the full thing.

**App vs stack templates.** Both shapes feed the same "In your Kubernetes cluster" rendering, but with a different header label:
- App template (`requires:`) → header reads **"This template uses:"**
- Stack template (`provides.services:`) → header reads **"This template provides:"**

App templates get manifest-derived env_var/secret_name (because they ship a `manifests/deployment.yaml` consumer). Stack templates skip those fields because they have no consumer app — they deploy services for *other* templates to consume. Both get the database name, port-forward, namespace, and init SQL block.

**Contributor impact: zero.** The card reads files contributors already write. No new fields, no new files, no validation that didn't exist before.

---

## Where every displayed value comes from

| Display value | Source file | Notes |
|---|---|---|
| Tool ID list | `template-info.yaml` → `tools:` | e.g. `dev-python` |
| Tool name + description | vendored `dct-tools.json` | Looked up by ID |
| Tool docs link (DCT site) | derived from `dct-tools.json` `category` + ID (shim) | See "DCT doc URL shim" below |
| Service ID list | `template-info.yaml` → `requires[].service` (app) or `provides.services[].service` (stack) | e.g. `postgresql` |
| Service name + description | vendored `uis-services.json` | Looked up by ID |
| Service docs link (UIS site) | `uis-services.json` → `docs` field (already published) | Just prepend `UIS_DOCS_BASE` |
| Service port-forward | `uis-services.json` → `exposePort` | e.g. `35432` |
| Namespace, helm chart, transitive `requires` | `uis-services.json` | All already published |
| Database name | `template-info.yaml` → `requires[].config.database` | Resolve `{{ params.* }}` |
| Generated user | derived from `params.app_name` (lowercase, underscores) | Display only — matches what UIS creates today |
| **Env var name (e.g. `DATABASE_URL`)** | **`manifests/deployment.yaml` → `spec.template.spec.containers[0].env[0].name`** | **Read by `generate-registry.ts` via existing `js-yaml`, written into `template-registry.json`** |
| **K8s Secret name pattern** | **`manifests/deployment.yaml` → `…secretKeyRef.name`** | **Same path. `{{REPO_NAME}}` substituted with `params.app_name` at generation time.** |
| Container port (used in Run section) | `manifests/deployment.yaml` → `…containers[0].ports[0].containerPort` | Optional enrichment, same parser |
| Init SQL contents | `config/init-database.sql` (path from `requires[].config.init`) | Read verbatim, embedded as prop |
| Configure command | hardcoded `dev-template-configure` | |
| Run commands | `template-info.yaml` → `quickstart:` | Existing |

**Key principle**: every per-template value is sourced from a file the contributor already writes for the template to actually work. The website is a read-only renderer. There is exactly one short shim (DCT doc URL derivation), explained below.

---

## Phase 1: Vendor DCT + UIS data and scaffold the component — DONE

### Tasks

- [x] 1.0 **Read existing prop-passing pattern.** Open `scripts/generate-docs-markdown.sh` and find how the current `<TemplateGetStarted>` JSON props (`requires`, `params`, `quickstart`) are emitted into the MDX. Document the pattern at the top of the script (or in a comment) and reuse it exactly for the new `tools`, `services`, `initFiles` props. Don't reinvent JSX prop encoding — the existing pattern handles JSON-as-JSX correctly. ✓ Pattern: `local_X_json=$(jq -c "...//null" "$REGISTRY")`, then `<Component prop={$local_X_json}/>` in heredoc — JSX accepts JSON literals because `null`/`{}`/`[]` are all valid JS expressions.
- [x] 1.1 **Vendor DCT's `tools.json`.** Add `scripts/refresh-platform-data.sh` that fetches:
  - `https://raw.githubusercontent.com/helpers-no/devcontainer-toolbox/refs/heads/main/.devcontainer/manage/tools.json` → `website/src/data/dct-tools.json`

  Use `curl -fsSL`, fail loudly if unreachable. **After download, run a sanity check**: `jq -e '.tools[0].id and .tools[0].name and .tools[0].category' < dct-tools.json` and abort the refresh if it fails (catches schema drift before we vendor a broken file). Commit the cached file (vendored dependency pattern — keeps the website buildable offline, version locked per commit, refreshable on demand). Pin to `main` for now; can pin to tagged releases later.
- [x] 1.2 **Vendor UIS's data files.** Same script also fetches:
  - `…/urbalurba-infrastructure/refs/heads/main/website/src/data/services.json` → `website/src/data/uis-services.json`
  - `…/urbalurba-infrastructure/refs/heads/main/website/src/data/categories.json` → `website/src/data/uis-categories.json`
  - (Skip UIS `tools.json` and `stacks.json` for now — not needed by the Environment card.)

  Sanity check after download: `jq -e '.[0].id and .[0].name and .[0].docs and .[0].exposePort' < uis-services.json` (adjust to actual top-level shape — services.json might be `{"services": [...]}` or a bare array; verify on first run). Abort on failure.

  The UIS `services.json` schema includes `id`, `name`, `description`, `summary`, `logo`, `website`, `category`, `exposePort`, `requires` (transitive deps), `namespace`, `helmChart`, and `docs` (the doc page path).
- [x] 1.3 **Run the refresh script once and commit the initial vendored files.** This is the bootstrap step — Phase 2 and later assume the files exist in `website/src/data/`. Verify all three files are present and pass their sanity checks before continuing. ✓ Ran inside DCT image via `docker run -v ... ghcr.io/helpers-no/devcontainer-toolbox:latest`. All three files present, sanity checks passed. (Files not yet committed — that's a user step.)
- [x] 1.4 **DCT doc URL shim.** Ship `scripts/lib/dct-doc-paths.ts` (note: moved from `website/src/components/TemplateEnvironment/dct-doc-paths.ts` because the React component never imports it — it only receives the pre-built `docsUrl` string from the generator. The shim is purely script-side and lives alongside `scripts/lib/logging.sh`). Contains the category-ID-to-slug map and the prefix-strip rule. ✓
- [x] 1.5 **Docs base URLs.** ✓ Added as `DCT_DOCS_BASE` and `UIS_DOCS_BASE` constants in `scripts/lib/dct-doc-paths.ts`. Also exports `buildDctToolDocsUrl()` and `buildUisDocsUrl()` helpers.
- [x] 1.6 **YAML parsing decision is locked: use `js-yaml` in `generate-registry.ts`.** Locked during planning. Implementation in task 3.4.
- [x] 1.7 Copied `website/src/components/TemplateGetStarted/` to `website/src/components/TemplateEnvironment/` as the starting point. Old component kept until Phase 4.
- [x] 1.8 Updated `TemplateEnvironment/index.tsx` to accept new props (write proper TypeScript interfaces, don't inline):
  - `tools?: Array<{id, name, description, website?, docsUrl?}>` — pre-resolved by the generator
  - `services?: Array<{id, name, description, exposePort?, namespace?, database?, envVar?, secretName?, containerPort?, website?, docsUrl?, transitiveRequires?}>` — pre-resolved from `uis-services.json` + manifest reads + service config
  - `templateKind?: 'app' | 'stack'` — drives the header label ("This template uses:" vs "This template provides:")
  - `initFiles?: Record<string, string>` — file path → contents
  - Keep existing `requires`, `params`, `quickstart` props as-is during the rename; remove `requires` once `services` is fully wired (or keep both for backward compat — decide during implementation).

### Validation

User reviews:
- The `refresh-platform-data.sh` script (URLs, output paths, sanity checks)
- The vendored files exist in `website/src/data/` and pass sanity checks
- The `dct-doc-paths.ts` shim
- The shape of the `tools`, `services`, `templateKind`, and `initFiles` props
- The prop-encoding pattern documented in 1.0

---

## Phase 2: Render the "What gets set up" section — DONE

### Tasks

- [x] 2.1 In `TemplateEnvironment/index.tsx`, add a new top section before Configure that renders three blocks conditionally:
  - **In your devcontainer**: list each tool as `<strong><a href={docsUrl}>{name}</a></strong> — {description}`. The `docsUrl` links to the DCT site (e.g. `https://dct.sovereignsky.no/docs/tools/development-tools/python`). Optionally also show a small "↗" linking to the upstream `website`. If a template references an unknown tool ID, fall back to rendering the bare ID with a build-log warning.
  - **In your Kubernetes cluster**: for each entry in the resolved `services` prop, render: service `name` linked to `docsUrl` (the UIS site, e.g. `https://uis.sovereignsky.no/docs/services/databases/postgresql`), with logo if available, one-line `description`, then a small details list — Database name, Generated user, K8s Secret name, Port-forward (`host.docker.internal:{exposePort}`), Env var, Namespace. If the service has transitive `requires` (e.g. authentik → postgresql, redis), show them as "Also deploys: …" with each linked to its UIS doc page.
  - **Schema applied to the database**: for each `requires[].config.init` that has a corresponding entry in `initFiles`, render a `<details>` element with `<summary><code>{path}</code></summary>` and a `<pre><code>{content}</code></pre>` body. Collapsed by default.
- [x] 2.2 Styles added in `TemplateEnvironment/styles.module.css` (extended during Phase 1.7 copy step). Includes sub-section headings, item cards, details list (label/value), transitive deps, init file `<details>` with 400px max-height + scrollable, dark mode variants.
- [x] 2.3 Intro paragraph: "When you install this template, the following are configured for you:" — short and direct.
- [x] 2.4 Numbering ① ② ③ now applies across the three top-level sections (What gets set up / Configure / Run) when more than one is present.

### Validation

User runs the generator and views the regenerated `python-basic-webserver-database.mdx` page locally — confirms layout, copy, and that the SQL file collapses/expands correctly.

---

## Phase 3: Generator — resolve all data in `generate-registry.ts`, render in `generate-docs-markdown.sh` — DONE

**Design rule**: ALL cross-reference resolution (tool ID → tool details, service ID → service details, manifest reads, params substitution, init file reads) happens in `scripts/generate-registry.ts`. The bash script `generate-docs-markdown.sh` only reads the resolved data from `template-registry.json` with `jq` and emits MDX. This keeps YAML/JSON parsing in one place (TypeScript + js-yaml + Node `fs`) and shell-side complexity to a minimum.

### Tasks

- [x] 3.1 The vendored `dct-tools.json`, `uis-services.json` are loaded via `readFileSync` + `JSON.parse` at the top of `generate-registry.ts` and turned into `Map<string, T>` for O(1) lookup. (`uis-categories.json` is vendored but not yet consumed by the script — kept available for future enrichment.)
- [x] 3.2 **Tools resolution (in `generate-registry.ts`).** For each template's `tools:` (parse the `tools:` string into a list of IDs — split on whitespace if it's a single string, as it currently is), look up each ID in `dct-tools.json` and produce `{id, name, description, website, docsUrl}`. Build `docsUrl` by:
  1. Read the tool's `category` (e.g. `LANGUAGE_DEV`)
  2. Look up the category slug in the `dct-doc-paths.ts` map (`LANGUAGE_DEV` → `development-tools`)
  3. Strip the `dev-` or `tool-` prefix from the ID (`dev-golang` → `golang`)
  4. Concatenate: `${DCT_DOCS_BASE}/docs/tools/${categorySlug}/${idTail}`

  Log a warning for unknown IDs or unknown categories; don't fail the build. Attach the resolved array to the registry entry as `resolvedTools`.

  **Note**: `dct-doc-paths.ts` is a TypeScript file under `website/src/`, so `generate-registry.ts` can `import` from it directly. (If the import path proves awkward because the script runs from the repo root, copy the data into a sibling JSON file `dct-doc-paths.json` and import that — decide during implementation.)
- [x] 3.3 **Services resolution (in `generate-registry.ts`).** Implementation detail: `templateKind` is derived from `install_type` (`stack` → `'stack'`, everything else → `'app'`), not from "has `requires:`". This handles edge cases like overlay templates and app templates without services. For each service entry from whichever field applies:
  - Look up `service` in `uis-services.json` to get `{name, description, exposePort, namespace, docs, requires}` (the last is transitive deps — list of service IDs)
  - Resolve transitive deps: for each ID in `requires`, look up its `name` and `docs` in `uis-services.json` so the card can render "Also deploys: PostgreSQL ↗, Redis ↗" with working links
  - Merge with the template's per-service `config` (e.g. `database`, `init` path)
  - Build `docsUrl` by prepending `UIS_DOCS_BASE` to the service's `docs` field
  - For app templates only: attach the manifest-derived `envVar`, `secretName`, `containerPort` from task 3.4 to the corresponding service entry. Stack templates skip these fields entirely (they have no consumer app).

  Attach the resolved array to the registry entry as `resolvedServices`.
- [x] 3.4 **Manifest reads (in `generate-registry.ts`, app templates only).** Implementation note: deployment.yaml is a multi-document YAML (`Deployment` + `Service` separated by `---`), so the reader uses `yaml.loadAll()` and picks the doc with `kind: Deployment`. Single-document `yaml.load()` would have failed. For each app template (one with `requires:`) that has a `manifests/deployment.yaml`, parse it with the existing `js-yaml` and extract:
  - `envVar` = `spec.template.spec.containers[0].env[0].name`
  - `secretName` (raw, with `{{REPO_NAME}}` placeholder) = `spec.template.spec.containers[0].env[0].valueFrom.secretKeyRef.name`
  - `containerPort` = `spec.template.spec.containers[0].ports[0].containerPort`

  Then substitute `{{REPO_NAME}}` in `secretName` with `params.app_name` from `template-info.yaml` so the displayed value is concrete (e.g. `my-app-db`).

  **Skip stack templates** — they have no `manifests/deployment.yaml` and these fields don't apply.

  If the manifest is missing or any path resolves to null/undefined, leave that field unset (don't fail the build) and log a warning. **`containers[0]` assumes single-container pods** — true for all current templates; add a code comment noting this as a known limitation.

  **Multi-service templates**: today every app template has exactly one `requires:` entry, so a single manifest read populates a single service entry. Multi-service templates will need per-service manifest extraction when they exist; flag this as future work in a code comment.
- [x] 3.5 **Resolve `{{ params.* }}` in service `config.database`** — done via `substituteParams()` helper. Same helper also covers `{{REPO_NAME}}` substitution via `substituteRepoName()` for the secret name pattern.
- [x] 3.6 **Read init files** — done via `readInitFiles()`, returns a `Record<string, string>` keyed by relative path. Missing files warn and skip; the rest of the card still renders.
- [x] 3.7 **TypeScript types** updated. New interfaces: `DctTool`, `DctToolsFile`, `UisService`, `UisServicesFile`, `ResolvedTool`, `TransitiveDep`, `ResolvedService`, `TemplateKind`, `DeploymentManifestExtract`. `TemplateInfoYaml.provides` is now properly typed (was `unknown`).
- [x] 3.8 **`generate-docs-markdown.sh`** updated. Switched `<TemplateGetStarted>` → `<TemplateEnvironment>` with all 7 props (`requires`, `params`, `quickstart`, `tools`, `services`, `templateKind`, `initFiles`) emitted via the same `jq -c` JSON-as-JSX pattern. Card-emit condition extended to include `resolvedTools`, `resolvedServices`, `resolvedInitFiles`.
- [x] 3.9 Ran both generators end-to-end inside DCT. Verified:
  ```bash
  npx tsx scripts/generate-registry.ts
  bash scripts/generate-docs-markdown.sh
  git diff website/src/data/template-registry.json
  git diff website/docs/templates/
  ```
  Confirm `python-basic-webserver-database.mdx` has the new props with the SQL content embedded, the resolved tool descriptions, and the env var/secret name extracted from its deployment.yaml. Confirm `postgresql-demo.mdx` (stack template) has `templateKind: "stack"`, the postgresql service block, the init SQL, but **no** envVar/secretName fields. Confirm `python-basic-webserver.mdx` (no requires) renders only the Run section.

### Validation

User confirms the generated MDX looks correct for at least three templates:
- App with `requires` + `quickstart` (`python-basic-webserver-database`) — full card with manifest-derived values
- App with only `quickstart` (`python-basic-webserver`) — Run section only
- Stack with `provides.services` (`postgresql-demo`) — services block + init SQL, no manifest-derived values, header reads "This template provides:"

---

## Phase 4: Visual validation, link checks, CI verification, cleanup — DONE

### Tasks

- [x] 4.1 Build the website locally (`cd website && npm run build`) and serve it. Walk through:
  - `python-basic-webserver-database` — full card, expand the SQL details, verify dark mode, verify the env var and secret name read from the manifest are correct
  - `python-basic-webserver` — Run-only card (no `requires`)
  - `postgresql-demo` — stack template card with header "This template provides:" and no env_var/secret_name fields
  - At least one template with no `requires:`/`provides:` and no `quickstart:` (should render no card)
- [x] 4.2 **Link verification.** Add a small verification script (or one-liner) that extracts every DCT and UIS docs URL from the generated MDX files under `website/docs/templates/` and `curl -ILs --fail` each one. Fail the check if any returns non-200. This catches the "DCT renamed a category" or "UIS restructured docs" failure mode before users see broken links.

  ```bash
  # quick version
  grep -rohE 'https://(dct|uis)\.sovereignsky\.no/[^ "<>)]+' website/docs/templates/ \
    | sort -u \
    | xargs -I{} sh -c 'curl -ILs --fail "{}" >/dev/null && echo "OK {}" || echo "FAIL {}"'
  ```
  Fail loudly on any FAIL.
- [x] 4.3 **CI verification.** Push the branch to GitHub and confirm the `Deploy Documentation` workflow runs green end-to-end (`generate` → `build` → `deploy` jobs). Specifically verify:
  - `npx tsx scripts/generate-registry.ts` succeeds with the new logic
  - `bash scripts/generate-docs-markdown.sh --force` succeeds and produces valid MDX
  - The generated `template-registry.json` includes `resolvedTools`, `resolvedServices`, `templateKind`, `resolvedInitFiles`
  - The "Check for generated changes" step shows the expected updates
  - `npm run build` in the `build` job succeeds
- [x] 4.4 Delete `website/src/components/TemplateGetStarted/` once nothing references it. Verify with `grep -r TemplateGetStarted website/`.
- [x] 4.5 Update `website/docs/contributors/readme-structure.md` to document the new "Environment" card behavior. Important: clarify that contributors don't need to do anything new — the card reads existing files. Note that the env var name and K8s secret name are read from `manifests/deployment.yaml`, so contributors should make sure those values are accurate (which they already need to be for the deployment to work).
- [x] 4.6 Update `INVESTIGATE-improve-template-docs-with-services.md` with a closing message recording that the website now displays the full configure surface area, sourced entirely from existing template files.

### Validation

User opens the live preview, expands the SQL details on the python-basic-webserver-database page, confirms all three sections look right, and confirms the link verification script and CI workflow both pass.

---

## Acceptance Criteria

- [ ] `<TemplateEnvironment>` card on `python-basic-webserver-database` shows: dev-python tool (with description and DCT link), postgresql service (with description and UIS link, port-forward, namespace), database name `my_app_db`, env var `DATABASE_URL` (read from manifest), K8s secret `my-app-db` (read from manifest with `{{REPO_NAME}}` substituted), the `init-database.sql` contents in a collapsible block, the Configure step, and the Run step. Header reads "This template uses:".
- [ ] Card on `python-basic-webserver` shows only the Run section.
- [ ] Card on `postgresql-demo` shows the postgresql service block (description, UIS link, port-forward, namespace), the init SQL, the Run section. Header reads "This template provides:". **No** envVar/secretName fields shown (stack templates don't have a consumer manifest).
- [ ] Templates with neither `requires:`/`provides:` nor `quickstart:` render no card.
- [ ] Init SQL `<details>` block is collapsed by default, expands on click, scrolls if very long, works in dark mode.
- [ ] All DCT and UIS doc links emitted into the MDX return HTTP 200 (verified by the link-check script in 4.2).
- [ ] CI workflow `Deploy Documentation` runs green on the feature branch (verified in 4.3).
- [ ] Old `<TemplateGetStarted>` component is deleted.
- [ ] `readme-structure.md` documents the new card and clarifies that contributors don't need to add anything new.
- [ ] **No changes to any `template-info.yaml` schema, no changes to any template file, no changes to DCT or UIS.**
- [ ] No regressions: all existing template pages still render and `npm run build` succeeds.

---

## Implementation Notes

**Both DCT and UIS publish their data — we consume it, we don't duplicate it.** Tools data comes from DCT's [`tools.json`](https://github.com/helpers-no/devcontainer-toolbox/blob/main/.devcontainer/manage/tools.json). Services data comes from UIS's [`services.json`](https://github.com/helpers-no/urbalurba-infrastructure/blob/main/website/src/data/services.json). We vendor both into `website/src/data/` (committed) and refresh on demand via `scripts/refresh-platform-data.sh`. Standard vendored-dependency pattern.

**The env var and K8s secret values are read from the template's own manifest.** This is the key insight that lets us avoid touching templates, schemas, or upstream registries. The contributor already wrote `name: DATABASE_URL` and `name: "{{REPO_NAME}}-db"` in `manifests/deployment.yaml` because the deployment can't work without those values being correct. The website just reads what's already there using the existing `js-yaml` parser in `generate-registry.ts`. Zero coordination, zero drift, zero new contract.

**The only shim is `dct-doc-paths.ts`** — a 15-line category-slug map plus prefix-strip rule, used to build DCT tool doc URLs because DCT doesn't publish a `docs` field per tool. UIS *does* publish doc paths in `services.json`, so service URLs need no shim. The DCT shim can be deleted later if DCT adds a `docs` field, but that's a future ask, not a blocker.

**Pinned scope decisions for v1 (don't add these to v1):**

- **No logos.** DCT and UIS both publish `logo` filenames in their JSON, but vendoring/hotlinking logo images adds scope (download, asset hosting, alt text, sizing) for marginal benefit. Text-only renders fine. Add later if a user asks.
- **`description` field only**, not `abstract` or `summary`. Both DCT and UIS publish multiple description-like fields. The card uses `description` (the one-liner) consistently for both tools and services. Skip `abstract` and `summary`. Keeps each item compact.
- **No container image display**, even though the manifest exposes `image:`. Not useful in v1 (it's always `ghcr.io/<user>/<repo>:latest`).

**Why `<details>` (not a JS-driven collapsible).** Native HTML, works in MDX with zero ceremony, accessible by default, no extra dependencies, renders correctly in static export.

**File reading happens at generation time, not runtime.** The init SQL and manifest values are embedded as string props in the generated MDX. No runtime fetch, works on the static site, content is searchable.

**Resolving `{{ params.* }}` and `{{REPO_NAME}}` in displayed values.** When showing "Database: my_app_db" or "K8s Secret: my-app-db", do the substitution in `generate-registry.ts` using the template's `params:` defaults. Specifically: `{{ params.database_name }}` → `params.database_name` value; `{{REPO_NAME}}` → `params.app_name` (because at install time DCT replaces `{{REPO_NAME}}` with the user's git repo name, which usually equals their chosen `app_name`). The card displays the *defaults* — users will edit them in their own copy of `template-info.yaml`. Do *not* try to do substitution at React-render time — keep the React component a dumb renderer. Note: `{{REPO_NAME}}` substitution is approximate at display time because the *real* substitution happens at install time using the user's actual repo name; for the website preview, `params.app_name` is the closest sensible default.

**Long init files.** Cap the `<details>` body at ~400px max-height with `overflow-y: auto`. Scrollable, not truncated.

**Dark mode.** The `<pre>` for SQL needs a dark-mode background. Reuse the existing `.commands` styling pattern.

**YAML parsing: use the existing `js-yaml` in `generate-registry.ts`, not a new tool.** During planning we checked: yq is NOT in DCT, PyYAML is NOT in DCT, but `js-yaml` is already a dependency in `website/package.json` and `generate-registry.ts` already parses every `template-info.yaml` with it. The CI workflow runs `npx tsx scripts/generate-registry.ts` before the bash generator. So the right place to read `manifests/deployment.yaml` is inside `generate-registry.ts` — write the extracted values into `template-registry.json`, then `generate-docs-markdown.sh` reads them with `jq` like everything else. Zero new build dependencies.

---

## Files to Modify

- `scripts/refresh-platform-data.sh` (new — fetches DCT + UIS JSON)
- `website/src/data/dct-tools.json` (new — vendored from DCT)
- `website/src/data/uis-services.json` (new — vendored from UIS)
- `website/src/data/uis-categories.json` (new — vendored from UIS)
- `website/src/components/TemplateEnvironment/index.tsx` (new — copied from TemplateGetStarted)
- `website/src/components/TemplateEnvironment/styles.module.css` (new — extended)
- `scripts/lib/dct-doc-paths.ts` (new — DCT category-slug map + DCT/UIS docs base URLs; the only shim in this plan)
- `website/src/components/TemplateGetStarted/` (deleted in Phase 4)
- `scripts/generate-registry.ts` (the canonical resolver — reads template files, vendored DCT/UIS data, parses `manifests/deployment.yaml` with `js-yaml`, writes `resolvedTools` / `resolvedServices` / `templateKind` / `resolvedInitFiles` into `template-registry.json`)
- `scripts/generate-docs-markdown.sh` (reads the resolved fields from `template-registry.json` with `jq`, emits the new MDX props using the existing prop-encoding pattern)
- `website/docs/contributors/readme-structure.md`
- `website/docs/ai-developer/plans/backlog/INVESTIGATE-improve-template-docs-with-services.md` (closing note when this plan completes)

Generated MDX files under `website/docs/templates/` will all change but are not edited by hand.

**Files explicitly NOT touched by this plan:**
- Any `template-info.yaml`
- Any `manifests/*.yaml`
- Any template `app/`, `config/`, `requirements.txt`, `Dockerfile`, `README-*.md`
- Any DCT or UIS file (no upstream PRs from this plan)

---

## Deferred work (separate future plan)

The following ideas came up during planning but are **explicitly deferred** until the deploy chain (`./uis argocd register`, push-to-deploy, ArgoCD sync) is verified end-to-end against a real cluster. The reason: changing template structure or contributor experience while the deploy flow is unverified would mix variables — a deploy failure could be a template-structure bug or a real deploy bug, and we'd struggle to tell them apart. Better to ship the website improvement now (which is risk-free), then validate the deploy chain, then revisit templating with full context.

### Candidates for the future templating plan

1. **Validation script** — A `dev-template-validate` (or CI check) that confirms the env var name and K8s secret name are consistent across `app/app.py`, `manifests/deployment.yaml`, and any place else they appear. Catches typos at PR time instead of at runtime. Pure-additive, no schema change.
2. **Single source of truth in `template-info.yaml`** — Add optional `env_var` and `secret_name` fields under `requires[].config`. The deployment manifest uses `{{ENV_VAR}}` and `{{SECRET_NAME}}` placeholders, substituted by DCT at install time the same way `{{REPO_NAME}}` already is. Contributor declares the names once. Requires DCT change.
3. **Manifest codegen** — Contributor declares high-level deployment shape (port, resources, image) in `template-info.yaml`, DCT generates `manifests/deployment.yaml` from a built-in template at install time. Eliminates the 60-line manifest file from per-template maintenance. Requires DCT change.
4. **Scaffolding command** — `dev-template-new postgres-app` creates a new template skeleton with placeholders pre-filled. Independent of the others.
5. **Ask DCT to add a `docs` field per tool** in `tools.json` — would let us delete `dct-doc-paths.ts` from this plan.
6. ~~**Ask UIS to add a `defaultEnvVar` / `secretSuffix` per service**~~ — **obsolete.** The manifest-reading approach in this plan reads these values directly from the template's own `manifests/deployment.yaml`, where the contributor already declares them. No upstream UIS change needed. Only revisit if we adopt Layer 2 (single-source-of-truth in `template-info.yaml`) AND decide we want UIS to publish defaults for newly-scaffolded templates.

**Prerequisites before starting the templating plan:**
- The current plan (Environment card) is shipped and stable
- ArgoCD register + push-to-deploy + ArgoCD sync verified end-to-end against a real cluster
- We have at least one real user successfully deploying a template via the GitHub Actions + ArgoCD path

These are tracked here so they don't get lost, but no work happens on them until the prerequisites are met. A new `PLAN-templating-improvements.md` (or similar) will be drafted at that time, with the benefit of whatever we learn from the deploy validation.
