# Investigate: Repository Cleanup and README Update

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Completed

**Completed**: 2026-03-29

**Goal**: Clean up obsolete files, remove the `terchris/` folder, and update the README to accurately reflect the current state of the repository.

**Last Updated**: 2026-03-29

---

## Current State

The repo has evolved from a Red Cross-specific infrastructure project (`urbalurba-infrastructure`) to a general-purpose template repository (`helpers-no/dev-templates`). Several artifacts from the old structure remain:

### `terchris/` Folder — Obsolete

| Path | What it is | Still needed? |
|------|-----------|---------------|
| `terchris/dev-template.sh` | Old v1.1.0 of the template installer | **No** — superseded by v1.6.0 in devcontainer-toolbox |
| `terchris/devcontainer/dev/dev-template.sh` | Even older version (no version number, ~349 lines) | **No** — same reason |
| `terchris/deete/setup-local-dns.sh` | macOS/Linux local DNS helper (adds to /etc/hosts) | **No** — infrastructure concern, not a template concern. If needed, belongs in devcontainer-toolbox or urbalurba-infrastructure |
| `terchris/deete/setup-local-dns.bat` | Windows equivalent | **No** — same reason |
| `terchris/test/designsystemet-basic-react-app/` | Test copy of the React template | **No** — the real template is in `templates/designsystemet-basic-react-app/` |

**Recommendation:** Delete the entire `terchris/` folder.

### `README.md` — Outdated

The current README has several issues:

1. **Title says "Urbalurba-infrastructure Developer Platform"** — this repo is `dev-templates`, not `urbalurba-infrastructure`
2. **Red Cross case study** takes up the first half — this is org-specific context, not relevant to a general template repo
3. **References "urbalurba-infrastructure" repository** and setup steps for local K8s cluster — that's a different repo
4. **References old paths** like `.devcontainer/dev/dev-template.sh` — the command is now `dev-template` inside the devcontainer
5. **Template catalog is incomplete** — doesn't mention `ai-templates/` at all
6. **Technical details section** describes folder structure without `ai-templates/`
7. **No mention of the ai-developer docs** in `website/docs/ai-developer/`

### What the README Should Cover

This repo has three things:

1. **`templates/`** — App templates (TypeScript, Python, Go, Java, C#, PHP, React)
2. **`ai-templates/`** — AI workflow templates (plan-based-workflow)
3. **`website/docs/ai-developer/`** — The portable AI developer docs (source of truth, also used by this project itself)

The README should:
- Describe what this repo is (a template repository consumed by devcontainer-toolbox scripts)
- List available app templates with status
- List available AI templates
- Explain how templates are used (via `dev-template.sh` and `dev-template-ai.sh` in the devcontainer)
- Link to the ai-developer docs for contributors
- Keep the architecture diagram if still accurate
- Remove all Red Cross-specific content and urbalurba-infrastructure setup steps

---

## Questions to Answer

1. ~~Should the `terchris/` folder be deleted entirely?~~ — **Yes**, everything in it is obsolete
2. ~~Should the README be rewritten or incrementally updated?~~ — **Rewritten** — the current content is mostly about a different repo
3. ~~Should the Red Cross case study be preserved anywhere?~~ — **Yes**, move to `website/docs/` as a separate file. Docusaurus is planned for this repo (like DCT and UIS), so it will become a docs page later.
4. ~~Should the architecture diagram be kept?~~ — **Yes**, split diagrams into a separate file in `website/docs/` — they're good documentation for future Docusaurus site.
5. ~~Are the "planned" templates still planned?~~ — **Yes**, they're on the roadmap. Keep them in the README.

---

## Recommendation

**Delete `terchris/` entirely and rewrite the README.**

The README should be focused and accurate:
- What this repo is
- What templates are available
- How they're consumed
- How to contribute

The Red Cross case study and infrastructure setup instructions belong in `urbalurba-infrastructure`, not here.

---

## Next Steps

- [x] Get answers to questions 3, 4, and 5 above ✓
- [x] Create PLAN for the cleanup and README rewrite ✓ — see `plans/completed/PLAN-repo-cleanup.md`
