"""
filename: templates/python-basic-webserver-database/app/app.py
Flask web server that reads from a PostgreSQL database.

Requires DATABASE_URL in the environment (or .env). Run dev-template configure
to create the database and generate .env automatically.
"""
import os
import sys
from flask import Flask, jsonify
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Load .env (written by dev-template configure)
load_dotenv()

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    print("ERROR: DATABASE_URL is not set.", file=sys.stderr)
    print("Run: dev-template configure", file=sys.stderr)
    print("This creates a PostgreSQL database and writes DATABASE_URL to .env", file=sys.stderr)
    sys.exit(1)

app = Flask(__name__)
port = 3000


def get_connection():
    return psycopg2.connect(DATABASE_URL)


@app.route('/')
def index():
    time_date_string = datetime.now().strftime('Time: %H:%M:%S Date: %d/%m/%Y')
    return (
        f'Hello world ! Template: python-basic-webserver-database. {time_date_string}<br>'
        f'<a href="/tasks">View tasks</a> | <a href="/health">Health</a>'
    )


@app.route('/tasks')
def list_tasks():
    """Read tasks from the database."""
    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT id, title, status, created_at FROM tasks ORDER BY id")
                rows = cur.fetchall()
                return jsonify([dict(r, created_at=r['created_at'].isoformat()) for r in rows])
    except psycopg2.Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/health')
def health():
    """Verify DB connectivity."""
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
        return jsonify({'status': 'ok', 'database': 'connected'})
    except psycopg2.Error as e:
        return jsonify({'status': 'error', 'database': str(e)}), 503


if __name__ == '__main__':
    print(f'Connecting to database...')
    print(f'Server starting at http://localhost:{port}')
    app.run(host='0.0.0.0', port=port, debug=True)
