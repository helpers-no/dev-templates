# Plan: Architecture Diagram Display — Collapsible + Zoomable + Extensible

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Complete

**Goal**: Ship the three changes locked in by the upstream investigation:

1. **Collapsibility** — each mermaid diagram on a template page is wrapped in its own `<details>` dropdown, collapsed by default. Section headings (`### Local development`, `### Deployment`) stay visible as signposts.
2. **Zoom** — click any mermaid diagram to enlarge it in an overlay.
3. **Extensibility** — refactor the architecture builder to return a structured `ArchitectureResult` model so adding a 3rd, 4th, or Nth diagram per sub-section later is a one-line change, not a structural rewrite.

**Last Updated**: 2026-04-15

**Upstream investigation**: [INVESTIGATE-architecture-diagram-display.md](INVESTIGATE-architecture-diagram-display.md) — all 8 questions and 3 axes decided.

**Related**:
- [PLAN-environment-card-improvements.md](PLAN-environment-card-improvements.md) — the preceding plan that introduced the shared `.detailsBlock` CSS class this plan reuses
- [PLAN-architecture-diagram-v2.md](../completed/PLAN-architecture-diagram-v2.md) — the plan that produced the current 4-diagram shape being restructured here

---

## Naming (locked in)

| Mermaid kind | Human-readable name | Today's use |
|---|---|---|
| Flowchart | **Components** | Steady-state view: the named nodes (Developer, DCT, UIS, K8s, app, browser) and how they connect |
| Sequence diagram | **Flow** | Ordered steps: what happens when the developer runs the configure command |

Future diagrams can extend the vocabulary: **Errors**, **Data flow**, **Network**, **Security**, **Operations**, etc.

---

## Target shape per archetype

**E1** (`python-basic-webserver-database` — app + services + manifest):

```
## Architecture

These diagrams are auto-generated from the template's metadata.
Click any diagram to enlarge.

### Local development

▶ Components    ← collapsed <details>
▶ Flow          ← collapsed <details>

### Deployment

▶ Components    ← collapsed
▶ Flow          ← collapsed
```

**E2** (6 app templates without services — e.g. `python-basic-webserver`): only the `### Deployment` sub-section with its two collapsed dropdowns.

**E3** (`postgresql-demo` — stack template): a single `### Overview` sub-section with its two collapsed dropdowns (same shape as today's v2 output, just wrapped in per-diagram dropdowns).

**E4** (`plan-based-workflow` — overlay): section suppressed entirely, same as today.

---

## Target data model (locked in)

The builder's current `buildArchitectureMdx` returns a pre-composed MDX string. It becomes `buildArchitectureModel` returning a structured object:

```ts
export interface ArchitectureDiagram {
  name: string;              // "Components", "Flow", future: "Errors", "Data flow", ...
  mermaid: string;           // the mermaid source, without the ```mermaid fence
}

export interface ArchitectureSection {
  title: string;                      // "Local development", "Deployment", "Overview", future: ...
  diagrams: ArchitectureDiagram[];    // 1..N diagrams, in render order
}

export interface ArchitectureResult {
  intro?: string;                           // one-line prose shown below ## Architecture heading
  sections: ArchitectureSection[];          // 0..N sub-sections; empty array → section suppressed
}
```

An emitter walks the model and produces the MDX block with the per-diagram `<details>` wrappers. Adding a 3rd diagram to an existing section is then appending one entry to `diagrams`. Adding a new section is pushing to `sections`. Both are pure data changes — no rendering code touches.

---

## Files touched

**Builder + emitter** (TypeScript):
- `scripts/lib/build-architecture-mermaid.ts` — refactor `buildArchitectureMdx` into `buildArchitectureModel` (returns the structured `ArchitectureResult`). The individual diagram-building helpers (`buildLocalDevFlowchart`, `buildLocalDevSequence`, `buildDeployFlowchart`, `buildDeploySequence`, `buildStackFlowchart`, `buildStackSequence`) stay — only their composition changes.
- `scripts/lib/build-architecture-mdx.ts` — **new** emitter module. Exports `emitArchitectureMdx(result: ArchitectureResult): string | null`. Walks the model, emits `## Architecture` + intro + per-section `### ${title}` + per-diagram `<details>` wrappers + fenced mermaid blocks.
- `scripts/generate-registry.ts` — call `buildArchitectureModel` then `emitArchitectureMdx`, store the final MDX string on the entry (same field as today: `entry.architectureMdx`).

**Tests**:
- `scripts/test/build-architecture-mermaid.test.ts` — update existing 12 tests to assert the structured model shape instead of raw MDX strings. The underlying diagram strings are unchanged; only the wrapping structure moves from concatenated MDX to a data model.
- `scripts/test/build-architecture-mdx.test.ts` — **new** emitter test file. Covers: single-section stack output; two-section app-with-services output; E2 output (one section); E4 returns null; the per-diagram `<details>` wrapper format; the intro-sentence emission.

**Component / styling**:
- No changes needed to `<TemplateEnvironment>` — the Architecture section is emitted by the MDX pipeline, not by the component. The `.detailsBlock` CSS class already exists in `styles.module.css` from the completed environment-card plan, but it lives inside the `TemplateEnvironment` component's CSS module — we need a way to reuse it outside. Options handled in Phase 2 below.

**Zoom**:
- `website/docusaurus.config.ts` — Phase 3. Configure `docusaurus-plugin-image-zoom` with a mermaid-targeting selector (if B2 spike succeeds), OR add a swizzled theme component / small custom wrapper (B1 fallback).

**Contributor docs**:
- `website/docs/contributors/readme-structure.md` — note that Architecture section diagrams are collapsed by default and each has its own dropdown.
- `website/docs/ai-developer/project-dev-templates.md` — § "Auto-generated documentation sections → Architecture section" — update the short description of what the generator produces.

---

## Phases

### Phase 1: Zoom spike (time-boxed)

**Scope**: 30-minute investigation — does `docusaurus-plugin-image-zoom` / `medium-zoom` cleanly handle inline SVG targets?

- [x] 1.1 Read `docusaurus-plugin-image-zoom` source (`/lib/zoom.js`): thin wrapper around `medium-zoom`, calls `mediumZoom(selector, config)` with a 1-second timeout on mount + on route updates. Default selector is `.markdown img`. Selector is freely configurable via `themeConfig.zoom.selector`.
- [x] 1.2 Read `medium-zoom/dist/medium-zoom.esm.js` lines 16–18. **Conclusive finding — B2 is dead:**
  ```js
  var isSupported = function isSupported(node) {
    return node.tagName === 'IMG';
  };
  ```
  `medium-zoom` hard-rejects any element that isn't `<img>`. The `isSvg()` helper at line 31–34 is for detecting `<img src="*.svg">` (img tags pointing at SVG files), not inline `<svg>` elements. Mermaid renders inline SVG — it will never match. No selector trick, fork, or patch gets around this.
- [x] 1.3 Mermaid container class confirmed: `docusaurus-mermaid-container` (hard-coded in `@docusaurus/theme-mermaid/lib/client/index.js` as `MermaidContainerClassName`). This is the stable selector target regardless of Docusaurus version — safe to rely on.
- [x] 1.4 Mermaid is **rendered client-side only**. Built HTML has zero `mermaid`, zero `flowchart`, zero `sequenceDiagram` strings. The mermaid source lives in the JS bundle (passed to a React component) and the SVG is generated post-mount in the browser. This constrains any zoom approach to run after mount, but the 1-second timeout in docusaurus-plugin-image-zoom would have handled that anyway — so timing isn't the bottleneck, `medium-zoom`'s element-type rejection is.
- [x] 1.5 Spike result documented above: B2 **REJECTED** — not a partial or fixable failure, a hard type-system rejection in `medium-zoom`.
- [x] 1.6 **Decision: Phase 3 = Phase 3b (custom component path).**
- [x] 1.7 Phase 3b architectural sketch: use Docusaurus's `clientModules` config entry to register a small ES module that runs on every page. On mount + on route updates, the module:
  1. Queries all `.docusaurus-mermaid-container` elements
  2. Adds a click handler + cursor-pointer style to each
  3. On click: opens a native HTML `<dialog>` element with the diagram's SVG cloned inside
  4. `<dialog>` handles Escape-to-close and focus trapping natively
  5. Click-outside-the-diagram OR a close button dismisses
  This avoids swizzling the Mermaid theme component (no long-term maintenance burden on Docusaurus upgrades) and stays ~100 LOC total. Estimated implementation time for Phase 3b: 45–60 minutes including styling.
- [x] 1.8 Clean state: the spike made no code changes (read-only file inspection via `cat`/`grep`), so nothing to revert. The only state change is the PLAN file being updated with this Phase 1 result.

**Exit criterion**: Phase 1 is done when we know exactly what Phase 3 will look like. ✅ We know: Phase 3b, client-side module, ~100 LOC.

**Time spent**: ~10 minutes, well inside the 30-minute budget. The hard-type rejection in `medium-zoom` eliminated the spike's ambiguity immediately.

### Phase 2: Builder refactor — structured model

**Scope**: refactor `buildArchitectureMdx` → `buildArchitectureModel` + a new `build-architecture-mdx.ts` emitter. **No user-visible change yet** — the emitter produces the same MDX output as today (no `<details>` wrappers), just via the new two-step pipeline. This phase is pure internal restructuring.

- [ ] 2.1 Define the `ArchitectureDiagram`, `ArchitectureSection`, `ArchitectureResult` interfaces in `build-architecture-mermaid.ts` (or a new types module). Export them.
- [ ] 2.2 Add a new function `buildArchitectureModel(entry: TemplateEntry): ArchitectureResult` that calls the existing diagram-building helpers and assembles the structured model instead of concatenating strings. For E1: two sections (Local development, Deployment), each with two diagrams (Components, Flow). For E2: one section (Deployment) with two diagrams. For E3: one section (Overview) with two diagrams. For E4: `sections: []`.
- [ ] 2.3 Create `scripts/lib/build-architecture-mdx.ts`. Export `emitArchitectureMdx(result: ArchitectureResult): string | null`. For this phase, emit the exact same MDX shape as today (no `<details>` wrappers yet — that's Phase 4). Returns `null` when `sections.length === 0`.
- [ ] 2.4 Update `scripts/generate-registry.ts` to call the new two-step pipeline: `const model = buildArchitectureModel(entry); entry.architectureMdx = emitArchitectureMdx(model);`.
- [ ] 2.5 Keep the old `buildArchitectureMdx` as a thin deprecated wrapper (`return emitArchitectureMdx(buildArchitectureModel(entry))`) so the old unit tests that import it still pass. Mark deprecated.
- [ ] 2.6 Update existing 12 tests in `scripts/test/build-architecture-mermaid.test.ts` to assert model shape where appropriate (test both `buildArchitectureModel` and the deprecated `buildArchitectureMdx` wrapper). Preserve coverage of the diagram-string content.
- [ ] 2.7 Create `scripts/test/build-architecture-mdx.test.ts` with initial tests covering: the two-step pipeline produces the same MDX as the old direct call; section count by archetype; null-on-overlay.
- [ ] 2.8 Run full pre-push pipeline. The generated MDX for every template should be **byte-identical** to what was on origin/main before this phase — this is a pure refactor with no behavior change. If the generated files diff, find the bug before moving on.
- [ ] 2.9 Commit, push, PR, merge.

**Exit criterion**: Phase 2 merges with no user-visible change. Template pages render exactly as they did before. Unit tests green.

### Phase 3: Wire zoom (based on Phase 1's result)

**Scope**: make mermaid diagrams click-to-enlarge. Implementation depends on Phase 1's spike result.

#### Phase 3a — if B2 worked (config-only path)

- [ ] 3a.1 Add the `themeConfig.zoom` block from Phase 1's spike to `docusaurus.config.ts`, locked in
- [ ] 3a.2 Verify across all 10 template pages: click a diagram → enlarges; click again or press Escape → dismisses
- [ ] 3a.3 Mobile check via browser dev-tools device emulation
- [ ] 3a.4 Accessibility spot-check: keyboard access (Tab to focus, Enter to enlarge, Escape to close)
- [ ] 3a.5 Commit, push, PR, merge

#### Phase 3b — if B1 needed (custom component path)

- [ ] 3b.1 Create a new React component (e.g. `src/theme/MermaidZoomWrapper/index.tsx`) that wraps the Docusaurus mermaid renderer with click-to-open `<dialog>` behavior
- [ ] 3b.2 Swizzle or register the wrapper so all mermaid blocks on the site use it. Docusaurus's theme swizzle path: `website/src/theme/Mermaid/index.tsx`
- [ ] 3b.3 Component spec:
  - On mount: no change to rendered output, just adds a click listener to the container
  - On click: opens a native `<dialog>` overlay with the same SVG cloned (or a re-render of the same mermaid source)
  - Close: Escape key, click outside, or close button
  - Accessible: `aria-modal`, focus trap, restored focus on close (all provided by native `<dialog>`)
- [ ] 3b.4 Verify across all 10 template pages
- [ ] 3b.5 Mobile + accessibility checks (same as 3a.3/3a.4)
- [ ] 3b.6 Commit, push, PR, merge

**Exit criterion**: clicking any mermaid diagram on any template page opens an enlarged view that is dismissable via Escape or close button. Works on mobile. Accessible via keyboard.

### Phase 4: Flip on the per-diagram `<details>` wrappers

**Scope**: update the Phase 2 emitter to actually wrap each diagram in a `<details>` block with a per-diagram `<summary>`. This is the phase where the user-visible collapsibility change lands.

- [ ] 4.1 Update `emitArchitectureMdx` to wrap each diagram in a `details` element with a className pointing at the shared dropdown class, a `summary` element containing the diagram name, and the existing mermaid fence inside the body. See Phase 4 of `PLAN-environment-card-improvements` for the escape-angle-brackets sed trick if MDX's JSX parser complains about the wrapped content.
- [ ] 4.2 Decision point for `className={styles.detailsBlock}` referencing CSS: the Environment card's CSS module lives inside `TemplateEnvironment/`. The Architecture section is a top-level MDX block, not inside the component. Three ways to share the styling:
  - **4.2a**: Extract `.detailsBlock` + variants into a new global CSS file (e.g. `website/src/css/architecture-diagrams.css`) imported by `docusaurus.config.ts`. Global class `.architectureDropdown` or similar.
  - **4.2b**: Use the existing `.detailsBlock` class from the Environment card's CSS module by importing it into the MDX file (cumbersome).
  - **4.2c**: Duplicate the CSS into `custom.css` under a new global class name. Fast but drift-prone.
  - **Recommendation**: 4.2a. Move the `.detailsBlock` rule (and its dark-mode variant, summary hover, etc.) out of `TemplateEnvironment/styles.module.css` into `website/src/css/details-block.css` imported globally. Update `TemplateEnvironment/index.tsx` to use the global class instead of the scoped module class. This makes the dropdown CSS shared between the Environment card, the init-SQL block, and the new architecture dropdowns.
- [ ] 4.3 Update `emitArchitectureMdx` to also emit the intro sentence under the `## Architecture` heading: *"These diagrams are auto-generated from the template's metadata. Click any diagram to enlarge."*
- [ ] 4.4 Full pre-push pipeline. Expected diff on generated MDX files: every template page now has per-diagram `<details>` wrappers around its mermaid blocks + the new intro sentence.
- [ ] 4.5 Built-HTML spot-check across all 10 templates — same matrix as Phase 7 of the completed `PLAN-environment-card-improvements`:
  - E1 (`python-basic-webserver-database`): 2 sections, 4 dropdowns total, collapsed by default, click opens zoom
  - E2 (6 app templates): 1 section (Deployment), 2 dropdowns
  - E3 (`postgresql-demo`): 1 section (Overview), 2 dropdowns
  - E4 (`plan-based-workflow`): no Architecture section
- [ ] 4.6 Commit, push, PR, merge.

**Exit criterion**: on every template page, architecture diagrams are collapsed by default behind per-diagram dropdowns. Click any dropdown → diagram expands. Click the expanded diagram → zooms to full view. Click again / Escape → dismiss.

### Phase 5: Unit test coverage for per-diagram wrapper emission

**Scope**: add tests that assert the Phase 4 emitter produces the expected `<details>` / `<summary>` structure for each archetype. Separate from Phase 4 so the test expansion can be reviewed in isolation.

- [ ] 5.1 Extend `scripts/test/build-architecture-mdx.test.ts` with cases that assert:
  - Each diagram is wrapped in `<details className=...>`
  - Each dropdown's `<summary>` contains the diagram name (`Components` / `Flow` / future)
  - The intro sentence appears between `## Architecture` and the first `###` sub-section
  - Section order: Local development before Deployment for E1; Overview only for E3
  - Diagrams within a section render in model order
  - Overlay templates still emit `null`
- [ ] 5.2 Run the tests. All pass.
- [ ] 5.3 Commit, push, PR, merge (small PR).

### Phase 6: Contributor docs update + close-out

- [ ] 6.1 Update `website/docs/contributors/readme-structure.md` — note that Architecture diagrams are auto-generated and rendered in collapsed dropdowns with per-diagram `Components` / `Flow` names.
- [ ] 6.2 Update `website/docs/ai-developer/project-dev-templates.md` § "Auto-generated documentation sections → Architecture section" — update the short description to mention the data model and per-diagram dropdowns. Note that adding a new diagram to an existing section is a one-line change in `buildArchitectureModel`.
- [ ] 6.3 Move this plan from `active/` to `completed/`
- [ ] 6.4 Move `INVESTIGATE-architecture-diagram-display.md` from `backlog/` to `completed/`
- [ ] 6.5 File two small follow-up issues (or notes in the relevant backlog items):
  - F1: "Open in mermaid.live" link per diagram (deferred from the investigation)
  - F2: duplicate `## Prerequisites` heading on generated E1 pages
- [ ] 6.6 Full pre-push pipeline + commit + PR + merge.

---

## Acceptance criteria

The plan is complete when all of the following are true:

1. Every mermaid diagram on every non-overlay template page is wrapped in its own `<details>` dropdown, collapsed by default
2. Dropdown summary rows use the per-diagram vocabulary (Components / Flow — and any future names that get added)
3. Clicking any mermaid diagram enlarges it in an overlay; Escape or click-outside dismisses
4. The one-sentence intro appears under `## Architecture` on every template that has the section
5. `buildArchitectureModel` returns a structured `ArchitectureResult` object; the emitter is a pure walk of the model; adding a new diagram is a one-line data change in the builder
6. Unit tests green across both `build-architecture-mermaid.test.ts` and `build-architecture-mdx.test.ts`
7. Mobile and keyboard accessibility verified on the click-to-zoom overlay
8. Contributor docs updated
9. Full pre-push pipeline green after each phase

---

## Risks and watch-outs

- **MDX JSX-parser false-positives inside `<details>` blocks**: the emitter will emit literal `<details>` HTML inside generated MDX. Nested markdown headings or mermaid fences inside the `<details>` body may trip MDX 3.10's stricter parser. Phase 4 should verify this on the first template built and fall back to emitting `<details>` as pure HTML (no nested markdown) if needed.
- **`medium-zoom` on inline SVG**: the biggest unknown. Phase 1 is the spike that resolves this. Time-boxed to 30 minutes; if it doesn't work, switch to Phase 3b without further investigation.
- **CSS module extraction (Phase 4.2)**: moving `.detailsBlock` from the Environment card's CSS module to a global CSS file is a small refactor with a wide blast radius. Make sure the existing Environment card dropdowns (init-SQL, template-info.yaml, Expected output) still render correctly after the move. Phase 4 should verify.
- **Byte-identical check in Phase 2**: the "no visible change" guarantee of the refactor phase depends on the emitter producing exactly the same MDX output as the old direct-concatenation approach. A single trailing newline or space difference would cause every generated MDX file to diff on main. Budget 15 minutes to chase any discrepancy before merging Phase 2.
- **Swizzling Docusaurus's Mermaid theme component (Phase 3b)**: swizzling creates a maintenance burden — we'd own the wrapper component across future Docusaurus upgrades. If B1 is needed, prefer wrapping via a small non-swizzled approach (e.g. a client-side script in `clientModules` that attaches click listeners to `.docusaurus-mermaid-container` after mount) over a full theme swizzle.
- **The "click to zoom" affordance is invisible by default**: nothing on the rendered diagram says "clickable". If the spike and Phase 3 work, add a subtle hover cursor or a small zoom-icon overlay in the diagram's corner so users know the interaction exists. Low-priority polish item — address in Phase 3 if time permits, defer otherwise.

---

## Open Questions

None — all 8 questions from the upstream investigation are decided. Implementation can start as soon as the user approves the plan and moves it to `active/`.

---

## Next Steps

- [ ] User reviews this plan
- [ ] Move from `backlog/` to `active/`
- [ ] Execute Phase 1 (zoom spike — 30 minutes, time-boxed)
- [ ] Based on spike result, proceed through Phases 2 → 3a or 3b → 4 → 5 → 6
