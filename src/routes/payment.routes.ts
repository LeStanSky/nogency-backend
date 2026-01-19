import { FastifyInstance } from 'fastify';
import { PaymentController } from '../controllers/payment.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { errorResponseSchema } from '../schemas/error.schema.js';

export default async function paymentRoutes(app: FastifyInstance) {
  // Create payment intent (requires auth)
  app.post('/create-intent', {
    preHandler: authMiddleware,
    schema: {
      description: 'Create a Stripe payment intent for a contract payment',
      tags: ['Payments'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['contractId', 'amount', 'type'],
        properties: {
          contractId: { type: 'string', format: 'uuid', description: 'Contract ID' },
          amount: { type: 'number', minimum: 0, description: 'Payment amount in EUR' },
          type: {
            type: 'string',
            enum: ['DEPOSIT', 'ADDITIONAL_GUARANTEE', 'RENT', 'SERVICE_FEE', 'PENALTY'],
            description: 'Payment type',
          },
          periodStart: { type: 'string', format: 'date', description: 'Payment period start' },
          periodEnd: { type: 'string', format: 'date', description: 'Payment period end' },
        },
        examples: [
          {
            contractId: '550e8400-e29b-41d4-a716-446655440060',
            amount: 3000,
            type: 'DEPOSIT',
          },
          {
            contractId: '550e8400-e29b-41d4-a716-446655440060',
            amount: 1500,
            type: 'RENT',
            periodStart: '2026-03-01',
            periodEnd: '2026-03-31',
          },
        ],
      },
      response: {
        201: {
          description: 'Payment intent created',
          type: 'object',
          additionalProperties: true,
          examples: [
            {
              paymentId: '550e8400-e29b-41d4-a716-446655440070',
              clientSecret: 'pi_xxx_secret_xxx',
              amount: 3000,
              currency: 'eur',
              status: 'PENDING',
            },
          ],
        },
        400: {
          description: 'Validation error',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Amount must be positive',
              statusCode: 400,
              code: 'BAD_REQUEST',
            },
          ],
        },
        403: {
          description: 'Only tenant can create payments',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Only tenants can make payments',
              statusCode: 403,
              code: 'FORBIDDEN',
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
    handler: PaymentController.createPaymentIntent,
  });

  // Get payments (requires auth)
  app.get('/', {
    preHandler: authMiddleware,
    schema: {
      description: 'Get payments for the current user (tenant or owner)',
      tags: ['Payments'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED'],
          },
          type: {
            type: 'string',
            enum: ['DEPOSIT', 'ADDITIONAL_GUARANTEE', 'RENT', 'SERVICE_FEE', 'PENALTY', 'REFUND'],
          },
          contractId: { type: 'string', format: 'uuid' },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
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
                  contractId: '550e8400-e29b-41d4-a716-446655440060',
                  type: 'DEPOSIT',
                  amount: 3000,
                  status: 'COMPLETED',
                  paidAt: '2026-02-25T10:00:00.000Z',
                },
                {
                  id: '550e8400-e29b-41d4-a716-446655440071',
                  contractId: '550e8400-e29b-41d4-a716-446655440060',
                  type: 'RENT',
                  amount: 1500,
                  status: 'PENDING',
                  periodStart: '2026-03-01',
                  periodEnd: '2026-03-31',
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
    handler: PaymentController.getPayments,
  });

  // Get payment by ID (requires auth)
  app.get('/:id', {
    preHandler: authMiddleware,
    schema: {
      description: 'Get payment details by ID',
      tags: ['Payments'],
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
          description: 'Payment details',
          type: 'object',
          additionalProperties: true,
          examples: [
            {
              id: '550e8400-e29b-41d4-a716-446655440070',
              contractId: '550e8400-e29b-41d4-a716-446655440060',
              type: 'DEPOSIT',
              amount: 3000,
              currency: 'EUR',
              status: 'COMPLETED',
              stripePaymentIntentId: 'pi_xxx',
              paidAt: '2026-02-25T10:00:00.000Z',
              contract: {
                id: '550e8400-e29b-41d4-a716-446655440060',
                property: { address: { city: 'Madrid' } },
              },
              createdAt: '2026-02-24T12:00:00.000Z',
            },
          ],
        },
        404: {
          description: 'Payment not found',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Payment not found',
              statusCode: 404,
              code: 'NOT_FOUND',
            },
          ],
        },
      },
    },
    handler: PaymentController.getPaymentById,
  });

  // Stripe webhook (no auth - Stripe uses signature verification)
  app.post('/webhook', {
    config: {
      rawBody: true,
    },
    schema: {
      description:
        'Stripe webhook endpoint for payment events. ' +
        'Stripe sends events like payment_intent.succeeded, payment_intent.payment_failed.',
      tags: ['Payments'],
      headers: {
        type: 'object',
        properties: {
          'stripe-signature': { type: 'string', description: 'Stripe signature header' },
        },
      },
      response: {
        200: {
          description: 'Webhook processed',
          type: 'object',
          additionalProperties: true,
          examples: [{ received: true }],
        },
        400: {
          description: 'Invalid webhook signature',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Invalid signature',
              statusCode: 400,
              code: 'BAD_REQUEST',
            },
          ],
        },
      },
    },
    handler: PaymentController.handleWebhook,
  });
}
