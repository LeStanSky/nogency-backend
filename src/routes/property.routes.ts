import { FastifyInstance } from 'fastify';
import { PropertyController } from '../controllers/property.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { errorResponseSchema } from '../schemas/error.schema.js';

/**
 * Property routes
 * Prefix: /api/v1/properties
 */
export default async function propertyRoutes(app: FastifyInstance) {
  // POST /api/v1/properties - Create a new property (protected)
  app.post('/', {
    preHandler: authMiddleware,
    schema: {
      description: 'Create a new property',
      tags: ['Properties'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['address', 'propertyType', 'totalArea', 'roomCount'],
        properties: {
          address: {
            type: 'object',
            required: ['street', 'city', 'postalCode'],
            properties: {
              street: { type: 'string', description: 'Street name' },
              number: { type: 'string', description: 'Street number' },
              city: { type: 'string', description: 'City' },
              postalCode: { type: 'string', description: 'Postal code' },
              province: { type: 'string', description: 'Province' },
              country: { type: 'string', description: 'Country' },
            },
          },
          propertyType: {
            type: 'string',
            enum: ['APARTMENT', 'HOUSE', 'STUDIO', 'ROOM'],
            description: 'Type of property',
          },
          totalArea: { type: 'number', minimum: 0, description: 'Total area in m²' },
          livingArea: { type: 'number', minimum: 0, description: 'Living area in m²' },
          roomCount: { type: 'integer', minimum: 1, description: 'Number of rooms' },
          floor: { type: 'integer', description: 'Floor number' },
          totalFloors: { type: 'integer', minimum: 1, description: 'Total floors in building' },
          yearBuilt: { type: 'integer', minimum: 1800, description: 'Year built' },
          repairQuality: { type: 'string', enum: ['NEW', 'GOOD', 'OLD'] },
          repairYear: { type: 'integer', minimum: 1800 },
          furnished: { type: 'string', enum: ['NONE', 'PARTLY', 'FULLY'] },
          balconyCount: { type: 'integer', minimum: 0 },
          terraceArea: { type: 'number', minimum: 0 },
          hasAirConditioning: { type: 'boolean' },
          airConditioningDetails: { type: 'string' },
          heatingType: { type: 'string', enum: ['GAS', 'ELECTRIC', 'CENTRAL', 'NONE'] },
          hotWaterType: { type: 'string', enum: ['GAS', 'ELECTRIC', 'CENTRAL'] },
          kitchenType: { type: 'string', enum: ['SEPARATE', 'OPEN'] },
          kitchenDetails: { type: 'string' },
          windowsDirection: { type: 'string' },
          amenities: { type: 'array', items: { type: 'string' } },
          cadastralNumber: { type: 'string' },
        },
        examples: [
          {
            address: {
              street: 'Calle Gran Via',
              number: '42',
              city: 'Madrid',
              postalCode: '28013',
              province: 'Madrid',
              country: 'Spain',
            },
            propertyType: 'APARTMENT',
            totalArea: 85,
            livingArea: 70,
            roomCount: 3,
            floor: 4,
            totalFloors: 6,
            yearBuilt: 2010,
            repairQuality: 'GOOD',
            furnished: 'FULLY',
            balconyCount: 1,
            hasAirConditioning: true,
            heatingType: 'CENTRAL',
            hotWaterType: 'GAS',
            kitchenType: 'OPEN',
            amenities: ['elevator', 'parking', 'storage', 'gym'],
          },
        ],
      },
      response: {
        201: {
          description: 'Property created',
          type: 'object',
          additionalProperties: true,
          examples: [
            {
              id: '550e8400-e29b-41d4-a716-446655440020',
              ownerId: '550e8400-e29b-41d4-a716-446655440001',
              address: {
                street: 'Calle Gran Via',
                number: '42',
                city: 'Madrid',
                postalCode: '28013',
              },
              propertyType: 'APARTMENT',
              totalArea: 85,
              roomCount: 3,
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
              details: { fields: ['roomCount: Must be at least 1'] },
            },
          ],
        },
        403: {
          description: 'User is not an owner',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Only owners can create properties',
              statusCode: 403,
              code: 'FORBIDDEN',
            },
          ],
        },
      },
    },
    handler: PropertyController.createProperty,
  });

  // GET /api/v1/properties - Get all properties for current owner (protected)
  app.get('/', {
    preHandler: authMiddleware,
    schema: {
      description: 'Get all properties for the current owner',
      tags: ['Properties'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'List of owner properties',
          type: 'array',
          items: { type: 'object', additionalProperties: true },
          examples: [
            [
              {
                id: '550e8400-e29b-41d4-a716-446655440020',
                address: { street: 'Calle Gran Via', number: '42', city: 'Madrid' },
                propertyType: 'APARTMENT',
                totalArea: 85,
                roomCount: 3,
                status: 'ACTIVE',
              },
              {
                id: '550e8400-e29b-41d4-a716-446655440021',
                address: { street: 'Paseo de Gracia', number: '15', city: 'Barcelona' },
                propertyType: 'STUDIO',
                totalArea: 45,
                roomCount: 1,
                status: 'ACTIVE',
              },
            ],
          ],
        },
      },
    },
    handler: PropertyController.getProperties,
  });

  // GET /api/v1/properties/:id - Get property by ID (protected)
  app.get('/:id', {
    preHandler: authMiddleware,
    schema: {
      description: 'Get property details by ID',
      tags: ['Properties'],
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
          description: 'Property details',
          type: 'object',
          additionalProperties: true,
          examples: [
            {
              id: '550e8400-e29b-41d4-a716-446655440020',
              ownerId: '550e8400-e29b-41d4-a716-446655440001',
              address: {
                street: 'Calle Gran Via',
                number: '42',
                city: 'Madrid',
                postalCode: '28013',
                province: 'Madrid',
                country: 'Spain',
              },
              propertyType: 'APARTMENT',
              totalArea: 85,
              livingArea: 70,
              roomCount: 3,
              floor: 4,
              totalFloors: 6,
              yearBuilt: 2010,
              photos: [
                {
                  id: '550e8400-e29b-41d4-a716-446655440030',
                  url: 'https://supabase.storage/property-photos/living-room.jpg',
                  description: 'Living room',
                },
              ],
              createdAt: '2026-01-18T12:00:00.000Z',
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
    handler: PropertyController.getPropertyById,
  });

  // PATCH /api/v1/properties/:id - Update property (protected)
  app.patch('/:id', {
    preHandler: authMiddleware,
    schema: {
      description: 'Update property details',
      tags: ['Properties'],
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
          address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              number: { type: 'string' },
              city: { type: 'string' },
              postalCode: { type: 'string' },
              province: { type: 'string' },
              country: { type: 'string' },
            },
          },
          propertyType: { type: 'string', enum: ['APARTMENT', 'HOUSE', 'STUDIO', 'ROOM'] },
          totalArea: { type: 'number', minimum: 0 },
          livingArea: { type: 'number', minimum: 0 },
          roomCount: { type: 'integer', minimum: 1 },
          floor: { type: 'integer' },
          totalFloors: { type: 'integer', minimum: 1 },
          yearBuilt: { type: 'integer', minimum: 1800 },
          repairQuality: { type: 'string', enum: ['NEW', 'GOOD', 'OLD'] },
          repairYear: { type: 'integer', minimum: 1800 },
          furnished: { type: 'string', enum: ['NONE', 'PARTLY', 'FULLY'] },
          balconyCount: { type: 'integer', minimum: 0 },
          terraceArea: { type: 'number', minimum: 0 },
          hasAirConditioning: { type: 'boolean' },
          airConditioningDetails: { type: 'string' },
          heatingType: { type: 'string', enum: ['GAS', 'ELECTRIC', 'CENTRAL', 'NONE'] },
          hotWaterType: { type: 'string', enum: ['GAS', 'ELECTRIC', 'CENTRAL'] },
          kitchenType: { type: 'string', enum: ['SEPARATE', 'OPEN'] },
          kitchenDetails: { type: 'string' },
          windowsDirection: { type: 'string' },
          amenities: { type: 'array', items: { type: 'string' } },
          cadastralNumber: { type: 'string' },
        },
        examples: [
          {
            roomCount: 4,
            furnished: 'FULLY',
            amenities: ['elevator', 'parking', 'storage', 'gym', 'pool'],
          },
        ],
      },
      response: {
        200: {
          description: 'Property updated',
          type: 'object',
          additionalProperties: true,
          examples: [
            {
              id: '550e8400-e29b-41d4-a716-446655440020',
              roomCount: 4,
              furnished: 'FULLY',
              updatedAt: '2026-01-18T14:00:00.000Z',
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
    handler: PropertyController.updateProperty,
  });

  // DELETE /api/v1/properties/:id - Delete property (protected)
  app.delete('/:id', {
    preHandler: authMiddleware,
    schema: {
      description: 'Delete a property',
      tags: ['Properties'],
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
          description: 'Property deleted',
          type: 'object',
          additionalProperties: true,
          examples: [{ message: 'Property deleted successfully' }],
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
    handler: PropertyController.deleteProperty,
  });

  // POST /api/v1/properties/:id/photos - Add photo to property (protected)
  app.post('/:id/photos', {
    preHandler: authMiddleware,
    schema: {
      description: 'Upload a photo for a property. Send as multipart/form-data with file field.',
      tags: ['Properties'],
      security: [{ bearerAuth: [] }],
      consumes: ['multipart/form-data'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        201: {
          description: 'Photo uploaded',
          type: 'object',
          additionalProperties: true,
          examples: [
            {
              id: '550e8400-e29b-41d4-a716-446655440030',
              propertyId: '550e8400-e29b-41d4-a716-446655440020',
              url: 'https://supabase.storage/property-photos/living-room.jpg',
              description: 'Living room',
              isPrimary: false,
              createdAt: '2026-01-18T12:00:00.000Z',
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
    handler: PropertyController.addPhoto,
  });

  // DELETE /api/v1/properties/:id/photos/:photoId - Delete photo from property (protected)
  app.delete('/:id/photos/:photoId', {
    preHandler: authMiddleware,
    schema: {
      description: 'Delete a photo from a property',
      tags: ['Properties'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id', 'photoId'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          photoId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: 'Photo deleted',
          type: 'object',
          additionalProperties: true,
          examples: [{ message: 'Photo deleted successfully' }],
        },
        404: {
          description: 'Photo not found',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Photo not found',
              statusCode: 404,
              code: 'NOT_FOUND',
            },
          ],
        },
      },
    },
    handler: PropertyController.deletePhoto,
  });
}
