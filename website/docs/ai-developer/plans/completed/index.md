---
title: Completed
sidebar_position: 1
---

# Completed Plans

All completed plans and investigations, sorted by date. Kept for reference.

| Plan | Goal | Completed |
|------|------|-----------|
| [Plan: Transfer urbalurba-dev-templates to helpers-no (rename to dev-templates)](PLAN-transfer-to-helpers-no.md) | Transfer this repo from `terchris/urbalurba-dev-templates` to `helpers-no/dev-templates` with zero downtime. | 2026-04-01 |
| [Feature: Add TEMPLATE_TOOLS to all TEMPLATE_INFO files](PLAN-template-tools-dev-templates.md) | Add `TEMPLATE_TOOLS` field to every template's `TEMPLATE_INFO` so the DCT template installer can automatically install required devcontainer tools. | 2026-04-01 |
| [Plan: TEMPLATE_README, PURPOSE→ABSTRACT Rename, and README Revision](PLAN-template-readme-and-metadata.md) | Add `TEMPLATE_README` field, rename `TEMPLATE_PURPOSE` to `TEMPLATE_ABSTRACT`, and revise all template READMEs to follow a standard structure. This unblocks the DCT template installer from displaying the correct README path. | 2026-04-01 |
| [Plan: Full Template Metadata and Docusaurus Generation Pipeline](PLAN-template-metadata-and-docusaurus.md) | Add all remaining metadata fields to TEMPLATE_INFO files, create generation scripts (adapted from UIS), and build the Docusaurus pipeline to auto-generate template pages, category pages, and plan indexes from metadata. | 2026-04-01 |
| [Plan: Repository Cleanup and README Rewrite](PLAN-repo-cleanup.md) | Remove obsolete files, preserve valuable content for future Docusaurus site, and rewrite the README to accurately describe the repo. | 2026-04-01 |
| [Plan: Redesign Docusaurus Template Pages](PLAN-docusaurus-template-pages.md) | Redesign the generated template detail pages and the `/templates` overview page to show full README content, logos, install commands, and better navigation — following UIS component patterns with CSS Modules and MDX. | 2026-04-01 |
| [Plan: Add Contributors Section to Docusaurus Site](PLAN-contributors-section.md) | Add a minimum viable "Contributors" section to the Docusaurus site with guides for creating templates, metadata reference, naming conventions, scripts reference, and basic rules. | 2026-04-01 |
| [Plan: Create ai-templates Content for plan-based-workflow](PLAN-ai-templates-content.md) | Create the `ai-templates/plan-based-workflow/` folder in this repo with all template content, ready for `dev-template-ai.sh` (in DCT) to consume. | 2026-04-01 |
| [Investigate: Template Metadata System and README Standardisation](INVESTIGATE-template-metadata-system.md) | Design and implement a complete template metadata system — aligned with DCT and UIS patterns — that serves the Docusaurus website, template deployment, CLI tooling, and standardised READMEs. This includes enriching TEMPLATE_INFO with mandatory metadata fields, renaming fields for DCT consistency, revising READMEs to a standard structure, and creating the generation scripts (adapted from UIS) that populate the Docusaurus site. | 2026-04-01 |
| [Investigate: Repository Cleanup and README Update](INVESTIGATE-repo-cleanup.md) | Clean up obsolete files, remove the `terchris/` folder, and update the README to accurately reflect the current state of the repository. | 2026-04-01 |
| [Investigate: GitHub Pages Setup with Custom Domain](INVESTIGATE-gh-pages-custom-domain.md) | Enable GitHub Pages for this repo and configure `tmp.sovereignsky.no` as the custom domain. | 2026-04-01 |
| [Investigate: Improve Docusaurus Template Pages](INVESTIGATE-docusaurus-template-pages.md) | Redesign the generated template detail pages in Docusaurus to show the full README content, template logo, install command, and better navigation — making each page a complete reference for the template. | 2026-04-01 |
| [Investigate: Docusaurus Branding and Visual Identity](INVESTIGATE-docusaurus-branding.md) | Add proper branding, logo, colors, and homepage design to the dev-templates Docusaurus site, following the UIS visual identity. | 2026-04-01 |
| [Investigate: Add Contributors Section to Docusaurus Site](INVESTIGATE-contributors-section.md) | Add a "Contributors" section to the Docusaurus site that explains how to create new templates, follow naming conventions, and contribute to the project. Start with a minimum viable structure — detailed content will be written later. | 2026-04-01 |
| [Investigate: Create ai-developer Setup as an AI Template](INVESTIGATE-ai-developer-template.md) | Create AI workflow templates that can be installed into any project via a new `dev-template-ai.sh` command, following the same pattern as `dev-template.sh` for app templates. | 2026-04-01 |
