-- Init file for python-basic-webserver-database
-- Applied by: uis configure postgresql --init-file -
-- Uses psql --set ON_ERROR_STOP=on for fail-fast on syntax errors
-- All statements are idempotent — safe to re-run

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
