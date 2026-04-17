# Go Basic Webserver — app notes

Full template documentation (install, prerequisites, layout, tooling, architecture, Docker, Kubernetes, CI/CD) is published at:

**[https://tmp.sovereignsky.no/docs/templates/basic-web-server/golang-basic-webserver/](https://tmp.sovereignsky.no/docs/templates/basic-web-server/golang-basic-webserver/)**

The sections below describe only **`app/main.go`**.

## HTTP API

| Path | Method | Response |
|------|--------|----------|
| `/` | GET | Plain text: greeting, template id `golang-basic-webserver`, and current time/date |

There is no separate health route in the default code.

## Entry point and port

- **File:** `app/main.go`
- **Port:** **3000** (string in `main`, passed to `ListenAndServe`)

## Development

- **Run:** `go run app/main.go`
- There is no hot reload — stop and re-run after edits.

## Changing the app

- Register more handlers with `http.HandleFunc` (or a router) before `ListenAndServe`.
