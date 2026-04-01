# Investigate: Docusaurus Design Tweaks

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Backlog

**Goal**: Collect and track design improvements for the Docusaurus site. Each tweak is independent and can be implemented separately.

**Priority**: Low

**Last Updated**: 2026-04-01

---

## Tweaks

### 1. Tag pages should use TemplateCard components

**Current**: The Docusaurus auto-generated tag pages (`/docs/tags/webserver`) show a plain list with title and description. No logos, no cards.

**Desired**: Tag pages should show templates using the same TemplateCard component used on the `/templates` page — with logo, name, abstract, and tags.

**Problem**: Docusaurus tag pages are auto-generated from frontmatter and use a built-in layout. There's no simple way to override the tag page rendering.

**Options**:
- **Swizzle the Docusaurus tag page component** — override `@theme/DocTagDocListPage` to render TemplateCards instead of the default list. This is the Docusaurus-native approach but couples us to Docusaurus internals.
- **Build custom tag pages** — create our own `/templates/tags/<tag>` React pages that filter templates by tag and render TemplateCards. Then make the tag links in TemplateHeader point to our custom pages instead of `/docs/tags/<tag>`.
- **Leave as-is** — the default tag pages work, just look plain.

**Effort**: Medium (swizzle) or High (custom pages)

---

### 2. (add future tweaks here)

