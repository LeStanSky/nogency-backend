import { FastifyInstance } from 'fastify';
import { ListingController } from '../controllers/listing.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { errorResponseSchema } from '../schemas/error.schema.js';

/**
 * Listing routes
 * Prefix: /api/v1/listings
 */
export default async function listingRoutes(app: FastifyInstance) {
  // GET /api/v1/listings/public - Get all active listings (public, no auth)
  app.get('/public', {
    schema: {
      description: 'Get all active public listings (no authentication required)',
      tags: ['Listings'],
      querystring: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'Filter by city' },
          minPrice: { type: 'number', description: 'Minimum monthly rent' },
          maxPrice: { type: 'number', description: 'Maximum monthly rent' },
          bedrooms: { type: 'integer', description: 'Number of bedrooms' },
          propertyType: { type: 'string' },
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 10 },
        },
      },
      response: {
        200: {
          description: 'List of active listings',
          type: 'array',
          items: { type: 'object', additionalProperties: true },
          examples: [
            [
              {
                id: '550e8400-e29b-41d4-a716-446655440040',
                title: 'Spacious 3-bedroom apartment in Gran Via',
                description: 'Beautiful apartment with natural light...',
                monthlyRent: 1500,
                depositAmount: 3000,
                status: 'ACTIVE',
                availableFrom: '2026-02-01',
                property: {
                  address: { city: 'Madrid', street: 'Calle Gran Via' },
                  propertyType: 'APARTMENT',
                  roomCount: 3,
                  totalArea: 85,
                },
              },
              {
                id: '550e8400-e29b-41d4-a716-446655440041',
                title: 'Cozy studio near Sagrada Familia',
                monthlyRent: 900,
                depositAmount: 1800,
                status: 'ACTIVE',
                property: {
                  address: { city: 'Barcelona', street: 'Carrer de Mallorca' },
                  propertyType: 'STUDIO',
                  roomCount: 1,
                  totalArea: 45,
                },
              },
            ],
          ],
        },
      },
    },
    handler: ListingController.getPublicListings,
  });

  // POST /api/v1/listings - Create a new listing (protected)
  app.post('/', {
    preHandler: authMiddleware,
    schema: {
      description: 'Create a new listing from an existing property',
      tags: ['Listings'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: [
          'propertyId',
          'title',
          'description',
          'monthlyRent',
          'depositAmount',
          'minLeaseTermMonths',
          'availableFrom',
        ],
        properties: {
          propertyId: { type: 'string', format: 'uuid', description: 'Property ID' },
          title: { type: 'string', minLength: 5, description: 'Listing title' },
          description: { type: 'string', minLength: 20, description: 'Listing description' },
          monthlyRent: { type: 'number', description: 'Monthly rent in EUR' },
          depositAmount: { type: 'number', description: 'Security deposit in EUR' },
          utilitiesIncluded: { type: 'boolean' },
          minLeaseTermMonths: { type: 'integer', description: 'Minimum lease in months' },
          maxLeaseTermMonths: { type: 'integer', description: 'Maximum lease in months' },
          availableFrom: { type: 'string', format: 'date', description: 'Available from date' },
          preferredTenantCriteria: {
            type: 'object',
            properties: {
              minIncome: { type: 'number' },
              employmentStatus: { type: 'array', items: { type: 'string' } },
              allowPets: { type: 'boolean' },
              allowSmoking: { type: 'boolean' },
              maxOccupants: { type: 'integer' },
            },
          },
          channels: { type: 'array', items: { type: 'string' } },
        },
        examples: [
          {
            propertyId: '550e8400-e29b-41d4-a716-446655440020',
            title: 'Spacious 3-bedroom apartment in Gran Via',
            description:
              'Beautiful apartment with natural light, recently renovated, close to metro.',
            monthlyRent: 1500,
            depositAmount: 3000,
            utilitiesIncluded: false,
            minLeaseTermMonths: 12,
            maxLeaseTermMonths: 36,
            availableFrom: '2026-02-01',
            preferredTenantCriteria: {
              minIncome: 4500,
              employmentStatus: ['EMPLOYED', 'SELF_EMPLOYED'],
              allowPets: false,
              allowSmoking: false,
              maxOccupants: 4,
            },
          },
        ],
      },
      response: {
        201: {
          description: 'Listing created',
          type: 'object',
          additionalProperties: true,
          examples: [
            {
              id: '550e8400-e29b-41d4-a716-446655440040',
              propertyId: '550e8400-e29b-41d4-a716-446655440020',
              title: 'Spacious 3-bedroom apartment in Gran Via',
              monthlyRent: 1500,
              depositAmount: 3000,
              status: 'DRAFT',
              availableFrom: '2026-02-01',
              createdAt: '2026-01-18T12:00:00.000Z',
            },
          ],
        },
        400: {
          description: 'Validation error',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Validation failed',
              statusCode: 400,
              code: 'VALIDATION_ERROR',
              details: { fields: ['title: Min length is 5'] },
            },
          ],
        },
        404: {
          description: 'Property not found',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Property not found',
              statusCode: 404,
              code: 'NOT_FOUND',
            },
          ],
        },
      },
    },
    handler: ListingController.createListing,
  });

  // GET /api/v1/listings - Get all listings for current owner (protected)
  app.get('/', {
    preHandler: authMiddleware,
    schema: {
      description: 'Get all listings for the current owner',
      tags: ['Listings'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'RENTED', 'ARCHIVED'] },
        },
      },
      response: {
        200: {
          description: 'List of owner listings',
          type: 'array',
          items: { type: 'object', additionalProperties: true },
          examples: [
            [
              {
                id: '550e8400-e29b-41d4-a716-446655440040',
                title: 'Spacious 3-bedroom apartment',
                monthlyRent: 1500,
                status: 'ACTIVE',
                applicationsCount: 5,
              },
              {
                id: '550e8400-e29b-41d4-a716-446655440041',
                title: 'Cozy studio',
                monthlyRent: 900,
                status: 'DRAFT',
                applicationsCount: 0,
              },
            ],
          ],
        },
      },
    },
    handler: ListingController.getListings,
  });

  // GET /api/v1/listings/:id - Get listing by ID (protected)
  app.get('/:id', {
    preHandler: authMiddleware,
    schema: {
      description: 'Get listing details by ID',
      tags: ['Listings'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: 'Listing details',
          type: 'object',
          additionalProperties: true,
          examples: [
            {
              id: '550e8400-e29b-41d4-a716-446655440040',
              propertyId: '550e8400-e29b-41d4-a716-446655440020',
              title: 'Spacious 3-bedroom apartment in Gran Via',
              description: 'Beautiful apartment with natural light...',
              monthlyRent: 1500,
              depositAmount: 3000,
              status: 'ACTIVE',
              availableFrom: '2026-02-01',
              minLeaseTermMonths: 12,
              maxLeaseTermMonths: 36,
              preferredTenantCriteria: {
                minIncome: 4500,
                allowPets: false,
              },
              property: {
                id: '550e8400-e29b-41d4-a716-446655440020',
                address: { city: 'Madrid', street: 'Calle Gran Via' },
                propertyType: 'APARTMENT',
                photos: [],
              },
              applications: [],
              createdAt: '2026-01-18T12:00:00.000Z',
            },
          ],
        },
        404: {
          description: 'Listing not found',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Listing not found',
              statusCode: 404,
              code: 'NOT_FOUND',
            },
          ],
        },
      },
    },
    handler: ListingController.getListingById,
  });

  // PATCH /api/v1/listings/:id - Update listing (protected)
  app.patch('/:id', {
    preHandler: authMiddleware,
    schema: {
      description: 'Update listing details',
      tags: ['Listings'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 5 },
          description: { type: 'string', minLength: 20 },
          monthlyRent: { type: 'number', minimum: 0 },
          depositAmount: { type: 'number', minimum: 0 },
          utilitiesIncluded: { type: 'boolean' },
          minLeaseTermMonths: { type: 'integer', minimum: 1 },
          maxLeaseTermMonths: { type: 'integer', minimum: 1 },
          availableFrom: { type: 'string', format: 'date' },
          preferredTenantCriteria: {
            type: 'object',
            properties: {
              minIncome: { type: 'number' },
              employmentStatus: { type: 'array', items: { type: 'string' } },
              allowPets: { type: 'boolean' },
              allowSmoking: { type: 'boolean' },
              maxOccupants: { type: 'integer' },
            },
          },
          channels: { type: 'array', items: { type: 'string' } },
        },
        examples: [{ monthlyRent: 1600, availableFrom: '2026-03-01' }],
      },
      response: {
        200: {
          description: 'Listing updated',
          type: 'object',
          additionalProperties: true,
          examples: [
            {
              id: '550e8400-e29b-41d4-a716-446655440040',
              monthlyRent: 1600,
              availableFrom: '2026-03-01',
              updatedAt: '2026-01-18T14:00:00.000Z',
            },
          ],
        },
        404: {
          description: 'Listing not found',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Listing not found',
              statusCode: 404,
              code: 'NOT_FOUND',
            },
          ],
        },
      },
    },
    handler: ListingController.updateListing,
  });

  // DELETE /api/v1/listings/:id - Delete listing (protected)
  app.delete('/:id', {
    preHandler: authMiddleware,
    schema: {
      description: 'Delete a listing',
      tags: ['Listings'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: 'Listing deleted',
          type: 'object',
          additionalProperties: true,
          examples: [{ message: 'Listing deleted successfully' }],
        },
        404: {
          description: 'Listing not found',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Listing not found',
              statusCode: 404,
              code: 'NOT_FOUND',
            },
          ],
        },
      },
    },
    handler: ListingController.deleteListing,
  });

  // POST /api/v1/listings/:id/publish - Publish listing (protected)
  app.post('/:id/publish', {
    preHandler: authMiddleware,
    schema: {
      description: 'Publish a listing (change status to ACTIVE)',
      tags: ['Listings'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: 'Listing published',
          type: 'object',
          additionalProperties: true,
          examples: [
            {
              id: '550e8400-e29b-41d4-a716-446655440040',
              status: 'ACTIVE',
              publishedAt: '2026-01-18T12:00:00.000Z',
            },
          ],
        },
        400: {
          description: 'Cannot publish listing',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Listing is already active',
              statusCode: 400,
              code: 'BAD_REQUEST',
            },
          ],
        },
      },
    },
    handler: ListingController.publishListing,
  });

  // POST /api/v1/listings/:id/pause - Pause listing (protected)
  app.post('/:id/pause', {
    preHandler: authMiddleware,
    schema: {
      description: 'Pause a listing (change status to PAUSED)',
      tags: ['Listings'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: 'Listing paused',
          type: 'object',
          additionalProperties: true,
          examples: [
            {
              id: '550e8400-e29b-41d4-a716-446655440040',
              status: 'PAUSED',
              pausedAt: '2026-01-18T12:00:00.000Z',
            },
          ],
        },
        400: {
          description: 'Cannot pause listing',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Listing must be active to pause',
              statusCode: 400,
              code: 'BAD_REQUEST',
            },
          ],
        },
      },
    },
    handler: ListingController.pauseListing,
  });
}
