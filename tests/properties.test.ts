import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db/client.js';

describe('Property CRUD API', () => {
  let app: FastifyInstance;
  let ownerToken: string;
  let _ownerId: string;
  let _ownerProfileId: string;
  let tenantToken: string;
  let propertyId: string;

  beforeAll(async () => {
    console.log('🧪 Setting up property test environment...');
    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    console.log('✅ Property tests completed, cleaning up...');
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up database
    await prisma.propertyPhoto.deleteMany({});
    await prisma.property.deleteMany({});
    await prisma.tenantProfile.deleteMany({});
    await prisma.ownerProfile.deleteMany({});
    await prisma.userRole.deleteMany({});
    await prisma.user.deleteMany({});

    // Create owner user
    const ownerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'owner@example.com',
        password: 'SecurePass123!',
        phone: '+34612345678',
        role: 'OWNER',
      },
    });

    const ownerBody = JSON.parse(ownerResponse.body);
    ownerToken = ownerBody.token;
    _ownerId = ownerBody.user.id;

    // Create owner profile
    const ownerProfileResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/profiles/owner',
      headers: {
        authorization: `Bearer ${ownerToken}`,
      },
      payload: {
        firstName: 'John',
        lastName: 'Owner',
        documentType: 'DNI',
        documentNumber: '12345678A',
        isCompany: false,
      },
    });

    const ownerProfileBody = JSON.parse(ownerProfileResponse.body);
    _ownerProfileId = ownerProfileBody.id;

    // Create tenant user for permission testing
    const tenantResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'tenant@example.com',
        password: 'SecurePass123!',
        phone: '+34698765432',
        role: 'TENANT',
      },
    });

    const tenantBody = JSON.parse(tenantResponse.body);
    tenantToken = tenantBody.token;
  });

  describe('POST /api/v1/properties', () => {
    it('should create a new property for owner', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/properties',
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
        payload: {
          address: {
            street: 'Calle Mayor',
            number: '10',
            city: 'Madrid',
            postalCode: '28013',
            province: 'Madrid',
            country: 'Spain',
          },
          propertyType: 'APARTMENT',
          totalArea: 85.5,
          livingArea: 75.0,
          roomCount: 3,
          floor: 2,
          totalFloors: 5,
          yearBuilt: 2010,
          repairQuality: 'GOOD',
          furnished: 'NONE',
          hasAirConditioning: true,
          heatingType: 'CENTRAL',
          hotWaterType: 'CENTRAL',
          kitchenType: 'SEPARATE',
          amenities: ['ELEVATOR', 'PARKING', 'STORAGE'],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);

      expect(body).toHaveProperty('id');
      expect(body.ownerId).toBe(_ownerProfileId);
      expect(body.propertyType).toBe('APARTMENT');
      expect(body.address).toEqual({
        street: 'Calle Mayor',
        number: '10',
        city: 'Madrid',
        postalCode: '28013',
        province: 'Madrid',
        country: 'Spain',
      });
      expect(parseFloat(body.totalArea)).toBe(85.5);
      expect(body.roomCount).toBe(3);
      expect(body.verificationStatus).toBe('PENDING');

      propertyId = body.id;
    });

    it('should return 403 if tenant tries to create property', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/properties',
        headers: {
          authorization: `Bearer ${tenantToken}`,
        },
        payload: {
          address: {
            street: 'Calle Mayor',
            number: '10',
            city: 'Madrid',
            postalCode: '28013',
            province: 'Madrid',
            country: 'Spain',
          },
          propertyType: 'APARTMENT',
          totalArea: 85.5,
          roomCount: 3,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/properties',
        payload: {
          propertyType: 'APARTMENT',
          totalArea: 85.5,
          roomCount: 3,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 with invalid data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/properties',
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
        payload: {
          propertyType: 'INVALID_TYPE',
          totalArea: -10, // Invalid negative area
          roomCount: 'three', // Invalid type
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/properties', () => {
    beforeEach(async () => {
      // Create test properties
      await prisma.property.create({
        data: {
          ownerId: _ownerProfileId,
          address: {
            street: 'Calle Mayor',
            number: '10',
            city: 'Madrid',
            postalCode: '28013',
          },
          propertyType: 'APARTMENT',
          totalArea: 85.5,
          roomCount: 3,
          verificationStatus: 'PENDING',
        },
      });

      await prisma.property.create({
        data: {
          ownerId: _ownerProfileId,
          address: {
            street: 'Calle Minor',
            number: '5',
            city: 'Barcelona',
            postalCode: '08001',
          },
          propertyType: 'HOUSE',
          totalArea: 150.0,
          roomCount: 5,
          verificationStatus: 'VERIFIED',
        },
      });
    });

    it('should return all properties for owner', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/properties',
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(2);
      expect(body[0]).toHaveProperty('id');
      expect(body[0]).toHaveProperty('address');
      expect(body[0]).toHaveProperty('propertyType');
    });

    it('should return empty array for owner with no properties', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/properties',
        headers: {
          authorization: `Bearer ${tenantToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(0);
    });

    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/properties',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/properties/:id', () => {
    beforeEach(async () => {
      const property = await prisma.property.create({
        data: {
          ownerId: _ownerProfileId,
          address: {
            street: 'Calle Mayor',
            number: '10',
            city: 'Madrid',
            postalCode: '28013',
          },
          propertyType: 'APARTMENT',
          totalArea: 85.5,
          roomCount: 3,
          verificationStatus: 'PENDING',
        },
      });
      propertyId = property.id;
    });

    it('should return property details for owner', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/properties/${propertyId}`,
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.id).toBe(propertyId);
      expect(body.ownerId).toBe(_ownerProfileId);
      expect(body.propertyType).toBe('APARTMENT');
      expect(body.address).toHaveProperty('street', 'Calle Mayor');
    });

    it('should return 404 for non-existent property', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/properties/${fakeId}`,
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 when accessing other owner property', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/properties/${propertyId}`,
        headers: {
          authorization: `Bearer ${tenantToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/properties/${propertyId}`,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('PATCH /api/v1/properties/:id', () => {
    beforeEach(async () => {
      const property = await prisma.property.create({
        data: {
          ownerId: _ownerProfileId,
          address: {
            street: 'Calle Mayor',
            number: '10',
            city: 'Madrid',
            postalCode: '28013',
          },
          propertyType: 'APARTMENT',
          totalArea: 85.5,
          roomCount: 3,
          verificationStatus: 'PENDING',
        },
      });
      propertyId = property.id;
    });

    it('should update property details', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/properties/${propertyId}`,
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
        payload: {
          roomCount: 4,
          hasAirConditioning: true,
          amenities: ['ELEVATOR', 'PARKING'],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.id).toBe(propertyId);
      expect(body.roomCount).toBe(4);
      expect(body.hasAirConditioning).toBe(true);
      expect(body.amenities).toEqual(['ELEVATOR', 'PARKING']);
    });

    it('should return 404 for non-existent property', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/properties/${fakeId}`,
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
        payload: {
          roomCount: 4,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 when updating other owner property', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/properties/${propertyId}`,
        headers: {
          authorization: `Bearer ${tenantToken}`,
        },
        payload: {
          roomCount: 4,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/properties/${propertyId}`,
        payload: {
          roomCount: 4,
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/v1/properties/:id', () => {
    beforeEach(async () => {
      const property = await prisma.property.create({
        data: {
          ownerId: _ownerProfileId,
          address: {
            street: 'Calle Mayor',
            number: '10',
            city: 'Madrid',
            postalCode: '28013',
          },
          propertyType: 'APARTMENT',
          totalArea: 85.5,
          roomCount: 3,
          verificationStatus: 'PENDING',
        },
      });
      propertyId = property.id;
    });

    it('should delete property', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/properties/${propertyId}`,
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('deleted');

      // Verify property is deleted
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
      });
      expect(property).toBeNull();
    });

    it('should return 404 for non-existent property', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/properties/${fakeId}`,
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 when deleting other owner property', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/properties/${propertyId}`,
        headers: {
          authorization: `Bearer ${tenantToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/properties/${propertyId}`,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/properties/:id/photos', () => {
    beforeEach(async () => {
      const property = await prisma.property.create({
        data: {
          ownerId: _ownerProfileId,
          address: {
            street: 'Calle Mayor',
            number: '10',
            city: 'Madrid',
            postalCode: '28013',
          },
          propertyType: 'APARTMENT',
          totalArea: 85.5,
          roomCount: 3,
          verificationStatus: 'PENDING',
        },
      });
      propertyId = property.id;
    });

    it('should upload photo to property', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/properties/${propertyId}/photos`,
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
        payload: {
          url: 'https://example.com/photo1.jpg',
          sortOrder: 1,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);

      expect(body).toHaveProperty('id');
      expect(body.propertyId).toBe(propertyId);
      expect(body.url).toBe('https://example.com/photo1.jpg');
      expect(body.sortOrder).toBe(1);
    });

    it('should return 404 for non-existent property', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/properties/${fakeId}/photos`,
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
        payload: {
          url: 'https://example.com/photo1.jpg',
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 when uploading to other owner property', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/properties/${propertyId}/photos`,
        headers: {
          authorization: `Bearer ${tenantToken}`,
        },
        payload: {
          url: 'https://example.com/photo1.jpg',
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('DELETE /api/v1/properties/:id/photos/:photoId', () => {
    let photoId: string;

    beforeEach(async () => {
      const property = await prisma.property.create({
        data: {
          ownerId: _ownerProfileId,
          address: {
            street: 'Calle Mayor',
            number: '10',
            city: 'Madrid',
            postalCode: '28013',
          },
          propertyType: 'APARTMENT',
          totalArea: 85.5,
          roomCount: 3,
          verificationStatus: 'PENDING',
        },
      });
      propertyId = property.id;

      const photo = await prisma.propertyPhoto.create({
        data: {
          propertyId: propertyId,
          url: 'https://example.com/photo1.jpg',
          sortOrder: 1,
        },
      });
      photoId = photo.id;
    });

    it('should delete property photo', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/properties/${propertyId}/photos/${photoId}`,
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('deleted');

      // Verify photo is deleted
      const photo = await prisma.propertyPhoto.findUnique({
        where: { id: photoId },
      });
      expect(photo).toBeNull();
    });

    it('should return 404 for non-existent photo', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/properties/${propertyId}/photos/${fakeId}`,
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 when deleting photo from other owner property', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/properties/${propertyId}/photos/${photoId}`,
        headers: {
          authorization: `Bearer ${tenantToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
