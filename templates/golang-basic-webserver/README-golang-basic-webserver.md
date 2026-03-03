# Go Basic Web Server Template

This is a basic web server template using Go's standard net/http package. It serves a simple "Hello world" message on the root URL and demonstrates how to set up a Go project.

## Features

- Go standard library web server
- Simple "Hello world" endpoint
- Current time and date display
- Health check endpoints
- Docker multi-stage build
- Kubernetes deployment
- GitHub Actions CI/CD

## Prerequisites

- Go 1.21 or later
- Docker
- Kubernetes cluster
- GitHub account

## Project Structure

```plaintext
golang-basic-webserver/
├── app/
│   └── main.go
├── manifests/
│   ├── deployment.yaml
│   └── kustomization.yaml
├── .github/
│   └── workflows/
│       └── build.yml
├── Dockerfile
└── README-golang-basic-webserver.md
```

## Getting Started

1. Clone this repository
2. Initialize Go modules:
   ```bash
   go mod init example.com/hello
   go mod tidy
   ```
3. Run the application:
   ```bash
   go run app/main.go
   ```
4. Access the web server at http://localhost:3000

## Docker Build

```bash
docker build -t golang-basic-webserver .
docker run -p 3000:3000 golang-basic-webserver
```

## Kubernetes Deployment

1. Apply the Kubernetes manifests:
   ```bash
   kubectl apply -k manifests/
   ```
2. Access the web server at http://golang-basic-webserver.local

## Development

- The main application code is in `app/main.go`
- The application uses Go's standard net/http package for the web server
- The `/` endpoint returns a "Hello world" message with the current time and date
- Health check endpoints are provided by the root endpoint

## CI/CD

The GitHub Actions workflow automatically builds and pushes the Docker image to GitHub Container Registry when changes are pushed to the main branch.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 