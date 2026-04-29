import { FastifyInstance } from 'fastify';
import { PlaidController } from '../controllers/plaid.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { errorResponseSchema } from '../schemas/error.schema.js';

export default async function plaidRoutes(app: FastifyInstance) {
  // Create Link token (requires auth)
  app.post('/link-token', {
    preHandler: authMiddleware,
    schema: {
      description:
        'Create a Plaid Link token for initializing Plaid Link UI. ' +
        'The Link token is used by the frontend to launch the Plaid Link flow.',
      tags: ['Plaid'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'Link token created successfully',
          type: 'object',
          properties: {
            linkToken: { type: 'string', description: 'Plaid Link token' },
          },
          required: ['linkToken'],
          examples: [{ linkToken: 'link-sandbox-abc123...' }],
        },
        401: {
          description: 'Unauthorized',
          ...errorResponseSchema,
          examples: [{ error: 'No token provided', statusCode: 401, code: 'UNAUTHORIZED' }],
        },
        403: {
          description: 'Only tenants can connect Plaid',
          ...errorResponseSchema,
          examples: [
            { error: 'Only tenants can connect Plaid', statusCode: 403, code: 'FORBIDDEN' },
          ],
        },
      },
    },
    handler: PlaidController.createLinkToken,
  });

  // Exchange public token (requires auth)
  app.post('/exchange-token', {
    preHandler: authMiddleware,
    schema: {
      description:
        'Exchange Plaid public token for access token. ' +
        'Called after user completes Plaid Link flow successfully.',
      tags: ['Plaid'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['publicToken', 'institutionId', 'institutionName'],
        properties: {
          publicToken: {
            type: 'string',
            description: 'Public token from Plaid Link',
          },
          institutionId: {
            type: 'string',
            description: 'Institution ID from Plaid Link',
          },
          institutionName: {
            type: 'string',
            description: 'Name of the financial institution',
          },
        },
        examples: [
          {
            publicToken: 'public-sandbox-abc123...',
            institutionId: 'ins_123',
            institutionName: 'Chase',
          },
        ],
      },
      response: {
        201: {
          description: 'Token exchanged successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            institutionName: { type: 'string' },
          },
          required: ['success', 'institutionName'],
          examples: [{ success: true, institutionName: 'Chase' }],
        },
        400: {
          description: 'Validation error or failed to connect',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Failed to connect bank account',
              statusCode: 400,
              code: 'BAD_REQUEST',
            },
          ],
        },
        401: {
          description: 'Unauthorized',
          ...errorResponseSchema,
        },
        403: {
          description: 'Only tenants can connect Plaid',
          ...errorResponseSchema,
        },
      },
    },
    handler: PlaidController.exchangeToken,
  });

  // Get income data (requires auth)
  app.get('/income', {
    preHandler: authMiddleware,
    schema: {
      description:
        'Get verified income data from Plaid. ' +
        'Returns income verification status and details if available.',
      tags: ['Plaid'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'Income data',
          type: 'object',
          additionalProperties: true,
          examples: [
            {
              isVerified: true,
              institutionName: 'Chase',
              verifiedAt: '2026-01-15T10:00:00.000Z',
              monthlyIncome: 4500,
              incomeStreams: [
                {
                  name: 'Acme Corp',
                  amount: 4500,
                  frequency: 'MONTHLY',
                  confidence: 0.95,
                },
              ],
              accountBalance: 12500,
            },
            {
              isVerified: false,
              institutionName: null,
              verifiedAt: null,
              monthlyIncome: null,
              incomeStreams: [],
              accountBalance: null,
            },
          ],
        },
        401: {
          description: 'Unauthorized',
          ...errorResponseSchema,
        },
        403: {
          description: 'Only tenants can access Plaid income data',
          ...errorResponseSchema,
        },
      },
    },
    handler: PlaidController.getIncome,
  });

  // Get Plaid status (requires auth)
  app.get('/status', {
    preHandler: authMiddleware,
    schema: {
      description:
        'Get Plaid connection status. ' +
        'Shows whether user has connected a bank account and verification status.',
      tags: ['Plaid'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'Plaid connection status',
          type: 'object',
          properties: {
            isConnected: { type: 'boolean', description: 'Whether Plaid is connected' },
            institutionName: {
              type: ['string', 'null'],
              description: 'Name of connected institution',
            },
            verifiedAt: {
              type: ['string', 'null'],
              format: 'date-time',
              description: 'When income was last verified',
            },
            incomeVerified: { type: 'boolean', description: 'Whether income is verified' },
            verifiedMonthlyIncome: {
              type: ['number', 'null'],
              description: 'Verified monthly income amount',
            },
          },
          required: ['isConnected', 'incomeVerified'],
          examples: [
            {
              isConnected: true,
              institutionName: 'Chase',
              verifiedAt: '2026-01-15T10:00:00.000Z',
              incomeVerified: true,
              verifiedMonthlyIncome: 4500,
            },
            {
              isConnected: false,
              institutionName: null,
              verifiedAt: null,
              incomeVerified: false,
              verifiedMonthlyIncome: null,
            },
          ],
        },
        401: {
          description: 'Unauthorized',
          ...errorResponseSchema,
        },
        403: {
          description: 'Only tenants can access Plaid status',
          ...errorResponseSchema,
        },
      },
    },
    handler: PlaidController.getStatus,
  });

  // Disconnect Plaid (requires auth)
  app.delete('/disconnect', {
    preHandler: authMiddleware,
    schema: {
      description:
        'Disconnect Plaid account. ' + 'Removes bank connection and clears all Plaid-related data.',
      tags: ['Plaid'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'Plaid disconnected successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
          required: ['success'],
          examples: [{ success: true }],
        },
        400: {
          description: 'Plaid is not connected',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Plaid is not connected',
              statusCode: 400,
              code: 'BAD_REQUEST',
            },
          ],
        },
        401: {
          description: 'Unauthorized',
          ...errorResponseSchema,
        },
        403: {
          description: 'Only tenants can disconnect Plaid',
          ...errorResponseSchema,
        },
      },
    },
    handler: PlaidController.disconnect,
  });

  // Plaid webhook (no auth - Plaid sends directly)
  app.post('/webhook', {
    schema: {
      description:
        'Plaid webhook endpoint for receiving events. ' +
        'Plaid sends events like INCOME_VERIFICATION_STATUS_UPDATED.',
      tags: ['Plaid'],
      body: {
        type: 'object',
        properties: {
          webhook_type: { type: 'string', description: 'Webhook type (e.g., INCOME, ITEM)' },
          webhook_code: {
            type: 'string',
            description: 'Webhook code (e.g., INCOME_VERIFICATION_STATUS_UPDATED)',
          },
          item_id: { type: 'string', description: 'Plaid Item ID' },
          error: {
            type: 'object',
            properties: {
              error_type: { type: 'string' },
              error_code: { type: 'string' },
              error_message: { type: 'string' },
            },
          },
        },
      },
      response: {
        200: {
          description: 'Webhook processed',
          type: 'object',
          properties: {
            received: { type: 'boolean' },
          },
          required: ['received'],
          examples: [{ received: true }],
        },
        400: {
          description: 'Invalid webhook',
          ...errorResponseSchema,
          examples: [{ error: 'Webhook error', statusCode: 400, code: 'BAD_REQUEST' }],
        },
      },
    },
    handler: PlaidController.handleWebhook,
  });
}
