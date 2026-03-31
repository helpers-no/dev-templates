# Plan: TEMPLATE_README, PURPOSE→ABSTRACT Rename, and README Revision

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Completed

**Completed**: 2026-03-31

**Goal**: Add `TEMPLATE_README` field, rename `TEMPLATE_PURPOSE` to `TEMPLATE_ABSTRACT`, and revise all template READMEs to follow a standard structure. This unblocks the DCT template installer from displaying the correct README path.

**Investigation**: [INVESTIGATE-template-metadata-system.md](../backlog/INVESTIGATE-template-metadata-system.md)

**Last Updated**: 2026-03-31

**DCT companion plan**: `helpers-no/devcontainer-toolbox` → `website/docs/ai-developer/plans/backlog/PLAN-template-readme-instructions.md` — covers the DCT-side changes (Phase C). DCT updates happen **after** all dev-templates work is complete and stable, to avoid back-and-forth between repos.

---

## Overview

Phase A of the template metadata system. Three changes in one pass across all TEMPLATE_INFO files and READMEs:

1. Rename `TEMPLATE_PURPOSE` → `TEMPLATE_ABSTRACT` (aligns with DCT/UIS naming)
2. Add `TEMPLATE_README` field (tells DCT which README to display)
3. Revise all READMEs to follow the standard structure (remove stale install instructions, add Quick Start)
4. Create `README-plan-based-workflow.md` for the AI template

---

## Phase 1: Rename TEMPLATE_PURPOSE → TEMPLATE_ABSTRACT — DONE

### Tasks

- [x] 1.1 Rename `TEMPLATE_PURPOSE` to `TEMPLATE_ABSTRACT` in `templates/php-basic-webserver/TEMPLATE_INFO` ✓
- [x] 1.2 Rename in `templates/typescript-basic-webserver/TEMPLATE_INFO` ✓
- [x] 1.3 Rename in `templates/designsystemet-basic-react-app/TEMPLATE_INFO` ✓
- [x] 1.4 Rename in `templates/python-basic-webserver/TEMPLATE_INFO` ✓
- [x] 1.5 Rename in `templates/golang-basic-webserver/TEMPLATE_INFO` ✓
- [x] 1.6 Rename in `templates/java-basic-webserver/TEMPLATE_INFO` ✓
- [x] 1.7 Rename in `templates/csharp-basic-webserver/TEMPLATE_INFO` ✓
- [x] 1.8 Rename in `ai-templates/plan-based-workflow/TEMPLATE_INFO` ✓

### Validation

All 8 TEMPLATE_INFO files use `TEMPLATE_ABSTRACT` and none contain `TEMPLATE_PURPOSE`.

---

## Phase 2: Add TEMPLATE_README to All TEMPLATE_INFO Files — DONE

### Tasks

- [x] 2.1 Add `TEMPLATE_README="README-php-basic-webserver.md"` ✓
- [x] 2.2 Add `TEMPLATE_README="README-typescript-basic-webserver.md"` ✓
- [x] 2.3 Add `TEMPLATE_README="README-designsystemet-basic-react-app.md"` ✓
- [x] 2.4 Add `TEMPLATE_README="README-python-basic-webserver.md"` ✓
- [x] 2.5 Add `TEMPLATE_README="README-golang-basic-webserver.md"` ✓
- [x] 2.6 Add `TEMPLATE_README="README-java-basic-webserver.md"` ✓
- [x] 2.7 Add `TEMPLATE_README="README-csharp-basic-webserver.md"` ✓
- [x] 2.8 Add `TEMPLATE_README="README-plan-based-workflow.md"` ✓

### Validation

All 8 TEMPLATE_INFO files have `TEMPLATE_README` with the correct filename.

---

## Phase 3: Revise App Template READMEs — DONE

Analyse each template's code and rewrite the README to follow the standard structure. Remove stale tool installation instructions, add Quick Start with correct run commands and ports.

**Standard structure:**

```
# Template Name
Brief description.

## Quick Start
1. source ~/.bashrc
2. <run command>
3. Open http://localhost:<port>

## Prerequisites
Tools auto-installed by devcontainer. Reinstall: dev-setup

## Project Structure
<directory tree>

## Development
<edit/test/debug workflow>

## Docker Build
<build container image>

## Kubernetes Deployment
<deploy to local K8s>

## CI/CD
<GitHub Actions workflow>
```

### Tasks

- [x] 3.1 Revise `templates/php-basic-webserver/README-php-basic-webserver.md` ✓
- [x] 3.2 Revise `templates/typescript-basic-webserver/README-typescript-basic-webserver.md` ✓
- [x] 3.3 Revise `templates/designsystemet-basic-react-app/README-designsystemet-basic-react-app.md` ✓
- [x] 3.4 Revise `templates/python-basic-webserver/README-python-basic-webserver.md` ✓
- [x] 3.5 Revise `templates/golang-basic-webserver/README-golang-basic-webserver.md` ✓
- [x] 3.6 Revise `templates/java-basic-webserver/README-java-basic-webserver.md` ✓
- [x] 3.7 Revise `templates/csharp-basic-webserver/README-csharp-basic-webserver.md` ✓

### Validation

Each README follows the standard structure. No stale tool installation instructions remain. Quick Start commands are correct for each template.

---

## Phase 4: Create AI Template README — DONE

### Tasks

- [x] 4.1 Create `ai-templates/plan-based-workflow/template/README-plan-based-workflow.md` ✓

**Quick Start:**
1. source ~/.bashrc (if tools were installed)
2. Check `docs/ai-developer/README.md` for the AI developer guide
3. Create your first plan in `docs/ai-developer/plans/backlog/`
4. If CLAUDE.md needs merging, ask your AI assistant to merge `docs/ai-developer/CLAUDE-template.md` into your CLAUDE.md

**What's Included:**
- 6 portable docs (README, WORKFLOW, PLANS, DEVCONTAINER, GIT, TALK)
- Plan folder structure (backlog/, active/, completed/)
- CLAUDE.md (or CLAUDE-template.md if existing CLAUDE.md)
- project-TEMPLATE.md skeleton

**How It Works:**
- Overview of the plan-based workflow: investigate → plan → implement → complete
- Human-in-the-loop validation at each phase

**Project Structure:**
- The `docs/ai-developer/` directory layout

### Validation

README-plan-based-workflow.md exists, follows the standard structure adapted for a docs-only template (no Docker Build, K8s Deployment, or CI/CD sections).

---

## Acceptance Criteria

- [x] All 8 TEMPLATE_INFO files have `TEMPLATE_ABSTRACT` (no `TEMPLATE_PURPOSE`) ✓
- [x] All 8 TEMPLATE_INFO files have `TEMPLATE_README` with correct filename ✓
- [x] All 7 app template READMEs follow the standard structure ✓
- [x] All 7 app template READMEs have correct Quick Start commands and ports ✓
- [x] No stale tool installation instructions in any README ✓
- [x] `README-plan-based-workflow.md` created for AI template ✓
- [x] DCT companion plan updated to reflect finalised field names ✓

---

## Files to Modify

**TEMPLATE_INFO files (rename + add field):**
- `templates/php-basic-webserver/TEMPLATE_INFO`
- `templates/typescript-basic-webserver/TEMPLATE_INFO`
- `templates/designsystemet-basic-react-app/TEMPLATE_INFO`
- `templates/python-basic-webserver/TEMPLATE_INFO`
- `templates/golang-basic-webserver/TEMPLATE_INFO`
- `templates/java-basic-webserver/TEMPLATE_INFO`
- `templates/csharp-basic-webserver/TEMPLATE_INFO`
- `ai-templates/plan-based-workflow/TEMPLATE_INFO`

**READMEs to revise:**
- `templates/php-basic-webserver/README-php-basic-webserver.md`
- `templates/typescript-basic-webserver/README-typescript-basic-webserver.md`
- `templates/designsystemet-basic-react-app/README-designsystemet-basic-react-app.md`
- `templates/python-basic-webserver/README-python-basic-webserver.md`
- `templates/golang-basic-webserver/README-golang-basic-webserver.md`
- `templates/java-basic-webserver/README-java-basic-webserver.md`
- `templates/csharp-basic-webserver/README-csharp-basic-webserver.md`

**New file:**
- `ai-templates/plan-based-workflow/template/README-plan-based-workflow.md`
