# Java Basic Web Server Template

This is a basic web server template using Spring Boot and Java. It serves a simple "Hello world" message on the root URL and demonstrates how to set up a Java project with Spring Boot.

## Features

- Spring Boot web server
- Simple "Hello world" endpoint
- Current time and date display
- Health check endpoints
- Docker multi-stage build
- Kubernetes deployment
- GitHub Actions CI/CD

## Prerequisites

- Java 17 or later
- Maven
- Docker
- Kubernetes cluster
- GitHub account

## Project Structure

```plaintext
java-basic-webserver/
├── app/
│   └── src/
│       └── main/
│           └── java/
│               └── com/
│                   └── example/
│                       └── App.java
├── manifests/
│   ├── deployment.yaml
│   └── kustomization.yaml
├── .github/
│   └── workflows/
│       └── build.yml
├── Dockerfile
├── pom.xml
└── README-java-basic-webserver.md
```

## Getting Started

1. Clone this repository
2. Build the project:
   ```bash
   mvn clean package
   ```
3. Run the application:
   ```bash
   java -jar target/*.jar
   ```
4. Access the web server at http://localhost:3000

## Docker Build

```bash
docker build -t java-basic-webserver .
docker run -p 3000:3000 java-basic-webserver
```

## Kubernetes Deployment

1. Apply the Kubernetes manifests:
   ```bash
   kubectl apply -k manifests/
   ```
2. Access the web server at http://java-basic-webserver.local

## Development

- The main application code is in `app/src/main/java/com/example/App.java`
- The application uses Spring Boot for the web server
- The `/` endpoint returns a "Hello world" message with the current time and date
- Health check endpoints are automatically provided by Spring Boot Actuator

## CI/CD

The GitHub Actions workflow automatically builds and pushes the Docker image to GitHub Container Registry when changes are pushed to the main branch.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 