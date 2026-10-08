// The API service: internal, not exposed to the internet.
// Keep GET /health: both platforms use it to decide whether the container is healthy.
const express = require('express');
const os = require('os');

const app = express();
const port = process.env.PORT || 3000;

// Liveness/readiness probe. Cheap, and must not depend on anything else (a database outage
// should not make the platform restart healthy containers).
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/hello', (req, res) => {
  res.json({
    message: 'Hello from the API',
    service: process.env.SERVICE_NAME || 'api',
    environment: process.env.ENVIRONMENT || 'local',
    instance: os.hostname(),
    time: new Date().toISOString(),
  });
});

const server = app.listen(port, () => {
  console.log(`api listening on port ${port}`);
});

// Both platforms send SIGTERM on a rollout. Closing the server lets requests in flight finish.
process.on('SIGTERM', () => {
  console.log('SIGTERM received, draining connections');
  server.close(() => process.exit(0));
});
