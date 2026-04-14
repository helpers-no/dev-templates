# Python Basic Webserver with Database

A minimal Flask web server that connects to PostgreSQL and reads from a `tasks` table. The full producer/consumer flow:

- **PostgreSQL** runs in your UIS-managed Kubernetes cluster (deployed once during cluster setup, or via `uis deploy postgresql`).
- **`dev-template configure`** creates a per-app database and user, applies the init SQL, and writes `DATABASE_URL` to `.env` for local dev.
- **The Flask app** reads `DATABASE_URL` from `.env`, connects to PostgreSQL via `host.docker.internal:35432` (the local port forward UIS exposes), and serves the seeded data.

## What this is

A small but complete Flask application:

| Endpoint | Method | Returns |
|---|---|---|
| `/` | GET | Plain-text greeting with the template name and current time |
| `/tasks` | GET | JSON list of rows from the `tasks` table (the seeded data, plus anything you've added) |
| `/health` | GET | `{"status": "ok", "database": "connected"}` if the DB is reachable, or a 503 if not |

The app **requires** `DATABASE_URL` and exits immediately with a clear error if it's missing — there's no fallback. This is intentional: the template demonstrates the producer/consumer pattern where credentials always come from `dev-template configure`.

## Prerequisites

This template uses UIS to configure PostgreSQL. Verify the UIS provision-host container is running:

```bash
docker ps --filter name=uis-provision-host --format '{{.Status}}'
```

You should see `Up X minutes`. If not, start UIS from the `urbalurba-infrastructure` repo. Inside DCT (devcontainer-toolbox v1.7.34 or later) you also have the `uis` shim, which routes `uis ...` commands to the provision-host automatically.

If PostgreSQL isn't deployed in your cluster, **don't worry** — `dev-template configure` will detect it in step 4 and tell you exactly what to run (`uis deploy postgresql`).

## Quick Start

### 1. Install the template

```bash
dev-template python-basic-webserver-database
```

DCT downloads the template from the registry and copies all files to your current project directory, including `app/`, `manifests/`, `Dockerfile`, `requirements.txt`, `.gitignore`, `template-info.yaml`, and `config/init-database.sql`.

### 2. Edit `template-info.yaml`

Open `template-info.yaml` and find the `params:` section near the bottom. Set values for your app:

```yaml
params:
  app_name: "my-cool-app"
  database_name: "my_cool_app_db"
```

The defaults (`my-app`, `my_app_db`) work, but pick names that match your project — these become the PostgreSQL user and database names.

The full `template-info.yaml` declares the PostgreSQL dependency in the `requires:` section:

```yaml
params:
  app_name: "my-app"
  database_name: "my_app_db"

requires:
  - service: postgresql
    config:
      database: "{{ params.database_name }}"
      init: "config/init-database.sql"
```

DCT reads this file when you run `dev-template configure` in the next step. The `{{ params.database_name }}` reference is substituted with the value you set above.

### 3. (Optional) Customise `config/init-database.sql`

This file is the schema and seed data UIS applies to your database. The default creates a `tasks` table with 3 rows:

```sql
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

INSERT INTO tasks (title, status) VALUES
    ('Set up the database connection', 'done'),
    ('Build something with Flask + PostgreSQL', 'pending'),
    ('Deploy to Kubernetes via ArgoCD', 'pending')
ON CONFLICT DO NOTHING;
```

All statements are idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`) so re-running configure is safe. UIS applies the file with `psql --set ON_ERROR_STOP=on`, so any syntax error fails fast with a clear message.

For your real schema, edit this file to add your own tables, indexes, and seed data.

### 4. Run `dev-template configure`

```bash
dev-template configure
```

This is the load-bearing step. DCT (v1.7.36 or later) prints every action it takes — UIS bridge check, git identity detection, template-info.yaml read, parameter validation, init file load, the literal UIS command being called, the response, the port-forward path, the .env write, and the K8s secret created. If anything fails, you'll see exactly which step bit you.

If PostgreSQL isn't deployed in your cluster, the step fails with a clear error from UIS telling you to run `uis deploy postgresql`.

A sample of the exact output is in the **Expected output** dropdown inside the Configure sub-section on this template's [documentation page](https://tmp.sovereignsky.no/docs/templates/basic-web-server-database/python-basic-webserver-database). It is auto-generated from the template's metadata, so the values you see there (app name, database name, K8s secret name, port-forward path) match this template's defaults and re-render automatically when the metadata changes.

The K8s secret name is derived from the repo name (e.g. `my-app-db`), which matches the `secretKeyRef` in `manifests/deployment.yaml`. Re-running `dev-template configure` is idempotent — you'll see `Status: already_configured` and `(0 configured, 1 skipped, 0 failed)`.

What just happened:

1. DCT read `template-info.yaml` and validated the `params:`
2. DCT detected the git repo (used as the K8s namespace + secret prefix)
3. DCT loaded `config/init-database.sql` and substituted any `{{ params.* }}` references
4. DCT called UIS via the in-container bridge: `uis configure postgresql ...`
5. UIS created the database, user, applied the init SQL, set up the port-forward (35432), and created a K8s Secret in the namespace
6. DCT wrote `DATABASE_URL` to `.env` (local URL via `host.docker.internal:35432`)
7. The K8s Secret holds the cluster-internal URL (`postgresql.default.svc.cluster.local:5432`) for the deployed pod to read via `secretKeyRef`

### 5. Verify the database

Inspect the seeded data without starting the app:

```bash
uis connect postgresql my_cool_app_db
```

Inside psql:

```sql
SELECT * FROM tasks;
\q
```

You should see 3 rows. If they're there, the database is set up correctly and `DATABASE_URL` is in your `.env`.

### 6. Run the app

DCT ships with [`uv`](https://github.com/astral-sh/uv) for fast Python package management. Create a virtualenv, install dependencies, and run the app:

```bash
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
python app/app.py
```

Or one-liner (no manual activation):

```bash
uv venv
uv pip install -r requirements.txt
uv run python app/app.py
```

The Flask debug server starts on port 3000.

**VS Code tip (optional):** if you see "Error refreshing packages" from VS Code's Python extension, add this to your workspace `.vscode/settings.json`:

```json
{
  "python-envs.alwaysUseUv": true
}
```

The error happens because `uv venv` doesn't install `pip` into the venv (it doesn't need to), and VS Code's Python extension defaults to `pip list` for package enumeration. The setting tells it to use `uv` instead. If your project's `.vscode/settings.json` already exists with other keys, just add this one — don't replace the whole file.

### 7. Open in your browser

VS Code's "Ports" tab in the bottom panel auto-forwards port 3000. Click the globe icon next to it to open these URLs:

- `http://localhost:3000/` — Home page
- `http://localhost:3000/tasks` — JSON list of seeded rows
- `http://localhost:3000/health` — DB connectivity check

If `/tasks` shows the 3 seeded rows, your producer/consumer chain is working end-to-end: Flask → DATABASE_URL → host.docker.internal → UIS port-forward → PostgreSQL pod in K8s.

## Project structure

After installation, your project contains:

```
├── app/
│   └── app.py                                      # Flask app reading from PostgreSQL
├── config/
│   └── init-database.sql                           # Schema + seed data (applied by uis configure)
├── manifests/
│   ├── deployment.yaml                             # K8s Deployment + Service (uses Secret for DATABASE_URL)
│   └── kustomization.yaml                          # ArgoCD configuration
├── .github/
│   └── workflows/
│       └── urbalurba-build-and-push.yaml           # CI/CD pipeline
├── .gitignore                                      # Excludes .env*, .venv/, etc.
├── Dockerfile                                      # Container build
├── requirements.txt                                # Flask, psycopg2-binary, python-dotenv
├── template-info.yaml                              # Template metadata (read by dev-template configure)
└── README-python-basic-webserver-database.md       # This file
```

## Development

- Edit `app/app.py` — the main Flask application. Changes auto-reload in debug mode.
- Edit `config/init-database.sql` to change the schema. Re-run `dev-template configure` to apply the changes.
- Edit `template-info.yaml` to change `params`. Re-run `dev-template configure` afterward (it's idempotent — safe to run repeatedly).

## Deploy to your local cluster

The standard workflow uses GitHub Actions + ArgoCD — no manual `docker build` or `kubectl apply`:

1. **Push your code to GitHub**:
   ```bash
   git push
   ```
   GitHub Actions builds and pushes the container image to GitHub Container Registry. The image is **credential-free** — `DATABASE_URL` is injected at runtime from a Kubernetes Secret.

2. **Register the app with ArgoCD** (one-time per project, from your host machine):
   ```bash
   ./uis argocd register <app-name> <github-repo-url>
   ```
   This creates an ArgoCD Application that watches your repo and auto-deploys updates on every push.

3. **Access the app** at `http://<app-name>.localhost`. ArgoCD applies the deployment manifest, K8s injects `DATABASE_URL` from the Secret UIS created in step 4 above, and the pod connects to PostgreSQL via the cluster service DNS (`postgresql.default.svc.cluster.local`).

You don't need to create the Kubernetes Secret manually — `dev-template configure` already created it in the right namespace. The deployment manifest references it via `secretKeyRef`.

## Try this with

This is the consumer side of the producer/consumer pattern. The producer side is:

- [PostgreSQL Demo](../demo/postgresql-demo) — a UIS stack template that deploys PostgreSQL standalone, useful for verifying your UIS setup. You don't need to install it for `python-basic-webserver-database` to work — `dev-template configure` handles everything.

## CI/CD

The GitHub Actions workflow (`.github/workflows/urbalurba-build-and-push.yaml`) automatically builds and pushes the Docker image to GitHub Container Registry when changes are pushed to the main branch. ArgoCD picks up the new image and deploys it.
