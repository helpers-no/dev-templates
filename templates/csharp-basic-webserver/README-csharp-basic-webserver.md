# C# Basic Web Server

A minimal ASP.NET Core web server. Displays "Hello World" with current time and date, with hot reload support via `dotnet watch`.

## Quick Start

1. Update your terminal (tools were installed):
   ```bash
   source ~/.bashrc
   ```

2. Run the app:
   ```bash
   dotnet watch run --project src/WebApplication
   ```

3. Open in browser: http://localhost:3000

The server auto-reloads on file changes via `dotnet watch`.

## Prerequisites

Development tools are installed automatically by the devcontainer.
If you need to reinstall, run: `dev-setup`

## Project Structure

After installation, your project contains:

```plaintext
├── src/
│   └── WebApplication/
│       ├── Program.cs                     # ASP.NET Core entry point
│       └── WebApplication.csproj          # Project dependencies
├── manifests/
│   ├── deployment.yaml                    # K8s Deployment + Service
│   └── kustomization.yaml                 # ArgoCD configuration
├── .github/
│   └── workflows/
│       └── build-and-push.yaml            # CI/CD pipeline
├── Dockerfile                             # .NET multi-stage build
├── TEMPLATE_INFO                          # Template metadata
└── README-csharp-basic-webserver.md       # This file
```

## Development

- Edit `src/WebApplication/Program.cs` — the main application file
- Changes auto-reload via `dotnet watch`
- The `/` endpoint returns "Hello World" with the template name and current time/date

## Docker Build

```bash
docker build -t csharp-basic-webserver .
docker run -p 3000:3000 csharp-basic-webserver
```

## Kubernetes Deployment

```bash
kubectl apply -k manifests/
```

The app will be accessible at `http://<app-name>.localhost` after ArgoCD registration.

## CI/CD

The GitHub Actions workflow automatically builds and pushes the Docker image to GitHub Container Registry when changes are pushed to the main branch.
