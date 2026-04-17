# Go Basic Webserver — app notes

The Go Basic Webserver template is a simple hello world app using Go's standard library that displays "Hello world" on a web page.
The purpose of this simple app is to verify that the development environment is set up and ready.
See more documentation at http://localhost:3000/docs/templates/basic-web-server/golang-basic-webserver

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
