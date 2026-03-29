# Plan: Create ai-templates Content for plan-based-workflow

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Completed

**Completed**: 2026-03-29

**Goal**: Create the `ai-templates/plan-based-workflow/` folder in this repo with all template content, ready for `dev-template-ai.sh` (in DCT) to consume.

**Investigation**: [INVESTIGATE-ai-developer-template.md](INVESTIGATE-ai-developer-template.md)

**Last Updated**: 2026-03-29

---

## Overview

This plan covers the `helpers-no/dev-templates` side of the work. The DCT side (`dev-template-ai.sh` script) is tracked separately in `helpers-no/devcontainer-toolbox`.

We need to create:
1. The `ai-templates/` folder structure
2. `TEMPLATE_INFO` metadata
3. The 6 portable docs (copied from `website/docs/ai-developer/`)
4. Plan folder structure with `.gitkeep` files
5. A starter `CLAUDE.md` (adapted from this repo's own CLAUDE.md)
6. A `CLAUDE-template.md` (same content, used as merge reference)
7. A skeleton `project-TEMPLATE.md`

---

## Phase 1: Create Folder Structure — DONE

### Tasks

- [x] 1.1 Create `ai-templates/plan-based-workflow/` directory ✓
- [x] 1.2 Create `ai-templates/plan-based-workflow/template/docs/ai-developer/` directory ✓
- [x] 1.3 Create `ai-templates/plan-based-workflow/template/docs/ai-developer/plans/backlog/` directory ✓
- [x] 1.4 Create `ai-templates/plan-based-workflow/template/docs/ai-developer/plans/active/` directory ✓
- [x] 1.5 Create `ai-templates/plan-based-workflow/template/docs/ai-developer/plans/completed/` directory ✓

### Validation

```
ai-templates/plan-based-workflow/
├── template/
│   └── docs/ai-developer/
│       └── plans/
│           ├── backlog/
│           ├── active/
│           └── completed/
```

User confirms directory structure is correct.

---

## Phase 2: Create TEMPLATE_INFO and .gitkeep Files — DONE

### Tasks

- [x] 2.1 Create `ai-templates/plan-based-workflow/TEMPLATE_INFO` ✓
- [x] 2.2 Create `.gitkeep` in `template/docs/ai-developer/plans/backlog/` ✓
- [x] 2.3 Create `.gitkeep` in `template/docs/ai-developer/plans/active/` ✓
- [x] 2.4 Create `.gitkeep` in `template/docs/ai-developer/plans/completed/` ✓

### Validation

User confirms TEMPLATE_INFO content and .gitkeep files exist.

---

## Phase 3: Copy Portable Docs — DONE

### Tasks

- [x] 3.1 Copy `README.md` ✓
- [x] 3.2 Copy `WORKFLOW.md` ✓
- [x] 3.3 Copy `PLANS.md` ✓
- [x] 3.4 Copy `DEVCONTAINER.md` ✓
- [x] 3.5 Copy `GIT.md` ✓
- [x] 3.6 Copy `TALK.md` ✓

**Important:** These are copies, not moves. The originals in `website/docs/ai-developer/` stay in place — this project uses them too.

### Validation

Verify all 6 files are identical to the originals:
```bash
diff website/docs/ai-developer/README.md ai-templates/plan-based-workflow/template/docs/ai-developer/README.md
# (repeat for all 6)
```

User confirms all docs are copied correctly.

---

## Phase 4: Create CLAUDE.md and CLAUDE-template.md — DONE

### Tasks

- [x] 4.1 Create `ai-templates/plan-based-workflow/template/CLAUDE.md` ✓ — starter CLAUDE.md for the target project root. Follows the same pattern as this repo's `CLAUDE.md` but with `docs/ai-developer/` paths:

  ```markdown
  # {{REPO_NAME}}

  ## How We Work

  **ALL work follows the plan-based workflow.** Before writing any code:

  1. Check `docs/ai-developer/plans/active/` for in-progress work
  2. Create an INVESTIGATE-*.md or PLAN-*.md in `docs/ai-developer/plans/backlog/`
  3. Wait for user approval before implementing
  4. Update the active plan file as you work — mark each task `[x]` immediately after completing it, mark phase headings as DONE
  5. Read [docs/ai-developer/WORKFLOW.md](docs/ai-developer/WORKFLOW.md) for the full process
  6. Read [docs/ai-developer/PLANS.md](docs/ai-developer/PLANS.md) for plan structure

  All commands must run inside the devcontainer. Never run directly on the host.

  ## Project Details

  Read [docs/ai-developer/README.md](docs/ai-developer/README.md) for the complete AI developer guide.
  ```

- [x] 4.2 Create `ai-templates/plan-based-workflow/template/docs/ai-developer/CLAUDE-template.md` ✓

### Validation

User confirms both files have correct paths and content.

---

## Phase 5: Create Skeleton project-TEMPLATE.md — DONE

### Tasks

- [x] 5.1 Create `ai-templates/plan-based-workflow/template/docs/ai-developer/project-TEMPLATE.md` ✓

  ```markdown
  # Project: {{REPO_NAME}}

  TODO: Brief description of what this project does.

  ---

  ## Devcontainer

  TODO: Document your devcontainer setup.
  - Container name/image
  - Workspace path inside the container
  - How to find and exec into the container

  ---

  ## Project Structure

  TODO: Describe the project's directory layout.

  ---

  ## Available Commands

  TODO: List the key commands for building, testing, and running.

  ---

  ## Conventions

  TODO: Document any project-specific coding conventions, naming patterns, or architectural decisions.
  ```

### Validation

User confirms skeleton content is useful and covers the key sections.

---

## Acceptance Criteria

- [ ] `ai-templates/plan-based-workflow/TEMPLATE_INFO` exists with correct metadata
- [ ] `ai-templates/plan-based-workflow/template/` contains the full file tree as it should appear in the target project
- [ ] The 6 portable docs are identical copies of the originals in `website/docs/ai-developer/`
- [ ] `CLAUDE.md` and `CLAUDE-template.md` use `docs/ai-developer/` paths (not `website/docs/ai-developer/`)
- [ ] `project-TEMPLATE.md` contains `{{REPO_NAME}}` placeholder and useful TODO sections
- [ ] `.gitkeep` files exist in all three `plans/` subdirectories
- [ ] Original files in `website/docs/ai-developer/` are unchanged

---

## Files to Create

```
ai-templates/plan-based-workflow/
├── TEMPLATE_INFO
└── template/
    ├── CLAUDE.md
    └── docs/ai-developer/
        ├── README.md              (copy from website/docs/ai-developer/)
        ├── WORKFLOW.md            (copy from website/docs/ai-developer/)
        ├── PLANS.md               (copy from website/docs/ai-developer/)
        ├── DEVCONTAINER.md        (copy from website/docs/ai-developer/)
        ├── GIT.md                 (copy from website/docs/ai-developer/)
        ├── TALK.md                (copy from website/docs/ai-developer/)
        ├── CLAUDE-template.md     (new)
        ├── project-TEMPLATE.md    (new)
        └── plans/
            ├── backlog/.gitkeep
            ├── active/.gitkeep
            └── completed/.gitkeep
```
