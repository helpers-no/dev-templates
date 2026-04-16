/**
 * build-files-tree.ts — Pure tree builder for the Files dropdown.
 *
 * Takes a flat list of file paths (relative to a template's root, as
 * emitted by `git ls-files`) and returns a sorted nested tree. The
 * MDX emitter (`build-files-mdx.ts`) walks this tree to produce the
 * indented markdown that renders inside the `<details>` dropdown on
 * every template's documentation page.
 *
 * Sort rule at every level: files first (alphabetical), then sub-folders
 * (alphabetical). A plain `Map` preserves insertion order in JavaScript,
 * so we insert dirs in sorted order and iterate directly.
 */

export interface FilesTreeNode {
  /** Leaf file names at this level, alphabetically sorted. */
  files: string[];
  /** Sub-folders keyed by folder name, iterated in alphabetical order. */
  dirs: Map<string, FilesTreeNode>;
}

function emptyNode(): FilesTreeNode {
  return { files: [], dirs: new Map() };
}

/**
 * Insert a path into the tree at its proper location. Mutates `node`.
 * Paths are split on `/`; the final segment becomes a leaf file.
 */
function insertPath(node: FilesTreeNode, segments: string[]): void {
  if (segments.length === 0) return;
  if (segments.length === 1) {
    node.files.push(segments[0]);
    return;
  }
  const [head, ...rest] = segments;
  let child = node.dirs.get(head);
  if (!child) {
    child = emptyNode();
    node.dirs.set(head, child);
  }
  insertPath(child, rest);
}

/**
 * Recursively sort every level: files alphabetically, and rebuild the
 * dirs Map in sorted key order so iteration is alphabetical.
 */
function sortNode(node: FilesTreeNode): void {
  node.files.sort((a, b) => a.localeCompare(b));
  const sortedKeys = [...node.dirs.keys()].sort((a, b) => a.localeCompare(b));
  const sorted = new Map<string, FilesTreeNode>();
  for (const key of sortedKeys) {
    const child = node.dirs.get(key)!;
    sortNode(child);
    sorted.set(key, child);
  }
  node.dirs = sorted;
}

/**
 * Build a sorted nested tree from a flat list of relative paths.
 * Empty input returns an empty node. Duplicate paths are deduplicated.
 */
export function buildFilesTree(files: string[]): FilesTreeNode {
  const root = emptyNode();
  const seen = new Set<string>();
  for (const raw of files) {
    const path = raw.trim();
    if (!path || seen.has(path)) continue;
    seen.add(path);
    const segments = path.split('/').filter((s) => s.length > 0);
    insertPath(root, segments);
  }
  sortNode(root);
  return root;
}
