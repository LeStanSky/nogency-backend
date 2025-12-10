import { createApp } from './app.js';
import { config } from './config.js';

const start = async () => {
  try {
    const app = await createApp();

    await app.listen({
      port: config.port,
      host: '0.0.0.0',
    });

    console.log(`🚀 Server is running on http://localhost:${config.port}`);
    console.log(`📝 Environment: ${config.env}`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
};

start();
