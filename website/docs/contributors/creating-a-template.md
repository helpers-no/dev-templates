---
sidebar_position: 2
---

# Creating a Template

This guide walks you through creating a new project template for the Urbalurba developer platform.

## How Templates Work

When a user runs `dev-template` inside a devcontainer:

1. The script fetches `template-registry.json` from the dev-templates website
2. The user browses categories and selects a template from the dialog menu
3. Only the selected template folder is downloaded via git sparse-checkout
4. Template files are copied to the user's project (behaviour depends on `install_type`)
5. Placeholders (`{{GITHUB_USERNAME}}`, `{{REPO_NAME}}`) are replaced in manifests and workflows
6. Tools declared in `tools` are auto-installed in the devcontainer

All template types — app, AI workflow, documentation — use the same `dev-template` command.

### Template Types

| `install_type` | Behaviour | Used by |
|----------------|-----------|---------|
| `app` | Copy all files to project root. Replace placeholders in manifests/workflows. | App templates (`templates/`) |
| `overlay` | Copy `template/` subdirectory preserving paths. Handle file conflicts. Safe to re-run. | AI workflow templates (`ai-templates/`), doc templates, rules templates |
| `stack` | Deploy services to K8s cluster via UIS. | UIS infrastructure templates (`uis-stack-templates/`) |

## Creating an App Template

The most common template type. Scaffolds a complete project with app code, Dockerfile, K8s manifests, and CI/CD.

### 1. Create the Template Folder

```bash
mkdir templates/my-language-basic-webserver
```

Use lowercase, hyphenated names. See [Naming Conventions](naming-conventions.md).

### 2. Create template-info.yaml

Create `templates/my-language-basic-webserver/template-info.yaml`:

```yaml
id: my-language-basic-webserver
version: "1.0.0"
name: My Language Basic Webserver
description: My Language web server with health endpoint and Docker support
category: BASIC_WEB_SERVER
install_type: app
abstract: >
  Provides a minimal starting point for developers who want to
  build a web server using My Language.
tools: dev-my-language
readme: README-my-language-basic-webserver.md
tags:
  - my-language
  - webserver
  - api
  - rest
logo: my-language-basic-webserver-logo.svg
website: ""
docs: https://github.com/helpers-no/dev-templates/tree/main/templates/my-language-basic-webserver
summary: >
  A minimal My Language web server with a health check endpoint,
  Docker containerization, Kubernetes deployment manifests, and
  GitHub Actions CI/CD workflow.
related:
  - python-basic-webserver
  - typescript-basic-webserver
```

Key rules:
- `id` must exactly match the directory name
- `version` must be quoted (`"1.0.0"`) — YAML parses unquoted `1.0` as a float
- `category` must match a category in `templates/template-categories.yaml`
- `tags` is a YAML list, not a space-separated string

See [Template Metadata Reference](template-metadata.md) for all fields.

### 3. Add Application Code

Create your app in an `app/` directory:

```
templates/my-language-basic-webserver/
├── app/
│   └── main.ext          # Your application entry point
```

The app should:
- Serve a web page on port 3000
- Display the template name, "Hello World", and current time/date
- Respond to health check requests

### 4. Add Dockerfile

Create a `Dockerfile` that builds and runs your application. Use multi-stage builds where appropriate.

### 5. Add Kubernetes Manifests

Create `manifests/` with:
- `deployment.yaml` — Deployment + Service definition (use `{{GITHUB_USERNAME}}` and `{{REPO_NAME}}` placeholders)
- `kustomization.yaml` — ArgoCD configuration

### 6. Add GitHub Actions Workflow

Create `.github/workflows/urbalurba-build-and-push.yaml` for CI/CD. Copy from an existing template and adjust the build steps for your language.

### 7. Create the README

Create `README-my-language-basic-webserver.md` following the [standard structure](readme-structure.md).

### 8. Add a Logo

Create an SVG logo at `website/static/img/templates/my-language-basic-webserver-logo.svg`.

### 9. Validate and Test

```bash
# Check all metadata fields
bash scripts/validate-metadata.sh

# Check markdown files
bash scripts/validate-docs.sh

# Generate the registry and docs
bash scripts/generate-registry.sh
bash scripts/generate-docs-markdown.sh --force

# Test the build
npm run build --prefix website
```

### 10. Submit a Pull Request

Push your branch and create a PR. CI validates, generates pages, and builds the site automatically.

## Creating an Overlay Template

Overlay templates (`install_type: overlay`) copy files from a `template/` subdirectory into the project, preserving directory structure. Used for AI workflows, documentation templates, and coding rules that layer on top of an existing project.

### Folder Structure

```
ai-templates/my-workflow/
├── template-info.yaml        # install_type: overlay
└── template/                 # Contents copied preserving paths
    ├── CLAUDE.md
    ├── website/
    │   └── docs/
    │       └── ai-developer/
    │           └── WORKFLOW.md
    └── README-my-workflow.md
```

The `template/` subdirectory mirrors the target project structure. Everything inside it is copied to the project root, preserving relative paths. Files outside `template/` (like `template-info.yaml`) are not copied to the project — except `template-info.yaml` itself, which is always copied to the project root for `dev-template configure`.

### Key Differences from App Templates

- No Dockerfile, manifests, or GitHub workflow needed
- No placeholder replacement
- Safe to re-run — handles file conflicts (e.g., merging CLAUDE.md)
- Category is defined in the parent folder's `template-categories.yaml` (e.g., `ai-templates/template-categories.yaml`)

## Creating a Template with Service Dependencies

Templates can declare dependencies on UIS services (PostgreSQL, Redis, Authentik, etc.). After the template files are copied, the developer runs `dev-template configure` to create databases, apply init files, and generate `.env` with connection details.

### Adding requires to template-info.yaml

```yaml
id: my-app-with-database
install_type: app
tools: dev-python

params:
  app_name: ""                   # Developer fills in before configure
  database_name: ""              # Developer fills in before configure

requires:
  - service: postgresql
    env_var: DATABASE_URL        # Optional — env var name written to .env
    config:
      database: "{{ params.database_name }}"
      init: "config/init-database.sql"
```

### Adding init files

Create data files in `config/` that UIS applies during configure:

```
templates/my-app-with-database/
├── template-info.yaml
├── config/
│   └── init-database.sql       # Applied by uis configure postgresql
├── app/
│   └── ...
```

Init files must use the **native format** of the target service:
- PostgreSQL — standard SQL (`psql -f`)
- Authentik — Authentik blueprint YAML
- Grafana — dashboard export JSON

All statements should be idempotent (`CREATE TABLE IF NOT EXISTS`, `ON CONFLICT DO NOTHING`) so re-running is safe.

### The configure flow

1. Developer runs `dev-template my-app-with-database` — files copied
2. Developer edits `params` in `template-info.yaml` (or passes `--param key=value`)
3. Developer runs `dev-template configure`
4. DCT reads `template-info.yaml`, substitutes `{{ params.* }}` in requires and init files
5. DCT calls UIS via `uis-bridge` to create the database and apply the init file
6. DCT writes `DATABASE_URL` to `.env` (local connection) and `.env.cluster` (in-cluster connection)
7. App reads `DATABASE_URL` from the environment

### env_var defaults

If `env_var` is not specified, DCT uses smart defaults:
- `postgresql`, `mysql`, `mariadb`, `mongodb` → `DATABASE_URL`
- Other services → `<SERVICE>_URL` (e.g., `REDIS_URL`)

## Adding a New Category

Categories are defined per folder in `template-categories.yaml`. To add a new category:

1. Edit the `template-categories.yaml` in the relevant folder (e.g., `templates/template-categories.yaml`)
2. Add a new entry:

```yaml
categories:
  # ... existing categories ...

  - id: MY_NEW_CATEGORY
    order: 3
    name: My New Category
    description: Description of what these templates do
    tags: relevant search tags
    logo: my-category-logo.svg
    emoji: "\U0001F4E6"
```

3. Add a category logo SVG to `website/static/img/categories/`

Category IDs must be unique across all folders. Use `UPPERCASE_UNDERSCORE` format.

## What Happens After You Push

When your PR is merged to `main`, GitHub Actions automatically:

1. **Validates** — runs `validate-metadata.sh` (checks YAML fields, categories, README) and `validate-docs.sh`
2. **Generates registry** — runs `generate-registry.ts` which scans all `template-categories.yaml` + `template-info.yaml` files and outputs `template-registry.json`
3. **Generates docs** — runs `generate-docs-markdown.sh` which creates MDX detail pages and category indexes from the registry
4. **Auto-commits** generated files if they changed
5. **Builds** the Docusaurus site
6. **Deploys** to GitHub Pages at [tmp.sovereignsky.no](https://tmp.sovereignsky.no)

Your template will appear on the website and in the `dev-template` selection menu (installer fetches the registry from the live site).

## Template File Checklist

### App templates (`install_type: app`)

| File | Required | Notes |
|------|----------|-------|
| `template-info.yaml` | Yes | All required fields — see [metadata reference](template-metadata.md) |
| `app/` | Yes | Application source code |
| `Dockerfile` | Yes | Container build |
| `manifests/deployment.yaml` | Yes | K8s Deployment + Service with placeholders |
| `manifests/kustomization.yaml` | Yes | ArgoCD configuration |
| `.github/workflows/*.yaml` | Yes | CI/CD pipeline with placeholders |
| `README-<name>.md` | Yes | Following [standard structure](readme-structure.md) |
| `config/*.sql` / `*.yaml` | If `requires` | Init files for service configuration |
| `.gitignore` | Recommended | Language-specific ignores |
| Logo SVG | Yes | In `website/static/img/templates/` |

### Overlay templates (`install_type: overlay`)

| File | Required | Notes |
|------|----------|-------|
| `template-info.yaml` | Yes | At template root (outside `template/`) |
| `template/` | Yes | Contents copied preserving directory structure |
| `README-<name>.md` | Yes | Inside `template/` |
| Logo SVG | Yes | In `website/static/img/templates/` |
