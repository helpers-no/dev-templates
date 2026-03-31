# Investigate: Generate Backstage Files from dev-templates

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Backlog

**Goal**: Determine the best approach for automatically generating Backstage Software Template files from the existing `templates/` structure in dev-templates.

**Last Updated**: 2026-03-31

---

## Questions to Answer

1. Where should the Backstage files live — inside the dev-templates repo or a separate repo?
2. What is the right tool for the generator script — bash, Node.js, or something else?
3. How do we map `TEMPLATE_INFO` fields to Backstage YAML fields reliably?
4. How do we handle Nunjucks placeholders (`${{ }}`) inside a bash-generated file without shell expansion corrupting them?
5. How should the `fetch:template` step reference the skeleton — relative path, absolute GitHub URL, or copied content?
6. How do we keep the generated files in sync when a template changes?
7. Should the generator run manually, as a pre-commit hook, or as a GitHub Actions workflow?
8. How does Backstage discover the generated templates — what does the `app-config.yaml` entry look like?

---

## Current State

The dev-templates repo at `https://github.com/helpers-no/dev-templates` currently contains:

- **6 templates** under `templates/`, each with a consistent structure:
  - `TEMPLATE_INFO` — structured key=value metadata (id, name, description, tags, category, version, related templates, docs URL)
  - `Dockerfile` — container definition, reveals runtime (e.g. `node:20`, `python`, `golang`)
  - `manifests/deployment.yaml` — Kubernetes Deployment + Service, uses `{{GITHUB_USERNAME}}` and `{{REPO_NAME}}` placeholders
  - `manifests/kustomization.yaml` — ArgoCD kustomize config
  - `.github/workflows/urbalurba-build-and-push.yaml` — CI/CD pipeline
  - `app/` or `src/` — actual application source code

- **No `backstage/` folder exists yet** — Backstage files must be created from scratch.

- The `TEMPLATE_INFO` placeholder system (`{{GITHUB_USERNAME}}`, `{{REPO_NAME}}`) is shell-style substitution done by the `dev-template` install script. Backstage uses Nunjucks-style (`${{ values.xxx }}`). These must coexist in the output.

- A worked example of what a `template.yaml` and `skeleton/catalog-info.yaml` should look like has already been produced for `typescript-basic-webserver` (see prior design session).

---

## Options

### Option A: Bash script (`scripts/generate-backstage.sh`)

A bash script that reads each `TEMPLATE_INFO`, parses the key=value pairs into shell variables, and writes out `template.yaml` and `skeleton/catalog-info.yaml` using heredocs.

**Pros:**
- No new dependencies — bash is available in all devcontainers
- Consistent with the existing `scripts/` pattern in the repo
- Fast and simple for straightforward text generation
- Easy to run manually or in CI

**Cons:**
- Heredoc quoting is fiddly — Nunjucks `${{ }}` expressions must be inside single-quoted heredocs (`<< 'EOF'`) to prevent shell expansion
- Limited YAML validation — bash cannot easily verify the output is valid YAML
- String manipulation in bash is verbose and error-prone for complex transformations
- Harder to test in isolation

### Option B: Node.js script (`scripts/generate-backstage.js`)

A Node.js script using the built-in `fs` module and template literals to generate the YAML files.

**Pros:**
- Already a Node.js/TypeScript environment in the repo — no new tooling
- Template literals handle multi-line strings more cleanly than bash heredocs
- Nunjucks placeholders are just regular strings in JS template literals — no quoting issues
- `js-yaml` (already a common dependency) can validate output YAML before writing
- Easier to unit test

**Cons:**
- Requires Node.js to be available when running the script (it is in the devcontainer, but adds a soft dependency)
- Slightly more setup than a single bash script
- Parsing the `TEMPLATE_INFO` key=value format requires a small parser

### Option C: GitHub Actions only (no local script)

A GitHub Actions workflow that generates the `backstage/` folder automatically on every push that touches `templates/`.

**Pros:**
- Fully automated — developers never need to run anything manually
- Generated files are always in sync with the templates

**Cons:**
- Cannot run locally — makes local development and testing harder
- Adds workflow complexity
- Generated files committed by the bot create noisy git history
- Does not address the local/manual generation need

### Option D: Copy skeleton manually + script only for `template.yaml`

Keep `skeleton/catalog-info.yaml` as a manually maintained file (one per template), and only auto-generate `template.yaml` from `TEMPLATE_INFO`.

**Pros:**
- Simpler script — only one output file type to generate
- `catalog-info.yaml` can be hand-tuned per template

**Cons:**
- Splits the generation concern — some files are generated, some are manual
- Easy to forget to update `catalog-info.yaml` when a template changes
- Undermines the goal of fully deriving Backstage files from existing data

---

## Recommendation

**Option B (Node.js) as the primary generator, with Option C (GitHub Actions) as the sync mechanism.**

Node.js is the right tool because:
- The Nunjucks placeholder problem (`${{ }}` conflicting with bash variable expansion) is a genuine risk in Option A and has no clean solution
- The repo is already a Node.js environment
- YAML validation of output is straightforward with `js-yaml`
- The script is easier to maintain and extend as new template categories are added

GitHub Actions should re-run the script on any push that modifies `templates/**/TEMPLATE_INFO`, committing the regenerated `backstage/` folder automatically. This keeps generated files in sync without requiring developers to remember to run the script.

Option D is rejected — full automation is the goal and the `catalog-info.yaml` skeleton is as derivable from `TEMPLATE_INFO` as `template.yaml` is.

### Key design decisions

**Repo location:** `backstage/` lives inside dev-templates. The `fetch:template` step in each `template.yaml` references the skeleton via a relative path (`../../templates/<id>`), keeping a single source of truth for app code with no duplication.

**Field mapping:**

| `TEMPLATE_INFO` field | Backstage destination |
|---|---|
| `TEMPLATE_ID` | `metadata.name` |
| `TEMPLATE_NAME` | `metadata.title` |
| `TEMPLATE_DESCRIPTION` | `metadata.description` |
| `TEMPLATE_TAGS` | `metadata.tags` (split on space) |
| `TEMPLATE_CATEGORY` | `spec.type` (`BASIC_WEB_SERVER` → `service`, `WEB_APP` → `website`) |
| `TEMPLATE_DOCS` | `annotations.backstage.io/techdocs-ref` |
| `TEMPLATE_WEBSITE` | `metadata.links[].url` |
| `TEMPLATE_RELATED` | `spec.links` (related templates) |
| `TEMPLATE_VER` | `annotations` (informational) |

**OTLP opt-in:** The `catalog-info.yaml` skeleton includes a conditional `{% if values.enableOtlp %}` block for the `dependsOn: otlp-collector` relationship, upholding the UIS "keep it honest" principle.

**Backstage discovery:** A single entry in `app-config.yaml` points to `backstage/all-templates.yaml`, which is a `kind: Location` entity listing all generated `template.yaml` files. New templates are auto-discovered when the location file is regenerated.

```yaml
# In Backstage app-config.yaml:
catalog:
  locations:
    - type: url
      target: https://github.com/helpers-no/dev-templates/blob/main/backstage/all-templates.yaml
```

---

## Risks and Open Questions

- **TEMPLATE_INFO parsing edge cases:** Values with spaces or special characters may need quoting logic in the parser. Should be validated against all 6 existing files before implementation.
- **New template categories:** When new `TEMPLATE_CATEGORY` values are added (e.g. `MESSAGE_QUEUE`, `DATABASE`), the category-to-type mapping in the script must be updated. Should default to `service` rather than failing.
- **GitHub Actions bot commits:** Auto-generated commits from the workflow should use `[ci-skip]` in the message to prevent triggering further runs — the same pattern already used in `urbalurba-build-and-push.yaml`.
- **Backstage version compatibility:** The `scaffolder.backstage.io/v1beta3` API version should be verified as current at implementation time. The `fetch:plain:file` action availability should also be confirmed.

---

## Next Steps

- [ ] Create `PLAN-001-generator-script.md` — implement the Node.js generator script
- [ ] Create `PLAN-002-github-actions-sync.md` — automate regeneration on template changes
  - Use ordered naming as these plans have sequential dependencies