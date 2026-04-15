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

test('emitter: custom intro line renders when set on the model', () => {
  const model = buildArchitectureModel(e1Fixture);
  model.intro = 'Custom intro for this test only.';
  const mdx = emitArchitectureMdx(model)!;
  // Intro should appear after the `## Architecture` heading and before the first `###`
  const archIdx = mdx.indexOf('## Architecture');
  const introIdx = mdx.indexOf('Custom intro for this test only.');
  const sectionIdx = mdx.indexOf('### Local development');
  assert.ok(archIdx < introIdx);
  assert.ok(introIdx < sectionIdx);
});

test('emitter: default intro is used when model.intro is undefined (Phase 4)', () => {
  const mdx = emitArchitectureMdx(buildArchitectureModel(e1Fixture))!;
  assert.match(mdx, /auto-generated from the template/);
  assert.match(mdx, /Click any diagram to enlarge/);
});

test('emitter: empty-string intro is an explicit opt-out', () => {
  const model = buildArchitectureModel(e1Fixture);
  model.intro = '';
  const mdx = emitArchitectureMdx(model)!;
  assert.doesNotMatch(mdx, /auto-generated/);
  assert.doesNotMatch(mdx, /Click any diagram/);
});

// ────────────────────────────────────────────────────────────────────────────
// Phase 4 — per-diagram <details> wrappers
// ────────────────────────────────────────────────────────────────────────────

test('Phase 4: each diagram is wrapped in <details className="dropdownBlock">', () => {
  const mdx = emitArchitectureMdx(buildArchitectureModel(e1Fixture))!;
  const detailsCount = (mdx.match(/<details className="dropdownBlock">/g) || []).length;
  // E1 has 2 sections × 2 diagrams each = 4 dropdowns
  assert.equal(detailsCount, 4);
});

test('Phase 4: each dropdown has a summary with the diagram name', () => {
  const mdx = emitArchitectureMdx(buildArchitectureModel(e1Fixture))!;
  // Two Components dropdowns + two Flow dropdowns (local dev + deploy)
  const componentsCount = (mdx.match(/<summary>Components<\/summary>/g) || []).length;
  const flowCount = (mdx.match(/<summary>Flow<\/summary>/g) || []).length;
  assert.equal(componentsCount, 2);
  assert.equal(flowCount, 2);
});

test('Phase 4: section headings still visible outside the dropdowns', () => {
  const mdx = emitArchitectureMdx(buildArchitectureModel(e1Fixture))!;
  assert.match(mdx, /^### Local development$/m);
  assert.match(mdx, /^### Deployment$/m);
});

test('Phase 4: mermaid fences live inside the details body (blank lines around)', () => {
  const mdx = emitArchitectureMdx(buildArchitectureModel(e1Fixture))!;
  // Each details block should contain a mermaid fence between blank lines,
  // which is the shape MDX needs to re-enter markdown mode inside JSX.
  assert.match(
    mdx,
    /<details className="dropdownBlock">\n<summary>\w+<\/summary>\n\n```mermaid\n/,
  );
  assert.match(mdx, /\n```\n\n<\/details>/);
});

test('Phase 4: E2 (no services) has 2 dropdowns (Deployment only)', () => {
  const mdx = emitArchitectureMdx(buildArchitectureModel(e2Fixture))!;
  const detailsCount = (mdx.match(/<details className="dropdownBlock">/g) || []).length;
  assert.equal(detailsCount, 2);
});

test('Phase 4: E3 (stack) has 2 dropdowns under ### Overview', () => {
  const mdx = emitArchitectureMdx(buildArchitectureModel(e3Fixture))!;
  const detailsCount = (mdx.match(/<details className="dropdownBlock">/g) || []).length;
  assert.equal(detailsCount, 2);
  assert.match(mdx, /### Overview/);
});

test('Phase 4: E4 (overlay) still returns null — no change from Phase 2', () => {
  assert.equal(emitArchitectureMdx(buildArchitectureModel(e4Fixture)), null);
});

test('Phase 4: escapeSummary handles angle brackets in diagram names', () => {
  const model: typeof buildArchitectureModel extends never ? never : ReturnType<typeof buildArchitectureModel> = {
    sections: [
      {
        title: 'Test',
        diagrams: [{ name: 'API <3', mermaid: 'flowchart LR\n  A --> B' }],
      },
    ],
  };
  const mdx = emitArchitectureMdx(model)!;
  // The < and > in "API <3" should be HTML-entity-escaped so MDX's JSX
  // parser doesn't mis-interpret it as a tag
  assert.match(mdx, /<summary>API &lt;3<\/summary>/);
  assert.doesNotMatch(mdx, /<summary>API <3</);
});

// ────────────────────────────────────────────────────────────────────────────
// Byte-compatibility tests dropped in Phase 4: the output now includes
// <details> wrappers and an intro sentence, so per-archetype output is
// no longer byte-identical to the original Phase 1 concatenation. The
// extensibility tests still hold — adding a diagram or section remains
// a pure data change.
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
