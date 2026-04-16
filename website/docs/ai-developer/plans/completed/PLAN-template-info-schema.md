# Feature: Template-Info Schema Harmonisation

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Completed

**Goal**: Clean up `template-info.yaml` field redundancy, align with Backstage patterns, and enable yaml-driven template documentation pages. Net result: remove dead fields, add new structured fields, render more content from yaml instead of README prose.

**Last Updated**: 2026-04-12

**Completed**: 2026-04-12 — all 7 phases shipped in commits `b5d9c14` (phases 1-2) and `1cc0333` (phases 3-7).

**Investigation**: [INVESTIGATE-template-info-schema.md](INVESTIGATE-template-info-schema.md) — full decision record, Backstage comparison, DCT field audit, ODP positioning.

---

## Dependencies

**Prerequisites**: `PLAN-environment-card.md` Phase 4 should be complete (one active plan at a time). This plan does not depend on the architecture diagram v2 work — the two can ship in either order.

**Blocks**: The architecture diagram v2 builder rewrite depends on `quickstart.setup`/`quickstart.run` being the canonical field names. Phase 2 of this plan delivers that.

**Priority**: High — every subsequent plan (diagram v2, Backstage export) builds on this clean schema.

---

## Environment conventions

**All shell commands run inside the devcontainer.** Exec pattern: `docker exec <container> bash -c 'cd /workspace && <cmd>'`

---

## Overview

### Schema changes summary

| Action | Field | Details |
|---|---|---|
| **Remove** | `summary` | Dead — never read by DCT, never rendered by Docusaurus |
| **Remove** | `website` | Replaced by `links[]` |
| **Remove** | `docs` | Replaced by `links[]` |
| **Rename** | `quickstart.commands` → `quickstart.setup` | Drop run command from list; `run` field holds it separately |
| **Add** | `maintainers: string[]` | Required. GitHub usernames. Rendered with avatars. |
| **Add** | `prerequisites: [{text, url?}]` | Required. Objects with display text and optional doc link. Rendered as linked checklist. |
| **Add** | `links: [{url, title?, icon?, type?}]` | Required. Replaces `website` + `docs`. |
| **Make optional** | `readme` | Page works without it. README is supplementary free text. |

### Rendering changes summary

| Change | Component/file |
|---|---|
| Render `abstract` on detail page (between header and environment card) | `generate-docs-markdown.sh` |
| Render `maintainers` with GitHub avatar links | `<TemplateHeader>` |
| Render `links[]` instead of `website` + `docs` | `<TemplateHeader>` |
| Render `quickstart.setup` + `quickstart.run` separately | `<TemplateEnvironment>` |
| Render `prerequisites` as checklist | New section in `generate-docs-markdown.sh` |

### Page layout (decided in diagram v2 investigation)

```
S1  <TemplateHeader />           ← name, description, links[], maintainers
S2  Abstract                     ← 2–3 sentence overview
S3  <TemplateEnvironment />      ← tools, services, configure, run (setup + run)
S4  Prerequisites                ← optional checklist
S5  ## Architecture              ← diagrams (separate plan)
S7  ## Related Templates
S6  README content               ← optional free text (last)
```

---

## Phase 1: Kill `summary`

Smallest change. Builds confidence that the pipeline works after a field removal.

### Tasks

- [ ] 1.1 Remove `summary:` field from all 10 `template-info.yaml` files (8 app + 1 stack + 1 overlay)
- [ ] 1.2 In `scripts/generate-registry.ts`:
  - Remove `summary: raw.summary?.trim()` from the entry construction (~line 617)
  - Remove `if (!tmpl.summary) fail(...)` from `validateTemplate()` (~line 530)
  - Remove `summary` from the `TemplateInfoYaml` interface if it's listed there
- [ ] 1.3 In `scripts/generate-docs-markdown.sh`: remove `summary=$(jq -r ".templates[$i].summary" "$REGISTRY")` (~line 91) — read but never used
- [ ] 1.4 Regenerate registry + docs, run validators, run build

### Validation

```bash
npx tsx scripts/generate-registry.ts
bash scripts/generate-docs-markdown.sh --force
bash scripts/validate-metadata.sh
bash scripts/validate-docs.sh
cd website && npm run build
```

All pass. `summary` field absent from `template-registry.json`. No visual change on any page.

---

## Phase 2: Split `quickstart.commands` → `setup` + `run`

The `run` field already exists (added earlier). This phase renames `commands` to `setup` and removes the run command from the setup list, eliminating redundancy. Also updates the `<TemplateEnvironment>` component to render setup and run separately.

### Tasks

- [ ] 2.1 In all 9 template-info.yaml files that have `quickstart`:
  - Rename `commands:` to `setup:`
  - Remove the last entry (which is the `run` command) from the `setup` list
  - Templates with a single command (e.g., `go run main.go`) get `setup: []` (empty array — no setup steps, only a run command)
- [ ] 2.2 In `scripts/generate-registry.ts`: update the `TemplateInfoYaml` quickstart interface:
  ```ts
  quickstart?: {
    title: string;
    setup: string[];   // was: commands: string[]
    run: string;       // was: run?: string (now required within quickstart)
    note?: string;
  };
  ```
- [ ] 2.3 In `website/src/components/TemplateEnvironment/index.tsx`:
  - Update `QuickstartBlock` interface: `commands: string[]` → `setup: string[]`, add `run: string`
  - Update the Run sub-block rendering (~line 360): render `setup` commands (if non-empty) as a pre block, then render `run` as a separate highlighted command
- [ ] 2.4 Regenerate registry + docs, run validators, run build
- [ ] 2.5 Verify the Environment card's Run sub-block renders correctly with both setup steps and the run command visually separated

### Validation

Build succeeds. Template pages show the quickstart split: setup commands (if any) then run command. Templates with empty setup (e.g., `go run main.go`) show only the run command.

---

## Phase 3: Replace `website` + `docs` → `links[]`

### Tasks

- [ ] 3.1 In all 10 template-info.yaml files, replace:
  ```yaml
  website: "https://..."
  docs: https://...
  ```
  with:
  ```yaml
  links:
    - url: "https://..."
      title: "<Language> website"
    - url: https://github.com/helpers-no/dev-templates/tree/main/templates/...
      title: Source code
      icon: github
  ```
  Templates with `website: ""` (empty) get only the source code link.

- [ ] 3.2 In `scripts/generate-registry.ts`:
  - Update `TemplateInfoYaml` interface: remove `website?: string` and `docs?: string`, add `links?: Array<{url: string; title?: string; icon?: string; type?: string}>`
  - Update entry construction: replace `website: raw.website || ''` and `docs: raw.docs` with `links: raw.links || []`
  - Remove `website`/`docs` validation if present in `validateTemplate()`
  - Add validation: `links` must be present and have at least one entry with a `url`

- [ ] 3.3 In `scripts/generate-docs-markdown.sh`:
  - Remove the `website` and `docs` variable reads (~lines 89–90)
  - Change the `<TemplateHeader>` props from `website="$website" docs="$docs"` to `links={$local_links_json}` where `local_links_json=$(jq -c ".templates[$i].links // null" "$REGISTRY")`

- [ ] 3.4 In `website/src/components/TemplateHeader/index.tsx`:
  - Update `TemplateHeaderProps`: remove `website: string` and `docs: string`, add `links?: Array<{url: string; title?: string; icon?: string}>`
  - Update the links rendering section (~lines 48–59): iterate `links[]` and render each as `<a href={link.url}>{link.title || link.url} ↗</a>`

- [ ] 3.5 Regenerate registry + docs, run validators, run build

### Validation

Build succeeds. Template pages show the same links as before (Website ↗, Source ↗) but rendered from the `links[]` array instead of separate props. Templates with no website (empty string before) now simply have fewer links.

---

## Phase 4: Add `maintainers` field

### Tasks

- [ ] 4.1 Add `maintainers:` to all 10 template-info.yaml files. Use the actual GitHub username of the template author. Example:
  ```yaml
  maintainers:
    - terchris
  ```

- [ ] 4.2 In `scripts/generate-registry.ts`:
  - Add `maintainers?: string[]` to `TemplateInfoYaml` interface
  - Add to entry construction: `if (raw.maintainers) entry.maintainers = raw.maintainers`
  - Add validation: `if (!tmpl.maintainers || tmpl.maintainers.length === 0) fail(...)` — required field

- [ ] 4.3 In `scripts/generate-docs-markdown.sh`:
  - Read `local_maintainers_json=$(jq -c ".templates[$i].maintainers // null" "$REGISTRY")`
  - Pass as prop to `<TemplateHeader>`: `maintainers={$local_maintainers_json}`

- [ ] 4.4 In `website/src/components/TemplateHeader/index.tsx`:
  - Add `maintainers?: string[]` to `TemplateHeaderProps`
  - Add a maintainers rendering section after the links div: iterate the array and render each as a linked GitHub avatar:
    ```tsx
    <a href={`https://github.com/${user}`}>
      <img src={`https://github.com/${user}.png?size=32`} alt={user} />
      {user}
    </a>
    ```

- [ ] 4.5 Add CSS styles for the maintainers section in `TemplateHeader/styles.module.css`

- [ ] 4.6 Regenerate registry + docs, run validators, run build

### Validation

Build succeeds. Template pages show maintainer avatars with links to GitHub profiles below the header links.

---

## Phase 5: Add `prerequisites` field

### Tasks

- [ ] 5.1 Add `prerequisites:` to template-info.yaml files that need it. Example for `python-basic-webserver-database`:
  ```yaml
  prerequisites:
    - "UIS provision-host container running"
    - "Local Kubernetes cluster running (Rancher Desktop)"
  ```
  All templates have at least `"DCT devcontainer running"`. Templates with services add UIS and K8s cluster. Example for `python-basic-webserver` (no services):
  ```yaml
  prerequisites:
    - "DCT devcontainer running"
  ```

- [ ] 5.2 In `scripts/generate-registry.ts`:
  - Add `prerequisites: Array<{text: string; url?: string}>` to `TemplateInfoYaml` interface (required)
  - Add to entry construction: `entry.prerequisites = raw.prerequisites`
  - Add validation: `if (!tmpl.prerequisites || tmpl.prerequisites.length === 0) fail(...)` — every template needs at least one prerequisite (DCT)

- [ ] 5.3 In `scripts/generate-docs-markdown.sh`:
  - Read `local_prereqs=$(jq -r ".templates[$i].prerequisites // empty" "$REGISTRY")`
  - If non-empty, emit a `## Prerequisites` section before the `## Architecture` section (page layout position S4). Each item renders as a linked checklist entry:
    ```markdown
    ## Prerequisites

    - [ ] [DCT devcontainer running](https://dct.sovereignsky.no)
    - [ ] [UIS provision-host container running](https://uis.sovereignsky.no)
    - [ ] [Local Kubernetes cluster running (Rancher Desktop)](https://www.rancher.com/products/rancher-desktop)
    ```
    Items without a `url` render as plain text (no link).

- [ ] 5.4 Regenerate registry + docs, run validators, run build

### Validation

Build succeeds. All templates show a prerequisites checklist (at minimum "DCT devcontainer running"). Templates with services show additional items (UIS, K8s).

---

## Phase 6: Render `abstract` on detail page

Currently `abstract` is only shown on category index cards (`<TemplateCard>`). This phase also renders it on the template detail page, between the header (S1) and the Environment card (S3).

### Tasks

- [ ] 6.1 In `scripts/generate-docs-markdown.sh`:
  - Read `local_abstract=$(jq -r ".templates[$i].abstract // empty" "$REGISTRY")` (already read at ~line 85 but not emitted on the detail page)
  - After the `<TemplateHeader>` MDXEOF block and before the `<TemplateEnvironment>` block, emit:
    ```markdown

    <abstract text>

    ```
  - Only emit if non-empty (overlay templates may not have an abstract)

- [ ] 6.2 Regenerate docs, run build

### Validation

Build succeeds. Template detail pages show the abstract as a paragraph between header and environment card. Category index cards still show it too (no change to `<TemplateCard>`).

---

## Phase 7: Make `readme` optional

### Tasks

- [ ] 7.1 In `scripts/generate-registry.ts`:
  - Change the `readme` validation: remove `if (!tmpl.readme) fail(...)` if present, or change to a warning
  - The field stays in the interface as optional: `readme?: string`

- [ ] 7.2 In `scripts/generate-docs-markdown.sh`:
  - The README embed section (~lines 198–207) already handles missing READMEs: `if [[ -n "$local_readme_file" && -f "$local_readme_file" ]]; then ... else log_warn ... fi`
  - Change the `log_warn` to `log_info` (missing README is now expected, not a warning)

- [ ] 7.3 In `scripts/validate-docs.sh` / `scripts/validate-rules.conf`:
  - The `README-*.md` required-heading rules (`Quick Start`, `Prerequisites`, `Project Structure`) should become warnings or be removed — these sections are moving to yaml-driven rendering and may no longer exist in the README.

- [ ] 7.4 Regenerate, run validators, run build

### Validation

Build succeeds. Templates with READMEs still show them at the end of the page. A template without a README renders all other sections normally with no errors or warnings.

---

## Acceptance Criteria

- [ ] `summary` field removed from all template-info.yaml files and not present in registry JSON
- [ ] `quickstart` block uses `setup: string[]` + `run: string` (no `commands` field, no redundancy)
- [ ] `links[]` array replaces `website` + `docs` on all templates and renders in `<TemplateHeader>`
- [ ] `maintainers` present on all 10 templates (required field), rendered with GitHub avatars
- [ ] `prerequisites` present on all 10 templates (required field), rendered as checklist
- [ ] `abstract` rendered on template detail page between header and environment card
- [ ] `readme` field is optional — pages render fully without it
- [ ] `npm run build` succeeds with zero errors
- [ ] `validate-metadata.sh` and `validate-docs.sh` pass
- [ ] DCT `dev-template` command still works (no fields DCT reads were removed or renamed)
- [ ] Architecture diagram builder still works (`quickstart.run` field unchanged)

---

## Implementation Notes

- **DCT compatibility**: DCT reads `id`, `name`, `description`, `abstract`, `tools`, `readme`, `folder`, `install_type` from the registry. This plan removes `summary` (DCT never reads it), removes `website`/`docs` (DCT never reads them), renames `quickstart.commands` to `quickstart.setup` (DCT never reads quickstart). Zero DCT impact.
- **Architecture diagram builder**: The v1 builder reads `quickstart.run`, `resolvedServices`, `resolvedTools`, `manifest`, `params`, `install_type`. The only field this plan touches that the builder also reads is `quickstart.run` — and it's not being changed (only `commands` → `setup` is renamed). Zero builder impact.
- **TypeScript-first**: All rendering logic changes happen in React components (`<TemplateHeader>`, `<TemplateEnvironment>`) and the TypeScript registry generator. The bash script stays a dumb pipe.
- **Phase ordering**: Phases are independently shippable. Each delivers value on its own. The ordering (1→7) goes from lowest risk to highest complexity. If time is short, phases 1–4 are the essential ones; 5–7 are valuable but lower priority.

---

## Files to Modify

**Per phase — cumulative list:**

| File | Phases |
|---|---|
| All 10 `template-info.yaml` files | 1, 2, 3, 4, 5 |
| `scripts/generate-registry.ts` | 1, 2, 3, 4, 5, 7 |
| `scripts/generate-docs-markdown.sh` | 1, 3, 4, 5, 6 |
| `scripts/validate-metadata.sh` | 1 (if summary check is there) |
| `scripts/validate-docs.sh` / `validate-rules.conf` | 7 |
| `website/src/components/TemplateHeader/index.tsx` | 3, 4 |
| `website/src/components/TemplateHeader/styles.module.css` | 4 |
| `website/src/components/TemplateEnvironment/index.tsx` | 2 |
| `website/src/data/template-registry.json` | All (auto-regenerated) |
| `website/docs/templates/**/*.mdx` | All (auto-regenerated) |
