// The web service: the public front end. It calls the API service on the INTERNAL network
// (API_URL), from the server, never from the browser: the API is not reachable from outside.
// Keep GET /health: both platforms use it to decide whether the container is healthy.
const express = require('express');
const os = require('os');

const app = express();
const port = process.env.PORT || 3000;
const apiUrl = process.env.API_URL || 'http://localhost:3001';

app.get('/health', (req, res) => {
  // Deliberately does NOT call the API: a brief API outage must not restart the web container.
  res.json({ status: 'ok' });
});

app.get('/', async (req, res) => {
  let api;
  try {
    const response = await fetch(`${apiUrl}/api/hello`, { signal: AbortSignal.timeout(3000) });
    api = response.ok ? await response.json() : { error: `API answered ${response.status}` };
  } catch (error) {
    api = { error: `API not reachable at ${apiUrl}: ${error.message}` };
  }

  res.type('html').send(`<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Two-service web app</title></head>
  <body style="font-family: system-ui, sans-serif; max-width: 40rem; margin: 3rem auto; padding: 0 1rem">
    <h1>Hello World</h1>
    <p>Web service <code>${os.hostname()}</code> at ${new Date().toISOString()}.</p>
    <h2>Answer from the API service</h2>
    <pre>${JSON.stringify(api, null, 2).replace(/</g, '&lt;')}</pre>
  </body>
</html>`);
});

const server = app.listen(port, () => {
  console.log(`web listening on port ${port}, API at ${apiUrl}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, draining connections');
  server.close(() => process.exit(0));
});
