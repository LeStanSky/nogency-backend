import { FastifyRequest, FastifyReply } from 'fastify';
import { ListingService } from '../services/listing.service.js';
import { createListingSchema, updateListingSchema } from '../schemas/listing.schema.js';
import { ZodError } from 'zod';
import {
  ForbiddenError,
  ValidationError,
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
} from '../utils/errors.js';

export class ListingController {
  /**
   * Create a new listing
   * POST /api/v1/listings
   */
  static async createListing(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId;

    if (!userId) {
      throw new UnauthorizedError();
    }

    // Get owner profile ID
    const ownerProfileId = await ListingService.getOwnerProfileId(userId);

    if (!ownerProfileId) {
      throw new ForbiddenError('Only property owners can create listings');
    }

    // Validate request body
    let data;
    try {
      data = createListingSchema.parse(request.body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Validation error', {
          fields: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        });
      }
      throw error;
    }

    // Check if property exists
    const propertyExists = await ListingService.propertyExists(data.propertyId);
    if (!propertyExists) {
      throw new NotFoundError('Property not found');
    }

    // Check if user owns the property
    const isPropertyOwner = await ListingService.isPropertyOwner(data.propertyId, ownerProfileId);
    if (!isPropertyOwner) {
      throw new ForbiddenError('Access denied');
    }

    // Create listing
    const listing = await ListingService.createListing(ownerProfileId, data);

    return reply.code(201).send(listing);
  }

  /**
   * Get all listings for the current owner
   * GET /api/v1/listings
   */
  static async getListings(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId;

    if (!userId) {
      throw new UnauthorizedError();
    }

    // Get owner profile ID
    const ownerProfileId = await ListingService.getOwnerProfileId(userId);

    if (!ownerProfileId) {
      return reply.code(200).send([]);
    }

    // Get listings
    const listings = await ListingService.getListingsByOwner(ownerProfileId);

    return reply.code(200).send(listings);
  }

  /**
   * Get all active listings (public endpoint)
   * GET /api/v1/listings/public
   */
  static async getPublicListings(_request: FastifyRequest, reply: FastifyReply) {
    const listings = await ListingService.getActiveListings();
    return reply.code(200).send(listings);
  }

  /**
   * Get listing by ID
   * GET /api/v1/listings/:id
   */
  static async getListingById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const userId = request.userId;

    if (!userId) {
      throw new UnauthorizedError();
    }

    const { id } = request.params;

    // Get listing
    const listing = await ListingService.getListingById(id);

    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    // Get owner profile ID
    const ownerProfileId = await ListingService.getOwnerProfileId(userId);

    // Check ownership (owner can see all their listings, others can only see ACTIVE)
    if (listing.ownerId !== ownerProfileId && listing.status !== 'ACTIVE') {
      throw new ForbiddenError('Access denied');
    }

    return reply.code(200).send(listing);
  }

  /**
   * Update listing
   * PATCH /api/v1/listings/:id
   */
  static async updateListing(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const userId = request.userId;

    if (!userId) {
      throw new UnauthorizedError();
    }

    const { id } = request.params;

    // Get listing
    const existingListing = await ListingService.getListingById(id);

    if (!existingListing) {
      throw new NotFoundError('Listing not found');
    }

    // Get owner profile ID
    const ownerProfileId = await ListingService.getOwnerProfileId(userId);

    // Check ownership
    if (existingListing.ownerId !== ownerProfileId) {
      throw new ForbiddenError('Access denied');
    }

    // Validate request body
    let data;
    try {
      data = updateListingSchema.parse(request.body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Validation error', {
          fields: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        });
      }
      throw error;
    }

    // Update listing
    const listing = await ListingService.updateListing(id, data);

    return reply.code(200).send(listing);
  }

  /**
   * Delete listing
   * DELETE /api/v1/listings/:id
   */
  static async deleteListing(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const userId = request.userId;

    if (!userId) {
      throw new UnauthorizedError();
    }

    const { id } = request.params;

    // Get listing
    const existingListing = await ListingService.getListingById(id);

    if (!existingListing) {
      throw new NotFoundError('Listing not found');
    }

    // Get owner profile ID
    const ownerProfileId = await ListingService.getOwnerProfileId(userId);

    // Check ownership
    if (existingListing.ownerId !== ownerProfileId) {
      throw new ForbiddenError('Access denied');
    }

    // Delete listing
    await ListingService.deleteListing(id);

    return reply.code(200).send({
      message: 'Listing deleted successfully',
    });
  }

  /**
   * Publish listing
   * POST /api/v1/listings/:id/publish
   */
  static async publishListing(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const userId = request.userId;

    if (!userId) {
      throw new UnauthorizedError();
    }

    const { id } = request.params;

    // Get listing
    const existingListing = await ListingService.getListingById(id);

    if (!existingListing) {
      throw new NotFoundError('Listing not found');
    }

    // Get owner profile ID
    const ownerProfileId = await ListingService.getOwnerProfileId(userId);

    // Check ownership
    if (existingListing.ownerId !== ownerProfileId) {
      throw new ForbiddenError('Access denied');
    }

    // Check if already active
    if (existingListing.status === 'ACTIVE') {
      throw new BadRequestError('Listing is already published');
    }

    // Publish listing
    const listing = await ListingService.publishListing(id);

    return reply.code(200).send(listing);
  }

  /**
   * Pause listing
   * POST /api/v1/listings/:id/pause
   */
  static async pauseListing(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const userId = request.userId;

    if (!userId) {
      throw new UnauthorizedError();
    }

    const { id } = request.params;

    // Get listing
    const existingListing = await ListingService.getListingById(id);

    if (!existingListing) {
      throw new NotFoundError('Listing not found');
    }

    // Get owner profile ID
    const ownerProfileId = await ListingService.getOwnerProfileId(userId);

    // Check ownership
    if (existingListing.ownerId !== ownerProfileId) {
      throw new ForbiddenError('Access denied');
    }

    // Check if active
    if (existingListing.status !== 'ACTIVE') {
      throw new BadRequestError('Listing is not active');
    }

    // Pause listing
    const listing = await ListingService.pauseListing(id);

    return reply.code(200).send(listing);
  }
}
