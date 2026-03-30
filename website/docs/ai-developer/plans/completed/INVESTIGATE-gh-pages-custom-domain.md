# Investigate: GitHub Pages Setup with Custom Domain

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Completed

**Completed**: 2026-03-30

**Goal**: Enable GitHub Pages for this repo and configure `tmp.sovereignsky.no` as the custom domain.

**Last Updated**: 2026-03-30

---

## Context

The Docusaurus site is set up in `website/` with a GitHub Actions workflow (`deploy-docs.yml`) ready to deploy. The config currently points to `helpers-no.github.io/dev-templates/`. We need to enable GitHub Pages and configure the custom domain.

---

## Questions to Answer

1. ~~What custom domain name should be used?~~ — **Answered**: `tmp.sovereignsky.no` (follows pattern: DCT uses `dct.sovereignsky.no`)
2. What DNS provider is used for `sovereignsky.no`? How are DNS records managed?
3. ~~Do the other projects already have custom domains?~~ — **Answered**: Yes, DCT uses `dct.sovereignsky.no`
4. ~~Subdomain or path?~~ — **Answered**: Subdomain (`tmp.sovereignsky.no`)
5. ~~Is HTTPS required?~~ — **Answered**: Yes, GitHub Pages provides it via Let's Encrypt

---

## Steps Required

### 1. DNS: Create CNAME record

Add a CNAME record for `tmp.sovereignsky.no` pointing to `helpers-no.github.io`.

**This must be done by whoever manages the `sovereignsky.no` DNS.**

### 2. Repo: Update Docusaurus config

In `website/docusaurus.config.ts`:
- `url`: change from `https://helpers-no.github.io` to `https://tmp.sovereignsky.no`
- `baseUrl`: change from `/dev-templates/` to `/`

### 3. Repo: Create CNAME file

Create `website/static/CNAME` containing:
```
tmp.sovereignsky.no
```

This file gets copied to the build output root, which tells GitHub Pages the custom domain.

### 4. GitHub: Enable Pages

```bash
# Create Pages with GitHub Actions as source
gh api repos/helpers-no/dev-templates/pages -X POST -f build_type=workflow

# Set custom domain
gh api repos/helpers-no/dev-templates/pages -X PUT -f cname=tmp.sovereignsky.no
```

### 5. TLS Certificate Provisioning

**Gotcha:** Setting the custom domain via `gh api` does not always trigger certificate provisioning. If `gh api repos/<owner>/<repo>/pages` does not show an `https_certificate` field, the cert was never requested.

**Fix:** Remove and re-add the custom domain to force certificate provisioning:

```bash
# Remove custom domain
gh api repos/helpers-no/dev-templates/pages -X PUT -f cname=""

# Re-add — this triggers the certificate request
gh api repos/helpers-no/dev-templates/pages -X PUT -f cname=tmp.sovereignsky.no

# Verify cert is being provisioned (state should be "new" then "approved")
gh api repos/helpers-no/dev-templates/pages --jq '.https_certificate'
```

Wait for `state: "approved"` (usually 2-5 minutes), then enforce HTTPS:

```bash
gh api repos/helpers-no/dev-templates/pages -X PUT -F https_enforced=true
```

### 6. Verify

- Push to main triggers the deploy workflow
- Site available at `https://tmp.sovereignsky.no`

---

## All Steps Completed

- [x] DNS CNAME record created: `tmp.sovereignsky.no` → `helpers-no.github.io` ✓
- [x] Docusaurus config updated (url + baseUrl) ✓
- [x] CNAME file created in `website/static/` ✓
- [x] GitHub Pages enabled with Actions source ✓
- [x] Custom domain configured ✓
- [x] TLS certificate provisioned (required remove + re-add of custom domain to trigger) ✓
- [x] HTTPS enforced ✓
- [x] Site live at `https://tmp.sovereignsky.no` ✓
