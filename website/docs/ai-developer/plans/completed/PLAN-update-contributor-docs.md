# Plan: Update Contributor Documentation

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Completed

**Completed**: 2026-04-13 — all phases were finished by 2026-04-06 (every task `[x]`, every phase marked DONE, every acceptance criterion checked) but the file was never moved out of `active/`. This commit applies the closing ritual: status header → Completed, file moved from `active/` to `completed/`. No content changes beyond the header.

**Goal**: Update all contributor documentation to reflect the unified template system.

**Investigation**: [INVESTIGATE-update-contributor-docs.md](INVESTIGATE-update-contributor-docs.md)

**Priority**: ~~High~~ — closed

**Last Updated**: 2026-04-13

---

## Overview

Documentation-only changes. No code changes. All information comes from the completed investigation and implemented code.

---

## Phase 1: Major rewrites — DONE

### Tasks

- [x] 1.1 Rewrite `website/docs/contributors/creating-a-template.md`
  - "How Templates Work" — registry-based flow (curl registry → browse → sparse-checkout)
  - Step-by-step using `template-info.yaml` (YAML format, all fields)
  - Remove all `dev-template-ai` references — unified `dev-template` command
  - Add section: creating an overlay template (`install_type: overlay`)
  - Add section: creating a template with service dependencies (`requires`, `params`, `init` files)
  - Update "What Happens After You Push" — new CI pipeline (generate-registry.ts)
  - Update file checklist table (template-info.yaml replaces TEMPLATE_INFO)

- [x] 1.2 Rewrite `website/docs/contributors/scripts-reference.md`
  - Replace `generate-templates-json.sh` with `generate-registry.ts` / `generate-registry.sh`
  - Remove `categories.sh` and `template-scanner.sh` from library scripts table
  - Update `validate-metadata.sh` description (validates YAML with node + js-yaml)
  - Update `generate-docs-markdown.sh` description (reads from template-registry.json with jq)
  - Update CI pipeline flow diagram

### Validation

No references to TEMPLATE_INFO, TEMPLATE_CATEGORIES, generate-templates-json.sh, categories.sh, template-scanner.sh, or dev-template-ai in either file.

---

## Phase 2: Minor updates — DONE

### Tasks

- [x] 2.1 Update `website/docs/contributors/readme-structure.md`
- [x] 2.2 Update `website/docs/contributors/index.md`
- [x] 2.3 Verify `website/docs/contributors/naming-conventions.md` — clean
- [x] 2.4 Verify `website/docs/contributors/template-metadata.md` — clean

### Validation

Grep all contributor docs for old references. Zero matches.

---

## Phase 3: Architecture extension — DONE

### Tasks

- [x] 3.1 Extend `website/docs/architecture.md`
  - Add section: template system architecture (YAML → registry → Docusaurus + installers)
  - Add diagram: two execution contexts (DCT devcontainer, UIS provision-host)
  - Add diagram: connection pattern (DCT → uis-bridge → UIS → kubectl → K8s)
  - Add section: three-project relationship (TMP as glue between DCT and UIS)

### Validation

Architecture page describes the complete template system. Diagrams render correctly.

---

## Phase 4: Final validation

### Tasks

- [x] 4.1 Run `bash scripts/validate-docs.sh` — 0 errors, 4 warnings (optional headings only)
- [x] 4.2 Run `npm run build` — builds successfully
- [x] 4.3 Grep all contributor + architecture docs for stale references — zero matches

### Validation

Zero stale references. Build passes. All contributor docs are accurate.

---

## Acceptance Criteria

- [x] No references to old format (TEMPLATE_INFO, TEMPLATE_CATEGORIES) in contributor docs
- [x] Creating a Template guide covers all install types (app, overlay, stack) and service dependencies
- [x] Scripts Reference matches the actual scripts in the repo
- [x] Architecture page describes the template system with mermaid diagrams
- [x] Docusaurus build passes

---

## Files to Modify

- `website/docs/contributors/creating-a-template.md` (major rewrite)
- `website/docs/contributors/scripts-reference.md` (major rewrite)
- `website/docs/contributors/readme-structure.md` (minor)
- `website/docs/contributors/index.md` (minor)
- `website/docs/architecture.md` (extend)
