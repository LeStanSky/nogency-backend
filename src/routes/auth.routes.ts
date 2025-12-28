import { FastifyInstance } from 'fastify';
import { AuthController } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

/**
 * Auth routes
 * Prefix: /api/v1/auth
 */
export default async function authRoutes(app: FastifyInstance) {
  // POST /api/v1/auth/register - Register new user
  app.post('/register', AuthController.register);

  // POST /api/v1/auth/login - Login existing user
  app.post('/login', AuthController.login);

  // GET /api/v1/auth/me - Get current user (protected)
  app.get('/me', {
    preHandler: authMiddleware,
    handler: AuthController.me,
  });
}
