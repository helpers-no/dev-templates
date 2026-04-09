# Plan: Phase 1 — TMP fixes for templates with UIS services

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Completed (pending PR merge)

**Completed**: 2026-04-09

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
- [~] 1.5 ~~Add `.vscode/settings.json` to `templates/python-basic-webserver-database/`~~ — **REVERTED**
  - Initial implementation shipped a `.vscode/settings.json` with `python-envs.alwaysUseUv: true`. This was reverted because it would risk overwriting the user's existing `.vscode/settings.json` (or `extensions.json`) which contains the devcontainer recommendation needed for the project to start.
  - **New approach:** the README documents the setting as a one-line manual addition users can make to their workspace settings if they hit the VS Code "Error refreshing packages" cosmetic error. Doesn't risk overwriting anything.
  - **DCT follow-up:** ideally DCT ships `python-envs.alwaysUseUv: true` as a global devcontainer-level setting in the base image (per the open question in B6 of the investigation). Then no template needs to ship it. Tracked as a DCT ask.
  - Solves: B6 (via documentation, not via template file)
- [x] 1.6 Verify the `dev-template install` copy logic includes `.vscode/` and `.gitignore`
  - **Finding (still relevant for future templates):** Reviewed `helpers-no/devcontainer-toolbox/.devcontainer/manage/dev-template.sh` lines 88-131:
    - ✅ `.gitignore` is handled explicitly (lines 107-131) — DCT merges it intelligently
    - ✅ `.github/` is handled explicitly (lines 98-105)
    - ✅ `template-info.yaml` is copied explicitly (lines 93-96)
    - ❌ **`.vscode/` is NOT handled** — the bulk copy `cp -r "$TEMPLATE_PATH/"* "$CALLER_DIR/"` uses a glob `*` which by default does NOT match hidden directories.
    - ⚠️ **Even if DCT fixes the hidden-directory bug**, naively copying `.vscode/` would overwrite the user's existing `.vscode/extensions.json` with the devcontainer recommendation, breaking the project. DCT would need a JSON merge strategy similar to the `.gitignore` line-merge.
  - **DCT follow-up:** if DCT wants to support `.vscode/` in templates, they need both (a) include hidden directories in the bulk copy AND (b) implement JSON-merge for `.vscode/*.json` files (preserving existing keys). Until then, templates can't safely ship `.vscode/` files.
  - **Decision for this PR:** don't ship `.vscode/` from any template. Document VS Code settings in the README as manual additions instead.

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

## Phase 3: README rewrite — `python-basic-webserver-database` — DONE

**Blocked on**: DCT 1.8 (uis shim) AND UIS 1.10 (minimum D5) shipping. ✓ Both live (DCT v1.7.34, UIS PR #121).

### Tasks

- [x] 3.1 Add a "What this is" section near the top with endpoints table ✓
- [x] 3.2 Add a "Prerequisites" section (renamed from "Before you start" — uses the existing convention enforced by validate-rules.conf) ✓
- [x] 3.3 Replace Quick Start with the canonical 7-step workflow ✓
- [x] 3.4 Embed `template-info.yaml` content inline ✓
- [x] 3.5 Embed `config/init-database.sql` content inline ✓
- [x] 3.6 Remove "Docker Build" and "Kubernetes Deployment" sections, replace with single "Deploy" section ✓
- [x] 3.7 Quick Start uses `uv venv` + `uv pip install` + `python app/app.py` ✓
- [x] 3.8 Verify and regenerate ✓ (validate-docs passes, npm run build SUCCESS)

### Validation

- `bash scripts/validate-docs.sh` passes
- `bash scripts/generate-docs-markdown.sh --force` succeeds
- `npm run build --prefix website` succeeds
- Spot-check the rendered python-basic-webserver-database page: every step in the canonical workflow is present, in order, with the right commands
- **Real-user re-test**: install the template into a scratch project, follow the README literally, confirm the original walls (uv warnings, missing dev-template step, wrong postgresql-demo prerequisite, etc.) are all fixed
- User confirms phase is complete

---

## Phase 4: Cross-cutting docs — `readme-structure.md` — DONE

### Tasks

- [x] 4.1 `readme-structure.md` documents the "Prerequisites" / UIS-aware prerequisite requirements for templates with `requires` ✓
- [x] 4.2 `readme-structure.md` documents the "Verify it worked" requirement (`uis connect <service> <db>`) ✓
- [x] 4.3 Remove "Docker Build" and "Kubernetes Deployment" from the suggested sections list ✓
  - Also removed them from `validate-rules.conf` (no more spurious warnings)
  - Updated wording to discourage manual `docker build` / `kubectl apply` patterns
- [x] 4.4 `readme-structure.md` documents the requirement to embed `template-info.yaml` and init file contents inline ✓
- [ ] 4.5 (Deferred) Extend `validate-docs.sh` to enforce new requirements per-template — out of scope for this PR. The rules in `validate-rules.conf` apply globally to `README-*.md`; per-template enforcement would need template-info.yaml awareness in `validate-docs.sh`. Tracked as follow-up.

---

## Acceptance Criteria

- [x] Generator routes install commands by `context` (postgresql-demo shows `uis template install`)
- [x] Generator no longer emits duplicated `## Summary` sections
- [x] Both templates have `.gitignore` files preventing `.env*` from being committed
- [x] python-basic-webserver-database README documents the `python-envs.alwaysUseUv` setting as a manual workspace addition (not shipped as a file — see 1.5 reverted)
- [x] postgresql-demo README uses bare `uis ...` commands (no "From the UIS provision-host:" prefix)
- [x] postgresql-demo README links to python-basic-webserver-database via `related:`
- [x] python-basic-webserver-database README follows the canonical workflow from the investigation
- [x] python-basic-webserver-database README has "What this is", "Prerequisites", and "Verify the database" sections
- [x] python-basic-webserver-database README embeds `template-info.yaml` and `config/init-database.sql` content inline
- [x] python-basic-webserver-database README's Quick Start uses `uv` (not `pip`)
- [x] python-basic-webserver-database README's "Docker Build" / "Kubernetes Deployment" sections are gone, replaced by a "Deploy" section using GitHub Actions + ArgoCD
- [x] `readme-structure.md` documents the new section requirements for templates with `requires`
- [x] `validate-rules.conf` no longer warns on missing `## Docker Build` / `## Kubernetes Deployment` headings
- [x] `bash scripts/validate-metadata.sh` passes
- [x] `bash scripts/validate-docs.sh` passes (0 errors, 2 warnings — unrelated `plan-based-workflow` README)
- [x] `npm run build --prefix website` passes inside the devcontainer
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
