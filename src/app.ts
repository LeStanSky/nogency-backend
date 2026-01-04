import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { config } from './config.js';
import authRoutes from './routes/auth.routes.js';
import profileRoutes from './routes/profile.routes.js';

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

  // Root route
  app.get('/', async () => {
    return {
      name: 'NoGency AI - Backend API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/health',
        api: '/api/v1',
      },
      docs: 'See README.md for API documentation',
    };
  });

  // Health check route
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // API routes
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(profileRoutes, { prefix: '/api/v1/profiles' });

  return app;
};
