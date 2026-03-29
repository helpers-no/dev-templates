# Investigate: GitHub Pages Setup with Custom Domain

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Backlog

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

1. Go to repo **Settings > Pages**
2. Source: select **GitHub Actions**
3. Custom domain: enter `tmp.sovereignsky.no`
4. Enable **Enforce HTTPS**

### 5. Verify

- Push to main triggers the deploy workflow
- Site available at `https://tmp.sovereignsky.no`

---

## Open Questions

- [ ] Who manages the `sovereignsky.no` DNS? Can you create the CNAME record, or does someone else need to do it?

---

## Next Steps

- [ ] Create the DNS CNAME record for `tmp.sovereignsky.no`
- [ ] Implement the repo changes (config update + CNAME file)
- [ ] Enable GitHub Pages in repo settings
