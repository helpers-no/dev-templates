---
sidebar_position: 5
---

# Scripts Reference

All scripts live in `scripts/` at the repository root. They are used both locally during development and by GitHub Actions during CI/CD.

## Validation Scripts

### validate-metadata.sh

Validates all `template-info.yaml` and `template-categories.yaml` files.

```bash
bash scripts/validate-metadata.sh
```

**Checks:**
- YAML syntax is valid (uses node + js-yaml)
- All mandatory fields are present and non-empty
- `category` matches a category ID defined in the parent folder's `template-categories.yaml`
- `install_type` is one of `app`, `overlay`, `stack`
- `id` matches the directory name
- `tags` is a YAML list
- README file referenced by `readme` exists
- Category IDs are unique across all folders
- `context` is `dct` or `uis`

**Exit code:** 0 if all valid, 1 if any errors.

### validate-docs.sh

Checks markdown files for MDX compatibility issues and broken links. Rules are defined in `scripts/validate-rules.conf`.

```bash
bash scripts/validate-docs.sh
```

**Checks:**
- Forbidden patterns (bare angle brackets outside code fences that break MDX)
- Required headings in template READMEs (Quick Start, Prerequisites, Project Structure)
- Broken internal markdown links

**Exit code:** 0 if no errors (warnings are OK), 1 if any errors.

### validate-rules.conf

Configuration file that defines what `validate-docs.sh` checks. Easy to edit without changing code.

```bash
# Format: FILE_PATTERN|RULE_TYPE|VALUE|SEVERITY
# RULE_TYPE: required_heading, forbidden_pattern
# SEVERITY: error, warn

# Example: require Quick Start heading in all template READMEs
README-*.md|required_heading|Quick Start|error
```

## Generation Scripts

### generate-registry.ts / generate-registry.sh

Scans all `template-categories.yaml` and `template-info.yaml` files and generates the unified registry.

```bash
bash scripts/generate-registry.sh
```

**How it works:**
1. Finds all `*/template-categories.yaml` files at the repo root
2. Finds all `*/*/template-info.yaml` files within those folders
3. Validates: unique category IDs, valid categories, required fields, id matches directory name
4. Outputs `website/src/data/template-registry.json`

**Output:** `website/src/data/template-registry.json` — contains both `categories` and `templates` arrays. This single file serves:
- **Docusaurus website** — React components import it directly
- **DCT installer** — `dev-template` fetches it via curl to build the selection menu
- **UIS installer** — `uis template` fetches it for infrastructure template browsing

The bash wrapper (`generate-registry.sh`) runs the TypeScript script via `tsx`. Requires `node`, `tsx`, and `js-yaml` (from `website/node_modules`).

### generate-docs-markdown.sh

Generates Docusaurus pages from the registry and template README files.

```bash
bash scripts/generate-docs-markdown.sh [--force]
```

**How it works:**
1. Reads `template-registry.json` with `jq`
2. For each template: generates an MDX detail page with TemplateHeader component + embedded README content
3. For each category: generates an index page with a table of templates
4. Generates sidebar configuration (`_category_.json` files)

**Output:**
- `website/docs/templates/<category>/<template-id>.mdx` — detail pages
- `website/docs/templates/<category>/index.md` — category index tables
- `website/docs/templates/<category>/_category_.json` — Docusaurus sidebar config

Use `--force` to overwrite existing files. Requires `jq`.

### generate-plan-indexes.sh

Generates index pages for the AI developer plan folders.

```bash
bash scripts/generate-plan-indexes.sh [plans-dir]
```

**Output:**
- `website/docs/ai-developer/plans/index.md` — overview
- `website/docs/ai-developer/plans/active/index.md` — active plans table
- `website/docs/ai-developer/plans/backlog/index.md` — backlog table
- `website/docs/ai-developer/plans/completed/index.md` — completed table

## Library Scripts

Located in `scripts/lib/`. Sourced by the validation script.

| Script | Purpose |
|--------|---------|
| `logging.sh` | Colored output functions (`log_info`, `log_success`, `log_warn`, `log_error`) |

## Brand Scripts

Located in `website/static/img/brand/`. Used to generate website brand assets. See `website/static/img/brand/README.md` for full details.

Requires `dev-imagetools` installed in the devcontainer (`dev-setup` > Image Processing Tools).

| Script | Purpose |
|--------|---------|
| `publish-favicon.sh` | Generate `favicon.ico` from the logo SVG |

## CI/CD Pipeline

GitHub Actions (`.github/workflows/deploy-docs.yml`) runs these scripts automatically on push to main:

```
validate-metadata.sh → validate-docs.sh → generate-registry.ts
→ generate-docs-markdown.sh → generate-plan-indexes.sh
→ auto-commit generated files → npm run build → deploy to GitHub Pages
```

**Triggers:** Changes to `website/**`, `templates/**/template-info.yaml`, `templates/template-categories.yaml`, `ai-templates/**/template-info.yaml`, `ai-templates/template-categories.yaml`, `scripts/**`, or the workflow file itself.
