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
    schema: {
      description: 'Create an owner profile for the current user',
      tags: ['Profiles'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['firstName', 'lastName', 'documentType', 'documentNumber'],
        properties: {
          firstName: { type: 'string', description: 'First name' },
          lastName: { type: 'string', description: 'Last name' },
          documentType: {
            type: 'string',
            enum: ['DNI', 'NIE', 'TIE', 'PASSPORT'],
            description: 'Document type',
          },
          documentNumber: { type: 'string', description: 'Document number' },
          isCompany: { type: 'boolean', description: 'Is company' },
          companyName: { type: 'string', description: 'Company name (optional)' },
          taxId: { type: 'string', description: 'Tax ID (optional)' },
          bankAccountIban: { type: 'string', description: 'Bank account IBAN (optional)' },
        },
      },
      response: {
        201: {
          description: 'Owner profile created',
          type: 'object',
          additionalProperties: true,
        },
        400: {
          description: 'Validation error',
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        409: {
          description: 'Owner profile already exists',
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    handler: ProfileController.createOwnerProfile,
  });

  // POST /api/v1/profiles/tenant - Create tenant profile (protected)
  app.post('/tenant', {
    preHandler: authMiddleware,
    schema: {
      description: 'Create a tenant profile for the current user',
      tags: ['Profiles'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['firstName', 'lastName', 'documentType', 'documentNumber'],
        properties: {
          firstName: { type: 'string', description: 'First name' },
          lastName: { type: 'string', description: 'Last name' },
          documentType: {
            type: 'string',
            enum: ['DNI', 'NIE', 'TIE', 'PASSPORT'],
            description: 'Document type',
          },
          documentNumber: { type: 'string', description: 'Document number' },
          dateOfBirth: {
            type: 'string',
            format: 'date',
            description: 'Date of birth (YYYY-MM-DD)',
          },
          occupation: {
            type: 'string',
            enum: ['EMPLOYED', 'SELF_EMPLOYED', 'STUDENT', 'RETIRED', 'OTHER'],
            description: 'Current occupation',
          },
          employerName: { type: 'string', description: 'Employer name' },
          monthlyIncome: { type: 'number', description: 'Monthly income' },
          hasPets: { type: 'boolean', description: 'Has pets' },
          petsDescription: { type: 'string', description: 'Pets description' },
          numberOfOccupants: { type: 'integer', description: 'Number of occupants' },
          hasChildren: { type: 'boolean', description: 'Has children' },
          childrenAges: { type: 'array', items: { type: 'integer' }, description: 'Children ages' },
          preferredMoveInDate: {
            type: 'string',
            format: 'date',
            description: 'Preferred move-in date',
          },
          rentalDurationMonths: { type: 'integer', description: 'Rental duration in months' },
          applicationSource: {
            type: 'string',
            enum: ['APP', 'WHATSAPP', 'EMAIL'],
            description: 'Application source',
          },
        },
      },
      response: {
        201: {
          description: 'Tenant profile created',
          type: 'object',
          additionalProperties: true,
        },
        400: {
          description: 'Validation error',
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        409: {
          description: 'Tenant profile already exists',
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    handler: ProfileController.createTenantProfile,
  });

  // GET /api/v1/profiles/me - Get current user's profile (protected)
  app.get('/me', {
    preHandler: authMiddleware,
    schema: {
      description: 'Get the current user profile (owner or tenant)',
      tags: ['Profiles'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'User profile',
          type: 'object',
          additionalProperties: true,
        },
        404: {
          description: 'No profile found',
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    handler: ProfileController.getProfile,
  });

  // PATCH /api/v1/profiles/me - Update current user's profile (protected)
  app.patch('/me', {
    preHandler: authMiddleware,
    schema: {
      description: 'Update the current user profile',
      tags: ['Profiles'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        additionalProperties: true,
      },
      response: {
        200: {
          description: 'Profile updated',
          type: 'object',
          additionalProperties: true,
        },
        404: {
          description: 'Profile not found',
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    handler: ProfileController.updateProfile,
  });
}
