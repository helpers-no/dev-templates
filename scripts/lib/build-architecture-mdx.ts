/**
 * build-architecture-mdx.ts — MDX emitter for the architecture section.
 *
 * Walks an ArchitectureModel (produced by `buildArchitectureModel` in
 * `build-architecture-mermaid.ts`) and emits the MDX block that
 * `generate-registry.ts` stores on each template's registry entry,
 * which `generate-docs-markdown.sh` then pastes verbatim into the
 * template's generated MDX page.
 *
 * **Phase 2 contract**: this emitter produces **byte-identical output**
 * to the pre-refactor direct-string-concatenation path. No `<details>`
 * wrappers, no per-diagram dropdowns. The goal of Phase 2 is a pure
 * internal refactor with zero user-visible change.
 *
 * Phase 4 of PLAN-architecture-diagram-display will update this emitter
 * to wrap each diagram in a collapsible `<details>` block and add the
 * top-level intro sentence. That change happens in this file and only
 * in this file.
 */

import type {
  ArchitectureModel,
  ArchitectureSection,
} from './build-architecture-mermaid.ts';

/**
 * Emit the full `## Architecture` MDX block for a model, or null if the
 * model has no sections (overlay templates). The returned string starts
 * with `## Architecture` and ends with a trailing newline.
 */
export function emitArchitectureMdx(model: ArchitectureModel): string | null {
  if (model.sections.length === 0) return null;

  const parts: string[] = ['## Architecture', ''];

  if (model.intro) {
    parts.push(model.intro);
    parts.push('');
  }

  for (let i = 0; i < model.sections.length; i++) {
    const section = model.sections[i]!;
    emitSection(parts, section);
    // Trailing blank line between sections (but not after the last one —
    // the final `.join('\n') + '\n'` adds the terminating newline).
    if (i < model.sections.length - 1) {
      parts.push('');
    }
  }

  return parts.join('\n') + '\n';
}

/**
 * Emit one `### Title` sub-section with its list of diagrams.
 * Each diagram becomes a plain ```mermaid fence in Phase 2. Phase 4
 * wraps each fence in a `<details>` block with a per-diagram summary.
 */
function emitSection(parts: string[], section: ArchitectureSection): void {
  parts.push(`### ${section.title}`);
  parts.push('');

  for (let i = 0; i < section.diagrams.length; i++) {
    const diagram = section.diagrams[i]!;
    parts.push('```mermaid');
    parts.push(diagram.mermaid);
    parts.push('```');
    // Blank line between diagrams within a section (but not after the last).
    if (i < section.diagrams.length - 1) {
      parts.push('');
    }
  }
}
