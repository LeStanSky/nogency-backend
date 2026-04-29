import { createApp } from './app.js';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { flushSentry } from './utils/sentry.js';

const start = async () => {
  try {
    const app = await createApp();

    await app.listen({
      port: config.port,
      host: '0.0.0.0',
    });

    logger.info(
      {
        port: config.port,
        environment: config.env,
        version: config.version,
      },
      `Server is running on http://localhost:${config.port}`
    );
  } catch (err) {
    logger.fatal({ error: err }, 'Error starting server');
    await flushSentry();
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Received shutdown signal');
  await flushSentry();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught exception');
  flushSentry().then(() => process.exit(1));
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled rejection');
  flushSentry().then(() => process.exit(1));
});

start();
