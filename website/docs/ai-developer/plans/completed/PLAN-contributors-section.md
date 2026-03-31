# Plan: Add Contributors Section to Docusaurus Site

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Completed

**Completed**: 2026-03-31

**Goal**: Add a minimum viable "Contributors" section to the Docusaurus site with guides for creating templates, metadata reference, naming conventions, scripts reference, and basic rules.

**Investigation**: [INVESTIGATE-contributors-section.md](../backlog/INVESTIGATE-contributors-section.md)

**Last Updated**: 2026-03-31

---

## Overview

Create the initial contributor documentation with placeholder content that will be fleshed out later. The structure follows UIS patterns. Content should be accurate but concise — full detail comes in future iterations.

---

## Phase 1: Create Contributor Pages

### Tasks

- [ ] 1.1 Create `website/docs/contributors/index.md`:
  - Ways to contribute (create template, fix bugs, improve docs, file issues)
  - Quick start (fork, clone, create template folder, run validation, submit PR)
  - Links to guides and rules

- [ ] 1.2 Create `website/docs/contributors/creating-a-template.md`:
  - Step-by-step guide:
    1. Create folder in `templates/` (or `ai-templates/`)
    2. Create `TEMPLATE_INFO` with all mandatory fields
    3. Add application code, Dockerfile, manifests, GitHub Actions workflow
    4. Create README following the standard structure
    5. Add logo SVG in `website/static/img/templates/`
    6. Test locally: run `validate-metadata.sh`, `validate-docs.sh`, `generate-templates-json.sh`, `npm run build`
  - How `dev-template.sh` discovers and installs templates (zip download, TEMPLATE_INFO scan, file copy, placeholder replacement)
  - What happens on push: GitHub Actions validates, generates JSON + markdown + plan indexes, builds and deploys Docusaurus
  - Required files vs optional files

- [ ] 1.3 Create `website/docs/contributors/template-metadata.md`:
  - Table of all TEMPLATE_INFO fields: field name, description, example, required/optional
  - Complete example TEMPLATE_INFO (copy from investigation)
  - Notes on field naming convention (mirrors DCT `SCRIPT_*` fields)

- [ ] 1.4 Create `website/docs/contributors/naming-conventions.md`:
  - Template directory names: lowercase, hyphenated (e.g., `python-basic-webserver`)
  - `TEMPLATE_ID` must match directory name
  - `TEMPLATE_CATEGORY` values: `BASIC_WEB_SERVER`, `WEB_APP`, `WORKFLOW`
  - README naming: `README-<template-name>.md`
  - Logo naming: `<template-name>-logo.svg`
  - Category logo naming: `<category>-logo.svg`

- [ ] 1.5 Create `website/docs/contributors/scripts-reference.md`:
  - Table of all scripts in `scripts/` with description, usage, when to run
  - `validate-metadata.sh` — checks all TEMPLATE_INFO fields, validates categories, checks README exists
  - `validate-docs.sh` — checks MDX compatibility, broken links, README structure (reads rules from `validate-rules.conf`)
  - `generate-templates-json.sh` — generates `templates.json` + `categories.json` for Docusaurus
  - `generate-docs-markdown.sh` — generates MDX detail pages + category index pages
  - `generate-plan-indexes.sh` — generates plan folder index tables
  - How to add validation rules to `validate-rules.conf`

- [ ] 1.6 Create `website/docs/contributors/readme-structure.md`:
  - Standard README structure (Quick Start, Prerequisites, Project Structure, Development, Docker Build, Kubernetes Deployment, CI/CD)
  - Which sections are required vs optional
  - Example showing the template

### Validation

All pages exist and render in Docusaurus. `npm run build` succeeds.

---

## Phase 2: Add Navbar and Sidebar Configuration

### Tasks

- [ ] 2.1 Add "Contributors" to navbar in `website/docusaurus.config.ts`
- [ ] 2.2 Create `website/docs/contributors/_category_.json` for Docusaurus sidebar

### Validation

"Contributors" appears in the navbar and links to the contributors index. Sidebar shows all pages.

---

## Phase 3: Update Generation Script

### Tasks

- [ ] 3.1 Update `scripts/generate-docs-markdown.sh` to also generate `_category_.json` for contributors (if needed)
- [ ] 3.2 Verify `validate-docs.sh` covers the new contributor pages

### Validation

```bash
bash scripts/validate-docs.sh    # passes with new pages
npm run build --prefix website   # builds successfully
```

---

## Acceptance Criteria

- [ ] Contributors section exists with 6 pages (index, creating-a-template, template-metadata, naming-conventions, scripts-reference, readme-structure)
- [ ] "Contributors" appears in the Docusaurus navbar
- [ ] Creating-a-template guide covers the full lifecycle (create → test → push → auto-deploy)
- [ ] Template metadata reference lists all mandatory fields with examples
- [ ] Scripts reference documents all scripts in `scripts/`
- [ ] `npm run build` succeeds
- [ ] `validate-docs.sh` passes

---

## Files to Create

```
website/docs/contributors/
├── _category_.json
├── index.md
├── creating-a-template.md
├── template-metadata.md
├── naming-conventions.md
├── scripts-reference.md
└── readme-structure.md
```

## Files to Modify

- `website/docusaurus.config.ts` — add Contributors to navbar
