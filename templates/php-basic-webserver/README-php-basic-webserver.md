# PHP Basic Web Server Template

This is a basic web server template using PHP's built-in web server. It serves a simple "Hello world" message on the root URL and demonstrates how to set up a PHP project.

## Features

- PHP 8.2 web server with Apache
- Simple "Hello world" endpoint
- Current time and date display
- Health check endpoints
- Docker multi-stage build
- Kubernetes deployment
- GitHub Actions CI/CD

## Prerequisites

- PHP 8.2 or later
- Apache web server
- Docker
- Kubernetes cluster
- GitHub account

## Project Structure

```plaintext
php-basic-webserver/
├── app/
│   └── index.php
├── manifests/
│   ├── deployment.yaml
│   └── kustomization.yaml
├── .github/
│   └── workflows/
│       └── build.yml
├── Dockerfile
└── README-php-basic-webserver.md
```

## Getting Started

1. Clone this repository
2. Run the application locally:
   ```bash
   php -S localhost:3000 app/index.php
   ```
3. Access the web server at http://localhost:3000

## Docker Build

```bash
docker build -t php-basic-webserver .
docker run -p 3000:3000 php-basic-webserver
```

## Kubernetes Deployment

1. Apply the Kubernetes manifests:
   ```bash
   kubectl apply -k manifests/
   ```
2. Access the web server at http://php-basic-webserver.localhost

## Development

- The main application code is in `app/index.php`
- The application uses PHP's built-in web server
- The `/` endpoint returns a "Hello world" message with the current time and date
- Health check endpoints are provided by the root endpoint

## CI/CD

The GitHub Actions workflow automatically builds and pushes the Docker image to GitHub Container Registry when changes are pushed to the main branch.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 