import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { config } from './config.js';
import authRoutes from './routes/auth.routes.js';
import profileRoutes from './routes/profile.routes.js';
import documentsRoutes from './routes/documents.routes.js';
import propertyRoutes from './routes/property.routes.js';
import listingRoutes from './routes/listing.routes.js';
import applicationRoutes from './routes/application.routes.js';
import contractRoutes from './routes/contract.routes.js';
import paymentRoutes from './routes/payment.routes.js';

interface AppOptions {
  enableRateLimit?: boolean;
}

export const createApp = async (options?: AppOptions): Promise<FastifyInstance> => {
  const enableRateLimit = options?.enableRateLimit ?? config.env !== 'test';
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

  // Register global rate limiting (disabled in test environment by default)
  if (enableRateLimit) {
    await app.register(rateLimit, {
      max: config.rateLimit.global.max,
      timeWindow: config.rateLimit.global.timeWindow,
      addHeadersOnExceeding: {
        'x-ratelimit-limit': true,
        'x-ratelimit-remaining': true,
        'x-ratelimit-reset': true,
      },
      addHeaders: {
        'x-ratelimit-limit': true,
        'x-ratelimit-remaining': true,
        'x-ratelimit-reset': true,
        'retry-after': true,
      },
    });
  }

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
  await app.register(documentsRoutes, { prefix: '/api/v1/documents' });
  await app.register(propertyRoutes, { prefix: '/api/v1/properties' });
  await app.register(listingRoutes, { prefix: '/api/v1/listings' });
  await app.register(applicationRoutes, { prefix: '/api/v1/applications' });
  await app.register(contractRoutes, { prefix: '/api/v1/contracts' });
  await app.register(paymentRoutes, { prefix: '/api/v1/payments' });

  return app;
};
