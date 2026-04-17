# C# Basic Webserver — app notes

Full template documentation (install, prerequisites, layout, tooling, architecture, Docker, Kubernetes, CI/CD) is published at:

**[https://tmp.sovereignsky.no/docs/templates/basic-web-server/csharp-basic-webserver/](https://tmp.sovereignsky.no/docs/templates/basic-web-server/csharp-basic-webserver/)**

The sections below describe only **`src/WebApplication/Program.cs`**.

## HTTP API

| Path | Method | Response |
|------|--------|----------|
| `/` | GET | Plain text: greeting, template id `csharp-basic-webserver`, time and date |

## Entry point and port

- **File:** `src/WebApplication/Program.cs`
- **Port:** **`ASPNETCORE_URLS`** if set; otherwise **3000** (see `UseUrls` in the file)
- **Dev with reload:** `dotnet watch run --project src/WebApplication`

## Changing the app

- Add minimal APIs with `app.MapGet`, `app.MapPost`, etc., on the `WebApplication` instance before `app.Run()`.
