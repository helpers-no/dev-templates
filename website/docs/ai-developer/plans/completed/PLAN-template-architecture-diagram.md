# Feature: Per-Template Architecture Diagram (Mermaid)

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Completed

**Goal**: Render an auto-generated `## Architecture` section on every non-overlay template documentation page, containing a Mermaid flowchart (steady-state) and a Mermaid sequence diagram (configure-time flow), derived from existing template registry data.

**Last Updated**: 2026-04-11

**Completed**: 2026-04-12 — v1 shipped in commits `c20c402` and `2b77ed2`. A v2 redesign (three-diagram split) is tracked in the separate [INVESTIGATE-architecture-diagram-v2.md](./INVESTIGATE-architecture-diagram-v2.md) investigation, still in backlog.

**Investigation**: [INVESTIGATE-template-architecture-diagram.md](./INVESTIGATE-template-architecture-diagram.md) — read for the full decision record, rationale, and archetype diagram drafts.

---

## Dependencies

**Prerequisites** (must complete before this plan moves to `active/`):

1. `PLAN-environment-card.md` Phase 4 complete and plan moved to `completed/`.
2. `template-info.yaml` schema refactor shipped — must deliver a clean `quickstart.run: string` field (or equivalent) that the sequence builder reads verbatim. That refactor is scoped by a separate future investigation the user will create later. This plan does not block on the investigation being *written* — it blocks on its shipped outcome. See [INVESTIGATE § Dependencies](./INVESTIGATE-template-architecture-diagram.md#dependencies) for details.

**Priority**: Medium.

---

## Environment conventions

**All shell commands in this plan run inside the devcontainer. Never on the host.** This is a project-wide rule from the repo-root `CLAUDE.md`. Every `### Validation` block below assumes the command is executed in the devcontainer — the plan does not repeat this per task.

Tool availability in the devcontainer (verified in existing scripts):
- `tsx` is available globally (see comment in `scripts/generate-registry.sh`)
- `node` ≥ 20 (CI uses Node 20, devcontainer ships a compatible version)
- `jq` is used by all existing generators
- `npx` is available via the `website/` package

Invocation patterns this plan uses:
- **Run registry generator**: `npx tsx scripts/generate-registry.ts` (matches CI — see `.github/workflows/deploy-docs.yml`)
- **Run doc generator**: `bash scripts/generate-docs-markdown.sh --force` (matches CI)
- **Run build**: `cd website && npm run build`
- **Run unit tests** (new): `npx tsx --test scripts/test/build-architecture-mermaid.test.ts` — if `tsx --test` passthrough is unavailable in the installed tsx version, fall back to `npx tsx scripts/test/build-architecture-mermaid.test.ts` (node:test runs automatically when its `test()` function is called)

---

## Overview

Each template documentation page under `website/docs/templates/**` currently renders (confirmed by reading `scripts/generate-docs-markdown.sh` lines 144–207):

```
---front matter---
<TemplateHeader … />
<TemplateEnvironment … />     (conditional — skipped for overlays)
README content (embedded from template source)
## Related Templates            (conditional — skipped when none)
```

This plan inserts a new auto-generated `## Architecture` section **between `<TemplateEnvironment />` and the README embed**, i.e. at script line ≈196 (after the `MDXEOF` heredoc sentinel that closes the TemplateEnvironment block, before the `_get_readme_content … >> "$page_file"` call at line 198–207).

### TypeScript-first composition shape

The builder emits **one field** on the registry entry — the complete MDX section, ready to concatenate into the page:

```ts
interface ArchitectureResult {
  mdx: string | null;  // Full composed section or null (overlay)
}
```

`mdx` is either the full block (including the `## Architecture` heading, conditional `### Steady-state` and `### Configure flow` sub-headings, and both fenced ` ```mermaid ` code blocks) **or** `null` for overlay templates. All conditional logic (single-diagram templates, overlay skip, archetype variation) lives in TypeScript. The bash script shrinks to a `jq -r` read and an `echo`.

**Why one field, not two**: the investigation's D1 design detail originally proposed `architectureFlowchart` and `architectureSequence` as separate fields with bash composing them. We consolidated to a single pre-composed field to honour the project's TypeScript-first preference and keep `generate-docs-markdown.sh` a dumb pipe. Individual builder functions (`buildFlowchart`, `buildSequence`) remain exported from the module for unit testability.

---

## Phase 1: Builder module + tests (TypeScript)

Create a standalone TS module that can be unit-tested in isolation, mirroring the `scripts/lib/dct-doc-paths.ts` pattern.

### Tasks

- [ ] 1.1 Create `scripts/lib/build-architecture-mermaid.ts` with a header comment block in the style of `scripts/lib/dct-doc-paths.ts` (purpose, inputs, expected registry entry fields, examples). Export:
  - `buildArchitectureMdx(entry: TemplateEntry): { mdx: string | null }` — main entry point; composes the full MDX section
  - `buildFlowchart(entry: TemplateEntry): string | null` — returns the raw `flowchart LR` string, or `null` for overlays
  - `buildSequence(entry: TemplateEntry): string | null` — returns the raw `sequenceDiagram` string, or `null` for overlays AND templates with `resolvedServices.length === 0`

- [ ] 1.2 Implement `buildFlowchart(entry)`. Archetype rules follow [INVESTIGATE § E](./INVESTIGATE-template-architecture-diagram.md#diagram-drafts-per-archetype):
  - **Overlay** (`install_type === 'overlay'`) → return `null`
  - **DCT subgraph** (when `resolvedTools.length > 0` OR `manifest` present): emit `subgraph dct["DCT devcontainer"]` with one node per tool (use `tool.id` as node id, `tool.name` as label) plus an `app` node (label derived from `params.app_name` when present, otherwise `entry.name` or `entry.id` — no hardcoding) plus an `env` node labelled `.env` when `manifest` is present
  - **K8s subgraph** (when `resolvedServices.length > 0` OR `manifest` present): emit `subgraph k8s["Local Kubernetes Cluster (Test environment)"]` — **exact label matches `website/docs/architecture.md` canonical diagram**; include service nodes as cylinders `[("<service.name><br/><service.database>")]` plus a `sec` K8s Secret node when `manifest.secretName`, plus `argo` + `pod` nodes when `manifest` present (even for templates with no services — E2 still deploys via ArgoCD)
  - **UIS node** (outside subgraphs, when `resolvedServices.length > 0`): emit `uis["UIS provision-host"]`
  - **GitHub subgraph** (for app templates only): emit `subgraph gh["GitHub"]` with `repo`, `actions`, `ghcr` nodes
  - **Edges**:
    - Per service: `uis -->|creates| <serviceNodeId>`, and `uis -->|creates| sec` when manifest
    - `uis -->|writes| env` when manifest
    - `app -->|host.docker.internal:<service.exposePort>| <serviceNodeId>` per service (app-to-service runtime connection)
    - `dct -->|git push| repo` (subgraph-to-node edge — see Implementation Note on fallback)
    - `repo -->|trigger| actions -->|push image| ghcr`
    - `argo -->|monitors| repo` (ArgoCD pull-based GitOps — matches canonical `architecture.md`)
    - `ghcr -->|image pull| argo -->|deploys| pod` when manifest
    - `pod -->|<service.namespace>.svc.cluster.local:5432| <serviceNodeId>` per service when manifest (in-cluster connection; hardcode 5432 for postgresql, or derive from service metadata if available)
  - **Stack template variant** (`install_type === 'stack'`): emit a minimal K8s subgraph with only service nodes, a `uis` node, `uis -->|deploys + seeds| <serviceNodeId>` per service, and a dashed consumer edge:
    - `consumers["Consumer templates"] -.->|use this| <serviceNodeId>`
    - The `consumers` node is a **hardcoded generic label** — not derived from cross-template data. Documented as a known simplification (see § Open design decisions).

- [ ] 1.3 Implement `buildSequence(entry)` — returns `null` when `install_type === 'overlay'` OR `resolvedServices.length === 0`. Otherwise:
  - **Participants** (in this order): `Dev as Developer`, `DCT as DCT devcontainer`, `UIS as UIS provision-host`, `K8s as Local Kubernetes cluster`
  - **Stack template flow**:
    1. `Dev->>DCT: uis template install <entry.id>`
    2. `DCT->>UIS: install stack`
    3. For each service: `UIS->>K8s: create <service.name> (<service.database>)`
    4. If any service has `initFilePath`: `UIS->>K8s: run init-*.sql seed files`
    5. `UIS->>UIS: kubectl port-forward <service.exposePort>` (first service)
    6. `UIS-->>DCT: return connection JSON`
  - **App-with-services flow**:
    1. `Dev->>DCT: dev-template configure`
    2. `DCT->>UIS: request provisioning`
    3. `UIS->>K8s: create namespace`
    4. For each service: `UIS->>K8s: create <service.name> (<service.database>)`
    5. If manifest: `UIS->>K8s: create K8s Secret (<manifest.secretName>)`
    6. `UIS->>UIS: kubectl port-forward <service.exposePort>` (first service)
    7. `UIS-->>DCT: write .env (host.docker.internal:<service.exposePort>)`
    8. `Dev->>DCT: <quickstart.run>` — **reads the post-refactor `quickstart.run` field directly**; if that field is absent (prerequisite 2 not yet shipped), throw a clear error at build time pointing at the missing field, do not fall back
    9. `DCT->>K8s: connect via host.docker.internal:<service.exposePort>`

- [ ] 1.4 Implement `buildArchitectureMdx(entry)` — composes the final MDX section from the two raw strings:
  - If `buildFlowchart(entry)` returns `null` → return `{ mdx: null }`
  - Otherwise, build the section string:
    ```
    ## Architecture

    ### Steady-state

    ```mermaid
    <flowchart>
    ```
    ```
  - If `buildSequence(entry)` is non-null, append:
    ```

    ### Configure flow

    ```mermaid
    <sequence>
    ```
    ```
  - Terminate with a trailing newline. Return `{ mdx: <composed> }`.

- [ ] 1.5 Create `scripts/test/build-architecture-mermaid.test.ts`. First test file in the repo, so this task also establishes the pattern for future `scripts/` tests. Use `node:test` + `node:assert/strict`:
  ```ts
  import { test } from 'node:test';
  import assert from 'node:assert/strict';
  import { buildArchitectureMdx, buildFlowchart, buildSequence } from '../lib/build-architecture-mermaid.ts';
  ```
  Fixtures: define inline minimal `TemplateEntry` shaped objects for each archetype. Do not load real registry JSON — keep tests hermetic.

- [ ] 1.6 Test coverage — one `test()` per archetype, asserting on substrings (not exact string equality, to avoid whitespace brittleness):
  - **E1 fixture** (`python-basic-webserver-database` shape: install_type=app, 1 tool, 1 service with exposePort+database, manifest present, params.app_name='my-app'): assert `buildArchitectureMdx` returns non-null `mdx`; assert it contains `## Architecture`, `### Steady-state`, `### Configure flow`, `flowchart LR`, `sequenceDiagram`, `subgraph dct`, `subgraph k8s`, `argo`, `dct -->|git push| repo`, `argo -->|monitors| repo`, `host.docker.internal:35432`, `dev-template configure`, and the exact `quickstart.run` value from the fixture. Assert it does NOT contain `uis template install`.
  - **E2 fixture** (`python-basic-webserver` shape: install_type=app, 1 tool, 0 services, manifest present, params=null): assert `mdx` is non-null; flowchart present; `### Configure flow` and `sequenceDiagram` **absent** (null sequence branch); no `subgraph k8s` services but ArgoCD + pod still rendered because manifest is present; app node label falls back to `entry.name` or `entry.id`.
  - **E3 fixture** (`postgresql-demo` shape: install_type=stack, 0 tools, 1 service, manifest absent, params present): assert `mdx` non-null; contains `flowchart LR`, `sequenceDiagram`, `uis template install postgresql-demo` (verbatim, uses `entry.id`), `consumers["Consumer templates"]`, dashed edge `-.->`, no `subgraph dct`, no `argo`.
  - **E4 fixture** (`plan-based-workflow` shape: install_type=overlay): assert `buildArchitectureMdx` returns `{ mdx: null }`; assert `buildFlowchart` returns `null`; assert `buildSequence` returns `null`.

- [ ] 1.7 Determinism test — one additional `test()` that calls `buildArchitectureMdx(e1Fixture)` twice and asserts the two outputs are `===` equal. Catches accidental `Object.keys()` ordering non-determinism that would pollute git diffs.

- [ ] 1.8 MDX smoke test — write a tiny fixture MDX file to `/tmp` (in devcontainer) that contains one representative E1 output between a `<TemplateHeader>` stub and some body text, then run `cd website && npx docusaurus build` against a throwaway project. If you can't afford a full Docusaurus build: instead, manually copy the E1 fixture output into one existing template page under `website/docs/templates/**` as a one-off smoke, run `cd website && npm run build`, then revert the change. The goal is catching MDX-parser collisions with Mermaid syntax (`<br/>`, `{`, `"`) before any of Phases 2–3 build on top.

### Validation

Run inside the devcontainer:

```bash
npx tsx --test scripts/test/build-architecture-mermaid.test.ts
```

(Fallback if `--test` passthrough is missing: `npx tsx scripts/test/build-architecture-mermaid.test.ts`.) All tests pass. Task 1.8 MDX smoke test also passes. User confirms before moving to Phase 2.

---

## Phase 2: Integrate into registry generator

### Tasks

- [ ] 2.1 Open `scripts/generate-registry.ts`. Add the import at the top alongside the existing `dct-doc-paths` import:
  ```ts
  import { buildArchitectureMdx } from './lib/build-architecture-mermaid.ts';
  ```

- [ ] 2.2 Extend the `TemplateEntry`-like type / the `entry: Record<string, unknown>` shape (see line ≈600) to include the new field. Since `entry` is typed loosely as `Record<string, unknown>`, just assigning the field is legal — but add a type-level note so future readers understand it:
  ```ts
  // architectureMdx: added by build-architecture-mermaid.ts below — the full
  // `## Architecture` section as a ready-to-embed MDX string, or null for
  // overlay templates (where no diagram is rendered).
  ```

- [ ] 2.3 Insert the builder call **between existing lines 663 and 665** of `scripts/generate-registry.ts` (verified by reading the file on 2026-04-11) — i.e. after `entry.resolvedInitFiles = readInitFiles(...)` and before `allTemplates.push(entry)`:
  ```ts
  const { mdx } = buildArchitectureMdx(entry as TemplateEntry);
  entry.architectureMdx = mdx;
  ```

- [ ] 2.4 Regenerate the registry:
  ```bash
  npx tsx scripts/generate-registry.ts
  ```

- [ ] 2.5 Inspect `website/src/data/template-registry.json`. For the four canonical archetypes, assert the new field is populated as expected:
  - `python-basic-webserver-database` → `architectureMdx` is a non-null string containing `## Architecture`, `### Steady-state`, `### Configure flow`, `sequenceDiagram`, `argo`, `dct -->|git push| repo`, `host.docker.internal:35432`
  - `python-basic-webserver` → `architectureMdx` is non-null, contains `## Architecture` and `### Steady-state` but does NOT contain `### Configure flow` or `sequenceDiagram`
  - `postgresql-demo` → `architectureMdx` non-null, contains `uis template install postgresql-demo`
  - `plan-based-workflow` → `architectureMdx` is `null`

  Use `jq` inside the devcontainer to pull the field:
  ```bash
  jq -r '.templates[] | select(.id=="python-basic-webserver-database") | .architectureMdx' website/src/data/template-registry.json
  ```

### Validation

Command above succeeds and the four assertions hold. User inspects the python-basic-webserver-database sample output and confirms the diagrams look right *as raw MDX text* (rendering happens in Phase 3).

---

## Phase 3: MDX emit step (minimal bash)

### Tasks

- [ ] 3.1 Open `scripts/generate-docs-markdown.sh`. Verified insertion point: after the `MDXEOF` heredoc sentinel that closes the `<TemplateEnvironment />` block (currently at line ≈195, inside the `if [[ -n "$local_has_tools" || … ]]; then … fi` guard at lines 173–196) and before the "Embed README content" block (currently at line 198).

- [ ] 3.2 Add this block at the insertion point (outside the TemplateEnvironment conditional — the Architecture section has its own overlay suppression via the `null` check):
  ```bash
  # Emit auto-generated ## Architecture section (PLAN-template-architecture-diagram.md).
  # The full MDX is pre-composed by buildArchitectureMdx() in
  # scripts/lib/build-architecture-mermaid.ts and stored as a single string field
  # on each registry entry. Overlay templates get null, which jq returns as the
  # empty string under `// empty`, and the conditional skips the section.
  local_arch_mdx=$(jq -r ".templates[$i].architectureMdx // empty" "$REGISTRY")
  if [[ -n "$local_arch_mdx" ]]; then
      printf '\n%s\n\n' "$local_arch_mdx" >> "$page_file"
  fi
  ```
  **Why `printf '\n%s\n\n'`**: adds one leading blank line to separate the heading from whatever came before, and one trailing blank line so the README embed doesn't run on. `jq -r` already unescapes newlines inside the string, so multi-line Mermaid is preserved.

- [ ] 3.3 Regenerate all MDX files:
  ```bash
  bash scripts/generate-docs-markdown.sh --force
  ```

- [ ] 3.4 Spot-check the regenerated `.mdx` output. For `python-basic-webserver-database.mdx`: confirm the `## Architecture` section appears between `<TemplateEnvironment />` and the README content, and that the fenced ` ```mermaid ` blocks are unmangled (no escaped newlines, no double-escaped quotes).

- [ ] 3.5 Run the Docusaurus build to catch any MDX parser collisions with Mermaid syntax — this is the definitive end-to-end syntax check:
  ```bash
  cd website && npm run build
  ```
  If the build fails on a specific template, the error message identifies the file and line. Fix by adjusting the builder module (Phase 1 task 1.2 or 1.3), regenerate registry + docs, rebuild. Iterate.

- [ ] 3.6 Run the existing validators to confirm no regressions:
  ```bash
  bash scripts/validate-metadata.sh
  bash scripts/validate-docs.sh
  ```
  Note: `validate-docs.sh` runs rules against `.md` files only, not `.mdx`, so the new `## Architecture` heading is not subject to its `required_heading`/`forbidden_pattern` rules. Confirmed by reading `scripts/validate-rules.conf` on 2026-04-11.

### Validation

`npm run build` succeeds. User opens the regenerated MDX for the four canonical archetypes and confirms:
- `python-basic-webserver-database.mdx` — `## Architecture` present with both diagrams
- `python-basic-webserver.mdx` — `## Architecture` present, flowchart only, no `### Configure flow` sub-heading
- `postgresql-demo.mdx` — `## Architecture` present with stack-shaped flowchart and `uis template install` sequence
- `plan-based-workflow.mdx` — no `## Architecture` section at all

---

## Phase 4: Visual review in running dev server

### Tasks

- [ ] 4.1 Start the Docusaurus dev server:
  ```bash
  cd website && npm run start
  ```

- [ ] 4.2 Visit every template page under `http://localhost:3000/docs/templates/` (all templates in `website/docs/templates/**`). For each, capture:
  - Node overflow / label truncation
  - Subgraph-to-node edges (`dct -->|git push| repo`) rendering correctly — **this is the primary blocker risk**; if any template renders the `dct --> repo` edge as two disconnected subgraphs, fall back to adding an explicit `git_local` node inside the DCT subgraph (see Implementation Notes) and rerun Phases 2–3
  - Wrong-direction arrows or labels that don't match the real commands
  - Dark-mode vs light-mode readability (toggle in the Docusaurus navbar)
  - Mobile viewport (Chrome DevTools device emulation) — horizontal scroll is acceptable per investigation § H

- [ ] 4.3 For each issue: prefer fixes in the builder (`scripts/lib/build-architecture-mermaid.ts`) over source-data changes. Regenerate registry + docs, reload the dev server, retest.

- [ ] 4.4 After all 10 templates pass visual review, re-run `npm run build` one final time to confirm no regressions from iterative fixes.

### Validation

User walks through all 10 template pages in the running dev server and confirms the diagrams are accurate and readable. All labels match the real commands and addresses used in each template's configure/run story.

---

## Phase 5: Contributor docs

### Tasks

- [ ] 5.1 `website/docs/ai-developer/readme-structure.md` **does not exist** (verified 2026-04-11). Instead, update `website/docs/ai-developer/project-dev-templates.md` (pointed at by `CLAUDE.md`) with a short section on the auto-generated `## Architecture` block. Explain:
  - The section is built at registry-generation time by `scripts/lib/build-architecture-mermaid.ts`
  - Contributors do NOT author it per-template — editing the generated `.mdx` file is pointless, changes will be overwritten
  - To change the diagram shape, edit the builder module
  - Overlay templates skip the section entirely by design

- [ ] 5.2 Add a one-line back-reference in the investigation doc's § Next Steps that this plan is the downstream implementation and link to the builder module path.

- [ ] 5.3 Update `plans/active/index.md` and `plans/completed/index.md` as this plan moves through states (handled automatically by `bash scripts/generate-plan-indexes.sh` if the script sees the new file — verify by running it).

### Validation

User reviews the updated `project-dev-templates.md` section and confirms it accurately describes the contributor-facing model.

---

## Acceptance Criteria

- [ ] All 10 non-overlay template pages render a `## Architecture` section between `<TemplateEnvironment />` and the README
- [ ] App templates with services (E1) render both flowchart and sequence diagram
- [ ] App templates with manifest but no services (E2) render flowchart only (no `### Configure flow` sub-heading); ArgoCD + pod chain is present because a manifest exists
- [ ] Stack templates (E3) render both diagrams; sequence uses `uis template install <entry.id>` (not `dev-template configure`)
- [ ] Overlay templates (E4) render no `## Architecture` section
- [ ] The sequence diagram's "run the app" step uses the post-refactor `quickstart.run` field verbatim (no hardcoded per-language commands)
- [ ] All diagrams match the visual style of `website/docs/architecture.md` — plain text labels, no emojis, default theming, `subgraph` grouping, subgraph label `"Local Kubernetes Cluster (Test environment)"`
- [ ] `npx tsx scripts/generate-registry.ts` writes `architectureMdx` on every entry (string or `null`)
- [ ] `bash scripts/generate-docs-markdown.sh --force` emits the section into every non-overlay page
- [ ] `cd website && npm run build` succeeds — Docusaurus Mermaid parser validates every fenced block
- [ ] `bash scripts/validate-metadata.sh && bash scripts/validate-docs.sh` pass with no regressions
- [ ] Unit tests at `scripts/test/build-architecture-mermaid.test.ts` cover all four archetypes + determinism and pass under `npx tsx --test`
- [ ] Determinism: running `npx tsx scripts/generate-registry.ts` twice in a row produces a byte-identical `template-registry.json`
- [ ] Contributor docs in `project-dev-templates.md` mention the new section and point to the builder module

---

## Implementation Notes

- **Subgraph-to-node edges are a blocker risk.** Mermaid 10.x in Docusaurus 3.9 *should* support edges where the source is a subgraph id (`dct --> repo`), but rendering can be finicky in some flowchart layouts. Phase 1 task 1.8 catches this early via the MDX smoke test; Phase 4 visual review catches any residual issues. **Fallback pattern**: add a dedicated `git_local["Local git working copy"]` node inside the DCT subgraph and change the edge source from `dct` to `git_local`. This mirrors the `architecture.md` canonical pattern which uses explicit `git[Git Repository]` nodes inside the "Developer's Local Machine" subgraph.

- **ArgoCD is drawn as a solid edge**, not dashed/planned. Decision locked in investigation § F. When the real ArgoCD integration ships, the labels may need adjusting but the chain shape (`argo -->|monitors| repo`, `ghcr -->|image pull| argo -->|deploys| pod`) should be stable.

- **Node id collisions for multi-service templates** are deferred. The current 10 templates all have 0 or 1 service. If a future template has two services, the builder must disambiguate (`svc_postgresql`, `svc_redis`, plus matching `sec_postgresql`, `sec_redis`). For v1, assume single-service and fail loudly (throw with a clear error) if `resolvedServices.length > 1` — better to block than silently emit a broken diagram.

- **Node label derivation precedence**: prefer `params.app_name` → `entry.name` → `entry.id`. Use the string verbatim (no dash↔underscore normalization). E2 fixture (`python-basic-webserver`) has `params === null`, so it exercises the `entry.name` fallback path.

- **`quickstart.run` dependency is hard**. If prerequisite 2 (schema refactor) has not shipped when Phase 1 runs, the sequence builder cannot do its job. The plan cannot start until the field is present in every app template's `template-info.yaml`.

- **Stack template consumer node is a hardcoded generic label** — `consumers["Consumer templates"]` — not derived from cross-template data. Simplest implementation; acceptable v1 tradeoff. See § Open design decisions.

- **Typecheck gap**: `scripts/**` is not typechecked by the website's `npm run typecheck` (the `website/tsconfig.json` baseUrl is `.` = the website folder; scripts live at repo root). The new builder module is only validated at runtime by tsx. Extending typecheck coverage is noted in § Open design decisions as a future improvement.

- **Determinism**: the builder must iterate in a stable order. Prefer `for (const svc of entry.resolvedServices)` (array iteration is order-stable) over `for (const key in obj)` (object key order is implementation-defined). Test 1.7 guards this.

- **Test runner establishment**: this plan creates the first TypeScript test file in the repo. Task 1.5 sets the precedent — future tests for other `scripts/lib/` modules should follow the same pattern (`node:test` + `node:assert/strict`, run via `npx tsx --test`).

---

## Open design decisions (defaults applied)

These were surfaced during the 2026-04-11 gap analysis. Defaults applied — user can override before or during implementation.

| # | Question | Default chosen | Why |
|---|---|---|---|
| O1 | Where to document the new section (no `readme-structure.md` exists)? | Update `project-dev-templates.md` | It's the file `CLAUDE.md` already points at for project-specific docs |
| O2 | Typecheck strategy for `scripts/**` | Runtime-only via tsx for v1; extending `tsconfig` to include scripts noted as future improvement | Matches the current state of the repo; no new infrastructure in this plan |
| O3 | Stack template consumer edge | Hardcoded `consumers["Consumer templates"]` label | Cross-template lookup would require a second pass over all templates — too much complexity for v1 |
| O4 | How to handle multi-service templates (>1 service) | Throw a clear error and block registry generation | Better than silently emitting a broken diagram; real multi-service support is future work |
| O5 | Where to run Phase 1 tests in CI | **Not wired to CI in this plan** | No existing test runner in `.github/workflows/deploy-docs.yml`; adding CI integration is optional follow-up work |

---

## Files to Modify

- `scripts/lib/build-architecture-mermaid.ts` (new, TypeScript)
- `scripts/test/build-architecture-mermaid.test.ts` (new, TypeScript — first test file in repo)
- `scripts/generate-registry.ts` (import at top, +2 lines in the entry-assembly loop at line 663–665)
- `scripts/generate-docs-markdown.sh` (+5 lines at line ≈196, outside the TemplateEnvironment conditional)
- `website/docs/ai-developer/project-dev-templates.md` (Phase 5 contributor-docs note)
- `website/docs/ai-developer/plans/backlog/INVESTIGATE-template-architecture-diagram.md` (Phase 5 back-reference)

Automatically regenerated (do not edit by hand):
- `website/src/data/template-registry.json` — new `architectureMdx` field on every entry
- `website/docs/templates/**/*.mdx` — 9 non-overlay pages get the new section
