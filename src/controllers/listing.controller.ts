import { FastifyRequest, FastifyReply } from 'fastify';
import { ListingService } from '../services/listing.service.js';
import { createListingSchema, updateListingSchema } from '../schemas/listing.schema.js';
import { ZodError } from 'zod';

export class ListingController {
  /**
   * Create a new listing
   * POST /api/v1/listings
   */
  static async createListing(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userId;

      if (!userId) {
        return reply.code(401).send({
          error: 'Unauthorized',
        });
      }

      // Get owner profile ID
      const ownerProfileId = await ListingService.getOwnerProfileId(userId);

      if (!ownerProfileId) {
        return reply.code(403).send({
          error: 'Only property owners can create listings',
        });
      }

      // Validate request body
      const data = createListingSchema.parse(request.body);

      // Check if property exists
      const propertyExists = await ListingService.propertyExists(data.propertyId);
      if (!propertyExists) {
        return reply.code(404).send({
          error: 'Property not found',
        });
      }

      // Check if user owns the property
      const isPropertyOwner = await ListingService.isPropertyOwner(data.propertyId, ownerProfileId);
      if (!isPropertyOwner) {
        return reply.code(403).send({
          error: 'Access denied',
        });
      }

      // Create listing
      const listing = await ListingService.createListing(ownerProfileId, data);

      return reply.code(201).send(listing);
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
   * Get all listings for the current owner
   * GET /api/v1/listings
   */
  static async getListings(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userId;

      if (!userId) {
        return reply.code(401).send({
          error: 'Unauthorized',
        });
      }

      // Get owner profile ID
      const ownerProfileId = await ListingService.getOwnerProfileId(userId);

      if (!ownerProfileId) {
        return reply.code(200).send([]);
      }

      // Get listings
      const listings = await ListingService.getListingsByOwner(ownerProfileId);

      return reply.code(200).send(listings);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get all active listings (public endpoint)
   * GET /api/v1/listings/public
   */
  static async getPublicListings(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const listings = await ListingService.getActiveListings();

      return reply.code(200).send(listings);
    } catch (error) {
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get listing by ID
   * GET /api/v1/listings/:id
   */
  static async getListingById(
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

      // Get listing
      const listing = await ListingService.getListingById(id);

      if (!listing) {
        return reply.code(404).send({
          error: 'Listing not found',
        });
      }

      // Get owner profile ID
      const ownerProfileId = await ListingService.getOwnerProfileId(userId);

      // Check ownership (owner can see all their listings, others can only see ACTIVE)
      if (listing.ownerId !== ownerProfileId && listing.status !== 'ACTIVE') {
        return reply.code(403).send({
          error: 'Access denied',
        });
      }

      return reply.code(200).send(listing);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * Update listing
   * PATCH /api/v1/listings/:id
   */
  static async updateListing(
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

      // Get listing
      const existingListing = await ListingService.getListingById(id);

      if (!existingListing) {
        return reply.code(404).send({
          error: 'Listing not found',
        });
      }

      // Get owner profile ID
      const ownerProfileId = await ListingService.getOwnerProfileId(userId);

      // Check ownership
      if (existingListing.ownerId !== ownerProfileId) {
        return reply.code(403).send({
          error: 'Access denied',
        });
      }

      // Validate request body
      const data = updateListingSchema.parse(request.body);

      // Update listing
      const listing = await ListingService.updateListing(id, data);

      return reply.code(200).send(listing);
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
   * Delete listing
   * DELETE /api/v1/listings/:id
   */
  static async deleteListing(
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

      // Get listing
      const existingListing = await ListingService.getListingById(id);

      if (!existingListing) {
        return reply.code(404).send({
          error: 'Listing not found',
        });
      }

      // Get owner profile ID
      const ownerProfileId = await ListingService.getOwnerProfileId(userId);

      // Check ownership
      if (existingListing.ownerId !== ownerProfileId) {
        return reply.code(403).send({
          error: 'Access denied',
        });
      }

      // Delete listing
      await ListingService.deleteListing(id);

      return reply.code(200).send({
        message: 'Listing deleted successfully',
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * Publish listing
   * POST /api/v1/listings/:id/publish
   */
  static async publishListing(
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

      // Get listing
      const existingListing = await ListingService.getListingById(id);

      if (!existingListing) {
        return reply.code(404).send({
          error: 'Listing not found',
        });
      }

      // Get owner profile ID
      const ownerProfileId = await ListingService.getOwnerProfileId(userId);

      // Check ownership
      if (existingListing.ownerId !== ownerProfileId) {
        return reply.code(403).send({
          error: 'Access denied',
        });
      }

      // Check if already active
      if (existingListing.status === 'ACTIVE') {
        return reply.code(400).send({
          error: 'Listing is already published',
        });
      }

      // Publish listing
      const listing = await ListingService.publishListing(id);

      return reply.code(200).send(listing);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * Pause listing
   * POST /api/v1/listings/:id/pause
   */
  static async pauseListing(
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

      // Get listing
      const existingListing = await ListingService.getListingById(id);

      if (!existingListing) {
        return reply.code(404).send({
          error: 'Listing not found',
        });
      }

      // Get owner profile ID
      const ownerProfileId = await ListingService.getOwnerProfileId(userId);

      // Check ownership
      if (existingListing.ownerId !== ownerProfileId) {
        return reply.code(403).send({
          error: 'Access denied',
        });
      }

      // Check if active
      if (existingListing.status !== 'ACTIVE') {
        return reply.code(400).send({
          error: 'Listing is not active',
        });
      }

      // Pause listing
      const listing = await ListingService.pauseListing(id);

      return reply.code(200).send(listing);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  }
}
