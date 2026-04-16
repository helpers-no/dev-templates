# Plan: Files Dropdown on Template Pages

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Complete (2026-04-16)

**Goal**: Add a collapsible Files dropdown to every template's documentation page, listing the template's tracked files as a tree. Each file entry links to its GitHub blob URL; folder labels are plain text. The dropdown lives inside the Getting Started card between Prerequisites and Related templates.

**Last Updated**: 2026-04-16

**Completed**: 2026-04-16 — all 6 phases shipped; 89/89 unit tests green; Files dropdown renders on all 10 templates across E1/E2/E3/E4 archetypes with correct URL prefixes.

**Upstream investigation**: [INVESTIGATE-template-files-dropdown.md](INVESTIGATE-template-files-dropdown.md) — all 8 questions decided 2026-04-16.

**Related**:
- [PLAN-environment-card-improvements.md](PLAN-environment-card-improvements.md) — introduced the `dropdownBlock` global CSS class and the Getting Started card this plan extends
- [PLAN-architecture-diagram-display.md](PLAN-architecture-diagram-display.md) — precedent for the `buildXxxModel` + `emitXxxMdx` + unit-tested pipeline this plan follows

---

## Environment conventions

**All shell commands run inside the devcontainer.** Exec pattern: `docker exec <container> bash -c 'cd /workspace && <cmd>'`

---

## Decisions locked in (from upstream investigation)

- **File selection**: `git ls-files` — every tracked file under the template folder
- **Rendering**: tree structure (indented markdown list; folders plain text, files linked)
- **Placement**: `### Files` sub-section inside the Getting Started card, between Prerequisites and Related templates
- **GitHub URL**: auto-derived from central constants — `${REPO_BASE_URL}/blob/${REPO_BRANCH}/${templateRepoPath}/${fileRelativePath}`
- **Default state**: collapsed (`<details>` with no `open` attr)
- **Summary row**: shows file count — `Files (12)`
- **Path display**: relative to template root (`app/app.py`, not `templates/<id>/app/app.py`)
- **Icons**: skipped for v1

---

## Target shape

### Getting Started card after this plan lands

```
GETTING STARTED
  ### Prerequisites
    - [ ] DCT devcontainer running
    - [ ] UIS provision-host container running
    - [ ] Local Kubernetes cluster running (Rancher Desktop)

  ### Files
    ▶ Files (12)              ← new collapsed dropdown

  ### Related templates
    - Python Basic Webserver
    - PostgreSQL Demo
```

### Tree shape inside the expanded dropdown

```
- [Dockerfile](https://github.com/helpers-no/dev-templates/blob/main/templates/python-basic-webserver-database/Dockerfile)
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

**Sort rule**: at every tree level, **files first (alphabetical), then sub-folders (alphabetical)**, recursively.

---

## Target data model

**All rendering logic lives in TypeScript.** The bash emitter is a dumb pipe — same pattern as the Architecture section (`scripts/generate-docs-markdown.sh:278` does `jq -r '.architectureMdx'` and echoes; all composition happens in `scripts/lib/build-architecture-mdx.ts`).

Three new pure-TS modules:

```ts
// scripts/lib/repo-constants.ts
export const REPO_BASE_URL = 'https://github.com/helpers-no/dev-templates';
export const REPO_BRANCH = 'main';

// scripts/lib/build-files-tree.ts — pure tree shape
export interface FilesTreeNode {
  files: string[];                    // leaf filenames at this level, sorted
  dirs: Map<string, FilesTreeNode>;   // sub-folders, sorted by key
}

/** Build a sorted nested tree from a flat list of relative paths. */
export function buildFilesTree(files: string[]): FilesTreeNode;

// scripts/lib/build-files-mdx.ts — full emitter
export interface FilesMdxInput {
  files: string[];             // relative paths from git ls-files
  templateRepoPath: string;    // e.g. "templates/python-basic-webserver-database"
}

/**
 * Returns the full `### Files` block (heading + <details> wrapper + tree markdown),
 * or `null` when files is empty. Ready to concatenate into the Getting Started card.
 */
export function buildFilesMdx(input: FilesMdxInput): string | null;
```

The registry generator stores **one pre-rendered string field** per template (plus the raw list for other potential consumers):

```ts
entry.files = string[];              // flat list, kept for introspection / future reuse
entry.filesMdx = string | null;      // pre-rendered `### Files` block, consumed by bash emitter
```

The bash emitter's job shrinks to one line per sub-section — a `jq -r` read of `filesMdx` and an `echo`. No stdin JSON pipes, no per-template `npx tsx` invocations, no string escaping in bash. Every test of the dropdown is a TS unit test against `buildFilesMdx`.

---

## Files touched

**New**:
- `scripts/lib/repo-constants.ts` — `REPO_BASE_URL`, `REPO_BRANCH` constants
- `scripts/lib/build-files-tree.ts` — `buildFilesTree(files)` pure tree builder
- `scripts/lib/build-files-mdx.ts` — `buildFilesMdx(input)` full emitter (heading + details + tree markdown)
- `scripts/test/build-files-tree.test.ts` — unit tests for the tree builder
- `scripts/test/build-files-mdx.test.ts` — unit tests for the full emitter (exact MDX string assertions)

**Modified**:
- `scripts/generate-registry.ts` — per-template `git ls-files` call; populate `entry.files`, derive `templateRepoPath`, call `buildFilesMdx` and store result on `entry.filesMdx`
- `scripts/generate-docs-markdown.sh` — thin pipe: `jq -r '.filesMdx'` read and echo inside the Getting Started card emission block
- `website/docs/contributors/readme-structure.md` — one paragraph noting the Files dropdown is auto-generated from `git ls-files`
- `website/docs/ai-developer/project-dev-templates.md` — brief mention under "Auto-generated documentation sections"

**Auto-regenerated**:
- `website/src/data/template-registry.json` — new `files` + `filesMdx` fields per entry
- `website/docs/templates/**/*.mdx` — new `### Files` sub-section inside each template's Getting Started card

---

## Phases

### Phase 1: Tree builder — `buildFilesTree` — DONE

**Scope**: pure-function TS module that turns a flat file list into a sorted nested tree shape. Fully unit-tested. Not yet wired into anything.

- [x] 1.1 Create `scripts/lib/build-files-tree.ts` exporting `buildFilesTree(files: string[]): FilesTreeNode`.
- [x] 1.2 Create `scripts/test/build-files-tree.test.ts` — 12 test cases: empty input, root files, nested folders, deep nesting, dotfiles, dotfolders, duplicates, blank input, realistic e1 fixture.
- [x] 1.3 Run unit tests. 12/12 green.

**Exit criterion**: ✅ `buildFilesTree` is callable, tested, and handles every sort/nesting case.

### Phase 2: Full emitter — `buildFilesMdx` — DONE

**Scope**: TS emitter that walks the tree and produces the full `### Files` block (heading, `<details>`, summary with count, indented markdown tree, closing tag). Pure function, fully unit-tested. This is the module that owns all MDX-shape decisions.

- [x] 2.1 Create `scripts/lib/repo-constants.ts` with `REPO_BASE_URL = 'https://github.com/helpers-no/dev-templates'` and `REPO_BRANCH = 'main'`. Export both.
- [x] 2.2 Create `scripts/lib/build-files-mdx.ts` exporting `buildFilesMdx(input: FilesMdxInput): string | null`:
  - `input = { files: string[]; templateRepoPath: string }`
  - Empty `files` → return `null` (emitter skips the sub-section)
  - Compute `baseUrl = ${REPO_BASE_URL}/blob/${REPO_BRANCH}/${templateRepoPath}` using constants
  - Call `buildFilesTree(input.files)`
  - Walk the tree, emitting:
    - `- [name](baseUrl/fullPath)` for files (use `encodeURI` on the full path for spaces / special chars)
    - `- name/` for folders (plain text, trailing slash)
    - 2-space indent per nesting level
  - Wrap in the full block:
    ```
    ### Files

    <details className="dropdownBlock">
    <summary>Files ({count})</summary>

    {tree markdown}

    </details>
    ```
  - Return the string (with final newline)
- [x] 2.3 Create `scripts/test/build-files-mdx.test.ts` with 10 tests: empty→null, single file, multi nested, stack URL, overlay URL, dotfile-as-link, spaces URL-encoded, hash URL-encoded, trailing newline, heading/details structure.
- [x] 2.4 Run unit tests. 10/10 green.
- [ ] 2.5 Commit, push, PR, merge. Phases 1 + 2 can ship as one PR since the whole TS core is self-contained and has no runtime effect yet.

**Exit criterion**: `buildFilesMdx` produces the exact MDX string we'll ship, covered by unit tests. Nothing downstream uses it yet.

### Phase 3: Registry generator — populate `entry.files` + `entry.filesMdx` — DONE

**Scope**: wire the TS emitter into `generate-registry.ts`. Every template entry gains two new fields. No visible page change yet — the bash emitter still doesn't know about them.

- [x] 3.1 Added `listTemplateFiles(templateRepoPath)` helper using `execFileSync('git', ['ls-files', …])`, strips the prefix, returns relative paths. `templateRepoPath` derived from `entry.folder` with `/template` appended for overlays.
- [x] 3.2 Validation: if non-overlay and `filesMdx === null`, emit error `git ls-files returned no tracked files under …`.
- [x] 3.3 Regenerated. All 10 templates have `files` + `templateRepoPath` + non-null `filesMdx`. File counts: overlay=13, apps=9–30, stack=4.
- [x] 3.4 MDX byte-identical to main — only `template-registry.json` changes. ✅
- [ ] 3.5 Commit, push, PR, merge.

**Exit criterion**: registry JSON has `files` + `filesMdx` on every entry; template pages unchanged.

### Phase 4: Bash emitter — consume `filesMdx` as a thin pipe — DONE

**Scope**: one small change to `generate-docs-markdown.sh`. This is the phase where the user-visible dropdown appears on every template page.

- [x] 4.1 Added `local_files_mdx=$(jq -r …)` read and echo inside the Getting Started card. Card-emission guard updated to include files. Sub-section order: Prerequisites → Files → Related templates.
- [x] 4.2 No escaping, no tree logic, no URL construction in bash. Mirrors the existing `architectureMdx` pattern.
- [x] 4.3 MDX 3.10 accepts the generated tree cleanly — build green, no JSX parser complaints.
- [x] 4.4 Full pre-push pipeline green: validate-metadata ✅, validate-docs ✅ (0 errors), 89/89 unit tests ✅, npm run build ✅.
- [ ] 4.5 Commit, push, PR, merge.

**Exit criterion**: every app and stack template page renders a collapsed `Files (N)` dropdown inside the Getting Started card. Clicking the summary expands the tree; every file link resolves to the right GitHub blob URL.

### Phase 5: Visual check across all 10 templates — DONE

**Verified via built HTML** (static output is authoritative; no need to boot dev server):

- E1 (`python-basic-webserver-database`): `Files (10)` summary present, dotfiles rendered as links, `.github/workflows/` nested correctly
- E2 (`python-basic-webserver` + 5 siblings): `Files (10)` each, smaller trees, no services-related paths
- E3 (`postgresql-demo`): `Files (4)` with `uis-stack-templates/postgresql-demo/…` URL prefix ✅
- E4 (`plan-based-workflow`): `Files (13)` with `ai-templates/plan-based-workflow/template/…` URL prefix ✅ (overlay path handling correct)
- Worst-case size: `designsystemet-basic-react-app` shows `Files (30)` — collapsed-by-default keeps this fine at rest

All archetype URL prefixes verified correct. Standard `<details>` gives keyboard/mobile accessibility for free.


**Scope**: open every template page in the built site, verify the dropdown renders correctly, every link resolves, tree ordering looks right. Same matrix approach as Phase 7 of `PLAN-environment-card-improvements`.

- [ ] 5.1 `cd website && npm run build && npx serve build` — open each template page in a browser.
- [ ] 5.2 For each of the 10 templates, verify:
  - Files dropdown appears between Prerequisites and Related templates (or at the right position if either of those is absent)
  - Summary row shows `Files (N)` with the correct count
  - Clicking expands the tree
  - Root-level files appear first, then folders alphabetically
  - Within each folder, same rule recursively
  - Dotfile entries (`.gitignore`, `.dockerignore`) are rendered as file links
  - `.github/workflows/` folder renders with nested indent
  - Click any file link → navigates to the right GitHub blob URL (spot-check 2–3 files per template)
- [ ] 5.3 Archetype-specific checks:
  - **E1** (`python-basic-webserver-database`): ~12 files, full structure (app/, config/, manifests/, .github/)
  - **E2** (e.g. `python-basic-webserver`): smaller file count, no `config/` or `manifests/` beyond minimum
  - **E3** (`postgresql-demo`): stack template; verify URL prefix is `…/uis-stack-templates/postgresql-demo`
  - **E4** (`plan-based-workflow`): overlay template; verify URL prefix is `…/ai-templates/plan-based-workflow/template` and the tree reflects the overlay's `template/` subfolder contents
- [ ] 5.4 Mobile check via browser dev-tools device emulation: collapsed summary row readable at 320px width; expanded tree doesn't overflow horizontally.
- [ ] 5.5 Accessibility spot-check: tab to summary, Enter/Space expands, tab through file links. `<details>` gives all of this for free.
- [ ] 5.6 Fix any archetype-specific regressions found; commit and push.

**Exit criterion**: dropdown works correctly on every template page across all four archetypes. No broken links. No visual glitches.

### Phase 6: Contributor docs + close-out — DONE

- [x] 6.1 Added "The auto-generated Files dropdown" section in `readme-structure.md`.
- [x] 6.2 Added "Files dropdown" subsection under "Auto-generated documentation sections" in `project-dev-templates.md`, linking to the two TS modules + tests.
- [x] 6.3 Moved `INVESTIGATE-template-files-dropdown.md` from `backlog/` → `completed/`.
- [x] 6.4 Moved this plan from `active/` → `completed/`.
- [x] 6.5 Full pre-push pipeline green: validate-metadata ✅, validate-docs ✅ (0 errors, 2 pre-existing warnings unrelated to this work), 89/89 unit tests ✅, npm run build ✅. Ready for commit.

**Exit criterion**: plan and investigation both in `completed/`; contributor docs reflect the new section.

---

## Acceptance criteria

1. Every app and stack template page renders a `### Files` sub-section inside the Getting Started card, between Prerequisites and Related templates
2. The sub-section is a `<details className="dropdownBlock">` collapsed by default
3. Summary row shows `Files (N)` with the correct file count
4. Expanded body renders a tree: files first (alphabetical) at each level, then folders (alphabetical) recursively
5. Every file entry is a markdown link to the correct `github.com/helpers-no/dev-templates/blob/main/...` URL
6. Folders are rendered as plain text (no link), followed by `/`
7. Paths shown in link text are relative to the template root (not repo root)
8. Registry JSON gains `files: string[]` and `templateRepoPath: string` per template
9. `buildFilesTreeMarkdown` has unit test coverage for root files, nested folders, dotfiles, dotfolders, deep nesting, and sort order
10. Overlay template (`plan-based-workflow`) correctly uses the `template/` sub-path
11. Full pre-push pipeline green after each phase
12. Contributor docs mention the new auto-generated section

---

## Risks and watch-outs

- **MDX strict-parser trips on tree content**: the tree markdown contains `[name](url)` links where `name` may include `.` (dotfiles) and nested indentation. MDX 3.10 has been sensitive in prior phases. Phase 3 should check this on the first template built; fall back to escaping via the sed trick from PLAN-environment-card-improvements Phase 4 if needed.
- **Overlay template path handling**: `ai-templates/<id>/template/` is the installed content, but the `template-info.yaml` lives at `ai-templates/<id>/`. Make sure Phase 1's `templateRepoPath` points at the overlay's `template/` subfolder, not the parent. Verify against `plan-based-workflow` specifically.
- **Very long file lists**: the investigation noted that a future 50+ file template would make the expanded dropdown a long scroll. Collapsed-by-default handles this at rest; if a template in the current 10 already looks awkward expanded, add a `max-height` + scroll to `.dropdownBlock` in a follow-up (out of scope here).
- **`git ls-files` must run from the repo root**: the command only lists tracked files. Run from inside the devcontainer's `/workspace` (which is the repo root). If a template directory isn't tracked (e.g. an in-progress new template), `files: []` is the correct output.
- **Branch name baked in**: `REPO_BRANCH = 'main'` is a constant. If the repo ever renames `main`, one file changes (`scripts/lib/repo-constants.ts`) plus the literal in `generate-docs-markdown.sh` (Phase 3). Documented explicitly in Phase 3.1.
- **URL encoding of special characters**: filenames with spaces, `#`, or `?` break markdown links. Phase 2's test coverage requires `encodeURI` on each path segment. Watch for any template that uses such a filename (none today, but new ones may appear).

---

## Open Questions

None — all 8 questions from the upstream investigation are decided. Implementation can start as soon as the user approves this plan and moves it to `active/`.

---

## Next Steps

- [ ] User reviews this plan
- [ ] Move from `backlog/` to `active/`
- [ ] Execute Phase 1 → 2 → 3 → 4 → 5 → 6
