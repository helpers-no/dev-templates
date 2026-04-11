/**
 * build-architecture-mermaid.test.ts — Unit tests for the architecture
 * diagram builder. First test file in this repo; establishes the pattern
 * for future scripts/ unit tests.
 *
 * Run with:
 *   npx tsx --test scripts/test/build-architecture-mermaid.test.ts
 * Or (if --test passthrough is unavailable):
 *   npx tsx scripts/test/build-architecture-mermaid.test.ts
 *
 * Uses node:test (built into Node >= 18) and node:assert/strict. No external
 * test framework.
 *
 * Fixtures are inline — hand-built TemplateEntry shapes for each archetype.
 * We deliberately do NOT load the real template-registry.json so tests stay
 * hermetic and decoupled from live template data.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildArchitectureMdx,
  buildFlowchart,
  buildSequence,
  type TemplateEntry,
} from '../lib/build-architecture-mermaid.ts';

// ────────────────────────────────────────────────────────────────────────────
// Fixtures — one per archetype from INVESTIGATE § E
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
    commands: ['uv venv', 'uv pip install -r requirements.txt', 'uv run python app/app.py'],
    run: 'uv run python app/app.py',
  },
};

/** E2 — app + manifest, no services (python-basic-webserver shape, no params) */
const e2Fixture: TemplateEntry = {
  id: 'python-basic-webserver',
  name: 'Python Basic Webserver',
  install_type: 'app',
  manifest: {
    envVar: 'PORT',
    secretName: 'python-basic-webserver-db',
    containerPort: 3000,
  },
  resolvedTools: [{ id: 'dev-python', name: 'Python Development Tools' }],
  resolvedServices: [],
  quickstart: {
    title: 'Run the Flask app',
    commands: ['uv venv', 'uv pip install -r requirements.txt', 'uv run python app/app.py'],
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
    commands: ['uis connect postgresql demo_db'],
    run: 'uis connect postgresql demo_db',
  },
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
// E1 — app + services + manifest
// ────────────────────────────────────────────────────────────────────────────

test('E1: app + services + manifest emits both flowchart and sequence', () => {
  const result = buildArchitectureMdx(e1Fixture);
  assert.ok(result.mdx !== null, 'mdx should be non-null');
  const mdx = result.mdx!;

  // Section skeleton
  assert.match(mdx, /^## Architecture\n/, 'starts with ## Architecture');
  assert.match(mdx, /### Steady-state/, 'has Steady-state sub-heading');
  assert.match(mdx, /### Configure flow/, 'has Configure flow sub-heading');
  assert.match(mdx, /```mermaid\nflowchart LR/, 'has flowchart fence');
  assert.match(mdx, /```mermaid\nsequenceDiagram/, 'has sequenceDiagram fence');

  // Flowchart content
  assert.match(mdx, /subgraph dct\["DCT devcontainer"\]/);
  assert.match(mdx, /subgraph k8s\["Local Kubernetes Cluster \(Test environment\)"\]/);
  assert.match(mdx, /dev_python\["dev-python"\]/);
  assert.match(mdx, /app\["my-app"\]/);
  assert.match(mdx, /env\[".env"\]/);
  assert.match(mdx, /svc\[\("PostgreSQL<br\/>my_app_db"\)\]/);
  assert.match(mdx, /sec\["K8s Secret<br\/>my-app-db"\]/);
  assert.match(mdx, /argo\["ArgoCD"\]/);
  assert.match(mdx, /pod\["my-app pod"\]/);
  assert.match(mdx, /subgraph uis_group\["UIS"\]/);
  assert.match(mdx, /uis\["provision-host"\]/);
  assert.match(mdx, /subgraph gh\["GitHub"\]/);

  // Developer actor + human-triggered edges
  assert.match(mdx, /dev\(\["Developer"\]\)/);
  assert.match(mdx, /dev -->\|dev-template configure\| uis/);
  assert.match(mdx, /dev -->\|git push\| repo/);

  // Runtime + provisioning edges
  assert.match(mdx, /app -->\|host\.docker\.internal:35432\| uis/);
  assert.match(mdx, /uis -->\|creates \+ port-forward\| svc/);
  assert.match(mdx, /argo -->\|monitors\| repo/);
  assert.match(mdx, /ghcr -->\|image pull\| argo/);
  assert.match(mdx, /argo -->\|deploys\| pod/);
  assert.match(mdx, /pod -->\|default\.svc\.cluster\.local:5432\| svc/);
  assert.match(mdx, /uis -->\|writes\| env/);

  // Sequence content
  assert.match(mdx, /Dev->>DCT: dev-template configure/);
  assert.match(mdx, /UIS->>K8s: create PostgreSQL \(my_app_db\)/);
  assert.match(mdx, /UIS->>K8s: create K8s Secret \(my-app-db\)/);
  assert.match(mdx, /UIS->>UIS: kubectl port-forward 35432/);
  assert.match(mdx, /UIS-->>DCT: write \.env \(host\.docker\.internal:35432\)/);
  assert.match(mdx, /Dev->>DCT: uv run python app\/app\.py/);
  assert.match(mdx, /DCT->>K8s: connect via host\.docker\.internal:35432/);

  // Must NOT contain stack-template install command
  assert.doesNotMatch(mdx, /uis template install/, 'E1 should not show uis template install');
});

// ────────────────────────────────────────────────────────────────────────────
// E2 — app + manifest, no services
// ────────────────────────────────────────────────────────────────────────────

test('E2: app + manifest, no services emits flowchart only', () => {
  const result = buildArchitectureMdx(e2Fixture);
  assert.ok(result.mdx !== null, 'mdx should be non-null');
  const mdx = result.mdx!;

  // Flowchart present
  assert.match(mdx, /^## Architecture\n/);
  assert.match(mdx, /### Steady-state/);
  assert.match(mdx, /```mermaid\nflowchart LR/);

  // Sequence absent — no Configure flow sub-heading or fence
  assert.doesNotMatch(mdx, /### Configure flow/, 'E2 has no Configure flow sub-heading');
  assert.doesNotMatch(mdx, /sequenceDiagram/, 'E2 has no sequence diagram');

  // ArgoCD + pod still rendered because manifest exists
  assert.match(mdx, /argo\["ArgoCD"\]/);
  assert.match(mdx, /pod\["Python Basic Webserver pod"\]/); // app label falls back to entry.name

  // No service-related nodes or edges
  assert.doesNotMatch(mdx, /svc\[/, 'no service node');
  assert.doesNotMatch(mdx, /uis_group/, 'no UIS subgraph (services required)');
  assert.doesNotMatch(mdx, /host\.docker\.internal/, 'no port-forward edge');
  assert.doesNotMatch(mdx, /sec\[/, 'no secret node (requires a service)');
  assert.doesNotMatch(mdx, /env\[/, 'no .env node (requires UIS to write it)');

  // Developer actor + GitHub + deploy chain still present
  assert.match(mdx, /dev\(\["Developer"\]\)/);
  assert.match(mdx, /dev -->\|git push\| repo/);
  assert.match(mdx, /argo -->\|monitors\| repo/);
  assert.match(mdx, /ghcr -->\|image pull\| argo/);
  assert.match(mdx, /argo -->\|deploys\| pod/);
});

test('E2: app label falls back to entry.name when params is absent', () => {
  const flowchart = buildFlowchart(e2Fixture);
  assert.ok(flowchart !== null);
  // entry.name = 'Python Basic Webserver', no params.app_name
  assert.match(flowchart!, /app\["Python Basic Webserver"\]/);
});

// ────────────────────────────────────────────────────────────────────────────
// E3 — stack + services
// ────────────────────────────────────────────────────────────────────────────

test('E3: stack template emits flowchart with consumers + uis install sequence', () => {
  const result = buildArchitectureMdx(e3Fixture);
  assert.ok(result.mdx !== null);
  const mdx = result.mdx!;

  // Flowchart — stack shape
  assert.match(mdx, /```mermaid\nflowchart LR/);
  assert.match(mdx, /subgraph k8s\["Local Kubernetes Cluster \(Test environment\)"\]/);
  assert.match(mdx, /svc\[\("PostgreSQL<br\/>demo_db"\)\]/);
  assert.match(mdx, /subgraph uis_group\["UIS"\]/);
  assert.match(mdx, /uis\["provision-host"\]/);
  assert.match(mdx, /consumers\["Consumer templates"\]/);
  assert.match(mdx, /dev\(\["Developer"\]\)/);
  assert.match(mdx, /dev -->\|uis template install postgresql-demo\| uis/);
  assert.match(mdx, /uis -->\|deploys \+ seeds\| svc/);
  assert.match(mdx, /consumers -\.->\|use this\| svc/);

  // Stack templates have a minimal DCT subgraph (developer only) and no ArgoCD
  assert.match(mdx, /subgraph dct\["DCT devcontainer"\]/, 'minimal DCT subgraph with dev');
  assert.doesNotMatch(mdx, /argo/, 'no ArgoCD for stacks');
  assert.doesNotMatch(mdx, /subgraph gh/, 'no GitHub subgraph for stacks');

  // Sequence — uses entry.id in the install command, not dev-template configure
  assert.match(mdx, /```mermaid\nsequenceDiagram/);
  assert.match(mdx, /Dev->>DCT: uis template install postgresql-demo/);
  assert.match(mdx, /DCT->>UIS: install stack/);
  assert.match(mdx, /UIS->>K8s: create PostgreSQL \(demo_db\)/);
  assert.match(mdx, /UIS->>K8s: run init-\*\.sql seed files/);
  assert.match(mdx, /UIS-->>DCT: return connection JSON/);
  assert.doesNotMatch(mdx, /dev-template configure/, 'stacks do not use dev-template configure');
});

// ────────────────────────────────────────────────────────────────────────────
// E4 — overlay
// ────────────────────────────────────────────────────────────────────────────

test('E4: overlay template returns null for everything', () => {
  const result = buildArchitectureMdx(e4Fixture);
  assert.equal(result.mdx, null);
  assert.equal(buildFlowchart(e4Fixture), null);
  assert.equal(buildSequence(e4Fixture), null);
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

test('app template with services but missing quickstart.run throws with a clear error', () => {
  const broken: TemplateEntry = {
    ...e1Fixture,
    quickstart: {
      title: 'Run the Flask app',
      commands: ['uv run python app/app.py'],
      // run field missing
    },
  };
  assert.throws(
    () => buildSequence(broken),
    /quickstart\.run field/,
    'error should mention the missing field',
  );
});

test('multi-service template throws (v1 limitation)', () => {
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
    () => buildFlowchart(multi),
    /multi-service diagrams are not yet supported/,
  );
});
