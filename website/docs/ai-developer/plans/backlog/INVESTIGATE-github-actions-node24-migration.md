# Investigate: GitHub Actions Node.js 24 Migration

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Backlog

**Goal**: Migrate GitHub Actions workflows from Node.js 20 actions to Node.js 24-compatible versions before the forced migration on June 2nd, 2026.

**Priority**: Medium

**Last Updated**: 2026-04-06

---

## Context

Every CI run produces this warning:

```
Node.js 20 actions are deprecated. The following actions are running on Node.js 20
and may not work as expected: actions/checkout@v4, actions/setup-node@v4,
actions/upload-artifact@v4, actions/deploy-pages@v4.

Actions will be forced to run with Node.js 24 by default starting June 2nd, 2026.
Node.js 20 will be removed from the runner on September 16th, 2026.
```

### Deadlines

- **June 2, 2026** — Node.js 24 becomes default. Actions forced to run on Node.js 24 unless opted out.
- **September 16, 2026** — Node.js 20 removed entirely. No opt-out possible.

### Affected Workflow

`.github/workflows/deploy-docs.yml` — uses these actions:

| Action | Current Version | Job |
|--------|----------------|-----|
| `actions/checkout` | `@v4` | generate, build |
| `actions/setup-node` | `@v4` | generate, build |
| `actions/upload-pages-artifact` | `@v3` | build |
| `actions/deploy-pages` | `@v4` | deploy |

---

## Questions to Answer

1. Are there `@v5` versions of these actions that support Node.js 24?
2. Can we opt into Node.js 24 early with `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` to test before the forced migration?
3. Does the `setup-node` action's Node.js 20 runtime (which runs the action itself) conflict with the Node.js 20 we install for our build step? (Likely no, but verify.)
4. Are there any breaking changes in the new action versions?

---

## Next Steps

- [ ] Check for updated action versions supporting Node.js 24
- [ ] Test with `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` environment variable
- [ ] Update action versions in `deploy-docs.yml`
