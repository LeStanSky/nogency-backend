import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db/client.js';

describe('Profile Management API', () => {
  let app: FastifyInstance;
  let authToken: string;
  let userId: string;

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
    // Clean up database before each test
    await prisma.tenantProfile.deleteMany({});
    await prisma.ownerProfile.deleteMany({});
    await prisma.userRole.deleteMany({});
    await prisma.user.deleteMany({});

    // Create a test user and get auth token
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'testuser@example.com',
        password: 'SecurePass123!',
        phone: '+34612345678',
        role: 'TENANT',
      },
    });

    const registerBody = JSON.parse(registerResponse.body);
    authToken = registerBody.token;
    userId = registerBody.user.id;
  });

  describe('POST /api/v1/profiles/owner', () => {
    it('should create owner profile successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/profiles/owner',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          firstName: 'John',
          lastName: 'Doe',
          documentType: 'DNI',
          documentNumber: '12345678A',
          bankAccountIban: 'ES1234567890123456789012',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('userId', userId);
      expect(body).toHaveProperty('firstName', 'John');
      expect(body).toHaveProperty('lastName', 'Doe');
      expect(body).toHaveProperty('documentType', 'DNI');
      expect(body).toHaveProperty('documentNumber', '12345678A');
      expect(body).toHaveProperty('bankAccountIban', 'ES1234567890123456789012');
    });

    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/profiles/owner',
        payload: {
          firstName: 'John',
          lastName: 'Doe',
          documentType: 'DNI',
          documentNumber: '12345678A',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/profiles/owner',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          firstName: 'John',
          // Missing lastName, documentType, and documentNumber
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 409 if owner profile already exists', async () => {
      // Create first profile
      await app.inject({
        method: 'POST',
        url: '/api/v1/profiles/owner',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          firstName: 'John',
          lastName: 'Doe',
          documentType: 'DNI',
          documentNumber: '12345678A',
        },
      });

      // Try to create second profile
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/profiles/owner',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          firstName: 'Jane',
          lastName: 'Smith',
          documentType: 'NIE',
          documentNumber: '87654321B',
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
    });

    it('should add OWNER role to user', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/profiles/owner',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          firstName: 'John',
          lastName: 'Doe',
          documentType: 'DNI',
          documentNumber: '12345678A',
        },
      });

      const roles = await prisma.userRole.findMany({
        where: { userId },
      });

      const hasOwnerRole = roles.some((role) => role.role === 'OWNER');
      expect(hasOwnerRole).toBe(true);
    });
  });

  describe('POST /api/v1/profiles/tenant', () => {
    it('should create tenant profile successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/profiles/tenant',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          firstName: 'Jane',
          lastName: 'Smith',
          documentType: 'NIE',
          documentNumber: 'X1234567A',
          dateOfBirth: '1990-05-15',
          occupation: 'EMPLOYED',
          employerName: 'Tech Corp',
          monthlyIncome: 3500,
          preferredMoveInDate: '2024-02-01',
          rentalDurationMonths: 12,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('userId', userId);
      expect(body).toHaveProperty('firstName', 'Jane');
      expect(body).toHaveProperty('lastName', 'Smith');
      expect(body).toHaveProperty('documentType', 'NIE');
      expect(body).toHaveProperty('documentNumber', 'X1234567A');
      expect(body).toHaveProperty('occupation', 'EMPLOYED');
      expect(body).toHaveProperty('monthlyIncome');
    });

    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/profiles/tenant',
        payload: {
          firstName: 'Jane',
          lastName: 'Smith',
          documentType: 'NIE',
          documentNumber: 'X1234567A',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 for invalid date format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/profiles/tenant',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          firstName: 'Jane',
          lastName: 'Smith',
          documentType: 'NIE',
          documentNumber: 'X1234567A',
          dateOfBirth: 'invalid-date',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 409 if tenant profile already exists', async () => {
      // Create first profile
      await app.inject({
        method: 'POST',
        url: '/api/v1/profiles/tenant',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          firstName: 'Jane',
          lastName: 'Smith',
          documentType: 'NIE',
          documentNumber: 'X1234567A',
        },
      });

      // Try to create second profile
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/profiles/tenant',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          firstName: 'John',
          lastName: 'Doe',
          documentType: 'DNI',
          documentNumber: '12345678A',
        },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('GET /api/v1/profiles/me', () => {
    it('should return owner profile', async () => {
      // Create owner profile
      await app.inject({
        method: 'POST',
        url: '/api/v1/profiles/owner',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          firstName: 'John',
          lastName: 'Doe',
          documentType: 'DNI',
          documentNumber: '12345678A',
        },
      });

      // Get profile
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/profiles/me',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('type', 'owner');
      expect(body).toHaveProperty('profile');
      expect(body.profile).toHaveProperty('firstName', 'John');
      expect(body.profile).toHaveProperty('lastName', 'Doe');
    });

    it('should return tenant profile', async () => {
      // Create tenant profile
      await app.inject({
        method: 'POST',
        url: '/api/v1/profiles/tenant',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          firstName: 'Jane',
          lastName: 'Smith',
          documentType: 'NIE',
          documentNumber: 'X1234567A',
        },
      });

      // Get profile
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/profiles/me',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('type', 'tenant');
      expect(body).toHaveProperty('profile');
      expect(body.profile).toHaveProperty('firstName', 'Jane');
    });

    it('should return 404 if no profile exists', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/profiles/me',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/profiles/me',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('PATCH /api/v1/profiles/me', () => {
    it('should update owner profile', async () => {
      // Create owner profile
      await app.inject({
        method: 'POST',
        url: '/api/v1/profiles/owner',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          firstName: 'John',
          lastName: 'Doe',
          documentType: 'DNI',
          documentNumber: '12345678A',
        },
      });

      // Update profile
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/profiles/me',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          firstName: 'Johnny',
          bankAccountIban: 'ES9876543210987654321098',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('firstName', 'Johnny');
      expect(body).toHaveProperty('lastName', 'Doe'); // Unchanged
      expect(body).toHaveProperty('bankAccountIban', 'ES9876543210987654321098');
    });

    it('should update tenant profile', async () => {
      // Create tenant profile
      await app.inject({
        method: 'POST',
        url: '/api/v1/profiles/tenant',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          firstName: 'Jane',
          lastName: 'Smith',
          documentType: 'NIE',
          documentNumber: 'X1234567A',
          monthlyIncome: 3000,
        },
      });

      // Update profile
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/profiles/me',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          monthlyIncome: 3500,
          occupation: 'SELF_EMPLOYED',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('monthlyIncome');
      expect(body).toHaveProperty('occupation', 'SELF_EMPLOYED');
    });

    it('should return 404 if no profile exists', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/profiles/me',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          firstName: 'Updated',
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/profiles/me',
        payload: {
          firstName: 'Updated',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should not update immutable fields (userId, id)', async () => {
      // Create profile
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/profiles/owner',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          firstName: 'John',
          lastName: 'Doe',
          documentType: 'DNI',
          documentNumber: '12345678A',
        },
      });

      const createBody = JSON.parse(createResponse.body);
      const originalId = createBody.id;

      // Try to update immutable fields
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/profiles/me',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          id: 'fake-id',
          userId: 'fake-user-id',
          firstName: 'Johnny',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(originalId); // ID unchanged
      expect(body.userId).toBe(userId); // userId unchanged
      expect(body.firstName).toBe('Johnny'); // firstName updated
    });
  });
});
