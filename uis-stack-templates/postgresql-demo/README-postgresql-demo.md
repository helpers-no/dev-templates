# PostgreSQL Demo

A minimal UIS stack template that deploys PostgreSQL and creates a sample database with seed data. Use this to verify your UIS setup or as a starting point for your own stack templates.

## What it deploys

- **PostgreSQL** (via UIS) — deployed to the cluster if not already running

## What it configures

- Creates a per-app user (derived from `app_name` param)
- Creates a database (from `database_name` param)
- Applies the init SQL file — creates a `tasks` table with 3 seed rows

## Usage

From the UIS provision-host:

```bash
uis template install postgresql-demo
```

With custom params:

```bash
uis template install postgresql-demo --param app_name=myapp --param database_name=mydb
```

## What you get

After install, `uis template install` returns JSON with connection details:

```json
{
  "status": "ok",
  "service": "postgresql",
  "local": {
    "host": "host.docker.internal",
    "port": 35432,
    "database_url": "postgresql://demo_app:<generated-password>@host.docker.internal:35432/demo_db"
  },
  "cluster": {
    "host": "postgresql.default.svc.cluster.local",
    "port": 5432,
    "database_url": "postgresql://demo_app:<generated-password>@postgresql.default.svc.cluster.local:5432/demo_db"
  },
  "database": "demo_db",
  "username": "demo_app",
  "password": "<generated-password>"
}
```

## Verify it worked

Expose the service and connect:

```bash
uis expose postgresql
```

Then from any container with psql:

```bash
psql -h host.docker.internal -p 35432 -U demo_app -d demo_db
# Enter the password from the JSON output above
```

Query the tasks table:

```sql
SELECT * FROM tasks;
```

You should see 3 rows. Re-running `uis template install postgresql-demo` is safe — it detects the existing database and returns `already_configured`.

## Extending this template

This template is the minimum viable example. To build your own:

1. Copy this folder as a starting point
2. Edit `template-info.yaml` — change `id`, `name`, add more services to `provides`
3. Add more init files in `config/` (SQL, Authentik blueprints, Grafana dashboards)
4. Reference UIS stacks (like `observability`) in `provides.stacks` to include multi-service stacks
