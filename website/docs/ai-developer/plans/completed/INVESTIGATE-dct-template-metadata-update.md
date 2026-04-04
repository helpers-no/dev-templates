# Investigate: DCT Template Metadata Update

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Completed

**Completed**: 2026-04-02

**Goal**: Update the DCT template installer scripts (`dev-template.sh`, `dev-template-ai.sh`) to work with the finalised template metadata fields from dev-templates.

**Priority**: High

**Last Updated**: 2026-04-01

**Related**:
- [INVESTIGATE-template-metadata-system.md](../completed/INVESTIGATE-template-metadata-system.md) — the dev-templates investigation that defined the metadata system (completed Phase A + B)
- `helpers-no/devcontainer-toolbox` (DCT) — where the changes need to be made
- DCT plans already in backlog: `PLAN-template-readme-instructions.md`, `PLAN-template-tools-dct.md`

---

## Context

The dev-templates metadata system is now stable. All TEMPLATE_INFO files have been updated with the full field set, field naming aligns with DCT/UIS conventions, and the Docusaurus site generates from this metadata. The DCT template installer scripts need to be updated to read the new/renamed fields.

### What changed in dev-templates

| Change | Details |
|--------|---------|
| `TEMPLATE_PURPOSE` → `TEMPLATE_ABSTRACT` | Field renamed to align with DCT `SCRIPT_ABSTRACT` |
| `TEMPLATE_README` added | Points to the README filename for the completion message |
| `TEMPLATE_TOOLS` added | Already handled by DCT (completed earlier) |
| `TEMPLATE_DOCS` repurposed | Now points to GitHub source, not framework docs |
| `TEMPLATE_WEBSITE` can be empty | Will be used for live demo URLs in the future |
| `TEMPLATE_ID` added | Explicit ID (matches directory name) |
| `TEMPLATE_VER` added | Version number |
| `TEMPLATE_TAGS` added | Space-separated keywords |
| `TEMPLATE_SUMMARY` added | 3-5 sentence description |
| `TEMPLATE_LOGO` added | SVG logo filename |
| `TEMPLATE_RELATED` added | Space-separated related template IDs |
| `TEMPLATE_CATEGORY` values changed | `WEB_SERVER` → `BASIC_WEB_SERVER` |

### What DCT needs to update

**Critical (breaks existing functionality):**
1. `read_template_info()` reads `TEMPLATE_PURPOSE` → must read `TEMPLATE_ABSTRACT` instead
2. `TEMPLATE_CATEGORY` value `WEB_SERVER` changed to `BASIC_WEB_SERVER` — menu grouping affected

**New features:**
3. Read `TEMPLATE_README` and show it in the completion message (`cat README-xxx.md`)
4. Show `source ~/.bashrc` in completion message when tools were installed

**Nice to have (future):**
5. Read and display extended metadata (tags, website, related) in the template selection dialog
6. Support `dev-template --list` with rich output
7. Update `dev-template-ai.sh` to use the same metadata system

---

## DCT Plans Already Tracking This

These plans already exist in `helpers-no/devcontainer-toolbox`:

### `PLAN-template-readme-instructions.md`
- Covers: `TEMPLATE_README` field, `TEMPLATE_ABSTRACT` rename, completion message update
- Status: Backlog
- Updated: 2026-03-30 (includes the PURPOSE→ABSTRACT rename task)

### `PLAN-template-tools-dct.md`
- Covers: `TEMPLATE_TOOLS` auto-install
- Status: **Completed** (2026-03-30)

### What's NOT covered by existing DCT plans
- `BASIC_WEB_SERVER` category rename (affects menu grouping in `dev-template.sh` — the hardcoded `WEB_SERVER` category in the dialog menu must be updated)
- Extended metadata fields (ID, VER, TAGS, SUMMARY, LOGO, WEBSITE, DOCS, RELATED) — not urgent, but enables future `dev-template --list` with rich output
- `dev-template-ai.sh` implementation — tracked separately in DCT's `INVESTIGATE-ai-workflow-installer.md` (completed)

### DCT investigation created
`INVESTIGATE-template-categories-dynamic.md` created in DCT backlog — covers replacing hardcoded categories with dynamic `TEMPLATE_CATEGORIES` sourcing, including file format, location, and implementation guidance.

---

## Coordination Notes

- **No backward compatibility needed** — software is not released yet, both repos can change at the same time
- **dev-templates side is done** — all metadata is stable on `main`, Docusaurus generates from it
- **DCT changes are independent** — the DCT maintainer can implement at their pace
- **Test with**: after DCT changes, run `dev-template` inside a devcontainer and verify it reads the new fields correctly from the dev-templates repo
- **The category rename is critical** — categories are hardcoded in `dev-template.sh` (lines ~120-180) as `CATEGORY_WEB_SERVER`, `CATEGORY_WEB_APP`, and `CATEGORY_OTHER`. The `case` statement on line ~140 matches `WEB_SERVER)` which won't match `BASIC_WEB_SERVER` — templates will fall into "Other". The fix is to update the case statement and associative array variable names. Ideally DCT should stop hardcoding categories and instead read them dynamically from the `TEMPLATE_CATEGORY` values in the downloaded TEMPLATE_INFO files.
- **Canonical category list** — the source of truth for categories is `scripts/lib/TEMPLATE_CATEGORIES` in the dev-templates repo. Current categories: `BASIC_WEB_SERVER`, `WEB_APP`, `WORKFLOW`.

### How DCT gets the category file — IMPLEMENTED

DCT uses **git sparse-checkout** to download only the `templates/` (or `ai-templates/`) folder — not the full repo. So files in `scripts/lib/` are not available to DCT at runtime.

**Solution (implemented):** The dev-templates repo maintains the category definitions in one place (`scripts/lib/TEMPLATE_CATEGORIES`) and CI automatically copies it into both `templates/` and `ai-templates/` with an "AUTO-GENERATED — DO NOT EDIT" header. This way:

- **Source of truth**: `scripts/lib/TEMPLATE_CATEGORIES` (edit only here)
- **Auto-copied to**: `templates/TEMPLATE_CATEGORIES` and `ai-templates/TEMPLATE_CATEGORIES` (by CI, with DO NOT EDIT header)
- **DCT reads**: `$TEMPLATE_REPO_DIR/templates/TEMPLATE_CATEGORIES` (already in the sparse-checkout, no extra download)
- **Format**: DCT-style `CATEGORY_TABLE` (pipe-delimited, can be sourced as bash)
- **Fields**: `ORDER|ID|NAME|DESCRIPTION|TAGS|LOGO|EMOJI`
- **Emoji field**: used by DCT for terminal dialog menus (🌐=Basic Web Server, 📱=Web App, 🤖=Workflow)
- **`scripts/lib/categories.sh`** sources `TEMPLATE_CATEGORIES` instead of having its own data — one source of truth

**dev-templates tasks — ALL DONE:**
- [x] Created `scripts/lib/TEMPLATE_CATEGORIES` with DCT-style `CATEGORY_TABLE` format including emoji field
- [x] CI auto-copies to `templates/` and `ai-templates/` with "DO NOT EDIT" header
- [x] `scripts/lib/categories.sh` sources from `TEMPLATE_CATEGORIES` — no duplicate data
- [x] Added `get_category_emoji()` function

**DCT tasks — ALL DONE:**
- [x] Updated `dev-template.sh` to source `TEMPLATE_CATEGORIES` dynamically ✓
- [x] Updated `dev-template-ai.sh` similarly ✓
- [x] Replaced hardcoded category case statements with dynamic grouping from `TEMPLATE_CATEGORY_TABLE` ✓
- [x] Category parsing moved to `lib/template-common.sh` ✓
- [x] `TEMPLATE_ABSTRACT` and `TEMPLATE_README` read in `read_template_info()` ✓

---

## Next Steps

- [x] DCT maintainer implements `PLAN-template-readme-instructions.md` (TEMPLATE_README + ABSTRACT rename) ✓ — completed 2026-04-01
- [x] DCT maintainer implements `PLAN-template-tools-dct.md` (TEMPLATE_TOOLS auto-install) ✓ — completed 2026-03-30
- [x] DCT maintainer sources `TEMPLATE_CATEGORIES` and replaces hardcoded categories/emojis ✓ — implemented in `template-common.sh`
- [ ] DCT maintainer considers extended metadata for future `dev-template --list` (tracked in INVESTIGATE-unified-template-system)
