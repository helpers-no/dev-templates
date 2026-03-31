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

## TEMPLATE_ID

Must exactly match the directory name.

```bash
# Directory: templates/python-basic-webserver/
TEMPLATE_ID="python-basic-webserver"
```

## TEMPLATE_CATEGORY

Uppercase with underscores. Must be a valid category defined in `scripts/lib/categories.sh`.

| Category ID | Use for |
|------------|---------|
| `BASIC_WEB_SERVER` | Minimal web servers that demonstrate Hello World |
| `WEB_APP` | Frontend web applications (React, Vue, etc.) |
| `WORKFLOW` | AI-assisted development workflow templates |

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
