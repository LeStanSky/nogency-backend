import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from './config.js';
import authRoutes from './routes/auth.routes.js';
import profileRoutes from './routes/profile.routes.js';
import documentsRoutes from './routes/documents.routes.js';
import propertyRoutes from './routes/property.routes.js';
import listingRoutes from './routes/listing.routes.js';
import applicationRoutes from './routes/application.routes.js';
import contractRoutes from './routes/contract.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import healthRoutes from './routes/health.routes.js';

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

  // Register Swagger for API documentation
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'NoGency AI API',
        description:
          'Backend API for NoGency AI - Rental property management platform with AI-powered tenant screening',
        version: '1.0.0',
        contact: {
          name: 'NoGency AI',
          url: 'https://nogency.ai',
        },
      },
      servers: [
        {
          url: `http://localhost:${config.port}`,
          description: 'Development server',
        },
      ],
      tags: [
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Profiles', description: 'User profile management' },
        { name: 'Documents', description: 'Document upload and AI verification' },
        { name: 'Properties', description: 'Property management' },
        { name: 'Listings', description: 'Listing management' },
        { name: 'Applications', description: 'Rental applications and AI scoring' },
        { name: 'Contracts', description: 'Lease contract management' },
        { name: 'Payments', description: 'Payment processing with Stripe' },
        { name: 'Health', description: 'Health check endpoints' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token obtained from /api/v1/auth/login',
          },
        },
      },
    },
  });

  // Register Swagger UI
  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      persistAuthorization: true,
    },
    staticCSP: true,
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
      docs: '/docs',
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
  await app.register(healthRoutes, { prefix: '/health' });

  return app;
};
