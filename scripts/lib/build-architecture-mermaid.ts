/**
 * build-architecture-mermaid.ts — Per-template Mermaid diagram builder
 *
 * Generates the auto-generated `## Architecture` section for each template's
 * documentation page. Called from `scripts/generate-registry.ts` during
 * registry construction; the output is stored as a single `architectureMdx`
 * string field on each template's registry entry and then pasted verbatim
 * into the MDX page by `scripts/generate-docs-markdown.sh`.
 *
 * Why one composed field (not two separate flowchart/sequence strings): the
 * project's TypeScript-first preference — all conditional logic (headings,
 * optional sub-sections, overlay skip) lives here, and the bash emit step is
 * a dumb pipe (`jq -r` + `echo`). See
 * `website/docs/ai-developer/plans/backlog/PLAN-template-architecture-diagram.md`
 * § Overview — TypeScript-first composition shape.
 *
 * Four template archetypes handled (see INVESTIGATE-template-architecture-diagram.md § E):
 *   E1  app + services + manifest  (e.g. python-basic-webserver-database)
 *         -> flowchart + sequence
 *   E2  app + manifest, no services (e.g. python-basic-webserver)
 *         -> flowchart only (sequence null — nothing interesting to show)
 *   E3  stack + services           (e.g. postgresql-demo)
 *         -> flowchart + sequence (using `uis template install <id>`)
 *   E4  overlay                    (e.g. plan-based-workflow)
 *         -> both null, entire ## Architecture section suppressed
 *
 * Visual style is deliberately aligned with website/docs/architecture.md —
 * plain text labels, no emojis, default Mermaid theming, subgraphs for
 * grouping. The subgraph label "Local Kubernetes Cluster (Test environment)"
 * matches the canonical architecture.md diagram exactly.
 *
 * v1 limitations (see PLAN § Open design decisions O4):
 *   - Multi-service templates (resolvedServices.length > 1) throw at build
 *     time. Not currently hit by any of the 10 templates.
 *   - Stack template "consumer" node is a hardcoded generic label, not
 *     derived from cross-template data.
 *   - The sequence diagram's "run the app" step reads `quickstart.run`
 *     verbatim; templates with services but no `run` field throw with a
 *     clear error pointing at the missing field.
 */

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
    commands?: string[];
    run?: string;
    note?: string;
  };
}

export interface ArchitectureResult {
  mdx: string | null;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Node id for a DCT tool. Mermaid node ids tolerate dashes, but converting
 * to underscores avoids any parser ambiguity and keeps ids looking like
 * identifiers (matches canonical architecture.md style).
 */
function toolNodeId(id: string): string {
  return id.replace(/-/g, '_');
}

/**
 * Label for the app node. Precedence:
 *   params.app_name  ->  entry.name  ->  entry.id
 * No string normalization — whatever the template author wrote is what
 * shows up in the diagram. Templates without params (E2) fall back to the
 * human-readable name.
 */
function appNodeLabel(entry: TemplateEntry): string {
  return entry.params?.app_name ?? entry.name ?? entry.id;
}

/**
 * Guard helper — assert at most one service for v1.
 */
function assertSingleService(entry: TemplateEntry): void {
  if (entry.resolvedServices.length > 1) {
    throw new Error(
      `build-architecture-mermaid: template "${entry.id}" has ` +
        `${entry.resolvedServices.length} services; multi-service diagrams ` +
        `are not yet supported in v1. See ` +
        `PLAN-template-architecture-diagram.md § Open design decisions O4.`,
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Flowchart builder
// ────────────────────────────────────────────────────────────────────────────

/**
 * Build the steady-state flowchart string (no fence). Returns null for
 * overlay templates.
 */
export function buildFlowchart(entry: TemplateEntry): string | null {
  if (entry.install_type === 'overlay') return null;
  assertSingleService(entry);

  const isStack = entry.install_type === 'stack';
  if (isStack) {
    return buildStackFlowchart(entry);
  }
  return buildAppFlowchart(entry);
}

function buildStackFlowchart(entry: TemplateEntry): string {
  const lines: string[] = ['flowchart LR'];
  const svc = entry.resolvedServices[0];

  // Developer lives inside the DCT subgraph — commands are run from DCT's
  // shell, so edges from dev visually originate inside the DCT box.
  // Stadium shape `([…])` distinguishes a person from container boxes.
  lines.push('    subgraph dct["DCT devcontainer"]');
  lines.push('        dev(["Developer"])');
  lines.push('    end');
  lines.push('    subgraph k8s["Local Kubernetes Cluster (Test environment)"]');
  if (svc) {
    const label = svc.database ? `${svc.name}<br/>${svc.database}` : svc.name;
    lines.push(`        svc[("${label}")]`);
  }
  lines.push('    end');
  // UIS wrapped in a subgraph for visual parity with k8s (filled background).
  // Subgraph id is uis_group; inner node id stays `uis` so edges resolve.
  lines.push('    subgraph uis_group["UIS"]');
  lines.push('        uis["provision-host"]');
  lines.push('    end');
  lines.push('    consumers["Consumer templates"]');
  lines.push('');
  lines.push(`    dev -->|uis template install ${entry.id}| uis`);
  if (svc) {
    lines.push('    uis -->|deploys + seeds| svc');
    lines.push('    consumers -.->|use this| svc');
  }

  return lines.join('\n');
}

function buildAppFlowchart(entry: TemplateEntry): string {
  const lines: string[] = ['flowchart LR'];

  const hasTools = entry.resolvedTools.length > 0;
  const hasServices = entry.resolvedServices.length > 0;
  const hasManifest = !!entry.manifest;
  const svc = hasServices ? entry.resolvedServices[0] : undefined;
  const appLabel = appNodeLabel(entry);

  // DCT subgraph — developer + tools + app + (conditional) .env.
  // Developer lives inside DCT because that's where commands are typed;
  // edges from `dev` (stadium shape) visually originate inside the DCT box.
  if (hasTools || hasManifest) {
    lines.push('    subgraph dct["DCT devcontainer"]');
    lines.push('        dev(["Developer"])');
    for (const tool of entry.resolvedTools) {
      lines.push(`        ${toolNodeId(tool.id)}["${tool.id}"]`);
    }
    lines.push(`        app["${appLabel}"]`);
    // The .env file only exists when UIS writes it during configure, which
    // only happens when there's a service to wire credentials for.
    if (hasManifest && hasServices) {
      lines.push('        env[".env"]');
    }
    lines.push('    end');
  }

  // K8s subgraph — service + (conditional) secret + (conditional) argo/pod
  if (hasServices || hasManifest) {
    lines.push('    subgraph k8s["Local Kubernetes Cluster (Test environment)"]');
    if (hasServices && svc) {
      const label = svc.database ? `${svc.name}<br/>${svc.database}` : svc.name;
      lines.push(`        svc[("${label}")]`);
    }
    // Secret only renders when there's a service to hold credentials for.
    if (hasManifest && hasServices) {
      lines.push(`        sec["K8s Secret<br/>${entry.manifest!.secretName}"]`);
    }
    if (hasManifest) {
      lines.push('        argo["ArgoCD"]');
      lines.push(`        pod["${appLabel} pod"]`);
    }
    lines.push('    end');
  }

  // UIS wrapped in a subgraph for visual parity with dct/k8s/gh.
  // Subgraph id is uis_group; the inner node keeps id `uis` so the existing
  // edges (`uis -->|creates| svc`, etc.) continue to resolve — Mermaid 10
  // does not reliably resolve a subgraph id as an edge source.
  if (hasServices) {
    lines.push('    subgraph uis_group["UIS"]');
    lines.push('        uis["provision-host"]');
    lines.push('    end');
  }

  // GitHub subgraph — always for app templates (code goes somewhere)
  lines.push('    subgraph gh["GitHub"]');
  lines.push('        repo["repo"]');
  lines.push('        actions["GitHub Actions"]');
  lines.push('        ghcr["Container Registry"]');
  lines.push('    end');

  // Edge section
  lines.push('');

  // DCT-internal: each tool flows into the app; .env too if present
  for (const tool of entry.resolvedTools) {
    lines.push(`    ${toolNodeId(tool.id)} --> app`);
  }
  if (hasManifest && hasServices) {
    lines.push('    env --> app');
  }

  // DCT → UIS → service/secret/env provisioning edges
  if (hasServices && svc) {
    // Developer initiates the flow by running `dev-template configure`.
    lines.push('    dev -->|dev-template configure| uis');
    lines.push('    uis -->|creates + port-forward| svc');
    if (hasManifest) {
      lines.push('    uis -->|creates| sec');
      lines.push('    uis -->|writes| env');
    }
    // Runtime connection: the app dials host.docker.internal, which is the
    // local endpoint UIS exposes for its kubectl port-forward tunnel. Traffic
    // reaches postgres via UIS, not via a direct DCT→k8s connection.
    const port = svc.exposePort ?? 35432;
    lines.push(`    app -->|host.docker.internal:${port}| uis`);
  }

  // Developer pushes code to the remote repo.
  lines.push('    dev -->|git push| repo');
  lines.push('    repo -->|trigger| actions');
  lines.push('    actions -->|push image| ghcr');
  if (hasManifest) {
    lines.push('    argo -->|monitors| repo');
    lines.push('    ghcr -->|image pull| argo');
    lines.push('    argo -->|deploys| pod');
    if (hasServices && svc) {
      const ns = svc.namespace ?? 'default';
      lines.push(`    pod -->|${ns}.svc.cluster.local:5432| svc`);
    }
  }

  return lines.join('\n');
}

// ────────────────────────────────────────────────────────────────────────────
// Sequence builder
// ────────────────────────────────────────────────────────────────────────────

/**
 * Build the configure-time sequence diagram string (no fence). Returns null
 * for overlay templates AND for app templates with no services (nothing
 * interesting to show).
 */
export function buildSequence(entry: TemplateEntry): string | null {
  if (entry.install_type === 'overlay') return null;
  if (entry.resolvedServices.length === 0) return null;
  assertSingleService(entry);

  const svc = entry.resolvedServices[0];
  const lines: string[] = ['sequenceDiagram'];
  lines.push('    participant Dev as Developer');
  lines.push('    participant DCT as DCT devcontainer');
  lines.push('    participant UIS as UIS provision-host');
  lines.push('    participant K8s as Local Kubernetes cluster');

  const port = svc.exposePort ?? 35432;
  const svcLabel = svc.database ? `${svc.name} (${svc.database})` : svc.name;

  if (entry.install_type === 'stack') {
    lines.push(`    Dev->>DCT: uis template install ${entry.id}`);
    lines.push('    DCT->>UIS: install stack');
    lines.push(`    UIS->>K8s: create ${svcLabel}`);
    if (svc.initFilePath) {
      lines.push('    UIS->>K8s: run init-*.sql seed files');
    }
    lines.push(`    UIS->>UIS: kubectl port-forward ${port}`);
    lines.push('    UIS-->>DCT: return connection JSON');
    return lines.join('\n');
  }

  // App template with services — configure → run → connect flow
  const runCmd = entry.quickstart?.run;
  if (!runCmd) {
    throw new Error(
      `build-architecture-mermaid: template "${entry.id}" has services ` +
        `but no quickstart.run field. Required for sequence-diagram ` +
        `generation. Add a "run" field to the template-info.yaml ` +
        `quickstart block (e.g. run: "uv run python app/app.py").`,
    );
  }
  lines.push('    Dev->>DCT: dev-template configure');
  lines.push('    DCT->>UIS: request provisioning');
  lines.push('    UIS->>K8s: create namespace');
  lines.push(`    UIS->>K8s: create ${svcLabel}`);
  if (entry.manifest) {
    lines.push(`    UIS->>K8s: create K8s Secret (${entry.manifest.secretName})`);
  }
  lines.push(`    UIS->>UIS: kubectl port-forward ${port}`);
  lines.push(`    UIS-->>DCT: write .env (host.docker.internal:${port})`);
  lines.push(`    Dev->>DCT: ${runCmd}`);
  lines.push(`    DCT->>K8s: connect via host.docker.internal:${port}`);

  return lines.join('\n');
}

// ────────────────────────────────────────────────────────────────────────────
// Top-level entry point
// ────────────────────────────────────────────────────────────────────────────

/**
 * Compose the full `## Architecture` MDX section for a template. Returns
 * `{ mdx: null }` for overlay templates (caller skips the section).
 *
 * Output shape:
 *
 *     ## Architecture
 *
 *     ### Steady-state
 *
 *     ```mermaid
 *     flowchart LR
 *     ...
 *     ```
 *
 *     ### Configure flow       (only if sequence is non-null)
 *
 *     ```mermaid
 *     sequenceDiagram
 *     ...
 *     ```
 */
export function buildArchitectureMdx(entry: TemplateEntry): ArchitectureResult {
  const flowchart = buildFlowchart(entry);
  if (flowchart === null) return { mdx: null };

  const sequence = buildSequence(entry);

  const parts: string[] = [];
  parts.push('## Architecture');
  parts.push('');
  parts.push('### Steady-state');
  parts.push('');
  parts.push('```mermaid');
  parts.push(flowchart);
  parts.push('```');

  if (sequence !== null) {
    parts.push('');
    parts.push('### Configure flow');
    parts.push('');
    parts.push('```mermaid');
    parts.push(sequence);
    parts.push('```');
  }

  return { mdx: parts.join('\n') + '\n' };
}
