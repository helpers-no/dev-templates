# Plan: Environment Card Improvements

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Complete

**Goal**: Ship four improvements to the Environment card on per-template doc pages: fix the ④ numbering bug, decouple the configure command from hardcoded text, rewrite the Configure sub-section intro, and auto-generate the "Expected output" sample block from registry data.

**Last Updated**: 2026-04-13

**Upstream investigation**: [INVESTIGATE-environment-card-improvements.md](INVESTIGATE-environment-card-improvements.md) — all decisions locked in, all open questions resolved.

**Related**:
- [INVESTIGATE-uis-in-cluster-port.md](../backlog/INVESTIGATE-uis-in-cluster-port.md) — the in-cluster port data gap this work stopgaps until UIS ships `inClusterPort`

---

## Scope

Four concrete problems, one plan, nine phases. Each phase is independently shippable with its own validation gate (per PLANS.md best practice for "small phases"):

| Phase | Scope | Independently shippable? |
|---|---|---|
| 1 | Fix ④ numbering bug in `<TemplateEnvironment>` | ✅ |
| 2 | Add `configure_command` yaml field; wire into component + builder | ✅ |
| 3 | Rewrite Configure sub-section intro text | ✅ (depends on Phase 2 for command line) |
| 4 | Add template-info.yaml dropdown to Configure sub-section | ✅ |
| 5 | Build `service-ports.ts` stopgap + `build-expected-output.ts` generator + unit tests | ✅ |
| 6 | Wire expected-output into registry + render inside Configure sub-section | ✅ |
| 7 | Visual review across all 10 templates + adjust | ✅ |
| 8 | Remove hand-written "Expected output" block from `python-basic-webserver-database` README; re-grep for similar blocks in other READMEs | ✅ |
| 9 | Contributor docs update (mention new `configure_command` field); move plan + investigation to `completed/` | ✅ |

**Phase ordering**: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9. Phases 1–4 iterate on the Configure sub-section text and markup. Phases 5–6 build and wire the expected-output generator. Phase 7 is the visual review (no code change, just a decision gate). Phase 8 cleans up duplicated content. Phase 9 closes out.

---

## Files touched

**Component** (always):
- `website/src/components/TemplateEnvironment/index.tsx`
- `website/src/components/TemplateEnvironment/styles.module.css`

**Schema + generator**:
- `scripts/generate-registry.ts` — new field passthrough (`configureCommand`, `templateInfoYaml`, `expectedOutputBlock`)
- `scripts/validate-metadata.sh` — validate the new `configure_command` field (optional string)
- `scripts/lib/service-ports.ts` — **new** stopgap file mapping service ids to their in-cluster default ports
- `scripts/lib/build-expected-output.ts` — **new** generator module
- `scripts/test/build-expected-output.test.ts` — **new** unit tests
- `scripts/lib/build-architecture-mermaid.ts` — update to read `configureCommand` from registry (eliminates the current hardcoded branching on `install_type`)

**Template source** (for the two templates that have a configure flow):
- `templates/python-basic-webserver-database/template-info.yaml` — add `configure_command: "dev-template configure"`
- `uis-stack-templates/postgresql-demo/template-info.yaml` — add `configure_command: "uis template install postgresql-demo"`

**Template READMEs** (cleanup):
- `templates/python-basic-webserver-database/README-python-basic-webserver-database.md` — remove the hand-written Expected output section (lines 106–200)
- Other READMEs — re-grep for similar fenced code blocks that look like terminal output; remove if the new generator produces the equivalent

**Contributor docs** (Phase 9):
- `website/docs/contributors/template-metadata.md` — document `configure_command`
- `website/docs/contributors/readme-structure.md` — note that Expected output is now auto-generated

---

## Phases

### Phase 1: Fix the ④ numbering bug

**Scope**: `<TemplateEnvironment>` component only. Zero schema, yaml, or generator impact.

**Root cause** (from the investigation): `symbols` array has 3 entries, but 4 sub-sections can render. `sectionsShown` also counts only 3 booleans, missing the Setup sub-section.

- [x] 1.1 Read the component — found `nextNumber` function at lines 282–291, four sub-sections (What gets set up, Configure, Setup, Run/quickstart) all call `nextNumber()`
- [x] 1.2 Applied the two-line fix — added `'④'` to `symbols` array, added `setupVisible` and included it in `sectionsShown`
- [x] 1.3 `npm run build` passed (note: the plan file itself needed two small fixes along the way — `<X.Y>` and `<date>` escaped as plain text to avoid MDX 3.10 strict-parse errors, and the `../completed/...` / `./...` cross-reference links fixed to point at `../backlog/...` since both this plan and the investigation are still in their initial locations)
- [x] 1.4 Verified against built HTML (SSR-rendered output):
  - `python-basic-webserver-database` → `grep -o "①\|②\|③\|④" ... | sort | uniq -c` → `1 ① / 1 ② / 1 ③ / 1 ④` ✅ (all four symbols, once each)
  - `python-basic-webserver`, `typescript-basic-webserver`, `designsystemet-basic-react-app` → `1 ① / 1 ② / 1 ③` ✅ (three symbols, no Configure sub-section so no ④)
- [x] 1.5 PR #52 created and merged via `--rebase --delete-branch` as `a6e775f`. Local main fast-forwarded; local branch cleaned up.

### Phase 2: Add `configure_command` field and wire it through

**Scope**: yaml schema + validator + registry generator + component + architecture builder. Fixes the hyphen bug as a side effect.

- [x] 2.1 Schema docs update — **deferred to Phase 9** (contributor docs close-out); lower friction to document the field alongside all the other plan artifacts at once
- [x] 2.2 `validate-metadata.sh` — added optional-string check that rejects non-string types and empty strings
- [x] 2.3 `generate-registry.ts` — added `configure_command` to `TemplateInfoYaml` interface, passes through as `configureCommand` on the entry
- [x] 2.4 `templates/python-basic-webserver-database/template-info.yaml` → `configure_command: "dev-template configure"`
- [x] 2.5 `uis-stack-templates/postgresql-demo/template-info.yaml` → `configure_command: "uis template install postgresql-demo"`
- [x] 2.6 `TemplateEnvironment/index.tsx` — new `configureCommand` prop, replaces hardcoded `<code>dev-template-configure</code>` with `{configureCommand ?? 'dev-template configure'}` fallback
- [x] 2.6a `generate-docs-markdown.sh` — passes the new `configureCommand` prop to `<TemplateEnvironment>`
- [x] 2.7 `build-architecture-mermaid.ts` — replaces 4 hardcoded sites (2 in app flow, 2 in stack flow) with `entry.configureCommand ?? <fallback>` pattern. Interface gained `configureCommand?: string`.
- [x] 2.8 Unit tests — 3 new tests asserting the field drives both flowchart and sequence output (plus fallback case). All 12 tests pass (3 new + 9 existing).
- [x] 2.9 Full pre-push pipeline green
- [x] 2.10 Built HTML verified: database template shows `<code>dev-template configure</code>`; postgresql-demo shows `uis template install postgresql-demo` in the stack flowchart edge label and sequence. Remaining `dev-template-configure` strings in the HTML are heading anchor slugs generated by Docusaurus from the README section title — will be cleaned up in Phase 8.
- [x] 2.11 PR #53 merged via `--rebase --delete-branch`.

### Phase 3: Rewrite Configure sub-section intro text

**Scope**: `<TemplateEnvironment>` component only. Replaces the "This template uses PostgreSQL" label with a two-paragraph action-oriented intro.

- [x] 3.1 Replaced the Configure sub-section intro in `index.tsx` with the Option A wording. New markup uses `styles.intro` (reused from the What-gets-set-up sub-section) for the prose paragraph and keeps `styles.text` for the `Uses: {service}` line.
- [x] 3.2 No CSS adjustments needed — the existing `styles.intro` class already has the right paragraph spacing
- [x] 3.3 Built HTML verified: database template page contains the new intro exactly once; templates without services (which don't render Configure at all) show zero occurrences. The old "This template uses" label is gone from the component output; the one remaining match in the built HTML is an unrelated sentence in README prose.
- [x] 3.4 PR #54 merged via `--rebase --delete-branch` (`e29c720`). Local main fast-forwarded.

### Phase 4: Add template-info.yaml dropdown

**Scope**: new registry field `templateInfoYaml: string` (raw file content) + component `<details>` block.

- [x] 4.1 `generate-registry.ts` reads raw bytes via `readFileSync` and attaches as `templateInfoYaml` on the registry entry (only for templates with `requires:` — keeps the registry compact)
- [x] 4.2 `<details>` block added to the Configure sub-section, positioned between the params list and the "Then run:" command. `generate-docs-markdown.sh` passes the new prop.
- [x] 4.3 CSS: `.initFile` renamed to `.detailsBlock` (7 rules migrated). `InitFilesBlock` uses the shared class per Q6 decision. One class for all three dropdown use cases (init-SQL, template-info.yaml, and the future expected-output in Phase 5+6).
- [x] 4.4 Built HTML verified: 1 `<details>` block with "edit to change defaults" summary on the database template page; raw yaml content present (confirmed via `id: python-basic-webserver-database` grep); templates without services show zero dropdowns (no Configure sub-section to host them).
- [x] 4.4a **Generator hardening (discovered during Phase 4)**: MDX 3.10's JSX parser mis-interprets `<foo>` patterns inside JSON-encoded string literals as unclosed tags. Fixed via `sed 's/</\\u003c/g' -e 's/>/\\u003e/g'` on the jq output before embedding into the MDX attribute. React renders the unicode escapes as real characters at runtime. Also scrubbed a gratuitous `<id>` reference from the Phase 2 yaml comment.
- [x] 4.5 PR #55 merged via `--rebase --delete-branch`. Local main fast-forwarded.

### Phase 5: Build the expected-output generator and service-ports stopgap

**Scope**: three new files under `scripts/lib/` and `scripts/test/`. No integration yet.

- [x] 5.1 `scripts/lib/service-ports.ts` created with `postgresql: 5432, redis: 6379, mongodb: 27017, mysql: 3306`. Exports both the raw map and `getInClusterPort(id)` which throws on unknown ids (prevents silent bogus ports for new UIS services). File header names the concrete deletion conditions and links to `INVESTIGATE-uis-in-cluster-port.md`.
- [x] 5.2 `scripts/lib/build-architecture-mermaid.ts` refactored: imports `getInClusterPort`, replaces both hardcoded `5432` sites in the deploy flowchart and deploy sequence. Mermaid output is byte-identical post-refactor (same port). `TemplateEntry` interface gained `resolvedInitFiles?: Record<string, string>` so the expected-output generator can share the type.
- [x] 5.3 `scripts/lib/build-expected-output.ts` created. Single entry point `buildExpectedOutput(entry)` with two internal format functions: `buildAppExpectedOutput` (E1 — mimics the hand-written `dev-template configure` block from the README) and `buildStackExpectedOutput` (E3 — shorter `uis template install` format). Returns `null` for E2 and E4. Uses `yourorg/{params.app_name}` git placeholder per Q1. File header: `Last verified against DCT v1.7.36 on 2026-04-14` per Q2.
- [x] 5.4 `scripts/test/build-expected-output.test.ts` created with 23 new tests covering:
  - E1: non-null + multi-line, banner + divider, git identity placeholder, template-info.yaml id/type, parameters block, service detail block, init file size + line count (computed from INIT_SQL_CONTENT fixture), UIS command form + args, port-forward ASCII art (host + in-cluster ports), .env write line, K8s Secret block, Next steps with quickstart.run, footer
  - E2: returns null
  - E3: banner, service deploy block, UIS deploy command (not configure; no `--secret-name-prefix`), port-forward summary, Next steps, "Stack installed" footer
  - E4: returns null
  - Multi-service rejection (v1 limitation)
  - Unknown service id throws from service-ports.ts
- [x] 5.5 `npx tsx --test scripts/test/build-expected-output.test.ts scripts/test/build-architecture-mermaid.test.ts` — **35/35 pass** (23 new + 12 existing).
- [x] 5.6 PR #56 merged via `--rebase --delete-branch`. Local main fast-forwarded.

### Phase 6: Wire expected-output into registry and component

**Scope**: registry generator calls the new builder; component renders the output in a `<details>` block.

- [x] 6.1 `generate-registry.ts` imports and calls `buildExpectedOutput`, stores `expectedOutputBlock: string | null` on every entry. `generate-docs-markdown.sh` passes the new prop with the same `<`/`>` sed escape Phase 4 introduced for `templateInfoYaml`.
- [x] 6.2 `<TemplateEnvironment>` component: new `expectedOutputBlock?: string` prop. Renders inside the Configure sub-section, below the "Then run:" command, as a `<details className={styles.detailsBlock}>` block with summary `Expected output from <code>{configureCommand}</code>`.
- [x] 6.3 Built HTML verified:
  - `python-basic-webserver-database` (E1): 1 "Expected output from" dropdown; contains "Checking UIS bridge", "📄 Reading template-info.yaml", "Configuration complete". **Major validation win: the generator's `702 bytes (19 lines)` init-file size matches exactly what the hand-written README block had — proof the dynamic values are faithfully derived from registry data.**
  - `postgresql-demo` (E3 stack): generator output stored in registry but NOT rendered. Stack templates don't have a Configure sub-section to host the dropdown. **Decision: deferred to Phase 7 visual review** to pick a rendering location (new Install sub-section, inline in What-gets-set-up, or keep stored-but-unrendered).
  - Templates without services (E2): zero dropdowns. Correct — `expectedOutputBlock` is null from the generator.
- [x] 6.4 PR #57 merged via `--rebase --delete-branch`. Local main fast-forwarded.

### Phase 7: Visual review across all 10 templates + adjust

**Scope**: decision gate, no code changes unless something breaks. Walk every template page and confirm the Environment card still renders correctly.

- [x] 7.1 Systematic built-HTML review across all 10 templates. Final matrix:
  - `typescript-basic-webserver` → ①②③ (What/Setup/Run)
  - `python-basic-webserver` → ①②③
  - `csharp/golang/java/php-basic-webserver` → ①② (no setup step in those templates)
  - `designsystemet-basic-react-app` → ①②③
  - `python-basic-webserver-database` → ①②③④ + Expected output dropdown inside Configure
  - `postgresql-demo` → ①②③ + **new Install sub-section** + Expected output dropdown inside Install
  - `plan-based-workflow` → no card (overlay, correct)
- [x] 7.2 All numbering, configureCommand, template-info.yaml, and Expected output dropdowns verified against Phase 5's generator via `grep` on the built HTML.
- [x] 7.3 **Gap surfaced during review**: `postgresql-demo` had `expectedOutputBlock` stored in the registry but no render location (stacks don't have a Configure sub-section). Per investigation Q3's Option B decision, stacks need a render location too. Added a new **Install** sub-section to `<TemplateEnvironment>` — parallel to Configure but for stacks. Renders intro prose, the install command, and the expected-output dropdown. Mutually exclusive with Configure, so the numbering slot is shared.
- [x] 7.4 PR #58 merged via `--rebase --delete-branch` as `017b07f`. Local main fast-forwarded.

### Phase 8: README cleanup

**Scope**: remove the hand-written Expected output section in `python-basic-webserver-database` README; re-grep other READMEs for similar blocks.

- [x] 8.1 Removed lines 106–200 of `README-python-basic-webserver-database.md` (the hand-written `#### Expected output` section). Replaced with a two-sentence pointer at the auto-generated dropdown on the docs page. Kept the surrounding template-specific prose (idempotency note, K8s secret name derivation).
- [x] 8.2 Q4 re-grep across all 10 READMEs: ripgrep for `🔧 Template Configure|🔧 UIS Template Install|Configuration complete|Stack installed` in `templates/` and `uis-stack-templates/` → **zero matches** outside the database template. First-pass awk-based grep showed false positives in directory-tree listings (`├── src/`, `└── Dockerfile`) across 9 READMEs — legitimate structural content, stays.
- [x] 8.3 No other README has a stale terminal-output mock — nothing else to remove.
- [x] 8.4 `validate-docs.sh` passes; no broken internal links after the 192-line removal.
- [x] 8.5 PR #59 merged via `--rebase --delete-branch` as `93d9eb2`. Diff: -192 / +4.

### Phase 9: Contributor docs + close-out

**Scope**: document the new `configure_command` field and mention that Expected output is now auto-generated. Move this plan and the investigation to `completed/`.

- [x] 9.1 `template-metadata.md` gained a `configure_command` row in the fields table plus a new sub-section "When to set it and what to put in it" with a per-archetype table and rationale (single source of truth for three downstream consumers).
- [x] 9.2 `readme-structure.md` updated: the "auto-generated Configure section" section now documents the template-info.yaml dropdown, the Expected output dropdown, the Install sub-section for stacks, and an explicit "do not write a hand-authored Expected output mock in the README" warning. The card-adaptation table gained the stack row.
- [x] 9.3 Plan moved from `active/` to `completed/`
- [x] 9.4 Investigation moved from `backlog/` to `completed/`
- [x] 9.5 Cross-references verified via `validate-docs.sh`
- [x] 9.6 Full pre-push pipeline + commit + PR + merge

---

## Acceptance criteria

The plan is complete when all of the following are true:

1. **④ numbering bug fixed** — every template page with 4 visible sub-sections shows ① ② ③ ④ in order
2. **`configure_command` field wired** — no hardcoded `dev-template configure` or `dev-template-configure` (with hyphen) strings anywhere in the codebase outside of `configure_command` values in template-info.yaml files
3. **Configure sub-section intro rewritten** — the paragraph describes what configuring does, not just "This template uses X"
4. **template-info.yaml dropdown renders** on every non-overlay template page with a Configure sub-section
5. **Expected output dropdown renders** on E1 and E3 template pages with content that matches what real DCT prints at runtime
6. **Hand-written Expected output blocks removed** from all READMEs where the generator now produces the equivalent
7. **Unit tests green** — `build-expected-output.test.ts` and `build-architecture-mermaid.test.ts` both pass
8. **Full pre-push pipeline green** after each phase and at close-out
9. **Visual review signed off** across all 10 templates

---

## Risks and watch-outs

- **Expected output format drift**: the generator mimics DCT runtime output. When DCT updates its output format, our mock will drift silently. Mitigation: the `"last verified against DCT vX.Y on YYYY-MM-DD"` header comment makes drift discoverable during future audits (Q2 decision).
- **Service-ports.ts becoming permanent**: the stopgap file is easy to forget. Mitigation: the file header's deletion checklist names the concrete condition ("delete when UIS ships `inClusterPort` on services.json") and references the UIS investigation.
- **Dropdown content overwhelming the page**: two new `<details>` blocks per Configure sub-section. Both are closed by default, so no default-view impact, but a reviewer may find the expanded state cluttered. Mitigation: the visual review in Phase 7 is the decision gate; if one dropdown feels excessive, we can drop it.
- **Template-info.yaml dropdown may expose sensitive defaults**: the raw file is shown verbatim. Confirm no secrets, tokens, or private URLs are present in any template-info.yaml before Phase 4 ships. Current templates are all public-sample, so this is a latent risk only.
- **Hand-written README cleanup misses edge cases**: a README block may be similar-looking but serve a different purpose (e.g., showing command output for a different feature). Mitigation: Phase 8 re-greps and reviews each match case-by-case rather than batch-deleting.

---

## Open Questions

**None — all Q1–Q6 from the upstream investigation are resolved.** See the [investigation's Decisions made section](INVESTIGATE-environment-card-improvements.md#decisions-made-locked-in) for the full list.

---

## Next Steps

- [ ] User approves this plan and moves it from `backlog/` to `active/`
- [ ] Execute Phase 1 (smallest, lowest-risk — two-line component fix)
- [ ] Proceed through phases in order, one at a time
- [ ] Each phase ships as its own PR with its own validation gate
- [ ] After Phase 9, the plan and investigation both live in `completed/` and the work is done
