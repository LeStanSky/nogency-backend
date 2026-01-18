import { FastifyInstance } from 'fastify';
import { PaymentController } from '../controllers/payment.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

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
      },
      response: {
        201: {
          description: 'Payment intent created',
          type: 'object',
          additionalProperties: true,
        },
        400: {
          description: 'Validation error',
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        403: {
          description: 'Only tenant can create payments',
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        404: {
          description: 'Contract not found',
          type: 'object',
          properties: { error: { type: 'string' } },
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
        },
        404: {
          description: 'Payment not found',
          type: 'object',
          properties: { error: { type: 'string' } },
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
      description: 'Stripe webhook endpoint for payment events',
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
        },
        400: {
          description: 'Invalid webhook signature',
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    handler: PaymentController.handleWebhook,
  });
}
