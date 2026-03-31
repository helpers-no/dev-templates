---
sidebar_position: 5
---

# Scripts Reference

All scripts live in `scripts/` at the repository root. They are used both locally during development and by GitHub Actions during CI/CD.

## Validation Scripts

### validate-metadata.sh

Checks that all `TEMPLATE_INFO` files have the required fields and valid values.

```bash
bash scripts/validate-metadata.sh
```

**Checks:**
- All mandatory fields are present and non-empty
- `TEMPLATE_CATEGORY` is a valid category ID (defined in `scripts/lib/categories.sh`)
- `TEMPLATE_ID` matches the directory name (warning if not)
- README file referenced by `TEMPLATE_README` exists

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

To add a new check, add a line to this file.

## Generation Scripts

### generate-templates-json.sh

Scans all `TEMPLATE_INFO` files and generates JSON data for the Docusaurus website.

```bash
bash scripts/generate-templates-json.sh
```

**Output:**
- `website/src/data/templates.json` — all template metadata
- `website/src/data/categories.json` — category definitions

Validates output with `jq` if available.

### generate-docs-markdown.sh

Generates Docusaurus pages from template metadata and README files.

```bash
bash scripts/generate-docs-markdown.sh [--force]
```

**Output:**
- `website/docs/templates/<category>/<template-id>.mdx` — detail pages with TemplateHeader + embedded README
- `website/docs/templates/<category>/index.md` — category index tables
- `website/docs/templates/<category>/_category_.json` — Docusaurus sidebar config
- `website/docs/templates/_category_.json` — top-level category config

Use `--force` to overwrite existing files.

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

Located in `scripts/lib/`. Sourced by the scripts above.

| Script | Purpose |
|--------|---------|
| `logging.sh` | Colored output functions (`log_info`, `log_success`, `log_warn`, `log_error`) |
| `categories.sh` | Template category definitions and accessor functions. Includes JSON generation. |
| `template-scanner.sh` | Reads `TEMPLATE_*` fields from TEMPLATE_INFO files using safe line-by-line parsing. |

## CI/CD Pipeline

GitHub Actions (`.github/workflows/deploy-docs.yml`) runs these scripts automatically on push to main:

```
validate-metadata.sh → validate-docs.sh → generate-templates-json.sh
→ generate-docs-markdown.sh → generate-plan-indexes.sh
→ auto-commit generated files → npm run build → deploy to GitHub Pages
```
