import { FastifyInstance } from 'fastify';
import { ContractController } from '../controllers/contract.controller.js';
import { PaymentController } from '../controllers/payment.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

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
        },
      },
      response: {
        201: {
          description: 'Contract created',
          type: 'object',
          additionalProperties: true,
        },
        400: {
          description: 'Validation error or application not approved',
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        403: {
          description: 'Only owner can create contracts',
          type: 'object',
          properties: { error: { type: 'string' } },
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
        },
        404: {
          description: 'Contract not found',
          type: 'object',
          properties: { error: { type: 'string' } },
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
        },
        400: {
          description: 'Contract cannot be sent (wrong status)',
          type: 'object',
          properties: { error: { type: 'string' } },
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
        },
        400: {
          description: 'Contract cannot be signed (wrong status or already signed)',
          type: 'object',
          properties: { error: { type: 'string' } },
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
      },
      response: {
        200: {
          description: 'Contract terminated',
          type: 'object',
          additionalProperties: true,
        },
        400: {
          description: 'Contract cannot be terminated',
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    handler: ContractController.terminateContract,
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
        },
      },
    },
    handler: PaymentController.getPaymentsByContract,
  });
}
