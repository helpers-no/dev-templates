# Investigate: Update Contributor Documentation

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Backlog

**Goal**: Update all contributor documentation to reflect the unified template system — YAML metadata, template-registry.json, unified `dev-template` command, and the new template types (app, overlay, stack).

**Priority**: High

**Last Updated**: 2026-04-06

---

## Context

The unified template system shipped across all three teams (TMP, DCT, UIS) — see [completed investigation](../completed/INVESTIGATE-unified-template-system.md). The contributor docs still reference the old system:

- `TEMPLATE_INFO` bash format (replaced by `template-info.yaml`)
- `TEMPLATE_CATEGORIES` pipe-delimited file (replaced by `template-categories.yaml`)
- `dev-template-ai` as a separate command (merged into `dev-template`)
- `generate-templates-json.sh` (replaced by `generate-registry.ts`)
- `categories.sh` and `template-scanner.sh` (removed)
- Old scanning approach (sparse-checkout whole folder → scan directories)
- Missing: new template types (`overlay`, `stack`), `requires`, `params`, `provides`, `env_var`, `install_type`

---

## Files to Update

### 1. `website/docs/contributors/creating-a-template.md` — Major rewrite

**Current state:** Describes old flow (TEMPLATE_INFO, dev-template-ai, zip download, scanning directories). Step-by-step guide is entirely based on the old format.

**Needed:**
- Rewrite "How Templates Work" to describe registry-based flow (curl registry → browse → sparse-checkout selected template)
- Replace step 2 "Create TEMPLATE_INFO" with "Create template-info.yaml" using the YAML spec
- Remove references to `dev-template-ai` — everything is `dev-template` now
- Add section for creating different template types (`install_type: app` vs `overlay` vs `stack`)
- Add section for templates with service dependencies (`requires`, `params`, `config`, `init` files)
- Update "What Happens After You Push" to describe the new CI pipeline (generate-registry.ts)
- Update the file checklist table (template-info.yaml replaces TEMPLATE_INFO)

### 2. `website/docs/contributors/scripts-reference.md` — Major rewrite

**Current state:** References removed scripts (generate-templates-json.sh, categories.sh, template-scanner.sh). Describes old CI pipeline.

**Needed:**
- Replace `generate-templates-json.sh` with `generate-registry.ts` / `generate-registry.sh`
- Remove `categories.sh` and `template-scanner.sh` from library scripts
- Update `validate-metadata.sh` description (now validates YAML files with node + js-yaml)
- Update `generate-docs-markdown.sh` description (now reads from template-registry.json with jq)
- Update CI pipeline flow diagram

### 3. `website/docs/contributors/readme-structure.md` — Minor update

**Current state:** Project structure template shows `TEMPLATE_INFO` file.

**Needed:**
- Replace `TEMPLATE_INFO` with `template-info.yaml` in the project structure example

### 4. `website/docs/contributors/index.md` — Minor update

**Current state:** Quick start section references `TEMPLATE_INFO`, `generate-templates-json.sh`.

**Needed:**
- Update quick start steps to use `template-info.yaml` and `generate-registry.sh`
- Update guide descriptions

### 5. `website/docs/contributors/naming-conventions.md` — Already updated

Updated in Phase 5 cleanup (PR #21). Verify no remaining old references.

### 6. `website/docs/contributors/template-metadata.md` — Already updated

Updated in Phase 5 cleanup (PR #21). Verify no remaining old references.

### 7. `website/docs/architecture.md` — Extend

**Current state:** Shows basic platform architecture but doesn't mention the template system, registry, or the three-project relationship (TMP/DCT/UIS).

**Needed:**
- Add section on the template system architecture
- Show how templates flow: YAML → registry → Docusaurus + installers
- Show the two execution contexts (DCT devcontainer, UIS provision-host)
- Show the connection pattern (DCT → uis-bridge → UIS → kubectl → K8s)

---

## Approach

This is a documentation-only change — no code changes. All the information needed is in the completed investigation and the implemented code. The goal is to make the contributor docs accurate and useful for someone creating their first template.

---

## Next Steps

- [ ] Create PLAN for the documentation update
