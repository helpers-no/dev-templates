# Investigate: Housekeeping — Docusaurus upgrade and clearing open PRs

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: In Progress

**Goal**: Decide how to clear the backlog of open Dependabot PRs and security alerts, primarily by upgrading Docusaurus from 3.9.2 to 3.10.0 (which should resolve most npm transitive vulnerabilities). Determine what to do with template-side dependency updates that the upgrade won't address.

**Last Updated**: 2026-04-13

---

## Background

Two unrelated housekeeping signals have been visible in CI output for weeks:

1. **Docusaurus update banner** prints on every `npm run build`:
   > Update available 3.9.2 → 3.10.0
2. **Dependabot vulnerability count** prints on every `git push`:
   > GitHub found 15 vulnerabilities on helpers-no/dev-templates's default branch (5 high, 7 moderate, 3 low).

There are also **4 open Dependabot PRs** sitting in the queue, all targeting template-side dependency files (not the website). They've been open between 2 and 5 months.

Before starting any new feature work (the upcoming environment-card improvements plan, the expected-output generator), this housekeeping should be addressed so we're not building on a stale stack with known vulnerabilities.

---

## Current State

### Docusaurus version

`website/package.json` pins:

```json
"@docusaurus/core": "3.9.2",
"@docusaurus/preset-classic": "3.9.2",
"@docusaurus/theme-mermaid": "^3.9.2",
"@docusaurus/module-type-aliases": "3.9.2",
"@docusaurus/tsconfig": "3.9.2",
"@docusaurus/types": "3.9.2",
"@mdx-js/react": "^3.0.0",
"prism-react-renderer": "^2.3.0",
"react": "^19.0.0",
"react-dom": "^19.0.0"
```

Docusaurus 3.10.0 is available. Latest in the 3.x line as of 2026-04-13.

### Open Dependabot PRs (4)

All 4 are template-side dependency bumps from `app/dependabot[bot]`:

| # | Created | Template | Bump |
|---|---|---|---|
| #7 | 2026-02-20 | `templates/python-basic-webserver` | `flask 2.3.3 → 3.1.3` |
| #4 | 2026-02-14 | `templates/typescript-basic-webserver` | `qs 6.14.0 → 6.14.2` |
| #2 | 2025-12-01 | `templates/typescript-basic-webserver` | `express 5.1.0 → 5.2.0` |
| #1 | 2025-11-25 | `templates/typescript-basic-webserver` | `body-parser 2.2.0 → 2.2.1` |

These touch template source files (e.g., `templates/python-basic-webserver/requirements.txt`, `templates/typescript-basic-webserver/package.json`), not the website's `package.json`. They will NOT be cleared by upgrading Docusaurus.

### Open Dependabot security alerts (15)

Categorized by ecosystem and severity (verified via `gh api repos/helpers-no/dev-templates/dependabot/alerts`):

**npm — likely transitive from Docusaurus / build chain (8 alerts):**

| Severity | Package | Summary |
|---|---|---|
| high | `lodash` | Code injection via `_.template` imports key names |
| medium | `lodash` | Prototype pollution via array path bypass in `_.unset` |
| high | `lodash-es` | Code injection via `_.template` imports key names |
| medium | `lodash-es` | Prototype pollution via array path bypass |
| high | `serialize-javascript` | RCE via `RegExp.flags` and `Date.prototype.to*` |
| medium | `serialize-javascript` | CPU exhaustion DoS via crafted array-like |
| medium | `picomatch` | Method injection in POSIX character classes |
| high | `path-to-regexp` | DoS via sequential optional groups |
| medium | `path-to-regexp` | ReDoS via multiple wildcards |
| high | `minimatch` | ReDoS via combinatorial backtracking |

These packages are all common transitive deps in Docusaurus / webpack / mdx tooling. **Most of these should be cleared by upgrading to Docusaurus 3.10.0** which has updated dependency trees. Verify after upgrade.

**npm — template-side, npm packages used by templates (4 alerts):**

| Severity | Package | Used in template | Tracked by PR? |
|---|---|---|---|
| medium | `qs` | typescript-basic-webserver | yes — PR #4 |
| low | `qs` | typescript-basic-webserver | yes — PR #4 |
| medium | `body-parser` | typescript-basic-webserver | yes — PR #1 |

These match the open Dependabot PRs and would be resolved by merging them.

**pip — template-side, Python packages used by templates (2 alerts, both same advisory):**

| Severity | Package | Used in template | Tracked by PR? |
|---|---|---|---|
| low | `flask` | python-basic-webserver | yes — PR #7 (different advisory but same package upgrade resolves both) |
| low | `flask` | python-basic-webserver-database | partially — PR #7 only covers one template |

The flask alert hits two templates but only one PR exists.

### Total alert breakdown

15 alerts:
- 5 high (lodash, lodash-es, serialize-javascript, path-to-regexp, minimatch — all npm transitive)
- 7 medium (lodash, lodash-es, serialize-javascript, picomatch, path-to-regexp — npm transitive; qs, body-parser — template-side)
- 3 low (qs — template-side, flask × 2 — template-side)

**~10 of 15 are npm transitive** (likely cleared by Docusaurus upgrade)
**~5 of 15 are template-side** (need separate decisions)

---

## Docusaurus 3.10.0 — what changes

From the [3.10.0 release notes](https://github.com/facebook/docusaurus/releases/tag/v3.10.0):

### Breaking changes

- **`future.v4.mdx1CompatDisabledByDefault`**: stricter MDX parsing becomes the default behavior under the v4 future flag. Existing MDX files that relied on MDX 1 compat behavior may need adjustment.
- **TypeScript 6.0 compatibility fixes** — may affect projects on older TS versions.

### New features

- **"Docusaurus Faster" bundler** stable, enabled by default with v4 future flag (Rspack-based, faster builds)
- **`future.v4.siteStorageNamespacing`** flag for site storage isolation
- **Custom HTML elements in head tags** support
- `write-heading-ids` CLI gains `--syntax` and `--migrate` options
- Improved `<DocCard>` extensibility, emoji icon handling
- Pages plugin supports Markdown file path links
- Admonitions directive gains class/id shortcuts
- React context for `<Tabs>` enables custom `<TabItem>` components

### Bug fixes

- Node.js 24+ deprecation warnings in URL handling — fixed
- Yarn PnP improvements in Rspack bundler
- TypeScript 6.0 compatibility
- Code block Firefox text selection/copy bug
- Algolia search query string preservation

### Risk assessment for our project

| Concern | Risk |
|---|---|
| MDX strictness (breaking) | **Low–Medium** — we already use mostly clean MDX; the architecture diagram MDX hit one issue earlier (PR #33 needed ` ```text ` instead of plain ``` for a yaml code block), but that's already fixed. Worth running a full build to verify. |
| TypeScript 6.0 compat | **Low** — we're on whatever tsx ships with, no explicit TS pin |
| Faster bundler default | **Low** — opt-in via flag, default behavior unchanged unless we set the flag |
| Custom HTML in head | **None** — we don't use it |
| Tabs/DocCard changes | **None** — we use neither |

**Net risk**: low. Most likely to "just work" with `npm install` + a build. Worst case: one or two MDX files need a tiny fix.

---

## Options

### Option 1: Upgrade Docusaurus first, then triage remaining PRs/alerts

1. Bump all `@docusaurus/*` packages from 3.9.2 → 3.10.0 in `website/package.json`
2. Run `npm install`, fix any breakage from the MDX strictness change
3. Verify the build with `npm run build`
4. Push as a PR
5. After merge, re-check Dependabot alerts — most npm transitive ones should clear automatically
6. Decide what to do with the remaining ~5 template-side alerts (separate from this PR)
7. Decide what to do with the 4 open Dependabot PRs (separate from this PR)

**Pros**:
- Single biggest risk-reduction move (clears the most alerts in one shot)
- Decouples upgrade from template-side decisions (smaller PR, easier to revert if it breaks)
- Once main is on 3.10.0, future Dependabot updates target the new tree

**Cons**:
- Doesn't address template-side alerts immediately
- Template-side PRs continue to age in the queue

### Option 2: Merge the 4 Dependabot PRs first, then upgrade Docusaurus

1. Review each of PR #1, #2, #4, #7 — verify the version bumps don't break the templates
2. Merge them one by one (or batch them if compatible)
3. Then do the Docusaurus upgrade as a separate PR

**Pros**:
- Clears the visible PR queue first
- Demonstrates that Dependabot PRs aren't being ignored

**Cons**:
- Each PR needs individual review (does flask 3.x break the example app? does express 5.2 work?)
- Templates may have intentionally pinned versions for reproducibility — bumping could change behavior
- Doesn't address the bigger npm vulnerability set (those are in Docusaurus deps, not templates)

### Option 3: Do everything in one big PR

Upgrade Docusaurus, merge all template Dependabot PRs (or rebase their changes onto a single branch), and address all alerts in one push.

**Pros**: Single PR, single review, single CI run.
**Cons**: Hard to review (mixes website and 2 different language templates), hard to revert if any one piece breaks, merges different concerns.

### Option 4: Close-and-forget for templates that intentionally pin versions

For each template Dependabot PR, decide whether the template is meant to be a moving example (always-current deps — merge) or a reproducible example (pinned versions — close the PR with a comment explaining why).

**Pros**: Honest about template philosophy; stops Dependabot from re-opening dismissed PRs.
**Cons**: Need a per-template policy; overlaps with Options 1 and 2.

---

## Recommendation

**Option 1 first, then Option 4 for the templates.**

Reasoning:

- The Docusaurus upgrade is the highest-leverage single change. It likely clears 10 of 15 alerts and 5 of 5 high-severity ones. Doing it first means everything else can be triaged against a clean baseline.
- After the upgrade, the remaining ~5 alerts are all template-side. Each template has a different philosophy (some are "the latest tech, hot off the press" examples, some are "stable, reproducible" examples). Per-template decisions are appropriate.
- Doing all template work as a separate batch (Option 4) avoids tangling website concerns with template concerns and keeps each PR small and reviewable.

### Concrete sequencing

1. **PR A**: Docusaurus 3.9.2 → 3.10.0 — single concern, single PR. Estimate: small. Risk: low.
2. **Wait for PR A to land**, re-check Dependabot alerts. Confirm npm transitive alerts cleared.
3. **PR B**: per-template decisions on the 4 open Dependabot PRs — could be one PR that addresses all 4 with a brief rationale per template, or 4 small PRs (one per template Dependabot PR). Estimate: small per template. Risk: per template, could break the example app.
4. **PR C** (optional): for any remaining template-side alerts not covered by the open Dependabot PRs (e.g., the second flask advisory hitting `python-basic-webserver-database`), file a fresh Dependabot config or manual bump.

---

## Open Questions

### Q1. Should template Dependabot PRs be merged automatically going forward, or always reviewed?

Templates are example projects. Merging Dependabot PRs automatically means the example tracks upstream changes, but a breaking change in flask 4.0 could break the template's example app silently.

- **A**: Auto-merge dependabot for templates with passing CI
- **B**: Manual review of every template Dependabot PR — current de-facto behavior
- **C**: Auto-merge patch versions only, manual for minor/major

**Recommendation**: Option C — auto-merge patches, manual for minor/major. Patches are usually safe; minor/major can change behavior.

### Q2. Are there templates that should intentionally pin old versions?

Some templates may be educational ("here's how express 5.0 worked when it was new") and shouldn't auto-upgrade. Others may want to track latest.

- **A**: All templates always track latest (merge all bumps)
- **B**: Add a per-template policy field (`dependency_policy: latest | pinned`) to template-info.yaml
- **C**: Document per-template intent in the template's README

**Recommendation**: Option A for now. None of the current templates declare a pinning intent. If one ever does, add Option B as a future schema field.

### Q3. Should we upgrade React from 19.0 → 19.x.latest at the same time?

`package.json` has `"react": "^19.0.0"` — caret means npm install picks the latest 19.x. Already on latest minor. No action needed unless we want to pin.

### Q4. Should we adopt the new Docusaurus "Faster" bundler (Rspack)?

3.10.0 makes Faster stable behind the v4 future flag. Faster local builds, faster CI runs. But it's a future flag, so it's still opt-in.

- **A**: Adopt now in this upgrade PR (one extra config line)
- **B**: Adopt as a separate follow-up PR after the basic upgrade is verified
- **C**: Defer until v4 ships

**Recommendation**: Option B — separate the upgrade from the bundler swap. Smaller PRs, easier to attribute any regression.

### Q5. Should we also upgrade non-Docusaurus deps (mdx, prism, etc.)?

`@mdx-js/react`, `prism-react-renderer`, `clsx`, etc. are also pinned. They're not blocking anything but could be bumped.

- **A**: Bump everything in one PR
- **B**: Only bump Docusaurus, leave others
- **C**: Bump only what has security alerts

**Recommendation**: Option B for this housekeeping pass. Smaller scope, easier to attribute breakage.

### Q6. What's our policy on the 14 "Update available" warnings printed by `npm install` (deprecation warnings, etc.)?

Are those even visible? Worth a separate audit?

**Recommendation**: Defer — not blocking, not security, not user-visible. Address if/when it bites.

---

## Decisions made (locked in)

- [x] **Approach**: Option 1 first (Docusaurus upgrade), then Option 4 (per-template Dependabot triage)
- [x] **Sequencing**: PR A (upgrade) → re-check alerts → PR B (template Dependabot triage)
- [ ] (Q1–Q6 still pending)

---

## Recommendation Summary

Two follow-up plans from this investigation, in order:

| Plan | Scope | Estimate |
|---|---|---|
| **PLAN-docusaurus-upgrade.md** | Bump @docusaurus/* from 3.9.2 → 3.10.0 in `website/package.json`, run `npm install`, fix any MDX strictness breakage, verify build, ship as one PR | Small (1–3 hours) |
| **PLAN-template-dependabot-triage.md** | Per-template review of the 4 open Dependabot PRs (#1, #2, #4, #7), decide merge / close / custom for each, also address the second flask advisory hitting `python-basic-webserver-database`. | Small to medium |

Both are independently shippable and unrelated to any in-progress feature work. Neither blocks the upcoming `PLAN-environment-card-improvements.md`.

---

## Next Steps

- [ ] User answers Q1–Q6 (or accepts recommendations)
- [ ] Draft `PLAN-docusaurus-upgrade.md` from this investigation
- [ ] Implement the Docusaurus upgrade plan
- [ ] Re-check Dependabot alerts after merge
- [ ] Draft `PLAN-template-dependabot-triage.md` based on the post-upgrade alert state
- [ ] Implement that plan
- [ ] Move this investigation to `completed/` once both downstream plans ship
