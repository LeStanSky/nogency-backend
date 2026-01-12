import { FastifyInstance } from 'fastify';
import { PropertyController } from '../controllers/property.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

/**
 * Property routes
 * Prefix: /api/v1/properties
 */
export default async function propertyRoutes(app: FastifyInstance) {
  // POST /api/v1/properties - Create a new property (protected)
  app.post('/', {
    preHandler: authMiddleware,
    handler: PropertyController.createProperty,
  });

  // GET /api/v1/properties - Get all properties for current owner (protected)
  app.get('/', {
    preHandler: authMiddleware,
    handler: PropertyController.getProperties,
  });

  // GET /api/v1/properties/:id - Get property by ID (protected)
  app.get('/:id', {
    preHandler: authMiddleware,
    handler: PropertyController.getPropertyById,
  });

  // PATCH /api/v1/properties/:id - Update property (protected)
  app.patch('/:id', {
    preHandler: authMiddleware,
    handler: PropertyController.updateProperty,
  });

  // DELETE /api/v1/properties/:id - Delete property (protected)
  app.delete('/:id', {
    preHandler: authMiddleware,
    handler: PropertyController.deleteProperty,
  });

  // POST /api/v1/properties/:id/photos - Add photo to property (protected)
  app.post('/:id/photos', {
    preHandler: authMiddleware,
    handler: PropertyController.addPhoto,
  });

  // DELETE /api/v1/properties/:id/photos/:photoId - Delete photo from property (protected)
  app.delete('/:id/photos/:photoId', {
    preHandler: authMiddleware,
    handler: PropertyController.deletePhoto,
  });
}
