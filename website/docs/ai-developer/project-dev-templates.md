# Project: Dev Templates

Project templates for the Urbalurba developer platform. Each template provides a working starting point for a specific language/framework, with devcontainer setup, Kubernetes manifests, and GitHub Actions CI/CD.

---

## Devcontainer

This project runs in a DCT devcontainer based on `ghcr.io/helpers-no/devcontainer-toolbox`.

### Finding the container

The container name changes on rebuild. Find it dynamically:

```bash
docker ps --format '{{.Names}}\t{{.Image}}' | grep devcontainer-toolbox
```

### Running commands from the host

```bash
docker exec <container-name> bash -c "cd /workspace && <command>"
```

### Workspace path

Inside the container: `/workspace/`

---

## Pre-push checklist

Before pushing any commit that touches generators, `template-info.yaml`, plan files, or anything else that flows through the registry/docs pipeline, run the **full pipeline locally** in the devcontainer in the same order CI uses. This catches the broken-reference class of bug where regenerated indexes point at files you forgot to commit, or where renamed files leave stale links in other docs.

```bash
docker exec <container-name> bash -c "cd /workspace && \
  bash scripts/validate-metadata.sh && \
  npx tsx scripts/generate-registry.ts && \
  bash scripts/generate-docs-markdown.sh --force && \
  bash scripts/generate-plan-indexes.sh && \
  bash scripts/validate-docs.sh && \
  cd website && npm run build"
```

If this command exits non-zero, **do not push**. Fix the failure locally, re-run, and only push when the full pipeline is green.

The order matches `.github/workflows/deploy-docs.yml` exactly: source validation → generation → generated-content validation → build. This means "passes locally" implies "passes CI" for everything except genuinely environment-specific issues (e.g., Node version mismatches between host and runner).

### Pre-push gotchas

- **Untracked files affect generated content.** `bash scripts/generate-plan-indexes.sh` walks `plans/backlog/`, `plans/active/`, `plans/completed/` and indexes whatever files exist on disk — including ones you haven't `git add`-ed yet. If your local index regen references untracked files, the committed indexes will have broken links until those files are also committed. Either commit them, or `git stash -u` them out of the way before regenerating.

- **`git mv` followed by content edits**: `git mv` stages the rename, but if you edit the file afterward and don't re-`git add` it, the commit captures only the rename with zero content delta. Always run `git diff --staged` before committing a rename + edit to confirm the content changes are included.

- **CI runs `validate-docs.sh` AFTER the generators** so it sees the freshly regenerated content. Your local pipeline must run them in the same order to match what CI does. The shorthand pipeline above is correct; do NOT shortcut by running validators first.

> **Future improvement**: this checklist will eventually be wrapped in a single helper script (e.g., `scripts/pre-push-check.sh`) so it's one command to run. Until then, copy-paste the pipeline above.

---

## Project Structure

```
dev-templates/
├── templates/                 # Project templates by language
│   ├── typescript-basic-webserver/
│   ├── python-basic-webserver/
│   ├── csharp-basic-webserver/
│   ├── golang-basic-webserver/
│   ├── java-basic-webserver/
│   ├── php-basic-webserver/
│   └── designsystemet-basic-react-app/
├── website/                   # Documentation site
│   └── docs/
│       └── ai-developer/      # AI developer docs (you are here)
│           └── plans/         # Implementation plans
└── README.md                  # Project overview and template catalog
```

---

## How Templates Work

Each template in `templates/` is a complete, runnable project that a developer copies to start a new application. Templates include:

- **Application code** — minimal working app (`app/`)
- **Kubernetes manifests** — deployment and service definitions (`manifests/`)
- **Dockerfile** — container definition
- **CI/CD** — GitHub Actions workflow for build and deploy
- **README** — setup and usage instructions

Templates are installed into new projects via the `dev-template` command inside the devcontainer.

---

## Auto-generated documentation sections

Each template's documentation page under `website/docs/templates/**` is generated at build time from `template-info.yaml`, vendored DCT/UIS registries, and the template's README. Three sections in particular are fully auto-generated and should **not** be hand-edited:

### Environment card (`<TemplateEnvironment />`)

Rendered by the React component at `website/src/components/TemplateEnvironment/index.tsx`. Shows the resolved tools, services, configure steps, run commands, and init files. Data is pre-resolved by `scripts/generate-registry.ts` and passed as JSON props.

### Files dropdown (`### Files` inside the Getting Started card)

Built by `scripts/lib/build-files-tree.ts` (sorted tree builder) and `scripts/lib/build-files-mdx.ts` (MDX emitter). `generate-registry.ts` shells out to `git ls-files` for each template, stores the raw file list as `entry.files` and the pre-rendered `### Files` block as `entry.filesMdx`. The bash emitter reads `filesMdx` with `jq -r` and echoes it verbatim inside the Getting Started card between Prerequisites and Related templates. Repo base URL and default branch are centralized in `scripts/lib/repo-constants.ts` (`REPO_BASE_URL` + `REPO_BRANCH`). Unit tests in `scripts/test/build-files-tree.test.ts` (12 cases) + `scripts/test/build-files-mdx.test.ts` (10 cases).

### Architecture section (`## Architecture`)

Built by a two-step pipeline split across `scripts/lib/build-architecture-mermaid.ts` (model builder) and `scripts/lib/build-architecture-mdx.ts` (MDX emitter). Per-diagram helpers (`buildLocalDevFlowchart`, `buildLocalDevSequence`, `buildDeployFlowchart`, `buildDeploySequence`, `buildStackFlowchart`, `buildStackSequence`) produce the raw mermaid source strings. `buildArchitectureModel(entry)` assembles them into an `ArchitectureModel` shape, and `emitArchitectureMdx(model)` walks the model to produce the final MDX block. `generate-registry.ts` stores the rendered MDX on each entry as `architectureMdx`, and `generate-docs-markdown.sh` pastes it verbatim into the template's MDX page.

**Per-diagram collapsible dropdowns** (PLAN-architecture-diagram-display Phase 4): each mermaid diagram is wrapped in its own collapsed `<details className="dropdownBlock">` block with a per-diagram `<summary>` label. Section headings (`### Local development`, `### Deployment`, `### Overview`) stay visible as signposts so readers know what documentation exists without expanding anything. A one-sentence intro below `## Architecture` prompts the reader to click to enlarge.

**Click to enlarge**: a client module at `website/src/client-modules/mermaid-zoom.ts` attaches a click handler to every rendered mermaid SVG. Click opens a native HTML `<dialog>` overlay showing an enlarged copy of the diagram. Escape, backdrop click, or the close button dismisses. Keyboard-accessible via Tab + Enter/Space. A `MutationObserver` catches diagrams rendered inside lazy-mounted dropdowns (Docusaurus's `<details>` theme component only mounts child content when the dropdown is first opened).

**Naming vocabulary**: the two diagrams per sub-section are called **Components** (the flowchart — named nodes and connections) and **Flow** (the sequence diagram — ordered steps at runtime). Future diagrams can extend the vocabulary: `Errors`, `Data flow`, `Network`, `Security`, etc. Adding a new diagram to an existing section is a pure data change — append one entry to the section's `diagrams` array in `buildArchitectureModel`. Adding a new section is pushing to `sections`. No rendering code touches.

An **ArgoCD setup diagram** is documented in `plans/completed/mermaid-setup-argocd.md` as a design reference but is currently SUPPRESSED until UIS ships the registration command. When UIS adds the command, add it as a third `### ArgoCD setup` sub-section.

**Four archetypes are handled:**

- **App + services + manifest** (e.g. `python-basic-webserver-database`) — two sections (Local development, Deployment), each with Components + Flow = **4 dropdowns total**
- **App + manifest, no services** (e.g. `python-basic-webserver`) — Local development skipped; only Deployment with its two dropdowns
- **Stack template** (e.g. `postgresql-demo`) — single `### Overview` section with Components + Flow
- **Overlay template** (e.g. `plan-based-workflow`) — entire section suppressed; `architectureMdx` is `null`

**To add a new diagram to an existing section**, edit `buildArchitectureModel` in `scripts/lib/build-architecture-mermaid.ts`. Push an `{ name, mermaid }` entry onto the section's `diagrams` array. The emitter loop handles the rest — no changes to the emitter, no changes to tests beyond a new assertion for the new diagram.

**To change the mermaid source of an existing diagram**, edit the corresponding `buildXxxFlowchart` or `buildXxxSequence` function in the same file, then re-run:

```bash
npx tsx scripts/generate-registry.ts
bash scripts/generate-docs-markdown.sh --force
```

Unit tests live in `scripts/test/build-architecture-mermaid.test.ts` (individual diagram helpers) and `scripts/test/build-architecture-mdx.test.ts` (model shape + emitter output). 33 tests across the two files.

Visual style matches the canonical diagrams in `website/docs/architecture.md` — plain text labels, no emojis, default Mermaid theming. **Design rule**: every edge source is an explicit node (never a subgraph id), to avoid the Mermaid rendering bug where subgraph-id edge sources could silently drop subgraphs.

**Current limitations**: multi-service templates throw at build time (only single-service templates are supported for now); the stack "consumer" node is a hardcoded generic label rather than being derived from cross-template data.

---

## Available Templates

| Template | Language/Framework | Status |
|----------|-------------------|--------|
| `typescript-basic-webserver` | TypeScript/Node.js | Available |
| `python-basic-webserver` | Python | Available |
| `csharp-basic-webserver` | C# | Available |
| `golang-basic-webserver` | Go | Available |
| `java-basic-webserver` | Java | Available |
| `php-basic-webserver` | PHP | Available |
| `designsystemet-basic-react-app` | React/TypeScript | Available |
