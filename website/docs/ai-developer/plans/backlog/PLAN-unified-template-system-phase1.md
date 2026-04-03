# Plan: Unified Template System — TMP Phase 1

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Backlog

**Goal**: Migrate template metadata from bash `TEMPLATE_INFO` + `TEMPLATE_CATEGORIES` to YAML (`template-info.yaml` + `template-categories.yaml`), generate a unified `template-registry.json`, and update Docusaurus to consume it.

**Investigation**: [INVESTIGATE-unified-template-system.md](../backlog/INVESTIGATE-unified-template-system.md)

**Blocks**: DCT Phase A cannot start until this is done (DCT needs the published registry)

**Priority**: High

**Last Updated**: 2026-04-04

---

## Overview

TMP Phase 1 is the foundation that enables everything else. It replaces the current bash-based metadata system with YAML files and a generated JSON registry. No other team needs to change anything until this is done.

**What changes:**
- Each template folder gets a `template-categories.yaml` (replaces `TEMPLATE_CATEGORIES`)
- Each template gets a `template-info.yaml` (replaces `TEMPLATE_INFO`)
- A TypeScript generation script produces `template-registry.json` (replaces `templates.json` + `categories.json`)
- Docusaurus components switch from two JSON files to one registry
- CI pipeline runs the new generation and drops the old sync step

**What stays the same during Phase 1:**
- DCT's `dev-template.sh` and `dev-template-ai.sh` keep working (old `TEMPLATE_INFO` files stay until DCT migrates in Phase A)
- The old bash `TEMPLATE_CATEGORIES` files stay until DCT migrates
- No new template types added yet (no `doc-templates/`, `rules-templates/`, etc.)

**Backward compatibility:** Both old (`TEMPLATE_INFO`, `TEMPLATE_CATEGORIES`) and new (`template-info.yaml`, `template-categories.yaml`) files coexist during the transition. Old files are removed only after DCT Phase A ships.

---

## Phase 1: Create YAML metadata files

### Tasks

- [ ] 1.1 Create `templates/template-categories.yaml` with `context: dct`, categories `BASIC_WEB_SERVER` and `WEB_APP` (migrate from `TEMPLATE_CATEGORIES`)
- [ ] 1.2 Create `ai-templates/template-categories.yaml` with `context: dct`, category `WORKFLOW`
- [ ] 1.3 Create `template-info.yaml` for all 7 app templates (python, typescript, php, golang, java, csharp, designsystemet) — migrate fields from `TEMPLATE_INFO`, add `install_type: app`
- [ ] 1.4 Create `template-info.yaml` for `plan-based-workflow` — migrate fields from `TEMPLATE_INFO`, add `install_type: overlay`
- [ ] 1.5 Validate all YAML files parse correctly (no syntax errors)

### Validation

All 10 YAML files exist and are valid. Field values match current `TEMPLATE_INFO` content. `install_type` is set correctly (`app` for templates/, `overlay` for ai-templates/).

---

## Phase 2: TypeScript generation script

### Tasks

- [ ] 2.1 Create `scripts/generate-registry.ts` that scans `*/template-categories.yaml` + `*/*/template-info.yaml` and outputs `website/src/data/template-registry.json`
- [ ] 2.2 The script validates: category IDs are unique across folders, each template's `category` matches a defined category, required fields are present, `id` matches directory name
- [ ] 2.3 The generated `template-registry.json` contains both `categories` and `templates` arrays (format as defined in the investigation spec)
- [ ] 2.4 Create `scripts/generate-registry.sh` as a wrapper that runs the TypeScript script (matching pattern of existing bash wrappers)
- [ ] 2.5 Run the script and verify the output matches the current `templates.json` + `categories.json` content (same data, new format)

### Implementation Notes

- Use `js-yaml` for YAML parsing (already a Docusaurus dependency, or add to devDependencies)
- The script should fail with clear errors on validation failures — not silently generate bad JSON
- Output format follows the investigation spec exactly (see "Generated Registry" section)
- Tags: `template-info.yaml` uses YAML list, registry JSON uses space-separated string (for backward compatibility with Docusaurus components — can be changed to array later)

### Validation

`template-registry.json` is generated. Contains all 8 templates and 3 categories. Data matches current JSON files.

---

## Phase 3: Update Docusaurus components

### Tasks

- [ ] 3.1 Update `website/src/utils/data.ts` to import from `template-registry.json` instead of `templates.json` + `categories.json`
- [ ] 3.2 Update or add accessor functions for any new fields (`install_type`, `abstract`, `summary` — verify which fields the components actually use)
- [ ] 3.3 Update `generate-docs-markdown.sh` to read template metadata from `template-registry.json` instead of scanning `TEMPLATE_INFO` files
- [ ] 3.4 Verify all Docusaurus pages render correctly (template cards, detail pages, category pages)
- [ ] 3.5 Run `npm run build` in website/ to verify no build errors

### Implementation Notes

- `data.ts` currently exports: `getTemplates()`, `getCategories()`, `getTemplatesByCategory()`, `getTemplateById()`, `getCategoryById()`, `getTemplateCountByCategory()`. All must keep working.
- The `TemplateHeader` component uses: name, version, description, tags, logo, docs, website. Verify these fields exist in the registry.
- `generate-docs-markdown.sh` currently sources `TEMPLATE_INFO` bash files. It needs to read from JSON instead (use `jq`).

### Validation

`npm run build` succeeds. Template pages render with correct data. No visual regressions on the website.

---

## Phase 4: Update CI pipeline

### Tasks

- [ ] 4.1 Add `generate-registry.sh` step to `.github/workflows/deploy-docs.yml` (replaces `generate-templates-json.sh`)
- [ ] 4.2 Remove the "Sync TEMPLATE_CATEGORIES" step (no longer needed — each folder has its own YAML)
- [ ] 4.3 Update the "Commit generated files" step to include `template-registry.json` instead of `templates.json` + `categories.json`
- [ ] 4.4 Update `validate-metadata.sh` to validate `template-info.yaml` files (in addition to or instead of `TEMPLATE_INFO`)
- [ ] 4.5 Push to main and verify CI runs successfully

### Implementation Notes

- Keep `generate-templates-json.sh` temporarily — it still generates the old JSON files that DCT's current scripts read via sparse-checkout. Remove it only after DCT Phase A ships.
- The CI should generate both old and new formats during the transition period.

### Validation

CI pipeline runs green. `template-registry.json` is auto-generated and committed. Website deploys with correct data.

---

## Phase 5: Cleanup (after DCT Phase A ships)

This phase is **blocked** until DCT confirms their Phase A migration is complete and they no longer read `TEMPLATE_INFO` or `TEMPLATE_CATEGORIES`.

### Tasks

- [ ] 5.1 Remove `TEMPLATE_INFO` files from all template directories (8 files)
- [ ] 5.2 Remove `scripts/lib/TEMPLATE_CATEGORIES`
- [ ] 5.3 Remove `templates/TEMPLATE_CATEGORIES` and `ai-templates/TEMPLATE_CATEGORIES` (CI-copied files)
- [ ] 5.4 Remove `website/src/data/templates.json` and `website/src/data/categories.json`
- [ ] 5.5 Remove `scripts/generate-templates-json.sh` (old generation script)
- [ ] 5.6 Remove `scripts/lib/categories.sh` (bash category accessor — no longer needed)
- [ ] 5.7 Remove the CI sync step for TEMPLATE_CATEGORIES if still present
- [ ] 5.8 Update `website/docs/contributors/naming-conventions.md` to reference `template-info.yaml` instead of `TEMPLATE_INFO`
- [ ] 5.9 Update any other docs that reference the old formats

### Validation

No old-format files remain. CI runs clean. Website still works. DCT confirms no breakage.

---

## Acceptance Criteria

- [ ] `template-categories.yaml` exists in `templates/` and `ai-templates/`
- [ ] `template-info.yaml` exists in all 8 template directories
- [ ] `template-registry.json` is auto-generated by CI from YAML source files
- [ ] Docusaurus website renders correctly from the registry
- [ ] All existing template data is preserved (no fields lost in migration)
- [ ] Old formats coexist during transition (no breaking changes for DCT)
- [ ] CI pipeline is green

---

## Files to Create

- `templates/template-categories.yaml`
- `ai-templates/template-categories.yaml`
- `templates/*/template-info.yaml` (7 files)
- `ai-templates/plan-based-workflow/template-info.yaml`
- `scripts/generate-registry.ts`
- `scripts/generate-registry.sh`

## Files to Modify

- `website/src/utils/data.ts`
- `website/src/data/` (new `template-registry.json`)
- `scripts/generate-docs-markdown.sh`
- `scripts/validate-metadata.sh`
- `.github/workflows/deploy-docs.yml`
- `website/docs/contributors/naming-conventions.md`

## Files to Remove (Phase 5, after DCT Phase A)

- `templates/*/TEMPLATE_INFO` (7 files)
- `ai-templates/plan-based-workflow/TEMPLATE_INFO`
- `scripts/lib/TEMPLATE_CATEGORIES`
- `templates/TEMPLATE_CATEGORIES`
- `ai-templates/TEMPLATE_CATEGORIES`
- `website/src/data/templates.json`
- `website/src/data/categories.json`
- `scripts/generate-templates-json.sh`
- `scripts/lib/categories.sh`
