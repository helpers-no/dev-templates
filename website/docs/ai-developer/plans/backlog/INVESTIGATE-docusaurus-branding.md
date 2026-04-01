# Investigate: Docusaurus Branding and Visual Identity

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Backlog

**Goal**: Add proper branding, logo, colors, and homepage design to the dev-templates Docusaurus site, following the UIS visual identity.

**Priority**: Medium

**Last Updated**: 2026-03-31

**Related**:
- `helpers-no/urbalurba-infrastructure` (UIS) — has complete branding with logos, color scheme, hero section, and brand scripts. Use as reference.

---

## Current State (tmp.sovereignsky.no)

The site uses Docusaurus defaults with no custom branding:

- **No logo** — just text "Dev Templates" in the navbar
- **No favicon** — uses Docusaurus default
- **No social card** — no Open Graph image for link previews
- **Default colors** — Docusaurus green, not SovereignSky brand colors
- **Generic homepage** — placeholder feature cards ("Easy to Use", "Powered by React", "Built-in Search") from the Docusaurus starter
- **Minimal footer** — just copyright and basic links
- **No hero section** — no compelling visual or tagline

## What UIS Has (uis.sovereignsky.no)

- **Custom logo** — green SovereignSky logo in navbar (`uis-logo-green.svg`)
- **Custom favicon** — branded `favicon.ico`
- **Social card** — Open Graph image for link previews (`social-card.jpg`)
- **SovereignSky color scheme** — primary green `#3a8f5e`, teal `#25c2a0`, navy `#1e3a5f`
- **Hero section** — "Complete datacenter on your laptop" tagline + Get Started / Explore Services buttons
- **Category cards** on homepage — visual overview of what's available
- **Rich footer** — documentation links, external resources (GitHub, SovereignSky)
- **Brand scripts** — `publish-logo.sh`, `publish-favicon.sh`, `publish-social-card.sh`, `create-social-card.sh` for generating/converting brand assets

### UIS Brand File Structure

```
website/static/img/
├── brand/
│   ├── uis-logo-green.svg       # Main logo
│   ├── uis-logo-teal.svg        # Alternate logo
│   ├── uis-text-green.svg       # Text-only logo
│   ├── create-social-card.sh    # Script to generate social card
│   ├── publish-favicon.sh       # Script to convert logo to favicon
│   ├── publish-logo.sh          # Script to prepare logo
│   ├── publish-social-card.sh   # Script to publish social card
│   └── tmp/                     # Working files
├── favicon.ico                  # Browser tab icon
├── logo.svg                     # Docusaurus navbar logo
└── social-card.jpg              # Open Graph image
```

### UIS Color Scheme

```css
--ifm-color-primary: #3a8f5e;        /* SovereignSky green */
--ifm-color-primary-dark: #348053;
--ifm-color-primary-darker: #31794f;
--ifm-color-primary-darkest: #286441;
--ifm-color-primary-light: #409e69;
--ifm-color-primary-lighter: #43a56d;
--ifm-color-primary-lightest: #52b87c;
```

---

## What We Need

### Must Have

| Item | Description | Source |
|------|-------------|--------|
| ~~**Logo SVG**~~ | ~~Dev Templates logo for the navbar~~ | **Done** — `website/static/img/brand/dev-templates-logo.svg` + `website/static/img/logo.svg`. Stacked plates with `</>` code symbols in SovereignSky green (`#3a8f5e`). Configured in navbar. |
| ~~**Favicon**~~ | ~~Browser tab icon~~ | **Done** — `website/static/img/favicon.ico` generated via `publish-favicon.sh` (requires `dev-imagetools` in devcontainer). |
| ~~**Social card**~~ | ~~Open Graph image for link previews~~ | **Done** — Gemini-generated tiles cityscape on navy. Scripts: `create-social-card.sh`, `publish-social-card.sh`. Published as `social-card.jpg`. |
| ~~**Color scheme**~~ | ~~SovereignSky brand colors in `custom.css`~~ | **Done** — primary `#3a8f5e` (light), `#25c2a0` (dark). Matches DCT and UIS. |
| ~~**Homepage redesign**~~ | ~~Replace placeholder content~~ | **Done** — DCT-style hero (animation left, logo+title+tagline+buttons right), CategoryGrid + TemplateGrid below. |
| ~~**Footer links**~~ | ~~GitHub repo, SovereignSky website, documentation links~~ | **Done** — three columns: Documentation, Community (GitHub, DCT, UIS), More (Blog, SovereignSky). Copyright: SovereignSky. |

### Also Done

| Item | Status |
|------|--------|
| **Brand scripts** | **Done** — `publish-favicon.sh` created. Brand `README.md` documents workflow. |
| **GitHub link in navbar** | **Done** — GitHub link on the right side of the navbar, matching UIS. |
| **Brand README** | **Done** — `website/static/img/brand/README.md` documents assets, scripts, and workflow. |
| **Contributors reference** | **Done** — Brand scripts documented in `contributors/scripts-reference.md`. |
| **Homepage hero** | **Done** — Navy gradient background, two-line tagline, Get Started + Browse Templates buttons, placeholder animation SVG (to be replaced with animated SVG later). Matches UIS layout. |
| **Homepage content** | **Done** — CategoryGrid + TemplateGrid below the hero, same as `/templates` page. |
| **Tagline** | **Done** — "Instant-start templates / for any service, any language" (two lines). |
| **Navbar cleanup** | **Done** — Removed Contributors from top nav (still in sidebar and footer). |

### Remaining

| Item | Description |
|------|-------------|
| **Social card** | Open Graph image for link previews (GitHub, Slack, etc.) |
| **Hero animated SVG** | Replace the placeholder animation with a proper animated SVG |
| ~~**Dark mode logo**~~ | ~~Alternate logo for dark mode~~ | **Done** — teal variant at `website/static/img/logo-dark.svg`, configured via `srcDark` in navbar. |
| ~~**Homepage hero layout**~~ | ~~Hero section design~~ | **Done** — centered vertical layout (DCT style): logo above, title, tagline, buttons. Navy gradient background. |

### Note for UIS contributor

The hero layout was changed from UIS side-by-side style to DCT centered style (logo above title). The UIS site should be updated to match this pattern for consistency across all three sites (DCT, dev-templates, UIS).

---

## Questions to Answer

1. ~~Should we create a unique Dev Templates logo, or reuse/adapt the SovereignSky logo?~~ — **User will provide a logo file.** Create `website/static/img/brand/` folder for it.
2. ~~What tagline for the hero section?~~ — **"Instant-start templates for any service, any language"**
3. ~~Should the homepage show templates overview?~~ — **Yes**, something similar to the `/templates` page layout.
4. ~~Should we copy the UIS brand scripts?~~ — **Yes**, copy and adapt for dev-templates.

---

## Next Steps

- [ ] Create PLAN for branding implementation
