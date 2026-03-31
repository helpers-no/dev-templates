# Python Basic Web Server

A minimal Flask web server. Displays "Hello World" with current time and date, and demonstrates deployment to Kubernetes via ArgoCD and GitHub Actions.

## Quick Start

1. Update your terminal (tools were installed):
   ```bash
   source ~/.bashrc
   ```

2. Install dependencies and run:
   ```bash
   pip install -r requirements.txt
   python app/app.py
   ```

3. Open in browser: http://localhost:6000

The server auto-reloads on file changes (Flask debug mode).

## Prerequisites

Development tools are installed automatically by the devcontainer.
If you need to reinstall, run: `dev-setup`

## Project Structure

After installation, your project contains:

```plaintext
├── app/
│   └── app.py                             # Flask server with Hello World
├── manifests/
│   ├── deployment.yaml                    # K8s Deployment + Service
│   └── kustomization.yaml                 # ArgoCD configuration
├── .github/
│   └── workflows/
│       └── urbalurba-build-and-push.yaml  # CI/CD pipeline
├── Dockerfile                             # Container build
├── requirements.txt                       # Python dependencies
├── TEMPLATE_INFO                          # Template metadata
└── README-python-basic-webserver.md       # This file
```

## Development

- Edit `app/app.py` — the main Flask application
- Changes auto-reload in debug mode
- The `/` endpoint returns "Hello World" with the template name and current time/date

## Docker Build

```bash
docker build -t python-basic-webserver .
docker run -p 6000:6000 python-basic-webserver
```

## Kubernetes Deployment

```bash
kubectl apply -k manifests/
```

The app will be accessible at `http://<app-name>.localhost` after ArgoCD registration.

## CI/CD

The GitHub Actions workflow automatically builds and pushes the Docker image to GitHub Container Registry when changes are pushed to the main branch.
