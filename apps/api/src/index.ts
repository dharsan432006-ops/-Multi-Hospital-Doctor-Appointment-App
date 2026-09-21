import 'dotenv/config';
import { getConfig } from './config/config.js';
import { createApp } from './app.js';
import { startWorkers } from './jobs/queues.js';

const cfg = getConfig();
const app = createApp();
const port = cfg.port;

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`api listening on :${port} (docs at /api/docs)`);
  });
  startWorkers();

  const shutdown = () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

export default app;
