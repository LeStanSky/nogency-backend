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
        examples: [
          {
            firstName: 'Juan',
            lastName: 'Garcia',
            documentType: 'DNI',
            documentNumber: '12345678A',
            isCompany: false,
            bankAccountIban: 'ES9121000418450200051332',
          },
          {
            firstName: 'Maria',
            lastName: 'Lopez',
            documentType: 'NIE',
            documentNumber: 'X1234567B',
            isCompany: true,
            companyName: 'Inmobiliaria Lopez S.L.',
            taxId: 'B12345678',
          },
        ],
      },
      response: {
        201: {
          description: 'Owner profile created',
          type: 'object',
          additionalProperties: true,
          examples: [
            {
              id: '550e8400-e29b-41d4-a716-446655440001',
              userId: '550e8400-e29b-41d4-a716-446655440000',
              firstName: 'Juan',
              lastName: 'Garcia',
              documentType: 'DNI',
              documentNumber: '12345678A',
              isCompany: false,
              bankAccountIban: 'ES9121000418450200051332',
              createdAt: '2026-01-18T12:00:00.000Z',
            },
          ],
        },
        400: {
          description: 'Validation error',
          type: 'object',
          properties: { error: { type: 'string' } },
          examples: [{ error: 'Validation failed', details: { documentNumber: ['Required'] } }],
        },
        409: {
          description: 'Owner profile already exists',
          type: 'object',
          properties: { error: { type: 'string' } },
          examples: [{ error: 'Owner profile already exists' }],
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
        examples: [
          {
            firstName: 'Carlos',
            lastName: 'Martinez',
            documentType: 'DNI',
            documentNumber: '87654321B',
            dateOfBirth: '1990-05-15',
            occupation: 'EMPLOYED',
            employerName: 'Tech Company S.L.',
            monthlyIncome: 3500,
            hasPets: false,
            numberOfOccupants: 2,
            hasChildren: false,
            preferredMoveInDate: '2026-03-01',
            rentalDurationMonths: 12,
          },
          {
            firstName: 'Ana',
            lastName: 'Rodriguez',
            documentType: 'NIE',
            documentNumber: 'Y9876543C',
            dateOfBirth: '1985-08-20',
            occupation: 'SELF_EMPLOYED',
            monthlyIncome: 4500,
            hasPets: true,
            petsDescription: 'Small dog, well trained',
            numberOfOccupants: 3,
            hasChildren: true,
            childrenAges: [5, 8],
          },
        ],
      },
      response: {
        201: {
          description: 'Tenant profile created',
          type: 'object',
          additionalProperties: true,
          examples: [
            {
              id: '550e8400-e29b-41d4-a716-446655440002',
              userId: '550e8400-e29b-41d4-a716-446655440000',
              firstName: 'Carlos',
              lastName: 'Martinez',
              documentType: 'DNI',
              documentNumber: '87654321B',
              dateOfBirth: '1990-05-15',
              occupation: 'EMPLOYED',
              employerName: 'Tech Company S.L.',
              monthlyIncome: 3500,
              createdAt: '2026-01-18T12:00:00.000Z',
            },
          ],
        },
        400: {
          description: 'Validation error',
          type: 'object',
          properties: { error: { type: 'string' } },
          examples: [{ error: 'Validation failed', details: { firstName: ['Required'] } }],
        },
        409: {
          description: 'Tenant profile already exists',
          type: 'object',
          properties: { error: { type: 'string' } },
          examples: [{ error: 'Tenant profile already exists' }],
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
          examples: [
            {
              type: 'owner',
              profile: {
                id: '550e8400-e29b-41d4-a716-446655440001',
                firstName: 'Juan',
                lastName: 'Garcia',
                documentType: 'DNI',
                documentNumber: '12345678A',
                isCompany: false,
                bankAccountIban: 'ES9121000418450200051332',
              },
            },
            {
              type: 'tenant',
              profile: {
                id: '550e8400-e29b-41d4-a716-446655440002',
                firstName: 'Carlos',
                lastName: 'Martinez',
                documentType: 'DNI',
                documentNumber: '87654321B',
                occupation: 'EMPLOYED',
                monthlyIncome: 3500,
              },
            },
          ],
        },
        404: {
          description: 'No profile found',
          type: 'object',
          properties: { error: { type: 'string' } },
          examples: [{ error: 'No profile found. Create an owner or tenant profile first.' }],
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
        examples: [
          {
            monthlyIncome: 4000,
            employerName: 'New Tech Company S.L.',
          },
          {
            bankAccountIban: 'ES9121000418450200051333',
            companyName: 'Updated Company Name S.L.',
          },
        ],
      },
      response: {
        200: {
          description: 'Profile updated',
          type: 'object',
          additionalProperties: true,
          examples: [
            {
              id: '550e8400-e29b-41d4-a716-446655440002',
              firstName: 'Carlos',
              lastName: 'Martinez',
              monthlyIncome: 4000,
              employerName: 'New Tech Company S.L.',
              updatedAt: '2026-01-18T14:00:00.000Z',
            },
          ],
        },
        404: {
          description: 'Profile not found',
          type: 'object',
          properties: { error: { type: 'string' } },
          examples: [{ error: 'Profile not found' }],
        },
      },
    },
    handler: ProfileController.updateProfile,
  });
}
