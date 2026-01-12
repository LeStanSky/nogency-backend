import { FastifyInstance } from 'fastify';
import { ListingController } from '../controllers/listing.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

/**
 * Listing routes
 * Prefix: /api/v1/listings
 */
export default async function listingRoutes(app: FastifyInstance) {
  // GET /api/v1/listings/public - Get all active listings (public, no auth)
  app.get('/public', {
    handler: ListingController.getPublicListings,
  });

  // POST /api/v1/listings - Create a new listing (protected)
  app.post('/', {
    preHandler: authMiddleware,
    handler: ListingController.createListing,
  });

  // GET /api/v1/listings - Get all listings for current owner (protected)
  app.get('/', {
    preHandler: authMiddleware,
    handler: ListingController.getListings,
  });

  // GET /api/v1/listings/:id - Get listing by ID (protected)
  app.get('/:id', {
    preHandler: authMiddleware,
    handler: ListingController.getListingById,
  });

  // PATCH /api/v1/listings/:id - Update listing (protected)
  app.patch('/:id', {
    preHandler: authMiddleware,
    handler: ListingController.updateListing,
  });

  // DELETE /api/v1/listings/:id - Delete listing (protected)
  app.delete('/:id', {
    preHandler: authMiddleware,
    handler: ListingController.deleteListing,
  });

  // POST /api/v1/listings/:id/publish - Publish listing (protected)
  app.post('/:id/publish', {
    preHandler: authMiddleware,
    handler: ListingController.publishListing,
  });

  // POST /api/v1/listings/:id/pause - Pause listing (protected)
  app.post('/:id/pause', {
    preHandler: authMiddleware,
    handler: ListingController.pauseListing,
  });
}
