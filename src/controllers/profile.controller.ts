import { FastifyRequest, FastifyReply } from 'fastify';
import { ProfileService } from '../services/profile.service.js';
import {
  createOwnerProfileSchema,
  createTenantProfileSchema,
  updateOwnerProfileSchema,
  updateTenantProfileSchema,
} from '../schemas/profile.schema.js';
import { ZodError } from 'zod';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
} from '../utils/errors.js';

export class ProfileController {
  /**
   * Create owner profile
   * POST /api/v1/profiles/owner
   */
  static async createOwnerProfile(request: FastifyRequest, reply: FastifyReply) {
    // Get userId from request (set by auth middleware)
    const userId = request.userId;

    if (!userId) {
      throw new UnauthorizedError();
    }

    // Validate request body
    let data;
    try {
      data = createOwnerProfileSchema.parse(request.body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Validation error', {
          fields: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        });
      }
      throw error;
    }

    try {
      // Create owner profile
      const profile = await ProfileService.createOwnerProfile(userId, data);
      return reply.code(201).send(profile);
    } catch (error) {
      if (error instanceof Error && error.message === 'Owner profile already exists') {
        throw new ConflictError('Owner profile already exists');
      }
      throw error;
    }
  }

  /**
   * Create tenant profile
   * POST /api/v1/profiles/tenant
   */
  static async createTenantProfile(request: FastifyRequest, reply: FastifyReply) {
    // Get userId from request (set by auth middleware)
    const userId = request.userId;

    if (!userId) {
      throw new UnauthorizedError();
    }

    // Validate request body
    let data;
    try {
      data = createTenantProfileSchema.parse(request.body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Validation error', {
          fields: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        });
      }
      throw error;
    }

    try {
      // Create tenant profile
      const profile = await ProfileService.createTenantProfile(userId, data);
      return reply.code(201).send(profile);
    } catch (error) {
      if (error instanceof Error && error.message === 'Tenant profile already exists') {
        throw new ConflictError('Tenant profile already exists');
      }
      throw error;
    }
  }

  /**
   * Get current user's profile (owner or tenant)
   * GET /api/v1/profiles/me
   */
  static async getProfile(request: FastifyRequest, reply: FastifyReply) {
    // Get userId from request (set by auth middleware)
    const userId = request.userId;

    if (!userId) {
      throw new UnauthorizedError();
    }

    // Get profile
    const result = await ProfileService.getProfile(userId);

    if (!result) {
      throw new NotFoundError('Profile not found');
    }

    return reply.code(200).send(result);
  }

  /**
   * Update current user's profile (owner or tenant)
   * PATCH /api/v1/profiles/me
   */
  static async updateProfile(request: FastifyRequest, reply: FastifyReply) {
    // Get userId from request (set by auth middleware)
    const userId = request.userId;

    if (!userId) {
      throw new UnauthorizedError();
    }

    // Check profile type first to determine which schema to use
    const profileResult = await ProfileService.getProfile(userId);

    if (!profileResult) {
      throw new NotFoundError('Profile not found');
    }

    // Validate based on profile type
    let data;
    try {
      if (profileResult.type === 'owner') {
        data = updateOwnerProfileSchema.parse(request.body);
      } else {
        data = updateTenantProfileSchema.parse(request.body);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Validation error', {
          fields: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        });
      }
      throw error;
    }

    try {
      // Update profile
      const profile = await ProfileService.updateProfile(userId, data);
      return reply.code(200).send(profile);
    } catch (error) {
      if (error instanceof Error && error.message === 'Profile not found') {
        throw new NotFoundError('Profile not found');
      }
      throw error;
    }
  }
}
