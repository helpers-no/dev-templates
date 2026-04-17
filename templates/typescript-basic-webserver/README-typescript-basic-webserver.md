# TypeScript Basic Webserver — app notes

The TypeScript Basic Webserver template is a simple hello world app that just display "Hello world" on a web page.
The purpose of this simple app is to verify that the development environment is set up and ready.
Se more documentation at http://localhost:3000/docs/templates/basic-web-server/typescript-basic-webserver

## Entry point

- **File:** `app/index.ts`
- **Port:** `process.env.PORT` if set, otherwise **3000**
- **Dev:** `npm run dev` runs the server with **nodemon** so edits reload automatically.

## HTTP API

| Path | Method | Response |
|------|--------|----------|
| `/` | GET | Plain-text greeting including the template name and the current time (UK locale format) |

There is no JSON API or `/health` route in the default app; add routes in `app/index.ts` as needed.

## Changing the app

- Import additional Express middleware or routers in `app/index.ts`.
- Keep the listen call at the bottom so `PORT` and startup logging stay consistent with the Dockerfile and manifests.
