import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createApp } from '../src/app.js';
import { FastifyInstance } from 'fastify';
import { prisma } from '../src/db/client.js';

describe('Contract API', () => {
  let app: FastifyInstance;
  let _ownerUserId: string;
  let ownerProfileId: string;
  let ownerToken: string;
  let _tenantUserId: string;
  let tenantProfileId: string;
  let tenantToken: string;
  let propertyId: string;
  let listingId: string;
  let applicationId: string;

  beforeAll(async () => {
    console.log('🧪 Setting up test environment...');
    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    console.log('✅ Tests completed, cleaning up...');
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    console.log('🧪 Setting up contract test environment...');

    // Clean up in correct order
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

    // Use unique email with timestamp to avoid conflicts
    const timestamp = Date.now();
    const ownerEmail = `contract-owner-${timestamp}@test.com`;
    const tenantEmail = `contract-tenant-${timestamp}@test.com`;

    // Create owner user via API
    const ownerRegisterResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: ownerEmail,
        password: 'SecurePass123!',
        phone: `+3461111${timestamp.toString().slice(-4)}`,
        role: 'OWNER',
      },
    });

    if (ownerRegisterResponse.statusCode !== 201) {
      throw new Error(`Failed to register owner: ${ownerRegisterResponse.body}`);
    }

    const ownerRegisterBody = JSON.parse(ownerRegisterResponse.body);
    ownerToken = ownerRegisterBody.token;
    _ownerUserId = ownerRegisterBody.user?.id;

    // Create owner profile via API
    const ownerProfileResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/profiles/owner',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        firstName: 'Contract',
        lastName: 'Owner',
        documentType: 'DNI',
        documentNumber: '12345678A',
      },
    });

    const ownerProfileBody = JSON.parse(ownerProfileResponse.body);
    ownerProfileId = ownerProfileBody.id;

    // Create property via API
    const propertyResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/properties',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        address: {
          street: 'Calle Test',
          number: '123',
          city: 'Madrid',
          postalCode: '28001',
          province: 'Madrid',
          country: 'Spain',
        },
        propertyType: 'APARTMENT',
        totalArea: 75,
        roomCount: 3,
        furnished: 'FULLY',
      },
    });

    const propertyBody = JSON.parse(propertyResponse.body);
    propertyId = propertyBody.id;

    // Create listing via API
    const listingResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/listings',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        propertyId,
        title: 'Beautiful apartment for rent',
        description: 'A great apartment in the city center',
        monthlyRent: 1200,
        depositAmount: 2400,
        minLeaseTermMonths: 12,
        availableFrom: '2026-02-01',
      },
    });

    if (listingResponse.statusCode !== 201) {
      throw new Error(`Failed to create listing: ${listingResponse.body}`);
    }

    const listingBody = JSON.parse(listingResponse.body);
    listingId = listingBody.id;

    // Publish listing
    const publishResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/listings/${listingId}/publish`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    if (publishResponse.statusCode !== 200) {
      throw new Error(`Failed to publish listing: ${publishResponse.body}`);
    }

    // Create tenant user via API
    const tenantRegisterResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: tenantEmail,
        password: 'SecurePass123!',
        phone: `+3462222${timestamp.toString().slice(-4)}`,
        role: 'TENANT',
      },
    });

    if (tenantRegisterResponse.statusCode !== 201) {
      throw new Error(`Failed to register tenant: ${tenantRegisterResponse.body}`);
    }

    const tenantRegisterBody = JSON.parse(tenantRegisterResponse.body);
    tenantToken = tenantRegisterBody.token;
    _tenantUserId = tenantRegisterBody.user?.id;

    // Create tenant profile via API
    const tenantProfileResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/profiles/tenant',
      headers: { authorization: `Bearer ${tenantToken}` },
      payload: {
        firstName: 'Contract',
        lastName: 'Tenant',
        documentType: 'DNI',
        documentNumber: '98765432C',
        dateOfBirth: '1990-01-15',
        occupation: 'EMPLOYED',
        monthlyIncome: 4000,
      },
    });

    const tenantProfileBody = JSON.parse(tenantProfileResponse.body);
    tenantProfileId = tenantProfileBody.id;

    // Create application via API
    const applicationResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/applications',
      headers: { authorization: `Bearer ${tenantToken}` },
      payload: {
        listingId,
        message: 'I am very interested in this property',
        proposedMoveInDate: '2026-02-01',
        proposedLeaseTermMonths: 12,
      },
    });

    if (applicationResponse.statusCode !== 201) {
      throw new Error(`Failed to create application: ${applicationResponse.body}`);
    }

    const applicationBody = JSON.parse(applicationResponse.body);
    applicationId = applicationBody.id;

    // Approve application
    const approveResponse = await app.inject({
      method: 'PATCH',
      url: `/api/v1/applications/${applicationId}/status`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        status: 'APPROVED',
      },
    });

    if (approveResponse.statusCode !== 200) {
      throw new Error(`Failed to approve application: ${approveResponse.body}`);
    }
  });

  afterEach(async () => {
    console.log('✅ Contract tests completed, cleaning up...');
  });

  describe('POST /api/v1/contracts', () => {
    it('should create a contract from approved application as owner', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/contracts',
        headers: { Authorization: `Bearer ${ownerToken}` },
        payload: {
          applicationId,
          startDate: '2026-02-01',
          endDate: '2027-01-31',
          monthlyRent: 1200,
          depositAmount: 2400,
          depositMonths: 2,
          paymentDueDay: 1,
          utilitiesResponsibility: 'TENANT',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.id).toBeDefined();
      expect(body.contractNumber).toBeDefined();
      expect(body.status).toBe('DRAFT');
      expect(body.applicationId).toBe(applicationId);
      expect(body.tenantId).toBe(tenantProfileId);
      expect(body.ownerId).toBe(ownerProfileId);
      expect(Number(body.monthlyRent)).toBe(1200);
      expect(Number(body.depositAmount)).toBe(2400);
    });

    it('should reject contract creation for non-approved application', async () => {
      if (!applicationId) {
        throw new Error('applicationId is not defined');
      }

      // Update application status to PENDING
      await prisma.application.update({
        where: { id: applicationId },
        data: { status: 'PENDING' },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/contracts',
        headers: { Authorization: `Bearer ${ownerToken}` },
        payload: {
          applicationId,
          startDate: '2026-02-01',
          endDate: '2027-01-31',
          monthlyRent: 1200,
          depositAmount: 2400,
          depositMonths: 2,
          paymentDueDay: 1,
          utilitiesResponsibility: 'TENANT',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toContain('approved');
    });

    it('should reject contract creation if user is not owner of the listing', async () => {
      // Create another owner via API with unique email
      const timestamp = Date.now();
      const otherOwnerRegisterResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `other-owner-${timestamp}@test.com`,
          password: 'SecurePass123!',
          phone: `+3463333${timestamp.toString().slice(-4)}`,
          role: 'OWNER',
        },
      });

      if (otherOwnerRegisterResponse.statusCode !== 201) {
        throw new Error(`Failed to register other owner: ${otherOwnerRegisterResponse.body}`);
      }

      const otherOwnerRegisterBody = JSON.parse(otherOwnerRegisterResponse.body);
      const otherOwnerToken = otherOwnerRegisterBody.token;

      await app.inject({
        method: 'POST',
        url: '/api/v1/profiles/owner',
        headers: { authorization: `Bearer ${otherOwnerToken}` },
        payload: {
          firstName: 'Other',
          lastName: 'Owner',
          documentType: 'DNI',
          documentNumber: '87654321B',
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/contracts',
        headers: { Authorization: `Bearer ${otherOwnerToken}` },
        payload: {
          applicationId,
          startDate: '2026-02-01',
          endDate: '2027-01-31',
          monthlyRent: 1200,
          depositAmount: 2400,
          depositMonths: 2,
          paymentDueDay: 1,
          utilitiesResponsibility: 'TENANT',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should reject contract creation if tenant tries to create', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/contracts',
        headers: { Authorization: `Bearer ${tenantToken}` },
        payload: {
          applicationId,
          startDate: '2026-02-01',
          endDate: '2027-01-31',
          monthlyRent: 1200,
          depositAmount: 2400,
          depositMonths: 2,
          paymentDueDay: 1,
          utilitiesResponsibility: 'TENANT',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should reject if application already has a contract', async () => {
      // Create first contract
      await app.inject({
        method: 'POST',
        url: '/api/v1/contracts',
        headers: { Authorization: `Bearer ${ownerToken}` },
        payload: {
          applicationId,
          startDate: '2026-02-01',
          endDate: '2027-01-31',
          monthlyRent: 1200,
          depositAmount: 2400,
          depositMonths: 2,
          paymentDueDay: 1,
          utilitiesResponsibility: 'TENANT',
        },
      });

      // Try to create another contract for same application
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/contracts',
        headers: { Authorization: `Bearer ${ownerToken}` },
        payload: {
          applicationId,
          startDate: '2026-02-01',
          endDate: '2027-01-31',
          monthlyRent: 1200,
          depositAmount: 2400,
          depositMonths: 2,
          paymentDueDay: 1,
          utilitiesResponsibility: 'TENANT',
        },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/contracts',
        headers: { Authorization: `Bearer ${ownerToken}` },
        payload: {
          applicationId,
          // Missing required fields
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate date range (endDate must be after startDate)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/contracts',
        headers: { Authorization: `Bearer ${ownerToken}` },
        payload: {
          applicationId,
          startDate: '2027-02-01',
          endDate: '2026-01-31', // Before start date
          monthlyRent: 1200,
          depositAmount: 2400,
          depositMonths: 2,
          paymentDueDay: 1,
          utilitiesResponsibility: 'TENANT',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/contracts', () => {
    beforeEach(async () => {
      // Create a contract for testing via API
      const contractResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/contracts',
        headers: { Authorization: `Bearer ${ownerToken}` },
        payload: {
          applicationId,
          startDate: '2026-02-01',
          endDate: '2027-01-31',
          monthlyRent: 1200,
          depositAmount: 2400,
          depositMonths: 2,
          paymentDueDay: 1,
          utilitiesResponsibility: 'TENANT',
        },
      });

      if (contractResponse.statusCode !== 201) {
        throw new Error(`Failed to create contract: ${contractResponse.body}`);
      }
    });

    it('should list contracts for owner', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/contracts',
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.contracts).toBeInstanceOf(Array);
      expect(body.contracts.length).toBeGreaterThan(0);
      expect(body.contracts[0].ownerId).toBe(ownerProfileId);
    });

    it('should list contracts for tenant', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/contracts',
        headers: { Authorization: `Bearer ${tenantToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.contracts).toBeInstanceOf(Array);
      expect(body.contracts.length).toBeGreaterThan(0);
      expect(body.contracts[0].tenantId).toBe(tenantProfileId);
    });

    it('should filter contracts by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/contracts?status=DRAFT',
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      body.contracts.forEach((contract: { status: string }) => {
        expect(contract.status).toBe('DRAFT');
      });
    });
  });

  describe('GET /api/v1/contracts/:id', () => {
    let contractId: string;

    beforeEach(async () => {
      // Create contract via API
      const contractResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/contracts',
        headers: { Authorization: `Bearer ${ownerToken}` },
        payload: {
          applicationId,
          startDate: '2026-02-01',
          endDate: '2027-01-31',
          monthlyRent: 1200,
          depositAmount: 2400,
          depositMonths: 2,
          paymentDueDay: 1,
          utilitiesResponsibility: 'TENANT',
        },
      });

      if (contractResponse.statusCode !== 201) {
        throw new Error(`Failed to create contract: ${contractResponse.body}`);
      }

      const contractBody = JSON.parse(contractResponse.body);
      contractId = contractBody.id;
    });

    it('should get contract details as owner', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/contracts/${contractId}`,
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe(contractId);
      expect(body.ownerId).toBe(ownerProfileId);
      expect(body.tenant).toBeDefined();
      expect(body.listing).toBeDefined();
    });

    it('should get contract details as tenant', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/contracts/${contractId}`,
        headers: { Authorization: `Bearer ${tenantToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe(contractId);
      expect(body.tenantId).toBe(tenantProfileId);
    });

    it('should return 404 for non-existent contract', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/contracts/00000000-0000-0000-0000-000000000000',
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should reject access for unauthorized user', async () => {
      // Create another user via API with unique email
      const timestamp = Date.now();
      const otherRegisterResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `other-user-${timestamp}@test.com`,
          password: 'SecurePass123!',
          phone: `+3464444${timestamp.toString().slice(-4)}`,
          role: 'TENANT',
        },
      });

      if (otherRegisterResponse.statusCode !== 201) {
        throw new Error(`Failed to register other user: ${otherRegisterResponse.body}`);
      }

      const otherRegisterBody = JSON.parse(otherRegisterResponse.body);
      const otherToken = otherRegisterBody.token;

      await app.inject({
        method: 'POST',
        url: '/api/v1/profiles/tenant',
        headers: { authorization: `Bearer ${otherToken}` },
        payload: {
          firstName: 'Other',
          lastName: 'User',
          documentType: 'DNI',
          documentNumber: '11111111D',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/contracts/${contractId}`,
        headers: { Authorization: `Bearer ${otherToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('POST /api/v1/contracts/:id/sign', () => {
    let contractId: string;

    beforeEach(async () => {
      // Create contract via API and send for signing
      const contractResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/contracts',
        headers: { Authorization: `Bearer ${ownerToken}` },
        payload: {
          applicationId,
          startDate: '2026-02-01',
          endDate: '2027-01-31',
          monthlyRent: 1200,
          depositAmount: 2400,
          depositMonths: 2,
          paymentDueDay: 1,
          utilitiesResponsibility: 'TENANT',
        },
      });

      if (contractResponse.statusCode !== 201) {
        throw new Error(`Failed to create contract: ${contractResponse.body}`);
      }

      const contractBody = JSON.parse(contractResponse.body);
      contractId = contractBody.id;

      // Send for signing to get PENDING_SIGNATURES status
      await app.inject({
        method: 'POST',
        url: `/api/v1/contracts/${contractId}/send-for-signing`,
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
    });

    it('should allow owner to sign contract', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/contracts/${contractId}/sign`,
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.ownerSignedAt).toBeDefined();
    });

    it('should allow tenant to sign contract', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/contracts/${contractId}/sign`,
        headers: { Authorization: `Bearer ${tenantToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.tenantSignedAt).toBeDefined();
    });

    it('should activate contract when both parties sign', async () => {
      // Owner signs
      await app.inject({
        method: 'POST',
        url: `/api/v1/contracts/${contractId}/sign`,
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      // Tenant signs
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/contracts/${contractId}/sign`,
        headers: { Authorization: `Bearer ${tenantToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe('ACTIVE');
      expect(body.ownerSignedAt).toBeDefined();
      expect(body.tenantSignedAt).toBeDefined();
    });

    it('should reject signing if contract is in DRAFT status', async () => {
      // Update contract to DRAFT
      await prisma.leaseContract.update({
        where: { id: contractId },
        data: { status: 'DRAFT' },
      });

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/contracts/${contractId}/sign`,
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject signing if already signed by the same party', async () => {
      // Owner signs first time
      await app.inject({
        method: 'POST',
        url: `/api/v1/contracts/${contractId}/sign`,
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      // Owner tries to sign again
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/contracts/${contractId}/sign`,
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toContain('already signed');
    });
  });

  describe('POST /api/v1/contracts/:id/send-for-signing', () => {
    let contractId: string;

    beforeEach(async () => {
      // Create contract via API
      const contractResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/contracts',
        headers: { Authorization: `Bearer ${ownerToken}` },
        payload: {
          applicationId,
          startDate: '2026-02-01',
          endDate: '2027-01-31',
          monthlyRent: 1200,
          depositAmount: 2400,
          depositMonths: 2,
          paymentDueDay: 1,
          utilitiesResponsibility: 'TENANT',
        },
      });

      if (contractResponse.statusCode !== 201) {
        throw new Error(`Failed to create contract: ${contractResponse.body}`);
      }

      const contractBody = JSON.parse(contractResponse.body);
      contractId = contractBody.id;
    });

    it('should send contract for signing (change status to PENDING_SIGNATURES)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/contracts/${contractId}/send-for-signing`,
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe('PENDING_SIGNATURES');
    });

    it('should reject if contract is not in DRAFT status', async () => {
      await prisma.leaseContract.update({
        where: { id: contractId },
        data: { status: 'ACTIVE' },
      });

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/contracts/${contractId}/send-for-signing`,
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject if tenant tries to send for signing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/contracts/${contractId}/send-for-signing`,
        headers: { Authorization: `Bearer ${tenantToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('POST /api/v1/contracts/:id/terminate', () => {
    let contractId: string;

    beforeEach(async () => {
      // Create contract via API, send for signing, and sign by both parties
      const contractResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/contracts',
        headers: { Authorization: `Bearer ${ownerToken}` },
        payload: {
          applicationId,
          startDate: '2026-02-01',
          endDate: '2027-01-31',
          monthlyRent: 1200,
          depositAmount: 2400,
          depositMonths: 2,
          paymentDueDay: 1,
          utilitiesResponsibility: 'TENANT',
        },
      });

      if (contractResponse.statusCode !== 201) {
        throw new Error(`Failed to create contract: ${contractResponse.body}`);
      }

      const contractBody = JSON.parse(contractResponse.body);
      contractId = contractBody.id;

      // Send for signing
      await app.inject({
        method: 'POST',
        url: `/api/v1/contracts/${contractId}/send-for-signing`,
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      // Sign by owner
      await app.inject({
        method: 'POST',
        url: `/api/v1/contracts/${contractId}/sign`,
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      // Sign by tenant to activate
      await app.inject({
        method: 'POST',
        url: `/api/v1/contracts/${contractId}/sign`,
        headers: { Authorization: `Bearer ${tenantToken}` },
      });
    });

    it('should terminate active contract as owner', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/contracts/${contractId}/terminate`,
        headers: { Authorization: `Bearer ${ownerToken}` },
        payload: {
          reason: 'Mutual agreement to terminate',
          terminationDate: '2026-06-30',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe('TERMINATED');
    });

    it('should reject termination if contract is not active', async () => {
      await prisma.leaseContract.update({
        where: { id: contractId },
        data: { status: 'DRAFT' },
      });

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/contracts/${contractId}/terminate`,
        headers: { Authorization: `Bearer ${ownerToken}` },
        payload: {
          reason: 'Mutual agreement',
          terminationDate: '2026-06-30',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
