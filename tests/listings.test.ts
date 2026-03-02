import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db/client.js';

describe('Listing CRUD API', () => {
  let app: FastifyInstance;
  let ownerToken: string;
  let _ownerUserId: string;
  let _ownerProfileId: string;
  let propertyId: string;
  let listingId: string;

  const testOwner = {
    email: 'owner-listing@example.com',
    password: 'SecurePass123!',
    phone: '+34611111111',
    role: 'OWNER',
  };

  const validProperty = {
    address: {
      street: 'Calle Test',
      number: '123',
      city: 'Madrid',
      postalCode: '28001',
      province: 'Madrid',
      country: 'Spain',
    },
    propertyType: 'APARTMENT',
    totalArea: 85,
    roomCount: 3,
  };

  const validListing = {
    title: 'Beautiful apartment in Madrid',
    description: 'A spacious 3-bedroom apartment in the heart of Madrid.',
    monthlyRent: 1200,
    depositAmount: 2400,
    utilitiesIncluded: false,
    minLeaseTermMonths: 12,
    maxLeaseTermMonths: 24,
    availableFrom: '2024-02-01',
  };

  beforeAll(async () => {
    console.log('🧪 Setting up listing test environment...');
    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    console.log('✅ Listing tests completed, cleaning up...');
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up database (comprehensive order)
    await prisma.payment.deleteMany();
    await prisma.depositRecord.deleteMany();
    await prisma.commissionRecord.deleteMany();
    await prisma.keyHandover.deleteMany();
    await prisma.leaseEvent.deleteMany();
    await prisma.leaseContract.deleteMany();
    await prisma.tenantScoring.deleteMany();
    await prisma.applicationDocument.deleteMany();
    await prisma.application.deleteMany();
    await prisma.viewingSlot.deleteMany();
    await prisma.listing.deleteMany();
    await prisma.propertyPhoto.deleteMany();
    await prisma.propertyDocument.deleteMany();
    await prisma.property.deleteMany();
    await prisma.document.deleteMany();
    await prisma.tenantProfile.deleteMany();
    await prisma.ownerProfile.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.user.deleteMany();

    // Use unique email with timestamp to avoid conflicts across test runs
    const timestamp = Date.now();

    // Create owner user
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        ...testOwner,
        email: `owner-listing-${timestamp}@test.com`,
        phone: `+3461${timestamp.toString().slice(-7)}`,
      },
    });

    if (registerResponse.statusCode !== 201) {
      throw new Error(`Failed to register owner: ${registerResponse.body}`);
    }

    const registerBody = JSON.parse(registerResponse.body);
    ownerToken = registerBody.token;
    _ownerUserId = registerBody.user.id;

    // Create owner profile
    const profileResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/profiles/owner',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        firstName: 'Test',
        lastName: 'Owner',
        documentType: 'DNI',
        documentNumber: '12345678A',
      },
    });

    if (profileResponse.statusCode !== 201) {
      console.log('Profile creation failed:', profileResponse.statusCode, profileResponse.body);
    }

    const profileBody = JSON.parse(profileResponse.body);
    _ownerProfileId = profileBody.id;

    // Create property
    const propertyResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/properties',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: validProperty,
    });

    const propertyBody = JSON.parse(propertyResponse.body);
    propertyId = propertyBody.id;
  });

  describe('POST /api/v1/listings', () => {
    it('should create a new listing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/listings',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          ...validListing,
          propertyId,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);

      expect(body).toHaveProperty('id');
      expect(body.title).toBe(validListing.title);
      expect(body.description).toBe(validListing.description);
      expect(body.status).toBe('DRAFT');
      expect(body.propertyId).toBe(propertyId);
      expect(parseFloat(body.monthlyRent)).toBe(validListing.monthlyRent);

      listingId = body.id;
    });

    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/listings',
        payload: {
          ...validListing,
          propertyId,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 for invalid data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/listings',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          propertyId,
          title: '', // Empty title
          monthlyRent: -100, // Negative rent
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 for non-existent property', async () => {
      const fakePropertyId = '00000000-0000-0000-0000-000000000000';

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/listings',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          ...validListing,
          propertyId: fakePropertyId,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 when creating listing for another owner property', async () => {
      // Create another owner
      const otherOwnerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'other-owner@example.com',
          password: 'SecurePass123!',
          phone: '+34622222222',
          role: 'OWNER',
        },
      });

      const otherOwnerBody = JSON.parse(otherOwnerResponse.body);
      const otherOwnerToken = otherOwnerBody.token;

      // Try to create listing for first owner's property
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/listings',
        headers: { authorization: `Bearer ${otherOwnerToken}` },
        payload: {
          ...validListing,
          propertyId,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /api/v1/listings', () => {
    beforeEach(async () => {
      // Create a listing
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/listings',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          ...validListing,
          propertyId,
        },
      });
      const body = JSON.parse(response.body);
      listingId = body.id;
    });

    it('should return owner listings', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/listings',
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
      expect(body[0]).toHaveProperty('id');
      expect(body[0]).toHaveProperty('title');
    });

    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/listings',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/listings/public', () => {
    beforeEach(async () => {
      // Create and publish a listing
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/listings',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          ...validListing,
          propertyId,
        },
      });
      const createBody = JSON.parse(createResponse.body);
      listingId = createBody.id;

      // Publish the listing
      await app.inject({
        method: 'POST',
        url: `/api/v1/listings/${listingId}/publish`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });
    });

    it('should return active listings without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/listings/public',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
      expect(body[0].status).toBe('ACTIVE');
    });
  });

  describe('GET /api/v1/listings/:id', () => {
    beforeEach(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/listings',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          ...validListing,
          propertyId,
        },
      });
      const body = JSON.parse(response.body);
      listingId = body.id;
    });

    it('should return listing by id', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/listings/${listingId}`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.id).toBe(listingId);
      expect(body.title).toBe(validListing.title);
      expect(body).toHaveProperty('property');
    });

    it('should return 404 for non-existent listing', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/listings/${fakeId}`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/listings/${listingId}`,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('PATCH /api/v1/listings/:id', () => {
    beforeEach(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/listings',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          ...validListing,
          propertyId,
        },
      });
      const body = JSON.parse(response.body);
      listingId = body.id;
    });

    it('should update listing', async () => {
      const updateData = {
        title: 'Updated Title',
        monthlyRent: 1500,
      };

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/listings/${listingId}`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.title).toBe(updateData.title);
      expect(parseFloat(body.monthlyRent)).toBe(updateData.monthlyRent);
    });

    it('should return 404 for non-existent listing', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/listings/${fakeId}`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { title: 'Updated' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 when updating other owner listing', async () => {
      // Create another owner
      const otherOwnerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'other-owner2@example.com',
          password: 'SecurePass123!',
          phone: '+34633333333',
          role: 'OWNER',
        },
      });

      const otherOwnerBody = JSON.parse(otherOwnerResponse.body);
      const otherOwnerToken = otherOwnerBody.token;

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/listings/${listingId}`,
        headers: { authorization: `Bearer ${otherOwnerToken}` },
        payload: { title: 'Hacked' },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('DELETE /api/v1/listings/:id', () => {
    beforeEach(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/listings',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          ...validListing,
          propertyId,
        },
      });
      const body = JSON.parse(response.body);
      listingId = body.id;
    });

    it('should delete listing', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/listings/${listingId}`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(200);

      // Verify deletion
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/listings/${listingId}`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(getResponse.statusCode).toBe(404);
    });

    it('should return 404 for non-existent listing', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/listings/${fakeId}`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/v1/listings/:id/publish', () => {
    beforeEach(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/listings',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          ...validListing,
          propertyId,
        },
      });
      const body = JSON.parse(response.body);
      listingId = body.id;
    });

    it('should publish listing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/listings/${listingId}/publish`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.status).toBe('ACTIVE');
      expect(body.publishedAt).toBeDefined();
    });

    it('should return 400 if listing already active', async () => {
      // First publish
      await app.inject({
        method: 'POST',
        url: `/api/v1/listings/${listingId}/publish`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      // Try to publish again
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/listings/${listingId}/publish`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/listings/:id/pause', () => {
    beforeEach(async () => {
      // Create and publish listing
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/listings',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          ...validListing,
          propertyId,
        },
      });
      const createBody = JSON.parse(createResponse.body);
      listingId = createBody.id;

      await app.inject({
        method: 'POST',
        url: `/api/v1/listings/${listingId}/publish`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });
    });

    it('should pause active listing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/listings/${listingId}/pause`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.status).toBe('PAUSED');
    });

    it('should return 400 if listing not active', async () => {
      // Pause first
      await app.inject({
        method: 'POST',
        url: `/api/v1/listings/${listingId}/pause`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      // Try to pause again
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/listings/${listingId}/pause`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
