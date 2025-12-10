import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { config } from './config.js';

export const createApp = async (): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: {
      level: config.env === 'development' ? 'info' : 'error',
    },
  });

  // Register CORS
  await app.register(cors, {
    origin: config.frontendUrl,
    credentials: true,
  });

  // Register multipart for file uploads
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });

  // Health check route
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // API routes will be registered here
  // await app.register(routes, { prefix: '/api/v1' });

  return app;
};
