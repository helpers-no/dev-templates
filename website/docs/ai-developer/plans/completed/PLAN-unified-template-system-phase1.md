# Plan: Unified Template System — TMP Phase 1

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Completed

**Completed**: 2026-04-04

**Goal**: Migrate template metadata from bash `TEMPLATE_INFO` + `TEMPLATE_CATEGORIES` to YAML (`template-info.yaml` + `template-categories.yaml`), generate a unified `template-registry.json`, and update Docusaurus to consume it.

**Investigation**: [INVESTIGATE-unified-template-system.md](../completed/INVESTIGATE-unified-template-system.md)

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

## Phase 1: Create YAML metadata files — DONE

### Tasks

- [x] 1.1 Create `templates/template-categories.yaml` with `context: dct`, categories `BASIC_WEB_SERVER` and `WEB_APP` (migrate from `TEMPLATE_CATEGORIES`)
- [x] 1.2 Create `ai-templates/template-categories.yaml` with `context: dct`, category `WORKFLOW`
- [x] 1.3 Create `template-info.yaml` for all 7 app templates (python, typescript, php, golang, java, csharp, designsystemet) — migrate fields from `TEMPLATE_INFO`, add `install_type: app`
- [x] 1.4 Create `template-info.yaml` for `plan-based-workflow` — migrate fields from `TEMPLATE_INFO`, add `install_type: overlay`
- [x] 1.5 Validate all YAML files parse correctly (no syntax errors)

### Validation

All 10 YAML files exist and are valid. Field values match current `TEMPLATE_INFO` content. `install_type` is set correctly (`app` for templates/, `overlay` for ai-templates/).

---

## Phase 2: TypeScript generation script — DONE

### Tasks

- [x] 2.1 Create `scripts/generate-registry.ts` that scans `*/template-categories.yaml` + `*/*/template-info.yaml` and outputs `website/src/data/template-registry.json`
- [x] 2.2 The script validates: category IDs are unique across folders, each template's `category` matches a defined category, required fields are present, `id` matches directory name
- [x] 2.3 The generated `template-registry.json` contains both `categories` and `templates` arrays (format as defined in the investigation spec)
- [x] 2.4 Create `scripts/generate-registry.sh` as a wrapper that runs the TypeScript script (matching pattern of existing bash wrappers)
- [x] 2.5 Run the script and verify the output matches the current `templates.json` + `categories.json` content (same data, new format)

### Implementation Notes

- Use `js-yaml` for YAML parsing (already a Docusaurus dependency, or add to devDependencies)
- The script should fail with clear errors on validation failures — not silently generate bad JSON
- Output format follows the investigation spec exactly (see "Generated Registry" section)
- Tags: `template-info.yaml` uses YAML list, registry JSON uses space-separated string (for backward compatibility with Docusaurus components — can be changed to array later)

### Validation

`template-registry.json` is generated. Contains all 8 templates and 3 categories. Data matches current JSON files.

---

## Phase 3: Update Docusaurus components — DONE

### Tasks

- [x] 3.1 Update `website/src/utils/data.ts` to import from `template-registry.json` instead of `templates.json` + `categories.json`
- [x] 3.2 Update types: `Template` (added `folder`, `install_type`, `context`, removed `type`), `Category` (added `emoji`, `context`, removed `icon`)
- [ ] 3.3 Update `generate-docs-markdown.sh` to read from registry — **deferred to Phase 5** (still works with old TEMPLATE_INFO files during transition)
- [x] 3.4 Fixed broken links to moved investigation file (INVESTIGATE-dct-template-metadata-update.md)
- [x] 3.5 Run `npm run build` in devcontainer — builds successfully

### Implementation Notes

- `data.ts` currently exports: `getTemplates()`, `getCategories()`, `getTemplatesByCategory()`, `getTemplateById()`, `getCategoryById()`, `getTemplateCountByCategory()`. All must keep working.
- The `TemplateHeader` component uses: name, version, description, tags, logo, docs, website. Verify these fields exist in the registry.
- `generate-docs-markdown.sh` currently sources `TEMPLATE_INFO` bash files. It needs to read from JSON instead (use `jq`).

### Validation

`npm run build` succeeds. Template pages render with correct data. No visual regressions on the website.

---

## Phase 4: Update CI pipeline — DONE

### Tasks

- [x] 4.1 Add `npx tsx scripts/generate-registry.ts` step to CI (runs after old JSON generation)
- [x] 4.2 Keep "Sync TEMPLATE_CATEGORIES" step — still needed during transition (deferred removal to Phase 5)
- [x] 4.3 Add Node.js setup + `npm ci` to the `generate` job (needed for tsx and js-yaml)
- [x] 4.4 Add YAML trigger paths (`template-info.yaml`, `template-categories.yaml`) to workflow
- [ ] 4.5 Push to main and verify CI runs successfully — **after PR merge**
- [ ] 4.4 Update `validate-metadata.sh` — **deferred to Phase 5** (old validation still works during transition)

### Implementation Notes

- Keep `generate-templates-json.sh` temporarily — it still generates the old JSON files that DCT's current scripts read via sparse-checkout. Remove it only after DCT Phase A ships.
- The CI should generate both old and new formats during the transition period.

### Validation

CI pipeline runs green. `template-registry.json` is auto-generated and committed. Website deploys with correct data.

---

## Phase 5: Cleanup (after DCT Phase A ships) — DONE

DCT Phase A confirmed complete (23MSG). Old format files removed.

### Tasks

- [x] 5.1 Remove `TEMPLATE_INFO` files from all template directories (8 files)
- [x] 5.2 Remove `scripts/lib/TEMPLATE_CATEGORIES`
- [x] 5.3 Remove `templates/TEMPLATE_CATEGORIES` and `ai-templates/TEMPLATE_CATEGORIES` (CI-copied files)
- [x] 5.4 Remove `website/src/data/templates.json` and `website/src/data/categories.json`
- [x] 5.5 Remove `scripts/generate-templates-json.sh` (old generation script)
- [x] 5.6 Remove `scripts/lib/categories.sh` and `scripts/lib/template-scanner.sh` (no longer needed)
- [x] 5.7 Remove CI sync step for TEMPLATE_CATEGORIES and old JSON generation step
- [x] 5.8 Update `website/docs/contributors/naming-conventions.md` to reference `template-info.yaml`
- [x] 5.9 Update `website/docs/contributors/template-metadata.md` to document YAML format
- [x] 5.10 Update `validate-metadata.sh` to validate YAML files (uses node + js-yaml)
- [x] 5.11 Update `generate-docs-markdown.sh` to read from `template-registry.json` (uses jq)

### Validation

No old-format files remain. CI runs clean. Website still works. DCT confirms no breakage.

---

## Acceptance Criteria

- [x] `template-categories.yaml` exists in `templates/` and `ai-templates/`
- [x] `template-info.yaml` exists in all 8 template directories
- [x] `template-registry.json` is auto-generated by CI from YAML source files
- [x] Docusaurus website renders correctly from the registry
- [x] All existing template data is preserved (no fields lost in migration)
- [x] Old formats coexisted during transition, then removed after DCT Phase A confirmed complete
- [x] CI pipeline is green (PR #20 Phase 1-4, PR #21 Phase 5)

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
