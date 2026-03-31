---
sidebar_position: 2
---

# Creating a Template

This guide walks you through creating a new project template for the Urbalurba developer platform.

## How Templates Work

When a user runs `dev-template` inside a devcontainer:

1. The script downloads the latest `dev-templates` repo as a zip from GitHub
2. It scans `templates/*/TEMPLATE_INFO` for available templates
3. The user selects a template from the dialog menu
4. Template files are copied to the user's project root
5. Placeholders (`{{GITHUB_USERNAME}}`, `{{REPO_NAME}}`) are replaced in manifests and workflows
6. Tools declared in `TEMPLATE_TOOLS` are auto-installed in the devcontainer

AI templates follow the same pattern via `dev-template-ai`, scanning `ai-templates/*/TEMPLATE_INFO` instead.

## Step-by-Step

### 1. Create the Template Folder

```bash
mkdir templates/my-language-basic-webserver
```

Use lowercase, hyphenated names. See [Naming Conventions](naming-conventions.md).

### 2. Create TEMPLATE_INFO

Create `templates/my-language-basic-webserver/TEMPLATE_INFO` with all mandatory fields:

```bash
TEMPLATE_ID="my-language-basic-webserver"
TEMPLATE_VER="1.0.0"
TEMPLATE_NAME="My Language Basic Webserver"
TEMPLATE_DESCRIPTION="My Language web server with health endpoint and Docker support"
TEMPLATE_CATEGORY="BASIC_WEB_SERVER"
TEMPLATE_ABSTRACT="Provides a minimal starting point for developers who want to build a web server using My Language"
TEMPLATE_TOOLS="dev-my-language"
TEMPLATE_README="README-my-language-basic-webserver.md"
TEMPLATE_TAGS="my-language webserver api rest"
TEMPLATE_LOGO="my-language-basic-webserver-logo.svg"
TEMPLATE_WEBSITE="https://my-language.org"
TEMPLATE_DOCS="https://my-language.org/docs"
TEMPLATE_SUMMARY="A minimal My Language web server with a health check endpoint, Docker containerization, Kubernetes deployment manifests, and GitHub Actions CI/CD workflow."
TEMPLATE_RELATED="typescript-basic-webserver python-basic-webserver"
```

See [Template Metadata Reference](template-metadata.md) for details on each field.

### 3. Add Application Code

Create your app in an `app/` directory:

```
templates/my-language-basic-webserver/
├── app/
│   └── main.ext          # Your application entry point
```

The app should:
- Serve a web page on a port (typically 3000)
- Display the template name, "Hello World", and current time/date
- Respond to health check requests

### 4. Add Dockerfile

Create a `Dockerfile` that builds and runs your application. Use multi-stage builds where appropriate.

### 5. Add Kubernetes Manifests

Create `manifests/` with:
- `deployment.yaml` — Deployment + Service definition (use `{{GITHUB_USERNAME}}` and `{{REPO_NAME}}` placeholders)
- `kustomization.yaml` — ArgoCD configuration

### 6. Add GitHub Actions Workflow

Create `.github/workflows/urbalurba-build-and-push.yaml` for CI/CD. Use `{{GITHUB_USERNAME}}` and `{{REPO_NAME}}` placeholders.

### 7. Create the README

Create `README-my-language-basic-webserver.md` following the [standard structure](readme-structure.md).

### 8. Add a Logo

Create an SVG logo at `website/static/img/templates/my-language-basic-webserver-logo.svg`. A simple 512x512 circle with the language initial works fine.

### 9. Validate

```bash
# Check all metadata fields
bash scripts/validate-metadata.sh

# Check markdown files
bash scripts/validate-docs.sh

# Generate JSON and docs
bash scripts/generate-templates-json.sh
bash scripts/generate-docs-markdown.sh --force

# Test the build
npm run build --prefix website
```

### 10. Submit a Pull Request

Push your branch and create a PR. The CI/CD pipeline will validate, generate pages, and build the site automatically.

## What Happens After You Push

When your PR is merged to `main`, GitHub Actions automatically:

1. **Validates** — runs `validate-metadata.sh` and `validate-docs.sh`
2. **Generates** — creates `templates.json`, template detail pages (MDX), category indexes, plan indexes
3. **Auto-commits** generated files if they changed
4. **Builds** the Docusaurus site
5. **Deploys** to GitHub Pages

Your template will appear on the website and in the `dev-template` selection menu.

## Template File Checklist

| File | Required | Notes |
|------|----------|-------|
| `TEMPLATE_INFO` | Yes | All fields mandatory |
| `app/` | Yes | Application source code |
| `Dockerfile` | Yes | Container build |
| `manifests/deployment.yaml` | Yes | K8s Deployment + Service with placeholders |
| `manifests/kustomization.yaml` | Yes | ArgoCD configuration |
| `.github/workflows/*.yaml` | Yes | CI/CD pipeline with placeholders |
| `README-<name>.md` | Yes | Following standard structure |
| `.gitignore` | Recommended | Language-specific ignores |
| `.dockerignore` | Recommended | Docker build ignores |
| Logo SVG | Yes | In `website/static/img/templates/` |
