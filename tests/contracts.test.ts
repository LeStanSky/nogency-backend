import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createApp } from '../src/app.js';
import { FastifyInstance } from 'fastify';
import { prisma } from '../src/db/client.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../src/config.js';

describe('Contract API', () => {
  let app: FastifyInstance;
  let ownerUserId: string;
  let ownerProfileId: string;
  let ownerToken: string;
  let tenantUserId: string;
  let tenantProfileId: string;
  let tenantToken: string;
  let propertyId: string;
  let listingId: string;
  let applicationId: string;

  beforeAll(async () => {
    console.log('🧪 Setting up test environment...');
    app = await createApp();
  });

  afterAll(async () => {
    console.log('✅ Tests completed, cleaning up...');
    await app.close();
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

    // Create owner user
    const ownerPasswordHash = await bcrypt.hash('password123', 10);
    const ownerUser = await prisma.user.create({
      data: {
        email: 'contract-owner@test.com',
        passwordHash: ownerPasswordHash,
        isEmailVerified: true,
      },
    });
    ownerUserId = ownerUser.id;

    // Create owner profile
    const ownerProfile = await prisma.ownerProfile.create({
      data: {
        userId: ownerUserId,
        firstName: 'Contract',
        lastName: 'Owner',
        documentType: 'DNI',
        documentNumber: '12345678A',
      },
    });
    ownerProfileId = ownerProfile.id;

    // Create owner role
    await prisma.userRole.create({
      data: {
        userId: ownerUserId,
        role: 'OWNER',
      },
    });

    ownerToken = jwt.sign({ userId: ownerUserId, email: ownerUser.email }, config.jwt.secret, {
      expiresIn: '1h',
    });

    // Create tenant user
    const tenantPasswordHash = await bcrypt.hash('password123', 10);
    const tenantUser = await prisma.user.create({
      data: {
        email: 'contract-tenant@test.com',
        passwordHash: tenantPasswordHash,
        isEmailVerified: true,
      },
    });
    tenantUserId = tenantUser.id;

    // Create tenant profile
    const tenantProfile = await prisma.tenantProfile.create({
      data: {
        userId: tenantUserId,
        firstName: 'Contract',
        lastName: 'Tenant',
        documentType: 'DNI',
        documentNumber: '98765432C',
        dateOfBirth: new Date('1990-01-15'),
        occupation: 'EMPLOYED',
        monthlyIncome: 4000,
      },
    });
    tenantProfileId = tenantProfile.id;

    // Create tenant role
    await prisma.userRole.create({
      data: {
        userId: tenantUserId,
        role: 'TENANT',
      },
    });

    tenantToken = jwt.sign({ userId: tenantUserId, email: tenantUser.email }, config.jwt.secret, {
      expiresIn: '1h',
    });

    // Create property
    const property = await prisma.property.create({
      data: {
        ownerId: ownerProfileId,
        propertyType: 'APARTMENT',
        address: {
          street: 'Calle Test 123',
          city: 'Madrid',
          postalCode: '28001',
          country: 'ES',
        },
        roomCount: 3,
        totalArea: 75,
        furnished: 'FULLY',
      },
    });
    propertyId = property.id;

    // Create listing
    const listing = await prisma.listing.create({
      data: {
        propertyId: propertyId,
        ownerId: ownerProfileId,
        title: 'Beautiful apartment for rent',
        description: 'A great apartment in the city center',
        monthlyRent: 1200,
        depositAmount: 2400,
        minLeaseTermMonths: 12,
        availableFrom: new Date(),
        status: 'ACTIVE',
      },
    });
    listingId = listing.id;

    // Create approved application
    const application = await prisma.application.create({
      data: {
        listingId: listingId,
        tenantId: tenantProfileId,
        status: 'APPROVED',
        source: 'APP',
        message: 'I am very interested in this property',
        proposedMoveInDate: new Date('2026-02-01'),
        proposedLeaseTermMonths: 12,
      },
    });
    applicationId = application.id;
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
      // Create another owner
      const otherOwnerHash = await bcrypt.hash('password123', 10);
      const otherOwnerUser = await prisma.user.create({
        data: {
          email: 'other-owner@test.com',
          passwordHash: otherOwnerHash,
          isEmailVerified: true,
        },
      });

      await prisma.ownerProfile.create({
        data: {
          userId: otherOwnerUser.id,
          firstName: 'Other',
          lastName: 'Owner',
          documentType: 'DNI',
          documentNumber: '87654321B',
        },
      });

      await prisma.userRole.create({
        data: {
          userId: otherOwnerUser.id,
          role: 'OWNER',
        },
      });

      const otherOwnerToken = jwt.sign(
        { userId: otherOwnerUser.id, email: otherOwnerUser.email },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

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
    let _contractId: string;

    beforeEach(async () => {
      // Create a contract for testing
      const contract = await prisma.leaseContract.create({
        data: {
          applicationId,
          listingId,
          propertyId,
          ownerId: ownerProfileId,
          tenantId: tenantProfileId,
          contractNumber: `CTR-${Date.now()}`,
          startDate: new Date('2026-02-01'),
          endDate: new Date('2027-01-31'),
          monthlyRent: 1200,
          depositAmount: 2400,
          depositMonths: 2,
          paymentDueDay: 1,
          utilitiesResponsibility: 'TENANT',
          status: 'DRAFT',
        },
      });
      _contractId = contract.id;
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
      const contract = await prisma.leaseContract.create({
        data: {
          applicationId,
          listingId,
          propertyId,
          ownerId: ownerProfileId,
          tenantId: tenantProfileId,
          contractNumber: `CTR-${Date.now()}`,
          startDate: new Date('2026-02-01'),
          endDate: new Date('2027-01-31'),
          monthlyRent: 1200,
          depositAmount: 2400,
          depositMonths: 2,
          paymentDueDay: 1,
          utilitiesResponsibility: 'TENANT',
          status: 'DRAFT',
        },
      });
      contractId = contract.id;
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
      // Create another user
      const otherHash = await bcrypt.hash('password123', 10);
      const otherUser = await prisma.user.create({
        data: {
          email: 'other-user@test.com',
          passwordHash: otherHash,
          isEmailVerified: true,
        },
      });

      await prisma.tenantProfile.create({
        data: {
          userId: otherUser.id,
          firstName: 'Other',
          lastName: 'User',
          documentType: 'DNI',
          documentNumber: '11111111D',
        },
      });

      await prisma.userRole.create({
        data: {
          userId: otherUser.id,
          role: 'TENANT',
        },
      });

      const otherToken = jwt.sign(
        { userId: otherUser.id, email: otherUser.email },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

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
      const contract = await prisma.leaseContract.create({
        data: {
          applicationId,
          listingId,
          propertyId,
          ownerId: ownerProfileId,
          tenantId: tenantProfileId,
          contractNumber: `CTR-${Date.now()}`,
          startDate: new Date('2026-02-01'),
          endDate: new Date('2027-01-31'),
          monthlyRent: 1200,
          depositAmount: 2400,
          depositMonths: 2,
          paymentDueDay: 1,
          utilitiesResponsibility: 'TENANT',
          status: 'PENDING_SIGNATURES',
        },
      });
      contractId = contract.id;
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
      const contract = await prisma.leaseContract.create({
        data: {
          applicationId,
          listingId,
          propertyId,
          ownerId: ownerProfileId,
          tenantId: tenantProfileId,
          contractNumber: `CTR-${Date.now()}`,
          startDate: new Date('2026-02-01'),
          endDate: new Date('2027-01-31'),
          monthlyRent: 1200,
          depositAmount: 2400,
          depositMonths: 2,
          paymentDueDay: 1,
          utilitiesResponsibility: 'TENANT',
          status: 'DRAFT',
        },
      });
      contractId = contract.id;
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
      const contract = await prisma.leaseContract.create({
        data: {
          applicationId,
          listingId,
          propertyId,
          ownerId: ownerProfileId,
          tenantId: tenantProfileId,
          contractNumber: `CTR-${Date.now()}`,
          startDate: new Date('2026-02-01'),
          endDate: new Date('2027-01-31'),
          monthlyRent: 1200,
          depositAmount: 2400,
          depositMonths: 2,
          paymentDueDay: 1,
          utilitiesResponsibility: 'TENANT',
          status: 'ACTIVE',
          ownerSignedAt: new Date(),
          tenantSignedAt: new Date(),
        },
      });
      contractId = contract.id;
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
