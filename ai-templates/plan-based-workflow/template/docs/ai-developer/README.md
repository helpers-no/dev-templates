# AI Developer Guide

Instructions for AI coding assistants working on this project.

---

## Why This System

AI coding assistants are powerful but need structure to be effective. This system has three layers:

1. **The Cage** — The AI runs inside a devcontainer. It can only see the project directory. Your machine, SSH keys, and other projects are protected.
2. **The Plan** — The AI creates a plan before writing code. You review it. This prevents hallucinations, scope drift, and wasted work.
3. **The Tests** — Validation catches mistakes. The AI runs checks after each phase and self-corrects before you review.

---

## Documents

| Document | Purpose | When to Read |
|----------|---------|-------------|
| [WORKFLOW.md](WORKFLOW.md) | End-to-end flow from idea to implementation | When starting new work |
| [PLANS.md](PLANS.md) | Plan structure, investigation guidance, templates | When creating or implementing a plan |
| [DEVCONTAINER.md](DEVCONTAINER.md) | How to work inside the devcontainer | When running commands or installing tools |
| [GIT.md](GIT.md) | Git safety rules and platform operations | When doing git operations |
| [TALK.md](TALK.md) | AI-to-AI testing protocol | When working with a tester |

---

## Start Here

When starting a new session, read files in this order:

1. **Read all `project-*.md` files** — project-specific setup, tools, commands, conventions
2. **Read all `template-*.md` files** (if any) — tech stack from installed templates
3. **Read [WORKFLOW.md](WORKFLOW.md)** when starting new work
4. **Read [PLANS.md](PLANS.md)** when creating or implementing a plan
5. **Reference** [DEVCONTAINER.md](DEVCONTAINER.md), [GIT.md](GIT.md), [TALK.md](TALK.md) as needed

---

## File Naming Convention

| Prefix | Meaning | Portable? | Created by |
|--------|---------|-----------|------------|
| (none) | Universal workflow docs | Yes — copy to any project | Copied from template |
| `project-*` | Project-specific setup and conventions | No | Project maintainer |
| `template-*` | Tech stack from installed template | No | `dev-template` command |
| `plans/` | Implementation plans | No | AI + maintainer |

---

## Plans Folder

Implementation plans are stored in `plans/`:

```
plans/
├── backlog/      # Approved plans waiting for implementation
├── active/       # Currently being worked on (max 1-2 at a time)
└── completed/    # Done - kept for reference
```

### File Types

| Type | When to use |
|------|-------------|
| `PLAN-*.md` | Solution is clear, ready to implement |
| `INVESTIGATE-*.md` | Needs research first, approach unclear |

---

## Quick Reference

### When user says "I want to add X" or "Fix Y":

1. Create `INVESTIGATE-*.md` or `PLAN-*.md` in `plans/backlog/`
2. Ask user to review the plan
3. Wait for approval before implementing

### When user approves a plan:

1. Ask: "Do you want to work on a feature branch? (recommended)"
2. Create branch if yes
3. Move plan to `plans/active/`
4. Implement phase by phase
5. Ask user to confirm after each phase

### When implementation is complete:

1. Move plan to `plans/completed/`
2. Create Pull Request if on feature branch

---

## Project-Specific Instructions

See `CLAUDE.md` in the repo root for always-loaded rules (workflow enforcement, container rule).

See `project-*.md` files in this directory for project-specific setup, tools, and conventions.
