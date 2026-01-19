import { FastifyInstance } from 'fastify';
import { ApplicationController } from '../controllers/application.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { errorResponseSchema } from '../schemas/error.schema.js';

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
        examples: [
          {
            listingId: '550e8400-e29b-41d4-a716-446655440040',
            message:
              'Hello, I am very interested in this apartment. I am a professional working ' +
              'in Madrid and looking for a long-term rental.',
            proposedMoveInDate: '2026-03-01',
            proposedLeaseTermMonths: 12,
            source: 'APP',
          },
        ],
      },
      response: {
        201: {
          description: 'Application submitted',
          type: 'object',
          additionalProperties: true,
          examples: [
            {
              id: '550e8400-e29b-41d4-a716-446655440050',
              listingId: '550e8400-e29b-41d4-a716-446655440040',
              tenantId: '550e8400-e29b-41d4-a716-446655440002',
              status: 'PENDING',
              message: 'Hello, I am very interested...',
              proposedMoveInDate: '2026-03-01',
              proposedLeaseTermMonths: 12,
              createdAt: '2026-01-18T12:00:00.000Z',
            },
          ],
        },
        403: {
          description: 'Only tenants can submit applications',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Only tenants can submit applications',
              statusCode: 403,
              code: 'FORBIDDEN',
            },
          ],
        },
        404: {
          description: 'Listing not found',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Listing not found or not active',
              statusCode: 404,
              code: 'NOT_FOUND',
            },
          ],
        },
        409: {
          description: 'Application already exists for this listing',
          ...errorResponseSchema,
          examples: [
            {
              error: 'You have already applied for this listing',
              statusCode: 409,
              code: 'CONFLICT',
            },
          ],
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
          examples: [
            {
              applications: [
                {
                  id: '550e8400-e29b-41d4-a716-446655440050',
                  status: 'PENDING',
                  listing: { title: 'Spacious apartment', monthlyRent: 1500 },
                  tenant: { firstName: 'Carlos', lastName: 'Martinez' },
                  createdAt: '2026-01-18T12:00:00.000Z',
                },
                {
                  id: '550e8400-e29b-41d4-a716-446655440051',
                  status: 'REVIEWING',
                  listing: { title: 'Spacious apartment', monthlyRent: 1500 },
                  tenant: { firstName: 'Ana', lastName: 'Rodriguez' },
                  createdAt: '2026-01-17T10:00:00.000Z',
                },
              ],
              total: 2,
              page: 1,
              limit: 10,
            },
          ],
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
          examples: [
            {
              id: '550e8400-e29b-41d4-a716-446655440050',
              listingId: '550e8400-e29b-41d4-a716-446655440040',
              tenantId: '550e8400-e29b-41d4-a716-446655440002',
              status: 'REVIEWING',
              message: 'Hello, I am very interested...',
              proposedMoveInDate: '2026-03-01',
              proposedLeaseTermMonths: 12,
              listing: {
                title: 'Spacious 3-bedroom apartment',
                monthlyRent: 1500,
                property: { address: { city: 'Madrid' } },
              },
              tenant: {
                firstName: 'Carlos',
                lastName: 'Martinez',
                occupation: 'EMPLOYED',
                monthlyIncome: 3500,
              },
              scoring: null,
              createdAt: '2026-01-18T12:00:00.000Z',
            },
          ],
        },
        404: {
          description: 'Application not found',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Application not found',
              statusCode: 404,
              code: 'NOT_FOUND',
            },
          ],
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
        examples: [
          { status: 'REVIEWING' },
          { status: 'APPROVED' },
          { status: 'REJECTED', rejectionReason: 'Income does not meet minimum requirements' },
        ],
      },
      response: {
        200: {
          description: 'Status updated',
          type: 'object',
          additionalProperties: true,
          examples: [
            {
              id: '550e8400-e29b-41d4-a716-446655440050',
              status: 'APPROVED',
              updatedAt: '2026-01-18T14:00:00.000Z',
            },
          ],
        },
        400: {
          description: 'Validation error (e.g., missing rejection reason)',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Rejection reason is required when rejecting',
              statusCode: 400,
              code: 'BAD_REQUEST',
            },
          ],
        },
        403: {
          description: 'Only owner can update status',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Only listing owner can update application status',
              statusCode: 403,
              code: 'FORBIDDEN',
            },
          ],
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
          examples: [
            {
              id: '550e8400-e29b-41d4-a716-446655440050',
              status: 'WITHDRAWN',
              withdrawnAt: '2026-01-18T14:00:00.000Z',
            },
          ],
        },
        403: {
          description: 'Only tenant can withdraw their application',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Only the applicant can withdraw their application',
              statusCode: 403,
              code: 'FORBIDDEN',
            },
          ],
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
          examples: [
            {
              applicationId: '550e8400-e29b-41d4-a716-446655440050',
              totalScore: 78,
              incomeScore: 90,
              employmentScore: 85,
              rentalHistoryScore: 70,
              verificationScore: 60,
              criteriaMatchScore: 85,
              riskLevel: 'LOW',
              recommendations: [
                'Tenant meets income requirements (3x rent).',
                'Employment is verified and stable.',
                'Consider requesting additional references.',
              ],
              calculatedAt: '2026-01-18T14:00:00.000Z',
            },
          ],
        },
        403: {
          description: 'Only owner can calculate scoring',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Only listing owner can calculate scoring',
              statusCode: 403,
              code: 'FORBIDDEN',
            },
          ],
        },
      },
    },
    handler: ApplicationController.calculateScore,
  });
}
