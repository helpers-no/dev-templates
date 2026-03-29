# Investigate: Create ai-developer Setup as an AI Template

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Completed

**Completed**: 2026-03-29

**Goal**: Create AI workflow templates that can be installed into any project via a new `dev-template-ai.sh` command, following the same pattern as `dev-template.sh` for app templates.

**Last Updated**: 2026-03-29

**DCT counterpart**: `helpers-no/devcontainer-toolbox` → `website/docs/ai-development/ai-developer/plans/backlog/INVESTIGATE-ai-workflow-installer.md` — covers the `dev-template-ai.sh` script implementation. **Update that file if any design decisions change here.**

---

## Context

The `website/docs/ai-developer/` folder in this repo contains 6 portable documentation files (README.md, WORKFLOW.md, PLANS.md, DEVCONTAINER.md, GIT.md, TALK.md) that define a universal AI development workflow. These files contain no project-specific content and can be copied to any project.

Currently, setting up a new project for AI-assisted development requires manually copying these files. We want a parallel template system — just like `dev-template.sh` lets users pick an app template from `templates/`, a new `dev-template-ai.sh` would let users pick an AI workflow template from `ai-templates/`.

---

## Questions to Answer

1. ~~How does `dev-template` currently work?~~ — **Answered** (see findings below)
2. ~~Where should the ai-developer template files live?~~ — **Answered**: `ai-templates/` folder in this repo, parallel to `templates/`
3. ~~Should this reuse `dev-template.sh` or be a separate script?~~ — **Answered**: Separate script `dev-template-ai.sh` in devcontainer-toolbox
4. ~~What should each AI template install into the target project?~~ — **Answered**: The 6 portable docs, plans folder with .gitkeep files, a starter CLAUDE.md, and a skeleton `project-*.md` with TODOs for the user to fill in
5. ~~How should the script handle target path placement?~~ — **Answered**: Use `docs/ai-developer/` as the standard path, baked into the template
6. ~~How should CLAUDE.md be handled if one already exists?~~ — **Answered**: See CLAUDE.md strategy below

---

## Investigation Findings

### How `dev-template.sh` Works (devcontainer-toolbox v1.6.0)

**Location:** `devcontainer-toolbox/.devcontainer/manage/dev-template.sh`

**Process:**
1. Checks prerequisites (`dialog`, `unzip`)
2. Detects GitHub org and repo name from `git remote` (via `lib/git-identity.sh`)
3. Downloads `helpers-no/dev-templates` repo as zip from GitHub
4. Scans `templates/*/` directories, reads `TEMPLATE_INFO` from each
5. Shows interactive `dialog` menu grouped by category
6. User selects a template, sees details, confirms
7. **Validates:** requires `manifests/` dir and `manifests/deployment.yaml`
8. Copies all template files to project root (`$CALLER_DIR/`)
9. Sets up `.github/workflows/` if present
10. Merges `.gitignore` intelligently
11. Replaces `{{GITHUB_USERNAME}}` and `{{REPO_NAME}}` placeholders in YAML files
12. Cleans up temp dir

**Template structure:**
```
templates/<name>/
├── TEMPLATE_INFO          # Metadata: name, description, category, purpose
├── manifests/             # REQUIRED by script validation
│   ├── deployment.yaml
│   └── kustomization.yaml
├── Dockerfile
├── app/
├── .github/workflows/
├── .gitignore
└── README-<name>.md
```

**TEMPLATE_INFO format:**
```bash
TEMPLATE_NAME="TypeScript Basic Webserver"
TEMPLATE_DESCRIPTION="Express.js server with TypeScript, health endpoint, and Docker support"
TEMPLATE_CATEGORY="WEB_SERVER"    # WEB_SERVER | WEB_APP | OTHER
TEMPLATE_PURPOSE="Provides a minimal starting point for..."
```

### Why a Separate Script

`dev-template.sh` is purpose-built for app scaffolding:
- **Hard-requires** `manifests/deployment.yaml` — AI templates have no Kubernetes manifests
- **Copies to project root** — AI templates need files in a subdirectory (`docs/ai-developer/`)
- **Replaces K8s placeholders** in YAML — AI templates don't need this
- **Sets up CI/CD workflows** — not relevant for AI workflow docs

Modifying `dev-template.sh` to handle both use cases would add complexity and risk to a working system. The two template types are complementary — a project runs `dev-template.sh` for the app, then `dev-template-ai.sh` for the AI workflow.

---

## Chosen Approach: Parallel Template System

### Architecture

```
helpers-no/dev-templates (this repo)
├── templates/              # App templates (used by dev-template.sh)
│   ├── typescript-basic-webserver/
│   ├── python-basic-webserver/
│   └── ...
├── ai-templates/           # AI workflow templates (used by dev-template-ai.sh)
│   ├── plan-based-workflow/
│   └── ...future templates...
```

```
helpers-no/devcontainer-toolbox (DCT repo)
└── .devcontainer/manage/
    ├── dev-template.sh       # Existing — installs app templates
    └── dev-template-ai.sh    # New — installs AI workflow templates
```

### AI Template Structure

Each AI template in `ai-templates/` follows the same metadata pattern:

```
ai-templates/<name>/
├── TEMPLATE_INFO              # Same format as app templates
└── template/                  # Files to install (preserving directory structure)
    ├── docs/ai-developer/
    │   ├── README.md
    │   ├── WORKFLOW.md
    │   ├── PLANS.md
    │   ├── DEVCONTAINER.md
    │   ├── GIT.md
    │   ├── TALK.md
    │   ├── CLAUDE-template.md # Reference CLAUDE.md (see CLAUDE.md strategy below)
    │   ├── project-TEMPLATE.md # Skeleton project file with TODOs
    │   └── plans/
    │       ├── backlog/.gitkeep
    │       ├── active/.gitkeep
    │       └── completed/.gitkeep
    └── CLAUDE.md              # Starter CLAUDE.md pointing to docs
```

The `template/` subdirectory contains the file tree as it should appear in the target project. The script copies its contents preserving the directory structure.

**TEMPLATE_INFO for plan-based-workflow:**
```bash
TEMPLATE_NAME="Plan-Based AI Workflow"
TEMPLATE_DESCRIPTION="Structured AI development with plans, phases, and validation"
TEMPLATE_CATEGORY="WORKFLOW"
TEMPLATE_PURPOSE="Provides a complete AI-assisted development workflow with investigation plans, phased implementation, and human-in-the-loop validation. Includes CLAUDE.md, plan templates, and git safety rules."
```

### How `dev-template-ai.sh` Differs from `dev-template.sh`

| Aspect | `dev-template.sh` | `dev-template-ai.sh` |
|--------|-------------------|---------------------|
| Source folder | `templates/` | `ai-templates/` |
| Validation | Requires `manifests/deployment.yaml` | No manifests requirement |
| File placement | Copies to project root | Copies `template/` contents preserving paths |
| Placeholder replacement | `{{GITHUB_USERNAME}}`, `{{REPO_NAME}}` in YAML | `{{REPO_NAME}}` in CLAUDE.md and project-*.md |
| GitHub workflows | Copies `.github/workflows/` | Not applicable |
| .gitignore merge | Yes | Not needed |
| Dialog menu | Yes — same UX | Yes — same UX |
| Download source | `helpers-no/dev-templates` zip | Same zip, different folder |

### What the Script Installs (plan-based-workflow)

When a developer runs `dev-template-ai.sh` and selects "Plan-Based AI Workflow":

```
target-project/
├── docs/ai-developer/
│   ├── README.md              # Universal entry point
│   ├── WORKFLOW.md            # Plan-based workflow
│   ├── PLANS.md               # Plan structure and templates
│   ├── DEVCONTAINER.md        # DCT devcontainer guide
│   ├── GIT.md                 # Git safety rules
│   ├── TALK.md                # AI-to-AI testing protocol
│   ├── CLAUDE-template.md     # Reference copy (only if CLAUDE.md conflict)
│   ├── project-TEMPLATE.md    # Skeleton with TODOs for user to fill in
│   └── plans/
│       ├── backlog/.gitkeep
│       ├── active/.gitkeep
│       └── completed/.gitkeep
└── CLAUDE.md                  # Thin enforcer pointing to docs/ai-developer/
```

### CLAUDE.md Strategy

The template includes two CLAUDE.md-related files:

- **`CLAUDE.md`** — the starter file that goes at project root, pointing to `docs/ai-developer/`
- **`CLAUDE-template.md`** — a reference copy stored inside `docs/ai-developer/`

**Script behavior:**

1. **No existing CLAUDE.md**: Script copies `CLAUDE.md` to project root. Done.
2. **Existing CLAUDE.md**: Script does NOT overwrite it. Instead, it keeps `CLAUDE-template.md` in `docs/ai-developer/` and prints:

```
⚠️  CLAUDE.md already exists in your project.
   A template CLAUDE.md has been placed at docs/ai-developer/CLAUDE-template.md

   Ask your AI assistant: "Merge CLAUDE-template.md into my CLAUDE.md"
```

This way the AI can do a smart merge — it understands both files and can combine them sensibly. No risk of overwriting the user's existing configuration.

### Skeleton project-TEMPLATE.md

The template includes a `project-TEMPLATE.md` with TODOs that the user (or their AI assistant) fills in with project-specific details:

```markdown
# Project: {{REPO_NAME}}

TODO: Brief description of what this project does.

---

## Devcontainer

TODO: Document your devcontainer setup.

## Project Structure

TODO: Describe the project's directory layout.

## Available Commands

TODO: List the key commands for building, testing, and running.
```

The script replaces `{{REPO_NAME}}` during installation. The user renames it to `project-<their-project>.md` and fills in the details.

---

## Ownership Split

This work spans two repositories with different maintainers.

### This Repo (`helpers-no/dev-templates`) — AI template content

- [ ] Create `ai-templates/` folder structure
- [ ] Create `ai-templates/plan-based-workflow/TEMPLATE_INFO`
- [ ] Create `ai-templates/plan-based-workflow/template/` with the portable docs, plans folder, and starter CLAUDE.md
- [ ] Ensure the 6 portable docs are copied (not moved) from `website/docs/ai-developer/` — the originals stay for this project's own use

### DCT Repo (`helpers-no/devcontainer-toolbox`) — Script and installation logic

- [ ] Create `dev-template-ai.sh` in `.devcontainer/manage/`
- [ ] Follow the same patterns as `dev-template.sh` v1.6.0 (dialog menu, zip download, TEMPLATE_INFO scanning)
- [ ] Scan `ai-templates/` instead of `templates/`
- [ ] Copy `template/` contents preserving directory structure
- [ ] Handle `{{REPO_NAME}}` replacement in markdown files
- [ ] Handle CLAUDE.md conflict: if exists, keep `CLAUDE-template.md` in docs and print merge instructions; if not, copy to project root
- [ ] Register in `tools.json` / `categories.json` so it appears in `dev-help`

---

## Gaps Identified — All Resolved

### 1. Re-running the Script (Updates) — Resolved

The script is safe to run multiple times. This is how users get updated portable docs when templates are improved upstream. A simple `cp -r` of the `template/` contents overwrites template-owned files but does not touch user-created files (since they don't exist in the template source).

**What gets overwritten:** The 6 portable docs (README.md, WORKFLOW.md, PLANS.md, DEVCONTAINER.md, GIT.md, TALK.md) and `project-TEMPLATE.md` — these are template-owned files.

**What is never touched** (not in the template source, so `cp -r` ignores them):
- User-renamed `project-*.md` files (e.g., `project-myapp.md`)
- User files in `plans/` (backlog/, active/, completed/)
- `CLAUDE.md` at project root — uses the same conflict strategy as first install

### 2. CLAUDE-template.md Cleanup When No Conflict — Resolved

When there is no existing CLAUDE.md, the script copies `CLAUDE.md` to the project root and removes `CLAUDE-template.md` from `docs/ai-developer/` (not needed without a merge scenario).

### 3. project-TEMPLATE.md — No Rename by Script — Resolved

The script installs `project-TEMPLATE.md` as-is (with `{{REPO_NAME}}` replaced inside the content). The developer renames this file manually to match their project name (e.g., `project-myapp.md`). On re-runs, the script refreshes `project-TEMPLATE.md` but the user's renamed file is untouched.

### 4. No Update Mechanism — Resolved (Not Needed)

Re-running `dev-template-ai.sh` IS the update mechanism. It downloads the latest template from GitHub and overwrites the portable docs. Same pattern as `dev-template.sh`.

### 5. Portable Docs Internal Links — Verified, No Issue

The 6 portable docs reference each other with relative links (e.g., `[WORKFLOW.md](WORKFLOW.md)`). These work correctly regardless of where the `ai-developer/` directory is placed, since all links are relative within the same directory.

### 6. CLAUDE.md Template Content — Resolved

The starter CLAUDE.md follows the same pattern as this repo's own `CLAUDE.md`, with paths adjusted to `docs/ai-developer/` (the standard install path). The content is defined by this repo's existing CLAUDE.md — just rewritten with the correct paths. No new design needed.

### 7. Copy Mechanism — Resolved (Simple `cp -r`)

A simple `cp -r template/* $CALLER_DIR/` works correctly. It overwrites files that exist in both source and destination, but does not delete or touch files that only exist in the destination. The only special handling needed is the CLAUDE.md conflict logic (post-copy step).

### 8. Template Versioning — Not Needed for v1

No versioning mechanism. The user re-runs the script to get the latest. If versioning becomes needed later, a `TEMPLATE_VERSION` field could be added to `TEMPLATE_INFO`. Not a blocker.

---

## Open Questions for DCT Maintainer

1. ~~**CLAUDE.md merge strategy**~~ — **Answered**: Skip overwrite, place reference copy at `docs/ai-developer/CLAUDE-template.md`, instruct user to ask AI to merge (see CLAUDE.md strategy above)
2. **Category names**: App templates use `WEB_SERVER`, `WEB_APP`, `OTHER`. AI templates could use `WORKFLOW`, `RULES`, `MULTI_TOOL` — or just start with no categories until there are enough templates to warrant grouping.
3. **Script metadata**: What `SCRIPT_CATEGORY` should `dev-template-ai.sh` use in the devcontainer-toolbox system?

---

## Next Steps

- [x] Create PLAN for this repo's work (ai-templates folder + plan-based-workflow content) ✓ — see `plans/completed/PLAN-ai-templates-content.md`
- [x] File issue or handoff notes for DCT repo work (dev-template-ai.sh script) ✓ — updated `INVESTIGATE-ai-workflow-installer.md` in devcontainer-toolbox
