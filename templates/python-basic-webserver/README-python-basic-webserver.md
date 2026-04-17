# Python Basic Webserver — app notes

The Python Basic Webserver template is a simple hello world app built with Flask that displays "Hello world" on a web page.
The purpose of this simple app is to verify that the development environment is set up and ready.
See more documentation at http://localhost:3000/docs/templates/basic-web-server/python-basic-webserver

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
