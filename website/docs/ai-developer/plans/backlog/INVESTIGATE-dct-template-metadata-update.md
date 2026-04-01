# Investigate: DCT Template Metadata Update

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Backlog

**Goal**: Update the DCT template installer scripts (`dev-template.sh`, `dev-template-ai.sh`) to work with the finalised template metadata fields from dev-templates.

**Priority**: High

**Last Updated**: 2026-04-01

**Related**:
- [INVESTIGATE-template-metadata-system.md](INVESTIGATE-template-metadata-system.md) — the dev-templates investigation that defined the metadata system (completed Phase A + B)
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
- Status: Backlog
- Updated: 2026-03-30 (dev-templates side completed)

### What's NOT covered by existing DCT plans
- `BASIC_WEB_SERVER` category rename (affects menu grouping in `dev-template.sh`)
- Extended metadata fields (ID, VER, TAGS, SUMMARY, LOGO, WEBSITE, DOCS, RELATED)
- `dev-template-ai.sh` implementation

---

## Coordination Notes

- **No backward compatibility needed** — software is not released yet, both repos can change at the same time
- **dev-templates side is done** — all metadata is stable on `main`, Docusaurus generates from it
- **DCT changes are independent** — the DCT maintainer can implement at their pace
- **Test with**: after DCT changes, run `dev-template` inside a devcontainer and verify it reads the new fields correctly from the dev-templates repo

---

## Next Steps

- [ ] DCT maintainer implements `PLAN-template-readme-instructions.md` (TEMPLATE_README + ABSTRACT rename)
- [ ] DCT maintainer implements `PLAN-template-tools-dct.md` (TEMPLATE_TOOLS auto-install)
- [ ] DCT maintainer handles BASIC_WEB_SERVER category rename
- [ ] DCT maintainer considers extended metadata for future `dev-template --list`
