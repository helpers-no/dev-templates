# Investigate: Add Contributors Section to Docusaurus Site

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Backlog

**Goal**: Add a "Contributors" section to the Docusaurus site that explains how to create new templates, follow naming conventions, and contribute to the project. Start with a minimum viable structure — detailed content will be written later.

**Priority**: Medium

**Last Updated**: 2026-03-31

**Related**:
- `helpers-no/urbalurba-infrastructure` (UIS) — has a mature contributors section at `website/docs/contributors/` with guides, rules, and architecture docs. Use as inspiration for structure.

---

## Context

Template authors need documentation on how to create new templates that work with the system — the correct `TEMPLATE_INFO` fields, README structure, folder layout, naming conventions, and how `dev-template.sh` installs them. Currently this is only documented in investigation files, not in a user-facing guide.

---

## UIS Contributor Structure (inspiration)

UIS has three subsections:

```
contributors/
├── index.md              # Overview: ways to contribute, quick start, PR process
├── guides/
│   ├── index.md
│   ├── adding-a-service.md    # Step-by-step guide for the main contribution type
│   ├── ci-cd-and-generators.md
│   └── integration-testing.md
├── rules/
│   ├── index.md
│   ├── naming-conventions.md
│   ├── documentation.md
│   ├── git-workflow.md
│   ├── kubernetes-deployment.md
│   └── ...
└── architecture/
    ├── deploy-system.md
    ├── tools.md
    └── ...
```

The most important page is `adding-a-service.md` — the step-by-step guide for the primary contribution. For dev-templates, the equivalent is "Creating a Template".

---

## Proposed Minimum Structure

Start with the essentials. Detailed content will be added later.

```
website/docs/contributors/
├── index.md                    # Overview: ways to contribute, quick start
├── creating-a-template.md      # The main guide — TEMPLATE_INFO fields, README structure, folder layout
├── template-metadata.md        # Reference: all TEMPLATE_INFO fields with descriptions
└── naming-conventions.md       # Template naming, category IDs, file naming
```

### index.md — Overview

- Ways to contribute (create template, fix bugs, improve docs)
- Quick start (fork, clone, create template, submit PR)
- Link to creating-a-template guide

### creating-a-template.md — Main Guide

- Step-by-step: create folder, add TEMPLATE_INFO, add application code, add README, add manifests, test
- Which files are required vs optional
- How `dev-template.sh` discovers and installs templates (downloads zip from this repo, scans `templates/*/TEMPLATE_INFO`, copies files to project root, replaces placeholders)
- What happens when you push: GitHub Actions runs validation, generates JSON + markdown pages, builds and deploys Docusaurus
- How to test locally before submitting (run validation scripts, run Docusaurus build)

### template-metadata.md — Field Reference

- All TEMPLATE_INFO fields with descriptions, examples, and whether required
- Based on the enriched TEMPLATE_INFO from the metadata investigation
- Example of a complete TEMPLATE_INFO file

### naming-conventions.md — Naming Rules

- Template directory names (lowercase, hyphenated)
- TEMPLATE_ID must match directory name
- TEMPLATE_CATEGORY values
- README naming (`README-<template-name>.md`)
- Logo naming (`<template-name>-logo.svg`)

---

## Questions to Answer

1. ~~Should we add this as a navbar item?~~ — **Yes**, add "Contributors" to the Docusaurus navbar alongside Docs, Templates, Blog
2. ~~Should the ai-developer workflow docs move into contributors?~~ — **No**, they stay at `docs/ai-developer/`
3. ~~Should we include a `rules/` subsection now?~~ — **Yes**, add basics

---

## Updated Minimum Structure

```
website/docs/contributors/
├── index.md                    # Overview: ways to contribute, quick start
├── creating-a-template.md      # The main guide — step by step
├── template-metadata.md        # Reference: all TEMPLATE_INFO fields
├── naming-conventions.md       # Template naming, category IDs, file naming
├── scripts-reference.md        # What each script in scripts/ does, how to run them
└── readme-structure.md         # Standard README sections
```

---

## Next Steps

- [ ] Create PLAN with the minimum pages
