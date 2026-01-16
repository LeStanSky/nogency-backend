import { FastifyInstance } from 'fastify';
import { PaymentController } from '../controllers/payment.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

export default async function paymentRoutes(app: FastifyInstance) {
  // Create payment intent (requires auth)
  app.post('/create-intent', { preHandler: authMiddleware }, PaymentController.createPaymentIntent);

  // Get payments (requires auth)
  app.get('/', { preHandler: authMiddleware }, PaymentController.getPayments);

  // Get payment by ID (requires auth)
  app.get('/:id', { preHandler: authMiddleware }, PaymentController.getPaymentById);

  // Stripe webhook (no auth - Stripe uses signature verification)
  app.post(
    '/webhook',
    {
      config: {
        rawBody: true,
      },
    },
    PaymentController.handleWebhook
  );
}
