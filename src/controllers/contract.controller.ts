import { FastifyRequest, FastifyReply } from 'fastify';
import { ContractService } from '../services/contract.service.js';
import {
  createContractSchema,
  terminateContractSchema,
  contractQuerySchema,
} from '../schemas/contract.schema.js';
import { prisma } from '../db/client.js';
import {
  ForbiddenError,
  ValidationError,
  NotFoundError,
  BadRequestError,
  ConflictError,
  UnauthorizedError,
} from '../utils/errors.js';

export class ContractController {
  /**
   * Create a new contract from approved application
   * POST /api/v1/contracts
   */
  static async createContract(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId;

    // Check if user is owner
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId },
    });

    if (!ownerProfile) {
      throw new ForbiddenError('Only property owners can create contracts');
    }

    // Validate input
    const parseResult = createContractSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new ValidationError('Validation failed', {
        fields: Object.entries(parseResult.error.flatten().fieldErrors).map(
          ([key, msgs]) => `${key}: ${(msgs as string[]).join(', ')}`
        ),
      });
    }

    try {
      const contract = await ContractService.createContract(ownerProfile.id, parseResult.data);
      return reply.code(201).send(contract);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message.includes('approved')) {
        throw new BadRequestError(message);
      }
      if (message.includes('Only the listing owner')) {
        throw new ForbiddenError(message);
      }
      if (message.includes('already exists')) {
        throw new ConflictError(message);
      }

      throw error;
    }
  }

  /**
   * Get list of contracts
   * GET /api/v1/contracts
   */
  static async getContracts(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId;
    if (!userId) {
      throw new UnauthorizedError();
    }

    // Validate query params
    const parseResult = contractQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      throw new ValidationError('Validation failed', {
        fields: Object.entries(parseResult.error.flatten().fieldErrors).map(
          ([key, msgs]) => `${key}: ${(msgs as string[]).join(', ')}`
        ),
      });
    }

    const result = await ContractService.getContracts(userId, parseResult.data);
    return reply.send(result);
  }

  /**
   * Get contract by ID
   * GET /api/v1/contracts/:id
   */
  static async getContractById(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId;
    if (!userId) {
      throw new UnauthorizedError();
    }
    const { id } = request.params as { id: string };

    try {
      const contract = await ContractService.getContractById(id, userId);

      if (!contract) {
        throw new NotFoundError('Contract not found');
      }

      return reply.send(contract);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message === 'Access denied') {
        throw new ForbiddenError(message);
      }

      throw error;
    }
  }

  /**
   * Send contract for signing
   * POST /api/v1/contracts/:id/send-for-signing
   */
  static async sendForSigning(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId;
    const { id } = request.params as { id: string };

    // Check if user is owner
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId },
    });

    if (!ownerProfile) {
      throw new ForbiddenError('Only property owners can send contracts for signing');
    }

    try {
      const contract = await ContractService.sendForSigning(id, ownerProfile.id);
      return reply.send(contract);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message.includes('not found')) {
        throw new NotFoundError(message);
      }
      if (message.includes('Only the owner')) {
        throw new ForbiddenError(message);
      }
      if (message.includes('DRAFT')) {
        throw new BadRequestError(message);
      }

      throw error;
    }
  }

  /**
   * Sign contract
   * POST /api/v1/contracts/:id/sign
   */
  static async signContract(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId;
    if (!userId) {
      throw new UnauthorizedError();
    }
    const { id } = request.params as { id: string };

    try {
      const contract = await ContractService.signContract(id, userId);
      return reply.send(contract);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message.includes('not found')) {
        throw new NotFoundError(message);
      }
      if (message.includes('not a party')) {
        throw new ForbiddenError(message);
      }
      if (message.includes('PENDING_SIGNATURES') || message.includes('already signed')) {
        throw new BadRequestError(message);
      }

      throw error;
    }
  }

  /**
   * Terminate contract
   * POST /api/v1/contracts/:id/terminate
   */
  static async terminateContract(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId;
    const { id } = request.params as { id: string };

    // Check if user is owner
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId },
    });

    if (!ownerProfile) {
      throw new ForbiddenError('Only property owners can terminate contracts');
    }

    // Validate input
    const parseResult = terminateContractSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new ValidationError('Validation failed', {
        fields: Object.entries(parseResult.error.flatten().fieldErrors).map(
          ([key, msgs]) => `${key}: ${(msgs as string[]).join(', ')}`
        ),
      });
    }

    try {
      const contract = await ContractService.terminateContract(
        id,
        ownerProfile.id,
        parseResult.data
      );
      return reply.send(contract);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message.includes('not found')) {
        throw new NotFoundError(message);
      }
      if (message.includes('Only the owner')) {
        throw new ForbiddenError(message);
      }
      if (message.includes('ACTIVE')) {
        throw new BadRequestError(message);
      }

      throw error;
    }
  }
}
