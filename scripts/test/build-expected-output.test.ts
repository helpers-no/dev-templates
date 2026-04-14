/**
 * build-expected-output.test.ts — Unit tests for the expected-output
 * generator.
 *
 * Run with:
 *   npx tsx --test scripts/test/build-expected-output.test.ts
 *
 * Uses node:test (built into Node >= 18) and node:assert/strict.
 * Fixtures are inline — hermetic, decoupled from the real registry.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildExpectedOutput } from '../lib/build-expected-output.ts';
import type { TemplateEntry } from '../lib/build-architecture-mermaid.ts';

// ────────────────────────────────────────────────────────────────────────────
// Fixtures — one per archetype (mirrored from the mermaid builder tests)
// ────────────────────────────────────────────────────────────────────────────

const INIT_SQL_CONTENT = `-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO tasks (title, status) VALUES
    ('Set up the database connection', 'done'),
    ('Build something with Flask + PostgreSQL', 'pending'),
    ('Deploy to Kubernetes via ArgoCD', 'pending');
`;

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
  resolvedInitFiles: {
    'config/init-database.sql': INIT_SQL_CONTENT,
  },
};

/** E2 — app + manifest, no services */
const e2Fixture: TemplateEntry = {
  id: 'python-basic-webserver',
  name: 'Python Basic Webserver',
  install_type: 'app',
  params: { app_name: 'my-app' },
  manifest: { envVar: 'PORT', secretName: 'my-app-db', containerPort: 3000 },
  resolvedTools: [{ id: 'dev-python', name: 'Python Development Tools' }],
  resolvedServices: [],
  quickstart: {
    title: 'Run the Flask app',
    setup: ['uv venv'],
    run: 'uv run python app/app.py',
  },
};

/** E3 — stack template (postgresql-demo shape) */
const e3Fixture: TemplateEntry = {
  id: 'postgresql-demo',
  name: 'PostgreSQL Demo',
  install_type: 'stack',
  params: { app_name: 'demo-app', database_name: 'demo_db' },
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
  resolvedInitFiles: {
    'config/init-database.sql': INIT_SQL_CONTENT,
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

test('E1: returns a non-null multi-line string', () => {
  const out = buildExpectedOutput(e1Fixture);
  assert.ok(out !== null, 'should not be null for E1');
  assert.ok(out!.includes('\n'), 'should be multi-line');
});

test('E1: contains the canonical banner + divider', () => {
  const out = buildExpectedOutput(e1Fixture)!;
  assert.match(out, /🔧 Template Configure/);
  assert.match(out, /━{60,}/); // at least 60 box-drawing chars in a row
});

test('E1: git identity uses yourorg/<app_name> placeholder per Q1', () => {
  const out = buildExpectedOutput(e1Fixture)!;
  assert.match(out, /✓ Repo:\s+yourorg\/my-app/);
  assert.match(out, /✓ Branch: main/);
});

test('E1: template-info.yaml read block has the right id and type', () => {
  const out = buildExpectedOutput(e1Fixture)!;
  assert.match(out, /✓ ID:\s+python-basic-webserver-database/);
  assert.match(out, /✓ Type:\s+app/);
});

test('E1: parameters block lists every param', () => {
  const out = buildExpectedOutput(e1Fixture)!;
  assert.match(out, /📝 Parameters:/);
  assert.match(out, /app_name\s+= my-app/);
  assert.match(out, /database_name\s+= my_app_db/);
});

test('E1: service detail block shows database, namespace, secret prefix, env var', () => {
  const out = buildExpectedOutput(e1Fixture)!;
  assert.match(out, /Database:\s+my_app_db/);
  assert.match(out, /K8s namespace:\s+default/);
  assert.match(out, /K8s secret prefix:\s+my-app/);
  assert.match(out, /Env var:\s+DATABASE_URL/);
});

test('E1: init file block has correct size and line count', () => {
  const out = buildExpectedOutput(e1Fixture)!;
  // INIT_SQL_CONTENT: UTF-8 byte length + line count
  const bytes = new TextEncoder().encode(INIT_SQL_CONTENT).length;
  const lines = INIT_SQL_CONTENT.replace(/\n$/, '').split('\n').length;
  assert.match(out, /📄 Reading init file/);
  assert.match(out, /✓ Path: config\/init-database\.sql/);
  assert.match(out, new RegExp(`✓ Size: ${bytes} bytes \\(${lines} lines\\)`));
});

test('E1: UIS command block has the right binary + args', () => {
  const out = buildExpectedOutput(e1Fixture)!;
  assert.match(out, /docker exec -i uis-provision-host uis configure postgresql my-app \\/);
  assert.match(out, /--database my_app_db \\/);
  assert.match(out, /--namespace default \\/);
  assert.match(out, /--secret-name-prefix my-app \\/);
  assert.match(out, /< config\/init-database\.sql/);
});

test('E1: port-forward ASCII art includes exposePort, in-cluster port, and service id', () => {
  const out = buildExpectedOutput(e1Fixture)!;
  assert.match(out, /host\.docker\.internal:35432/);
  assert.match(out, /K8s: postgresql\.default\.svc\.cluster\.local:5432/);
  // In-cluster port for postgresql comes from SERVICE_PORTS stopgap (5432).
});

test('E1: .env write line includes env var, credentials, and URL', () => {
  const out = buildExpectedOutput(e1Fixture)!;
  assert.match(out, /✓ Key:\s+DATABASE_URL/);
  assert.match(out, /postgresql:\/\/my_app:\*\*\*@host\.docker\.internal:35432\/my_app_db/);
});

test('E1: K8s Secret block has name, namespace, key, verify command', () => {
  const out = buildExpectedOutput(e1Fixture)!;
  assert.match(out, /Name:\s+my-app-db/);
  assert.match(out, /Namespace: my-app/);
  assert.match(out, /Key:\s+DATABASE_URL/);
  assert.match(out, /Verify:\s+kubectl get secret my-app-db -n my-app/);
});

test('E1: Next steps pulls the run command from quickstart.run', () => {
  const out = buildExpectedOutput(e1Fixture)!;
  assert.match(out, /• Run the app:\s+uv run python app\/app\.py/);
});

test('E1: Configuration complete footer', () => {
  const out = buildExpectedOutput(e1Fixture)!;
  assert.match(out, /✅ Configuration complete \(1 configured, 0 skipped, 0 failed\)/);
});

// ────────────────────────────────────────────────────────────────────────────
// E2 — app + manifest, no services → null
// ────────────────────────────────────────────────────────────────────────────

test('E2: returns null (no configure flow for app without services)', () => {
  assert.equal(buildExpectedOutput(e2Fixture), null);
});

// ────────────────────────────────────────────────────────────────────────────
// E3 — stack template
// ────────────────────────────────────────────────────────────────────────────

test('E3: returns a non-null multi-line string with uis template install banner', () => {
  const out = buildExpectedOutput(e3Fixture);
  assert.ok(out !== null);
  assert.match(out!, /🔧 UIS Template Install: postgresql-demo/);
});

test('E3: service deploy block has database, namespace, init file', () => {
  const out = buildExpectedOutput(e3Fixture)!;
  assert.match(out, /Database:\s+demo_db/);
  assert.match(out, /Namespace:\s+default/);
  assert.match(out, /Init file:\s+config\/init-database\.sql/);
});

test('E3: UIS deploy command has the right form (not configure)', () => {
  const out = buildExpectedOutput(e3Fixture)!;
  assert.match(out, /docker exec -i uis-provision-host uis deploy postgresql \\/);
  assert.match(out, /--database demo_db \\/);
  assert.match(out, /--namespace default \\/);
  // Stack flow does NOT have --secret-name-prefix (stacks provide services,
  // they don't integrate them into a consumer app's secret).
  assert.doesNotMatch(out, /--secret-name-prefix/);
});

test('E3: port-forward summary includes exposePort + in-cluster port', () => {
  const out = buildExpectedOutput(e3Fixture)!;
  assert.match(out, /host\.docker\.internal:35432 → postgresql\.default\.svc:5432/);
});

test('E3: Next steps mentions uis connect + consumer templates hint', () => {
  const out = buildExpectedOutput(e3Fixture)!;
  assert.match(out, /uis connect postgresql demo_db/);
  assert.match(out, /Consumer templates:/);
});

test('E3: footer says Stack installed (not Configuration complete)', () => {
  const out = buildExpectedOutput(e3Fixture)!;
  assert.match(out, /✅ Stack installed \(1 service\)/);
  assert.doesNotMatch(out, /Configuration complete/);
});

// ────────────────────────────────────────────────────────────────────────────
// E4 — overlay → null
// ────────────────────────────────────────────────────────────────────────────

test('E4: overlay returns null', () => {
  assert.equal(buildExpectedOutput(e4Fixture), null);
});

// ────────────────────────────────────────────────────────────────────────────
// Multi-service rejection (v1 limitation)
// ────────────────────────────────────────────────────────────────────────────

test('multi-service template throws (v1 limitation — matches mermaid builder)', () => {
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
    () => buildExpectedOutput(multi),
    /multi-service templates are not yet supported/,
  );
});

// ────────────────────────────────────────────────────────────────────────────
// Unknown service id throws via service-ports.ts
// ────────────────────────────────────────────────────────────────────────────

test('unknown service id throws from service-ports.ts', () => {
  const bogus: TemplateEntry = {
    ...e1Fixture,
    resolvedServices: [
      {
        id: 'bogus-db',
        name: 'Bogus DB',
        database: 'x',
        exposePort: 35432,
        namespace: 'default',
      },
    ],
  };
  assert.throws(
    () => buildExpectedOutput(bogus),
    /no in-cluster port defined for service 'bogus-db'/,
  );
});
