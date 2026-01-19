import { FastifyRequest, FastifyReply } from 'fastify';
import { ApplicationService } from '../services/application.service.js';
import { ScoringService } from '../services/scoring.service.js';
import {
  createApplicationSchema,
  updateApplicationStatusSchema,
  applicationQuerySchema,
} from '../schemas/application.schema.js';
import { ZodError } from 'zod';
import {
  ForbiddenError,
  ValidationError,
  NotFoundError,
  BadRequestError,
  ConflictError,
  UnauthorizedError,
} from '../utils/errors.js';

export class ApplicationController {
  /**
   * Create a new application
   * POST /api/v1/applications
   */
  static async createApplication(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId;

    if (!userId) {
      throw new UnauthorizedError();
    }

    // Get tenant profile ID
    const tenantProfileId = await ApplicationService.getTenantProfileId(userId);

    if (!tenantProfileId) {
      throw new ForbiddenError('Only tenants can submit applications');
    }

    // Validate request body
    let data;
    try {
      data = createApplicationSchema.parse(request.body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Validation error', {
          fields: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        });
      }
      throw error;
    }

    // Check if listing exists
    const listingExists = await ApplicationService.listingExists(data.listingId);
    if (!listingExists) {
      throw new NotFoundError('Listing not found');
    }

    // Check if listing is active
    const isActive = await ApplicationService.isListingActive(data.listingId);
    if (!isActive) {
      throw new BadRequestError('Listing is not active');
    }

    // Check for existing application
    const hasExisting = await ApplicationService.hasExistingApplication(
      tenantProfileId,
      data.listingId
    );
    if (hasExisting) {
      throw new ConflictError('You have already applied to this listing');
    }

    // Create application
    const application = await ApplicationService.createApplication(tenantProfileId, data);

    return reply.code(201).send(application);
  }

  /**
   * Get applications (filtered by role)
   * GET /api/v1/applications
   */
  static async getApplications(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId;

    if (!userId) {
      throw new UnauthorizedError();
    }

    // Validate query params
    let query;
    try {
      query = applicationQuerySchema.parse(request.query);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Validation error', {
          fields: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        });
      }
      throw error;
    }

    // Check if user is tenant or owner
    const tenantProfileId = await ApplicationService.getTenantProfileId(userId);
    const ownerProfileId = await ApplicationService.getOwnerProfileId(userId);

    if (tenantProfileId) {
      // Get tenant applications
      const result = await ApplicationService.getApplicationsByTenant(tenantProfileId, query);
      return reply.code(200).send(result);
    }

    if (ownerProfileId) {
      // Get applications for owner's listings
      const result = await ApplicationService.getApplicationsByOwner(ownerProfileId, query);
      return reply.code(200).send(result);
    }

    // No profile found
    return reply.code(200).send({
      applications: [],
      total: 0,
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * Get application by ID
   * GET /api/v1/applications/:id
   */
  static async getApplicationById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const userId = request.userId;

    if (!userId) {
      throw new UnauthorizedError();
    }

    const { id } = request.params;

    // Get application
    const application = await ApplicationService.getApplicationById(id);

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    // Check access rights
    const tenantProfileId = await ApplicationService.getTenantProfileId(userId);
    const ownerProfileId = await ApplicationService.getOwnerProfileId(userId);

    const isTenantOwner = application.tenantId === tenantProfileId;
    const isListingOwner = application.listing.ownerId === ownerProfileId;

    if (!isTenantOwner && !isListingOwner) {
      throw new ForbiddenError('Access denied');
    }

    return reply.code(200).send(application);
  }

  /**
   * Update application status (owner only)
   * PATCH /api/v1/applications/:id/status
   */
  static async updateApplicationStatus(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const userId = request.userId;

    if (!userId) {
      throw new UnauthorizedError();
    }

    const { id } = request.params;

    // Get owner profile ID
    const ownerProfileId = await ApplicationService.getOwnerProfileId(userId);

    if (!ownerProfileId) {
      throw new ForbiddenError('Only listing owners can update application status');
    }

    // Check if application exists
    const applicationExists = await ApplicationService.applicationExists(id);
    if (!applicationExists) {
      throw new NotFoundError('Application not found');
    }

    // Check if user owns the listing
    const isListingOwner = await ApplicationService.isApplicationListingOwner(id, ownerProfileId);
    if (!isListingOwner) {
      throw new ForbiddenError('Access denied');
    }

    // Validate request body
    let data;
    try {
      data = updateApplicationStatusSchema.parse(request.body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Validation error', {
          fields: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        });
      }
      throw error;
    }

    // Update status
    const application = await ApplicationService.updateApplicationStatus(id, data);

    return reply.code(200).send(application);
  }

  /**
   * Withdraw application (tenant only)
   * POST /api/v1/applications/:id/withdraw
   */
  static async withdrawApplication(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const userId = request.userId;

    if (!userId) {
      throw new UnauthorizedError();
    }

    const { id } = request.params;

    // Get tenant profile ID
    const tenantProfileId = await ApplicationService.getTenantProfileId(userId);

    if (!tenantProfileId) {
      throw new ForbiddenError('Only tenants can withdraw applications');
    }

    // Check if application exists
    const applicationExists = await ApplicationService.applicationExists(id);
    if (!applicationExists) {
      throw new NotFoundError('Application not found');
    }

    // Check if user owns the application
    const isTenantOwner = await ApplicationService.isApplicationTenant(id, tenantProfileId);
    if (!isTenantOwner) {
      throw new ForbiddenError('Access denied');
    }

    // Check if can withdraw
    const canWithdraw = await ApplicationService.canWithdraw(id);
    if (!canWithdraw) {
      throw new BadRequestError('Cannot withdraw this application');
    }

    // Withdraw application
    const application = await ApplicationService.withdrawApplication(id);

    return reply.code(200).send(application);
  }

  /**
   * Calculate AI score for application (owner only)
   * POST /api/v1/applications/:id/score
   */
  static async calculateScore(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const userId = request.userId;

    if (!userId) {
      throw new UnauthorizedError();
    }

    const { id } = request.params;

    // Get owner profile ID
    const ownerProfileId = await ApplicationService.getOwnerProfileId(userId);

    if (!ownerProfileId) {
      throw new ForbiddenError('Only listing owners can calculate scores');
    }

    // Check if application exists
    const applicationExists = await ApplicationService.applicationExists(id);
    if (!applicationExists) {
      throw new NotFoundError('Application not found');
    }

    // Check if user owns the listing
    const isListingOwner = await ApplicationService.isApplicationListingOwner(id, ownerProfileId);
    if (!isListingOwner) {
      throw new ForbiddenError('Access denied');
    }

    // Calculate score
    const scoringResult = await ScoringService.calculateScore(id);

    return reply.code(200).send(scoringResult);
  }
}
