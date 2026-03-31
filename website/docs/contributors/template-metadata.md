---
sidebar_position: 3
---

# Template Metadata Reference

Every template must have a `TEMPLATE_INFO` file with all mandatory metadata fields. This file is read by the `dev-template.sh` installer and by the Docusaurus generation scripts.

## Fields

All fields are mandatory.

| Field | Description | Example |
|-------|-------------|---------|
| `TEMPLATE_ID` | Unique identifier. Must match the directory name. | `python-basic-webserver` |
| `TEMPLATE_VER` | Version number (semver). | `1.0.0` |
| `TEMPLATE_NAME` | Human-readable display name. | `Python Basic Webserver` |
| `TEMPLATE_DESCRIPTION` | One-line description (shown in tables and cards). | `Minimal Flask server with health endpoint and Docker support` |
| `TEMPLATE_CATEGORY` | Category ID. Must be a valid category. | `BASIC_WEB_SERVER` |
| `TEMPLATE_ABSTRACT` | 1-2 sentence description for menus and cards. | `Provides a minimal starting point for developers who want to build a Python web server using Flask` |
| `TEMPLATE_TOOLS` | Space-separated DCT install script IDs. Empty string if none needed. | `dev-python` |
| `TEMPLATE_README` | README filename (must exist in the template directory). | `README-python-basic-webserver.md` |
| `TEMPLATE_TAGS` | Space-separated keywords for search and filtering. | `python flask webserver api rest` |
| `TEMPLATE_LOGO` | Logo filename (SVG in `website/static/img/templates/`). | `python-basic-webserver-logo.svg` |
| `TEMPLATE_WEBSITE` | Framework/language homepage URL. | `https://flask.palletsprojects.com` |
| `TEMPLATE_DOCS` | Framework/language documentation URL. | `https://flask.palletsprojects.com/en/stable/` |
| `TEMPLATE_SUMMARY` | 3-5 sentence detailed description for the template detail page. | `A minimal Python web server using Flask with a health check endpoint, Docker containerization...` |
| `TEMPLATE_RELATED` | Space-separated TEMPLATE_IDs of related templates. Empty string if none. | `php-basic-webserver typescript-basic-webserver` |

## Valid Categories

| Category ID | Display Name |
|------------|-------------|
| `BASIC_WEB_SERVER` | Basic Web Server Templates |
| `WEB_APP` | Web Application Templates |
| `WORKFLOW` | Workflow Templates |

## Complete Example

```bash
TEMPLATE_ID="python-basic-webserver"
TEMPLATE_VER="1.0.0"
TEMPLATE_NAME="Python Basic Webserver"
TEMPLATE_DESCRIPTION="Minimal Flask server with health endpoint and Docker support"
TEMPLATE_CATEGORY="BASIC_WEB_SERVER"
TEMPLATE_ABSTRACT="Provides a minimal starting point for developers who want to build a Python web server using Flask"
TEMPLATE_TOOLS="dev-python"
TEMPLATE_README="README-python-basic-webserver.md"
TEMPLATE_TAGS="python flask webserver api rest"
TEMPLATE_LOGO="python-basic-webserver-logo.svg"
TEMPLATE_WEBSITE="https://flask.palletsprojects.com"
TEMPLATE_DOCS="https://flask.palletsprojects.com/en/stable/"
TEMPLATE_SUMMARY="A minimal Python web server using Flask with a health check endpoint, Docker containerization, Kubernetes deployment manifests, and GitHub Actions CI/CD workflow. Ideal for microservices and API backends."
TEMPLATE_RELATED="php-basic-webserver typescript-basic-webserver"
```

## Naming Convention

Field names follow the `TEMPLATE_*` pattern, mirroring the `SCRIPT_*` convention used in DCT (devcontainer-toolbox) and UIS (urbalurba-infrastructure). This consistency makes it easier to share tooling across projects.

## Validation

Run `bash scripts/validate-metadata.sh` to check that all fields are present, categories are valid, and the README file exists.
