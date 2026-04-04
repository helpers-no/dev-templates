-- PostgreSQL Demo — sample schema with seed data
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
    ('Verify uis template install works', 'done'),
    ('Build your own UIS stack template', 'pending'),
    ('Deploy it with uis template install', 'pending')
ON CONFLICT DO NOTHING;
