# Plan: Transfer urbalurba-dev-templates to helpers-no (rename to dev-templates)

## Status: In Progress

**Goal**: Transfer this repo from `terchris/urbalurba-dev-templates` to `helpers-no/dev-templates` with zero downtime.

**Priority**: Medium

**Last Updated**: 2026-03-18

**Overall plan**: See `/Users/terje.christensen/learn/projects-2026/testing/github-helpers-no/INVESTIGATE-move-repos-to-helpers-no.md`

**Report back**: After completing each phase, update the overall plan's checklist in the file above. Mark the urbalurba-dev-templates line as complete when all phases are done.

---

## Prerequisites

- **PLAN-transfer-to-helpers-no** in devcontainer-toolbox must be complete (container image at `ghcr.io/helpers-no/`)

---

## Problem

The repo lives under `terchris/urbalurba-dev-templates`. There are 18 references to `terchris` across 15 files. The repo will also be renamed from `urbalurba-dev-templates` to `dev-templates`.

---

## Phase 1: Create branch and fix references

### Tasks

- [x] 1.1 Create branch `move-to-helpers-no`
- [x] 1.2 Replace `ghcr.io/terchris/devcontainer-toolbox` → `ghcr.io/helpers-no/devcontainer-toolbox` in:
  - `.devcontainer/devcontainer.json`
- [x] 1.3 Replace `terchris/urbalurba-dev-templates` → `helpers-no/dev-templates` in:
  - `README.md`
- [ ] ~~1.4 Rename `terchris/` directory and update scripts within~~ — N/A: `terchris/` is a private local folder, not committed
  - `terchris/dev-template.sh`
  - `terchris/devcontainer/dev/dev-template.sh`
- [x] 1.5 Update `terchris` references in template content files:
  - `templates/typescript-basic-webserver/README-typescript-basic-webserver.md`
  - `templates/csharp-basic-webserver/README-csharp-basic-webserver.md`
  - `templates/python-basic-webserver/README-python-basic-webserver.md`
  - `templates/designsystemet-basic-react-app/` — various source files
- [ ] 1.6 Commit all changes to branch (do NOT merge)

### Validation

User confirms all references are updated. `grep -r "terchris" .` should return zero hits.

---

## Phase 2: Transfer and rename repo

### Tasks

- [ ] 2.1 Transfer repo on GitHub: Settings → Transfer → `helpers-no`
- [ ] 2.2 Rename repo from `urbalurba-dev-templates` to `dev-templates` in GitHub settings
- [ ] 2.3 Verify GitHub redirect works for both old name and old owner
- [ ] 2.4 Merge `move-to-helpers-no` branch

### Validation

Repo is at `https://github.com/helpers-no/dev-templates`.

---

## Phase 3: Update local clone

### Tasks

- [ ] 3.1 Update local git remote: `git remote set-url origin https://github.com/helpers-no/dev-templates.git`

### Validation

`git remote -v` shows `helpers-no/dev-templates`.

---

## Acceptance Criteria

- [ ] Repo is at `https://github.com/helpers-no/dev-templates`
- [ ] Container image ref points to `ghcr.io/helpers-no/devcontainer-toolbox:latest`
- [ ] No remaining `terchris` references
- [ ] `terchris/` directory renamed appropriately
- [ ] Old URL redirects work

---

## Files to Modify

- `.devcontainer/devcontainer.json`
- `README.md`
- `terchris/dev-template.sh` (rename directory + update content)
- `terchris/devcontainer/dev/dev-template.sh` (rename directory + update content)
- Template README files (3)
- designsystemet-basic-react-app source files (~6)
