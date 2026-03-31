# TypeScript Basic Web Server

A minimal Express.js web server written in TypeScript. Displays "Hello World" and demonstrates deployment to Kubernetes via ArgoCD and GitHub Actions.

## Quick Start

1. Update your terminal (tools were installed):
   ```bash
   source ~/.bashrc
   ```

2. Install dependencies and run:
   ```bash
   npm install
   npm run dev
   ```

3. Open in browser: http://localhost:3000

The server auto-reloads on file changes via nodemon.

## Prerequisites

Development tools are installed automatically by the devcontainer.
If you need to reinstall, run: `dev-setup`

## Project Structure

After installation, your project contains:

```plaintext
├── app/
│   └── index.ts                           # Express server with Hello World
├── manifests/
│   ├── deployment.yaml                    # K8s Deployment + Service
│   └── kustomization.yaml                 # ArgoCD configuration
├── .github/
│   └── workflows/
│       └── urbalurba-build-and-push.yaml  # CI/CD pipeline
├── Dockerfile                             # Container build
├── package.json                           # Node.js dependencies
├── tsconfig.json                          # TypeScript configuration
├── TEMPLATE_INFO                          # Template metadata
└── README-typescript-basic-webserver.md   # This file
```

## Development

- Edit `app/index.ts` — the main Express server
- Changes auto-reload via nodemon (`npm run dev`)
- The `/` endpoint returns "Hello World"

## Docker Build

```bash
docker build -t typescript-basic-webserver .
docker run -p 3000:3000 typescript-basic-webserver
```

## Kubernetes Deployment

```bash
kubectl apply -k manifests/
```

The app will be accessible at `http://<app-name>.localhost` after ArgoCD registration.

## CI/CD

The GitHub Actions workflow automatically builds and pushes the Docker image to GitHub Container Registry when changes are pushed to the main branch.
