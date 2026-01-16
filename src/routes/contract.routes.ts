import { FastifyInstance } from 'fastify';
import { ContractController } from '../controllers/contract.controller.js';
import { PaymentController } from '../controllers/payment.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

export default async function contractRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('onRequest', authMiddleware);

  // Create contract from approved application
  app.post('/', ContractController.createContract);

  // Get list of contracts (filtered by user role)
  app.get('/', ContractController.getContracts);

  // Get contract by ID
  app.get('/:id', ContractController.getContractById);

  // Send contract for signing (owner only)
  app.post('/:id/send-for-signing', ContractController.sendForSigning);

  // Sign contract (owner or tenant)
  app.post('/:id/sign', ContractController.signContract);

  // Terminate contract (owner only)
  app.post('/:id/terminate', ContractController.terminateContract);

  // Get payments for a specific contract
  app.get('/:id/payments', PaymentController.getPaymentsByContract);
}
