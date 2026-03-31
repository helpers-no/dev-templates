# Plan: Redesign Docusaurus Template Pages

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Completed

**Completed**: 2026-03-31

**Goal**: Redesign the generated template detail pages and the `/templates` overview page to show full README content, logos, install commands, and better navigation — following UIS component patterns with CSS Modules and MDX.

**Investigation**: [INVESTIGATE-docusaurus-template-pages.md](../backlog/INVESTIGATE-docusaurus-template-pages.md)

**Last Updated**: 2026-03-31

---

## Overview

This plan has 8 phases:
1. TypeScript types and data utilities (foundation)
2. TemplateHeader MDX component for detail pages
3. Update `generate-docs-markdown.sh` to output MDX with README content
4. TemplateCard and TemplateGrid with CSS Modules
5. CategoryCard, CategoryGrid, and `/templates` page redesign
6. Add README existence validation
7. Docusaurus category structure (follow UIS pattern)
8. Category rename and cleanup

---

## Phase 1: TypeScript Types and Data Utilities — DONE

- [x] 1.1 Create `website/src/types/template.ts` ✓
- [x] 1.2 Create `website/src/types/category.ts` ✓
- [x] 1.3 Create `website/src/utils/data.ts` (getTemplates, getCategories, getTemplatesByCategory, etc.) ✓
- [x] 1.4 Create `website/src/utils/paths.ts` (getCategoryFolder, getTemplatePath, getCategoryAnchor) ✓

---

## Phase 2: TemplateHeader MDX Component — DONE

- [x] 2.1 Create `website/src/components/TemplateHeader/index.tsx` ✓
- [x] 2.2 Create `website/src/components/TemplateHeader/styles.module.css` (flexbox, dark mode, responsive, monospace install) ✓

---

## Phase 3: Update generate-docs-markdown.sh for MDX + README Embedding — DONE

- [x] 3.1 Update script to output `.mdx` files with TemplateHeader import, README embedding, install command differentiation (dev-template vs dev-template-ai), related template link resolution ✓
- [x] 3.2 Category index pages: table with Template, Description, Install columns (no logos — matches UIS style) ✓
- [x] 3.3 Script generates `_category_.json` files for Docusaurus sidebar ✓
- [x] 3.4 Renamed "About" section to "Summary" (shows TEMPLATE_SUMMARY) ✓
- [x] 3.5 Removed custom `templates/index.md` — Docusaurus auto-generates category landing page ✓

---

## Phase 4: TemplateCard and TemplateGrid with CSS Modules — DONE

- [x] 4.1 Create `website/src/components/TemplateCard/styles.module.css` (hover shadow, 2-line clamp, tag badges) ✓
- [x] 4.2 Create `website/src/components/TemplateCard/index.tsx` (CSS Module, useBaseUrl, getTemplatePath, max 3 tags) ✓
- [x] 4.3 Create `website/src/components/TemplateGrid/styles.module.css` (responsive 1→2→3 columns) ✓
- [x] 4.4 Create `website/src/components/TemplateGrid/index.tsx` (category headers with logo + name + count, anchor IDs) ✓

---

## Phase 5: CategoryCard, CategoryGrid, and /templates Page Redesign — DONE

- [x] 5.1 Create `website/src/components/CategoryCard/index.tsx` (logo 48x48, title, description, count, links to anchor) ✓
- [x] 5.2 Create `website/src/components/CategoryCard/styles.module.css` (hover border color change) ✓
- [x] 5.3 Create `website/src/components/CategoryGrid/index.tsx` (excludes empty categories) ✓
- [x] 5.4 Create `website/src/components/CategoryGrid/styles.module.css` (responsive 1→2→3 columns) ✓
- [x] 5.5 Rewrite `website/src/pages/templates.tsx` (Categories section + All Templates section) ✓
- [x] 5.6 Delete old standalone `TemplateCard.tsx` and `TemplateGrid.tsx` ✓

---

## Phase 6: Add README Existence Validation — DONE

- [x] 6.1 Update `scripts/validate-metadata.sh` to check README file exists at correct path (app vs ai template) ✓

---

## Phase 7: Docusaurus Category Structure — DONE

Following UIS pattern: `/docs/category/templates` as auto-generated category landing, `/docs/templates/<category>/` as category index with table.

- [x] 7.1 Create `_category_.json` files for templates root and each category ✓
- [x] 7.2 Generation script auto-creates `_category_.json` for each category ✓
- [x] 7.3 Update `docs/index.md` link to `category/templates` ✓

---

## Phase 8: Category Rename — DONE

Renamed `WEB_SERVER` to `BASIC_WEB_SERVER` to clarify these are basic Hello World templates.

- [x] 8.1 Update `scripts/lib/categories.sh`: `WEB_SERVER` → `BASIC_WEB_SERVER`, new display name and description ✓
- [x] 8.2 Update all 6 web server TEMPLATE_INFO files: `TEMPLATE_CATEGORY="BASIC_WEB_SERVER"` ✓
- [x] 8.3 Remove old `website/docs/templates/web-server/` folder ✓
- [x] 8.4 Regenerate all pages ✓

---

## Acceptance Criteria

- [x] Detail pages use MDX with TemplateHeader component (logo, install command, links, tags) ✓
- [x] Detail pages embed full README content below the header ✓
- [x] Detail pages show "Summary" section from TEMPLATE_SUMMARY ✓
- [x] Install command shows `dev-template` for app, `dev-template-ai` for ai templates ✓
- [x] Related templates are clickable links with correct paths ✓
- [x] `/templates` page has CategoryGrid + TemplateGrid matching UIS pattern ✓
- [x] All components use CSS Modules with dark mode support ✓
- [x] Category index pages use clean table (Template, Description, Install) ✓
- [x] Docusaurus auto-generates category landing page (like UIS) ✓
- [x] `validate-metadata.sh` checks README file exists ✓
- [x] Category renamed from WEB_SERVER to BASIC_WEB_SERVER ✓
- [x] Full pipeline (validate → generate → build) succeeds locally ✓
