/**
 * build-architecture-mdx.test.ts — Unit tests for the MDX emitter + the
 * structured model builder. Covers PLAN-architecture-diagram-display
 * Phase 2 (pure refactor — no user-visible change).
 *
 * Run with:
 *   npx tsx --test scripts/test/build-architecture-mdx.test.ts
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildArchitectureModel,
  buildArchitectureMdx,
  type TemplateEntry,
} from '../lib/build-architecture-mermaid.ts';
import { emitArchitectureMdx } from '../lib/build-architecture-mdx.ts';

// ────────────────────────────────────────────────────────────────────────────
// Fixtures — mirrored from the existing mermaid-builder tests
// ────────────────────────────────────────────────────────────────────────────

const e1Fixture: TemplateEntry = {
  id: 'python-basic-webserver-database',
  name: 'Python Basic Webserver with Database',
  install_type: 'app',
  params: { app_name: 'my-app', database_name: 'my_app_db' },
  manifest: { envVar: 'DATABASE_URL', secretName: 'my-app-db', containerPort: 3000 },
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
    setup: ['uv venv'],
    run: 'uv run python app/app.py',
  },
  configureCommand: 'dev-template configure',
};

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
  quickstart: { title: 'Verify the database', setup: [], run: 'uis connect postgresql demo_db' },
  configureCommand: 'uis template install postgresql-demo',
};

const e4Fixture: TemplateEntry = {
  id: 'plan-based-workflow',
  name: 'Plan-based Workflow',
  install_type: 'overlay',
  resolvedTools: [],
  resolvedServices: [],
};

// ────────────────────────────────────────────────────────────────────────────
// Model shape per archetype
// ────────────────────────────────────────────────────────────────────────────

test('E1 model: two sections (Local development, Deployment), each with Components + Flow', () => {
  const model = buildArchitectureModel(e1Fixture);
  assert.equal(model.sections.length, 2);

  const [localDev, deploy] = model.sections;
  assert.equal(localDev!.title, 'Local development');
  assert.equal(localDev!.diagrams.length, 2);
  assert.equal(localDev!.diagrams[0]!.name, 'Components');
  assert.equal(localDev!.diagrams[1]!.name, 'Flow');
  assert.match(localDev!.diagrams[0]!.mermaid, /^flowchart LR/);
  assert.match(localDev!.diagrams[1]!.mermaid, /^sequenceDiagram/);

  assert.equal(deploy!.title, 'Deployment');
  assert.equal(deploy!.diagrams.length, 2);
  assert.equal(deploy!.diagrams[0]!.name, 'Components');
  assert.equal(deploy!.diagrams[1]!.name, 'Flow');
});

test('E2 model: one section (Deployment only) with Components + Flow', () => {
  const model = buildArchitectureModel(e2Fixture);
  assert.equal(model.sections.length, 1);
  assert.equal(model.sections[0]!.title, 'Deployment');
  assert.equal(model.sections[0]!.diagrams.length, 2);
  assert.equal(model.sections[0]!.diagrams[0]!.name, 'Components');
  assert.equal(model.sections[0]!.diagrams[1]!.name, 'Flow');
});

test('E3 model: one section (Overview) with Components + Flow', () => {
  const model = buildArchitectureModel(e3Fixture);
  assert.equal(model.sections.length, 1);
  assert.equal(model.sections[0]!.title, 'Overview');
  assert.equal(model.sections[0]!.diagrams.length, 2);
  assert.equal(model.sections[0]!.diagrams[0]!.name, 'Components');
  assert.equal(model.sections[0]!.diagrams[1]!.name, 'Flow');
});

test('E4 model: zero sections (overlay — section suppressed)', () => {
  const model = buildArchitectureModel(e4Fixture);
  assert.equal(model.sections.length, 0);
});

// ────────────────────────────────────────────────────────────────────────────
// Emitter shape — Phase 2: pure fence blocks, no <details> wrappers yet
// ────────────────────────────────────────────────────────────────────────────

test('emitter: null for empty-sections model (overlay)', () => {
  assert.equal(emitArchitectureMdx({ sections: [] }), null);
});

test('emitter: E1 output has ## Architecture, both ### headings, 4 mermaid fences', () => {
  const mdx = emitArchitectureMdx(buildArchitectureModel(e1Fixture))!;
  assert.match(mdx, /^## Architecture\n/);
  assert.match(mdx, /### Local development/);
  assert.match(mdx, /### Deployment/);
  const fences = (mdx.match(/```mermaid/g) || []).length;
  assert.equal(fences, 4);
});

test('emitter: E2 output has only ### Deployment, 2 mermaid fences', () => {
  const mdx = emitArchitectureMdx(buildArchitectureModel(e2Fixture))!;
  assert.match(mdx, /### Deployment/);
  assert.doesNotMatch(mdx, /### Local development/);
  const fences = (mdx.match(/```mermaid/g) || []).length;
  assert.equal(fences, 2);
});

test('emitter: E3 output has ### Overview, 2 mermaid fences', () => {
  const mdx = emitArchitectureMdx(buildArchitectureModel(e3Fixture))!;
  assert.match(mdx, /### Overview/);
  assert.doesNotMatch(mdx, /### Local development/);
  assert.doesNotMatch(mdx, /### Deployment/);
  const fences = (mdx.match(/```mermaid/g) || []).length;
  assert.equal(fences, 2);
});

test('emitter: ends with a trailing newline', () => {
  const mdx = emitArchitectureMdx(buildArchitectureModel(e1Fixture))!;
  assert.ok(mdx.endsWith('\n'));
});

test('emitter: intro line renders when set on the model', () => {
  const model = buildArchitectureModel(e1Fixture);
  model.intro = 'These diagrams are auto-generated.';
  const mdx = emitArchitectureMdx(model)!;
  // Intro should appear after the `## Architecture` heading and before the first `###`
  const archIdx = mdx.indexOf('## Architecture');
  const introIdx = mdx.indexOf('These diagrams are auto-generated.');
  const sectionIdx = mdx.indexOf('### Local development');
  assert.ok(archIdx < introIdx);
  assert.ok(introIdx < sectionIdx);
});

test('emitter: no intro line when model.intro is undefined (Phase 2 default)', () => {
  const mdx = emitArchitectureMdx(buildArchitectureModel(e1Fixture))!;
  assert.doesNotMatch(mdx, /auto-generated/);
});

// ────────────────────────────────────────────────────────────────────────────
// Byte-compatibility: the refactored wrapper returns the same output as
// the old direct-concatenation path. Regression guard against Phase 2's
// "no visible change" promise.
// ────────────────────────────────────────────────────────────────────────────

test('buildArchitectureMdx wrapper returns `{ mdx }` shape (backward compat)', () => {
  const result = buildArchitectureMdx(e1Fixture);
  assert.ok('mdx' in result);
  assert.equal(typeof result.mdx, 'string');
});

test('buildArchitectureMdx wrapper returns { mdx: null } for overlay', () => {
  const result = buildArchitectureMdx(e4Fixture);
  assert.equal(result.mdx, null);
});

test('refactor is idempotent: two calls produce identical output', () => {
  const a = buildArchitectureMdx(e1Fixture).mdx;
  const b = buildArchitectureMdx(e1Fixture).mdx;
  assert.equal(a, b);
});

// ────────────────────────────────────────────────────────────────────────────
// Extensibility — adding a new diagram to a section is pure data change
// ────────────────────────────────────────────────────────────────────────────

test('extensibility: pushing a 3rd diagram onto a section renders without code changes', () => {
  const model = buildArchitectureModel(e1Fixture);
  model.sections[0]!.diagrams.push({
    name: 'Errors',
    mermaid: 'flowchart LR\n    A --> B',
  });
  const mdx = emitArchitectureMdx(model)!;
  const fences = (mdx.match(/```mermaid/g) || []).length;
  // E1 had 4; adding one more → 5
  assert.equal(fences, 5);
  // The new diagram's source should appear in the output
  assert.match(mdx, /A --> B/);
});

test('extensibility: pushing a new section renders without code changes', () => {
  const model = buildArchitectureModel(e2Fixture);
  model.sections.push({
    title: 'Operations',
    diagrams: [{ name: 'Monitoring', mermaid: 'flowchart LR\n    M --> N' }],
  });
  const mdx = emitArchitectureMdx(model)!;
  assert.match(mdx, /### Operations/);
  assert.match(mdx, /M --> N/);
});
