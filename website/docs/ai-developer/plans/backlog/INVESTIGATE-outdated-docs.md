# Investigate: Outdated Documentation References

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Backlog

**Goal**: Fix outdated references in contributor docs and other pages that weren't updated when metadata fields changed.

**Priority**: Low

**Last Updated**: 2026-04-01

---

## Known Issues

### 1. `contributors/template-metadata.md` — TEMPLATE_WEBSITE and TEMPLATE_DOCS examples outdated

The field descriptions and example still show old framework URLs:

- `TEMPLATE_WEBSITE` description says "Framework/language homepage URL" — should say "Live demo URL (empty if none)"
- `TEMPLATE_DOCS` description says "Framework/language documentation URL" — should say "Template source code on GitHub"
- Example shows `TEMPLATE_WEBSITE="https://flask.palletsprojects.com"` — should be `TEMPLATE_WEBSITE=""`
- Example shows `TEMPLATE_DOCS="https://flask.palletsprojects.com/en/stable/"` — should be `TEMPLATE_DOCS="https://github.com/helpers-no/dev-templates/tree/main/templates/python-basic-webserver"`

### 2. `contributors/scripts-reference.md` — references `scripts/lib/categories.sh` instead of `TEMPLATE_CATEGORIES`

Line says: "TEMPLATE_CATEGORY is a valid category ID (defined in `scripts/lib/categories.sh`)"
Should say: "defined in `scripts/lib/TEMPLATE_CATEGORIES`"

### 3. `contributors/template-metadata.md` — Valid Categories table missing emoji column

The table doesn't show the emoji field. Should match `naming-conventions.md` which now has the emoji column.

### 4. `contributors/creating-a-template.md` — may have stale references

Check if the step-by-step guide references old field descriptions or missing TEMPLATE_CATEGORIES info.

---

## Next Steps

- [ ] Fix all issues above in a single pass
