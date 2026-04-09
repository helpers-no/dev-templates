---
sidebar_position: 4
---

# Naming Conventions

Consistent naming across templates, files, and identifiers.

## Template Directory

- Lowercase, hyphenated
- Pattern: `<language>-<type>` or `<framework>-<type>`
- Examples: `python-basic-webserver`, `designsystemet-basic-react-app`, `plan-based-workflow`

App templates go in `templates/`. AI workflow templates go in `ai-templates/`.

## Template ID

Must exactly match the directory name. Defined in `template-info.yaml`:

```yaml
# Directory: templates/python-basic-webserver/
id: python-basic-webserver
```

## Template Category

Uppercase with underscores. Must match a category `id` in the parent folder's `template-categories.yaml`.

| Category ID | Use for | Emoji |
|------------|---------|-------|
| `BASIC_WEB_SERVER` | Minimal web servers that demonstrate Hello World | 🌐 |
| `WEB_APP` | Frontend web applications (React, Vue, etc.) | 📱 |
| `WORKFLOW` | AI-assisted development workflow templates | 🤖 |

### Adding a new category

Edit `template-categories.yaml` in the relevant template folder (e.g., `templates/template-categories.yaml`). Each folder defines its own categories — no central file.

## README File

Pattern: `README-<template-id>.md`

```
README-python-basic-webserver.md
README-designsystemet-basic-react-app.md
README-plan-based-workflow.md
```

## Logo File

Pattern: `<template-id>-logo.svg`

Location: `website/static/img/templates/`

```
website/static/img/templates/python-basic-webserver-logo.svg
```

## Category Logo File

Pattern: `<category-name>-logo.svg`

Location: `website/static/img/categories/`

```
website/static/img/categories/webserver-logo.svg
```

## Tags

Tags in `template-info.yaml` are used for search and discovery on the website. Use a small, consistent set so users can filter effectively.

### Categories of tags

| Category | What it is | Examples | Rules |
|---|---|---|---|
| **Language** | Programming language of the template | `python`, `typescript`, `golang`, `java`, `csharp`, `php` | Use the canonical name. One language tag per template. No aliases (e.g., use `golang`, not `go`). Don't tag the runtime separately (e.g., `typescript` implies `nodejs`). |
| **Framework** | The specific framework or library | `flask`, `express`, `spring-boot`, `aspnet`, `react`, `vite`, `designsystemet` | Use the official short name. |
| **Purpose** | What the template scaffolds | `webserver`, `webapp`, `database`, `workflow` | What kind of thing the user gets after install. |
| **Capability** | What the template ships with | `api`, `rest`, `health-check` | Optional. Use sparingly. |
| **Dependency** | Whether the template needs UIS services | `requires` | Add `requires` to any template that has a `requires:` field in `template-info.yaml`. Lets users filter "templates that depend on UIS services". |
| **Discovery** | Markers for finding intro material | `getting-started`, `demo`, `starter` | Optional. Use for templates that are meant as minimal examples or first-time-user material. Don't add to real-use templates. |
| **Project-specific** | Tags specific to the template content | `digdir`, `claude`, `devcontainer` | Use when the template is specific to an organisation, tool, or context. |

### Examples

```yaml
# Hello-world web server (no database)
tags:
  - python
  - flask
  - webserver
  - api
  - rest
```

```yaml
# Web server with database (uses requires)
tags:
  - python
  - flask
  - postgresql
  - database
  - webserver
  - requires
```

```yaml
# UIS stack template (deploys infrastructure)
tags:
  - postgresql
  - database
  - demo
  - getting-started
```

### Common mistakes

- **Tagging both language and runtime** — `typescript` AND `nodejs` is redundant. Pick the language.
- **Tagging both alias and canonical** — `golang` AND `go` is redundant. Pick `golang`.
- **Adding `demo` to non-demo templates** — `demo` is for templates that exist to validate the system or onboard new users. Real-use templates should not be tagged `demo`.
- **Tagging the dependency twice** — if you tag `database`, you don't also need `db` or `data`. Pick one.

## Kubernetes Manifests

Use `{{GITHUB_USERNAME}}` and `{{REPO_NAME}}` as placeholders. These are replaced by `dev-template.sh` during installation.

```yaml
# In manifests/deployment.yaml
metadata:
  name: "{{REPO_NAME}}-deployment"
spec:
  containers:
    - name: "{{REPO_NAME}}"
      image: ghcr.io/{{GITHUB_USERNAME}}/{{REPO_NAME}}:latest
```
