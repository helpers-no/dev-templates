---
sidebar_position: 6
---

# README Structure

All template READMEs should follow this standard structure. This ensures a consistent experience for users across all templates.

## Required Sections

These sections must be present (checked by `validate-docs.sh`):

| Section | Purpose |
|---------|---------|
| **Quick Start** | Numbered copy-paste steps to run the app |
| **Prerequisites** | What's needed (tools are auto-installed) |
| **Project Structure** | Directory tree showing deployed layout |

## Optional Sections

These are recommended but not enforced:

| Section | Purpose |
|---------|---------|
| **Development** | How to edit, test, and debug |
| **Docker Build** | How to build the container image |
| **Kubernetes Deployment** | How to deploy to K8s |
| **CI/CD** | How the GitHub Actions workflow works |

## Template

```markdown
# Template Display Name

Brief one-line description of what this template provides.

## Quick Start

1. Update your terminal (tools were installed):
   `​``bash
   source ~/.bashrc
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
├── TEMPLATE_INFO                          # Template metadata
└── README-<template-name>.md              # This file
`​``

## Development

- Edit `app/main.ext` — the main application file
- Describe hot reload behavior if applicable
- The `/` endpoint returns "Hello World" with template name and time/date

## Docker Build

`​``bash
docker build -t <template-name> .
docker run -p <port>:<port> <template-name>
`​``

## Kubernetes Deployment

`​``bash
kubectl apply -k manifests/
`​``

The app will be accessible at `http://<app-name>.localhost` after ArgoCD registration.

## CI/CD

The GitHub Actions workflow automatically builds and pushes the Docker image
to GitHub Container Registry when changes are pushed to the main branch.
```

## Notes

- The **Quick Start** section is the most important — users see it first after installation
- **Project Structure** should show the deployed layout (what the user sees after `dev-template` runs), not the template source layout
- Keep descriptions concise — the README is a quick reference, not a tutorial
- Don't include tool installation instructions — `dev-template.sh` handles this via `TEMPLATE_TOOLS`
