# Investigate: Environment Card Improvements

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Decided — ready for plan (2026-04-13)

**Goal**: Determine the right scope, design, and implementation approach for four improvements to the Environment card on per-template documentation pages: fix the ④ numbering bug, decouple the configure command from hardcoded text, rewrite the Configure sub-section intro, and auto-generate the "Expected output" sample block from registry data.

**Last Updated**: 2026-04-13

**Related**:
- [INVESTIGATE-uis-in-cluster-port.md](./INVESTIGATE-uis-in-cluster-port.md) — addresses the in-cluster port data gap that this work depends on (uses a stopgap until UIS ships the field)

---

## Background

The Environment card is rendered by `<TemplateEnvironment>` on every non-overlay template page. It currently has 3–4 numbered sub-sections:

```
ENVIRONMENT
① What gets set up   (tools + services + init SQL)
② Configure          (only when services are required)
③ Setup              (when quickstart.setup has commands)
④ Run the Flask app  (always — but no number rendered, see Problem 1)
```

Several issues surfaced during visual review of the deployed site (`tmp.sovereignsky.no`) and discussion of the architecture diagram v2 work:

1. The ④ Run heading is missing its number prefix
2. Multiple places in the codebase hardcode `dev-template configure` (or its incorrect `dev-template-configure` variant) instead of reading from a single source
3. The Configure sub-section's intro text ("This template uses PostgreSQL") is a label, not an explanation of what configuring *does*
4. The "Expected output from `dev-template configure`" block is a 94-line hand-written mock in `README-python-basic-webserver-database.md`, even though every value in it is derivable from registry data

This investigation captures the design decisions for fixing each of these. A downstream `PLAN-environment-card-improvements.md` will be created once all open questions are resolved.

---

## Problem 1: ④ numbering bug

### Current state

`TemplateEnvironment/index.tsx` has:

```ts
const sectionsShown = [hasWhatGetsSetUp, showConfigure, showRun].filter(Boolean).length;
const showNumbers = sectionsShown > 1;
let n = 0;
const nextNumber = () => {
  if (!showNumbers) return null;
  n += 1;
  const symbols = ['①', '②', '③'];
  return <span className={styles.number}>{symbols[n - 1]}</span>;
};
```

### Why it broke

The earlier quickstart split (PR #31) introduced a **separate** `Setup` sub-section above the `Run` sub-section. Both call `nextNumber()`. When all four sub-sections render (What gets set up + Configure + Setup + Run), `nextNumber()` is called four times, but `symbols` only has three entries — the fourth call reads `symbols[3]` → `undefined` → no number prefix on the Run heading.

Also, `sectionsShown` is computed from `[hasWhatGetsSetUp, showConfigure, showRun]` — three booleans. The Setup sub-section's existence is implicit in `showRun && quickstart.setup.length > 0`, so it's not counted, which means `showNumbers` may be false when it should be true in some edge cases.

### Decision

**Add ④ to the symbol array and count the Setup sub-section separately.**

```ts
const setupVisible = showRun && (quickstart?.setup?.length ?? 0) > 0;
const sectionsShown = [hasWhatGetsSetUp, showConfigure, setupVisible, showRun].filter(Boolean).length;
...
const symbols = ['①', '②', '③', '④'];
```

Two-line change, zero schema impact, no architectural debate.

---

## Problem 2: `configure_command` is hardcoded in multiple places

### Current state

Three places in the codebase assume the configure command:

1. **`build-architecture-mermaid.ts`** — hardcodes `Dev->>DCT: dev-template configure` in the app sequence diagram and `Dev->>DCT: uis template install ${entry.id}` in the stack sequence diagram (branch on `install_type`)
2. **`<TemplateEnvironment>`** — hardcodes `<code>dev-template-configure</code>` (with a **hyphen** — wrong form) inside the Configure sub-section
3. **Planned expected-output generator** — would need to switch on `install_type` to pick the right command form

The hyphen vs space inconsistency (`dev-template-configure` vs `dev-template configure`) appears in 7+ places across the codebase and was identified during an earlier text audit. The rendered Configure sub-section currently shows the wrong form (`dev-template-configure`) on every template page.

### Options

#### Option A: Add a top-level `configure_command: string` field

```yaml
# python-basic-webserver-database
configure_command: "dev-template configure"

# postgresql-demo (stack)
configure_command: "uis template install postgresql-demo"

# python-basic-webserver (no configure step)
# field omitted
```

**Pros**: each template explicitly declares its own command; eliminates hardcoded branching on `install_type`; resolves the hyphen/space inconsistency at the per-template authoritative level.
**Cons**: one new yaml field per relevant template (~2 templates today).

#### Option B: Hardcode but centralize in one constants file

`scripts/lib/configure-commands.ts` exports `getConfigureCommand(install_type, entry)` that returns the right string. Component reads from the constant.

**Pros**: no yaml changes.
**Cons**: still hardcodes the assumption that "app templates use dev-template configure"; doesn't let templates override; doesn't fix the per-template authority concern.

#### Option C: Leave it hardcoded but fix the hyphen bug only

Just change `dev-template-configure` → `dev-template configure` in the component and rendered docs. No new field.

**Pros**: smallest change.
**Cons**: doesn't fix the underlying coupling between the component, the architecture builder, and the eventual expected-output generator.

### Decision

**Option A — `configure_command: string` (top-level, snake_case, optional).**

Decided 2026-04-13. Rationale: matches the project's per-template authority pattern (the same reason `quickstart.run` exists). Fixes the hyphen bug as a side effect (each template authoritatively declares the right form).

### Field naming rationale

| Candidate | Verdict |
|---|---|
| `configure: "dev-template configure"` | Too ambiguous — reads like a boolean or block, not a command string |
| **`configure_command: "dev-template configure"`** | ✅ Clear, explicit, snake_case matches `install_type` style at top level |
| `configureCommand` | Wrong case — top-level fields use snake_case, camelCase is for nested/resolved blocks |
| `setup_command` | Conflicts with `quickstart.setup` (install dependencies) |
| `provision_command` | Accurate but unfamiliar terminology |
| `configure: { command, note }` block | Over-engineered for one value; promote later if needed |

---

## Problem 3: Configure sub-section intro text + template-info.yaml dropdown

### Current state

The Configure sub-section currently renders:

```
② Configure

This template uses **PostgreSQL**.

Then run:
  dev-template-configure       (with hyphen, wrong form)
```

Two issues:

1. **"This template uses PostgreSQL"** is a label, not an explanation. It doesn't tell the developer what configuring *does* (provisions services, writes .env, creates K8s Secret).
2. **No template-info.yaml context** — developers can't see what they might want to edit without opening the template's source. The init-SQL pattern (collapsible `<details>` with the file content) works well; the same pattern should apply to template-info.yaml.

### Options for the intro text

#### Option A (chosen): Keep "Configure" as the heading, rewrite the intro

```
② Configure

Set up and configure the backend services this template needs.
Creates a per-app database, wires credentials into a local `.env` file,
and stores a Kubernetes Secret in your cluster for the deployed pod.

Uses: **PostgreSQL**

[▶ template-info.yaml — edit to change defaults]

Then run:
  dev-template configure
```

**Pros**: short numbered heading stays consistent with other sub-sections; intro sentence describes what configuring does; matches the init-SQL dropdown pattern.

#### Option B: Action-led heading

```
② Set up and configure backend services
```

**Cons**: longer heading wraps awkwardly on narrow screens; inconsistent with other sub-sections that use short labels.

#### Option C: Two-line heading (title + subtitle)

```
② Configure
   Set up backend services and write credentials to .env
```

**Cons**: needs new subtitle CSS; breaks visual consistency with other sub-sections.

### Decision (intro)

**Option A.** Decided 2026-04-13.

### Options for the dropdown content

| Content shown in dropdown | Pros | Cons |
|---|---|---|
| **Full template-info.yaml** | Complete context; mirrors init-SQL pattern (show whole file) | Longer (~40–80 lines per template) |
| Just the `params:` block | Targeted to what users edit | Hides other fields the author might want shown |
| Curated subset (params + configure_command + requires) | Shows the decision surface | Arbitrary; feels editorial |

### Decision (dropdown content)

**Show the full raw template-info.yaml.** Decided 2026-04-13. Mirrors the init-SQL pattern. Closed by default — doesn't dominate the page.

### Implementation note

Requires a new registry field `templateInfoYaml: string` storing the raw file content (read via `readFileSync` before `yaml.load` parses it). The component receives it as a prop and renders inside `<details><summary>template-info.yaml — edit to change defaults</summary><pre><code>...</code></pre></details>`.

---

## Problem 4: Expected output is hand-written README prose

### Current state

`README-python-basic-webserver-database.md` has a `#### Expected output` section (~94 lines, lines 106–200) showing what `dev-template configure` prints when you run it. It's a hand-written mock with template-specific values inline (`my-cool-app`, `my_cool_app_db`, etc.).

Only one template has this block today. Other templates would need similar blocks if hand-authored.

### Why it can be auto-generated

A field-by-field audit shows every value in the block is derivable from registry data:

| Section | Source |
|---|---|
| Banner, UIS bridge check | Static |
| Git identity | `params.app_name` (placeholder for the real repo name detected at runtime) |
| template-info.yaml read | `entry.id`, `entry.install_type` |
| Parameters | `entry.params` |
| Service config (postgresql, namespace, secret) | `resolvedServices[0]`, `manifest.envVar`, `manifest.secretName` |
| Init file size | `resolvedInitFiles[path]` content length + line count |
| UIS command (literal) | All args from registry data |
| .env write line | `manifest.envVar`, `service.id`, `database`, `exposePort` |
| K8s Secret info | `manifest.secretName`, `manifest.envVar` |
| Port-forward ASCII art | Static format with `exposePort`, `namespace`, in-cluster port |
| Footer | Service count from `resolvedServices.length` |
| Next steps | `service.id`, `service.database`, `manifest.secretName`, `quickstart.run` |

### Decision

**Auto-generate the block.** Decided 2026-04-13. Lives as `scripts/lib/build-expected-output.ts` (separate from the mermaid builder — different concern).

### Where it renders

Inside the Configure sub-section, as a collapsible `<details>` element matching the init-SQL pattern (and the new template-info.yaml dropdown from Problem 3). Closed by default; expand to see a sample run.

### Per-archetype rendering

| Archetype | Expected output? |
|---|---|
| **E1** (app + services + manifest) | ✅ Generated |
| **E2** (app + manifest, no services) | null — no configure flow |
| **E3** (stack template) | **OPEN — see Q3** |
| **E4** (overlay) | null |

### In-cluster port dependency

The mock includes lines like:

```
postgresql.default.svc.cluster.local:5432
```

The in-cluster port (`5432` for postgres) is not currently surfaced anywhere in our data. A separate investigation [INVESTIGATE-uis-in-cluster-port.md](./INVESTIGATE-uis-in-cluster-port.md) addresses this. **Decision**: introduce a stopgap file `scripts/lib/service-ports.ts` with `{postgresql: 5432, redis: 6379, ...}`, used by both the expected-output generator and the existing architecture diagram builder (which currently hardcodes 5432). When UIS ships `inClusterPort` on `services.json`, delete the stopgap file.

---

## Open Questions

These need decisions before the downstream PLAN can be written.

### Q1. Git repo placeholder text in the mock output

Real DCT detects the git repo at runtime and prints something like `yourorg/my-cool-app`. In the auto-generated mock, what should we substitute?

- **A**: `yourorg/<params.app_name>` (e.g., `yourorg/my-app`) — concrete, reads like a real example
- **B**: `<your-org>/<your-repo>` — explicit placeholders, clearly a sample
- **C**: `your-github-user/<params.app_name>` — hybrid

**Recommendation**: Option A — concrete examples are easier to read than angle-bracket placeholders.

**Decision**: Option A — `yourorg/<params.app_name>`. Decided 2026-04-13.

### Q2. Output-format drift policy

The mock mimics real DCT runtime output (emojis, banners, exact wording). When real DCT updates its output format, our mock will drift.

- **A**: Accept the drift, update the generator when noticed
- **B**: Add a "last verified against DCT vX.Y" note in the generator file header so a future maintainer knows when to re-check

**Recommendation**: Option B — a one-line comment costs nothing and prevents long-term drift becoming silently wrong.

**Decision**: Option B — add a "last verified against DCT vX.Y on YYYY-MM-DD" note in the `build-expected-output.ts` file header. Decided 2026-04-13.

### Q3. E3 (stack template) expected output

`postgresql-demo` is a stack template. Its configure flow is `uis template install postgresql-demo`, not `dev-template configure`. Different command, different output format.

- **A**: Defer — stacks return null; only E1 templates get expected output for now. `postgresql-demo`'s page has no expected-output dropdown.
- **B**: Do both formats in one go — adds ~60 lines of code for a different format template, but ships a complete experience for the one stack template that exists today.

**Recommendation**: Option B — only one stack template exists, doing both now means no visible gap on `postgresql-demo`'s page.

**Decision**: Option B — generate expected output for both E1 (app + services + manifest) and E3 (stack template) in the same plan. Two format templates inside `build-expected-output.ts`: one for `dev-template configure` flow, one for `uis template install` flow. Decided 2026-04-13.

### Q4. README cleanup scope

I confirmed only `python-basic-webserver-database` has an `#### Expected output` block. But other templates might have similar hand-written mock output under different headings.

- **A**: Only remove the one confirmed block in `python-basic-webserver-database`
- **B**: Re-grep all 10 READMEs for similar mock blocks (any pre/code block that looks like terminal output) before the cleanup phase

**Recommendation**: Option B — quick check (one grep), avoids leaving stale duplicates.

**Decision**: Option B — re-grep all 10 READMEs for similar mock blocks (terminal-output-style fenced code blocks) before the cleanup phase. Remove anything that the new generator now produces. Decided 2026-04-13.

### Q5. Maintainers field per-template review

The earlier schema plan added `maintainers: [terchris]` uniformly to all 10 templates. Some templates may have had a different author historically.

- **A**: Leave uniformly as `terchris`
- **B**: Review git log for each template to confirm the original author and adjust

**Recommendation**: Option A for now — `terchris` is the active maintainer; historical authorship is captured in git. Adjust per template only when a non-terchris contributor specifically asks to be listed.

**Decision**: Option A — leave `maintainers: [terchris]` uniformly. Per-template review is out of scope. Decided 2026-04-13.

### Q6. Should the new dropdowns share a CSS class with init-SQL?

Both new dropdowns (template-info.yaml and expected-output) are `<details>` elements with similar content (a code block). Init-SQL already uses `<details>`. Two options:

- **A**: One shared `.detailsBlock` class used by all three
- **B**: Per-purpose classes (`.initFile`, `.templateInfoYaml`, `.expectedOutput`) for future independent styling

**Recommendation**: Option A — visual consistency is the goal; if one ever needs to look different, refactor then.

**Decision**: Option A — one shared `.detailsBlock` (or similar) CSS class used by init-SQL, template-info.yaml dropdown, and expected-output dropdown. Decided 2026-04-13.

---

## Decisions made (locked in)

**Core problem decisions:**
- [x] **P1**: Add ④ to symbol array, count Setup sub-section in `sectionsShown`
- [x] **P2 — Field name**: `configure_command` (snake_case, top-level, optional string)
- [x] **P2 — Source of truth**: each template declares its own command; component, architecture builder, and expected-output generator all read from the field
- [x] **P3 — Intro rewrite**: Option A (keep "Configure" heading, two-paragraph action-oriented intro)
- [x] **P3 — Dropdown content**: full raw template-info.yaml, closed by default, matching init-SQL pattern
- [x] **P3 — New registry field**: `templateInfoYaml: string` (raw file content)
- [x] **P4 — Expected output**: auto-generate from registry data, render as `<details>` inside the Configure sub-section
- [x] **P4 — In-cluster port stopgap**: `scripts/lib/service-ports.ts` until UIS ships `inClusterPort`

**Open question resolutions (decided 2026-04-13):**
- [x] **Q1 — Git repo placeholder**: Option A — `yourorg/<params.app_name>` (concrete example, easier to read than angle-bracket placeholders)
- [x] **Q2 — Drift policy**: Option B — add a "last verified against DCT vX.Y on YYYY-MM-DD" note in the generator file header
- [x] **Q3 — E3 stack expected output**: Option B — generate for both E1 (`dev-template configure` flow) and E3 (`uis template install` flow) in the same plan. Two format templates inside `build-expected-output.ts`.
- [x] **Q4 — README cleanup scope**: Option B — re-grep all 10 READMEs for similar mock blocks before the cleanup phase, remove anything the new generator now produces
- [x] **Q5 — Maintainers field**: Option A — leave uniformly as `terchris`, per-template review out of scope
- [x] **Q6 — Dropdown CSS**: Option A — one shared `.detailsBlock` class for init-SQL, template-info.yaml, and expected-output dropdowns

---

## Recommendation Summary

After all open questions are resolved, the downstream `PLAN-environment-card-improvements.md` should have these phases (per the "small phases" best practice — each independently shippable with its own validation gate):

| Phase | Scope | Independently shippable? |
|---|---|---|
| 1 | Fix ④ numbering bug | ✅ |
| 2 | Add `configure_command` field, eliminate hardcoding, fix hyphen bug | ✅ |
| 3 | Rewrite Configure sub-section intro text | ✅ (depends on 2 for the command line) |
| 4 | Add template-info.yaml dropdown | ✅ |
| 5 | Build the expected-output generator + service-ports stopgap | ✅ |
| 6 | Wire expected-output into registry + component | ✅ |
| 7 | Unit tests for expected-output | ✅ |
| 8 | Remove hardcoded "Expected output" from README(s) | ✅ |
| 9 | Contributor docs update + move plan to completed | ✅ |

Phase ordering: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9. Phases 1–4 are pure component/yaml/generator changes for the Configure sub-section. Phases 5–7 build the expected-output generator on top. Phase 8 removes the now-duplicate README block. Phase 9 closes out.

---

## Next Steps

- [x] User answers Q1–Q6 — all six resolved 2026-04-13
- [ ] Draft `PLAN-environment-card-improvements.md` in `backlog/` based on the locked decisions and the 9-phase structure above
- [ ] Implementation moves the plan to `active/` per WORKFLOW.md
- [ ] After the plan ships, move both this investigation and the plan to `completed/`
