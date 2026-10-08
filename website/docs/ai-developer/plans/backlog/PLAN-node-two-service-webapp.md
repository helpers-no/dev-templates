# Plan: Add the `node-two-service-webapp` template (UIS + Red Cross container platform)

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Implemented in the pull request that adds it; awaiting review

**Goal**: One app template whose layout deploys on **both** UIS (ArgoCD, GitHub Actions, ghcr.io) and the Red Cross container platform (Azure Container Apps), with a public web service and an internal API service.

**Last Updated**: 2026-10-08

**Authorization**: Terje, 2026-10-08, in the Bifrost session: asked for "a template that works for both" to be put on tmp.sovereignsky.no, then pointed at this repository.

## Why

Bifrost (`terchris/bifrost`) was restructured to follow the Red Cross platform repository layout (`services/<name>/` with its own `Dockerfile` and `app/`, Docker build context = the service folder) and was then prepared for UIS (`manifests/` + a GitHub Actions workflow). The same Dockerfiles serve both targets. This template turns that into a small starter so the next application starts with the right layout.

## What it contains

- `services/web` (public, port 3000) and `services/api` (internal, port 3000): Express, `GET /health`, Dockerfile with the service folder as build context. The web service calls the API from the server through `API_URL`.
- UIS: `manifests/deployment.yaml` + `kustomization.yaml`, and `.github/workflows/urbalurba-build-and-push.yaml` (build both images, push, write the tags into the manifest). The public Service is named `{{REPO_NAME}}` so it sorts before `{{REPO_NAME}}-api`: `uis argocd register` routes the host name to the **first Service of the namespace in alphabetical order** (`ansible/playbooks/argocd-register-app.yml`, step 27).
- Red Cross: no Bicep or pipelines (the platform generates them per repository with the add-service pipeline). The README explains which template folders to copy over the generated services and the one `.bicepparam` value that connects web to API (`API_URL = http://ca-<env>-nrx-<api-name>`).
- Category `WEB_APP`; no `requires:` (no UIS services needed).

## Tasks

- [x] Template folder `templates/node-two-service-webapp/` with `template-info.yaml`, README (Quick Start, Prerequisites, Project Structure), logo
- [x] Both services run locally; web page shows the API answer; `/health` of web stays 200 with the API stopped
- [x] Pre-push pipeline green (validate-metadata, generate-registry, generate-docs-markdown, generate-plan-indexes, validate-docs, site build)
- [ ] Review by the maintainers
- [ ] Verify with `dev-template node-two-service-webapp` (placeholder replacement, Environment card, `quickstart.run` one-liner) and deploy on a UIS cluster
- [ ] Build the images (no Docker daemon was available when this was written)
- [ ] Run the Red Cross steps of the README on a platform repository

## Open points

- The planned `deployments:` field (`INVESTIGATE-ci-and-deployment-targets.md`) is not implemented, so it is not used. When it exists, this template should declare `local-k8s-argocd` and `azure-container-apps`; the second has no workflow file in the template because the platform generates it.
- `WEB_APP` was chosen because it exists; a dedicated multi-service category may fit better.
