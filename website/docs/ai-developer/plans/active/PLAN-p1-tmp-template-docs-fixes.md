# Plan: Phase 1 — TMP fixes for templates with UIS services

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Active

**Goal**: Ship the TMP-side Phase 1 work from `INVESTIGATE-improve-template-docs-with-services.md`. Fix the bugs real-user testing surfaced in `python-basic-webserver-database` and `postgresql-demo`, plus the cross-cutting MDX generator and template hygiene issues.

**Investigation**: [INVESTIGATE-improve-template-docs-with-services.md](../backlog/INVESTIGATE-improve-template-docs-with-services.md)

**Cross-team dependencies**:
- **DCT**: shipping `PLAN-p1-dct-shim.md` (items 1.8 + 1.9 in the investigation) — DCT shim + `--namespace`/`--secret-name-prefix` pass-through
- **UIS**: shipping `PLAN-p1-uis-secret-namespace.md` (item 1.10 + 1.11 coordination) — `uis configure --namespace` + K8s Secret creation

**Priority**: High

**Last Updated**: 2026-04-09

---

## Overview

Three workstreams, sequenced by external dependencies:

1. **Independent (start immediately)**: generator fixes, template hygiene files. Items 1.1–1.4 from the investigation. No external dependencies.
2. **Blocked on DCT shim**: `postgresql-demo` README rewrite, `readme-structure.md` updates. Items 1.6 + 1.7 from the investigation.
3. **Blocked on DCT shim AND UIS minimum D5**: `python-basic-webserver-database` README rewrite, including the Verify section and the new `uis configure` flow. Items 1.5 + 1.12 + 1.13 from the investigation.

The plan is structured so that workstream 1 ships first as a single PR, then 2 and 3 ship as the upstream dependencies land.

**Coordination items not implemented in this plan** (tracked in the investigation, owned cross-team):
- 1.11 Secret name convention — TMP confirmed Option A (use `{{REPO_NAME}}` placeholder), no template changes needed. UIS implements per `PLAN-p1-uis-secret-namespace.md`.

---

## Phase 1: Independent TMP fixes (start immediately) — DONE

No external dependencies. Can ship as a single PR while DCT and UIS work in parallel.

### Tasks

- [x] 1.1 Update `scripts/generate-docs-markdown.sh` to route the install command by template `context` ✓
- [x] 1.2 Stop the generator from emitting a duplicated "## Summary" section ✓

- [x] 1.3 Add `.gitignore` to `templates/python-basic-webserver-database/`
- [x] 1.4 Add `.gitignore` to `uis-stack-templates/postgresql-demo/`
- [x] 1.5 Add `.vscode/settings.json` to `templates/python-basic-webserver-database/`
- [x] 1.6 Verify the `dev-template install` copy logic includes `.vscode/` and `.gitignore`
  - **Finding (DCT bug to flag):** Reviewed `helpers-no/devcontainer-toolbox/.devcontainer/manage/dev-template.sh` lines 88-131:
    - ✅ `.gitignore` is handled explicitly (lines 107-131) — DCT merges it intelligently
    - ✅ `.github/` is handled explicitly (lines 98-105)
    - ✅ `template-info.yaml` is copied explicitly (lines 93-96)
    - ❌ **`.vscode/` is NOT handled** — the bulk copy `cp -r "$TEMPLATE_PATH/"* "$CALLER_DIR/"` uses a glob `*` which by default does NOT match hidden directories. The `.vscode/settings.json` we just created in 1.5 will not be copied to user projects.
  - **Action:** flag to DCT as a follow-up. Either:
    - Add an explicit copy step for `.vscode/` (matching the `.github/` pattern), OR
    - Use `cp -rT` with `shopt -s dotglob` to include hidden files in the bulk copy, OR
    - Use `rsync -a` instead of `cp -r`
  - **Not blocking this PR** — we ship the template files; DCT fixes their copy logic separately. Once DCT ships the fix, the `.vscode/settings.json` will start appearing in new projects without us having to do anything.

- [ ] 1.7 Regenerate the registry and docs locally
  - `bash scripts/generate-registry.sh`
  - `bash scripts/generate-docs-markdown.sh --force`
  - `npm run build --prefix website` to verify no build errors
  - Confirm the postgresql-demo page now shows `uis template install postgresql-demo` as the install command (1.1)
  - Confirm the duplicated `## Summary` is gone (1.2)

### Validation — DONE

- [x] `bash scripts/validate-metadata.sh` passes — 5 categories, 10 templates
- [x] `bash scripts/validate-docs.sh` passes — 0 errors, 4 warnings (optional headings only)
- [x] `npm run build --prefix website` succeeds in devcontainer
- [x] postgresql-demo MDX page shows `install="uis template install postgresql-demo"` (1.1 verified)
- [x] python-basic-webserver-database MDX page uses `install="dev-template python-basic-webserver-database"` (existing behavior preserved)
- [x] No `## Summary` section emitted by generator (1.2 verified)
- [ ] User confirms Phase 1 complete before moving to dependent phases

---

## Phase 2: README rewrite — `postgresql-demo` — DONE

**Blocked on**: DCT 1.8 (uis shim) shipping. ✓ DCT v1.7.34 is live.

### Tasks

- [x] 2.1 Drop the misleading "From the UIS provision-host:" prefix throughout the README ✓
- [x] 2.2 Populate `related:` in `template-info.yaml` with `[python-basic-webserver-database]` — auto-generated "Related Templates" section now appears ✓
- [x] 2.3 Add a "Before you start" prerequisite section ✓
- [x] 2.4 Update the "Verify it worked" section to use `uis connect postgresql demo_db` ✓
- [x] 2.5 Regenerate docs and verify the build ✓ (validate-docs passes, npm run build SUCCESS)

### Validation

- `bash scripts/generate-docs-markdown.sh --force` regenerates the postgresql-demo MDX page
- `npm run build --prefix website` succeeds
- The rendered postgresql-demo page no longer references "From the UIS provision-host:"
- The "Related Templates" section appears, linking to python-basic-webserver-database
- User confirms phase is complete

---

## Phase 3: README rewrite — `python-basic-webserver-database`

**Blocked on**: DCT 1.8 (uis shim) AND UIS 1.10 (minimum D5) shipping. The README needs both — the shim for clean `uis ...` commands, and the new `uis configure --namespace` flow for the install instructions.

This is the big one. The current README has 8 distinct issues that all collapse into a coordinated rewrite around the canonical workflow from the investigation (Part 6).

### Tasks

- [ ] 3.1 Add a "What this is" section near the top, before Quick Start
  - One paragraph: Flask web server, PostgreSQL connection, tasks table, three endpoints
  - Endpoints table: `/`, `/tasks`, `/health` with descriptions and example responses
  - What you'll see when it runs (Flask debug server output)
  - Solves: B4

- [ ] 3.2 Add a "Before you start" section
  - Same template as 2.3 — verify UIS provision-host is running
  - Solves: C5

- [ ] 3.3 Replace the "Quick Start" section with the canonical workflow
  - **Step 1**: `dev-template python-basic-webserver-database` (the missing first step from B1)
  - **Step 2**: Verify UIS is running (delete the wrong "Deploy via postgresql-demo" instruction from B8 — replace with `uis status postgresql` and the trust-`dev-template-configure`-to-tell-you message)
  - **Step 3**: Edit `template-info.yaml` (with inline content showing the params section) and optionally `config/init-database.sql` (with inline content)
  - **Step 4**: Run `dev-template-configure`
  - **Step 5**: Verify the database with `uis connect postgresql <db>` (the new Verify section from B2 + 1.12 + 1.13)
  - **Step 6**: Run the app with `uv venv` + `uv pip install` + `python app/app.py` (B5)
  - **Step 7**: Deploy: `git push` + `./uis argocd register` (Phase 2 will replace step 7 with `dev-template register`)
  - Solves: B1, B2, B3, B5, B8 + 1.12 + 1.13

- [ ] 3.4 Embed `template-info.yaml` content inline (per B3)
  - Show the full file in a code block in the README (or at minimum the `params:` and `requires:` sections)
  - Add an "About this file" subsection explaining: this file is read by `dev-template-configure`, edit `params:` to set values, the `requires:` section declares the PostgreSQL dependency
  - Solves: B3 (template-info.yaml part)

- [ ] 3.5 Embed `config/init-database.sql` content inline (per B3)
  - Show the SQL in a code block
  - Add a one-line explanation: this file is applied to PostgreSQL by `uis configure` via `psql --set ON_ERROR_STOP=on`. Edit it to customise the schema. Idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).
  - Solves: B3 (init SQL part)

- [ ] 3.6 Remove the "Docker Build" and "Kubernetes Deployment" sections
  - These describe a manual workflow that bypasses GitHub Actions + ArgoCD
  - Replace with a single "Deploy" section walking through `git push` → GitHub Actions → ArgoCD → access at `<name>.localhost`
  - Mention `./uis argocd register` (for now) — Phase 2 will introduce `dev-template register`
  - Solves: B7

- [ ] 3.7 Update README for app run to use `uv` exclusively
  - Show `uv venv && source .venv/bin/activate && uv pip install -r requirements.txt && python app/app.py`
  - Or one-liner: `uv venv && uv pip install -r requirements.txt && uv run python app/app.py`
  - Mention that VS Code's Python extension uses `uv` because of the `.vscode/settings.json` shipped in 1.5
  - Solves: B5 (deeper than 1.5 — also rewrites the Quick Start example)

- [ ] 3.8 Verify and regenerate

### Validation

- `bash scripts/validate-docs.sh` passes
- `bash scripts/generate-docs-markdown.sh --force` succeeds
- `npm run build --prefix website` succeeds
- Spot-check the rendered python-basic-webserver-database page: every step in the canonical workflow is present, in order, with the right commands
- **Real-user re-test**: install the template into a scratch project, follow the README literally, confirm the original walls (uv warnings, missing dev-template step, wrong postgresql-demo prerequisite, etc.) are all fixed
- User confirms phase is complete

---

## Phase 4: Cross-cutting docs — `readme-structure.md`

This phase can run in parallel with Phase 3 (it doesn't depend on the DCT shim or UIS Secret work — only on the decisions documented in Phases 2 and 3).

### Tasks

- [ ] 4.1 Update `website/docs/contributors/readme-structure.md` to require a "Before you start" section for templates with `requires`
  - Document the section template (verify UIS provision-host is running)
  - Note that the section is enforced by `validate-docs.sh` for templates that declare `requires`
  - Solves: C5 (cross-template enforcement)

- [ ] 4.2 Update `readme-structure.md` to require a "Verify it worked" section for templates with `requires`
  - Document the standard pattern: `uis connect <service> <db>` for data services
  - Solves: B2 (cross-template enforcement — now every template with `requires` will have one)

- [ ] 4.3 Remove "Docker Build" and "Kubernetes Deployment" from the suggested optional sections list in `readme-structure.md`
  - Replace with a "Deploy" section description that describes the GitOps workflow
  - Solves: B7 (cross-template — prevents future templates from making the same mistake)

- [ ] 4.4 Update `readme-structure.md` with the requirement to embed `template-info.yaml` and init file contents inline for templates with `requires`
  - Solves: B3 (cross-template enforcement)

- [ ] 4.5 Optional: extend `validate-docs.sh` to enforce the new requirements
  - Check that templates with `requires` have a "Before you start" heading
  - Check that templates with `requires` have a "Verify it worked" heading
  - Defer if it's more than ~30 minutes of work — can ship in a follow-up

### Validation

- `bash scripts/validate-docs.sh` passes
- The rendered `readme-structure.md` page on the local Docusaurus build shows the new requirements
- User confirms phase is complete

---

## Acceptance Criteria

- [ ] Generator routes install commands by `context` (postgresql-demo shows `uis template install`)
- [ ] Generator no longer emits duplicated `## Summary` sections
- [ ] Both templates have `.gitignore` files preventing `.env*` from being committed
- [ ] python-basic-webserver-database has `.vscode/settings.json` enabling `python-envs.alwaysUseUv`
- [ ] postgresql-demo README uses bare `uis ...` commands (no "From the UIS provision-host:" prefix)
- [ ] postgresql-demo README links to python-basic-webserver-database via `related:`
- [ ] python-basic-webserver-database README follows the canonical workflow from the investigation
- [ ] python-basic-webserver-database README has a "What this is" section, "Before you start" section, and "Verify it worked" section
- [ ] python-basic-webserver-database README embeds `template-info.yaml` and `config/init-database.sql` content inline
- [ ] python-basic-webserver-database README's Quick Start uses `uv` (not `pip`)
- [ ] python-basic-webserver-database README's "Docker Build" / "Kubernetes Deployment" sections are gone, replaced by a "Deploy" section using GitHub Actions + ArgoCD
- [ ] `readme-structure.md` documents the new section requirements for templates with `requires`
- [ ] `bash scripts/validate-metadata.sh` passes
- [ ] `bash scripts/validate-docs.sh` passes
- [ ] `npm run build --prefix website` passes inside the devcontainer
- [ ] CI pipeline is green after merge

---

## Files to Modify

### Phase 1 (independent)

**Generator:**
- `scripts/generate-docs-markdown.sh` — install command routing (1.1) + drop duplicated Summary (1.2)

**Templates (new files):**
- `templates/python-basic-webserver-database/.gitignore` (1.3)
- `templates/python-basic-webserver-database/.vscode/settings.json` (1.5)
- `uis-stack-templates/postgresql-demo/.gitignore` (1.4)

### Phase 2 (postgresql-demo)

- `uis-stack-templates/postgresql-demo/README-postgresql-demo.md` (rewrite)
- `uis-stack-templates/postgresql-demo/template-info.yaml` (populate `related:`)

### Phase 3 (python-basic-webserver-database)

- `templates/python-basic-webserver-database/README-python-basic-webserver-database.md` (full rewrite around canonical workflow)

### Phase 4 (cross-cutting docs)

- `website/docs/contributors/readme-structure.md` (new section requirements)
- `scripts/validate-docs.sh` (optional — extend to enforce new requirements)
- `scripts/validate-rules.conf` (optional — add new rule entries)

### Auto-regenerated by CI (don't hand-edit)

- `website/src/data/template-registry.json`
- `website/docs/templates/demo/postgresql-demo.mdx`
- `website/docs/templates/basic-web-server-database/python-basic-webserver-database.mdx`
- `website/docs/ai-developer/plans/*/index.md`

---

## Implementation Notes

**Branch strategy**: each Phase becomes its own PR. Phase 1 is the "ship now" PR. Phases 2, 3, 4 ship as their dependencies land.

**Phase 1 PR title**: `Phase 1 — Independent TMP fixes for templates with UIS services`
**Phase 2 PR title**: `Phase 2 — postgresql-demo README rewrite (after DCT shim)`
**Phase 3 PR title**: `Phase 3 — python-basic-webserver-database README rewrite (after DCT shim + UIS Secret)`
**Phase 4 PR title**: `Phase 4 — readme-structure.md updates`

**Test in the devcontainer, not on the host.** All script runs (`generate-docs-markdown.sh`, `validate-docs.sh`, `npm run build`) should run inside the dev-templates devcontainer to match the CI environment.

**Real-user re-test for Phase 3.** After Phase 3 ships, install python-basic-webserver-database into a fresh scratch project and walk through every step of the README literally. The original user testing found 8+ issues by doing this — a re-test is the only way to confirm Phase 3 actually works.

**Don't add features beyond what the investigation specifies.** Phase 2 and 3 issues like "deduplicate the README intro paragraph against the Summary section" are tempting but out of scope (they're tracked as Phase 2 work in the investigation). Stay strictly within Phase 1.

---

## Cross-references

- **Investigation**: [INVESTIGATE-improve-template-docs-with-services.md](../backlog/INVESTIGATE-improve-template-docs-with-services.md)
- **DCT plan** (cross-team): `helpers-no/devcontainer-toolbox` → `PLAN-p1-dct-shim.md`
- **UIS plan** (cross-team): `helpers-no/urbalurba-infrastructure` → `PLAN-p1-uis-secret-namespace.md`
- **Coordination items in the investigation**:
  - 1.8 (DCT shim) — blocks Phases 2, 3, 4
  - 1.10 (UIS minimum D5) — blocks Phase 3
  - 1.11 (secret name convention) — TMP confirmed Option A, no template changes needed
