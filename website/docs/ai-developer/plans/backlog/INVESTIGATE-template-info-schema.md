# Investigate: Template-Info Schema Harmonisation with Backstage

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: In Progress

**Goal**: Harmonise `template-info.yaml` with Backstage's `catalog-info.yaml` patterns so that our ODP (Open Developer Portal) feels familiar to Backstage users and migration between the two systems is simple. Clean up field redundancy (kill dead fields, clarify overlapping ones). Lay the groundwork for yaml-driven template documentation pages.

**Last Updated**: 2026-04-12

**Supersedes**: `INVESTIGATE-backstage.md` (2026-03-31) — that investigation explored generating Backstage Software Template files from our templates. It was written against the old `TEMPLATE_INFO` key=value format and is now outdated. The still-valid ideas (Backstage export generation, repo location, discovery mechanism) are carried forward here.

---

## Background

### ODP — Open Developer Portal

The TMP/UIS/DCT three-project architecture is an **Open Developer Portal (ODP)** — achieving similar functionality to Backstage without requiring Backstage running in the cluster.

| Concern | Backstage | ODP (our system) |
|---|---|---|
| Runtime | Backstage backend + frontend (Node.js server) | No server — static site (Docusaurus) + CLI tools (DCT) + infra automation (UIS) |
| Template catalog | Backstage Software Catalog UI | Docusaurus template pages (auto-generated from template-info.yaml) |
| Template execution | Backstage Scaffolder (backend actions) | `dev-template` CLI (DCT) + `uis` CLI |
| Service catalog | Backstage entity pages | Docusaurus docs + Environment card |
| Documentation | TechDocs (mkdocs rendered inside Backstage) | Docusaurus pages (auto-generated from template-info.yaml) |
| Entity descriptor | `catalog-info.yaml` | `template-info.yaml` |

**Design principle**: align with Backstage's concepts and schema so that:
1. People who know Backstage can easily understand our system
2. Moving from ODP to Backstage (or vice versa) is simple — field names map cleanly
3. A Backstage generator can consume the same `template-info.yaml` data

### How Backstage structures entity metadata

Backstage uses a Kubernetes-style envelope (`apiVersion`/`kind`/`metadata`/`spec`) with exactly three text fields:

| Backstage field | Purpose | Constraints |
|---|---|---|
| `metadata.name` | Machine identifier | `[a-z0-9A-Z][-_.]`, 1–63 chars, used in URLs/entity references |
| `metadata.title` | Human-friendly display name | Optional, short, UI only — never used in references |
| `metadata.description` | Short informative overview | The ONLY description field. "Detailed explanations belong elsewhere." |

**No "abstract", "summary", or "long description" field exists.** Detailed documentation lives in TechDocs, linked via `backstage.io/techdocs-ref` annotation. The entity descriptor stays lean.

Other Backstage patterns:
- **Annotations** (`backstage.io/techdocs-ref`, `github.com/project-slug`) — namespaced key-value pairs for linking to external systems
- **Labels** — key-value classification pairs for machine queries/filtering
- **Tags** — single-value strings for human classification/search
- **Relations are derived, not declared** — write `spec.dependsOn`, system derives the reverse `dependencyOf`
- **`spec.type`** — what kind of component (`service`, `website`, `library`)
- **`spec.lifecycle`** — what stage (`experimental`, `production`, `deprecated`)

---

## Current State: Our Text Fields

### Field audit

| Field | Length | DCT usage | Docusaurus usage | Backstage equivalent |
|---|---|---|---|---|
| `id` | Short | Template identification, direct selection | URL slug, page routing | `metadata.name` |
| `name` | Short | Menu item label, confirmation dialog title | Header, sidebar, page title | `metadata.title` |
| `description` | One-liner | Menu item help text | Header subtitle, MDX meta, category index table | `metadata.description` |
| `abstract` | 2–3 sentences | Confirmation dialog "About:", post-selection display | Category index cards (`<TemplateCard>`) — **not on the detail page** | *(no equivalent)* |
| ~~`summary`~~ | Paragraph | **Not used** | **Not used** | *(no equivalent)* |
| `tags` | Array | Not used | Tag chips, filtering | `metadata.tags` |
| `website` | URL | Not used | Header link | `metadata.links[]` |
| `docs` | URL | Not used | Header link | `metadata.links[]` |

### DCT field consumption (verified from source)

The DCT `dev-template.sh` command fetches `template-registry.json` and renders a `dialog` TUI:

- **Category menu**: `categories[].emoji` + `categories[].name`
- **Template menu**: `.name` as label, `.description` as help text
- **Confirmation dialog**: `.name` (title), `.category`, `.description`, `.abstract` (as "About:"), `.tools`, `.install_type`
- **Post-selection**: `.name`, `.abstract`

Fields NOT read by DCT: `summary`, `version`, `tags`, `logo`, `website`, `docs`, `related`, `params`

---

## Decisions

### Decided

- [x] **Kill `summary`** — dead everywhere (DCT never reads it, Docusaurus never renders it). Remove from all 10 template-info.yaml files, generate-registry.ts, and validate-metadata.sh.
- [x] **Q1: Keep `abstract`** — serves a real DCT UI need. Map to `helpers.no/abstract` annotation when exporting to Backstage.
- [x] **Q2: Skip `spec.type` and `spec.lifecycle`** — no consumer today; derive at Backstage export time. Add `lifecycle` only when first deprecated template exists.
- [x] **Q3: Adopt Backstage `links[]` pattern** — replace `website` + `docs` with a `links[]` array.
- [x] **Q4: Skip annotations** — closed system, no consumer. Synthesize at Backstage export time.
- [x] **Q5: Moderate yaml-driven pages** — render Quick Start from yaml (already has the data, diagrams depend on it). Add `prerequisites` field. README becomes optional deep-dive.
- [x] **Q7: Add `maintainers` field** — list of GitHub usernames. Rendered on Docusaurus page as linked avatars via `github.com/<user>.png`. Start with plain strings, assume GitHub. Extend to `{id, provider}` objects when the first non-GitHub user shows up.
- [x] **Q6: Backstage export** — separate investigation for later.
- [x] **Q8: Split `quickstart.commands`** — rename to `setup`, remove the run command from it. `run` field holds it separately. No redundancy.
- [x] **Q9: Field requirements** — `maintainers` required, `prerequisites` required (every template needs at least "DCT devcontainer running"), `links` required (at least source code link).
- [x] **Q10: Render `abstract` on detail page** — between header and environment card.
- [x] **Q11: `readme` becomes optional** — free text, template developer decides content. Page works without it. Schema cleanup ships first.

### Questions to Answer

### Q1. Should `abstract` be renamed for Backstage alignment?

Backstage has no `abstract` field. Our `abstract` is used by DCT as an "About:" block and by Docusaurus on category index cards. Options:

#### Option A: Keep `abstract` as-is

Pros: no migration needed, DCT already reads it.
Cons: no Backstage equivalent; Backstage users won't expect this field.

#### Option B: Fold `abstract` into `description`

Make `description` the 2–3 sentence field (matching what DCT shows as "About:"). Use the first sentence for one-liner contexts (menu help text, meta).

Pros: matches Backstage's single-description model; one fewer field.
Cons: DCT uses `description` as a short one-liner and `abstract` as a longer overview in different UI contexts. Merging them loses the distinction.

#### Option C: Map `abstract` to a Backstage annotation

Keep `abstract` in our yaml, but when exporting to Backstage, map it to an annotation (e.g., `helpers.no/abstract`). This preserves our two-tier model while staying Backstage-compatible.

Pros: no migration; Backstage export works; ODP keeps its richer model.
Cons: Backstage won't render the annotation natively — it's just metadata.

**Decision**: Option A — keep `abstract`. It serves a real DCT UI need (the "About:" block in the confirmation dialog). When exporting to Backstage, map it to a `helpers.no/abstract` annotation. Decided 2026-04-12.

### Q2. Should we adopt Backstage's `spec.type` and `spec.lifecycle`?

Our `install_type` (`app` | `stack` | `overlay`) maps loosely to Backstage's `spec.type` (`service` | `website` | `library`). We don't have a `lifecycle` field.

| Our `install_type` | Backstage `spec.type` |
|---|---|
| `app` | `service` or `website` (depends on the template) |
| `stack` | `resource` (infrastructure) |
| `overlay` | No clean equivalent — overlays modify existing projects |

**Decision**: Skip. Keep `install_type` as our routing field. No new `type` or `lifecycle` fields — they would have no consumer today (same trap as `summary`). The Backstage export generator can derive `spec.type` from `install_type` + `category` at export time. Add `lifecycle` only when we have our first deprecated template and actually need the distinction. Decided 2026-04-12.

### Q3. Should we adopt Backstage's `metadata.links` pattern?

Currently we have `website` and `docs` as separate top-level fields. Backstage uses a flexible `links[]` array:

```yaml
# Backstage style
links:
  - url: https://github.com/helpers-no/dev-templates/...
    title: Source code
    icon: github
  - url: https://python.org
    title: Python website
    icon: web
```

Should we replace `website` + `docs` with a `links[]` array? This is more extensible (can add arbitrary links without schema changes) and matches Backstage directly.

**Decision**: Adopt Backstage's `links[]` pattern. Replace `website` + `docs` with a `links[]` array. Each entry has `url`, optional `title`, optional `icon`, optional `type`. Decided 2026-04-12.

Migration: the 10 template-info.yaml files change from:
```yaml
website: "https://python.org"
docs: https://github.com/helpers-no/dev-templates/tree/main/templates/...
```
to:
```yaml
links:
  - url: "https://python.org"
    title: Python website
  - url: https://github.com/helpers-no/dev-templates/tree/main/templates/...
    title: Source code
    icon: github
```

Impact: `generate-registry.ts` field reading, `<TemplateHeader>` component (currently takes `website` + `docs` as separate props), `generate-docs-markdown.sh` (emits those props), DCT (does not read these fields — zero impact).

### Q4. Should we adopt Backstage's annotation pattern?

Backstage uses namespaced annotations for external references:

```yaml
annotations:
  backstage.io/techdocs-ref: dir:.
  github.com/project-slug: helpers-no/dev-templates
```

We could use this for:
- `helpers.no/dct-docs` → link to DCT tool page
- `helpers.no/uis-docs` → link to UIS service page
- `helpers.no/source-template` → which template this was created from

Or is this over-engineering for our current scale?

**Decision**: Skip. Backstage needs annotations because it's a generic plugin platform. We're a closed system where TMP/UIS/DCT know about each other directly — external references are already resolved at build time by `generate-registry.ts` (e.g., `resolvedTools[].docsUrl`, `resolvedServices[].docsUrl`). Synthesize annotations at Backstage export time if needed. Decided 2026-04-12.

### Q5. Yaml-driven template pages — how far should we go?

Current page sections and their data sources:

| Section | Source today | Could come from yaml? |
|---|---|---|
| Header | template-info.yaml ✅ | Already does |
| Environment card | template-info.yaml ✅ | Already does |
| Architecture diagrams | registry (new) ✅ | Already does |
| Quick Start | README | ✅ `quickstart` block has the data |
| Prerequisites | README | ✅ New field needed |
| Project Structure | README | 🤔 Could auto-scan, but annotations need prose |
| Development tips | README | 🤔 Language-specific, hard to structure |
| CI/CD description | README | ✅ Could generate from workflow + manifest presence |
| Related Templates | template-info.yaml ✅ | Already does |

How far should we push structured yaml fields vs README prose?

**Decision**: Moderate. Move Quick Start and Prerequisites to yaml as the rendered source on the Docusaurus page. The `quickstart` block already has `commands`, `run`, `title`, and `note` — these fields are also consumed by the architecture Mermaid diagrams (the sequence builder reads `quickstart.run` for the "developer runs the app" step), so they must be structured and correct. Rendering them directly from yaml eliminates the duplication with the hand-written README Quick Start section and ensures the diagram labels match what the page shows.

README shrinks to optional deep-dive sections (Development tips, Project Structure) that are hard to structure as yaml. Decided 2026-04-12.

New yaml fields needed:
- `prerequisites: string[]` — optional list of things that must be in place before running the template (e.g., "UIS provision-host running", "Local Kubernetes cluster"). Rendered as a checklist on the page.
- `quickstart` block already exists — just needs to become the *rendered* source instead of the README duplicate.

Additional decisions from gap analysis (2026-04-12):

- **`quickstart.commands` cleanup**: Remove the run command from `commands` so it only contains setup steps. The `run` field holds the run command separately. No more redundancy. Schema becomes `setup: string[]` (rename from `commands`) + `run: string`. All 9 templates need migration (remove the last command from `commands`). DCT does not read `quickstart` fields — zero impact.
- **Required vs optional for new fields**: `maintainers` = required (every template needs a contact). `prerequisites` = optional (E2 templates without services may have none). `links` = required (every template has at least a source code link).
- **Render `abstract` on the detail page**: Currently only shown on category index cards. Must also render on the template detail page — natural placement between the header and the environment card. Not a schema change, but a rendering change included in this plan.
- **`readme` becomes optional free text**: The README is now supplementary — the template developer decides what goes there (advanced usage, design rationale, anything). The page works fully without it. All structured sections (header, abstract, environment, architecture, quickstart, prerequisites) render from yaml. The `readme` field in template-info.yaml becomes optional.

### Q6. Backstage export generation — still a goal?

The original INVESTIGATE-backstage.md recommended generating `backstage/` files (template.yaml + skeleton/catalog-info.yaml) from our templates. Still-valid decisions from that investigation:

- **Repo location**: `backstage/` inside dev-templates
- **Generator tool**: TypeScript (aligns with current pipeline)
- **Sync mechanism**: GitHub Actions re-runs on push
- **Discovery**: `backstage/all-templates.yaml` Location entity
- **`app-config.yaml` entry**: single URL pointing to the all-templates file

Questions that need re-answering against the current schema:
- Updated field mapping (template-info.yaml → Backstage yaml)
- How does `template-registry.json` fit? (Could be the data source instead of reading yaml directly)
- Nunjucks placeholders (`${{ }}`) in skeleton files — handled cleanly by TypeScript template literals
- Stack and overlay archetypes — what Backstage entity kind do they map to?

**Decision**: Separate investigation for later. The schema cleanup (kill summary, links[], prerequisites, maintainers, render quickstart) ships first — it has immediate value and no dependency on the export work. Decided 2026-04-12.

---

## Impact of Killing `summary`

| File | Change needed |
|---|---|
| All 10 `template-info.yaml` files | Remove `summary:` field |
| `scripts/generate-registry.ts` (~line 617) | Remove `summary: raw.summary?.trim()` |
| `scripts/generate-registry.ts` (~line 530) | Remove `if (!tmpl.summary) fail(...)` validation |
| `scripts/validate-metadata.sh` | Remove any summary-specific check (if separate from generate-registry.ts) |
| `scripts/generate-docs-markdown.sh` (~line 91) | Remove `summary=$(jq -r ".templates[$i].summary" "$REGISTRY")` (read but never used) |
| `website/src/data/template-registry.json` | Field disappears on regeneration |
| DCT scripts | No change (never read it) |
| Docusaurus components | No change (never rendered it) |

---

## Next Steps

- [ ] User answers Q1–Q6
- [ ] Remove `summary` from all files (decided — can execute immediately)
- [ ] Create a plan based on the answered questions
- [ ] Backstage export generation: decide if separate investigation or folded in here
