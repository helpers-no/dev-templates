/**
 * build-architecture-mermaid.ts — Per-template Mermaid diagram builder (v2)
 *
 * Generates the auto-generated `## Architecture` section for each template's
 * documentation page. Called from `scripts/generate-registry.ts` during
 * registry construction; the output is stored as a single `architectureMdx`
 * string field on each template's registry entry and then pasted verbatim
 * into the MDX page by `scripts/generate-docs-markdown.sh`.
 *
 * v2 emits TWO diagrams per non-stack template (each with a flowchart + a
 * sequence diagram):
 *
 *   1. **Local development** — How a developer sets up and runs the template
 *      locally. Developer runs `dev-template configure`, UIS provisions
 *      database + secret + port-forward, app connects via
 *      host.docker.internal, browser shows the result.
 *
 *   2. **Deployment** — What happens when the developer pushes code. GitHub
 *      Actions builds the image, ArgoCD deploys the pod, Traefik routes
 *      traffic to `<app>.localhost`.
 *
 * An ArgoCD setup diagram is documented in
 * `website/docs/ai-developer/plans/completed/mermaid-setup-argocd.md` as a
 * design reference but is SUPPRESSED in v2 until UIS ships the registration
 * command. See PLAN-architecture-diagram-v2.md § ArgoCD setup.
 *
 * Per-archetype rendering (see INVESTIGATE-architecture-diagram-v2.md § E):
 *   - E1 app + services + manifest: both diagrams rendered in full
 *   - E2 app + manifest, no services: local dev SKIPPED, deploy only
 *     (a dev → app → browser diagram isn't worth rendering)
 *   - E3 stack + services: single `### Overview` sub-section with the stack
 *     flowchart + sequence (stacks don't have separate local-dev/deploy)
 *   - E4 overlay: both null, entire `## Architecture` section suppressed
 *
 * Why one composed field (not multiple): the project's TypeScript-first
 * preference — all conditional logic (sub-heading suppression, archetype
 * variation, overlay skip) lives here, and the bash emit step is a dumb
 * pipe (`jq -r` + `echo`). See PLAN-architecture-diagram-v2.md § Overview.
 *
 * Visual style matches `website/docs/architecture.md` — plain text labels,
 * no emojis, default Mermaid theming. The subgraph label `"Local Kubernetes
 * Cluster"` (without "(Test environment)") is the v2 choice.
 *
 * v2 design rule — no subgraph ids as edge sources: every edge source is
 * an explicit node (dev, app, cfg, src, tmpl, uis, argo, ghcr, etc.) to
 * avoid the Mermaid rendering bug where `dct --> repo` could silently drop
 * the DCT subgraph. See v1 visual review findings in INVESTIGATE.
 *
 * v1 limitations carried forward:
 *   - Multi-service templates (resolvedServices.length > 1) throw at build
 *     time. Not currently hit by any of the 10 templates.
 *   - The sequence diagram's "run the app" step reads `quickstart.run`
 *     verbatim; templates with services but no `run` field throw with a
 *     clear error pointing at the missing field.
 */

import { getInClusterPort } from './service-ports.ts';
import { emitArchitectureMdx } from './build-architecture-mdx.ts';

/**
 * The subset of a registry entry that the builder reads. Kept narrow so
 * changes to unrelated fields don't ripple here.
 */
export interface TemplateEntry {
  id: string;
  name: string;
  install_type: 'app' | 'stack' | 'overlay';
  params?: {
    app_name?: string;
    database_name?: string;
    [key: string]: unknown;
  };
  manifest?: {
    envVar: string;
    secretName: string;
    containerPort: number;
  };
  resolvedTools: Array<{ id: string; name: string }>;
  resolvedServices: Array<{
    id: string;
    name: string;
    database?: string;
    exposePort?: number;
    namespace?: string;
    initFilePath?: string;
    [key: string]: unknown;
  }>;
  quickstart?: {
    title: string;
    setup?: string[];
    run?: string;
    note?: string;
  };
  configureCommand?: string;
  resolvedInitFiles?: Record<string, string>;
}

export interface ArchitectureResult {
  mdx: string | null;
}

// ────────────────────────────────────────────────────────────────────────────
// Structured model (PLAN-architecture-diagram-display Phase 2)
//
// The builder's public entry point returns a structured model. An emitter
// module (build-architecture-mdx.ts) walks the model and produces the
// final MDX string that generate-registry stores on each entry. The
// pre-composed MDX string still ships via the backward-compatible
// buildArchitectureMdx wrapper below, so existing call sites and unit
// tests continue to work unchanged.
//
// Why a model: adding a 3rd, 4th, or Nth diagram per sub-section later
// is a one-line push onto a `diagrams` array — no rendering code touches.
// Today each section has exactly 2 diagrams (Components + Flow); tomorrow
// we might add Errors, Data flow, Network, Security, etc.
// ────────────────────────────────────────────────────────────────────────────

export interface ArchitectureDiagram {
  /** Human-readable name — becomes the dropdown summary. Examples: "Components", "Flow". */
  name: string;
  /** The raw mermaid source, without the ```mermaid fence. */
  mermaid: string;
}

export interface ArchitectureSection {
  /** Sub-section heading — becomes `### {title}` in the emitted MDX. */
  title: string;
  /** One or more diagrams, rendered in order. */
  diagrams: ArchitectureDiagram[];
}

export interface ArchitectureModel {
  /** Optional one-line intro rendered below the `## Architecture` heading. */
  intro?: string;
  /** Sub-sections, in render order. Empty for overlay templates → entire section suppressed. */
  sections: ArchitectureSection[];
}

// ────────────────────────────────────────────────────────────────────────────
// Label helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Label for the app node (human-readable). Precedence:
 *   params.app_name  ->  entry.name  ->  entry.id
 * All 10 templates have params.app_name after the schema plan, so the
 * fallback is defensive only.
 */
function appNodeLabel(entry: TemplateEntry): string {
  return entry.params?.app_name ?? entry.name ?? entry.id;
}

/**
 * URL-safe hostname derived from the app name — used for Traefik ingress
 * labels like `my-app.localhost`. Uses params.app_name (guaranteed present
 * after schema plan) with entry.id as a URL-safe fallback.
 */
function appHostname(entry: TemplateEntry): string {
  return entry.params?.app_name ?? entry.id;
}

/**
 * Guard helper — assert at most one service for v1/v2.
 */
function assertSingleService(entry: TemplateEntry): void {
  if (entry.resolvedServices.length > 1) {
    throw new Error(
      `build-architecture-mermaid: template "${entry.id}" has ` +
        `${entry.resolvedServices.length} services; multi-service diagrams ` +
        `are not yet supported. See PLAN-architecture-diagram-v2.md § ` +
        `Implementation Notes.`,
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Local development flowchart
// ────────────────────────────────────────────────────────────────────────────

/**
 * Build the local development flowchart string (no fence). Returns null
 * when local-dev rendering should be skipped.
 *
 * Returns null for:
 *   - Overlay templates
 *   - App templates without services (E2) — not worth rendering a 3-node
 *     dev→app→browser diagram
 *   - Stack templates (handled separately by buildStackFlowchart)
 */
export function buildLocalDevFlowchart(entry: TemplateEntry): string | null {
  if (entry.install_type === 'overlay') return null;
  if (entry.install_type === 'stack') return null;
  if (entry.resolvedServices.length === 0) return null;

  assertSingleService(entry);
  const svc = entry.resolvedServices[0]!;

  if (!entry.manifest) {
    // App with services but no manifest — edge case, shouldn't happen in
    // practice. Fall through with a simplified shape.
  }

  const lines: string[] = ['flowchart LR'];
  const appLabel = appNodeLabel(entry);
  const hasManifest = !!entry.manifest;
  const port = svc.exposePort ?? 35432;

  // External actors (outside any subgraph)
  lines.push('    dev(["Developer"])');
  lines.push('    browser["Web Browser"]');
  lines.push('');

  // DCT subgraph — app, env (if manifest), template-info.yaml, configure cmd
  lines.push('    subgraph dct["DCT devcontainer"]');
  lines.push(`        app["${appLabel}"]`);
  if (hasManifest) {
    lines.push('        env[".env"]');
  }
  lines.push('        tmpl["template-info.yaml"]');
  lines.push(`        cfg["${entry.configureCommand ?? 'dev-template configure'}"]`);
  lines.push('    end');
  lines.push('');

  // UIS subgraph — single node so it renders with the same visual weight
  lines.push('    subgraph uis_group["UIS container"]');
  lines.push('        uis["uis CLI"]');
  lines.push('    end');
  lines.push('');

  // K8s subgraph — service + (conditional) secret
  lines.push('    subgraph k8s["Local Kubernetes Cluster"]');
  const svcLabel = svc.database ? `${svc.name}<br/>${svc.database}` : svc.name;
  lines.push(`        svc[("${svcLabel}")]`);
  if (hasManifest) {
    lines.push(`        sec["K8s Secret<br/>${entry.manifest!.secretName}"]`);
  }
  lines.push('    end');
  lines.push('');

  // Edges
  const runCmd = entry.quickstart?.run;
  if (!runCmd) {
    throw new Error(
      `build-architecture-mermaid: template "${entry.id}" has services ` +
        `but no quickstart.run field. Required for local-dev flowchart. ` +
        `Add a "run" field to the template-info.yaml quickstart block.`,
    );
  }
  lines.push('    dev -->|runs| cfg');
  lines.push(`    dev -->|${runCmd}| app`);
  lines.push('    tmpl -->|read by| cfg');
  lines.push('    cfg -->|sends config to| uis');
  lines.push('    uis -->|creates + port-forward| svc');
  if (hasManifest) {
    lines.push('    uis -->|creates| sec');
    lines.push('    uis -->|writes| env');
    lines.push('    env --> app');
  }
  lines.push(`    app -->|host.docker.internal:${port}| uis`);
  if (hasManifest) {
    lines.push(`    app -.->|port ${entry.manifest!.containerPort}| browser`);
  }

  return lines.join('\n');
}

// ────────────────────────────────────────────────────────────────────────────
// Local development (configure flow) sequence
// ────────────────────────────────────────────────────────────────────────────

/**
 * Build the configure-flow sequence diagram string (no fence). Returns
 * null under the same conditions as buildLocalDevFlowchart.
 */
export function buildLocalDevSequence(entry: TemplateEntry): string | null {
  if (entry.install_type === 'overlay') return null;
  if (entry.install_type === 'stack') return null;
  if (entry.resolvedServices.length === 0) return null;

  assertSingleService(entry);
  const svc = entry.resolvedServices[0]!;
  const port = svc.exposePort ?? 35432;
  const dbLabel = svc.database ? `database ${svc.database} + user` : 'database + user';

  const runCmd = entry.quickstart?.run;
  if (!runCmd) {
    throw new Error(
      `build-architecture-mermaid: template "${entry.id}" has services ` +
        `but no quickstart.run field. Required for sequence-diagram ` +
        `generation.`,
    );
  }

  const lines: string[] = ['sequenceDiagram'];
  lines.push('    participant Dev as Developer');
  lines.push('    participant DCT as DCT devcontainer');
  lines.push('    participant UIS as UIS provision-host');
  lines.push('    participant K8s as Local Kubernetes cluster');
  lines.push(`    participant DB as ${svc.name}`);
  lines.push(`    Dev->>DCT: ${entry.configureCommand ?? 'dev-template configure'}`);
  lines.push('    DCT->>UIS: request provisioning');
  lines.push(`    alt ${svc.name} not deployed`);
  lines.push(`        UIS->>K8s: deploy ${svc.name}`);
  lines.push('    end');
  lines.push('    UIS->>K8s: create namespace');
  lines.push(`    UIS->>DB: create ${dbLabel}`);
  if (svc.initFilePath) {
    lines.push('    UIS->>DB: run init-*.sql seed files');
  }
  if (entry.manifest) {
    lines.push(`    UIS->>K8s: create K8s Secret (${entry.manifest.secretName})`);
  }
  lines.push(`    UIS->>UIS: kubectl port-forward ${port}`);
  lines.push(`    UIS-->>DCT: write .env (host.docker.internal:${port})`);
  lines.push(`    Dev->>DCT: ${runCmd}`);
  lines.push(`    DCT->>UIS: connect via host.docker.internal:${port}`);
  lines.push('    UIS->>DB: forward connection');
  if (entry.manifest) {
    lines.push(
      `    Note over Dev,DCT: App now accessible at localhost:${entry.manifest.containerPort} via VS Code port forwarding`,
    );
  }

  return lines.join('\n');
}

// ────────────────────────────────────────────────────────────────────────────
// Deployment flowchart
// ────────────────────────────────────────────────────────────────────────────

/**
 * Build the CI/CD deployment flowchart string (no fence). Returns null
 * for overlay and stack templates. Rendered for all app templates
 * (including E2 templates without services — they still have a manifest
 * and a deployable pod).
 */
export function buildDeployFlowchart(entry: TemplateEntry): string | null {
  if (entry.install_type === 'overlay') return null;
  if (entry.install_type === 'stack') return null;

  assertSingleService(entry);
  const hasServices = entry.resolvedServices.length > 0;
  const svc = hasServices ? entry.resolvedServices[0]! : undefined;
  const appLabel = appNodeLabel(entry);
  const hostname = appHostname(entry);

  const lines: string[] = ['flowchart LR'];

  // External actors
  lines.push('    dev(["Developer"])');
  lines.push('    browser["Web Browser"]');
  lines.push('');

  // DCT subgraph — minimal, just source code
  lines.push('    subgraph dct["DCT devcontainer"]');
  lines.push('        src["source code"]');
  lines.push('    end');
  lines.push('');

  // GitHub subgraph
  lines.push('    subgraph gh["GitHub"]');
  lines.push('        repo["repo"]');
  lines.push('        actions["GitHub Actions"]');
  lines.push('        ghcr["Container Registry"]');
  lines.push('    end');
  lines.push('');

  // K8s subgraph — traefik, argo, pod, and (when services) secret + db
  lines.push('    subgraph k8s["Local Kubernetes Cluster"]');
  lines.push('        traefik["Traefik Ingress"]');
  lines.push('        argo["ArgoCD"]');
  lines.push(`        pod["${appLabel} pod"]`);
  if (hasServices && entry.manifest) {
    lines.push(`        sec["K8s Secret<br/>${entry.manifest.secretName}"]`);
  }
  if (hasServices && svc) {
    const svcLabel = svc.database ? `${svc.name}<br/>${svc.database}` : svc.name;
    lines.push(`        svc[("${svcLabel}")]`);
  }
  lines.push('    end');
  lines.push('');

  // Edges — build/deploy chain
  lines.push('    dev -->|git push| src');
  lines.push('    src -->|push| repo');
  lines.push('    repo -->|trigger| actions');
  lines.push('    actions -->|build + push image| ghcr');
  lines.push('    argo -->|monitors| repo');
  lines.push('    ghcr -->|image pull| argo');
  lines.push('    argo -->|deploys| pod');

  // Secret and database wiring
  if (hasServices && entry.manifest) {
    lines.push(`    sec -->|${entry.manifest.envVar}| pod`);
  }
  if (hasServices && svc) {
    const ns = svc.namespace ?? 'default';
    lines.push(`    pod -->|${ns}.svc.cluster.local:${getInClusterPort(svc.id)}| svc`);
  }

  // Traffic routing
  lines.push('    traefik -->|routes to| pod');
  lines.push(`    browser -->|${hostname}.localhost| traefik`);
  lines.push('    dev --> browser');

  return lines.join('\n');
}

// ────────────────────────────────────────────────────────────────────────────
// Deployment sequence
// ────────────────────────────────────────────────────────────────────────────

/**
 * Build the deploy-flow sequence diagram string (no fence). Returns null
 * for overlay and stack templates.
 */
export function buildDeploySequence(entry: TemplateEntry): string | null {
  if (entry.install_type === 'overlay') return null;
  if (entry.install_type === 'stack') return null;

  assertSingleService(entry);
  const hasServices = entry.resolvedServices.length > 0;
  const svc = hasServices ? entry.resolvedServices[0]! : undefined;
  const appLabel = appNodeLabel(entry);
  const hostname = appHostname(entry);

  const lines: string[] = ['sequenceDiagram'];
  lines.push('    participant Dev as Developer');
  lines.push('    participant DCT as DCT devcontainer');
  lines.push('    participant GH as GitHub');
  lines.push('    participant Actions as GitHub Actions');
  lines.push('    participant GHCR as Container Registry');
  lines.push('    participant Argo as ArgoCD');
  lines.push('    participant K8s as Local Kubernetes cluster');
  if (hasServices && svc) {
    lines.push(`    participant DB as ${svc.name}`);
  }
  lines.push('    Dev->>DCT: git push');
  lines.push('    DCT->>GH: push to repo');
  lines.push('    GH->>Actions: trigger workflow');
  lines.push('    Actions->>Actions: build container image');
  lines.push('    Actions->>GHCR: push image');
  lines.push('    Argo->>GH: detects manifest change');
  lines.push('    Argo->>GHCR: pull image');
  lines.push(`    Argo->>K8s: deploy ${appLabel} pod`);
  if (hasServices && entry.manifest) {
    lines.push(`    K8s->>K8s: mount K8s Secret (${entry.manifest.envVar})`);
  }
  if (hasServices && svc) {
    const ns = svc.namespace ?? 'default';
    lines.push(`    K8s->>DB: pod connects via ${ns}.svc.cluster.local:${getInClusterPort(svc.id)}`);
  }
  lines.push(`    Note over Dev,K8s: App now accessible at ${hostname}.localhost via Traefik`);

  return lines.join('\n');
}

// ────────────────────────────────────────────────────────────────────────────
// Stack template — single `### Overview` diagram + sequence
// ────────────────────────────────────────────────────────────────────────────

/**
 * Build the stack-template flowchart. Stack templates have a different
 * shape from app templates — no DCT app subgraph, no GitHub subgraph,
 * no ArgoCD chain. Just `dev → uis → k8s` (deploy + create db).
 */
function buildStackFlowchart(entry: TemplateEntry): string {
  assertSingleService(entry);
  const svc = entry.resolvedServices[0];

  const lines: string[] = ['flowchart LR'];
  lines.push('    dev(["Developer"])');
  lines.push('');
  lines.push('    subgraph dct["DCT devcontainer"]');
  lines.push('        dev_inside(["Developer shell"])');
  lines.push('    end');
  lines.push('');
  lines.push('    subgraph uis_group["UIS container"]');
  lines.push('        uis["uis CLI"]');
  lines.push('    end');
  lines.push('');
  lines.push('    subgraph k8s["Local Kubernetes Cluster"]');
  if (svc) {
    const label = svc.database ? `${svc.name}<br/>${svc.database}` : svc.name;
    lines.push(`        svc[("${label}")]`);
  }
  lines.push('    end');
  lines.push('    consumers["Consumer templates"]');
  lines.push('');
  lines.push(`    dev -->|${entry.configureCommand ?? `uis template install ${entry.id}`}| uis`);
  if (svc) {
    lines.push('    uis -->|deploys + seeds| svc');
    lines.push('    consumers -.->|use this| svc');
  }

  return lines.join('\n');
}

/**
 * Build the stack-template sequence. Shows the `uis template install`
 * flow rather than the `dev-template configure` flow that app templates use.
 */
function buildStackSequence(entry: TemplateEntry): string | null {
  if (entry.resolvedServices.length === 0) return null;
  assertSingleService(entry);
  const svc = entry.resolvedServices[0]!;
  const port = svc.exposePort ?? 35432;
  const dbLabel = svc.database ? `database ${svc.database} + user` : 'database + user';

  const lines: string[] = ['sequenceDiagram'];
  lines.push('    participant Dev as Developer');
  lines.push('    participant DCT as DCT devcontainer');
  lines.push('    participant UIS as UIS provision-host');
  lines.push('    participant K8s as Local Kubernetes cluster');
  lines.push(`    participant DB as ${svc.name}`);
  lines.push(`    Dev->>DCT: ${entry.configureCommand ?? `uis template install ${entry.id}`}`);
  lines.push('    DCT->>UIS: install stack');
  lines.push(`    UIS->>K8s: deploy ${svc.name}`);
  lines.push(`    UIS->>DB: create ${dbLabel}`);
  if (svc.initFilePath) {
    lines.push('    UIS->>DB: run init-*.sql seed files');
  }
  lines.push(`    UIS->>UIS: kubectl port-forward ${port}`);
  lines.push('    UIS-->>DCT: return connection JSON');

  return lines.join('\n');
}

// ────────────────────────────────────────────────────────────────────────────
// Top-level entry point
// ────────────────────────────────────────────────────────────────────────────

/**
 * Compose the full `## Architecture` MDX section for a template. Returns
 * `{ mdx: null }` for overlay templates (caller skips the section).
 *
 * Output shape for app templates (E1 with services):
 *
 *     ## Architecture
 *
 *     ### Local development
 *
 *     ```mermaid
 *     flowchart LR
 *     ...
 *     ```
 *
 *     ```mermaid
 *     sequenceDiagram
 *     ...
 *     ```
 *
 *     ### Deployment
 *
 *     ```mermaid
 *     flowchart LR
 *     ...
 *     ```
 *
 *     ```mermaid
 *     sequenceDiagram
 *     ...
 *     ```
 *
 * E2 templates (no services) skip the Local development section.
 * E3 stack templates emit a single `### Overview` sub-section instead.
 * E4 overlay templates return null.
 */
/**
 * Build the structured model for a template. Walks the existing per-diagram
 * helpers and assembles them into the `ArchitectureModel` shape that the
 * emitter then renders. See the interface comments above for the shape.
 *
 * Archetype mapping:
 *   - overlay                      → `{ sections: [] }`
 *   - stack                        → one "Overview" section with 1–2 diagrams
 *   - app + services + manifest    → two sections (Local development, Deployment)
 *   - app + manifest, no services  → one section (Deployment)
 *
 * Diagram names are per the Components / Flow vocabulary locked in by the
 * upstream investigation (PLAN-architecture-diagram-display § Naming).
 */
export function buildArchitectureModel(entry: TemplateEntry): ArchitectureModel {
  if (entry.install_type === 'overlay') {
    return { sections: [] };
  }

  if (entry.install_type === 'stack') {
    const flowchart = buildStackFlowchart(entry);
    const sequence = buildStackSequence(entry);

    const diagrams: ArchitectureDiagram[] = [
      { name: 'Components', mermaid: flowchart },
    ];
    if (sequence !== null) {
      diagrams.push({ name: 'Flow', mermaid: sequence });
    }
    return {
      sections: [{ title: 'Overview', diagrams }],
    };
  }

  // App templates (E1 and E2)
  const localDevFlowchart = buildLocalDevFlowchart(entry);
  const localDevSequence = buildLocalDevSequence(entry);
  const deployFlowchart = buildDeployFlowchart(entry);
  const deploySequence = buildDeploySequence(entry);

  const sections: ArchitectureSection[] = [];

  // Local development — only if the flowchart is non-null (E2 skips it)
  if (localDevFlowchart !== null) {
    const diagrams: ArchitectureDiagram[] = [
      { name: 'Components', mermaid: localDevFlowchart },
    ];
    if (localDevSequence !== null) {
      diagrams.push({ name: 'Flow', mermaid: localDevSequence });
    }
    sections.push({ title: 'Local development', diagrams });
  }

  // Deployment — always present for app templates
  if (deployFlowchart !== null) {
    const diagrams: ArchitectureDiagram[] = [
      { name: 'Components', mermaid: deployFlowchart },
    ];
    if (deploySequence !== null) {
      diagrams.push({ name: 'Flow', mermaid: deploySequence });
    }
    sections.push({ title: 'Deployment', diagrams });
  }

  return { sections };
}

/**
 * Backward-compatible wrapper that returns the pre-composed MDX string
 * inside `{ mdx }`. Kept for existing call sites (`generate-registry.ts`,
 * unit tests) and for any future caller that just wants the rendered
 * output without touching the model directly.
 *
 * Implementation is a straight pipe: build the model, run the emitter.
 * The emitter lives in a separate module so its phase-4 changes (wrapping
 * each diagram in a `<details>` block) don't touch this file.
 */
export function buildArchitectureMdx(entry: TemplateEntry): ArchitectureResult {
  const model = buildArchitectureModel(entry);
  return { mdx: emitArchitectureMdx(model) };
}
