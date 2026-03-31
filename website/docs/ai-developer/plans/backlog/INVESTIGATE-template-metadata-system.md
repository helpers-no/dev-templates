# Investigate: Template Metadata System and README Standardisation

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Backlog

**Goal**: Design and implement a complete template metadata system — aligned with DCT and UIS patterns — that serves the Docusaurus website, template deployment, CLI tooling, and standardised READMEs. This includes enriching TEMPLATE_INFO with mandatory metadata fields, renaming fields for DCT consistency, revising READMEs to a standard structure, and creating the generation scripts (adapted from UIS) that populate the Docusaurus site.

**Priority**: High

**Last Updated**: 2026-03-30

**Related**:
- `helpers-no/devcontainer-toolbox` (DCT) — metadata system, categories, component scanner, JSON generation. Patterns to reuse. DCT-side plan: `PLAN-template-readme-instructions.md`.
- `helpers-no/urbalurba-infrastructure` (UIS) — docs generation scripts, GitHub Actions workflow, plan index generation. Patterns to reuse.

---

## Context

### What changed

As of DCT v1.7.11, the template installer (`dev-template.sh`) automatically installs devcontainer tools declared in `TEMPLATE_TOOLS`. Previously, users had to manually install tools (e.g., PHP, Python) after scaffolding a template. The template READMEs were written assuming manual tool installation and contain instructions like "Install PHP" or "Install Python" that are now unnecessary.

### What needs to happen

1. **Add `TEMPLATE_README` field** to every `TEMPLATE_INFO` so the DCT installer can tell the user which README to read
2. **Rename `TEMPLATE_PURPOSE` → `TEMPLATE_ABSTRACT`** to align with DCT/UIS naming conventions
3. **Revise all READMEs** to remove tool installation instructions and follow a standard structure
4. **Add full metadata fields** to all TEMPLATE_INFO files (ID, version, tags, summary, logo, website, docs, related)
5. **Create generation scripts** (adapted from UIS) to produce JSON and markdown for the Docusaurus website
6. **Create Docusaurus React components** to display template cards and category pages
7. **Update GitHub Actions** to run generation and validation before build

---

## Part 1: Add TEMPLATE_README to TEMPLATE_INFO

Each template's `TEMPLATE_INFO` needs a new field:

```bash
TEMPLATE_README="README-php-basic-webserver.md"
```

This tells the DCT template installer to show:
```
📝 Next steps:

   1. Update your terminal (tools were installed):
      source ~/.bashrc

   2. Read the template instructions:
      cat README-php-basic-webserver.md
```

### Files to update

| Template | TEMPLATE_README value |
|----------|----------------------|
| `php-basic-webserver` | `README-php-basic-webserver.md` |
| `python-basic-webserver` | `README-python-basic-webserver.md` |
| `typescript-basic-webserver` | `README-typescript-basic-webserver.md` |
| `golang-basic-webserver` | `README-golang-basic-webserver.md` |
| `java-basic-webserver` | `README-java-basic-webserver.md` |
| `csharp-basic-webserver` | `README-csharp-basic-webserver.md` |
| `designsystemet-basic-react-app` | `README-designsystemet-basic-react-app.md` |

### AI templates

The plan-based-workflow template needs its own README file (`README-plan-based-workflow.md`) following the same standard structure as the app templates. The existing `docs/ai-developer/README.md` is an operational entry point for AI assistants — it tells them which docs to read — but it doesn't describe what the template provides or how to get started with it.

The AI template README should cover:
- **Quick Start** — how to start using the workflow after installation (create your first plan, configure CLAUDE.md, etc.)
- **What's Included** — the 6 portable docs, plans folder structure, CLAUDE.md
- **How It Works** — overview of the plan-based workflow (investigate → plan → implement)
- **Project Structure** — the `docs/ai-developer/` directory layout

`TEMPLATE_README="README-plan-based-workflow.md"` should be added to its TEMPLATE_INFO. This README lives in `ai-templates/plan-based-workflow/template/` and gets copied to the project root alongside the docs.

---

## Part 2: Revise template READMEs

### What to remove

Each README likely has sections about installing the development tools. Since DCT now handles this automatically via `TEMPLATE_TOOLS`, these sections should be removed or replaced with a note like:

```
## Prerequisites

Development tools are installed automatically by the devcontainer.
If you need to reinstall, run: dev-setup
```

### What to keep / improve

- **How to run the app** — this is the most important section. Direct commands:
  - PHP: `php -S 0.0.0.0:8000 -t app`
  - Python: `python app/app.py`
  - TypeScript: `npm install && npm run dev`
  - etc.
- **Project structure** — what files are where
- **How to develop** — edit/test/debug workflow
- **How to deploy** — Kubernetes manifests, CI/CD

### What to add

- A clear "Quick start" section at the top with numbered copy-paste commands
- Port information (which port to open in the browser)

### Standard README Structure

All template READMEs should follow this structure:

```markdown
# Template Name

Brief description of what this template provides.

## Quick Start

1. Update your terminal (tools were installed):
   ```bash
   source ~/.bashrc
   ```

2. Run the app:
   ```bash
   <run command>
   ```

3. Open in browser: http://localhost:<port>

## Prerequisites

Development tools are installed automatically by the devcontainer.
If you need to reinstall, run: `dev-setup`

## Project Structure

<directory tree with descriptions>

## Development

<how to edit, test, and debug>

## Docker Build

<how to build the container image locally>

## Kubernetes Deployment

<how to deploy to the local K8s cluster>

## CI/CD

<how the GitHub Actions workflow works>
```

This standard structure makes it easy to create new templates and gives users a consistent experience across all templates.

---

## Part 3: Enrich TEMPLATE_INFO with Extended Metadata

### Problem

DCT install scripts have rich metadata (15 fields) used for the website, search, and tool cards. Templates only have 5-6 basic fields. This limits what we can do with templates on the website and in the CLI.

### Current vs proposed

The table compares DCT install scripts, UIS service scripts, and templates. UIS is the closest match to what we need.

| Field | DCT (`SCRIPT_*`) | UIS (`SCRIPT_*`) | Templates (current) | Templates (proposed) |
|-------|-------------------|-------------------|---------------------|---------------------|
| ID | `SCRIPT_ID` | `SCRIPT_ID` | *(uses dir name)* | `TEMPLATE_ID` |
| Version | `SCRIPT_VER` | *(none)* | *(none)* | `TEMPLATE_VER` |
| Name | `SCRIPT_NAME` | `SCRIPT_NAME` | `TEMPLATE_NAME` | `TEMPLATE_NAME` |
| Description | `SCRIPT_DESCRIPTION` | `SCRIPT_DESCRIPTION` | `TEMPLATE_DESCRIPTION` | `TEMPLATE_DESCRIPTION` |
| Category | `SCRIPT_CATEGORY` | `SCRIPT_CATEGORY` | `TEMPLATE_CATEGORY` | `TEMPLATE_CATEGORY` |
| Abstract | `SCRIPT_ABSTRACT` | `SCRIPT_ABSTRACT` | `TEMPLATE_PURPOSE` *(rename)* | `TEMPLATE_ABSTRACT` |
| Summary | `SCRIPT_SUMMARY` | `SCRIPT_SUMMARY` | *(none)* | `TEMPLATE_SUMMARY` |
| Tags | `SCRIPT_TAGS` | `SCRIPT_TAGS` | *(none)* | `TEMPLATE_TAGS` |
| Logo | `SCRIPT_LOGO` | `SCRIPT_LOGO` | *(none)* | `TEMPLATE_LOGO` |
| Website | `SCRIPT_WEBSITE` | `SCRIPT_WEBSITE` | *(none)* | `TEMPLATE_WEBSITE` |
| Docs | *(none)* | `SCRIPT_DOCS` | *(none)* | `TEMPLATE_DOCS` |
| Related | `SCRIPT_RELATED` | `SCRIPT_REQUIRES` | *(none)* | `TEMPLATE_RELATED` |
| Check cmd | `SCRIPT_CHECK_COMMAND` | `SCRIPT_CHECK_COMMAND` | *(none)* | *(not needed)* |
| Tools | *(none)* | *(none)* | `TEMPLATE_TOOLS` | `TEMPLATE_TOOLS` |
| README | *(none)* | *(none)* | *(planned)* | `TEMPLATE_README` |
| Priority | *(none)* | `SCRIPT_PRIORITY` | *(none)* | *(not needed)* |
| Helm chart | *(none)* | `SCRIPT_HELM_CHART` | *(none)* | *(not needed)* |
| Namespace | *(none)* | `SCRIPT_NAMESPACE` | *(none)* | *(not needed)* |
| Playbook | *(none)* | `SCRIPT_PLAYBOOK` | *(none)* | *(not needed)* |
| Packages | `PACKAGES_*` arrays | *(none)* | *(none)* | *(not needed)* |
| Extensions | `EXTENSIONS` array | *(none)* | *(none)* | *(not needed)* |

**Common fields across all three** (the core set): ID, Name, Description, Category, Abstract, Summary, Tags, Logo, Website

**Template-only fields**: TEMPLATE_TOOLS, TEMPLATE_README

**UIS/DCT-only fields** (not needed for templates): Check command, Priority, Helm chart, Namespace, Playbook, Packages, Extensions

**`TEMPLATE_WEBSITE` vs `TEMPLATE_DOCS`**: `TEMPLATE_WEBSITE` is the framework/language homepage (e.g., `https://flask.palletsprojects.com`). `TEMPLATE_DOCS` is the documentation URL (e.g., `https://flask.palletsprojects.com/en/stable/`). For some projects these are the same — in that case use the same URL for both.

### Example: enriched TEMPLATE_INFO

```bash
TEMPLATE_ID="python-basic-webserver"
TEMPLATE_VER="1.0.0"
TEMPLATE_NAME="Python Basic Webserver"
TEMPLATE_DESCRIPTION="Minimal Flask server with health endpoint and Docker support"
TEMPLATE_CATEGORY="WEB_SERVER"
TEMPLATE_ABSTRACT="Provides a minimal starting point for developers who want to build a Python web server using Flask"
TEMPLATE_TOOLS="dev-python"
TEMPLATE_README="README-python-basic-webserver.md"
TEMPLATE_TAGS="python flask webserver api rest"
TEMPLATE_LOGO="python-basic-webserver-logo.svg"
TEMPLATE_WEBSITE="https://flask.palletsprojects.com"
TEMPLATE_DOCS="https://flask.palletsprojects.com/en/stable/"
TEMPLATE_SUMMARY="A minimal Python web server using Flask with a health check endpoint, Docker containerization, Kubernetes deployment manifests, and GitHub Actions CI/CD workflow. Ideal for microservices and API backends."
TEMPLATE_RELATED="typescript-basic-webserver golang-basic-webserver"
```

All fields are mandatory.

### Example: AI template TEMPLATE_INFO

```bash
TEMPLATE_ID="plan-based-workflow"
TEMPLATE_VER="1.0.0"
TEMPLATE_NAME="Plan-Based AI Workflow"
TEMPLATE_DESCRIPTION="Structured AI development with plans, phases, and validation"
TEMPLATE_CATEGORY="WORKFLOW"
TEMPLATE_ABSTRACT="Provides a complete AI-assisted development workflow with investigation plans, phased implementation, and human-in-the-loop validation"
TEMPLATE_TOOLS=""
TEMPLATE_README="README-plan-based-workflow.md"
TEMPLATE_TAGS="ai workflow planning claude devcontainer"
TEMPLATE_LOGO="plan-based-workflow-logo.svg"
TEMPLATE_WEBSITE="https://tmp.sovereignsky.no"
TEMPLATE_DOCS="https://tmp.sovereignsky.no/docs/ai-developer"
TEMPLATE_SUMMARY="A structured AI development workflow that guides AI coding assistants through investigation, planning, and phased implementation. Includes CLAUDE.md, 6 portable docs, plan templates, and git safety rules. Designed for human-in-the-loop collaboration."
TEMPLATE_RELATED=""
```

Note: `TEMPLATE_TOOLS` is empty (no runtime needed). `TEMPLATE_WEBSITE` and `TEMPLATE_DOCS` point to the dev-templates Docusaurus site. `TEMPLATE_RELATED` is empty (no related templates yet).

### What this enables

- **Website templates page** — like the existing tools page, with template cards showing logos, descriptions, tags
- **Search and filtering** — by tags, category, related templates
- **Version tracking** — know when a template was last updated
- **Template detail pages** — full description with logo and links to framework docs
- **CLI improvements** — `dev-template --list` could show richer info
- **Backstage compatibility** — these fields map cleanly to Backstage `template.yaml` metadata

### TEMPLATE_PURPOSE should be renamed to TEMPLATE_ABSTRACT

`TEMPLATE_PURPOSE` serves the same role as DCT's `SCRIPT_ABSTRACT` (1-2 sentence description for cards/menus). The naming should align:

| DCT | Templates (current) | Templates (proposed) |
|-----|---------------------|---------------------|
| `SCRIPT_DESCRIPTION` | `TEMPLATE_DESCRIPTION` | `TEMPLATE_DESCRIPTION` (no change) |
| `SCRIPT_ABSTRACT` | `TEMPLATE_PURPOSE` | **`TEMPLATE_ABSTRACT`** (rename) |
| `SCRIPT_SUMMARY` | *(none)* | `TEMPLATE_SUMMARY` |

**Coordination required:** DCT's `dev-template.sh` reads `TEMPLATE_PURPOSE` via `read_template_info()`. The rename must happen in both repos simultaneously:
- **This repo**: rename `TEMPLATE_PURPOSE` to `TEMPLATE_ABSTRACT` in all 8 TEMPLATE_INFO files (7 app + 1 ai)
- **DCT repo**: update `read_template_info()` to read `TEMPLATE_ABSTRACT` instead of `TEMPLATE_PURPOSE`
- **No backward compatibility needed** — software is not released yet, both repos can change at the same time

### TEMPLATE_CATEGORY needs a definition file

Currently `TEMPLATE_CATEGORY` values like `WEB_SERVER`, `WEB_APP` are hardcoded in the template installer scripts. Both DCT and UIS have proper category definition systems — we should follow one of their patterns.

**DCT approach** (219 lines):
- Multi-line `readonly CATEGORY_TABLE` string with 7 pipe-delimited fields per row: `ORDER|ID|NAME|ABSTRACT|SUMMARY|TAGS|LOGO`
- Parsed with `grep` + `IFS='|' read`
- Has `abstract` and `summary` as separate fields
- Has backward compatibility aliases
- JSON generation is in a separate script (`generate-tools-json.sh`)

**UIS approach** (192 lines):
- Indexed bash array `_CATEGORY_DATA=()` with 6 pipe-delimited fields: `ID|NAME|DESCRIPTION|TAGS|ICON|LOGO`
- Parsed with simple loop + substring removal
- Single `description` field (no abstract/summary split)
- Has `generate_categories_json_internal()` built into the categories file
- Simpler, fewer lines, JSON generation included

**Recommendation: Use UIS pattern.** It's simpler, has JSON generation built-in, and is sufficient for our needs. We only have 2-3 template categories (WEB_SERVER, WEB_APP, WORKFLOW) — the DCT abstract/summary split for categories is overkill. If we later need richer category metadata, we can add fields to the pipe-delimited format.

### Implementation approach

1. **All fields are mandatory** — every template must have the full set of metadata fields
2. **Adapt from UIS** — copy UIS scripts as the starting point, modify for `TEMPLATE_*` fields
3. **Create `scripts/lib/categories.sh`** — template category definitions, adapted from UIS pattern (this repo's own file, not shared with DCT)
4. **Create `scripts/lib/logging.sh`** — copy from UIS for consistent output formatting
5. **Website generation** — `scripts/generate-templates-json.sh` produces `templates.json`, categories JSON is built into `categories.sh`
6. **Follow DCT naming convention** — `TEMPLATE_*` mirrors `SCRIPT_*` for consistency across all three repos

### Reuse Analysis: DCT vs UIS

Both DCT and UIS have metadata systems we can reuse. UIS is the better fit — it's simpler and closer to our needs.

| Component | DCT | UIS | Recommendation |
|-----------|-----|-----|----------------|
| Categories | 7-field table, `grep` parsing, abstract/summary split, 219 lines | 6-field array, loop parsing, single description, JSON built-in, 192 lines | **Use UIS** — simpler, JSON generation included |
| Scanner | `grep + cut` extraction, multiple script types | `case` statement line-by-line, safe parsing | **Use UIS** — safer (no sourcing), cleaner pattern |
| JSON generation | Separate `generate-tools-json.sh` | Built into `uis-docs.sh` | **Use UIS** — self-contained |
| Markdown generation | `dev-docs.sh` generates package/extension tables | `uis-docs-markdown.sh` generates service detail pages | **Use UIS** — closer to template pages |
| Plan indexes | *(none)* | `uis-docs-plan-indexes.sh` — directly reusable | **Use UIS** — we have the same folder structure |
| GitHub Actions | Manual trigger | Auto: generate → validate → commit → build → deploy | **Use UIS** — proven automation pipeline |

**Overall: Adapt from UIS, align field naming with DCT.** Use UIS scripts as the starting point (copy and modify), but keep `TEMPLATE_*` field names consistent with DCT's `SCRIPT_*` naming convention.

**Why `dev-docs.sh` exists:** Its purpose is to read metadata from scripts and generate the data files that the Docusaurus website needs (JSON, markdown pages). In DCT, `dev-docs.sh` reads `SCRIPT_*` fields from install scripts and generates `tools.json` + `categories.json` for the DCT Docusaurus site.

**dev-templates needs the same pattern:** This repo also has a Docusaurus site (`website/`). It needs its own script (e.g., `dev-docs.sh` or similar) that reads `TEMPLATE_*` fields from TEMPLATE_INFO files and generates `templates.json` + `categories.json` for the dev-templates Docusaurus site. The output format is the same (JSON consumed by React components), but the input is TEMPLATE_INFO files instead of install scripts.

**Key design decisions:**
- Each repo has its **own** `categories.sh` with its own category data, but following the same UIS format
- Each repo has its **own** docs generator script that reads metadata and populates its own Docusaurus site
- The scanner uses the **same** extraction mechanism — just reads `TEMPLATE_*` instead of `SCRIPT_*`
- Field naming follows the **same** convention — `TEMPLATE_ABSTRACT` mirrors `SCRIPT_ABSTRACT`, etc.
- The docs generation runs in **GitHub Actions** as part of the build — not manually

### Open: Where to place the scripts

In DCT, the metadata/docs scripts live in `.devcontainer/manage/` (e.g., `dev-docs.sh`, `generate-tools-json.sh`). This works because DCT is a devcontainer project — those scripts run inside the container.

For dev-templates, we need to decide where to place equivalent scripts:

**How UIS does it:** Generation scripts live in `provision-host/uis/manage/` (because UIS runs in a container). Scripts like `uis-docs.sh`, `uis-docs-markdown.sh`, and `uis-docs-plan-indexes.sh` scan metadata from service scripts, generate JSON (`services.json`, `categories.json`) and markdown pages, then GitHub Actions auto-commits and deploys. Supporting libraries (`categories.sh`, `service-scanner.sh`, `logging.sh`) live in `provision-host/uis/lib/`.

**How DCT does it:** Similar scripts in `.devcontainer/manage/` (`dev-docs.sh`, `generate-tools-json.sh`). Libraries in `.devcontainer/additions/lib/`.

**For dev-templates:** Scripts must NOT be in `.devcontainer/` — this repo is a template store, not a devcontainer project. The scripts just read TEMPLATE_INFO files and output JSON/markdown. They should be runnable both locally and in GitHub Actions.

**Proposed structure:**

```
dev-templates/
├── scripts/                    # Generation and validation scripts
│   ├── lib/
│   │   ├── categories.sh      # Template category definitions (UIS pattern, JSON built-in)
│   │   ├── template-scanner.sh # Reads TEMPLATE_* fields from TEMPLATE_INFO
│   │   └── logging.sh         # Output formatting (copy from UIS)
│   ├── generate-templates-json.sh  # Generates website/src/data/templates.json + categories.json
│   ├── generate-docs-markdown.sh   # Generates template detail pages for Docusaurus
│   ├── generate-plan-indexes.sh    # Generates plan folder indexes (copy from UIS)
│   └── validate-metadata.sh        # Validates all TEMPLATE_INFO mandatory fields
├── website/
│   ├── static/img/templates/       # SVG logos for templates
│   ├── static/img/categories/      # SVG logos for categories
│   ├── src/data/templates.json     # Generated by scripts (consumed by React components)
│   ├── src/data/categories.json    # Generated by scripts
│   └── src/components/             # TemplateCard, TemplateGrid (adapted from DCT)
├── .github/workflows/
│   └── deploy-docs.yml         # Calls scripts/ before npm run build
```

Note: No separate `generate-categories-json.sh` — categories JSON generation is built into `categories.sh` (UIS pattern).

**What the scripts need to do:**
1. **Generate `templates.json`** — scan all `TEMPLATE_INFO` files, output JSON for the Docusaurus site
2. **Generate `categories.json`** — from the category definitions
3. **Generate plan indexes** — auto-generate index pages for backlog/active/completed (like UIS)
4. **Validate metadata** — check all mandatory fields are present, category IDs are valid
5. **Run in CI** — GitHub Actions calls these before `npm run build` in the deploy workflow

### Reuse Analysis: UIS Generation System

UIS (`helpers-no/urbalurba-infrastructure`) has a simpler, more directly reusable system than DCT. UIS builds on DCT patterns but is closer to what dev-templates needs.

| UIS Component | Lines | Reusable? | What to do |
|---------------|-------|-----------|------------|
| `uis-docs.sh` | 506 | **High** | Copy and adapt. Rename `SCRIPT_*` → `TEMPLATE_*` in the `case` statement. Remove service-specific fields (helm_chart, namespace, playbook). Output `templates.json` instead of `services.json`. |
| `uis-docs-markdown.sh` | 550 | **Medium** | Adapt for template pages. Simpler than services (no dependency graphs, no deploy commands). Generate template detail pages from metadata. |
| `uis-docs-plan-indexes.sh` | 257 | **100%** | Directly reusable — scans `plans/{backlog,active,completed}/*.md` and generates index tables. Same folder structure in both repos. Copy as-is, update paths. |
| `categories.sh` | 192 | **High** | Copy structure, replace category data. Same pipe-delimited format, same accessor functions. |
| `service-scanner.sh` | 259 | **Medium** | Use as pattern for `template-scanner.sh`. Simpler version (fewer fields, no caching needed for 8 templates). |
| `generate-uis-docs.yml` | 123 | **High** | Copy workflow pattern: generate → validate with `jq` → auto-commit → build → deploy. Update paths and script names. |

**Why UIS is better to reuse than DCT:**
- **Same extraction pattern** — line-by-line `case` statement parsing (not `grep + cut` like DCT). 95% identical to what we need.
- **Plan indexes** — `uis-docs-plan-indexes.sh` works as-is (same folder structure)
- **GitHub Actions** — same generate → validate → commit → build → deploy pipeline
- **Simpler categories** — pipe-delimited arrays without associative arrays (bash 3.x compatible)
- **Already proven** — UIS generates 50+ service pages with this system

**Estimated effort for Phase B:**

| Task | Effort |
|------|--------|
| `categories.sh` → `scripts/lib/categories.sh` | 30 min |
| `logging.sh` → `scripts/lib/logging.sh` | 15 min |
| `service-scanner.sh` → `scripts/lib/template-scanner.sh` | 30 min |
| `uis-docs.sh` → `scripts/generate-templates-json.sh` | 1.5 hours |
| `uis-docs-markdown.sh` → `scripts/generate-docs-markdown.sh` | 2 hours |
| `uis-docs-plan-indexes.sh` → `scripts/generate-plan-indexes.sh` | 15 min |
| `scripts/validate-metadata.sh` (new) | 1 hour |
| React components (TemplateCard, TemplateGrid) | 2-3 hours |
| Template logos (SVG, 8 templates) | 1-2 hours |
| GitHub Actions workflow update | 20 min |
| Add remaining metadata fields to all TEMPLATE_INFO | 1 hour |
| Testing | 1-2 hours |
| **Total** | **~11-14 hours** |

### Reference: UIS Files to Study

The UIS repo has a complete generation system that should be studied and adapted:

**Generation scripts:**
- `<UIS>/provision-host/uis/manage/uis-docs.sh` — JSON generation. Scans service scripts, outputs `services.json`, `categories.json`, `stacks.json`. Line-by-line parsing with `case` statements.
- `<UIS>/provision-host/uis/manage/uis-docs-markdown.sh` — Markdown generation. Creates service detail pages and category index pages with Docusaurus frontmatter.
- `<UIS>/provision-host/uis/manage/uis-docs-plan-indexes.sh` — Plan index generation. Scans plan files, generates index tables. Directly reusable.

**Libraries:**
- `<UIS>/provision-host/uis/lib/categories.sh` — Category definitions in pipe-delimited format with accessor functions.
- `<UIS>/provision-host/uis/lib/service-scanner.sh` — Metadata extraction library with caching.
- `<UIS>/provision-host/uis/lib/logging.sh` — Color output utilities.

**GitHub Actions:**
- `<UIS>/.github/workflows/generate-uis-docs.yml` — Orchestration: generate → validate JSON with `jq` → auto-commit → build Docusaurus → deploy to GitHub Pages.

Where `<UIS>` = the `helpers-no/urbalurba-infrastructure` repo root.

### Reference: DCT Files to Study

The devcontainer-toolbox repo has a mature system for tool metadata, categories, website generation, and logos. The dev-templates maintainer should study these files to follow the same patterns:

**Category definitions:**
- `<DCT>/.devcontainer/additions/lib/categories.sh` — defines all categories with ID, name, abstract, summary, tags, logo. Pipe-delimited table format. Template categories should follow the same structure.

**Metadata scanning:**
- `<DCT>/.devcontainer/additions/lib/component-scanner.sh` — scans install scripts and extracts metadata fields. The template equivalent would scan TEMPLATE_INFO files.

**Website data generation:**
- `<DCT>/.devcontainer/manage/dev-docs.sh` — generates `tools.json` and `categories.json` from script metadata. A similar script could generate `templates.json` from TEMPLATE_INFO.
- `<DCT>/website/src/data/tools.json` — generated JSON consumed by the Docusaurus website. Contains all tool metadata for display.
- `<DCT>/website/src/data/categories.json` — generated JSON with category display info.

**Logo processing:**
- `<DCT>/.devcontainer/manage/dev-logos.sh` — converts SVG source logos to optimized WebP for the website. Requires ImageMagick, librsvg2-bin, and webp tools.
- `<DCT>/website/static/img/tools/src/` — SVG source logos for tools.
- `<DCT>/website/static/img/categories/src/` — SVG source logos for categories.

**Note:** UIS uses SVG directly — no conversion to WebP. UIS has no logo conversion script and no image tools installed. Logos are stored as SVG in `website/static/img/services/` and served directly. This is simpler and avoids the ImageMagick dependency. **dev-templates should follow the UIS pattern** — use SVG directly, no conversion step.

**Website components (React):**
- `<DCT>/website/src/components/` — ToolCard, ToolGrid, and other components that render tool data. Template cards would follow the same pattern.

**Script metadata format reference:**
- `<DCT>/.devcontainer/additions/addition-templates/_template-install-script.sh` — the full template showing all metadata fields with documentation. Shows core vs extended metadata separation.
- `<DCT>/website/docs/ai-developer/CREATING-SCRIPTS.md` — documents the metadata fields, required vs optional, guidelines for each field.

Where `<DCT>` = the `helpers-no/devcontainer-toolbox` repo root (locally at `/Users/terje.christensen/learn/helpers/devcontainer-toolbox` or `/workspace` inside the devcontainer).

---

## Questions to Answer

### README revision
1. ~~Should READMEs be completely rewritten or just trimmed?~~ — **Analyse the code and update/rewrite** based on what each template actually does
2. ~~Should there be a standard README template/structure that all templates follow?~~ — **Yes**, a standard structure makes it easy to create new templates
3. ~~Should the README mention `source ~/.bashrc`?~~ — **Yes**, can mention it
4. ~~How should AI template READMEs be handled?~~ — **Yes**, same pattern

### Extended metadata
5. ~~Which fields are essential for the first iteration?~~ — **Answered**: All fields are mandatory (see table above). Add them all at once since the software is not released.
6. ~~Should we generate a `templates.json` like DCT generates `tools.json`?~~ — **Answered**: Yes, adapt UIS pattern.
7. ~~Should the website have a templates page similar to the tools page?~~ — **Answered**: Yes, adapt DCT/UIS React components.
8. ~~Should `TEMPLATE_ID` replace the directory name as the primary identifier?~~ — **Answered**: Yes, add `TEMPLATE_ID` to all TEMPLATE_INFO files. The directory name stays as the filesystem identifier, but `TEMPLATE_ID` is used in JSON, website, and cross-references.

---

## Implementation Strategy

**Principle: Complete all dev-templates work first, then update DCT.**

Doing all metadata, README, and Docusaurus work in this repo first means we can validate everything locally before touching DCT. If field names, structures, or formats need to change, we only modify one repo. Once the metadata is stable and tested, DCT picks it up in one coordinated update.

### Phase A: TEMPLATE_README + README Revision (this repo)

**Why first:** The most impactful change — makes template READMEs useful and adds the `TEMPLATE_README` field that DCT will need.

1. Rename `TEMPLATE_PURPOSE` → `TEMPLATE_ABSTRACT` in all 8 TEMPLATE_INFO files
2. Add `TEMPLATE_README` to all 8 TEMPLATE_INFO files
3. Revise all 7 app template READMEs to follow the standard structure
4. Create `README-plan-based-workflow.md` for the ai-template

**Result:** All TEMPLATE_INFO files have `TEMPLATE_ABSTRACT` and `TEMPLATE_README`. All READMEs follow a consistent standard structure.

### Phase B: Full Metadata + Generation Scripts (this repo)

**Why second:** With READMEs done, add the remaining metadata fields and build the Docusaurus generation pipeline.

1. Add all remaining metadata fields to TEMPLATE_INFO (`TEMPLATE_ID`, `TEMPLATE_VER`, `TEMPLATE_TAGS`, `TEMPLATE_SUMMARY`, `TEMPLATE_LOGO`, `TEMPLATE_WEBSITE`, `TEMPLATE_DOCS`, `TEMPLATE_RELATED`)
2. Create `scripts/lib/categories.sh` (adapted from UIS, includes JSON generation)
3. Create `scripts/lib/template-scanner.sh` (adapted from UIS `service-scanner.sh`)
4. Create `scripts/lib/logging.sh` (copy from UIS)
5. Create `scripts/generate-templates-json.sh` (adapted from UIS `uis-docs.sh`)
6. Create `scripts/generate-docs-markdown.sh` (adapted from UIS `uis-docs-markdown.sh`)
7. Create `scripts/generate-plan-indexes.sh` (copy from UIS `uis-docs-plan-indexes.sh`)
8. Create `scripts/validate-metadata.sh` (check all mandatory fields, validate category IDs)
9. Create Docusaurus React components for template display (TemplateCard, TemplateGrid — adapted from DCT's ToolCard/ToolGrid)
10. Update `.github/workflows/deploy-docs.yml` to run generation and validation scripts before build
11. Create template logos (SVG — no conversion needed, following UIS pattern)

**Result:** Docusaurus site auto-generates from metadata. Template cards, category pages, and plan indexes appear on the website. Metadata is validated. Everything works and is testable in this repo alone.

### Phase C: DCT Script Updates (DCT repo — after dev-templates is stable)

**Why last:** Only update DCT once the metadata format is finalised and tested in dev-templates. This avoids back-and-forth between repos if field names or formats change.

**DCT repo:**
1. Update `read_template_info()` to read `TEMPLATE_ABSTRACT` (renamed from `TEMPLATE_PURPOSE`) and `TEMPLATE_README`
2. Update completion message to display README path and `source ~/.bashrc`
3. Update `dev-template.sh` to read and display extended metadata (tags, website, related)
4. Update `dev-template-ai.sh` (when implemented) to use the same metadata
5. Potentially add `dev-template --list` with rich output from metadata

**DCT companion plans:**
- `PLAN-template-readme-instructions.md` — TEMPLATE_README + ABSTRACT rename in `read_template_info()`
- `PLAN-template-tools-dct.md` — TEMPLATE_TOOLS support (already completed on dev-templates side)

---

## Next Steps

- [ ] Create PLAN for Phase A (TEMPLATE_README + README revision + PURPOSE→ABSTRACT rename)
- [ ] Create PLAN for Phase B (full metadata + generation scripts)
- [ ] Phase C is tracked in DCT repo
