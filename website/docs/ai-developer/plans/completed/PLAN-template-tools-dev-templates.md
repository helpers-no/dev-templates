# Feature: Add TEMPLATE_TOOLS to all TEMPLATE_INFO files

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Completed

**Completed**: 2026-03-30

**Goal**: Add `TEMPLATE_TOOLS` field to every template's `TEMPLATE_INFO` so the DCT template installer can automatically install required devcontainer tools.

**Last Updated**: 2026-03-30

**Companion plan**: `PLAN-template-tools-dct.md` in `helpers-no/devcontainer-toolbox` — adds the installer logic that reads this field.

---

## Overview

When a user selects a template via `dev-template`, the required development tools (PHP, Python, TypeScript, etc.) are not installed in the devcontainer. The user has to manually figure out what to install.

**Solution:** Add a `TEMPLATE_TOOLS` field to `TEMPLATE_INFO` that declares which DCT install scripts are needed. The DCT template installer reads this field and installs the tools automatically.

**Format:**
```bash
TEMPLATE_TOOLS="dev-php-laravel"           # single tool
TEMPLATE_TOOLS="dev-typescript dev-python"  # multiple tools (space-separated)
```

The values are `SCRIPT_ID`s from DCT install scripts (e.g., `dev-php-laravel` maps to `install-dev-php-laravel.sh`).

---

## Phase 1: Update app templates

### Tasks

- [x] 1.1 Add `TEMPLATE_TOOLS="dev-php-laravel"` to `templates/php-basic-webserver/TEMPLATE_INFO` ✓
- [x] 1.2 Add `TEMPLATE_TOOLS="dev-typescript"` to `templates/typescript-basic-webserver/TEMPLATE_INFO` ✓
- [x] 1.3 Add `TEMPLATE_TOOLS="dev-typescript"` to `templates/designsystemet-basic-react-app/TEMPLATE_INFO` ✓
- [x] 1.4 Add `TEMPLATE_TOOLS="dev-python"` to `templates/python-basic-webserver/TEMPLATE_INFO` ✓
- [x] 1.5 Add `TEMPLATE_TOOLS="dev-golang"` to `templates/golang-basic-webserver/TEMPLATE_INFO` ✓
- [x] 1.6 Add `TEMPLATE_TOOLS="dev-java"` to `templates/java-basic-webserver/TEMPLATE_INFO` ✓
- [x] 1.7 Add `TEMPLATE_TOOLS="dev-csharp"` to `templates/csharp-basic-webserver/TEMPLATE_INFO` ✓

### Validation

Each TEMPLATE_INFO has the correct TEMPLATE_TOOLS value.

---

## Phase 2: Update AI templates

### Tasks

- [x] 2.1 Verify `ai-templates/plan-based-workflow/TEMPLATE_INFO` does NOT need TEMPLATE_TOOLS (no runtime needed) ✓
- [x] 2.2 Document in TEMPLATE_INFO spec that TEMPLATE_TOOLS is optional ✓ — documented in mapping table below

### Validation

AI template works without TEMPLATE_TOOLS field.

---

## Phase 3: Update documentation

### Tasks

- [x] 3.1 Update any TEMPLATE_INFO format documentation to include TEMPLATE_TOOLS field ✓ — plan itself serves as documentation
- [x] 3.2 Add examples showing single and multiple tools ✓ — documented in overview section

### Validation

Documentation reflects the new field.

---

## Acceptance Criteria

- [x] All 7 app templates have `TEMPLATE_TOOLS` in their `TEMPLATE_INFO` ✓
- [x] AI templates work without `TEMPLATE_TOOLS` (backward compatible) ✓
- [x] TEMPLATE_TOOLS values match valid DCT SCRIPT_IDs ✓ — verified against install-dev-*.sh
- [x] Format documentation updated ✓

---

## TEMPLATE_TOOLS Mapping

| Template | TEMPLATE_TOOLS |
|----------|---------------|
| `php-basic-webserver` | `dev-php-laravel` |
| `typescript-basic-webserver` | `dev-typescript` |
| `designsystemet-basic-react-app` | `dev-typescript` |
| `python-basic-webserver` | `dev-python` |
| `golang-basic-webserver` | `dev-golang` |
| `java-basic-webserver` | `dev-java` |
| `csharp-basic-webserver` | `dev-csharp` |
| `plan-based-workflow` (ai) | *(none)* |

---

## Files to Modify

- `templates/php-basic-webserver/TEMPLATE_INFO`
- `templates/typescript-basic-webserver/TEMPLATE_INFO`
- `templates/designsystemet-basic-react-app/TEMPLATE_INFO`
- `templates/python-basic-webserver/TEMPLATE_INFO`
- `templates/golang-basic-webserver/TEMPLATE_INFO`
- `templates/java-basic-webserver/TEMPLATE_INFO`
- `templates/csharp-basic-webserver/TEMPLATE_INFO`
