import { FastifyRequest, FastifyReply } from 'fastify';
import { ContractService } from '../services/contract.service.js';
import {
  createContractSchema,
  terminateContractSchema,
  contractQuerySchema,
} from '../schemas/contract.schema.js';
import { prisma } from '../db/client.js';

export class ContractController {
  /**
   * Create a new contract from approved application
   * POST /api/v1/contracts
   */
  static async createContract(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userId;

      // Check if user is owner
      const ownerProfile = await prisma.ownerProfile.findUnique({
        where: { userId },
      });

      if (!ownerProfile) {
        return reply.code(403).send({
          error: 'Only property owners can create contracts',
        });
      }

      // Validate input
      const parseResult = createContractSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: parseResult.error.flatten().fieldErrors,
        });
      }

      const contract = await ContractService.createContract(ownerProfile.id, parseResult.data);

      return reply.code(201).send(contract);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message.includes('approved')) {
        return reply.code(400).send({ error: message });
      }
      if (message.includes('Only the listing owner')) {
        return reply.code(403).send({ error: message });
      }
      if (message.includes('already exists')) {
        return reply.code(409).send({ error: message });
      }

      console.error('Create contract error:', error);
      return reply.code(500).send({ error: 'Failed to create contract' });
    }
  }

  /**
   * Get list of contracts
   * GET /api/v1/contracts
   */
  static async getContracts(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userId;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      // Validate query params
      const parseResult = contractQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: parseResult.error.flatten().fieldErrors,
        });
      }

      const result = await ContractService.getContracts(userId, parseResult.data);

      return reply.send(result);
    } catch (error: unknown) {
      console.error('Get contracts error:', error);
      return reply.code(500).send({ error: 'Failed to get contracts' });
    }
  }

  /**
   * Get contract by ID
   * GET /api/v1/contracts/:id
   */
  static async getContractById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userId;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      const { id } = request.params as { id: string };

      const contract = await ContractService.getContractById(id, userId);

      if (!contract) {
        return reply.code(404).send({ error: 'Contract not found' });
      }

      return reply.send(contract);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message === 'Access denied') {
        return reply.code(403).send({ error: message });
      }

      console.error('Get contract error:', error);
      return reply.code(500).send({ error: 'Failed to get contract' });
    }
  }

  /**
   * Send contract for signing
   * POST /api/v1/contracts/:id/send-for-signing
   */
  static async sendForSigning(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userId;
      const { id } = request.params as { id: string };

      // Check if user is owner
      const ownerProfile = await prisma.ownerProfile.findUnique({
        where: { userId },
      });

      if (!ownerProfile) {
        return reply.code(403).send({
          error: 'Only property owners can send contracts for signing',
        });
      }

      const contract = await ContractService.sendForSigning(id, ownerProfile.id);

      return reply.send(contract);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message.includes('not found')) {
        return reply.code(404).send({ error: message });
      }
      if (message.includes('Only the owner')) {
        return reply.code(403).send({ error: message });
      }
      if (message.includes('DRAFT')) {
        return reply.code(400).send({ error: message });
      }

      console.error('Send for signing error:', error);
      return reply.code(500).send({ error: 'Failed to send contract for signing' });
    }
  }

  /**
   * Sign contract
   * POST /api/v1/contracts/:id/sign
   */
  static async signContract(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userId;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      const { id } = request.params as { id: string };

      const contract = await ContractService.signContract(id, userId);

      return reply.send(contract);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message.includes('not found')) {
        return reply.code(404).send({ error: message });
      }
      if (message.includes('not a party')) {
        return reply.code(403).send({ error: message });
      }
      if (message.includes('PENDING_SIGNATURES') || message.includes('already signed')) {
        return reply.code(400).send({ error: message });
      }

      console.error('Sign contract error:', error);
      return reply.code(500).send({ error: 'Failed to sign contract' });
    }
  }

  /**
   * Terminate contract
   * POST /api/v1/contracts/:id/terminate
   */
  static async terminateContract(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userId;
      const { id } = request.params as { id: string };

      // Check if user is owner
      const ownerProfile = await prisma.ownerProfile.findUnique({
        where: { userId },
      });

      if (!ownerProfile) {
        return reply.code(403).send({
          error: 'Only property owners can terminate contracts',
        });
      }

      // Validate input
      const parseResult = terminateContractSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: parseResult.error.flatten().fieldErrors,
        });
      }

      const contract = await ContractService.terminateContract(
        id,
        ownerProfile.id,
        parseResult.data
      );

      return reply.send(contract);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message.includes('not found')) {
        return reply.code(404).send({ error: message });
      }
      if (message.includes('Only the owner')) {
        return reply.code(403).send({ error: message });
      }
      if (message.includes('ACTIVE')) {
        return reply.code(400).send({ error: message });
      }

      console.error('Terminate contract error:', error);
      return reply.code(500).send({ error: 'Failed to terminate contract' });
    }
  }
}
