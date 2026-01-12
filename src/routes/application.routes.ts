import { FastifyInstance } from 'fastify';
import { ApplicationController } from '../controllers/application.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

/**
 * Application routes
 * Prefix: /api/v1/applications
 */
export default async function applicationRoutes(app: FastifyInstance) {
  // POST /api/v1/applications - Submit a new application (protected, tenant only)
  app.post('/', {
    preHandler: authMiddleware,
    handler: ApplicationController.createApplication,
  });

  // GET /api/v1/applications - Get applications (filtered by role, protected)
  app.get('/', {
    preHandler: authMiddleware,
    handler: ApplicationController.getApplications,
  });

  // GET /api/v1/applications/:id - Get application by ID (protected)
  app.get('/:id', {
    preHandler: authMiddleware,
    handler: ApplicationController.getApplicationById,
  });

  // PATCH /api/v1/applications/:id/status - Update application status (protected, owner only)
  app.patch('/:id/status', {
    preHandler: authMiddleware,
    handler: ApplicationController.updateApplicationStatus,
  });

  // POST /api/v1/applications/:id/withdraw - Withdraw application (protected, tenant only)
  app.post('/:id/withdraw', {
    preHandler: authMiddleware,
    handler: ApplicationController.withdrawApplication,
  });

  // POST /api/v1/applications/:id/score - Calculate AI score (protected, owner only)
  app.post('/:id/score', {
    preHandler: authMiddleware,
    handler: ApplicationController.calculateScore,
  });
}
