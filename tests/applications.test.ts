import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db/client.js';

describe('Application API', () => {
  let app: FastifyInstance;

  // Owner data
  let ownerToken: string;
  let _ownerUserId: string;
  let _ownerProfileId: string;
  let propertyId: string;
  let listingId: string;

  // Tenant data
  let tenantToken: string;
  let _tenantUserId: string;
  let _tenantProfileId: string;

  // Application data
  let applicationId: string;

  const testOwner = {
    email: 'owner-app@example.com',
    password: 'SecurePass123!',
    phone: '+34611111111',
    role: 'OWNER',
  };

  const testTenant = {
    email: 'tenant-app@example.com',
    password: 'SecurePass123!',
    phone: '+34622222222',
    role: 'TENANT',
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
    availableFrom: '2026-02-01',
  };

  const validApplication = {
    message: 'I am interested in this property for myself and my partner.',
    proposedMoveInDate: '2026-03-01',
    proposedLeaseTermMonths: 12,
  };

  beforeAll(async () => {
    console.log('🧪 Setting up application test environment...');
    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    console.log('✅ Application tests completed, cleaning up...');
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

    // Use unique emails with timestamp to avoid conflicts across test runs
    const timestamp = Date.now();

    // Create owner user
    const ownerRegisterResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        ...testOwner,
        email: `owner-app-${timestamp}@test.com`,
        phone: `+3461${timestamp.toString().slice(-7)}`,
      },
    });

    if (ownerRegisterResponse.statusCode !== 201) {
      throw new Error(`Failed to register owner: ${ownerRegisterResponse.body}`);
    }

    const ownerRegisterBody = JSON.parse(ownerRegisterResponse.body);
    ownerToken = ownerRegisterBody.token;
    _ownerUserId = ownerRegisterBody.user.id;

    // Create owner profile
    const ownerProfileResponse = await app.inject({
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

    const ownerProfileBody = JSON.parse(ownerProfileResponse.body);
    _ownerProfileId = ownerProfileBody.id;

    // Create property
    const propertyResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/properties',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: validProperty,
    });

    const propertyBody = JSON.parse(propertyResponse.body);
    propertyId = propertyBody.id;

    // Create listing and publish it
    const listingResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/listings',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        ...validListing,
        propertyId,
      },
    });

    const listingBody = JSON.parse(listingResponse.body);
    listingId = listingBody.id;

    // Publish the listing
    await app.inject({
      method: 'POST',
      url: `/api/v1/listings/${listingId}/publish`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    // Create tenant user
    const tenantRegisterResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        ...testTenant,
        email: `tenant-app-${timestamp}@test.com`,
        phone: `+3462${timestamp.toString().slice(-7)}`,
      },
    });

    if (tenantRegisterResponse.statusCode !== 201) {
      throw new Error(`Failed to register tenant: ${tenantRegisterResponse.body}`);
    }

    const tenantRegisterBody = JSON.parse(tenantRegisterResponse.body);
    tenantToken = tenantRegisterBody.token;
    _tenantUserId = tenantRegisterBody.user.id;

    // Create tenant profile
    const tenantProfileResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/profiles/tenant',
      headers: { authorization: `Bearer ${tenantToken}` },
      payload: {
        firstName: 'Test',
        lastName: 'Tenant',
        documentType: 'NIE',
        documentNumber: 'X1234567A',
        occupation: 'EMPLOYED',
        employerName: 'Tech Company',
        monthlyIncome: 3500,
      },
    });

    const tenantProfileBody = JSON.parse(tenantProfileResponse.body);
    _tenantProfileId = tenantProfileBody.id;
  });

  // ==========================================
  // POST /api/v1/applications - Submit application
  // ==========================================

  describe('POST /api/v1/applications', () => {
    it('should create application as tenant', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/applications',
        headers: { authorization: `Bearer ${tenantToken}` },
        payload: {
          listingId,
          ...validApplication,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);

      expect(body).toHaveProperty('id');
      expect(body.status).toBe('PENDING');
      expect(body.listingId).toBe(listingId);
      expect(body.message).toBe(validApplication.message);

      applicationId = body.id;
    });

    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/applications',
        payload: {
          listingId,
          ...validApplication,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 when owner tries to apply', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/applications',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          listingId,
          ...validApplication,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 404 for non-existent listing', async () => {
      const fakeListingId = '00000000-0000-0000-0000-000000000000';

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/applications',
        headers: { authorization: `Bearer ${tenantToken}` },
        payload: {
          listingId: fakeListingId,
          ...validApplication,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 409 for duplicate application', async () => {
      // First application
      await app.inject({
        method: 'POST',
        url: '/api/v1/applications',
        headers: { authorization: `Bearer ${tenantToken}` },
        payload: {
          listingId,
          ...validApplication,
        },
      });

      // Duplicate attempt
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/applications',
        headers: { authorization: `Bearer ${tenantToken}` },
        payload: {
          listingId,
          ...validApplication,
        },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should return 400 for invalid listing ID', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/applications',
        headers: { authorization: `Bearer ${tenantToken}` },
        payload: {
          listingId: 'invalid-uuid',
          ...validApplication,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when listing is not active', async () => {
      // Pause the listing
      await app.inject({
        method: 'POST',
        url: `/api/v1/listings/${listingId}/pause`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/applications',
        headers: { authorization: `Bearer ${tenantToken}` },
        payload: {
          listingId,
          ...validApplication,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ==========================================
  // GET /api/v1/applications - List applications
  // ==========================================

  describe('GET /api/v1/applications', () => {
    beforeEach(async () => {
      // Create an application
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/applications',
        headers: { authorization: `Bearer ${tenantToken}` },
        payload: {
          listingId,
          ...validApplication,
        },
      });
      const body = JSON.parse(response.body);
      applicationId = body.id;
    });

    it('should return tenant applications', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/applications',
        headers: { authorization: `Bearer ${tenantToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body).toHaveProperty('applications');
      expect(Array.isArray(body.applications)).toBe(true);
      expect(body.applications.length).toBeGreaterThan(0);
      expect(body.applications[0]).toHaveProperty('id');
      expect(body.applications[0]).toHaveProperty('listing');
    });

    it('should return owner listing applications', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/applications',
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body).toHaveProperty('applications');
      expect(body.applications.length).toBeGreaterThan(0);
      expect(body.applications[0]).toHaveProperty('tenant');
    });

    it('should filter by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/applications?status=PENDING',
        headers: { authorization: `Bearer ${tenantToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      body.applications.forEach((app: { status: string }) => {
        expect(app.status).toBe('PENDING');
      });
    });

    it('should filter by listingId for owner', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/applications?listingId=${listingId}`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      body.applications.forEach((app: { listingId: string }) => {
        expect(app.listingId).toBe(listingId);
      });
    });

    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/applications',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==========================================
  // GET /api/v1/applications/:id - Get application details
  // ==========================================

  describe('GET /api/v1/applications/:id', () => {
    beforeEach(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/applications',
        headers: { authorization: `Bearer ${tenantToken}` },
        payload: {
          listingId,
          ...validApplication,
        },
      });
      const body = JSON.parse(response.body);
      applicationId = body.id;
    });

    it('should return application details for tenant', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/applications/${applicationId}`,
        headers: { authorization: `Bearer ${tenantToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.id).toBe(applicationId);
      expect(body).toHaveProperty('listing');
      expect(body).toHaveProperty('tenant');
      expect(body).toHaveProperty('status');
    });

    it('should return application details for owner', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/applications/${applicationId}`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.id).toBe(applicationId);
    });

    it('should return 404 for non-existent application', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/applications/${fakeId}`,
        headers: { authorization: `Bearer ${tenantToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 for unauthorized access', async () => {
      // Create another tenant
      const otherTenantResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'other-tenant@example.com',
          password: 'SecurePass123!',
          phone: '+34633333333',
          role: 'TENANT',
        },
      });
      const otherTenantBody = JSON.parse(otherTenantResponse.body);
      const otherTenantToken = otherTenantBody.token;

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/applications/${applicationId}`,
        headers: { authorization: `Bearer ${otherTenantToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  // ==========================================
  // PATCH /api/v1/applications/:id/status - Update status
  // ==========================================

  describe('PATCH /api/v1/applications/:id/status', () => {
    beforeEach(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/applications',
        headers: { authorization: `Bearer ${tenantToken}` },
        payload: {
          listingId,
          ...validApplication,
        },
      });
      const body = JSON.parse(response.body);
      applicationId = body.id;
    });

    it('should allow owner to update status to REVIEWING', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/applications/${applicationId}/status`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { status: 'REVIEWING' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.status).toBe('REVIEWING');
    });

    it('should allow owner to approve application', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/applications/${applicationId}/status`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { status: 'APPROVED' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.status).toBe('APPROVED');
    });

    it('should allow owner to reject with reason', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/applications/${applicationId}/status`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          status: 'REJECTED',
          rejectionReason: 'Income below required minimum',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.status).toBe('REJECTED');
      expect(body.rejectionReason).toBe('Income below required minimum');
    });

    it('should return 400 when rejecting without reason', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/applications/${applicationId}/status`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { status: 'REJECTED' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 403 when tenant tries to update status', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/applications/${applicationId}/status`,
        headers: { authorization: `Bearer ${tenantToken}` },
        payload: { status: 'APPROVED' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 404 for non-existent application', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/applications/${fakeId}/status`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { status: 'REVIEWING' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ==========================================
  // POST /api/v1/applications/:id/withdraw - Withdraw application
  // ==========================================

  describe('POST /api/v1/applications/:id/withdraw', () => {
    beforeEach(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/applications',
        headers: { authorization: `Bearer ${tenantToken}` },
        payload: {
          listingId,
          ...validApplication,
        },
      });
      const body = JSON.parse(response.body);
      applicationId = body.id;
    });

    it('should allow tenant to withdraw own application', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/applications/${applicationId}/withdraw`,
        headers: { authorization: `Bearer ${tenantToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.status).toBe('WITHDRAWN');
    });

    it('should return 403 when owner tries to withdraw', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/applications/${applicationId}/withdraw`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 400 when withdrawing already rejected application', async () => {
      // Reject the application first
      await app.inject({
        method: 'PATCH',
        url: `/api/v1/applications/${applicationId}/status`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          status: 'REJECTED',
          rejectionReason: 'Test rejection',
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/applications/${applicationId}/withdraw`,
        headers: { authorization: `Bearer ${tenantToken}` },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ==========================================
  // POST /api/v1/applications/:id/score - Calculate AI score
  // ==========================================

  describe('POST /api/v1/applications/:id/score', () => {
    beforeEach(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/applications',
        headers: { authorization: `Bearer ${tenantToken}` },
        payload: {
          listingId,
          ...validApplication,
        },
      });
      const body = JSON.parse(response.body);
      applicationId = body.id;
    });

    it('should calculate AI scoring for owner', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/applications/${applicationId}/score`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body).toHaveProperty('totalScore');
      expect(body).toHaveProperty('incomeScore');
      expect(body).toHaveProperty('employmentScore');
      expect(body).toHaveProperty('rentalHistoryScore');
      expect(body).toHaveProperty('verificationScore');
      expect(body).toHaveProperty('criteriaMatchScore');
      expect(body).toHaveProperty('riskLevel');
      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(body.riskLevel);

      expect(body.totalScore).toBeGreaterThanOrEqual(0);
      expect(body.totalScore).toBeLessThanOrEqual(100);
    });

    it('should return 403 when tenant tries to score', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/applications/${applicationId}/score`,
        headers: { authorization: `Bearer ${tenantToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 404 for non-existent application', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/applications/${fakeId}/score`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should update existing scoring when called again', async () => {
      // First scoring
      const firstResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/applications/${applicationId}/score`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });
      const firstBody = JSON.parse(firstResponse.body);

      // Second scoring
      const secondResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/applications/${applicationId}/score`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(secondResponse.statusCode).toBe(200);
      const secondBody = JSON.parse(secondResponse.body);

      expect(secondBody.totalScore).toBe(firstBody.totalScore);
    });
  });

  // ==========================================
  // Scoring calculation tests
  // ==========================================

  describe('Scoring Calculations', () => {
    it('should give high income score for income >= 3x rent', async () => {
      // Tenant has 3500 income, rent is 1200 (ratio ~2.9x)
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/applications',
        headers: { authorization: `Bearer ${tenantToken}` },
        payload: {
          listingId,
          ...validApplication,
        },
      });
      applicationId = JSON.parse(createResponse.body).id;

      const scoreResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/applications/${applicationId}/score`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      const body = JSON.parse(scoreResponse.body);
      expect(body.incomeScore).toBeGreaterThanOrEqual(75);
    });

    it('should give high employment score for employed tenant', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/applications',
        headers: { authorization: `Bearer ${tenantToken}` },
        payload: {
          listingId,
          ...validApplication,
        },
      });
      applicationId = JSON.parse(createResponse.body).id;

      const scoreResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/applications/${applicationId}/score`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      const body = JSON.parse(scoreResponse.body);
      expect(body.employmentScore).toBeGreaterThanOrEqual(50);
    });
  });
});
