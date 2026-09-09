# Investigate: Application catalogue entries in `template-registry.json`

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Backlog (cross-repo — TMP owns the generator, UIS is the consumer)

**Goal**: Let `template-registry.json` carry a third entry kind — an **application**: a multi-service
thing (database + migrations, Dagster code location, per-app REST API) installed by
`uis template install <id>`, whose install definition lives in an **OCI artifact published beside the
application's own image** rather than in this repository. This investigation settles the entry shape,
where the entry's source of truth lives, and how the artifact is pinned, so the generator work can be
scoped into a PLAN.

**Last Updated**: 2026-09-09

**Owner of implementation**: `dev-templates` (TMP). UIS (`helpers-no/urbalurba-infrastructure`,
maintained by `tor-agent`) is the consumer and has already shipped its half — see
[UIS changes already shipped](#uis-changes-already-shipped).

**Provenance**: agreed on the fleet bus in `terchris/urb-agents` — channel opened by Terje on #478,
requirements and the decisions below on **#479**. Where this document says "measured", it was checked
against the code at the cited `file:line`, not recalled.

---

## Background

`uis template install <id>` reads this repository's `template-registry.json` to discover **where an
application's install definition lives**, then pulls that definition as an OCI artifact and executes
it. The registry is a **pointer**, not the definition — that split is Terje's decision on urb-agents
#361.

Two consequences shape everything below:

1. The definition is **not in this repo**, so an application has no template directory here.
2. The definition is fed to `configure --init-file`, which applies SQL **as the database owner**. What
   the registry points at is therefore security-relevant, not merely descriptive.

### What UIS reads from an entry

`tor-agent` measured these against `provision-host/uis/lib/template.sh` at 1.6.25:

| field | required | what UIS does with it |
|---|---|---|
| `templateKind` | yes | must be `application`; read as `.templateKind // .kind`. Install refuses an entry it cannot classify **before fetching anything** |
| `source.artifact` | yes | the OCI artifact, by convention `<image>/uis`; checked against an allowlist (`ghcr.io/helpers-no/*`, `ghcr.io/terchris/*` by default) |
| `source.tag` | yes | shown to a human, **never pulled by**; refused if `latest`, `main`, `master`, `head` or empty |
| `source.digest` | yes | 🔴 **what is actually pulled**; `sha256:` + 64 hex |
| `visibility` | no | `public` (default) or `private`; decides whether the pull needs `oras login` |
| `category` | yes | must name a category whose `context` is `"uis"` |

Display fields `uis template info` reads, and nothing else: `name`, `category`, `description`,
`version` (all printed unguarded — an entry with no `version` prints `Version: null`), `abstract`
(`// "N/A"`), `tags` (array or scalar).

**`params:` and `provides:` do not come from the registry.** They come from the artifact's own
`template-info.yaml`. If the generator inlines a resolved copy for the website that is fine, but there
is one source of truth for them and it is not this repository.

---

## Current state, measured

### There is only one authored discriminator

The registry has both `templateKind` and `install_type`, but they are not independent —
`scripts/generate-registry.ts:685`:

```ts
// Template kind comes from install_type which the template author already […]
const templateKind: TemplateKind = raw.install_type === 'stack' ? 'stack' : 'app';
```

`install_type` is authored in `template-info.yaml` and policed in two places
(`generate-registry.ts:554`, `validate-metadata.sh:162`; allowlist `app|overlay|stack`).
`templateKind` is a **derived projection** of it. Today's values:

| entry | `install_type` | `templateKind` |
|---|---|---|
| the six `*-basic-webserver`, `designsystemet-basic-react-app`, `python-basic-webserver-database` | `app` | `app` |
| `plan-based-workflow` | `overlay` | `app` |
| `postgresql-demo` | `stack` | `stack` |

So "extend `templateKind`" is not reachable on its own; there would be no input to derive it from.

### 🔴 The blocker: entry discovery is directory-driven

For each tree containing a `template-categories.yaml`, the generator walks
`findTemplateInfoFiles(folderPath)` and sets `folder: ${folderName}/${dirName}`. Every entry that
exists is a **directory containing `template-info.yaml`**, and `generate-registry.ts:545` requires
`id` to equal the directory name.

An application's definition lives in an OCI artifact, so it has no directory — and therefore, as
things stand today, **no way to enter the registry at all**. This blocks every other decision and is
the first thing the PLAN must address.

### Every entry must satisfy thirteen required fields

`validateTemplate` (`generate-registry.ts:537-568`) requires: `id` (== directory name), `version`,
`name`, `description`, `category`, `install_type`, `abstract`, `readme`, `tags[]`, `logo`,
`links[]` (≥1), `maintainers[]` (≥1), `prerequisites[]` (≥1).

All are authored and all are satisfiable for an application — but an application entry is **not just a
pointer on this side**; it carries the site's display surface too. That is a real per-application
authoring cost and should be priced into the PLAN, not discovered during it.

### Category merging across trees is already safe

`tor-agent` warned that a third tree contributing categories could produce a duplicate or missing
category id, which would silently drop the entry from the category join (it would still appear via
`templateKind`, making the failure invisible rather than loud).

**Measured: both failure modes are already loud here.** `generate-registry.ts:598-617` merges every
tree's categories through a single `categoryIdSet` and hard-fails on a duplicate id at `:612`
(`Duplicate category ID '<id>' in <file>`); an entry naming a category no tree defines hard-fails at
`:551`. Three trees already contribute categories (`templates/`, `ai-templates/`,
`uis-stack-templates/`) and the guard covers them. **No new work required** — recorded here so the
PLAN does not re-solve it.

### The build is hermetic today, and `oras` is absent

`.github/workflows/deploy-docs.yml` is `npm ci` → `validate-metadata.sh` →
`generate-registry.ts` → `generate-docs-markdown.sh` → `generate-plan-indexes.sh` →
`validate-docs.sh` → `npm run build`. **No step performs a network fetch and no step installs
`oras`.** `oras` is not present on the development host either. The generator does import
`execFileSync` (`generate-registry.ts:29`), so shelling out is mechanically possible.

This matters because [DEVCONTAINER.md](../../DEVCONTAINER.md) and the project doc's pre-push
checklist require every developer to run the **full pipeline locally** before pushing. A mandatory
network call in `generate-registry.ts` would break that offline and turn a ghcr outage into "cannot
build the documentation".

---

## Decision 1 — the discriminator

**Chosen: author `install_type: application`; derive `templateKind: "application"`.**

UIS changes nothing: it continues to read `.templateKind // .kind` and receives `"application"`.

### Options considered

| option | verdict |
|---|---|
| **Author `install_type: application`, derive `templateKind: application`** | ✅ **chosen.** One authored field stays the single source; the published field is what UIS already reads |
| Have UIS read `install_type` instead | ❌ rejected. Couples UIS to this repo's *authoring* field rather than its *published* one — and the authoring field is the more likely to be refactored. `tor-agent` offered this; declined on #479 |
| Add a third discriminator | ❌ rejected by Terje on #478 ("reuse one rather than add a third") |
| Express it through `category` alone | ❌ rejected. UIS classifies before fetching, and the category join is a weaker signal — see the verification below |

### Verified

The shipped 1.6.25 `list` filter, run against the live `template-registry.json`, then again with a
synthetic application entry whose category UIS does not know:

```
postgresql-demo              # as shipped today
postgresql-demo, atlas       # with {"id":"atlas","templateKind":"application","category":"APPLICATION"}
```

The `templateKind` branch matches independently of `category`, so an application stays visible to
`list` even if the category wiring is wrong. `postgresql-demo` is already correct under the new filter.

---

## Decision 2 — pinning the artifact: provenance, not just integrity

**Chosen: resolution is an authoring step. The digest is committed; the build verifies and propagates
it offline; liveness is alarmed, never gated.**

### Why not resolve at build time

Resolving `tag → digest` during the catalogue build is a few lines, and it **defeats the property it
appears to provide**. If the build resolves, the recorded digest tracks the tag:

```
t0  tag v1 -> digest A.  Registry records A.
t1  attacker re-points v1 -> B.
t2  ANY docs build re-resolves v1, records B, publishes the registry.
t3  UIS installs: the recorded digest is B.  B runs as database owner.
```

`t2` is the crux: this catalogue rebuilds on **every push to `main`**, almost all of them unrelated to
any application. The rebuild that launders a tag re-point is one an attacker does not need to trigger.

With the digest **committed in source**, `t2` copies `A` and never looks at the tag, so the
re-pointed tag no longer matches what the registry names.

`tor-agent` confirmed on #479 that UIS reads
`https://raw.githubusercontent.com/helpers-no/dev-templates/main/website/src/data/template-registry.json`
with a one-hour cache and **no version pin**, so `t2` reaches a real install. They also **retracted**
a claim made in the original requirement — that UIS refuses an entry whose tag no longer resolves to
the recorded digest. **That check does not exist**; `_resolve_definition` pulls `artifact@digest` and
never looks at the tag. Anything that assumed it must not be built on.

### The distinction that settles it

- Pulling by digest gives **integrity** — you get what the digest names.
- It does not give **provenance** — that this digest is the one a human approved.

Provenance can only be established **where the digest is authored**. Hence: committed digest, changed
in a reviewed diff. For an artifact that applies SQL as database owner, "a human saw this digest
change" is the property worth having.

### Consequences

| | |
|---|---|
| **Authoring** | adding or bumping an application writes `source.digest` into committed metadata; the PR diff shows the change |
| **Build** | copies the committed digest into the registry and validates *shape* only — allowlist, `sha256:`+64hex, tag not in `latest\|main\|master\|head`. Offline, hermetic, pre-push checklist survives |
| **Liveness** | a separate scheduled/manual job asserts each committed tag still resolves to its committed digest and **alarms**. Not a gate: UIS pulls by digest, so a re-pointed tag cannot change what runs, and blocking unrelated docs deploys on a ghcr hiccup buys no integrity. Agreed with `tor-agent` on #479 |
| **Credentials** | `visibility: private` needs a cross-org PAT (`ghcr.io/terchris/*` from a `helpers-no` repo). Under fleet protocol §7 a human decides credentials — **Terje's, not ours**. Not on the critical path: the first application's artifact is public |

### Preferred long-term option — no `oras` anywhere

The publishing application's CI already knows the digest it just pushed (`oras push` prints it). If it
emits the digest as a **release output**, the digest travels with the release and **neither repository
needs `oras` in the loop**: this pipeline stays offline, and UIS keeps no resolution path to test.
`tor-agent` is asking `atlas` for exactly this on urb-agents #480 and will bring the answer back.

**Open** — the PLAN should not be finalised until #480 answers, because it decides whether an
authoring helper script is needed here at all.

---

## Decision 3 — where an application entry lives

**Chosen: a new tree `uis-applications/`, one stub directory per application.**

```
uis-applications/
  template-categories.yaml          # context: uis
  atlas/
    template-info.yaml              # install_type: application + source: {artifact, tag, digest, visibility}
    README-atlas.md                 # prose for the website
    atlas-logo.svg
```

### Why this shape

- Reuses discovery, the category machinery, `validateTemplate`, and the docs pipeline **unchanged** —
  the generator diff is small and mostly the `source` block.
- Puts the digest in a committed, reviewable file, which is what Decision 2 requires.
- Keeps `params:`/`provides:` out: one source of truth, and it is the artifact.

### Options considered

| option | verdict |
|---|---|
| **`uis-applications/` stub directories** | ✅ **chosen.** Approved by `tor-agent` on #479; clashes with nothing on the UIS side |
| A single `applications.yaml` manifest | ❌ rejected. Needs a second discovery path, its own validation, and its own docs-page plumbing, for no gain over a stub |
| Fold applications into `uis-stack-templates/` | ❌ rejected. Conflates "composition defined here" with "definition published elsewhere"; the `templateKind` split would no longer match the directory layout |
| Hand-edit `template-registry.json` | ❌ rejected. The file is generated and tracked; a hand edit is erased by the next build |

### Confirmed by `tor-agent` (#479)

- **A `folder` on an application entry is harmless.** Install branches on `templateKind` first and
  never reads `folder` for an application; the 1.6.25 `list` filter accepts the entry on either the
  category join *or* `templateKind`. So `folder: uis-applications/atlas` may be present and inert —
  **no need to suppress it**.
- **No category value is reserved.** The only requirement is that the category's `context` is
  `"uis"`. `APPLICATION`, `DATA` — whatever reads best on the site.
- **`id` == directory name is now load-bearing on both sides.** 1.6.26 refuses an artifact whose own
  `id:` disagrees with the entry it was fetched for, naming both. Previously a mis-generated entry
  would install and be *recorded* under a name its definition never claimed.

---

## Generator work this implies

The small part is the `source` block and two allowlists (`generate-registry.ts:554`,
`validate-metadata.sh:162`) gaining `application`, plus the derivation at `:685`.

The real work is that several paths branch on `templateKind === 'stack'` vs `'app'` and an application
is neither:

| site | today | needs |
|---|---|---|
| `:689` | `stack` reads `provides.services`, otherwise `requires` | an application declares neither here — they live in the artifact |
| `:698` | an `app`-only block | must not be entered by an application |
| `:740` | `templateRepoPath` from `folder` (`overlay` uses `${folder}/template`) | an application has no repo files to link |
| `:746` | requires `filesMdx` for non-`overlay` | an application has no file tree; the Files dropdown must be omitted, not empty |

The architecture section (`build-architecture-mermaid.ts` / `build-architecture-mdx.ts`) currently
handles four archetypes, none of which is "definition fetched from an OCI artifact". Whether an
application gets diagrams at all is an open design question for the PLAN — omitting them initially is
acceptable and is the smaller first step.

⚠️ **Falling through to the `'app'` path must be treated as a bug, not a default.** Every one of the
four sites above currently reaches `'app'` for any non-`stack` value, so adding `application` to the
allowlist *without* touching them would produce a plausible-looking, wrong entry. This is the failure
mode most likely to ship unnoticed.

### 🔴 Correction, 2026-09-09: the surface is twelve sites across five files, not four in one

The four sites above are `generate-registry.ts` only. A full `grep` for the discriminator afterwards
found the same exclusion-style branching in three more files:

| file | sites |
|---|---|
| `scripts/generate-registry.ts` | `:172` type, `:685` derivation, `:689`, `:740`, `:746` |
| `scripts/lib/build-architecture-mermaid.ts` | `:67` type, and `:191`, `:276`, `:338` — three functions, each `if overlay return null; if stack return null;` then falling through to the app path |
| `scripts/lib/build-expected-output.ts` | `:48` |
| `website/src/components/TemplateEnvironment/index.tsx` | `:82` its own exported `TemplateKind`, `:145` heading, `:291` `showInstall` |
| `scripts/validate-metadata.sh` | `:162` allowlist |

The pattern is **exclusion, not exhaustive match**, in every one of them — which is why the
fall-through is systemic rather than a local oversight, and why the fix is to convert them to
exhaustive branches that fail loudly on an unknown kind rather than to patch twelve conditions.

Recorded as a correction rather than an edit to the section above, because the undercount is itself
the lesson: four was what one file's `grep` showed, and I reported it to `tor-agent` (#479) before
grepping the rest. Corrected to them on #482.

---

## UIS changes already shipped

`tor-agent` shipped these from the #479 discussion; they are dependencies of this work, not tasks in it.

| version | change |
|---|---|
| 1.6.25 | `template list` no longer filters on `.folder \| startswith("uis-")`, which had made application entries invisible to `list` while remaining installable by id |
| 1.6.26 | the artifact's `id` must agree with the entry, or install refuses naming both |
| 1.6.26 | `install_type: application` accepted as a legal spelling **inside an artifact's** `template-info.yaml`, so a tenant mirroring this repo's stub shape is not refused |
| 1.6.26 | `uis template info` drops dead `summary`/`docs` fields (no registry entry has ever carried either — **do not add them**) and instead prints an application's artifact, tag, pin and visibility |

---

## Gaps and what could go wrong

1. **The `'app'` fall-through** (above) — the highest-risk item, because the output looks right.
2. **Two `template-info.yaml` files with two validators.** The stub here and the artifact's own file
   share a name and a field vocabulary but are validated by different code in different repositories.
   Anyone reading only one will assume the other matches. The PLAN should name both explicitly in the
   stub's own README to stop the confusion at source.
3. **Version drift between entry and artifact.** `version` is authored in the stub, while the artifact
   carries its own. Nothing yet checks they agree, and `info` prints the stub's. Worth deciding
   whether that is a validation or a documented "the entry's version is the catalogue's view".
4. **Per-application authoring cost.** Thirteen required fields, a README and a logo per application.
   Acceptable for one; worth revisiting at ten.
5. **`generate-plan-indexes.sh` walks untracked files.** Per the project doc, regenerating indexes
   with uncommitted plan files produces indexes referencing files that are not committed. Applies to
   this document too.
6. **No application exists yet.** `atlas` has not published its artifact, so the first end-to-end run
   is untested by construction. Mitigated by the verification path below.

---

## Verification, before an application exists

`REGISTRY_URL_PRIMARY` accepts a `file://` URL, so UIS can run a real
`uis template install` against a generated registry **from disk** — no cluster, no catalogue deploy,
no risk to `main`. `tor-agent` offered on #479 to do exactly this: send the generated
`template-registry.json` and they report what UIS made of it.

The PLAN should therefore have a phase that ends in "generated registry handed to `tor-agent`" before
any phase that changes what this repository publishes.

Offline check of generator output without any UIS involvement — the shipped 1.6.25 filter verbatim:

```bash
jq -r '[.categories[] | select(.context=="uis") | .id] as $u
       | .templates[]
       | select(((.category // "") as $c | $u | index($c)) != null
                or ((.templateKind // .kind // "") == "application"))
       | .id' website/src/data/template-registry.json
```

---

## Proposed phases for the PLAN

1. **`uis-applications/` tree** — `template-categories.yaml` (`context: uis`), plus the schema for a
   stub `template-info.yaml` including the `source` block. No generator change yet.
2. **Validation** — `application` in both allowlists; `source` shape validated offline (allowlist,
   `sha256:`+64hex, tag not in the mutable set). Failing tests first.
3. **Derivation and the four branch sites** — `templateKind: 'application'`, and an explicit
   application path at `:689`, `:698`, `:740`, `:746`. No silent `'app'` fall-through.
4. **Docs page** — what an application's page shows without a file tree; whether it gets diagrams.
5. **Hand the generated registry to `tor-agent`** for a `file://` install, and act on the report.
6. **Liveness job** — alarm-only tag/digest drift check, once #480 settles whether it is needed here.

Phases 1-4 need no artifact to exist. Phase 5 needs `atlas` published.

---

## Open questions

1. **urb-agents #480** — will `atlas` emit its digest as a release output? Decides whether an
   authoring helper (and `oras` anywhere in this repo) is needed at all. **Blocks finalising the PLAN.**
2. **Diagrams for an application** — omit initially, or design a fifth archetype?
3. **Entry `version` vs artifact `version`** — validate the agreement, or document the difference?
4. **Private artifacts** — deferred; needs Terje, and the first application does not need it.
