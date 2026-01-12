import { FastifyRequest, FastifyReply } from 'fastify';
import { PropertyService } from '../services/property.service.js';
import {
  createPropertySchema,
  updatePropertySchema,
  createPropertyPhotoSchema,
} from '../schemas/property.schema.js';
import { ZodError } from 'zod';

export class PropertyController {
  /**
   * Create a new property
   * POST /api/v1/properties
   */
  static async createProperty(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userId;

      if (!userId) {
        return reply.code(401).send({
          error: 'Unauthorized',
        });
      }

      // Get owner profile ID
      const ownerProfileId = await PropertyService.getOwnerProfileId(userId);

      if (!ownerProfileId) {
        return reply.code(403).send({
          error: 'Only property owners can create properties',
        });
      }

      // Validate request body
      const data = createPropertySchema.parse(request.body);

      // Create property
      const property = await PropertyService.createProperty(ownerProfileId, data);

      return reply.code(201).send(property);
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
   * Get all properties for the current owner
   * GET /api/v1/properties
   */
  static async getProperties(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userId;

      if (!userId) {
        return reply.code(401).send({
          error: 'Unauthorized',
        });
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
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get property by ID
   * GET /api/v1/properties/:id
   */
  static async getPropertyById(
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

      // Get property
      const property = await PropertyService.getPropertyById(id);

      if (!property) {
        return reply.code(404).send({
          error: 'Property not found',
        });
      }

      // Get owner profile ID
      const ownerProfileId = await PropertyService.getOwnerProfileId(userId);

      // Check ownership
      if (property.ownerId !== ownerProfileId) {
        return reply.code(403).send({
          error: 'Access denied',
        });
      }

      return reply.code(200).send(property);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * Update property
   * PATCH /api/v1/properties/:id
   */
  static async updateProperty(
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

      // Get property
      const existingProperty = await PropertyService.getPropertyById(id);

      if (!existingProperty) {
        return reply.code(404).send({
          error: 'Property not found',
        });
      }

      // Get owner profile ID
      const ownerProfileId = await PropertyService.getOwnerProfileId(userId);

      // Check ownership
      if (existingProperty.ownerId !== ownerProfileId) {
        return reply.code(403).send({
          error: 'Access denied',
        });
      }

      // Validate request body
      const data = updatePropertySchema.parse(request.body);

      // Update property
      const property = await PropertyService.updateProperty(id, data);

      return reply.code(200).send(property);
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
   * Delete property
   * DELETE /api/v1/properties/:id
   */
  static async deleteProperty(
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

      // Get property
      const existingProperty = await PropertyService.getPropertyById(id);

      if (!existingProperty) {
        return reply.code(404).send({
          error: 'Property not found',
        });
      }

      // Get owner profile ID
      const ownerProfileId = await PropertyService.getOwnerProfileId(userId);

      // Check ownership
      if (existingProperty.ownerId !== ownerProfileId) {
        return reply.code(403).send({
          error: 'Access denied',
        });
      }

      // Delete property
      await PropertyService.deleteProperty(id);

      return reply.code(200).send({
        message: 'Property deleted successfully',
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * Add photo to property
   * POST /api/v1/properties/:id/photos
   */
  static async addPhoto(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const userId = request.userId;

      if (!userId) {
        return reply.code(401).send({
          error: 'Unauthorized',
        });
      }

      const { id } = request.params;

      // Get property
      const existingProperty = await PropertyService.getPropertyById(id);

      if (!existingProperty) {
        return reply.code(404).send({
          error: 'Property not found',
        });
      }

      // Get owner profile ID
      const ownerProfileId = await PropertyService.getOwnerProfileId(userId);

      // Check ownership
      if (existingProperty.ownerId !== ownerProfileId) {
        return reply.code(403).send({
          error: 'Access denied',
        });
      }

      // Validate request body
      const data = createPropertyPhotoSchema.parse(request.body);

      // Add photo
      const photo = await PropertyService.addPhoto(id, data);

      return reply.code(201).send(photo);
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
   * Delete photo from property
   * DELETE /api/v1/properties/:id/photos/:photoId
   */
  static async deletePhoto(
    request: FastifyRequest<{ Params: { id: string; photoId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.userId;

      if (!userId) {
        return reply.code(401).send({
          error: 'Unauthorized',
        });
      }

      const { id, photoId } = request.params;

      // Get photo with property info
      const photo = await PropertyService.getPhotoById(photoId);

      if (!photo) {
        return reply.code(404).send({
          error: 'Photo not found',
        });
      }

      // Verify photo belongs to the specified property
      if (photo.propertyId !== id) {
        return reply.code(404).send({
          error: 'Photo not found',
        });
      }

      // Get owner profile ID
      const ownerProfileId = await PropertyService.getOwnerProfileId(userId);

      // Check ownership
      if (photo.property.ownerId !== ownerProfileId) {
        return reply.code(403).send({
          error: 'Access denied',
        });
      }

      // Delete photo
      await PropertyService.deletePhoto(photoId);

      return reply.code(200).send({
        message: 'Photo deleted successfully',
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  }
}
