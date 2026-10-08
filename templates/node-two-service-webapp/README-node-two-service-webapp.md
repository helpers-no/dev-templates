# Node Two-Service Web App — app notes

A public **web** service and an internal **api** service, one container each. It is a hello world: the web page shows the answer it got from the API, to prove that the two containers can talk to each other on both platforms.

The layout deliberately follows the **Red Cross container platform** (`services/<name>/` with its own `Dockerfile` and `app/`), so the same folders deploy on **UIS** and on **Azure Container Apps**.

## Quick Start

### Run locally

1. `npm ci --prefix services/api/app && npm ci --prefix services/web/app`
2. `(PORT=3001 npm start --prefix services/api/app &) ; API_URL=http://localhost:3001 npm start --prefix services/web/app`
3. Open http://localhost:3000: "Hello World" and the answer from the API.

### Deploy on UIS

1. Run `dev-template node-two-service-webapp` in your repository, commit and push to `main` on GitHub. The workflow `.github/workflows/urbalurba-build-and-push.yaml` builds `services/web` and `services/api`, pushes `ghcr.io/<you>/<repo>-web` and `-api`, and writes the tags into `manifests/deployment.yaml`.
2. Register the repository: `./uis argocd register <repo> https://github.com/<you>/<repo>`.
3. Open http://`<repo>`.localhost. (Private repository or private images: see the UIS docs on `uis secrets` and image pull secrets.)

### Deploy on the Red Cross container platform

The platform creates the pipelines and the infrastructure for each service itself; this template provides what goes inside:

1. In your platform repository run the **add-service** pipeline twice: once for the public web service, once for the API (**public endpoint: false**). Service names must be unique across the platform (they become DNS names). Merge the pull requests it raises. You now have `services/<web-name>/` and `services/<api-name>/` with generated Bicep and pipelines.
2. Copy this template's `services/web/Dockerfile` and `services/web/app/` over `services/<web-name>/`, and `services/api/...` over `services/<api-name>/`. Both listen on port 3000 and answer `/health`, the platform's defaults, so `ingressTargetPort` and `healthCheckPath` need no change.
3. Tell the web service where the API is, in `services/<web-name>/infra/aca/aca.test.bicepparam` (and `aca.prod.bicepparam`):

   ```bicep
   param appEnvironmentVariables = [
     { name: 'ENVIRONMENT', value: 'Test' }
     // the API Container App's name is its internal host name: ca-<env>-nrx-<api-name>
     { name: 'API_URL', value: 'http://ca-test-nrx-<api-name>' }
   ]
   ```
4. Run the service's build pipeline, then its deploy pipeline (`test`, then `prod`).

Do not copy this template's `manifests/` or `.github/` into a Red Cross repository; they are for UIS.

## Prerequisites

- **UIS:** the DCT devcontainer, the UIS provision-host running with a local cluster, and ArgoCD deployed (`./uis deploy argocd`).
- **Red Cross platform:** a repository created by the Platform Team (the "request a new application" step) with the add-service pipeline.
- Node.js 24 (installed by the devcontainer tools).

## Project Structure

```plaintext
your-project/
├── services/
│   ├── web/                       # public front end
│   │   ├── Dockerfile             # build context = this folder
│   │   └── app/{server.js, package.json, package-lock.json}
│   └── api/                       # internal API
│       ├── Dockerfile
│       └── app/{server.js, package.json, package-lock.json}
├── manifests/                     # UIS only: Deployments + Services, kustomization
│   ├── deployment.yaml
│   └── kustomization.yaml
├── .github/workflows/urbalurba-build-and-push.yaml   # UIS only: build, push, update tags
└── README-node-two-service-webapp.md
```

## Things to know

- **Keep `GET /health`** in both services. It must answer 200 without calling anything else: a brief outage of the API must not make the platform restart a healthy web container.
- **The browser can only reach the web service.** The API is internal on both platforms, so call it from the web server (as `server.js` does), never from browser JavaScript.
- **UIS routes the host name to the first Service of the namespace in alphabetical order.** The public Service is named `{{REPO_NAME}}`, which sorts before `{{REPO_NAME}}-api`. Do not rename them without checking that.
- **Service names on the Red Cross platform must be unique across the whole platform**, so rename the folders `web` and `api` to your chosen service names when you add the services there.
- Secrets never go in the manifests or in `.bicepparam` files: use Kubernetes secrets on UIS and Key Vault references on the Red Cross platform.
