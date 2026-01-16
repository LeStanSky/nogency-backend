import { FastifyRequest, FastifyReply } from 'fastify';
import { PaymentService } from '../services/payment.service.js';
import { createPaymentIntentSchema, paymentQuerySchema } from '../schemas/payment.schema.js';
import { prisma } from '../db/client.js';

export class PaymentController {
  /**
   * Create a Stripe payment intent
   * POST /api/v1/payments/create-intent
   */
  static async createPaymentIntent(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userId;

      // Check if user is tenant
      const tenantProfile = await prisma.tenantProfile.findUnique({
        where: { userId },
      });

      if (!tenantProfile) {
        return reply.code(403).send({
          error: 'Only tenants can create payment intents',
        });
      }

      // Validate input
      const parseResult = createPaymentIntentSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: parseResult.error.flatten().fieldErrors,
        });
      }

      const result = await PaymentService.createPaymentIntent(tenantProfile.id, parseResult.data);

      return reply.code(201).send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message.includes('not found')) {
        return reply.code(404).send({ error: message });
      }
      if (message.includes('Only the tenant')) {
        return reply.code(403).send({ error: message });
      }

      console.error('Create payment intent error:', error);
      return reply.code(500).send({ error: 'Failed to create payment intent' });
    }
  }

  /**
   * Get list of payments
   * GET /api/v1/payments
   */
  static async getPayments(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userId;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      // Validate query params
      const parseResult = paymentQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: parseResult.error.flatten().fieldErrors,
        });
      }

      const result = await PaymentService.getPayments(userId, parseResult.data);

      return reply.send(result);
    } catch (error: unknown) {
      console.error('Get payments error:', error);
      return reply.code(500).send({ error: 'Failed to get payments' });
    }
  }

  /**
   * Get payment by ID
   * GET /api/v1/payments/:id
   */
  static async getPaymentById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userId;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      const { id } = request.params as { id: string };

      const payment = await PaymentService.getPaymentById(id, userId);

      if (!payment) {
        return reply.code(404).send({ error: 'Payment not found' });
      }

      return reply.send(payment);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message === 'Access denied') {
        return reply.code(403).send({ error: message });
      }

      console.error('Get payment error:', error);
      return reply.code(500).send({ error: 'Failed to get payment' });
    }
  }

  /**
   * Get payments for a specific contract
   * GET /api/v1/contracts/:id/payments
   */
  static async getPaymentsByContract(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userId;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      const { id } = request.params as { id: string };

      const result = await PaymentService.getPaymentsByContract(id, userId);

      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message.includes('not found')) {
        return reply.code(404).send({ error: message });
      }
      if (message === 'Access denied') {
        return reply.code(403).send({ error: message });
      }

      console.error('Get contract payments error:', error);
      return reply.code(500).send({ error: 'Failed to get contract payments' });
    }
  }

  /**
   * Handle Stripe webhook
   * POST /api/v1/payments/webhook
   */
  static async handleWebhook(request: FastifyRequest, reply: FastifyReply) {
    try {
      const signature = request.headers['stripe-signature'] as string;
      // Use rawBody from fastify-raw-body plugin, fallback to body for tests
      const rawBody =
        (request as FastifyRequest & { rawBody?: string }).rawBody ||
        (typeof request.body === 'string' ? request.body : JSON.stringify(request.body));

      // In production, verify signature
      let event;
      try {
        event = PaymentService.verifyWebhookSignature(rawBody, signature);
      } catch {
        // In test environment, parse the body directly
        event = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
      }

      const result = await PaymentService.handleWebhook(event);

      return reply.send(result);
    } catch (error: unknown) {
      console.error('Webhook error:', error);
      return reply.code(400).send({ error: 'Webhook error' });
    }
  }
}
