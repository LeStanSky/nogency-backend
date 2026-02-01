import { FastifyRequest, FastifyReply } from 'fastify';
import { PlaidService } from '../services/plaid.service.js';
import { exchangeTokenSchema, plaidWebhookSchema } from '../schemas/plaid.schema.js';
import { prisma } from '../db/client.js';
import {
  ForbiddenError,
  ValidationError,
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
} from '../utils/errors.js';

export class PlaidController {
  /**
   * Create a Plaid Link token
   * POST /api/v1/plaid/link-token
   */
  static async createLinkToken(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId;
    if (!userId) {
      throw new UnauthorizedError();
    }

    // Check if user is tenant
    const tenantProfile = await prisma.tenantProfile.findUnique({
      where: { userId },
    });

    if (!tenantProfile) {
      throw new ForbiddenError('Only tenants can connect Plaid');
    }

    try {
      const result = await PlaidService.createLinkToken(userId);
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found')) {
        throw new NotFoundError(message);
      }
      throw error;
    }
  }

  /**
   * Exchange public token for access token
   * POST /api/v1/plaid/exchange-token
   */
  static async exchangeToken(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId;
    if (!userId) {
      throw new UnauthorizedError();
    }

    // Check if user is tenant
    const tenantProfile = await prisma.tenantProfile.findUnique({
      where: { userId },
    });

    if (!tenantProfile) {
      throw new ForbiddenError('Only tenants can connect Plaid');
    }

    // Validate input
    const parseResult = exchangeTokenSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new ValidationError('Validation failed', {
        fields: Object.entries(parseResult.error.flatten().fieldErrors).map(
          ([key, msgs]) => `${key}: ${(msgs as string[]).join(', ')}`
        ),
      });
    }

    try {
      const result = await PlaidService.exchangePublicToken(userId, parseResult.data);
      return reply.code(201).send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found')) {
        throw new NotFoundError(message);
      }
      throw new BadRequestError(message);
    }
  }

  /**
   * Get income verification data
   * GET /api/v1/plaid/income
   */
  static async getIncome(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId;
    if (!userId) {
      throw new UnauthorizedError();
    }

    // Check if user is tenant
    const tenantProfile = await prisma.tenantProfile.findUnique({
      where: { userId },
    });

    if (!tenantProfile) {
      throw new ForbiddenError('Only tenants can access Plaid income data');
    }

    try {
      const result = await PlaidService.getIncome(userId);
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found')) {
        throw new NotFoundError(message);
      }
      throw error;
    }
  }

  /**
   * Get Plaid connection status
   * GET /api/v1/plaid/status
   */
  static async getStatus(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId;
    if (!userId) {
      throw new UnauthorizedError();
    }

    // Check if user is tenant
    const tenantProfile = await prisma.tenantProfile.findUnique({
      where: { userId },
    });

    if (!tenantProfile) {
      throw new ForbiddenError('Only tenants can access Plaid status');
    }

    try {
      const result = await PlaidService.getStatus(userId);
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found')) {
        throw new NotFoundError(message);
      }
      throw error;
    }
  }

  /**
   * Disconnect Plaid account
   * DELETE /api/v1/plaid/disconnect
   */
  static async disconnect(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId;
    if (!userId) {
      throw new UnauthorizedError();
    }

    // Check if user is tenant
    const tenantProfile = await prisma.tenantProfile.findUnique({
      where: { userId },
    });

    if (!tenantProfile) {
      throw new ForbiddenError('Only tenants can disconnect Plaid');
    }

    try {
      const result = await PlaidService.disconnect(userId);
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not connected')) {
        throw new BadRequestError(message);
      }
      if (message.includes('not found')) {
        throw new NotFoundError(message);
      }
      throw error;
    }
  }

  /**
   * Handle Plaid webhook
   * POST /api/v1/plaid/webhook
   */
  static async handleWebhook(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Validate webhook payload
      const parseResult = plaidWebhookSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw new BadRequestError('Invalid webhook payload');
      }

      const result = await PlaidService.handleWebhook(parseResult.data);
      return reply.send(result);
    } catch (error: unknown) {
      throw new BadRequestError('Webhook error');
    }
  }
}
