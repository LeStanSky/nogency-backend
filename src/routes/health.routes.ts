import { FastifyInstance } from 'fastify';
import { HealthService } from '../services/health.service.js';

export default async function healthRoutes(app: FastifyInstance) {
  /**
   * GET /health/detailed
   * Returns detailed health status for all external services
   */
  app.get('/detailed', async (_request, reply) => {
    const health = await HealthService.getDetailedHealth();

    // Return 503 if any critical service is down
    if (health.status === 'error') {
      return reply.code(503).send(health);
    }

    return health;
  });

  /**
   * GET /health/ready
   * Kubernetes readiness probe - returns 200 if ready to serve requests
   */
  app.get('/ready', async (_request, reply) => {
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
  });

  /**
   * GET /health/live
   * Kubernetes liveness probe - returns 200 if server is alive
   */
  app.get('/live', async () => {
    return {
      alive: HealthService.isAlive(),
      timestamp: new Date().toISOString(),
    };
  });
}
