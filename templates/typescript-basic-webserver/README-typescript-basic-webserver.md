# TypeScript Basic Webserver — app notes

Full template documentation (install, prerequisites, file layout, tooling, architecture, Docker, Kubernetes, and CI/CD) is published at:

**[https://tmp.sovereignsky.no/docs/templates/basic-web-server/typescript-basic-webserver/](https://tmp.sovereignsky.no/docs/templates/basic-web-server/typescript-basic-webserver/)**

The sections below describe only what lives in **`app/index.ts`**: behavior you change when you extend the server.

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
