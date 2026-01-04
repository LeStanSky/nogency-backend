import { FastifyRequest, FastifyReply } from 'fastify';
import { ProfileService } from '../services/profile.service.js';
import {
  createOwnerProfileSchema,
  createTenantProfileSchema,
  updateOwnerProfileSchema,
  updateTenantProfileSchema,
} from '../schemas/profile.schema.js';
import { ZodError } from 'zod';

export class ProfileController {
  /**
   * Create owner profile
   * POST /api/v1/profiles/owner
   */
  static async createOwnerProfile(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Get userId from request (set by auth middleware)
      const userId = request.userId;

      if (!userId) {
        return reply.code(401).send({
          error: 'Unauthorized',
        });
      }

      // Validate request body
      const data = createOwnerProfileSchema.parse(request.body);

      // Create owner profile
      const profile = await ProfileService.createOwnerProfile(userId, data);

      return reply.code(201).send(profile);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }

      if (error instanceof Error) {
        if (error.message === 'Owner profile already exists') {
          return reply.code(409).send({
            error: 'Owner profile already exists',
          });
        }
      }

      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * Create tenant profile
   * POST /api/v1/profiles/tenant
   */
  static async createTenantProfile(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Get userId from request (set by auth middleware)
      const userId = request.userId;

      if (!userId) {
        return reply.code(401).send({
          error: 'Unauthorized',
        });
      }

      // Validate request body
      const data = createTenantProfileSchema.parse(request.body);

      // Create tenant profile
      const profile = await ProfileService.createTenantProfile(userId, data);

      return reply.code(201).send(profile);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }

      if (error instanceof Error) {
        if (error.message === 'Tenant profile already exists') {
          return reply.code(409).send({
            error: 'Tenant profile already exists',
          });
        }
      }

      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get current user's profile (owner or tenant)
   * GET /api/v1/profiles/me
   */
  static async getProfile(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Get userId from request (set by auth middleware)
      const userId = request.userId;

      if (!userId) {
        return reply.code(401).send({
          error: 'Unauthorized',
        });
      }

      // Get profile
      const result = await ProfileService.getProfile(userId);

      if (!result) {
        return reply.code(404).send({
          error: 'Profile not found',
        });
      }

      return reply.code(200).send(result);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * Update current user's profile (owner or tenant)
   * PATCH /api/v1/profiles/me
   */
  static async updateProfile(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Get userId from request (set by auth middleware)
      const userId = request.userId;

      if (!userId) {
        return reply.code(401).send({
          error: 'Unauthorized',
        });
      }

      // Check profile type first to determine which schema to use
      const profileResult = await ProfileService.getProfile(userId);

      if (!profileResult) {
        return reply.code(404).send({
          error: 'Profile not found',
        });
      }

      // Validate based on profile type
      let data;
      if (profileResult.type === 'owner') {
        data = updateOwnerProfileSchema.parse(request.body);
      } else {
        data = updateTenantProfileSchema.parse(request.body);
      }

      // Update profile
      const profile = await ProfileService.updateProfile(userId, data);

      return reply.code(200).send(profile);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }

      if (error instanceof Error) {
        if (error.message === 'Profile not found') {
          return reply.code(404).send({
            error: 'Profile not found',
          });
        }
      }

      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  }
}
