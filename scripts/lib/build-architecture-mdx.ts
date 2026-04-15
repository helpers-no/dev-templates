/**
 * build-architecture-mdx.ts — MDX emitter for the architecture section.
 *
 * Walks an ArchitectureModel (produced by `buildArchitectureModel` in
 * `build-architecture-mermaid.ts`) and emits the MDX block that
 * `generate-registry.ts` stores on each template's registry entry,
 * which `generate-docs-markdown.sh` then pastes verbatim into the
 * template's generated MDX page.
 *
 * **Phase 4 output**: each diagram is wrapped in a `<details>` block
 * with a per-diagram `<summary>`. The outermost `## Architecture`
 * heading gets a one-sentence intro describing the auto-generation and
 * the click-to-enlarge affordance. Section headings (`### Local
 * development`, `### Deployment`, `### Overview`) stay visible as
 * signposts between the outer heading and the per-diagram dropdowns.
 *
 * Earlier phases:
 *   - Phase 2: byte-identical refactor. No user-visible change; this
 *     emitter produced the same output as the old direct-string-
 *     concatenation path.
 *   - Phase 4 (this version): flip on the per-diagram <details>
 *     wrappers and the intro sentence.
 */

import type {
  ArchitectureModel,
  ArchitectureSection,
} from './build-architecture-mermaid.ts';

/**
 * Default intro sentence rendered below the `## Architecture` heading.
 * Locked in by PLAN-architecture-diagram-display Q4.
 */
const DEFAULT_INTRO =
  'These diagrams are auto-generated from the template\'s metadata. Click any diagram to enlarge.';

/**
 * Emit the full `## Architecture` MDX block for a model, or null if the
 * model has no sections (overlay templates). The returned string starts
 * with `## Architecture` and ends with a trailing newline.
 *
 * Each diagram is wrapped in a `<details className="dropdownBlock">`
 * element with a `<summary>{diagram.name}</summary>` label. The
 * dropdown is collapsed by default; readers see the section headings
 * and dropdown labels without the diagram content forcing its way onto
 * the page.
 *
 * The model's `intro` field overrides the default intro sentence. If
 * `intro` is an empty string, no intro is emitted (explicit opt-out).
 * If `intro` is undefined, the DEFAULT_INTRO is used.
 */
export function emitArchitectureMdx(model: ArchitectureModel): string | null {
  if (model.sections.length === 0) return null;

  // Wrap the entire Architecture section in a card container that mirrors
  // the Environment card's visual language. The `.templateCard` and
  // `.templateCardEyebrow` classes are global (defined in custom.css) —
  // shared with <TemplateEnvironment> so both sections look the same.
  //
  // The `<div>` and the `## Architecture` heading must be separated by a
  // blank line so MDX re-enters markdown mode to parse the heading.
  // Same rule applies to the `</div>` at the end.
  const parts: string[] = [
    '<div className="templateCard">',
    '<div className="templateCardEyebrow">ARCHITECTURE</div>',
    '',
    '## Architecture',
    '',
  ];

  const intro = model.intro === undefined ? DEFAULT_INTRO : model.intro;
  if (intro !== '') {
    parts.push(intro);
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

  parts.push('');
  parts.push('</div>');

  return parts.join('\n') + '\n';
}

/**
 * Emit one `### Title` sub-section with its list of diagrams.
 * Each diagram is wrapped in a `<details>` block with a per-diagram
 * summary. The blank lines around the mermaid fence inside `<details>`
 * are load-bearing: MDX's parser needs them to re-enter markdown mode
 * for the fenced code block (otherwise the fence is treated as inline
 * JSX content and the mermaid source isn't rendered as a diagram).
 */
function emitSection(parts: string[], section: ArchitectureSection): void {
  parts.push(`### ${section.title}`);
  parts.push('');

  for (let i = 0; i < section.diagrams.length; i++) {
    const diagram = section.diagrams[i]!;
    parts.push('<details className="dropdownBlock">');
    parts.push(`<summary>${escapeSummary(diagram.name)}</summary>`);
    parts.push('');
    parts.push('```mermaid');
    parts.push(diagram.mermaid);
    parts.push('```');
    parts.push('');
    parts.push('</details>');
    // Blank line between dropdowns within a section (but not after the last).
    if (i < section.diagrams.length - 1) {
      parts.push('');
    }
  }
}

/**
 * Escape MDX-hostile characters in a summary label. For the current
 * Components / Flow vocabulary this is a no-op, but future diagram
 * names might contain `<`, `>`, `&`, or `{`, which MDX would
 * mis-interpret. Cheap defensive helper.
 */
function escapeSummary(name: string): string {
  return name
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;');
}
