---
sidebar_position: 6
---

# README Structure

All template READMEs should follow this standard structure. This ensures a consistent experience for users across all templates.

## Required Sections

These sections must be present (checked by `validate-docs.sh`):

| Section | Purpose |
|---------|---------|
| **Quick Start** | Numbered copy-paste steps to install, configure, and run the template |
| **Prerequisites** | What needs to exist before the template works (DCT, UIS provision-host running, services deployed in cluster) |
| **Project Structure** | Directory tree showing the layout the user sees after `dev-template <id>` |

## Optional Sections

These are recommended but not enforced:

| Section | Purpose |
|---------|---------|
| **Development** | How to edit, test, and debug the app |
| **CI/CD** | How the GitHub Actions workflow works |
| **Try this with** | Cross-references to related/companion templates |
| **VS Code tip** | One-line workspace setting the user can paste into their existing `.vscode/settings.json` (see "VS Code settings pattern" below) |

## VS Code settings pattern (do not ship `.vscode/` files)

**Templates must not ship `.vscode/settings.json` or `.vscode/extensions.json` files.** Per [12MSG in INVESTIGATE-improve-template-docs-with-services.md](../ai-developer/plans/backlog/INVESTIGATE-improve-template-docs-with-services.md), DCT does not implement JSON merge for template files. A template that ships `.vscode/settings.json` would risk overwriting the user's existing VS Code config (including the devcontainer extension recommendation in `extensions.json` that the project needs to start).

**If your template benefits from a specific VS Code workspace setting**, document it in the README under a "VS Code tip" section. The pattern (used by `python-basic-webserver-database`):

```markdown
**VS Code tip (optional):** if you see "Error refreshing packages" from VS Code's Python extension, add this to your workspace `.vscode/settings.json`:

`​``json
{
  "python-envs.alwaysUseUv": true
}
`​``

The error happens because <one-sentence reason>. The setting tells <which extension> to <what it does instead>. If your project's `.vscode/settings.json` already exists with other keys, just add this one — don't replace the file.
```

**The three rules:**

1. **One sentence explaining the symptom** — what error/problem the user might see
2. **One sentence explaining the fix** — what the setting does
3. **The literal one-line addition** — copy-pasteable JSON
4. **A "don't replace the file" reminder** — protects users with existing VS Code config

**If a setting becomes universally needed across many templates**, the right home is DCT's base devcontainer image (extension recommendations + workspace defaults), not template-level files. That's a DCT investigation, not a template change.

## Required Sections for templates with `requires`

If your template declares `requires:` in `template-info.yaml` (i.e., it needs UIS services like PostgreSQL, Redis, Authentik), the README must include these additional sections:

| Section | Purpose |
|---------|---------|
| **What this is** | Brief description of the app — what it does, what endpoints it has, what the user will see when it runs |
| **Prerequisites** (UIS-aware) | Verify the UIS provision-host container is running. Mention that DCT v1.7.34+ provides the `uis` shim so commands like `uis status` and `uis connect` work from inside DCT. |
| **Inline file content** | Embed `template-info.yaml` (at minimum the `params:` and `requires:` sections) and the init file(s) (e.g., `config/init-database.sql`) directly in the README so users see the format without opening files |
| **Verify it worked** | A DB-level (or service-level) verify command that doesn't require running the app — for PostgreSQL, `uis connect <service> <db>` is the canonical pattern |

## Removed sections

These sections used to be optional but should NOT be added to new templates:

- **~~Docker Build~~** — manual `docker build` and `docker run` bypass the GitHub Actions pipeline. New templates should not document the manual flow.
- **~~Kubernetes Deployment~~** — manual `kubectl apply` bypasses ArgoCD. New templates should use a single "Deploy" section that walks through `git push` → GitHub Actions → ArgoCD.

## Template — basic app (no `requires`)

```markdown
# Template Display Name

Brief one-line description of what this template provides.

## Quick Start

1. Create the project from this template:
   `​``bash
   dev-template <template-id>
   `​``

2. Run the app:
   `​``bash
   <your run command here>
   `​``

3. Open in browser: http://localhost:<port>

## Prerequisites

Development tools are installed automatically by the devcontainer.
If you need to reinstall, run: `dev-setup`

## Project Structure

After installation, your project contains:

`​``plaintext
├── app/
│   └── main.ext                           # Application entry point
├── manifests/
│   ├── deployment.yaml                    # K8s Deployment + Service
│   └── kustomization.yaml                 # ArgoCD configuration
├── .github/
│   └── workflows/
│       └── urbalurba-build-and-push.yaml  # CI/CD pipeline
├── Dockerfile                             # Container build
├── template-info.yaml                     # Template metadata
└── README-<template-name>.md              # This file
`​``

## Development

- Edit `app/main.ext` — the main application file
- Describe hot reload behavior if applicable
- The `/` endpoint returns "Hello World" with template name and time/date

## Deploy to your local cluster

1. `git push` — GitHub Actions builds and pushes the image
2. `./uis argocd register <app-name> <repo-url>` — register with ArgoCD (one-time)
3. Access the app at `http://<app-name>.localhost`
```

## Template — app with `requires` (database, auth, etc.)

For templates that depend on UIS services, follow the pattern from `python-basic-webserver-database`:

```markdown
# Template Display Name

Brief one-line description.

## What this is

A small but complete <framework> application:

| Endpoint | Method | Returns |
|---|---|---|
| `/` | GET | ... |
| `/items` | GET | ... |

The app **requires** `<ENV_VAR>` and exits if it's missing.

## Prerequisites

This template uses UIS to configure <service>. Verify the UIS provision-host container is running:

`​``bash
docker ps --filter name=uis-provision-host --format '{{.Status}}'
`​``

Inside DCT v1.7.34+ you also have the `uis` shim. If `<service>` isn't deployed, `dev-template-configure` will tell you what to run.

## Quick Start

### 1. Install the template
`​``bash
dev-template <template-id>
`​``

### 2. Edit `template-info.yaml`
Open `template-info.yaml`, find the `params:` section, set your values:

`​``yaml
params:
  app_name: "my-cool-app"
  database_name: "my_cool_app_db"
`​``

The full `template-info.yaml` declares the dependency:
`​``yaml
requires:
  - service: <service>
    config:
      ...
      init: "config/init-<service>.<ext>"
`​``

### 3. (Optional) Customise `config/init-<service>.<ext>`
`​``<lang>
-- The init file content goes here, embedded in the README
`​``

All statements should be idempotent so re-running configure is safe.

### 4. Run `dev-template-configure`
`​``bash
dev-template-configure
`​``

### 5. Verify the database (or service)
`​``bash
uis connect <service> <db-or-resource>
`​``

### 6. Run the app
`​``bash
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
python app/app.py
`​``

### 7. Open in your browser
VS Code's Ports tab auto-forwards the port. Click the globe icon next to it.

## Project Structure

After installation, your project contains:

`​``plaintext
├── app/
├── config/
│   └── init-<service>.<ext>     # Schema/config (applied by dev-template-configure)
├── manifests/
├── .vscode/
│   └── settings.json            # IDE settings
├── .gitignore                   # Excludes .env*, .venv/, etc.
├── template-info.yaml           # Template metadata
└── README-<template-name>.md    # This file
`​``

## Development

...

## Deploy to your local cluster

1. `git push` — GitHub Actions builds and pushes the image
2. `./uis argocd register <app-name> <repo-url>` — register with ArgoCD
3. Access the app at `http://<app-name>.localhost`

The Kubernetes Secret containing service credentials is created automatically by `dev-template-configure` (via UIS) and referenced from `manifests/deployment.yaml` via `secretKeyRef`. You don't need to create it manually.

## Try this with

- [Companion or related templates](../<category>/<other-template>) — describe how they compose
```

## Notes

- The **Quick Start** section is the most important — users see it first after installation
- **Project Structure** should show the layout the user sees after `dev-template <id>` runs, not the template source layout
- Keep descriptions concise — the README is a quick reference, not a tutorial
- Don't include tool installation instructions — `dev-template <id>` and `dev-template-configure` handle this via `tools:` in `template-info.yaml`
- For templates with `requires:`, **embed the file contents** for `template-info.yaml` and init files in the README. Users need to see what they're editing.
- **Don't document manual `docker build` or `kubectl apply` workflows.** They bypass GitHub Actions + ArgoCD and aren't the standard platform workflow.
