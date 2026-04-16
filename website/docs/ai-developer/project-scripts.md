# Project Scripts

Single source of truth for every script under `scripts/`. Audience: human contributors and AI assistants. If you're looking for "which command should I run?" or "what does this script do?", the tables below are the fastest path.

## Runnable scripts

| Command | What it does | When to run |
|---|---|---|
| `bash scripts/validate-metadata.sh` | Validate every `template-info.yaml` against the schema (required fields, category ID, install_type, optional `configure_command` type check) | Before push; after editing any `template-info.yaml` |
| `npx tsx scripts/generate-registry.ts` | Scan every `template-info.yaml` + vendored DCT/UIS data + per-template `manifests/deployment.yaml`, produce `website/src/data/template-registry.json` with fully resolved entries | After editing any `template-info.yaml`; before the docs emitters |
| `bash scripts/generate-registry.sh` | Thin bash wrapper around `generate-registry.ts` — resolves `tsx` via either global or `npx` | Same triggers as `generate-registry.ts`; use when bash is more natural than invoking `tsx` directly |
| `bash scripts/generate-docs-markdown.sh --force` | Read `template-registry.json` and produce per-template MDX pages under `website/docs/templates/**/*.mdx` | After `generate-registry.ts` |
| `bash scripts/generate-plan-indexes.sh` | Regenerate `active/index.md`, `backlog/index.md`, `completed/index.md` under `website/docs/ai-developer/plans/` | When plans move between folders, or when a plan's front-matter changes |
| `bash scripts/validate-docs.sh` | Check internal markdown links across generated and source docs; enforce required-heading rules from `validate-rules.conf` | **After all generators run**; before push. Order matters — the validator checks the post-generation state, not the source yaml. |
| `bash scripts/refresh-platform-data.sh` | Pull fresh `dct-tools.json`, `uis-services.json`, `uis-categories.json` from DCT and UIS, sanity-check each with `jq -e`, write into `website/src/data/` | On demand — first-time setup of a new machine, or when DCT/UIS publishes a new tool/service or changes metadata. Not run in CI; the output is committed. |
| `npx tsx --test scripts/test/*.test.ts` | Run unit tests for the TypeScript library modules | When editing anything under `scripts/lib/` |

## Library modules (imported, not directly runnable)

| Module | Purpose | Imported by |
|---|---|---|
| `scripts/lib/logging.sh` | Colored log helpers: `log_info`, `log_success`, `log_warn`, `log_error` | All shell scripts |
| `scripts/lib/build-architecture-mermaid.ts` | Structured `ArchitectureModel` + per-diagram mermaid helpers (`buildLocalDevFlowchart`, `buildLocalDevSequence`, `buildDeployFlowchart`, `buildDeploySequence`, `buildStackFlowchart`, `buildStackSequence`) | `generate-registry.ts`; `build-architecture-mdx.ts` (types) |
| `scripts/lib/build-architecture-mdx.ts` | Emit the `## Architecture` MDX block from an `ArchitectureModel`. Wraps each diagram in a `<details>` block + a mermaid.live link. | `generate-registry.ts` |
| `scripts/lib/build-expected-output.ts` | Generate the "Expected output" sample string shown in the Environment card's Configure/Install dropdown | `generate-registry.ts` |
| `scripts/lib/service-ports.ts` | Stopgap map of UIS service id → in-cluster default port. To be deleted when UIS ships `inClusterPort` on `services.json`. | `build-architecture-mermaid.ts`; `build-expected-output.ts` |
| `scripts/lib/dct-doc-paths.ts` | Resolve DCT documentation URLs for tools (hand-curated category-ID → URL-slug map; strips `dev-` / `tool-` prefixes from tool IDs) | `generate-registry.ts` |

## The pre-push pipeline

Before pushing any commit that touches generators, `template-info.yaml`, plan files, or anything else that flows through the registry/docs pipeline, run the **full pipeline locally** in the devcontainer in the same order CI uses. This catches broken-reference bugs where regenerated indexes point at files you forgot to commit, or where renamed files leave stale links elsewhere.

```bash
docker exec <container-name> bash -c "cd /workspace && \
  bash scripts/validate-metadata.sh && \
  npx tsx scripts/generate-registry.ts && \
  bash scripts/generate-docs-markdown.sh --force && \
  bash scripts/generate-plan-indexes.sh && \
  bash scripts/validate-docs.sh && \
  cd website && npm run build"
```

The order matches `.github/workflows/deploy-docs.yml` exactly: source validation (`validate-metadata.sh`) first, then generators in the order each depends on the previous one's output, then generated-content validation (`validate-docs.sh`), then the Docusaurus build. Two insights about this order:

- **`validate-metadata.sh` runs first** because it validates source-of-truth yaml files — there's no point generating anything if the yaml is malformed.
- **`validate-docs.sh` runs last** (after the generators) because it checks the state after regeneration — generated `.mdx` files and regenerated `index.md` files all have to be present and consistent before the link checker runs. This ordering was established by PR #38 after PRs #35-#37 all shipped with broken-link CI failures caused by running the validator against pre-generation state.

If this command exits non-zero, **do not push**. Fix the failure locally, re-run, and only push when the full pipeline is green.

## Script details

### validate-metadata.sh

Reads every `template-info.yaml` under `templates/`, `uis-stack-templates/`, and `ai-templates/`. Checks:

- Required fields present (`id`, `version`, `name`, `description`, `category`, `install_type`, `abstract`, `readme`, `logo`, `maintainers`, `links`)
- `id` matches the directory name
- `category` is defined in a sibling `template-categories.yaml`
- `install_type` is one of `app`, `overlay`, `stack`
- `tags` is a YAML list
- `configure_command` (optional) is a non-empty string if present
- `readme` file exists on disk

Uses `node` + `js-yaml` for YAML parsing (via a heredoc in `_yaml_field` inside the script) and sources `scripts/lib/logging.sh` for colored output. Exits non-zero on any validation failure and prints a count at the end.

Extending: to add a new required field, append it to `$MANDATORY_FIELDS` near the top of the script. To add a new validation rule (e.g. "the new field must look like a semver"), add it alongside the existing `configure_command` block in `validate_template_yaml`.

### generate-registry.ts

The central data pipeline. Reads:

- Every `template-info.yaml` under `templates/**`, `uis-stack-templates/**`, `ai-templates/**`
- `templates/template-categories.yaml` + siblings
- Vendored `website/src/data/dct-tools.json` + `uis-services.json` + `uis-categories.json`
- Per-template `manifests/deployment.yaml` (for app templates)
- Per-template `config/init-*.sql` files (for templates with init files)

Produces `website/src/data/template-registry.json`: a single JSON file with one entry per template, every downstream-needed field pre-resolved. This file is the single source the Docusaurus site and the bash emitter (`generate-docs-markdown.sh`) read from.

Delegates to the library modules for the heavy work:

- `buildArchitectureModel(entry)` and `emitArchitectureMdx(model)` from the `build-architecture-*.ts` pair — produces the `## Architecture` MDX block
- `buildExpectedOutput(entry)` from `build-expected-output.ts` — produces the "Expected output" string
- `resolveToolDocsUrl(...)` from `dct-doc-paths.ts` — builds DCT tool documentation links

For the TMP-specific architectural narrative (the two-diagram Components/Flow pattern, archetype handling, Contributor onboarding), see [project-dev-templates.md §Auto-generated documentation sections](project-dev-templates.md).

### generate-registry.sh

A 20-line bash wrapper that resolves `tsx` (either a globally-installed command or via `npx` from the `website/` package). Useful when invoking the generator from a shell script that doesn't want to know about `tsx` specifically.

### generate-docs-markdown.sh

Reads `template-registry.json` via `jq` and produces per-template MDX files under `website/docs/templates/<category-dir>/<template-id>.mdx`. Also produces per-category `index.md` files and `_category_.json` sidebar-config files.

The emission pattern: `cat >> "$page_file" <<MDXEOF` heredocs for the static structure, with `jq -c` values interpolated as JSX props on components like `<TemplateHeader>` and `<TemplateEnvironment>`. Yaml-derived strings that might contain angle-bracket patterns (e.g. `template-info.yaml` content, the "Expected output" block) are passed through a `sed 's/</\u003c/g' -e 's/>/\u003e/g'` escape to avoid MDX 3.10's JSX parser mis-interpreting literal `<foo>` inside JSON string attributes as unclosed tags.

The `--force` flag re-creates every template page unconditionally. Without it the script is effectively a no-op against an existing target directory (it only creates missing files, doesn't update existing ones). Use `--force` in the pre-push pipeline.

### generate-plan-indexes.sh

Walks `website/docs/ai-developer/plans/active/`, `backlog/`, `completed/` and produces an `index.md` in each. The index is a sorted markdown table of every plan/investigation in that folder, with its status, goal, and last-updated date pulled from the front-matter of each file.

**Important gotcha** (documented in the pre-push checklist): this script walks the filesystem, so untracked plan files get indexed too. If you add a new investigation and regenerate indexes before committing the investigation itself, the regenerated index will link to a file that doesn't exist on origin/main — and CI will fail with a broken-link error. Either commit the investigation file first, or `git stash -u` untracked files before regenerating.

### validate-docs.sh

Two checks:

1. **Rules from `validate-rules.conf`** — a declarative file of required headings per document class. For example, the `template-readme` class might require `## Quick Start` and `## Prerequisites` headings. Violations produce warnings, not errors.
2. **Internal link checker** — walks every `.md` and `.mdx` under `website/docs/`, finds markdown links to other docs, confirms each resolves to an existing file. Missing targets are hard errors.

Exits non-zero on any error; zero if only warnings remain. Runs **after** the generators in CI and in the pre-push pipeline so it sees the post-regeneration state — that's the whole point of the ordering established in PR #38.

### refresh-platform-data.sh

On-demand refresh of vendored data. Not run in CI; produces committed artifacts. Downloads three files from their canonical DCT / UIS repos:

- `website/src/data/dct-tools.json` — from `helpers-no/devcontainer-toolbox`
- `website/src/data/uis-services.json` — from `helpers-no/urbalurba-infrastructure`
- `website/src/data/uis-categories.json` — from same

Each file is sanity-checked with `jq -e '.required_field'` after download. Any schema drift or HTTP error aborts the script without overwriting the existing file — never leaves a broken vendored file in place.

When to run: first-time setup of the website on a new machine; when DCT publishes a new tool or its categories change; when UIS publishes a new service or its metadata changes.

### scripts/test/*.test.ts

Three test files using Node's built-in `node:test` runner:

- `scripts/test/build-architecture-mermaid.test.ts` — per-diagram helpers
- `scripts/test/build-architecture-mdx.test.ts` — structured model + emitter output
- `scripts/test/build-expected-output.test.ts` — expected-output generator across archetypes

Run all of them:

```bash
npx tsx --test scripts/test/build-architecture-mdx.test.ts \
                scripts/test/build-architecture-mermaid.test.ts \
                scripts/test/build-expected-output.test.ts
```

Or one file at a time. Fixtures are inline — no disk reads from the real registry during test runs, which keeps tests hermetic and decoupled from live template data.

### Library modules

One-line-each summary. See the source files for full API docs.

**`scripts/lib/logging.sh`** — four functions (`log_info`, `log_success`, `log_warn`, `log_error`) that wrap `echo` with color codes. Sourced at the top of every shell script.

**`scripts/lib/build-architecture-mermaid.ts`** — defines the `ArchitectureDiagram`, `ArchitectureSection`, `ArchitectureModel` types, the per-diagram helpers, and `buildArchitectureModel(entry)`. The per-diagram helpers return raw mermaid source strings; the model builder composes them into the structured shape the emitter walks.

**`scripts/lib/build-architecture-mdx.ts`** — defines `emitArchitectureMdx(model)` and `buildMermaidLiveUrl(source)`. The emitter wraps each diagram in a `<details className="dropdownBlock">` block with a per-diagram summary, appends a mermaid.live link at the end of each dropdown, and wraps the whole section in a `<div className="templateCard">` so it renders as a card matching the Environment card.

**`scripts/lib/build-expected-output.ts`** — single export `buildExpectedOutput(entry)`. Returns a multi-line string mimicking what DCT (or UIS, for stack templates) prints when a developer runs the configure flow. Every value derived from the registry entry — no hand-authored mock content. File header notes the DCT version the mock was last verified against.

**`scripts/lib/service-ports.ts`** — two exports: `SERVICE_PORTS` (a `Record<string, number>` literal) and `getInClusterPort(id)` (throws on unknown IDs). Will be deleted when UIS ships `inClusterPort` as a field on `services.json`.

**`scripts/lib/dct-doc-paths.ts`** — hand-curated category-ID → URL-slug map plus logic to strip `dev-` / `tool-` prefixes from tool IDs. Shim until DCT ships `docs` URLs as a field on `tools.json`.

## Conventions

Rules that apply across every script in this folder.

**Shell scripts source `lib/logging.sh`** at the top. Use `log_info`, `log_success`, `log_warn`, `log_error` instead of raw `echo` — both for consistency and because CI captures color-coded output.

**TypeScript scripts run via `tsx`** — no compile step, no build artifact, the `.ts` source is the artifact. All TS scripts assume the `website/node_modules` dependency tree (for `js-yaml` and similar). In the devcontainer `tsx` is globally installed; in CI it's invoked via `npx --prefix website tsx`.

**Exit codes**: any non-zero exit is a failure. Validators exit non-zero on the first hard error; generators exit non-zero on any error. CI aborts on first non-zero.

**Paths and cwd**: every script assumes the project root as cwd. The pre-push pipeline runs `cd /workspace` first. Individual scripts can be run from the project root with `bash scripts/<name>.sh` — they `cd` internally where needed.

**Adding a new script**:

1. Write the script under `scripts/` (shell) or `scripts/lib/` (TS library).
2. Add a row to the appropriate table at the top of this file (**Runnable scripts** or **Library modules**). Same column shape.
3. Add a `### <name>` section under "Script details" with a few paragraphs: what it reads, what it writes, how to extend.
4. If the script is part of the pre-push pipeline, update the pipeline command in the "The pre-push pipeline" section above.
5. If it's a runnable script with unit tests, add a `scripts/test/<name>.test.ts` and update the test runner command in the Runnable scripts table.

**Updating this file**: every PR that changes a script's behavior must update the corresponding detail section here. Drift between the code and this doc is how stale documentation creates onboarding friction later.
