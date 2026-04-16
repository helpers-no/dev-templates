# Plan: Consolidate Script Documentation into `project-scripts.md`

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Complete

**Goal**: Ship a single canonical document — `website/docs/ai-developer/project-scripts.md` — that documents every script under `scripts/` for both human contributors and AI assistants. Add a `scripts/README.md` pointer so anyone browsing the source tree finds the doc. Redirect the existing `contributors/scripts-reference.md` to preserve the contributor-docs nav entry without duplicating content.

**Last Updated**: 2026-04-16

**Upstream**: chat discussion 2026-04-16. All design decisions are locked in — this is an implementation plan, not an investigation.

---

## Context

The `scripts/` folder has **8 runnable scripts** (sh + ts) and **6 library modules** (`lib/*.sh`, `lib/*.ts`). Today's documentation is partial and scattered:

- `website/docs/contributors/scripts-reference.md` covers 6 of the 8 runnable scripts. Missing: `refresh-platform-data.sh`, the test runner invocation.
- The library modules table lists only `logging.sh`. The 5 TS modules (`build-architecture-mermaid.ts`, `build-architecture-mdx.ts`, `build-expected-output.ts`, `service-ports.ts`, `dct-doc-paths.ts`) are undocumented there.
- `website/docs/ai-developer/project-dev-templates.md` has its own coverage of `build-architecture-mermaid.ts` and `build-architecture-mdx.ts` under the "Auto-generated documentation sections" section — partial overlap with a different audience in mind.
- The CI/CD pipeline sequence in `scripts-reference.md` is stale (pre-dates PR #38 which reordered validators to run after generators).

Anyone landing in the `scripts/` folder today finds no `README.md` and has to guess where to look. That's the gap this plan closes.

### Why `ai-developer/project-scripts.md` and not `contributors/scripts-reference.md`

The user intends `ai-developer/` to become a reusable pattern across multiple projects (same folder name, same `project-*.md` file naming). The canonical doc belongs in the location that generalizes. `contributors/scripts-reference.md` stays as a thin redirect to preserve the Docusaurus nav entry for humans browsing the contributors section.

---

## Scope

### In scope

- New file `website/docs/ai-developer/project-scripts.md` — the canonical doc
- New file `scripts/README.md` — three-line pointer at the canonical doc
- Rewrite `website/docs/contributors/scripts-reference.md` as a short redirect page
- Update any cross-references in other docs that link to `contributors/scripts-reference.md` and should now point at `project-scripts.md`
- Fix the stale CI/CD sequence (validators-after-generators, per PR #38)
- Audit `project-dev-templates.md` for script-detail content that now belongs in `project-scripts.md` — leave the TMP-specific architectural narrative, move detail-level script docs

### Out of scope

- Renaming any scripts or changing their behavior
- Adding new scripts or removing existing ones
- Per-script README files next to each script in `scripts/*/` (rejected in chat — one-file approach wins)
- Generalizing the pattern to other projects (that's a broader effort; this plan just establishes the file here)
- Replacing the existing `project-dev-templates.md` or renaming it

---

## Files touched

| File | Change |
|---|---|
| `website/docs/ai-developer/project-scripts.md` | **New.** ~250 lines: intro + runnable-scripts table + library-modules table + pre-push pipeline + per-script details + conventions |
| `scripts/README.md` | **New.** Three-line pointer |
| `website/docs/contributors/scripts-reference.md` | **Rewrite.** Replace 146-line reference with a short redirect (~10 lines): a heading plus one sentence pointing at `project-scripts.md` via the relative path `../ai-developer/project-scripts.md`. See there for the full table and per-script details. |
| `website/docs/ai-developer/project-dev-templates.md` | **Possible edit.** If the "Auto-generated documentation sections" section duplicates per-script detail content, update to summarize and link to `project-scripts.md`. Leave TMP-specific narrative (the "two diagrams per non-stack template" explanation) in place. |
| Other docs that link to `scripts-reference.md` | **Update links.** Grep for `scripts-reference.md`, retarget any internal references to `project-scripts.md` where the link is about script details (not the contributor-facing redirect entry) |

---

## Content shape (locked in from chat)

The canonical doc follows this structure. **Rule: no prose above the first table.** Reader lands on the file and sees the tables within one screen.

```text
# Project Scripts

(one-line purpose: "Single source of truth for every script under scripts/.
Audience: contributors and AI assistants.")

## Runnable scripts

| Command | What it does | When to run |
|---|---|---|
| `bash scripts/validate-metadata.sh` | Validate every template-info.yaml against the schema | Before push; after editing any template-info.yaml |
| `npx tsx scripts/generate-registry.ts` | Produce template-registry.json from yaml + vendored data | After editing any template-info.yaml; before docs emitters |
| `bash scripts/generate-docs-markdown.sh --force` | Produce per-template MDX pages from the registry | After generate-registry.ts |
| `bash scripts/generate-plan-indexes.sh` | Regenerate active/backlog/completed index.md | When plans move between folders |
| `bash scripts/validate-docs.sh` | Check internal markdown links + required headings | After all generators; before push |
| `bash scripts/refresh-platform-data.sh` | Pull updated dct-tools.json + uis-services.json from DCT/UIS | When DCT or UIS ships updated metadata (rare) |
| `npx tsx --test scripts/test/*.test.ts` | Unit tests for the TS library modules | When editing anything under scripts/lib/ |

## Library modules (imported, not directly runnable)

| Module | Purpose | Imported by |
|---|---|---|
| `scripts/lib/logging.sh` | Colored log helpers (log_info, log_success, log_warn, log_error) | All shell scripts |
| `scripts/lib/build-architecture-mermaid.ts` | Structured ArchitectureModel + per-diagram mermaid helpers | generate-registry.ts; build-architecture-mdx.ts (types) |
| `scripts/lib/build-architecture-mdx.ts` | Emit the ## Architecture MDX block from an ArchitectureModel | generate-registry.ts |
| `scripts/lib/build-expected-output.ts` | Generate "Expected output" sample string for the Configure/Install dropdown | generate-registry.ts |
| `scripts/lib/service-ports.ts` | Stopgap map of UIS service id → in-cluster default port | build-architecture-mermaid.ts; build-expected-output.ts |
| `scripts/lib/dct-doc-paths.ts` | Resolve DCT documentation URLs for tools | generate-registry.ts |

## The pre-push pipeline

(the canonical validate-metadata → generate-registry → generate-docs-markdown
 → generate-plan-indexes → validate-docs → npm run build sequence,
 matched to the CI workflow in .github/workflows/deploy-docs.yml)

## Script details

### validate-metadata.sh
(detailed: what it validates, how to extend, CI role, failure modes)

### generate-registry.ts
...

(one section per script, same order as the tables)

## Conventions

- All shell scripts source lib/logging.sh for colored output
- TS scripts run via tsx (no compile step; source is the artifact)
- Exit codes: any non-zero is a failure; CI aborts on first non-zero
- Paths: all scripts assume the project root as cwd
- New script checklist: add a row to the appropriate table above, add
  a ### section below, update the pre-push pipeline if it's part of it
```

---

## Phases

### Phase 1: Audit + gather content

- [ ] 1.1 Read each of the 7 runnable scripts and 6 library modules, confirming their current behavior (don't trust the existing `scripts-reference.md` — some entries may be stale)
- [ ] 1.2 Grep for cross-references to `scripts-reference.md` in other docs; list every link that needs retargeting
- [ ] 1.3 Read the relevant section of `project-dev-templates.md` ("Auto-generated documentation sections") and decide what stays vs. what moves to `project-scripts.md`
- [ ] 1.4 Confirm the CI pipeline sequence in `.github/workflows/deploy-docs.yml` matches what I'll document (post-PR-#38: generators first, validators after)
- [ ] 1.5 Record the notes from 1.1–1.4 as working input for Phase 2 — no committed output yet

### Phase 2: Draft `project-scripts.md`

- [ ] 2.1 Create `website/docs/ai-developer/project-scripts.md` with the structure above (tables first, then pipeline, then per-script details, then conventions)
- [ ] 2.2 Write the two tables with accurate `What it does` + `When to run` / `Imported by` cells based on Phase 1 audit
- [ ] 2.3 Write the "pre-push pipeline" section: the multi-line `docker exec ... bash -c "..."` command from `project-dev-templates.md`, matched to the CI workflow order
- [ ] 2.4 Write per-script detail sections for each of the 7 runnable scripts + 6 library modules. Lean on inline docstrings from the source files.
- [ ] 2.5 Write the "Conventions" section — logging pattern, cwd assumption, exit codes, new-script checklist
- [ ] 2.6 Verify MDX-safety: no raw `<letter>` patterns that Docusaurus 3.10's strict parser would mis-interpret as JSX (lesson from PLAN-environment-card-improvements Phase 4). Use backticks around anything that looks like a tag.
- [ ] 2.7 Run `bash scripts/validate-docs.sh` + `npm run build` to confirm the new doc parses cleanly

### Phase 3: Add `scripts/README.md` pointer

- [ ] 3.1 Create `scripts/README.md` with three lines: a `# Scripts` heading, a one-line sentence pointing at `project-scripts.md`, and a relative markdown link from `scripts/` up to `website/docs/ai-developer/project-scripts.md`. The exact relative path from `scripts/` is `../website/docs/ai-developer/project-scripts.md`.
- [ ] 3.2 Run the build to confirm the README renders without error if it appears in any Docusaurus-indexed path (it shouldn't — `scripts/` isn't a docs root — but verify)

### Phase 4: Redirect `scripts-reference.md`

- [ ] 4.1 Rewrite `website/docs/contributors/scripts-reference.md` as a short redirect page (~10 lines). Preserve the frontmatter (`sidebar_position`) so the nav entry stays in place. Body: a `# Scripts Reference` heading followed by a short paragraph pointing at `project-scripts.md` via the relative path `../ai-developer/project-scripts.md`, explaining that it's the canonical source of truth for both contributors and AI assistants and holds the full runnable-scripts + library-modules tables plus per-script details.
- [ ] 4.2 Update other docs that linked to `scripts-reference.md` for script details. From Phase 1.2's grep list, change those to link at `project-scripts.md`. Leave links that are explicitly pointing at the contributor-docs nav entry (if any).
- [ ] 4.3 Trim `project-dev-templates.md` §"Auto-generated documentation sections" to summarize + link to `project-scripts.md` for script-level details. Keep the TMP-specific narrative (what the two diagrams mean, archetypes, etc.) — that's architectural context, not script documentation.
- [ ] 4.4 Full pre-push pipeline (`validate-metadata → generate-registry → generate-docs-markdown → generate-plan-indexes → validate-docs → npm run build`) to confirm no broken links remain

### Phase 5: Close out

- [ ] 5.1 Commit all changes as one PR (intentionally not split — the three files are tightly coupled; splitting would leave half-states like "`scripts/README.md` pointing at a file that doesn't exist yet")
- [ ] 5.2 Push, create PR, merge via `--rebase --delete-branch`
- [ ] 5.3 Move this plan from `active/` to `completed/`
- [ ] 5.4 Confirm post-merge: the file tree shows `scripts/README.md`, the contributor site shows the redirect at its old URL, `project-scripts.md` is live under ai-developer

---

## Acceptance criteria

The plan is complete when all of the following are true:

1. `website/docs/ai-developer/project-scripts.md` exists and documents every runnable script and library module that lives under `scripts/`
2. The first content block in that file is the **Runnable scripts** table, with no prose above it beyond the title and a one-line purpose
3. Both tables have the agreed column shape: `Command / What it does / When to run` for runnable scripts; `Module / Purpose / Imported by` for library modules
4. `scripts/README.md` exists and points at `project-scripts.md`
5. `contributors/scripts-reference.md` is a thin redirect that preserves the nav entry, not a duplicate of the canonical content
6. All internal markdown links resolve cleanly (`validate-docs.sh` green)
7. The pre-push pipeline documentation reflects the post-PR-#38 order (generators then validators)
8. Full pre-push pipeline passes

---

## Risks and watch-outs

- **Drift between project-scripts.md and reality over time.** The doc is a human-authored description of code that changes. Mitigation: add a one-line note in the "Conventions" section that every new script must add a table row (same discipline we already apply to new templates + template-info.yaml rows).

- **Stale `scripts-reference.md` content copy-pasted into `project-scripts.md`.** Phase 1.1's audit is the guard — read each script's current source, don't trust the old doc. This is extra work but catches drift that's already present (e.g., CI sequence being wrong).

- **MDX 3.10 strict parser trips on `<word>` patterns in prose.** Seen repeatedly during PLAN-environment-card-improvements and PLAN-architecture-diagram-display. Mitigation: Phase 2.6 explicit check step. Use backticks around anything that looks like a JSX tag.

- **The contributors-docs redirect breaks inbound links.** If anyone has bookmarked or linked externally to `tmp.sovereignsky.no/docs/contributors/scripts-reference` the URL still resolves (the file still exists) — so no 404. The page content just changes to a redirect notice with a link. Acceptable.

- **Generalization creep.** The user's long-term intent is that `ai-developer/` becomes reusable across projects. This plan only establishes the file in this project. Don't try to generalize inside this plan — that's a separate concern covering multiple projects, CI templates, and documentation conventions.

---

## Open questions

None — all design decisions locked in from the chat discussion. Tables have their column shapes. Pre-push pipeline order is known (post-PR-#38). `scripts/README.md` is three lines of fixed content. Contributor-docs redirect strategy is option B (thin redirect, preserve nav). Ready to implement.

---

## Next steps

- [ ] User reviews and approves this plan
- [ ] Move from `backlog/` to `active/`
- [ ] Execute Phase 1 through Phase 5 in order
- [ ] After merge: move plan to `completed/`
