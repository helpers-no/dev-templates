# Plan: Repository Cleanup and README Rewrite

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Completed

**Completed**: 2026-03-29

**Goal**: Remove obsolete files, preserve valuable content for future Docusaurus site, and rewrite the README to accurately describe the repo.

**Investigation**: [INVESTIGATE-repo-cleanup.md](../completed/INVESTIGATE-repo-cleanup.md)

**Last Updated**: 2026-03-29

---

## Overview

Three things need to happen:
1. Delete the obsolete `terchris/` folder
2. Preserve the Red Cross case study and architecture diagrams in `website/docs/`
3. Rewrite `README.md` focused on what this repo actually is

---

## Phase 1: Preserve Valuable Content from README — DONE

### Tasks

- [x] 1.1 Create `website/docs/case-study-red-cross.md` ✓
- [x] 1.2 Create `website/docs/architecture.md` ✓
- [x] 1.3 Create `website/docs/developer-setup-guide.md` ✓

### Validation

User confirms the extracted files capture all valuable content from the current README.

---

## Phase 2: Delete `terchris/` Folder — DONE

### Tasks

- [x] 2.1 Delete `terchris/` folder entirely (35 files removed) ✓

### Validation

`terchris/` no longer exists.

---

## Phase 3: Rewrite README.md — DONE

### Tasks

- [x] 3.1 Rewrite `README.md` ✓

**Title**: Dev Templates

**Sections**:
1. **What this repo is** — Template repository for the Urbalurba developer platform. Contains project templates and AI workflow templates, consumed by scripts in devcontainer-toolbox.

2. **Repository Structure** — Show the top-level layout:
   ```
   dev-templates/
   ├── templates/        # App templates (used by dev-template.sh)
   ├── ai-templates/     # AI workflow templates (used by dev-template-ai.sh)
   └── website/docs/     # Documentation (future Docusaurus site)
   ```

3. **App Templates** — Table of available and planned templates with status (✅/🔄), preserving the current roadmap:
   - Backend: Basic Web Server (6 languages ✅), Database, Message Queue, Serverless, Object Storage (🔄)
   - Application: Basic React App (✅), Basic NextJs App (🔄)
   - API: Red Cross Norway Organization API (🔄)

4. **AI Workflow Templates** — Table listing plan-based-workflow and how it's used

5. **How Templates Work** — Brief explanation:
   - App templates are installed via `dev-template.sh` inside the devcontainer
   - AI templates are installed via `dev-template-ai.sh` (coming soon)
   - Both scripts download from this repo automatically

6. **Template Features** — The detailed feature table from the current README (it's useful)

7. **Contributing** — Link to `website/docs/ai-developer/` for the AI-assisted development workflow

### Validation

User confirms the new README is accurate and covers everything needed.

---

## Acceptance Criteria

- [ ] `terchris/` folder deleted
- [ ] Red Cross case study preserved in `website/docs/case-study-red-cross.md`
- [ ] Architecture diagrams preserved in `website/docs/architecture.md`
- [ ] Developer setup guide preserved in `website/docs/developer-setup-guide.md`
- [ ] `README.md` rewritten — focused on templates, accurate paths, includes ai-templates
- [ ] Planned templates (🔄) retained in the README
- [ ] No references to "urbalurba-infrastructure" or old paths in the README
