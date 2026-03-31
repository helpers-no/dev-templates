# Java Basic Web Server

A minimal Spring Boot web server. Displays "Hello World" with current time and date, and provides health check endpoints via Spring Boot Actuator.

## Quick Start

1. Update your terminal (tools were installed):
   ```bash
   source ~/.bashrc
   ```

2. Build and run:
   ```bash
   mvn clean package
   java -jar target/*.jar
   ```

3. Open in browser: http://localhost:3000

## Prerequisites

Development tools are installed automatically by the devcontainer.
If you need to reinstall, run: `dev-setup`

## Project Structure

After installation, your project contains:

```plaintext
├── app/
│   └── src/main/java/com/example/
│       └── App.java                       # Spring Boot application
├── manifests/
│   ├── deployment.yaml                    # K8s Deployment + Service
│   └── kustomization.yaml                 # ArgoCD configuration
├── .github/
│   └── workflows/
│       └── urbalurba-build-and-push.yaml  # CI/CD pipeline
├── Dockerfile                             # Container build (multi-stage)
├── pom.xml                                # Maven dependencies
├── TEMPLATE_INFO                          # Template metadata
└── README-java-basic-webserver.md         # This file
```

## Development

- Edit `app/src/main/java/com/example/App.java` — the main Spring Boot application
- The `/` endpoint returns "Hello World" with the template name and current time/date
- Health check endpoints are provided by Spring Boot Actuator
- Rebuild with `mvn clean package` after changes

## Docker Build

```bash
docker build -t java-basic-webserver .
docker run -p 3000:3000 java-basic-webserver
```

## Kubernetes Deployment

```bash
kubectl apply -k manifests/
```

The app will be accessible at `http://<app-name>.localhost` after ArgoCD registration.

## CI/CD

The GitHub Actions workflow automatically builds and pushes the Docker image to GitHub Container Registry when changes are pushed to the main branch.
