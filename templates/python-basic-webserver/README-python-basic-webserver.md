# Python Basic Webserver — app notes

Full template documentation (install, prerequisites, layout, tooling, architecture, Docker, Kubernetes, CI/CD) is published at:

**[https://tmp.sovereignsky.no/docs/templates/basic-web-server/python-basic-webserver/](https://tmp.sovereignsky.no/docs/templates/basic-web-server/python-basic-webserver/)**

The sections below describe only **`app/app.py`**.

## HTTP API

| Path | Method | Response |
|------|--------|----------|
| `/` | GET | Plain text: greeting, template id `python-basic-webserver`, and formatted time/date |

## Entry point and port

- **File:** `app/app.py`
- **Port:** **3000** (variable `port` in the module; matches the Dockerfile `EXPOSE`)
- **Run:** `pip install -r requirements.txt` then `python app/app.py` (Flask **debug** is enabled in `__main__` — auto-reload on save)

## Changing the app

- Add Flask routes with `@app.route` and extend `app.py`, or split into blueprints under `app/`.
