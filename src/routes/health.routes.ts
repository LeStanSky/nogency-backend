import { FastifyInstance } from 'fastify';
import { HealthService } from '../services/health.service.js';

export default async function healthRoutes(app: FastifyInstance) {
  /**
   * GET /health/detailed
   * Returns detailed health status for all external services
   */
  app.get('/detailed', {
    schema: {
      description: 'Get detailed health status for all external services',
      tags: ['Health'],
      response: {
        200: {
          description: 'All services healthy',
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok', 'degraded', 'error'] },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'integer', description: 'Server uptime in seconds' },
            version: { type: 'string' },
            environment: { type: 'string' },
            services: {
              type: 'object',
              properties: {
                database: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['ok', 'error', 'degraded'] },
                    latency: { type: 'integer', description: 'Response time in ms' },
                    message: { type: 'string' },
                  },
                },
                supabase: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['ok', 'error', 'degraded'] },
                    latency: { type: 'integer' },
                    message: { type: 'string' },
                  },
                },
                anthropic: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['ok', 'error', 'degraded'] },
                    latency: { type: 'integer' },
                    message: { type: 'string' },
                  },
                },
                stripe: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['ok', 'error', 'degraded'] },
                    latency: { type: 'integer' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        503: {
          description: 'One or more services unavailable',
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['error'] },
            services: { type: 'object' },
          },
        },
      },
    },
    handler: async (_request, reply) => {
      const health = await HealthService.getDetailedHealth();

      // Return 503 if any critical service is down
      if (health.status === 'error') {
        return reply.code(503).send(health);
      }

      return health;
    },
  });

  /**
   * GET /health/ready
   * Kubernetes readiness probe - returns 200 if ready to serve requests
   */
  app.get('/ready', {
    schema: {
      description: 'Kubernetes readiness probe - checks if service is ready to accept traffic',
      tags: ['Health'],
      response: {
        200: {
          description: 'Service is ready',
          type: 'object',
          properties: {
            ready: { type: 'boolean', enum: [true] },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        503: {
          description: 'Service not ready',
          type: 'object',
          properties: {
            ready: { type: 'boolean', enum: [false] },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: async (_request, reply) => {
      const ready = await HealthService.isReady();

      if (!ready) {
        return reply.code(503).send({
          ready: false,
          message: 'Service not ready - database unavailable',
        });
      }

      return {
        ready: true,
        timestamp: new Date().toISOString(),
      };
    },
  });

  /**
   * GET /health/live
   * Kubernetes liveness probe - returns 200 if server is alive
   */
  app.get('/live', {
    schema: {
      description: 'Kubernetes liveness probe - checks if server process is alive',
      tags: ['Health'],
      response: {
        200: {
          description: 'Server is alive',
          type: 'object',
          properties: {
            alive: { type: 'boolean', enum: [true] },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    handler: async () => {
      return {
        alive: HealthService.isAlive(),
        timestamp: new Date().toISOString(),
      };
    },
  });
}
