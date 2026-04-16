/**
 * build-files-mdx.ts — MDX emitter for the Files dropdown sub-section.
 *
 * Walks a FilesTreeNode (produced by `buildFilesTree`) and emits the
 * full `### Files` block — heading, `<details>` wrapper, `<summary>`
 * with the file count, and the indented markdown tree — that
 * `generate-registry.ts` stores on each template's registry entry.
 * The bash emitter (`generate-docs-markdown.sh`) then echoes this
 * string verbatim inside the Getting Started card.
 *
 * All MDX-shape decisions, indent math, and URL-encoding live here.
 * Bash does no string manipulation.
 */

import { buildFilesTree, type FilesTreeNode } from './build-files-tree.ts';
import { REPO_BASE_URL, REPO_BRANCH } from './repo-constants.ts';

export interface FilesMdxInput {
  /** Paths relative to the template root, as returned by git ls-files. */
  files: string[];
  /** Repo-relative path of the template folder, e.g. "templates/python-basic-webserver-database". */
  templateRepoPath: string;
}

// ASCII tree glyphs. Classic Unix `tree(1)` output uses these characters
// with a 4-character step per nesting level. Trailing filler uses
// NBSP (U+00A0) rather than ASCII space so that MDX's 4-space indent
// rule doesn't treat lines as indented code blocks and strip the
// leading whitespace. NBSP renders identically inside a monospaced
// <pre> element but is not whitespace to the markdown parser.
const NBSP = '\u00a0';
const TEE = `├──${NBSP}`;
const ELBOW = `└──${NBSP}`;
const PIPE = `│${NBSP}${NBSP}${NBSP}`;
const BLANK = `${NBSP}${NBSP}${NBSP}${NBSP}`;

/**
 * Build the per-file GitHub blob URL. Each path segment is URL-encoded
 * individually so that `/` separators survive but spaces and special
 * characters within segment names don't break the link.
 */
function fileUrl(baseUrl: string, relativePath: string): string {
  const encoded = relativePath.split('/').map(encodeURIComponent).join('/');
  return `${baseUrl}/${encoded}`;
}

/**
 * Count all file leaves in the tree.
 */
function countFiles(node: FilesTreeNode): number {
  let n = node.files.length;
  for (const child of node.dirs.values()) n += countFiles(child);
  return n;
}

/**
 * Walk the tree, emitting one line per entry with `tree(1)`-style
 * glyphs. Files render as clickable `<a>` tags inside the leaf cell;
 * folders render as plain text with a trailing slash.
 *
 * `prefix` carries the column of `│   ` / `    ` segments that trace
 * back to the root; each recursion step appends either `PIPE` (this
 * level still has siblings below) or `BLANK` (last sibling — no more
 * vertical line needed).
 */
function walk(
  node: FilesTreeNode,
  prefix: string,
  pathPrefix: string,
  baseUrl: string,
  lines: string[],
): void {
  // Files first, then folders. Track overall position so the final
  // entry on this level uses the elbow glyph.
  const fileEntries = node.files;
  const dirEntries = [...node.dirs.entries()];
  const total = fileEntries.length + dirEntries.length;

  fileEntries.forEach((file, i) => {
    const isLast = i === total - 1;
    const glyph = isLast ? ELBOW : TEE;
    const full = pathPrefix ? `${pathPrefix}/${file}` : file;
    lines.push(
      `${prefix}${glyph}<a href="${fileUrl(baseUrl, full)}" target="_blank" rel="noopener noreferrer">${file}</a>`,
    );
  });

  dirEntries.forEach(([dirName, child], i) => {
    const overallIdx = fileEntries.length + i;
    const isLast = overallIdx === total - 1;
    const glyph = isLast ? ELBOW : TEE;
    lines.push(`${prefix}${glyph}${dirName}/`);
    const nextPrefix = prefix + (isLast ? BLANK : PIPE);
    const nextPath = pathPrefix ? `${pathPrefix}/${dirName}` : dirName;
    walk(child, nextPrefix, nextPath, baseUrl, lines);
  });
}

/**
 * Emit the full `### Files` MDX block, or `null` when there are no
 * files to show (callers skip the sub-section entirely). The returned
 * string starts with `### Files` and ends with a trailing newline.
 */
export function buildFilesMdx(input: FilesMdxInput): string | null {
  if (input.files.length === 0) return null;
  const tree = buildFilesTree(input.files);
  const count = countFiles(tree);
  if (count === 0) return null;

  const baseUrl = `${REPO_BASE_URL}/blob/${REPO_BRANCH}/${input.templateRepoPath}`;
  const treeLines: string[] = [];
  walk(tree, '', '', baseUrl, treeLines);

  // The tree lives inside a <pre> so that monospace alignment of the
  // ├── / └── / │ glyphs reads as a real tree. Inline <a> tags stay
  // clickable because MDX parses <pre> children as JSX, not as code.
  return [
    '### Files',
    '',
    '<details className="dropdownBlock">',
    `<summary>Files (${count})</summary>`,
    '',
    '<pre className="filesTree">',
    ...treeLines,
    '</pre>',
    '',
    '</details>',
    '',
  ].join('\n');
}
