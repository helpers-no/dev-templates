/**
 * build-files-tree.test.ts — Unit tests for the Files dropdown tree
 * builder. Covers PLAN-template-files-dropdown Phase 1.
 *
 * Run with:
 *   npx tsx --test scripts/test/build-files-tree.test.ts
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildFilesTree, type FilesTreeNode } from '../lib/build-files-tree.ts';

/** Convenience: dir keys in iteration order. */
function dirKeys(node: FilesTreeNode): string[] {
  return [...node.dirs.keys()];
}

test('empty input returns empty node', () => {
  const tree = buildFilesTree([]);
  assert.deepEqual(tree.files, []);
  assert.equal(tree.dirs.size, 0);
});

test('single root-level file', () => {
  const tree = buildFilesTree(['Dockerfile']);
  assert.deepEqual(tree.files, ['Dockerfile']);
  assert.equal(tree.dirs.size, 0);
});

test('multiple root-level files are alphabetically sorted', () => {
  const tree = buildFilesTree(['requirements.txt', 'Dockerfile', 'README.md']);
  // Uppercase sorts before lowercase by default, but localeCompare with
  // no options treats them case-insensitively on most locales. The exact
  // rule: localeCompare returns Dockerfile < README.md < requirements.txt
  // because D < R < r case-insensitively, and within ties uppercase first.
  assert.deepEqual(tree.files, ['Dockerfile', 'README.md', 'requirements.txt']);
  assert.equal(tree.dirs.size, 0);
});

test('one nested folder with one file', () => {
  const tree = buildFilesTree(['app/app.py']);
  assert.deepEqual(tree.files, []);
  assert.deepEqual(dirKeys(tree), ['app']);
  const app = tree.dirs.get('app')!;
  assert.deepEqual(app.files, ['app.py']);
  assert.equal(app.dirs.size, 0);
});

test('root files and folders coexist on the same node', () => {
  const tree = buildFilesTree([
    'Dockerfile',
    'app/app.py',
    'requirements.txt',
    'manifests/deployment.yaml',
  ]);
  assert.deepEqual(tree.files, ['Dockerfile', 'requirements.txt']);
  assert.deepEqual(dirKeys(tree), ['app', 'manifests']);
});

test('dirs iterate in alphabetical order regardless of insert order', () => {
  const tree = buildFilesTree([
    'manifests/deployment.yaml',
    'app/app.py',
    'config/init.sql',
  ]);
  assert.deepEqual(dirKeys(tree), ['app', 'config', 'manifests']);
});

test('deep nesting preserved', () => {
  const tree = buildFilesTree([
    '.github/workflows/build.yaml',
    '.github/workflows/deploy.yaml',
  ]);
  assert.deepEqual(dirKeys(tree), ['.github']);
  const gh = tree.dirs.get('.github')!;
  assert.deepEqual(gh.files, []);
  assert.deepEqual(dirKeys(gh), ['workflows']);
  const wf = gh.dirs.get('workflows')!;
  assert.deepEqual(wf.files, ['build.yaml', 'deploy.yaml']);
  assert.equal(wf.dirs.size, 0);
});

test('dotfiles at root are regular file leaves', () => {
  const tree = buildFilesTree(['.gitignore', '.dockerignore', 'Dockerfile']);
  // All three land in files[]; localeCompare order puts dotfiles before
  // Dockerfile because '.' < 'D' in codepoint order and localeCompare
  // agrees for punctuation-vs-letter.
  assert.deepEqual(tree.files, ['.dockerignore', '.gitignore', 'Dockerfile']);
  assert.equal(tree.dirs.size, 0);
});

test('dotfolders at root nest correctly', () => {
  const tree = buildFilesTree([
    '.github/workflows/ci.yaml',
    'app/app.py',
  ]);
  assert.deepEqual(dirKeys(tree), ['.github', 'app']);
});

test('duplicate paths are deduplicated', () => {
  const tree = buildFilesTree(['Dockerfile', 'Dockerfile', 'app/app.py']);
  assert.deepEqual(tree.files, ['Dockerfile']);
  const app = tree.dirs.get('app')!;
  assert.deepEqual(app.files, ['app.py']);
});

test('blank and whitespace-only paths are skipped', () => {
  const tree = buildFilesTree(['', '  ', 'Dockerfile']);
  assert.deepEqual(tree.files, ['Dockerfile']);
  assert.equal(tree.dirs.size, 0);
});

test('realistic e1 fixture (python-basic-webserver-database)', () => {
  const tree = buildFilesTree([
    'Dockerfile',
    'README-python-basic-webserver-database.md',
    '.dockerignore',
    '.gitignore',
    '.github/workflows/urbalurba-build-and-push.yaml',
    'app/app.py',
    'config/init-database.sql',
    'manifests/deployment.yaml',
    'manifests/ingress.yaml',
    'manifests/kustomization.yaml',
    'requirements.txt',
    'template-info.yaml',
  ]);
  assert.deepEqual(tree.files, [
    '.dockerignore',
    '.gitignore',
    'Dockerfile',
    'README-python-basic-webserver-database.md',
    'requirements.txt',
    'template-info.yaml',
  ]);
  assert.deepEqual(dirKeys(tree), ['.github', 'app', 'config', 'manifests']);
  assert.deepEqual(tree.dirs.get('manifests')!.files, [
    'deployment.yaml',
    'ingress.yaml',
    'kustomization.yaml',
  ]);
});
