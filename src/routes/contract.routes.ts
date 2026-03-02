import { FastifyInstance } from 'fastify';
import { ContractController } from '../controllers/contract.controller.js';
import { PaymentController } from '../controllers/payment.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { errorResponseSchema } from '../schemas/error.schema.js';

export default async function contractRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('onRequest', authMiddleware);

  // Create contract from approved application
  app.post('/', {
    schema: {
      description: 'Create a lease contract from an approved application (owner only)',
      tags: ['Contracts'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: [
          'applicationId',
          'startDate',
          'endDate',
          'monthlyRent',
          'depositAmount',
          'depositMonths',
          'paymentDueDay',
          'utilitiesResponsibility',
        ],
        properties: {
          applicationId: { type: 'string', format: 'uuid' },
          startDate: { type: 'string', format: 'date', description: 'Lease start date' },
          endDate: { type: 'string', format: 'date', description: 'Lease end date' },
          monthlyRent: { type: 'number', minimum: 0, description: 'Monthly rent in EUR' },
          depositAmount: { type: 'number', minimum: 0, description: 'Security deposit amount' },
          depositMonths: {
            type: 'integer',
            minimum: 1,
            maximum: 6,
            description: 'Number of months for deposit',
          },
          additionalGuaranteeMonths: {
            type: 'integer',
            minimum: 0,
            maximum: 12,
            description: 'Additional guarantee months',
          },
          paymentDueDay: {
            type: 'integer',
            minimum: 1,
            maximum: 28,
            description: 'Day of month for payment',
          },
          utilitiesResponsibility: {
            type: 'string',
            enum: ['OWNER', 'TENANT', 'SHARED'],
            description: 'Who pays utilities',
          },
          sublettingAllowed: { type: 'boolean', default: false },
          leaseType: {
            type: 'string',
            enum: ['RESIDENTIAL', 'SEASONAL'],
            default: 'RESIDENTIAL',
            description: 'LAU Title II (residential) or Title III (seasonal)',
          },
        },
        examples: [
          {
            applicationId: '550e8400-e29b-41d4-a716-446655440050',
            startDate: '2026-03-01',
            endDate: '2027-02-28',
            monthlyRent: 1500,
            depositAmount: 3000,
            depositMonths: 2,
            paymentDueDay: 5,
            utilitiesResponsibility: 'TENANT',
            sublettingAllowed: false,
          },
        ],
      },
      response: {
        201: {
          description: 'Contract created',
          type: 'object',
          additionalProperties: true,
          examples: [
            {
              id: '550e8400-e29b-41d4-a716-446655440060',
              applicationId: '550e8400-e29b-41d4-a716-446655440050',
              ownerId: '550e8400-e29b-41d4-a716-446655440001',
              tenantId: '550e8400-e29b-41d4-a716-446655440002',
              status: 'DRAFT',
              startDate: '2026-03-01',
              endDate: '2027-02-28',
              monthlyRent: 1500,
              depositAmount: 3000,
              createdAt: '2026-01-18T12:00:00.000Z',
            },
          ],
        },
        400: {
          description: 'Validation error or application not approved',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Application must be approved to create contract',
              statusCode: 400,
              code: 'BAD_REQUEST',
            },
          ],
        },
        403: {
          description: 'Only owner can create contracts',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Only listing owner can create contracts',
              statusCode: 403,
              code: 'FORBIDDEN',
            },
          ],
        },
      },
    },
    handler: ContractController.createContract,
  });

  // Get list of contracts (filtered by user role)
  app.get('/', {
    schema: {
      description: 'Get contracts (owners see their contracts, tenants see theirs)',
      tags: ['Contracts'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['DRAFT', 'PENDING_SIGNATURES', 'ACTIVE', 'TERMINATED', 'EXPIRED'],
          },
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 10 },
        },
      },
      response: {
        200: {
          description: 'List of contracts',
          type: 'object',
          additionalProperties: true,
          examples: [
            {
              contracts: [
                {
                  id: '550e8400-e29b-41d4-a716-446655440060',
                  status: 'ACTIVE',
                  startDate: '2026-03-01',
                  endDate: '2027-02-28',
                  monthlyRent: 1500,
                  property: { address: { city: 'Madrid' } },
                  tenant: { firstName: 'Carlos', lastName: 'Martinez' },
                },
              ],
              total: 1,
              page: 1,
              limit: 10,
            },
          ],
        },
      },
    },
    handler: ContractController.getContracts,
  });

  // Get contract by ID
  app.get('/:id', {
    schema: {
      description: 'Get contract details by ID',
      tags: ['Contracts'],
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
          description: 'Contract details',
          type: 'object',
          additionalProperties: true,
          examples: [
            {
              id: '550e8400-e29b-41d4-a716-446655440060',
              status: 'ACTIVE',
              startDate: '2026-03-01',
              endDate: '2027-02-28',
              monthlyRent: 1500,
              depositAmount: 3000,
              paymentDueDay: 5,
              utilitiesResponsibility: 'TENANT',
              ownerSignedAt: '2026-01-20T10:00:00.000Z',
              tenantSignedAt: '2026-01-20T14:00:00.000Z',
              activatedAt: '2026-01-20T14:00:00.000Z',
              owner: { firstName: 'Juan', lastName: 'Garcia' },
              tenant: { firstName: 'Carlos', lastName: 'Martinez' },
              property: { address: { street: 'Calle Gran Via', city: 'Madrid' } },
              events: [
                { type: 'CONTRACT_CREATED', createdAt: '2026-01-18T12:00:00.000Z' },
                { type: 'CONTRACT_SENT', createdAt: '2026-01-19T10:00:00.000Z' },
                { type: 'SIGNED_OWNER', createdAt: '2026-01-20T10:00:00.000Z' },
                { type: 'SIGNED_TENANT', createdAt: '2026-01-20T14:00:00.000Z' },
                { type: 'ACTIVE', createdAt: '2026-01-20T14:00:00.000Z' },
              ],
            },
          ],
        },
        404: {
          description: 'Contract not found',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Contract not found',
              statusCode: 404,
              code: 'NOT_FOUND',
            },
          ],
        },
      },
    },
    handler: ContractController.getContractById,
  });

  // Send contract for signing (owner only)
  app.post('/:id/send-for-signing', {
    schema: {
      description: 'Send contract to tenant for signing (owner only)',
      tags: ['Contracts'],
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
          description: 'Contract sent for signing',
          type: 'object',
          additionalProperties: true,
          examples: [
            {
              id: '550e8400-e29b-41d4-a716-446655440060',
              status: 'PENDING_SIGNATURES',
              sentForSigningAt: '2026-01-19T10:00:00.000Z',
            },
          ],
        },
        400: {
          description: 'Contract cannot be sent (wrong status)',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Contract must be in DRAFT status to send for signing',
              statusCode: 400,
              code: 'BAD_REQUEST',
            },
          ],
        },
      },
    },
    handler: ContractController.sendForSigning,
  });

  // Sign contract (owner or tenant)
  app.post('/:id/sign', {
    schema: {
      description: 'Sign the contract (owner or tenant)',
      tags: ['Contracts'],
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
          description: 'Contract signed',
          type: 'object',
          additionalProperties: true,
          examples: [
            {
              id: '550e8400-e29b-41d4-a716-446655440060',
              status: 'ACTIVE',
              ownerSignedAt: '2026-01-20T10:00:00.000Z',
              tenantSignedAt: '2026-01-20T14:00:00.000Z',
              activatedAt: '2026-01-20T14:00:00.000Z',
              message: 'Contract is now active. Both parties have signed.',
            },
          ],
        },
        400: {
          description: 'Contract cannot be signed (wrong status or already signed)',
          ...errorResponseSchema,
          examples: [
            {
              error: 'You have already signed this contract',
              statusCode: 400,
              code: 'BAD_REQUEST',
            },
          ],
        },
      },
    },
    handler: ContractController.signContract,
  });

  // Terminate contract (owner only)
  app.post('/:id/terminate', {
    schema: {
      description: 'Terminate an active contract (owner only)',
      tags: ['Contracts'],
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
        required: ['reason', 'terminationDate'],
        properties: {
          reason: {
            type: 'string',
            minLength: 10,
            maxLength: 1000,
            description: 'Termination reason',
          },
          terminationDate: { type: 'string', format: 'date', description: 'Termination date' },
        },
        examples: [
          {
            reason: 'Mutual agreement between owner and tenant to end the lease early.',
            terminationDate: '2026-06-30',
          },
        ],
      },
      response: {
        200: {
          description: 'Contract terminated',
          type: 'object',
          additionalProperties: true,
          examples: [
            {
              id: '550e8400-e29b-41d4-a716-446655440060',
              status: 'TERMINATED',
              terminatedAt: '2026-01-18T14:00:00.000Z',
              terminationReason: 'Mutual agreement...',
            },
          ],
        },
        400: {
          description: 'Contract cannot be terminated',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Contract must be ACTIVE to terminate',
              statusCode: 400,
              code: 'BAD_REQUEST',
            },
          ],
        },
      },
    },
    handler: ContractController.terminateContract,
  });

  // Get contract document URL
  app.get('/:id/document', {
    schema: {
      description: 'Get the generated PDF document URL for a contract',
      tags: ['Contracts'],
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
          description: 'Contract document URL',
          type: 'object',
          additionalProperties: true,
          examples: [
            {
              documentUrl: 'https://storage.supabase.co/contracts/abc123.pdf',
              contractNumber: 'CTR-2026-ABCD1234',
            },
          ],
        },
        400: {
          description: 'Document not yet generated',
          ...errorResponseSchema,
          examples: [
            {
              error:
                'Contract document has not been generated yet. Send the contract for signing first.',
              statusCode: 400,
              code: 'BAD_REQUEST',
            },
          ],
        },
        404: {
          description: 'Contract not found',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Contract not found',
              statusCode: 404,
              code: 'NOT_FOUND',
            },
          ],
        },
      },
    },
    handler: ContractController.getContractDocument,
  });

  // Get payments for a specific contract
  app.get('/:id/payments', {
    schema: {
      description: 'Get all payments for a contract',
      tags: ['Contracts'],
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
          description: 'List of payments',
          type: 'object',
          additionalProperties: true,
          examples: [
            {
              payments: [
                {
                  id: '550e8400-e29b-41d4-a716-446655440070',
                  type: 'DEPOSIT',
                  amount: 3000,
                  status: 'COMPLETED',
                  paidAt: '2026-02-25T10:00:00.000Z',
                },
                {
                  id: '550e8400-e29b-41d4-a716-446655440071',
                  type: 'RENT',
                  amount: 1500,
                  status: 'COMPLETED',
                  periodStart: '2026-03-01',
                  periodEnd: '2026-03-31',
                  paidAt: '2026-03-05T10:00:00.000Z',
                },
              ],
              total: 2,
            },
          ],
        },
      },
    },
    handler: PaymentController.getPaymentsByContract,
  });
}
