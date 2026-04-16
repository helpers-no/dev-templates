/**
 * build-files-mdx.test.ts — Unit tests for the Files dropdown MDX
 * emitter. Covers PLAN-template-files-dropdown Phase 2 + the tree
 * visual upgrade (<pre> + ├──/└──/│ glyphs, inline <a> links).
 *
 * Run with:
 *   npx tsx --test scripts/test/build-files-mdx.test.ts
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildFilesMdx } from '../lib/build-files-mdx.ts';

const BASE = 'https://github.com/helpers-no/dev-templates/blob/main';

// Mirror the glyphs used by build-files-mdx.ts so assertions stay
// self-evident. Trailing filler is NBSP (U+00A0), not ASCII space.
const NBSP = '\u00a0';
const TEE = `├──${NBSP}`;
const ELBOW = `└──${NBSP}`;
const PIPE = `│${NBSP}${NBSP}${NBSP}`;
const BLANK = `${NBSP}${NBSP}${NBSP}${NBSP}`;

// Attributes emitted on every file anchor — kept in one place so adding
// or removing link attributes is a single-line test update.
const LINK_ATTRS = 'target="_blank" rel="noopener noreferrer"';

/** Convenience: render the `<a>` tag for a file. */
function link(url: string, text: string): string {
  return `<a href="${url}" ${LINK_ATTRS}>${text}</a>`;
}

test('empty files returns null', () => {
  const mdx = buildFilesMdx({ files: [], templateRepoPath: 'templates/x' });
  assert.equal(mdx, null);
});

test('single-file template produces the expected block', () => {
  const mdx = buildFilesMdx({
    files: ['template-info.yaml'],
    templateRepoPath: 'templates/minimal',
  });
  const expected = [
    '### Files',
    '',
    '<details className="dropdownBlock">',
    '<summary>Files (1)</summary>',
    '',
    '<pre className="filesTree">',
    `${ELBOW}${link(`${BASE}/templates/minimal/template-info.yaml`, 'template-info.yaml')}`,
    '</pre>',
    '',
    '</details>',
    '',
  ].join('\n');
  assert.equal(mdx, expected);
});

test('multi-file, nested produces correct tree glyphs and indentation', () => {
  const mdx = buildFilesMdx({
    files: [
      'Dockerfile',
      'app/app.py',
      'manifests/deployment.yaml',
      'manifests/ingress.yaml',
      'requirements.txt',
      '.github/workflows/ci.yaml',
    ],
    templateRepoPath: 'templates/pybws',
  });
  assert.ok(mdx, 'mdx should not be null');
  const lines = mdx!.split('\n');
  // Header line
  assert.equal(lines[0], '### Files');
  // Summary with correct count (6 files)
  assert.equal(lines[3], '<summary>Files (6)</summary>');
  // <pre> opens at line 5
  assert.equal(lines[5], '<pre className="filesTree">');
  // Body — strip off heading/details/summary/<pre> and the closing tags
  const body = lines.slice(6, lines.length - 4); // strip </pre>, blank, </details>, trailing blank
  assert.deepEqual(body, [
    `${TEE}${link(`${BASE}/templates/pybws/Dockerfile`, 'Dockerfile')}`,
    `${TEE}${link(`${BASE}/templates/pybws/requirements.txt`, 'requirements.txt')}`,
    `${TEE}.github/`,
    `${PIPE}${ELBOW}workflows/`,
    `${PIPE}${BLANK}${ELBOW}${link(`${BASE}/templates/pybws/.github/workflows/ci.yaml`, 'ci.yaml')}`,
    `${TEE}app/`,
    `${PIPE}${ELBOW}${link(`${BASE}/templates/pybws/app/app.py`, 'app.py')}`,
    `${ELBOW}manifests/`,
    `${BLANK}${TEE}${link(`${BASE}/templates/pybws/manifests/deployment.yaml`, 'deployment.yaml')}`,
    `${BLANK}${ELBOW}${link(`${BASE}/templates/pybws/manifests/ingress.yaml`, 'ingress.yaml')}`,
  ]);
});

test('last entry uses elbow glyph; earlier entries use tee glyph', () => {
  const mdx = buildFilesMdx({
    files: ['a.txt', 'b.txt', 'c.txt'],
    templateRepoPath: 'templates/x',
  });
  assert.ok(mdx);
  assert.ok(mdx!.includes(`${TEE}<a`), 'tee glyph for non-last entries');
  assert.ok(mdx!.includes(`${ELBOW}<a`), 'elbow glyph for last entry');
  // c.txt must be the last and use └──
  const elbowEscaped = ELBOW.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.match(mdx!, new RegExp(`${elbowEscaped}<a[^>]*>c\\.txt</a>`));
});

test('deep nesting continues vertical pipes correctly', () => {
  const mdx = buildFilesMdx({
    files: ['.github/workflows/ci.yaml', 'Dockerfile'],
    templateRepoPath: 'templates/x',
  });
  assert.ok(mdx);
  // .github is the last entry (after Dockerfile root file), so its
  // children use BLANK continuation (no vertical pipe).
  // workflows is the only child of .github, so it uses └── and BLANK too.
  assert.ok(
    mdx!.includes(`${ELBOW}.github/`),
    '.github last entry -> elbow',
  );
  assert.ok(
    mdx!.includes(`${BLANK}${ELBOW}workflows/`),
    'workflows nested under .github with blank continuation + elbow',
  );
  assert.ok(
    mdx!.includes(
      `${BLANK}${BLANK}${ELBOW}${link(`${BASE}/templates/x/.github/workflows/ci.yaml`, 'ci.yaml')}`,
    ),
    'ci.yaml two levels deep under a last-sibling chain',
  );
});

test('stack template path is honored in URL prefix', () => {
  const mdx = buildFilesMdx({
    files: ['template-info.yaml'],
    templateRepoPath: 'uis-stack-templates/postgresql-demo',
  });
  assert.ok(mdx);
  assert.ok(
    mdx!.includes(`${BASE}/uis-stack-templates/postgresql-demo/template-info.yaml`),
    'stack URL prefix missing',
  );
});

test('overlay template path is honored in URL prefix', () => {
  const mdx = buildFilesMdx({
    files: ['template-info.yaml', 'rules/plan.md'],
    templateRepoPath: 'ai-templates/plan-based-workflow/template',
  });
  assert.ok(mdx);
  assert.ok(
    mdx!.includes(
      `${BASE}/ai-templates/plan-based-workflow/template/template-info.yaml`,
    ),
  );
  assert.ok(
    mdx!.includes(
      `${BASE}/ai-templates/plan-based-workflow/template/rules/plan.md`,
    ),
  );
});

test('dotfile at root renders as a link, not as a folder', () => {
  const mdx = buildFilesMdx({
    files: ['.gitignore', '.dockerignore'],
    templateRepoPath: 'templates/x',
  });
  assert.ok(mdx);
  assert.ok(mdx!.includes(link(`${BASE}/templates/x/.gitignore`, '.gitignore')));
  assert.ok(mdx!.includes(link(`${BASE}/templates/x/.dockerignore`, '.dockerignore')));
  assert.ok(!mdx!.includes('.gitignore/'), 'dotfile should not be rendered as folder');
});

test('filename with spaces is URL-encoded', () => {
  const mdx = buildFilesMdx({
    files: ['docs/my file.md'],
    templateRepoPath: 'templates/x',
  });
  assert.ok(mdx);
  assert.ok(
    mdx!.includes(link(`${BASE}/templates/x/docs/my%20file.md`, 'my file.md')),
    'filename with space should be URL-encoded in URL but not link text',
  );
});

test('filename with hash is URL-encoded', () => {
  const mdx = buildFilesMdx({
    files: ['docs/readme#draft.md'],
    templateRepoPath: 'templates/x',
  });
  assert.ok(mdx);
  assert.ok(
    mdx!.includes(link(`${BASE}/templates/x/docs/readme%23draft.md`, 'readme#draft.md')),
  );
});

test('trailing newline present', () => {
  const mdx = buildFilesMdx({
    files: ['Dockerfile'],
    templateRepoPath: 'templates/x',
  });
  assert.ok(mdx);
  assert.ok(mdx!.endsWith('\n'));
});

test('every file anchor opens in a new tab with safe rel', () => {
  const mdx = buildFilesMdx({
    files: ['Dockerfile', 'app/app.py'],
    templateRepoPath: 'templates/x',
  });
  assert.ok(mdx);
  // Count anchor tags; every single one must carry the new-tab attrs.
  const anchorCount = (mdx!.match(/<a /g) || []).length;
  const newTabCount = (mdx!.match(/target="_blank" rel="noopener noreferrer"/g) || [])
    .length;
  assert.equal(anchorCount, 2, 'two files -> two anchors');
  assert.equal(newTabCount, 2, 'every anchor has target+rel attrs');
});

test('heading, details, and <pre> wrapper structure always present', () => {
  const mdx = buildFilesMdx({
    files: ['Dockerfile'],
    templateRepoPath: 'templates/x',
  });
  assert.ok(mdx);
  assert.ok(mdx!.startsWith('### Files\n'));
  assert.ok(mdx!.includes('<details className="dropdownBlock">'));
  assert.ok(mdx!.includes('<summary>Files (1)</summary>'));
  assert.ok(mdx!.includes('<pre className="filesTree">'));
  assert.ok(mdx!.includes('</pre>'));
  assert.ok(mdx!.includes('</details>'));
});
