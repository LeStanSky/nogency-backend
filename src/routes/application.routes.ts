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
    schema: {
      description: 'Submit a rental application for a listing (tenant only)',
      tags: ['Applications'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['listingId'],
        properties: {
          listingId: { type: 'string', format: 'uuid', description: 'Listing ID' },
          message: {
            type: 'string',
            maxLength: 2000,
            description: 'Message to owner (max 2000 chars)',
          },
          proposedMoveInDate: {
            type: 'string',
            format: 'date',
            description: 'Desired move-in date (YYYY-MM-DD)',
          },
          proposedLeaseTermMonths: {
            type: 'integer',
            minimum: 1,
            maximum: 60,
            description: 'Desired lease duration in months',
          },
          source: {
            type: 'string',
            enum: ['APP', 'WHATSAPP', 'EMAIL'],
            default: 'APP',
          },
        },
      },
      response: {
        201: {
          description: 'Application submitted',
          type: 'object',
          additionalProperties: true,
        },
        403: {
          description: 'Only tenants can submit applications',
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        404: {
          description: 'Listing not found',
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        409: {
          description: 'Application already exists for this listing',
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    handler: ApplicationController.createApplication,
  });

  // GET /api/v1/applications - Get applications (filtered by role, protected)
  app.get('/', {
    preHandler: authMiddleware,
    schema: {
      description:
        'Get applications (tenants see their own, owners see applications for their listings)',
      tags: ['Applications'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: [
              'PENDING',
              'REVIEWING',
              'SHORTLISTED',
              'VIEWING_SCHEDULED',
              'APPROVED',
              'REJECTED',
              'WITHDRAWN',
            ],
          },
          listingId: {
            type: 'string',
            format: 'uuid',
            description: 'Filter by listing (owner only)',
          },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
        },
      },
      response: {
        200: {
          description: 'List of applications',
          type: 'object',
          additionalProperties: true,
        },
      },
    },
    handler: ApplicationController.getApplications,
  });

  // GET /api/v1/applications/:id - Get application by ID (protected)
  app.get('/:id', {
    preHandler: authMiddleware,
    schema: {
      description: 'Get application details by ID',
      tags: ['Applications'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: 'Application details',
          type: 'object',
          additionalProperties: true,
        },
        404: {
          description: 'Application not found',
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    handler: ApplicationController.getApplicationById,
  });

  // PATCH /api/v1/applications/:id/status - Update application status (protected, owner only)
  app.patch('/:id/status', {
    preHandler: authMiddleware,
    schema: {
      description: 'Update application status (owner only)',
      tags: ['Applications'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: {
            type: 'string',
            enum: ['REVIEWING', 'SHORTLISTED', 'VIEWING_SCHEDULED', 'APPROVED', 'REJECTED'],
          },
          rejectionReason: {
            type: 'string',
            maxLength: 500,
            description: 'Required when status is REJECTED',
          },
        },
      },
      response: {
        200: {
          description: 'Status updated',
          type: 'object',
          additionalProperties: true,
        },
        400: {
          description: 'Validation error (e.g., missing rejection reason)',
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        403: {
          description: 'Only owner can update status',
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    handler: ApplicationController.updateApplicationStatus,
  });

  // POST /api/v1/applications/:id/withdraw - Withdraw application (protected, tenant only)
  app.post('/:id/withdraw', {
    preHandler: authMiddleware,
    schema: {
      description: 'Withdraw an application (tenant only)',
      tags: ['Applications'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: 'Application withdrawn',
          type: 'object',
          additionalProperties: true,
        },
        403: {
          description: 'Only tenant can withdraw their application',
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    handler: ApplicationController.withdrawApplication,
  });

  // POST /api/v1/applications/:id/score - Calculate AI score (protected, owner only)
  app.post('/:id/score', {
    preHandler: authMiddleware,
    schema: {
      description: 'Calculate AI scoring for an application (owner only)',
      tags: ['Applications'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: 'AI scoring result',
          type: 'object',
          additionalProperties: true,
        },
        403: {
          description: 'Only owner can calculate scoring',
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    handler: ApplicationController.calculateScore,
  });
}
