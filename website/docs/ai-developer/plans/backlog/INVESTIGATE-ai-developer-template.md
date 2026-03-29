# Investigate: Create ai-developer Setup as a Dev Template

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Backlog

**Goal**: Create a dev-template that installs the portable `ai-developer/` docs into any new project, so that `dev-template` can scaffold AI-assisted development workflow for any repo.

**Last Updated**: 2026-03-29

---

## Context

The `website/docs/ai-developer/` folder in this repo contains 6 portable documentation files (README.md, WORKFLOW.md, PLANS.md, DEVCONTAINER.md, GIT.md, TALK.md) that define a universal AI development workflow. These files contain no project-specific content and can be copied to any project.

Currently, setting up a new project for AI-assisted development requires manually copying these files. The goal is to make this a template that `dev-template` can install, so any new project gets the ai-developer setup automatically.

---

## Questions to Answer

1. How does `dev-template` currently work? What is the template structure and installation process?
2. Where should the ai-developer template files live in this repo?
3. What should the template install into the target project?
   - The 6 portable docs
   - Empty `plans/` folder structure (backlog/, active/, completed/ with .gitkeep)
   - A starter `project-*.md` file? Or just instructions to create one?
   - A CLAUDE.md? Or a template CLAUDE.md that needs project-specific edits?
4. How does the template handle the `ai-developer/` path? Different projects place it differently (e.g., `docs/ai-developer/` vs `website/docs/ai-developer/`)
5. Should the template be interactive (ask questions) or convention-based?

---

## What the Template Should Produce

When a developer runs `dev-template` and selects the ai-developer template, the target project should get:

```
docs/ai-developer/              # or wherever the project places it
├── README.md                   # Universal entry point
├── WORKFLOW.md                 # Universal workflow
├── PLANS.md                    # Universal plan system
├── DEVCONTAINER.md             # DCT devcontainer guide
├── GIT.md                      # Git safety rules
├── TALK.md                     # AI-to-AI testing protocol
└── plans/
    ├── backlog/.gitkeep
    ├── active/.gitkeep
    └── completed/.gitkeep

CLAUDE.md                       # Thin enforcer pointing to ai-developer/
```

---

## Next Steps

- [ ] Investigate how `dev-template` works (read the source)
- [ ] Design the template structure
- [ ] Create PLAN with chosen approach
