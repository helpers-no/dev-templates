# Brand Assets

This folder contains the source branding assets and scripts for generating website images.

## Quick Start

Run these scripts inside the devcontainer where ImageMagick is available (install `dev-imagetools` via `dev-setup` first):

```bash
# Generate and publish all assets
./publish-favicon.sh
./create-social-card.sh $'Dev\nTemplates' $'Instant-start templates\nfor any service, any language'
./publish-social-card.sh
```

## Files Overview

### Source Logos
| File | Purpose |
|------|---------|
| `dev-templates-logo.svg` | Main logo — SovereignSky green (`#3a8f5e`), sized 100x80, solid `</>` fills |
| `dev-templates-text-green.svg` | TMP text-only logo for social card branding |

### Social Card Assets
| File | Purpose |
|------|---------|
| `right-side-dev-template-logo.png` | Original Gemini-generated tiles cityscape |
| `right-side-dev-template-logo-clean.png` | Cleaned version (Gemini star removed) |
| `social-card-background.png` | Composited background (tiles on navy, 1424x752) |
| `social-card-generated.png` | Final social card with text and logo |

### Scripts
| Script | Purpose |
|--------|---------|
| `remove-gemini-stars.sh` | Remove Gemini watermark stars from images (auto-detects background color) |
| `create-social-card.sh` | Generate social card with title, tagline, and logo+TMP branding |
| `publish-social-card.sh` | Publish social card to `../social-card.jpg` |
| `publish-favicon.sh` | Generate and publish favicon to `../favicon.ico` |

## Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. PREPARE BACKGROUND (only needed once)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   right-side-dev-template-logo.png (Gemini source)              │
│              │                                                  │
│              ▼                                                  │
│   ./remove-gemini-stars.sh -right input.png output.png          │
│              │                                                  │
│              ▼                                                  │
│   right-side-dev-template-logo-clean.png                        │
│              │                                                  │
│              ▼                                                  │
│   Composite onto navy background (1424x752):                    │
│   convert -size 1424x752 xc:'rgb(19,40,71)' bg.png             │
│   convert bg.png \( clean.png -resize x700 \)                   │
│     -gravity West -geometry +0+0 -composite background.png      │
│              │                                                  │
│              ▼                                                  │
│   social-card-background.png                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 2. GENERATE SOCIAL CARD                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ./create-social-card.sh "Title" "Tagline"                     │
│              │                                                  │
│              ▼                                                  │
│   social-card-generated.png                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 3. PUBLISH TO WEBSITE                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ./publish-social-card.sh  →  ../social-card.jpg               │
│   ./publish-favicon.sh      →  ../favicon.ico                   │
│                                                                 │
│   Logo is copied manually:                                      │
│   cp dev-templates-logo.svg ../logo.svg                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Generating the Dark Mode Logo

The dark mode logo uses teal (`#25c2a0`) instead of green. Generate it by replacing the color:

```bash
sed 's/#3a8f5e/#25c2a0/g' dev-templates-logo.svg > ../logo-dark.svg
```

Docusaurus uses `srcDark` in the navbar config to switch logos automatically.

## Output Files

The publish scripts create these files in the parent folder (`static/img/`):

| File | Used By |
|------|---------|
| `logo.svg` | Navbar logo (light mode) |
| `logo-dark.svg` | Navbar logo (dark mode) |
| `favicon.ico` | Browser tab icon |
| `social-card.jpg` | Open Graph / Twitter cards |

## Prerequisites

Requires `dev-imagetools` installed in the devcontainer:
- ImageMagick (`convert`)
- librsvg2-bin (`rsvg-convert`)
- webp tools

Install via `dev-setup` and select "Image Processing Tools", or add `dev-imagetools` to `.devcontainer.extend/enabled-tools.conf`.

## Color Scheme

All brand assets use SovereignSky colors:
- **Primary green**: `#3a8f5e`
- **Teal**: `#25c2a0`
- **Navy**: `#1e3a5f`
