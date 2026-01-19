import { FastifyRequest, FastifyReply } from 'fastify';
import { PropertyService } from '../services/property.service.js';
import {
  createPropertySchema,
  updatePropertySchema,
  createPropertyPhotoSchema,
} from '../schemas/property.schema.js';
import { ZodError } from 'zod';
import {
  ForbiddenError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors.js';

export class PropertyController {
  /**
   * Create a new property
   * POST /api/v1/properties
   */
  static async createProperty(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId;

    if (!userId) {
      throw new UnauthorizedError();
    }

    // Get owner profile ID
    const ownerProfileId = await PropertyService.getOwnerProfileId(userId);

    if (!ownerProfileId) {
      throw new ForbiddenError('Only property owners can create properties');
    }

    // Validate request body
    let data;
    try {
      data = createPropertySchema.parse(request.body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Validation error', {
          fields: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        });
      }
      throw error;
    }

    // Create property
    const property = await PropertyService.createProperty(ownerProfileId, data);

    return reply.code(201).send(property);
  }

  /**
   * Get all properties for the current owner
   * GET /api/v1/properties
   */
  static async getProperties(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId;

    if (!userId) {
      throw new UnauthorizedError();
    }

    // Get owner profile ID
    const ownerProfileId = await PropertyService.getOwnerProfileId(userId);

    if (!ownerProfileId) {
      // Return empty array for non-owners
      return reply.code(200).send([]);
    }

    // Get properties
    const properties = await PropertyService.getPropertiesByOwner(ownerProfileId);

    return reply.code(200).send(properties);
  }

  /**
   * Get property by ID
   * GET /api/v1/properties/:id
   */
  static async getPropertyById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const userId = request.userId;

    if (!userId) {
      throw new UnauthorizedError();
    }

    const { id } = request.params;

    // Get property
    const property = await PropertyService.getPropertyById(id);

    if (!property) {
      throw new NotFoundError('Property not found');
    }

    // Get owner profile ID
    const ownerProfileId = await PropertyService.getOwnerProfileId(userId);

    // Check ownership
    if (property.ownerId !== ownerProfileId) {
      throw new ForbiddenError('Access denied');
    }

    return reply.code(200).send(property);
  }

  /**
   * Update property
   * PATCH /api/v1/properties/:id
   */
  static async updateProperty(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const userId = request.userId;

    if (!userId) {
      throw new UnauthorizedError();
    }

    const { id } = request.params;

    // Get property
    const existingProperty = await PropertyService.getPropertyById(id);

    if (!existingProperty) {
      throw new NotFoundError('Property not found');
    }

    // Get owner profile ID
    const ownerProfileId = await PropertyService.getOwnerProfileId(userId);

    // Check ownership
    if (existingProperty.ownerId !== ownerProfileId) {
      throw new ForbiddenError('Access denied');
    }

    // Validate request body
    let data;
    try {
      data = updatePropertySchema.parse(request.body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Validation error', {
          fields: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        });
      }
      throw error;
    }

    // Update property
    const property = await PropertyService.updateProperty(id, data);

    return reply.code(200).send(property);
  }

  /**
   * Delete property
   * DELETE /api/v1/properties/:id
   */
  static async deleteProperty(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const userId = request.userId;

    if (!userId) {
      throw new UnauthorizedError();
    }

    const { id } = request.params;

    // Get property
    const existingProperty = await PropertyService.getPropertyById(id);

    if (!existingProperty) {
      throw new NotFoundError('Property not found');
    }

    // Get owner profile ID
    const ownerProfileId = await PropertyService.getOwnerProfileId(userId);

    // Check ownership
    if (existingProperty.ownerId !== ownerProfileId) {
      throw new ForbiddenError('Access denied');
    }

    // Delete property
    await PropertyService.deleteProperty(id);

    return reply.code(200).send({
      message: 'Property deleted successfully',
    });
  }

  /**
   * Add photo to property
   * POST /api/v1/properties/:id/photos
   */
  static async addPhoto(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const userId = request.userId;

    if (!userId) {
      throw new UnauthorizedError();
    }

    const { id } = request.params;

    // Get property
    const existingProperty = await PropertyService.getPropertyById(id);

    if (!existingProperty) {
      throw new NotFoundError('Property not found');
    }

    // Get owner profile ID
    const ownerProfileId = await PropertyService.getOwnerProfileId(userId);

    // Check ownership
    if (existingProperty.ownerId !== ownerProfileId) {
      throw new ForbiddenError('Access denied');
    }

    // Validate request body
    let data;
    try {
      data = createPropertyPhotoSchema.parse(request.body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Validation error', {
          fields: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        });
      }
      throw error;
    }

    // Add photo
    const photo = await PropertyService.addPhoto(id, data);

    return reply.code(201).send(photo);
  }

  /**
   * Delete photo from property
   * DELETE /api/v1/properties/:id/photos/:photoId
   */
  static async deletePhoto(
    request: FastifyRequest<{ Params: { id: string; photoId: string } }>,
    reply: FastifyReply
  ) {
    const userId = request.userId;

    if (!userId) {
      throw new UnauthorizedError();
    }

    const { id, photoId } = request.params;

    // Get photo with property info
    const photo = await PropertyService.getPhotoById(photoId);

    if (!photo) {
      throw new NotFoundError('Photo not found');
    }

    // Verify photo belongs to the specified property
    if (photo.propertyId !== id) {
      throw new NotFoundError('Photo not found');
    }

    // Get owner profile ID
    const ownerProfileId = await PropertyService.getOwnerProfileId(userId);

    // Check ownership
    if (photo.property.ownerId !== ownerProfileId) {
      throw new ForbiddenError('Access denied');
    }

    // Delete photo
    await PropertyService.deletePhoto(photoId);

    return reply.code(200).send({
      message: 'Photo deleted successfully',
    });
  }
}
