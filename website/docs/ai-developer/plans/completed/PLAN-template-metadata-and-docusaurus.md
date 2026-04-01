# Plan: Full Template Metadata and Docusaurus Generation Pipeline

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Active

**Goal**: Add all remaining metadata fields to TEMPLATE_INFO files, create generation scripts (adapted from UIS), and build the Docusaurus pipeline to auto-generate template pages, category pages, and plan indexes from metadata.

**Investigation**: [INVESTIGATE-template-metadata-system.md](INVESTIGATE-template-metadata-system.md)

**Prerequisites**: Phase A completed (TEMPLATE_README + TEMPLATE_ABSTRACT — done 2026-03-31)

**Last Updated**: 2026-03-31

**DCT companion plans** (Phase C — after this plan is complete):
- `helpers-no/devcontainer-toolbox` → `PLAN-template-readme-instructions.md`
- `helpers-no/devcontainer-toolbox` → `PLAN-template-tools-dct.md`

---

## Phase 1: Add Remaining Metadata Fields to TEMPLATE_INFO — DONE

- [x] 1.1-1.8 All 8 TEMPLATE_INFO files updated with TEMPLATE_ID, TEMPLATE_VER, TEMPLATE_TAGS, TEMPLATE_SUMMARY, TEMPLATE_LOGO, TEMPLATE_WEBSITE, TEMPLATE_DOCS, TEMPLATE_RELATED ✓

---

## Phase 2: Create Generation Scripts (lib) — DONE

- [x] 2.1 Create `scripts/lib/logging.sh` ✓
- [x] 2.2 Create `scripts/lib/categories.sh` (UIS pattern, 3 categories, JSON built-in) ✓
- [x] 2.3 Create `scripts/lib/template-scanner.sh` (line-by-line case parsing) ✓

---

## Phase 3: Create Generation Scripts (generators) — DONE

- [x] 3.1 Create `scripts/generate-templates-json.sh` (generates templates.json + categories.json, validates with jq) ✓
- [x] 3.2 Create `scripts/generate-docs-markdown.sh` (template detail pages + category indexes + overview) ✓
- [x] 3.3 Create `scripts/generate-plan-indexes.sh` (adapted from UIS, generates plan folder indexes) ✓
- [x] 3.4 Create `scripts/validate-metadata.sh` (checks all mandatory fields, validates categories) ✓

---

## Phase 4: Create Template Logos — DONE

- [x] 4.1-4.4 Created 11 SVG logos (8 templates + 3 categories) ✓

---

## Phase 5: Create Docusaurus React Components — DONE

- [x] 5.1 Create `website/src/components/TemplateCard.tsx` ✓
- [x] 5.2 Create `website/src/components/TemplateGrid.tsx` ✓
- [x] 5.3 Create `website/src/pages/templates.tsx` ✓
- [x] 5.4 Add Templates link to navbar in `docusaurus.config.ts` ✓
- [x] 5.5 Update `website/docs/index.md` to link to templates page ✓

---

## Phase 6: Update GitHub Actions — DONE

- [x] 6.1 Update `.github/workflows/deploy-docs.yml` with generate → validate → commit → build → deploy pipeline ✓
- [x] 6.2 Add trigger paths for TEMPLATE_INFO, scripts, and plans ✓

---

## Acceptance Criteria

- [x] All 8 TEMPLATE_INFO files have all mandatory metadata fields ✓
- [x] `scripts/validate-metadata.sh` passes for all templates ✓
- [x] `templates.json` and `categories.json` are generated correctly ✓
- [x] Template detail pages and category indexes are generated as markdown ✓
- [x] Plan index pages are auto-generated ✓
- [x] Docusaurus site builds successfully with template cards ✓
- [x] Templates page shows all templates grouped by category with logos ✓
- [x] GitHub Actions pipeline runs generation and validation before build ✓
- [x] SVG logos exist for all templates and categories ✓
- [x] `scripts/validate-docs.sh` catches MDX-incompatible markdown and broken links ✓
- [x] `scripts/validate-docs.sh` checks README structure compliance ✓

---

## Phase 7: Markdown and Documentation Validation Script — DONE

We hit MDX build failures from bare angle brackets (`<run command>`, `<port>`) and broken internal links (files moved between folders). A validation script should catch these before the build.

### What to validate

**MDX compatibility:**
- Bare `<word>` patterns outside of code fences and inline code that MDX interprets as HTML/JSX tags
- Bare URLs containing `<` characters (e.g., `http://localhost:<port>`)
- Unescaped curly braces `{` `}` outside code fences (MDX interprets as JSX expressions)

**Internal links:**
- Markdown links `[text](path.md)` where the target file does not exist
- Links pointing to wrong folders (e.g., `../backlog/` when file moved to `../completed/`)

**README structure compliance (template READMEs only):**
- Check that each `README-*.md` in `templates/` and `ai-templates/` has the required sections: Quick Start, Prerequisites, Project Structure
- Warn if optional sections are missing: Development, Docker Build, Kubernetes Deployment, CI/CD

### Tasks

- [x] 7.1 Create `scripts/validate-rules.conf` — pipe-delimited config file defining what to check:
  ```
  # Format: FILE_PATTERN|RULE_TYPE|VALUE|SEVERITY
  # RULE_TYPE: required_heading, forbidden_pattern
  # SEVERITY: error, warn

  # Template READMEs — required sections
  README-*.md|required_heading|Quick Start|error
  README-*.md|required_heading|Prerequisites|error
  README-*.md|required_heading|Project Structure|error
  README-*.md|required_heading|Development|warn
  README-*.md|required_heading|Docker Build|warn
  README-*.md|required_heading|Kubernetes Deployment|warn
  README-*.md|required_heading|CI/CD|warn

  # All markdown — MDX compatibility
  *.md|forbidden_pattern|<[a-z].*>|error
  ```
  Easy to update without being a programmer — just add or remove lines.
- [x] 7.2 Create `scripts/validate-docs.sh`:
  - Read rules from `validate-rules.conf`
  - For each rule, match files by pattern and apply the check
  - `required_heading`: case-insensitive grep for `## Value`
  - `forbidden_pattern`: grep outside code fences for the pattern
  - Also check for broken internal markdown links
  - Exit non-zero on errors, print warnings
- [x] 7.3 Update `.github/workflows/deploy-docs.yml` to run `validate-docs.sh` in the generate job ✓
- [x] 7.4 Fix any existing issues found by the script ✓ (fixed angle brackets and MDX-incompatible patterns in investigation file)

### Validation

```bash
bash scripts/validate-docs.sh          # exits 0 if all valid
# Add a bad rule, re-run — should catch it
```
