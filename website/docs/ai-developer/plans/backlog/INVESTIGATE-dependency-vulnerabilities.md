# Investigate: Dependency Vulnerabilities

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Backlog

**Goal**: Address 10 open Dependabot alerts across the website and template dependencies.

**Priority**: Medium

**Last Updated**: 2026-03-31

---

## Current Alerts

### Website (2 alerts)

Both in `serialize-javascript` (transitive dependency of Docusaurus/webpack):

| Severity | Package | Issue |
|----------|---------|-------|
| High | serialize-javascript | RCE via RegExp.flags and Date.prototype.toISOString() |
| Medium | serialize-javascript | CPU Exhaustion DoS via crafted array-like objects |

**Fix**: `npm audit fix` in `website/`, or wait for Docusaurus to update webpack.

### TypeScript Basic Webserver Template (7 alerts)

Express and its dependencies:

| Severity | Package | Issue |
|----------|---------|-------|
| High | path-to-regexp | DoS via sequential optional groups |
| High | minimatch | ReDoS via multiple GLOBSTAR segments |
| Medium | path-to-regexp | ReDoS via multiple wildcards |
| Medium | picomatch | Method injection in POSIX character classes |
| Medium | qs | arrayLimit bypass allows DoS via memory exhaustion |
| Medium | body-parser | DoS when url encoding is used |
| Low | qs | arrayLimit bypass in comma parsing |

**Fix**: Update express to v5+ (which updates path-to-regexp, qs, body-parser). Or `npm audit fix` in `templates/typescript-basic-webserver/`. Note: Dependabot has PRs open for some of these.

### Python Basic Webserver Template (1 alert)

| Severity | Package | Issue |
|----------|---------|-------|
| Low | flask | Session does not add `Vary: Cookie` header when accessed in some ways |

**Fix**: Update flask version in `requirements.txt`. Dependabot has a PR open for this.

---

## Considerations

- **Template dependencies are copied to user projects** — when a user installs a template, they get the `package.json` / `requirements.txt` with these versions. Fixing here means new projects start clean.
- **Existing user projects are not affected** — they already copied the files and manage their own dependencies.
- **Dependabot has open PRs** for some fixes — check if we can just merge those.
- **Express v5 migration** for the TypeScript template would fix most alerts but may require code changes (breaking changes in path-to-regexp v8).
- **Website vulnerabilities** are in build-time dependencies (webpack/terser) — they don't affect end users browsing the site.

---

## Open Dependabot PRs

Check with: `gh pr list --label dependencies`

---

## Next Steps

- [ ] Check if Dependabot PRs can be merged directly
- [ ] For remaining issues, create a PLAN to update dependencies
- [ ] Test that templates still work after dependency updates
