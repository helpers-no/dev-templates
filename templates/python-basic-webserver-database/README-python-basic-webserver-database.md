# Python Basic Webserver with Database

A minimal Flask web server that connects to PostgreSQL and reads from a `tasks` table. This template demonstrates the full producer/consumer flow:

- **Producer (UIS):** `uis template install postgresql-demo` deploys PostgreSQL to the cluster
- **Consumer (this template):** `dev-template configure` creates a per-app database, runs the init SQL, and writes `DATABASE_URL` to `.env`
- **App:** reads `DATABASE_URL` from the environment and queries the `tasks` table

## Quick Start

### 1. Deploy PostgreSQL (once per environment)

If PostgreSQL isn't running in your UIS cluster yet, deploy it via the `postgresql-demo` UIS stack template:

```bash
uis template install postgresql-demo
```

### 2. Configure this app's database

This creates a new database + user in PostgreSQL, applies the init SQL (tasks table + seed data), and writes `DATABASE_URL` to `.env`:

```bash
dev-template configure
```

You'll be prompted to fill in `params.app_name` and `params.database_name` in `template-info.yaml` first (or pass them via `--param`).

### 3. Install Python dependencies and run

```bash
pip install -r requirements.txt
python app/app.py
```

Then open:
- http://localhost:3000 — home page
- http://localhost:3000/tasks — list tasks from the database
- http://localhost:3000/health — verify DB connectivity

The app **requires** `DATABASE_URL` and will exit immediately if it isn't set.

## Prerequisites

Development tools are installed automatically by the devcontainer. If you need to reinstall, run `dev-setup`.

UIS must be running with PostgreSQL deployed (see step 1 above).

## Project Structure

```plaintext
├── app/
│   └── app.py                                      # Flask app reading from PostgreSQL
├── config/
│   └── init-database.sql                           # Tasks table + seed data (applied by uis configure)
├── manifests/
│   ├── deployment.yaml                             # K8s Deployment + Service (uses Secret for DATABASE_URL)
│   └── kustomization.yaml                          # ArgoCD configuration
├── .github/
│   └── workflows/
│       └── urbalurba-build-and-push.yaml           # CI/CD pipeline
├── Dockerfile                                      # Container build
├── requirements.txt                                # Python dependencies
├── template-info.yaml                              # Template metadata
└── README-python-basic-webserver-database.md       # This file
```

## Development

- Edit `app/app.py` — the Flask application
- Edit `config/init-database.sql` to change the schema (re-run `dev-template configure` to apply)
- Changes auto-reload in debug mode

## Docker Build

```bash
docker build -t python-basic-webserver-database .
docker run -p 3000:3000 --env-file .env python-basic-webserver-database
```

## Kubernetes Deployment

Before deploying, create the `DATABASE_URL` secret using the **cluster** connection string from `uis configure` output:

```bash
kubectl create secret generic <repo-name>-db \
  --from-literal=DATABASE_URL='postgresql://user:pass@postgresql.default.svc.cluster.local:5432/<db>'
```

Then apply the manifests:

```bash
kubectl apply -k manifests/
```

## CI/CD

The GitHub Actions workflow automatically builds and pushes the Docker image to GitHub Container Registry when changes are pushed to the main branch.
