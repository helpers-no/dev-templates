# PHP Basic Webserver — app notes

Full template documentation (install, prerequisites, layout, tooling, architecture, Docker, Kubernetes, CI/CD) is published at:

**[https://tmp.sovereignsky.no/docs/templates/basic-web-server/php-basic-webserver/](https://tmp.sovereignsky.no/docs/templates/basic-web-server/php-basic-webserver/)**

The sections below describe only **`app/index.php`**.

## HTTP API

| Path | Method | Response |
|------|--------|----------|
| `/` | GET | `text/plain`: greeting, template id `php-basic-webserver`, time and date |

There is no separate health route in the default code.

## Entry point and port

- **File:** `app/index.php`
- **Run:** `php -S 0.0.0.0:3000 app/index.php` (built-in server; **no** auto-reload — restart after edits)

## Changing the app

- Add routing by checking `$_SERVER['REQUEST_URI']` or introduce a small router, or switch to a framework while keeping `app/` as the docroot.
