# PHP Basic Webserver — app notes

The PHP Basic Webserver template is a simple hello world app using PHP with Apache that displays "Hello world" on a web page.
The purpose of this simple app is to verify that the development environment is set up and ready.
See more documentation at http://localhost:3000/docs/templates/basic-web-server/php-basic-webserver

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
