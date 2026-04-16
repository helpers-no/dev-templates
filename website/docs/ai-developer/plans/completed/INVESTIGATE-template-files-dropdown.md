# Investigate: Files Dropdown on Template Pages

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Complete (2026-04-16) — shipped via [PLAN-template-files-dropdown.md](PLAN-template-files-dropdown.md)

**Goal**: Add a collapsible list of a template's files to its documentation page, with each entry linking to the corresponding file on GitHub. Gives readers a quick overview of what a template actually contains, plus a one-click path from the docs to the source.

**Last Updated**: 2026-04-16

**Related**:
- [PLAN-environment-card-improvements.md](PLAN-environment-card-improvements.md) — introduced the `dropdownBlock` CSS class and the `templateCard` pattern this investigation reuses
- [PLAN-architecture-diagram-display.md](PLAN-architecture-diagram-display.md) — same patterns, second application

---

## Background

Template pages today have four cards rendered from registry data:

1. **TemplateHeader** — logo, name, description, abstract, install command, links, maintainers, tags
2. **Getting Started** — prerequisites + related templates
3. **Environment** — tools, services, init SQL, configure command, setup, run, expected output
4. **Architecture** — Components + Flow diagrams (collapsible)

What's missing: a reader who wants to know "what files does this template actually ship?" has to either click through to the GitHub source link or browse the repo. A **Files** dropdown would surface the file list inline, with each entry linked to the file on GitHub for quick drill-down.

The pattern is low-risk because every building block already exists:
- `templateCard` + `templateCardEyebrow` for card styling
- `dropdownBlock` for the collapsible wrapper
- Registry generator already walks template directories for other purposes (init SQL files, README detection)
- Each template's `links[]` field already carries a `Source code` GitHub URL we can use as the base for per-file links

---

## Current state

Templates currently have only three ways for a reader to learn about what's in them:

1. **The Install command** shows the template ID but not the contents
2. **The README** describes the project structure in prose (often as an ASCII tree in a fenced code block — seen in several templates)
3. **The GitHub "Source code" link** in the TemplateHeader — one click takes the reader to the whole repo tree for that template

None of these give a scannable, in-page list of every file.

Looking at `python-basic-webserver-database` as the densest example, the file count is ~12:

```
templates/python-basic-webserver-database/
├── Dockerfile
├── README-python-basic-webserver-database.md
├── .dockerignore
├── .github/workflows/urbalurba-build-and-push.yaml
├── .gitignore
├── app/app.py
├── config/init-database.sql
├── manifests/deployment.yaml
├── manifests/ingress.yaml
├── manifests/kustomization.yaml
├── requirements.txt
└── template-info.yaml
```

Simpler app templates are ~8-10 files. Overlay and stack templates are smaller. Very manageable for a flat list.

---

## Open questions

### Q1. File selection — everything, or curated?

Three options:

**A — Every file in the template directory**, respecting `.gitignore`. Use `git ls-files` during registry generation to get the canonical tracked-files list.
- Pros: complete picture; matches what a developer sees when they `dev-template <name>`; zero curation needed (every new file shows up automatically)
- Cons: might include files that don't interest a first-time reader (`.dockerignore`, `.gitignore`); list gets long on bigger templates

**B — Curated list of "interesting" files** by path pattern: `app/**`, `manifests/**`, `config/**`, `Dockerfile`, `requirements.txt`, `package.json`, `go.mod`, `pom.xml`, `*.csproj`, `template-info.yaml`, `README-*.md`, `.github/workflows/**`.
- Pros: focused list; each entry is pedagogically meaningful
- Cons: curated patterns are project-maintainer state that can drift; new template types need new patterns; opinionated about what matters

**C — All files except a small denylist** — exclude `.gitignore`, `.dockerignore`, `.DS_Store`, anything `.gitignore`d.
- Pros: complete by default, clean by exception; cheapest to author
- Cons: slightly noisier than B; still shows files most readers won't care about

**Tentative recommendation**: **Option A** using `git ls-files`. It's the canonical source-of-truth list, it's what's actually in the template, it updates automatically, and even "uninteresting" files (like `.gitignore`) have pedagogical value — they show contributors what's considered part of the template's shipped surface.

**Decision (2026-04-16)**: **Option A — `git ls-files`**. ✅

### Q2. Flat list or tree?

**A — Flat list** with full relative paths: `app/app.py`, `manifests/deployment.yaml`, etc. One line per file, one `<a>` per line.

**B — Tree** grouped by directory, with folder names as non-clickable labels and files as links.

**C — Tree with collapsible folders**, each folder a `<details>` inside the outer dropdown.

**Tentative recommendation**: **Option A** (flat list). Scannable, works at any template size, minimal rendering complexity, no nested interaction state to manage. The full path is the path — `app/app.py` is just as searchable as `app/` → `app.py`. Templates are small enough that a tree doesn't add value.

**Decision (2026-04-16)**: **Option B — tree**. User override. Rendered as an indented markdown list: folder labels are non-clickable, files are linked. Folders aren't collapsible themselves (keeping interaction state simple); the outer Files dropdown is the only collapsible.

### Q3. Where on the page?

Two placements worth considering:

**A — New card** with a `FILES` eyebrow, positioned between Getting Started and Environment. Matches the existing card convention: one card per concern.

**B — New sub-section inside the Getting Started card**, alongside `### Prerequisites` and `### Related templates`, as `### Files`. Keeps the card count down.

**Tentative recommendation**: **Option B** (inside Getting Started). "Getting Started" is about "what you're getting into before you run it" — prereqs tell you what has to be true, related templates say what else to look at, files say what you're about to install. Natural three-section grouping. Saves a card on an already-dense page. **But**: if file list gets long (say >20 entries for some templates), its bulk might overwhelm the other two sub-sections; at that point, splitting into its own card is the right move.

**Decision (2026-04-16)**: **Option B — inside Getting Started** as a `### Files` sub-section between Prerequisites and Related templates. ✅

### Q4. GitHub URL construction

Each file entry needs a link to its GitHub blob URL.

**Decision (2026-04-16)**: **derive the URL from central constants**, not from `links[]`. The repo is known (`github.com/helpers-no/dev-templates`), the branch is known (`main`), and each template's folder location follows a deterministic pattern:

| Template type | Path pattern | Example |
|---|---|---|
| App | `templates/<id>` | `templates/python-basic-webserver-database` |
| Stack | `uis-stack-templates/<id>` | `uis-stack-templates/postgresql-demo` |
| Overlay | `ai-templates/<id>/template` | `ai-templates/plan-based-workflow/template` |

Constants live in one place (top of `generate-registry.ts` or a new `scripts/lib/repo-constants.ts`):

```ts
const REPO_BASE_URL = 'https://github.com/helpers-no/dev-templates';
const REPO_BRANCH = 'main';
```

Per-file URL: `${REPO_BASE_URL}/blob/${REPO_BRANCH}/${templateFolder}/${fileRelativePath}`

This sidesteps the "what if `Source code` link is missing" scenario entirely — the URL is computed from data the generator already has (template ID + type + filename), not from human-authored yaml. If the repo is ever forked or renamed, one constant changes.

### Q5. Collapsed by default?

Consistent with the other dropdowns on the page (`template-info.yaml` dropdown, `Expected output` dropdown, architecture diagrams): **collapsed by default**. The summary row shows something like `▶ Files (12)` with the count, so readers know how much is behind it without expanding.

**Decision (2026-04-16)**: **collapsed by default**. ✅

### Q6. Show file count in the summary row?

**A — Yes**: `▶ Files (12)` — tells the reader at a glance how much is behind the toggle. Matches the style of GitHub's own file-tree UI.

**B — No**: `▶ Files` — simpler, less meta-information.

**Tentative recommendation**: **Option A** (show count). Cheap to emit, useful signal. If a reader sees `Files (3)` they know it's a small template; `Files (25)` sets different expectations.

**Decision (2026-04-16)**: **Option A — show count in summary**. ✅

### Q7. Handle overlay / AI templates differently?

Overlay templates live under `ai-templates/<name>/template/` (the `template/` subfolder is the actual installed content). Stack templates live directly in `uis-stack-templates/<name>/`. App templates live directly in `templates/<name>/`. The registry generator already handles these path differences for other purposes.

**Question**: should the Files dropdown show the paths **relative to the template root** (e.g. `app/app.py`) or **relative to the repo root** (e.g. `templates/python-basic-webserver-database/app/app.py`)?

**Tentative recommendation**: **relative to the template root**. That's what the developer sees once they install the template — their `/workspace` mount maps the template root to `/workspace`, so `app/app.py` is literally the path they'll edit. Showing the repo-root path would be more accurate for GitHub navigation but less useful for mental modeling.

**Decision (2026-04-16)**: **relative to template root**. ✅ The `blob/main/...` URL still includes the repo-side prefix; it's just not shown in the link text.

### Q8. File size and/or icon per entry?

Nice-to-have metadata per file:
- Size (bytes or human-friendly KB)
- File-type icon (Dockerfile, yaml, py, ts, md)

**Tentative recommendation**: **skip for v1**. Focus on "the list exists and links work". If real users ask for more information per entry, add it in a follow-up. Bloating the v1 design with icons and sizes slows the first ship.

**Decision (2026-04-16)**: **skip for v1** per user's read of "cool but not needed". If v2 adds icons, the simplest approach is an extension-to-emoji map (📦 `package.json`, 🐳 `Dockerfile`, 🐍 `.py`, 📄 default). No CSS, no SVG imports. Deferred for now.

---

## Decisions locked in (2026-04-16)

- **File selection**: `git ls-files` — all tracked files ✅
- **Rendering**: tree structure (indented markdown list; folders non-clickable, files linked) ✅
- **Placement**: `### Files` sub-section inside the Getting Started card, between Prerequisites and Related templates ✅
- **GitHub URL**: auto-derived from central constants (`REPO_BASE_URL` + `REPO_BRANCH` + template path). No dependency on `links[]`. ✅
- **Default state**: collapsed ✅
- **Summary row**: shows file count — `▶ Files (12)` ✅
- **Path display**: relative to template root ✅
- **Icons**: skip for v1 (deferred; extension-to-emoji map is the easy path if we add them later) ✅

### Page shape after implementation

```
TemplateHeader card (logo, description, abstract, install, tags, maintainers)

GETTING STARTED card
  ### Prerequisites
    - [ ] DCT devcontainer running
    - [ ] UIS provision-host container running
    - [ ] Local Kubernetes cluster running
  ### Files
    ▶ Files (12)                ← new collapsed dropdown with tree
  ### Related templates
    - Python Basic Webserver
    - PostgreSQL Demo

ENVIRONMENT card    (unchanged)
ARCHITECTURE card   (unchanged)

(README content)
```

### Tree rendering shape (inside the dropdown, when expanded)

```
- [Dockerfile](…/blob/main/templates/python-basic-webserver-database/Dockerfile)
- [README-python-basic-webserver-database.md](…)
- [.dockerignore](…)
- [.gitignore](…)
- [requirements.txt](…)
- [template-info.yaml](…)
- .github/
  - workflows/
    - [urbalurba-build-and-push.yaml](…)
- app/
  - [app.py](…)
- config/
  - [init-database.sql](…)
- manifests/
  - [deployment.yaml](…)
  - [ingress.yaml](…)
  - [kustomization.yaml](…)
```

Folders show as plain text (no link); files show as markdown links. Nesting via 2-space indent per level. Root-level files first, then folders alphabetically. Inside each folder, files first, then sub-folders (same rule, recursively).

---

## Risks and watch-outs

- **File list drift**: a template gains new files; the dropdown auto-reflects the new state on next build. Good. But if a template author intentionally excludes something from git (via `.gitignore`), the dropdown won't show it — which is the right behavior, but worth naming in contributor docs.

- **Very long file lists**: if a future template ships 50+ files, the dropdown's body becomes a long scroll. The collapsed-by-default behavior handles this at rest; readers who expand get what they asked for. Worst-case mitigation: add a `max-height` to the dropdown body with internal scroll.

- **GitHub URL stability**: if the main branch is renamed (e.g., `main` → `trunk`) or the repo URL changes, all embedded URLs break. Today's `links[]` content assumes `github.com/helpers-no/dev-templates/tree/main/...`; the branch name `main` is baked in. Mitigation: centralize the branch-name constant in a config read at generation time, not hardcoded in 10 yamls.

- **MDX strict parsing**: the earlier PLAN-environment-card-improvements Phase 4 and PLAN-architecture-diagram-display Phase 4 both hit MDX 3.10 parser issues with `<letter>` patterns inside JSX attributes. This investigation's field is `files: string[]` — strings are file paths, no angle brackets expected. Low risk. Standard sed escape in the emitter if needed.

- **Card density**: Getting Started already has two sub-sections (Prerequisites + Related templates). Adding Files makes three. If a future add-on (say a "Documentation" sub-section) lands, we'd be at four. At that point the card is getting dense and splitting into separate cards is right.

---

## Next steps

- [x] User answers Q1–Q8 — **all decided 2026-04-16**
- [ ] Draft `PLAN-template-files-dropdown.md` in `backlog/` based on the locked decisions
- [ ] Implement the plan once approved
- [ ] Move this investigation to `completed/` alongside the downstream plan

### Expected phase shape in the downstream plan

- **Phase 1** — registry generator: add `scripts/lib/repo-constants.ts` with `REPO_BASE_URL` + `REPO_BRANCH`; `generate-registry.ts` shells out to `git ls-files` per template, stores `files: string[]` (relative paths) on the entry, plus a `templateRepoPath: string` (e.g. `templates/python-basic-webserver-database`). Unit-tested.
- **Phase 2** — tree builder: add `scripts/lib/build-files-tree.ts` exporting `buildFilesTreeMarkdown(files, baseUrl): string`. Pure function, unit-tested; turns a sorted flat list into indented markdown with folders as plain text and files as links.
- **Phase 3** — emitter: `generate-docs-markdown.sh` reads `files` from the registry, calls into a TS helper (or inlines the logic), emits the `### Files` sub-section inside the Getting Started card with the `<details>` dropdown.
- **Phase 4** — visual check across all 10 templates; adjust any archetype that looks wrong (overlay templates have a `template/` subpath that needs verification).
- **Phase 5** — contributor docs update (one paragraph in `readme-structure.md`) + close-out.
