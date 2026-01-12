import { FastifyRequest, FastifyReply } from 'fastify';
import { ApplicationService } from '../services/application.service.js';
import { ScoringService } from '../services/scoring.service.js';
import {
  createApplicationSchema,
  updateApplicationStatusSchema,
  applicationQuerySchema,
} from '../schemas/application.schema.js';
import { ZodError } from 'zod';

export class ApplicationController {
  /**
   * Create a new application
   * POST /api/v1/applications
   */
  static async createApplication(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userId;

      if (!userId) {
        return reply.code(401).send({
          error: 'Unauthorized',
        });
      }

      // Get tenant profile ID
      const tenantProfileId = await ApplicationService.getTenantProfileId(userId);

      if (!tenantProfileId) {
        return reply.code(403).send({
          error: 'Only tenants can submit applications',
        });
      }

      // Validate request body
      const data = createApplicationSchema.parse(request.body);

      // Check if listing exists
      const listingExists = await ApplicationService.listingExists(data.listingId);
      if (!listingExists) {
        return reply.code(404).send({
          error: 'Listing not found',
        });
      }

      // Check if listing is active
      const isActive = await ApplicationService.isListingActive(data.listingId);
      if (!isActive) {
        return reply.code(400).send({
          error: 'Listing is not active',
        });
      }

      // Check for existing application
      const hasExisting = await ApplicationService.hasExistingApplication(
        tenantProfileId,
        data.listingId
      );
      if (hasExisting) {
        return reply.code(409).send({
          error: 'You have already applied to this listing',
        });
      }

      // Create application
      const application = await ApplicationService.createApplication(tenantProfileId, data);

      return reply.code(201).send(application);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }

      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get applications (filtered by role)
   * GET /api/v1/applications
   */
  static async getApplications(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userId;

      if (!userId) {
        return reply.code(401).send({
          error: 'Unauthorized',
        });
      }

      // Validate query params
      const query = applicationQuerySchema.parse(request.query);

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
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }

      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get application by ID
   * GET /api/v1/applications/:id
   */
  static async getApplicationById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.userId;

      if (!userId) {
        return reply.code(401).send({
          error: 'Unauthorized',
        });
      }

      const { id } = request.params;

      // Get application
      const application = await ApplicationService.getApplicationById(id);

      if (!application) {
        return reply.code(404).send({
          error: 'Application not found',
        });
      }

      // Check access rights
      const tenantProfileId = await ApplicationService.getTenantProfileId(userId);
      const ownerProfileId = await ApplicationService.getOwnerProfileId(userId);

      const isTenantOwner = application.tenantId === tenantProfileId;
      const isListingOwner = application.listing.ownerId === ownerProfileId;

      if (!isTenantOwner && !isListingOwner) {
        return reply.code(403).send({
          error: 'Access denied',
        });
      }

      return reply.code(200).send(application);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * Update application status (owner only)
   * PATCH /api/v1/applications/:id/status
   */
  static async updateApplicationStatus(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.userId;

      if (!userId) {
        return reply.code(401).send({
          error: 'Unauthorized',
        });
      }

      const { id } = request.params;

      // Get owner profile ID
      const ownerProfileId = await ApplicationService.getOwnerProfileId(userId);

      if (!ownerProfileId) {
        return reply.code(403).send({
          error: 'Only listing owners can update application status',
        });
      }

      // Check if application exists
      const applicationExists = await ApplicationService.applicationExists(id);
      if (!applicationExists) {
        return reply.code(404).send({
          error: 'Application not found',
        });
      }

      // Check if user owns the listing
      const isListingOwner = await ApplicationService.isApplicationListingOwner(id, ownerProfileId);
      if (!isListingOwner) {
        return reply.code(403).send({
          error: 'Access denied',
        });
      }

      // Validate request body
      const data = updateApplicationStatusSchema.parse(request.body);

      // Update status
      const application = await ApplicationService.updateApplicationStatus(id, data);

      return reply.code(200).send(application);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }

      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * Withdraw application (tenant only)
   * POST /api/v1/applications/:id/withdraw
   */
  static async withdrawApplication(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.userId;

      if (!userId) {
        return reply.code(401).send({
          error: 'Unauthorized',
        });
      }

      const { id } = request.params;

      // Get tenant profile ID
      const tenantProfileId = await ApplicationService.getTenantProfileId(userId);

      if (!tenantProfileId) {
        return reply.code(403).send({
          error: 'Only tenants can withdraw applications',
        });
      }

      // Check if application exists
      const applicationExists = await ApplicationService.applicationExists(id);
      if (!applicationExists) {
        return reply.code(404).send({
          error: 'Application not found',
        });
      }

      // Check if user owns the application
      const isTenantOwner = await ApplicationService.isApplicationTenant(id, tenantProfileId);
      if (!isTenantOwner) {
        return reply.code(403).send({
          error: 'Access denied',
        });
      }

      // Check if can withdraw
      const canWithdraw = await ApplicationService.canWithdraw(id);
      if (!canWithdraw) {
        return reply.code(400).send({
          error: 'Cannot withdraw this application',
        });
      }

      // Withdraw application
      const application = await ApplicationService.withdrawApplication(id);

      return reply.code(200).send(application);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * Calculate AI score for application (owner only)
   * POST /api/v1/applications/:id/score
   */
  static async calculateScore(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.userId;

      if (!userId) {
        return reply.code(401).send({
          error: 'Unauthorized',
        });
      }

      const { id } = request.params;

      // Get owner profile ID
      const ownerProfileId = await ApplicationService.getOwnerProfileId(userId);

      if (!ownerProfileId) {
        return reply.code(403).send({
          error: 'Only listing owners can calculate scores',
        });
      }

      // Check if application exists
      const applicationExists = await ApplicationService.applicationExists(id);
      if (!applicationExists) {
        return reply.code(404).send({
          error: 'Application not found',
        });
      }

      // Check if user owns the listing
      const isListingOwner = await ApplicationService.isApplicationListingOwner(id, ownerProfileId);
      if (!isListingOwner) {
        return reply.code(403).send({
          error: 'Access denied',
        });
      }

      // Calculate score
      const scoringResult = await ScoringService.calculateScore(id);

      return reply.code(200).send(scoringResult);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  }
}
