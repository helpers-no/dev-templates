---
sidebar_position: 3
---

# Template Metadata Reference

Every template must have a `template-info.yaml` file with metadata fields. This file is read by the generation script to produce `template-registry.json`, which serves both the Docusaurus website and the DCT installer.

## Fields

| Field | Required | Type | Description | Example |
|-------|----------|------|-------------|---------|
| `id` | Yes | string | Unique identifier. Must match the directory name. | `python-basic-webserver` |
| `version` | Yes | string | Version number (semver). Must be quoted. | `"1.0.0"` |
| `name` | Yes | string | Human-readable display name. | `Python Basic Webserver` |
| `description` | Yes | string | One-line description (shown in tables and cards). | `Minimal Flask server with health endpoint` |
| `category` | Yes | string | Category ID from parent folder's `template-categories.yaml`. | `BASIC_WEB_SERVER` |
| `install_type` | Yes | string | How the installer copies files: `app`, `overlay`, or `stack`. | `app` |
| `abstract` | Yes | string | 1-2 sentence description for menus and cards. | `Provides a minimal starting point...` |
| `tools` | No | string | Space-separated DCT install script IDs. | `dev-python` |
| `readme` | Yes | string | README filename (must exist in the template directory). | `README-python-basic-webserver.md` |
| `tags` | Yes | list | YAML list of keywords for search and filtering. | `[python, flask, webserver]` |
| `logo` | Yes | string | Logo filename (SVG in `website/static/img/templates/`). | `python-basic-webserver-logo.svg` |
| `website` | No | string | External website URL. Empty string if none. | `""` |
| `docs` | Yes | string | URL to the template source on GitHub. | `https://github.com/helpers-no/...` |
| `summary` | Yes | string | Detailed description for the template detail page. | `A minimal Python web server...` |
| `related` | No | list | YAML list of related template IDs. | `[php-basic-webserver]` |
| `configure_command` | No | string | The literal command a developer runs to provision the backend services this template needs. Rendered on the template's Environment card in the Configure / Install sub-section, and in the architecture diagram's sequence block. Omit for templates with no configure step (e.g. plain app templates without services). | `"dev-template configure"` |

Future fields (for templates with service dependencies): `params`, `requires`, `provides`. See the [unified template system investigation](../ai-developer/plans/completed/INVESTIGATE-unified-template-system.md) for the full specification.

### `configure_command` — when to set it and what to put in it

| Template archetype | Value |
|---|---|
| App template with services (`requires:`) | `"dev-template configure"` |
| Stack template (`provides.services:`) | `"uis template install <template-id>"` |
| App template without services | Omit the field |
| Overlay template | Omit the field |

The field is the single source of truth for the configure command across three consumers: the `<TemplateEnvironment>` React component (rendered command line inside the Configure / Install sub-section), `scripts/lib/build-architecture-mermaid.ts` (flowchart `cfg` node label + sequence `Dev->>DCT` step), and `scripts/lib/build-expected-output.ts` (the "Expected output from …" dropdown summary). If you add a new template that needs a configure step, set this field so every downstream renderer reads the same value.

The field is also what fixed the earlier `dev-template-configure` (with hyphen, wrong form) bug — see [PLAN-environment-card-improvements.md Phase 2](../ai-developer/plans/completed/PLAN-environment-card-improvements.md) for the historical context.

## Valid Categories

Defined in `template-categories.yaml` in each template folder.

| Category ID | Display Name | Folder |
|------------|-------------|--------|
| `BASIC_WEB_SERVER` | Basic Web Server Templates | `templates/` |
| `WEB_APP` | Web Application Templates | `templates/` |
| `WORKFLOW` | Workflow Templates | `ai-templates/` |

## Complete Example

```yaml
id: python-basic-webserver
version: "1.0.0"
name: Python Basic Webserver
description: Minimal Flask server with health endpoint and Docker support
category: BASIC_WEB_SERVER
install_type: app
abstract: >
  Provides a minimal starting point for developers who want to
  build a Python web server using Flask.
tools: dev-python
readme: README-python-basic-webserver.md
tags:
  - python
  - flask
  - webserver
  - api
  - rest
logo: python-basic-webserver-logo.svg
website: ""
docs: https://github.com/helpers-no/dev-templates/tree/main/templates/python-basic-webserver
summary: >
  A minimal Python web server using Flask with a health check endpoint,
  Docker containerization, Kubernetes deployment manifests, and GitHub
  Actions CI/CD workflow. Ideal for microservices and API backends.
related:
  - php-basic-webserver
  - typescript-basic-webserver
```

## Validation

Run `bash scripts/validate-metadata.sh` to check that all fields are present, categories are valid, and the README file exists.
