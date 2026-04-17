# C# Basic Webserver — app notes

The C# Basic Webserver template is a simple hello world app built with ASP.NET Core minimal APIs that displays "Hello world" on a web page.
The purpose of this simple app is to verify that the development environment is set up and ready.
See more documentation at http://localhost:3000/docs/templates/basic-web-server/csharp-basic-webserver

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
