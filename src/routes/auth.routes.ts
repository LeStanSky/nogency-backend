import { FastifyInstance } from 'fastify';
import { AuthController } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { config } from '../config.js';

/**
 * Auth routes
 * Prefix: /api/v1/auth
 */
export default async function authRoutes(app: FastifyInstance) {
  // Stricter rate limiting for auth endpoints (brute force protection)
  const authRateLimit = {
    max: config.rateLimit.auth.max,
    timeWindow: config.rateLimit.auth.timeWindow,
  };

  // POST /api/v1/auth/register - Register new user
  app.post('/register', {
    config: { rateLimit: authRateLimit },
    handler: AuthController.register,
  });

  // POST /api/v1/auth/login - Login existing user
  app.post('/login', {
    config: { rateLimit: authRateLimit },
    handler: AuthController.login,
  });

  // GET /api/v1/auth/me - Get current user (protected)
  app.get('/me', {
    preHandler: authMiddleware,
    handler: AuthController.me,
  });
}
