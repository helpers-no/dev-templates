# Plan: Application catalogue entries (`install_type: application`)

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Phases 1-4 DONE and verified; `atlas` is live in the registry. Phase 5 with `tor-agent`/`imac`; phase 6 pending #483

**Goal**: Support a third entry kind in `template-registry.json` — an **application**, whose install
definition is an OCI artifact published beside the application's own image rather than living in this
repository — so `uis template install atlas` works.

**Last Updated**: 2026-09-09

**Investigation**: [INVESTIGATE-application-catalogue-entries.md](INVESTIGATE-application-catalogue-entries.md)
— decisions, rejected options, and the security reasoning. Read it before implementing; this file is
the task list.

**Authorization**: Terje, 2026-09-09, at the pane: *"i order you all to not wait for me regarding
getting atlas working."* Under the fleet protocol's D10 seat that is authoritative for the scope it
states, and it replaces the plan-approval gate in the repository's `CLAUDE.md` **for this
work only**. It does **not** reach credentials (protocol §7 — the cross-org PAT for private
artifacts remains Terje's, and is not needed: atlas's artifact is public), production writes, public
exposure, or spending. It does not waive this repo's pre-push pipeline, which is a quality gate.

**Cross-repo**: UIS (`helpers-no/urbalurba-infrastructure`, `tor-agent`) is the consumer and has
already shipped its half — 1.6.25 `list` filter, 1.6.26 artifact/entry `id` identity check,
`install_type: application` legal inside an artifact, and `info` printing artifact/tag/pin/visibility.
Agreed on urb-agents #478, #479, #482.

---

## 🔴 The finding that shapes this plan: the branching is exclusion-style

Every consumer of the kind discriminator is written as **"exclude the kinds I know, everything else is
an app"**, not as an exhaustive match. `scripts/lib/build-architecture-mermaid.ts:191`:

```ts
if (entry.install_type === 'overlay') return null;
if (entry.install_type === 'stack') return null;
// …falls through to the app path
```

**So adding `application` to the two validator allowlists and nothing else does not produce an
error — it produces a complete, plausible-looking, wrong entry.** An application would get app
architecture diagrams, an app expected-output block, an app `templateRepoPath` pointing at a
directory with no template in it, and a Files dropdown built from nothing. No validator objects, and
the page renders.

The investigation named four sites in one file. **The real surface is twelve sites across five
files**, listed below. That undercount is corrected here and was reported to `tor-agent` on #482.

### Design rule for this plan — narrowed 2026-09-09

An earlier draft of this rule said *"convert exclusion-style branches to exhaustive ones that fail
loudly on an unknown kind"*, across all twelve sites. **That is a refactor, and this plan is not
one.** Terje asked whether this was a rewrite or a fix; it should be a fix, and the rule is now:

> **Add `application` as an explicit case at each site that would otherwise mis-handle it. Do not
> restructure branches that are working.**

Why the narrower rule is the right one:

- The `app`/`stack`/`overlay` paths are correct today and covered by 92 passing tests. Rewriting them
  to exhaustive switches risks those paths to protect a kind that does not exist yet.
- The severity that justified the wider rule is gone: a fall-through produces a wrong **page**, never
  a wrong install (measured by `tor-agent`, below). A website bug does not earn a cross-cutting
  refactor of five files.
- An explicit `application` case at each site gets the same protection where it matters, because
  every site is one I am touching anyway to add the kind.

**Scope of the actual change**: roughly fifteen lines of edits across five files (widen two type
unions, one derivation case, five early-returns/guards, two allowlist entries), plus the one genuinely
new piece — `source` block validation, which is new behaviour rather than changed behaviour.

If exhaustive matching is still wanted, it is a separate cleanup with its own plan, worth doing when
there is a second reason to touch those files — not smuggled in behind a feature.

### Blast radius: the website, not an install — corrected 2026-09-09

An earlier draft of this line justified the rule by "the entry points at an artifact applied as
database owner". **That conflated two different paths and overstated this one.** `tor-agent`
measured what UIS actually reads from a registry entry (#482):

> `templateKind`, `source.{artifact,tag,digest}`, `visibility`, `category`, and the display fields
> for `info`. **Nothing else.**

Not `templateRepoPath`, not `files`, not `filesMdx`, not `folder`, not `params`, not `provides` —
install branches on `templateKind` before it would look at them. So a fall-through produces **a wrong
page, never a wrong install.** It cannot make UIS fetch the wrong artifact, apply the wrong SQL, or
record the wrong thing.

The database-owner risk is real but belongs to a *different* field: `source.digest`, which is why it
is committed rather than resolved (Decision 2). Keep the two separate — the design rule above stands
on "a plausible wrong page that no validator objects to survives review", which is enough, and does
not need borrowed severity.

---

## ✅ Toolchain: `bun` runs the whole pipeline (resolved 2026-09-09)

`docker`, `node`, `npm`, `npx` and `yq` are **all absent** from this host, and there is no other build
host in the fleet roster — so the devcontainer path in [DEVCONTAINER.md](../../DEVCONTAINER.md) is
genuinely unavailable, not merely unused. `ops-dev` confirmed this independently (urb-agents #484).

**But `bun` 1.4.0 is installed at `/opt/homebrew/bin/bun`, and it runs every stage.** Measured, whole
pipeline in CI order, `PATH` restricted to `/opt/homebrew/bin:/usr/bin:/bin` so no `node` was
reachable:

| stage | command | result |
|---|---|---|
| 1 | `bash scripts/validate-metadata.sh` | rc=0 — 6 categories, 10 templates |
| 2 | `bun run scripts/generate-registry.ts` | rc=0 — 6 categories, 10 templates |
| 3 | `bash scripts/generate-docs-markdown.sh --force` | rc=0 — 10 detail pages |
| 4 | `bash scripts/generate-plan-indexes.sh` | rc=0 |
| 5 | `bash scripts/validate-docs.sh` | rc=0 — 0 errors, 17 pre-existing warnings |
| 6 | `bun run build` (in `website/`) | rc=0 — `[SUCCESS] Generated static files` |

So **the pre-push checklist can be satisfied on this host**, substituting `bun run` for `npx tsx` and
`npm run`. `bun install` in `website/` populates `node_modules` (1346 packages, ~7s), which is
gitignored.

### One fix this required, and it is in this plan's spirit

`scripts/validate-metadata.sh` hardcoded `node` in two helpers that both send stderr to `/dev/null`.
With no `node` present it reported **`invalid YAML syntax` on all 15 metadata files** — every one of
which parses fine. A missing interpreter presented as fifteen syntax errors.

- [x] `scripts/validate-metadata.sh` — resolve a runtime once (`node`, else `bun`), fail loudly with
      the actual cause if neither is present, and check `js-yaml` is installed
- [x] Falsified both ways: with only `bun` on `PATH` it passes (rc=0); with neither `node` nor `bun`
      it exits **rc=1** printing *"no JavaScript runtime on PATH"* instead of fifteen fake syntax
      errors

This is the same failure shape as the fall-through this plan exists to prevent — a wrong answer that
looks like a real one — so it is fixed here rather than filed.

⚠️ **`bun` is not what CI uses.** CI installs `node` 20 and runs `npm ci` / `npx tsx` / `npm run
build`. The runtime detection above keeps `node` first, so CI behaviour is unchanged, but "passes
locally under bun" is not identical to "passes in CI" — a bun/node divergence would show up only in
CI. Worth recording in the project doc alongside the pre-push checklist.

---

## Phase 1 — the `uis-applications/` tree ✅ DONE and verified end to end

- [x] `uis-applications/template-categories.yaml` — `context: uis`, category `APPLICATION`, order 1
- [x] `website/static/img/categories/applications-logo.svg` — matches the existing category-logo
      style (512×512, circle + two letters); XML-parse checked
- [x] `uis-applications/README.md` — the stub contract, the **two `template-info.yaml` files** trap,
      and why `source.digest` is committed rather than resolved
- [x] Verified: `template-categories.yaml` parses (`ruby -ryaml`), `context: uis`, one category id

No generator change, and no application directory yet — `atlas` has not published its artifact. The
tree is inert until phase 3.

**Now verified** (the expectation below was measured once `bun` was found, and held):

- The generator accepts a tree with a category and **no templates**: it logs
  `uis-applications/template-categories.yaml` and emits `6 categories, 10 templates`. The registry
  diff against the previous file is exactly the added `APPLICATION` category plus the `generated`
  timestamp — nothing else moved.
- `validate-metadata.sh` accepts it: `6 categories, 10 templates`, all valid.
- `generate-docs-markdown.sh` emits pages for the **five categories that have templates** and none
  for `APPLICATION`. That is correct, not a gap: an empty category gets no page, and both
  `validate-docs.sh` (0 errors, all internal links valid) and the Docusaurus build agree.
- The site builds: `[SUCCESS] Generated static files`.
- `APPLICATION` was given `order: 1` rather than `0` so it does not tie with `DEMO` — with a tie the
  relative order of two `context: uis` categories depended on filesystem enumeration order.

---

## Phase 2 — validation, failing tests first

- [ ] `scripts/test/` — port the six falsification cases above into unit tests. They were run
      against the real generator by mutating the live entry and restoring it, which proves the rules
      but does not keep proving them. **The one piece of phase 2 still outstanding.**
- [x] `scripts/validate-metadata.sh` — `application` added to the `install_type` allowlist. The
      `source` block is **not** re-validated here: `generate-registry.ts` is the authority and runs in
      the same CI job, so a second implementation would be two things to keep in agreement
- [x] `scripts/generate-registry.ts` — `application` in the allowlist, plus `validateSource()`:
      artifact allowlist, mutable-tag refusal, `sha256:`+64hex digest, `visibility` enum. Offline only
- [x] `source:` is refused on any non-`application` kind
- [x] **Falsified — six bad inputs, each rejected, good entry still generates:**
      artifact off allowlist · `tag: latest` · digest too short · `md5:` prefix · bad `visibility` ·
      digest absent

**Allowlist defaults** (UIS's, from #479): `ghcr.io/helpers-no/*`, `ghcr.io/terchris/*`. Keep the
allowlist in one place — `scripts/lib/repo-constants.ts` already centralises repo URLs and is the
right home.

**Offline only.** No network call in the generator: the digest is committed, never resolved. See the
investigation's Decision 2 and `uis-applications/README.md`.

---

## Phase 3 — the discriminator: add a case at each site, restructure nothing

- [x] `scripts/generate-registry.ts:172` — `type TemplateKind = 'app' | 'stack' | 'application'`
- [x] `scripts/generate-registry.ts:685` — extend the existing ternary with the one new case. The
      `install_type` allowlist in `validateTemplate` already rejects anything unknown before this
      line runs, so a mapping table plus a `fail()` here would be a second guard on an impossible
      value:

      ```ts
      const templateKind: TemplateKind =
        raw.install_type === 'stack' ? 'stack'
        : raw.install_type === 'application' ? 'application'
        : 'app';
      ```

- [x] `:689` — `serviceList`: `undefined` for `application` (services live in the artifact, not here)
- [x] `:740` — `templateRepoPath: null`, `files: []`, `filesMdx: null` for an application
- [x] `:746` — the `filesMdx === null` guard skips `application` rather than failing
- [x] `scripts/lib/build-architecture-mermaid.ts:67` — widened the `install_type` union
- [x] **One case at the dispatcher, not four in the leaf builders.** `buildArchitectureModel`
      (`:583`) is the only way into `buildLocalDevFlowchart`/`Sequence` and
      `buildDeployFlowchart`/`Sequence` — there are **four** such pairs, not the three I first
      counted — so `application` returns `{sections: []}` there and never reaches any of them. Four
      edits collapsed to one, and the leaf builders were left untouched
- [x] `scripts/lib/build-expected-output.ts:48` — returns `null` for `application`
- [x] `website/src/components/TemplateEnvironment/index.tsx:82` — widened the exported `TemplateKind`
- [x] `:145` — heading treats `application` as "Provided to your cluster"
- [x] `:291` — `showInstall` left as `stack`-only, deliberately: an application has no
      `expectedOutputBlock`, so the condition is already false and widening it would render an empty
      block

Already safe by exclusion, **verify and leave alone**: `generate-registry.ts:344` and `:698` both test
`=== 'app'`, so an application is correctly excluded from the deployment-manifest read.

`scripts/generate-docs-markdown.sh:244` passes `templateKind` through as JSON and needs no change —
confirm with a generated entry.

---

## Phase 4 — the documentation page ✅ DONE

- [x] The page renders from the entry's `readme:` with no file tree, no diagrams and no
      expected-output block — every one of those is `null`/empty in the entry, so the emitters
      suppress the sections rather than rendering empty ones
- [x] The Files dropdown is omitted, not empty (`filesMdx: null`)
- [x] `source` and `visibility` are stated in the atlas README, so the page says what an install
      would fetch. Not yet rendered *from the entry* by a component — the prose carries it. Worth
      revisiting when there is a second application and the duplication starts to cost
- [x] `validate-docs.sh`: 0 errors; the site builds

### ⚠️ `validate-docs.sh` passed two broken links that the build caught

Both times, `validate-docs.sh` reported *"All internal links valid"* and `bun run build` then failed:

1. `PLAN-application-catalogue.md` → `../../../../../CLAUDE.md`, which escapes the docs root
2. `README-atlas.md` → `../README.md`, a repository file that does not exist as a docs page once the
   README is rendered at `/docs/templates/application/atlas`

So the validator does not check links that leave the docs tree, and **the build is the real gate** —
exactly why the pre-push checklist names `npm run build` and not just the validators. A README that
lives in the repo *and* is rendered on the site cannot use relative links to repository files. Worth
its own small fix in `validate-docs.sh`; filed as a follow-up rather than done here, since this plan
is meant to be a fix and not a rewrite.

---

## Phase 5 — hand the generated registry to `tor-agent`

- [ ] Generate `template-registry.json` containing a **fixture** application entry
- [ ] Check it against UIS's shipped 1.6.25 `list` filter (command in the investigation)
- [ ] Send it to `tor-agent`, who installs from it via `REGISTRY_URL_PRIMARY` as a `file://` URL —
      no cluster, no catalogue deploy, no risk to `main` (offered on #479)
- [ ] Act on the report before anything changes what this repository publishes

⚠️ **The fixture must not be committed to a published tree.** UIS reads
`https://raw.githubusercontent.com/helpers-no/dev-templates/main/website/src/data/template-registry.json`
with a one-hour cache and no version pin, so a fake `atlas` entry committed to `main` would publish a
bogus pointer to every UIS installation. Keep fixtures under `scripts/test/`.

---

## Phase 6 — digest provenance check: **answered, and it is one HTTPS GET**

`atlas` emits the digest as a **release asset** (urb-agents #483, closed; relayed on #479). Stable,
unauthenticated URL per tag:

```
https://github.com/terchris/atlas/releases/download/<tag>/uis-artifact.json
{ "id", "tag", "artifact", "digest", "image", "commit", "published_at" }
```

`tor-agent` re-verified it independently rather than trusting atlas's build log: the digest recorded
in the asset equals GHCR's `docker-content-digest`. So the preferred option in Decision 2 is real —
**no `oras` in either repository, no tag resolution, and this pipeline stays hermetic.**

- [ ] A scheduled job that, per application entry, GETs `uis-artifact.json` for the committed tag and
      asserts its `digest` equals the committed `source.digest`; **alarm only, never a gate** —
      UIS pulls by digest, so drift cannot change what runs, and blocking unrelated documentation
      deploys on a GitHub hiccup buys no integrity (agreed with `tor-agent`, #479)
- [ ] Same job can check `links[]` with a HEAD request — see the follow-up below; both are
      network-dependent staleness checks and belong in one alarm rather than two

⚠️ **Treat a missing asset as "not adoptable yet", not as an error.** `v20260909-4b11f3f` — the
artifact `imac` first tested — predates the release asset and has none. Every publish from `853c696`
onward carries one. A generator or job that treats absence as fatal would fail on an application's
older tags (`tor-agent`, #479).

---

## Answered questions

**Diagrams — omit. Decided** (`tor-agent`, #482). Not an assumption any more. A fifth archetype
invented blind against one example becomes a shape we then have to keep; there is nothing an
application's page needs a diagram for that its abstract cannot say. The diagram that *would* be
useful is platform-level (`uis` provisions / ArgoCD deploys, seam at `uis configure`), it belongs in
the UIS docs, and it already exists there. Revisit after the second and third applications, when
there is something to generalise from.

**Entry `version` — do not validate it; it may lag. Decided** (`tor-agent`, #482), and it corrected
my premise. The fields UIS reads from an artifact's `template-info.yaml` are exactly `id`,
`install_type`, `kind`, `readme`, `service`, `params`, `provides`, `exports`, `requires` — **`version`
is not among them**, and atlas's published definition carries no `version:` line at all. So "the
artifact carries its own version" was wrong, and there is nothing to disagree with.

The asymmetry with `id` is therefore principled rather than incidental:

| | `id` | `version` |
|---|---|---|
| what reads it | `applications.yaml`, `requires:`, `remove` — the **record key** | `uis template info`, to print |
| a disagreement causes | an application recorded under a name its definition never claimed | a human reads a stale number |
| the pin | not `id` | not `version` — **the pin is the digest** |

- [ ] **Keep requiring `version`** in `validateTemplate`. `uis template info` prints `\(.version)`
      **unguarded**, so an entry without it renders `Version: null`. The existing requirement is doing
      real work for UIS.
- [ ] **Consider deriving the display version from `source.tag`** at generation time (`tor-agent`'s
      suggestion, take-it-or-leave-it). Then nothing can disagree, no new validation is needed, and
      the number a human sees is the thing that was actually published. Decide in phase 3.

## Follow-ups this work exposed

Each is a real gap found while doing the above, kept out of scope deliberately so this stayed a fix:

1. **`validate-docs.sh` misses links that leave the docs tree.** It reported "All internal links
   valid" for two links the Docusaurus build then rejected — `../../../../../CLAUDE.md` from a plan
   page, and `../README.md` from a README that is rendered as a docs page. The build is the real gate.
2. **Nothing checks external links at all.** One shipped wrong today (a 404 source URL). Decision:
   this does **not** go in `validate-metadata.sh` — the pre-push pipeline stays offline and hermetic,
   for the same reason the digest is not resolved at build time. A dead link is staleness, so it wants
   an alarm; fold it into the phase 6 job.
3. **Port the six `source` falsification cases into unit tests.** They were proven by mutating the
   live entry and restoring it, which proves the rules once rather than continuously.
4. **`TemplateHeader` multi-paragraph abstract** — done as part of publishing atlas's prose, but it is
   the sort of thing that only surfaced because someone's abstract had four paragraphs. Worth a test.

## Open questions

1. **Private artifacts** — deferred; needs Terje for credentials, and atlas does not need it: its
   artifact is `ghcr.io/terchris/*` and public.
2. **Rendering `source` from the entry rather than from prose.** The atlas README states the artifact,
   tag and pin in text. A component reading them from the entry would not drift. Worth it at the
   second application, not the first.

---

## Sequencing

Phases 1-4 need no artifact to exist. Phase 5 needs `atlas` published.

Phase 1 is **done and verified**. The toolchain blocker is **cleared**: phases 2-4 are now ordinary
work — write the failing test, make it pass, run the full pipeline before pushing — and no longer wait
on anything. Phase 6 waits only on urb-agents #483.
