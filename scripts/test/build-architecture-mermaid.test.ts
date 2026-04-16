/**
 * build-architecture-mermaid.test.ts — Unit tests for the v2 builder.
 *
 * Run with:
 *   npx tsx --test scripts/test/build-architecture-mermaid.test.ts
 *
 * Uses node:test (built into Node >= 18) and node:assert/strict.
 *
 * Fixtures are inline — hand-built TemplateEntry shapes for each archetype.
 * We deliberately do NOT load the real template-registry.json so tests stay
 * hermetic and decoupled from live template data.
 *
 * v2 shape: each app template gets a Local development section (flowchart
 * + sequence) and a Deployment section (flowchart + sequence). E2 templates
 * without services skip the Local development section. Stack templates get
 * a single Overview section. Overlay templates return null.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildArchitectureMdx,
  buildLocalDevFlowchart,
  buildLocalDevSequence,
  buildDeployFlowchart,
  buildDeploySequence,
  type TemplateEntry,
} from '../lib/build-architecture-mermaid.ts';

// ────────────────────────────────────────────────────────────────────────────
// Fixtures — one per archetype
// ────────────────────────────────────────────────────────────────────────────

/** E1 — app + services + manifest (python-basic-webserver-database shape) */
const e1Fixture: TemplateEntry = {
  id: 'python-basic-webserver-database',
  name: 'Python Basic Webserver with Database',
  install_type: 'app',
  params: {
    app_name: 'my-app',
    database_name: 'my_app_db',
  },
  manifest: {
    envVar: 'DATABASE_URL',
    secretName: 'my-app-db',
    containerPort: 3000,
  },
  resolvedTools: [{ id: 'dev-python', name: 'Python Development Tools' }],
  resolvedServices: [
    {
      id: 'postgresql',
      name: 'PostgreSQL',
      database: 'my_app_db',
      exposePort: 35432,
      namespace: 'default',
      initFilePath: 'config/init-database.sql',
    },
  ],
  quickstart: {
    title: 'Run the Flask app',
    setup: ['uv venv', 'uv pip install -r requirements.txt'],
    run: 'uv run python app/app.py',
  },
  configureCommand: 'dev-template configure',
};

/** E2 — app + manifest, no services (python-basic-webserver shape) */
const e2Fixture: TemplateEntry = {
  id: 'python-basic-webserver',
  name: 'Python Basic Webserver',
  install_type: 'app',
  params: {
    app_name: 'my-app',
  },
  manifest: {
    envVar: 'PORT',
    secretName: 'my-app-db',
    containerPort: 3000,
  },
  resolvedTools: [{ id: 'dev-python', name: 'Python Development Tools' }],
  resolvedServices: [],
  quickstart: {
    title: 'Run the Flask app',
    setup: ['uv venv', 'uv pip install -r requirements.txt'],
    run: 'uv run python app/app.py',
  },
};

/** E3 — stack + services (postgresql-demo shape) */
const e3Fixture: TemplateEntry = {
  id: 'postgresql-demo',
  name: 'PostgreSQL Demo',
  install_type: 'stack',
  params: {
    app_name: 'demo-app',
    database_name: 'demo_db',
  },
  resolvedTools: [],
  resolvedServices: [
    {
      id: 'postgresql',
      name: 'PostgreSQL',
      database: 'demo_db',
      exposePort: 35432,
      namespace: 'default',
      initFilePath: 'config/init-database.sql',
    },
  ],
  quickstart: {
    title: 'Verify the database',
    setup: [],
    run: 'uis connect postgresql demo_db',
  },
  configureCommand: 'uis template install postgresql-demo',
};

/** E4 — overlay (plan-based-workflow shape) */
const e4Fixture: TemplateEntry = {
  id: 'plan-based-workflow',
  name: 'Plan-based Workflow',
  install_type: 'overlay',
  resolvedTools: [],
  resolvedServices: [],
};

// ────────────────────────────────────────────────────────────────────────────
// E1 — app + services + manifest: BOTH diagrams rendered
// ────────────────────────────────────────────────────────────────────────────

test('E1: app + services + manifest emits Local development + Deployment', () => {
  const result = buildArchitectureMdx(e1Fixture);
  assert.ok(result.mdx !== null, 'mdx should be non-null');
  const mdx = result.mdx!;

  // Section skeleton — the output is wrapped in a card container
  // (added by PR #65 — "Architecture as a card") so `## Architecture`
  // is no longer at column 0. The card wrapper is the new prefix.
  assert.match(mdx, /^<div className="templateCard">/, 'wrapped in templateCard');
  assert.match(mdx, /<div className="templateCardEyebrow">ARCHITECTURE<\/div>/);
  assert.match(mdx, /## Architecture/);
  assert.match(mdx, /### Local development/);
  assert.match(mdx, /### Deployment/);

  // Count the mermaid fences — should be 4 (2 flowcharts + 2 sequences)
  const fences = (mdx.match(/```mermaid/g) || []).length;
  assert.equal(fences, 4, 'should have 4 mermaid fences (2 flowcharts + 2 sequences)');

  // Local dev flowchart content
  assert.match(mdx, /dev\(\["Developer"\]\)/);
  assert.match(mdx, /browser\["Web Browser"\]/);
  assert.match(mdx, /subgraph dct\["DCT devcontainer"\]/);
  assert.match(mdx, /tmpl\["template-info\.yaml"\]/);
  assert.match(mdx, /cfg\["dev-template configure"\]/);
  assert.match(mdx, /subgraph uis_group\["UIS container"\]/);
  assert.match(mdx, /uis\["uis CLI"\]/);
  assert.match(mdx, /svc\[\("PostgreSQL<br\/>my_app_db"\)\]/);
  assert.match(mdx, /sec\["K8s Secret<br\/>my-app-db"\]/);
  assert.match(mdx, /dev -->\|runs\| cfg/);
  assert.match(mdx, /dev -->\|uv run python app\/app\.py\| app/);
  assert.match(mdx, /tmpl -->\|read by\| cfg/);
  assert.match(mdx, /cfg -->\|sends config to\| uis/);
  assert.match(mdx, /uis -->\|creates \+ port-forward\| svc/);
  assert.match(mdx, /app -->\|host\.docker\.internal:35432\| uis/);
  assert.match(mdx, /app -\.->\|port 3000\| browser/);

  // Deploy flowchart content
  assert.match(mdx, /src\["source code"\]/);
  assert.match(mdx, /subgraph gh\["GitHub"\]/);
  assert.match(mdx, /traefik\["Traefik Ingress"\]/);
  assert.match(mdx, /argo\["ArgoCD"\]/);
  assert.match(mdx, /pod\["my-app pod"\]/);
  assert.match(mdx, /dev -->\|git push\| src/);
  assert.match(mdx, /argo -->\|monitors\| repo/);
  assert.match(mdx, /sec -->\|DATABASE_URL\| pod/);
  assert.match(mdx, /pod -->\|default\.svc\.cluster\.local:5432\| svc/);
  assert.match(mdx, /browser -->\|my-app\.localhost\| traefik/);

  // Configure sequence content
  assert.match(mdx, /participant DB as PostgreSQL/);
  assert.match(mdx, /alt PostgreSQL not deployed/);
  assert.match(mdx, /UIS->>K8s: deploy PostgreSQL/);
  assert.match(mdx, /UIS->>DB: create database my_app_db \+ user/);
  assert.match(mdx, /UIS->>DB: run init-\*\.sql seed files/);
  assert.match(mdx, /Dev->>DCT: uv run python app\/app\.py/);
  assert.match(mdx, /DCT->>UIS: connect via host\.docker\.internal:35432/);
  assert.match(mdx, /UIS->>DB: forward connection/);

  // Deploy sequence content
  assert.match(mdx, /Argo->>K8s: deploy my-app pod/);
  assert.match(mdx, /K8s->>K8s: mount K8s Secret \(DATABASE_URL\)/);
  assert.match(mdx, /K8s->>DB: pod connects via default\.svc\.cluster\.local:5432/);
  assert.match(mdx, /Note over Dev,K8s: App now accessible at my-app\.localhost via Traefik/);

  // Must NOT contain stack-only labels
  assert.doesNotMatch(mdx, /uis template install/);
  assert.doesNotMatch(mdx, /Consumer templates/);
});

// ────────────────────────────────────────────────────────────────────────────
// E2 — app + manifest, no services: Local development SUPPRESSED
// ────────────────────────────────────────────────────────────────────────────

test('E2: app without services skips Local development, emits Deployment only', () => {
  const result = buildArchitectureMdx(e2Fixture);
  assert.ok(result.mdx !== null);
  const mdx = result.mdx!;

  // Section skeleton — Deployment present, Local development absent
  assert.match(mdx, /## Architecture/);
  assert.match(mdx, /### Deployment/);
  assert.doesNotMatch(mdx, /### Local development/, 'no Local development sub-heading');

  // Only 2 mermaid fences (deploy flowchart + deploy sequence)
  const fences = (mdx.match(/```mermaid/g) || []).length;
  assert.equal(fences, 2, 'should have 2 mermaid fences (deploy flowchart + sequence)');

  // Deploy flowchart rendered without secret/svc nodes (no services)
  assert.match(mdx, /pod\["my-app pod"\]/);
  assert.match(mdx, /argo\["ArgoCD"\]/);
  assert.match(mdx, /browser -->\|my-app\.localhost\| traefik/);
  assert.doesNotMatch(mdx, /svc\[\(/, 'no service cylinder node');
  assert.doesNotMatch(mdx, /sec\["K8s Secret/, 'no secret node (no services)');
  assert.doesNotMatch(mdx, /pod -->\|.*:5432\| svc/, 'no pod-to-service edge');

  // Deploy sequence does NOT have DB participant
  assert.doesNotMatch(mdx, /participant DB/);
  assert.doesNotMatch(mdx, /K8s->>DB:/);

  // Internal helpers: buildLocalDevFlowchart returns null for E2
  assert.equal(buildLocalDevFlowchart(e2Fixture), null);
  assert.equal(buildLocalDevSequence(e2Fixture), null);
});

// ────────────────────────────────────────────────────────────────────────────
// E3 — stack + services: single Overview sub-section
// ────────────────────────────────────────────────────────────────────────────

test('E3: stack template emits a single ### Overview section', () => {
  const result = buildArchitectureMdx(e3Fixture);
  assert.ok(result.mdx !== null);
  const mdx = result.mdx!;

  // Section skeleton — Overview, not Local development/Deployment
  assert.match(mdx, /## Architecture/);
  assert.match(mdx, /### Overview/);
  assert.doesNotMatch(mdx, /### Local development/);
  assert.doesNotMatch(mdx, /### Deployment/);

  // Two fences (flowchart + sequence)
  const fences = (mdx.match(/```mermaid/g) || []).length;
  assert.equal(fences, 2);

  // Stack flowchart content
  assert.match(mdx, /subgraph uis_group\["UIS container"\]/);
  assert.match(mdx, /svc\[\("PostgreSQL<br\/>demo_db"\)\]/);
  assert.match(mdx, /consumers\["Consumer templates"\]/);
  assert.match(mdx, /dev -->\|uis template install postgresql-demo\| uis/);
  assert.match(mdx, /uis -->\|deploys \+ seeds\| svc/);
  assert.match(mdx, /consumers -\.->\|use this\| svc/);

  // Stack templates have no GitHub or ArgoCD
  assert.doesNotMatch(mdx, /subgraph gh\["GitHub"\]/);
  assert.doesNotMatch(mdx, /argo/);
  assert.doesNotMatch(mdx, /traefik/);

  // Stack sequence uses uis template install, not dev-template configure
  assert.match(mdx, /Dev->>DCT: uis template install postgresql-demo/);
  assert.match(mdx, /UIS->>DB: create database demo_db \+ user/);
  assert.doesNotMatch(mdx, /dev-template configure/);
});

// ────────────────────────────────────────────────────────────────────────────
// E4 — overlay: null for everything
// ────────────────────────────────────────────────────────────────────────────

test('E4: overlay template returns null for everything', () => {
  const result = buildArchitectureMdx(e4Fixture);
  assert.equal(result.mdx, null);
  assert.equal(buildLocalDevFlowchart(e4Fixture), null);
  assert.equal(buildLocalDevSequence(e4Fixture), null);
  assert.equal(buildDeployFlowchart(e4Fixture), null);
  assert.equal(buildDeploySequence(e4Fixture), null);
});

// ────────────────────────────────────────────────────────────────────────────
// Determinism — catches Object.keys() ordering bugs that would pollute diffs
// ────────────────────────────────────────────────────────────────────────────

test('determinism: building the same fixture twice yields byte-identical output', () => {
  const a = buildArchitectureMdx(e1Fixture);
  const b = buildArchitectureMdx(e1Fixture);
  assert.equal(a.mdx, b.mdx);
});

// ────────────────────────────────────────────────────────────────────────────
// Error paths
// ────────────────────────────────────────────────────────────────────────────

test('app template with services but missing quickstart.run throws', () => {
  const broken: TemplateEntry = {
    ...e1Fixture,
    quickstart: {
      title: 'Run the Flask app',
      setup: ['uv venv'],
      // run field missing
    },
  };
  assert.throws(
    () => buildLocalDevFlowchart(broken),
    /quickstart\.run field/,
    'error should mention the missing field',
  );
});

test('multi-service template throws (v1/v2 limitation)', () => {
  const multi: TemplateEntry = {
    ...e1Fixture,
    resolvedServices: [
      ...e1Fixture.resolvedServices,
      {
        id: 'redis',
        name: 'Redis',
        exposePort: 36379,
        namespace: 'default',
      },
    ],
  };
  assert.throws(
    () => buildLocalDevFlowchart(multi),
    /multi-service diagrams are not yet supported/,
  );
});

// ────────────────────────────────────────────────────────────────────────────
// Hostname derivation — params.app_name → entry.id fallback
// ────────────────────────────────────────────────────────────────────────────

test('hostname uses params.app_name when present', () => {
  const flowchart = buildDeployFlowchart(e1Fixture);
  assert.ok(flowchart !== null);
  assert.match(flowchart!, /browser -->\|my-app\.localhost\| traefik/);
});

// ────────────────────────────────────────────────────────────────────────────
// configureCommand wiring — the value comes from the registry entry, not
// hardcoded strings in the builder
// ────────────────────────────────────────────────────────────────────────────

test('E1 configureCommand override changes both flowchart cfg node and sequence Dev->>DCT line', () => {
  const custom: TemplateEntry = {
    ...e1Fixture,
    configureCommand: 'custom-cmd --flag',
  };
  const flowchart = buildLocalDevFlowchart(custom);
  const sequence = buildLocalDevSequence(custom);
  assert.ok(flowchart !== null);
  assert.ok(sequence !== null);
  assert.match(flowchart!, /cfg\["custom-cmd --flag"\]/);
  assert.match(sequence!, /Dev->>DCT: custom-cmd --flag/);
  assert.doesNotMatch(flowchart!, /cfg\["dev-template configure"\]/);
});

test('E1 falls back to "dev-template configure" when configureCommand is undefined', () => {
  const noCmd: TemplateEntry = {
    ...e1Fixture,
    configureCommand: undefined,
  };
  const flowchart = buildLocalDevFlowchart(noCmd);
  assert.ok(flowchart !== null);
  assert.match(flowchart!, /cfg\["dev-template configure"\]/);
});

test('E3 stack configureCommand override changes both flowchart edge label and sequence', () => {
  const custom: TemplateEntry = {
    ...e3Fixture,
    configureCommand: 'custom-install-cmd postgresql',
  };
  const result = buildArchitectureMdx(custom);
  assert.ok(result.mdx !== null);
  const mdx = result.mdx!;
  assert.match(mdx, /dev -->\|custom-install-cmd postgresql\| uis/);
  assert.match(mdx, /Dev->>DCT: custom-install-cmd postgresql/);
  assert.doesNotMatch(mdx, /uis template install postgresql-demo/);
});

test('hostname falls back to entry.id when params.app_name is absent', () => {
  const noParams: TemplateEntry = {
    ...e2Fixture,
    params: undefined,
  };
  const flowchart = buildDeployFlowchart(noParams);
  assert.ok(flowchart !== null);
  // entry.id = 'python-basic-webserver'
  assert.match(flowchart!, /browser -->\|python-basic-webserver\.localhost\| traefik/);
});
