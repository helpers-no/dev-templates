# Python Basic Webserver with Database — app notes

The Python Basic Webserver with Database template is a Flask app that connects to PostgreSQL and reads from a tasks table.
The purpose of this app is to verify that both the development environment and the database connection are set up and working.
See more documentation at http://localhost:3000/docs/templates/basic-web-server-database/python-basic-webserver-database

## Configuration and database URL

- **`DATABASE_URL`** must be set (typically via `.env` after `dev-template configure`). If it is missing, the process exits with an error — there is no default connection string.
- Connections use **`psycopg2`** via `get_connection()` in `app/app.py`.

## Schema and seed data

- **`config/init-database.sql`** defines the default `tasks` table, indexes, and seed rows. UIS applies this when you run `dev-template configure` (see the docs page for the full flow).
- Change the schema in that file, then run **`dev-template configure`** again so the database matches.

## HTTP API

| Path | Method | Response |
|------|--------|----------|
| `/` | GET | HTML greeting with template name, time, and links to `/tasks` and `/health` |
| `/tasks` | GET | JSON array of `tasks` rows (`id`, `title`, `status`, `created_at`), or 500 with `{"error": ...}` on query failure |
| `/health` | GET | `{"status": "ok", "database": "connected"}` when the DB answers `SELECT 1`; **503** with `{"status": "error", "database": ...}` if the connection fails |

## Entry point and dev server

- **File:** `app/app.py`
- **Port:** **3000** (constant in code; align with Dockerfile/manifests if you change it)
- **Run:** `uv run python app/app.py` (or activate a venv and run `python app/app.py`). Flask **debug** mode is enabled in `if __name__ == '__main__'`.

## Changing the app

- Add routes and helpers in **`app/app.py`**. Reuse `get_connection()` for DB access.
- If you rename tables or columns, update **`config/init-database.sql`** and re-run **`dev-template configure`**, and keep **`/tasks`** in sync with your queries.
