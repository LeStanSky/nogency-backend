import { FastifyInstance } from 'fastify';
import { ProfileController } from '../controllers/profile.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

/**
 * Profile routes
 * Prefix: /api/v1/profiles
 */
export default async function profileRoutes(app: FastifyInstance) {
  // POST /api/v1/profiles/owner - Create owner profile (protected)
  app.post('/owner', {
    preHandler: authMiddleware,
    handler: ProfileController.createOwnerProfile,
  });

  // POST /api/v1/profiles/tenant - Create tenant profile (protected)
  app.post('/tenant', {
    preHandler: authMiddleware,
    handler: ProfileController.createTenantProfile,
  });

  // GET /api/v1/profiles/me - Get current user's profile (protected)
  app.get('/me', {
    preHandler: authMiddleware,
    handler: ProfileController.getProfile,
  });

  // PATCH /api/v1/profiles/me - Update current user's profile (protected)
  app.patch('/me', {
    preHandler: authMiddleware,
    handler: ProfileController.updateProfile,
  });
}
