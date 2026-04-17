# Java Basic Webserver — app notes

The Java Basic Webserver template is a simple hello world app built with Spring Boot that displays "Hello world" on a web page.
The purpose of this simple app is to verify that the development environment is set up and ready.
See more documentation at http://localhost:3000/docs/templates/basic-web-server/java-basic-webserver

## HTTP API

| Path | Method | Response |
|------|--------|----------|
| `/` | GET | Plain text: greeting, template id `java-basic-webserver`, and formatted time/date |

**Spring Boot Actuator** is on the classpath (`spring-boot-starter-actuator`). Typical health URL: **`GET /actuator/health`** (Spring Boot defaults; no `application.properties` is shipped in this template).

## Entry point and port

- **Main class:** `com.example.App`
- **Port:** Spring Boot’s default is **8080** unless you set `server.port`. The Dockerfile and Kubernetes manifests in this template use **3000** — add `app/src/main/resources/application.properties` with `server.port=3000`, or pass `--server.port=3000`, to match the container locally.
- **Run (after build):** `mvn clean package` then `java -jar target/*.jar`

## Changing the app

- Add `@GetMapping` / `@RestController` methods in `App.java` or split into additional controllers under `com.example`.
