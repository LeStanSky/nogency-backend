import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db/client.js';

describe('Authentication API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.userRole.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'SecurePass123!',
          phone: '+34612345678',
          role: 'TENANT',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('user');
      expect(body).toHaveProperty('token');
      expect(body.user).toHaveProperty('id');
      expect(body.user).toHaveProperty('email', 'test@example.com');
      expect(body.user).toHaveProperty('phone', '+34612345678');
      expect(body.user).toHaveProperty('isEmailVerified', false);
      expect(body.user).not.toHaveProperty('passwordHash');
    });

    it('should return 400 for invalid email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'invalid-email',
          password: 'SecurePass123!',
          role: 'TENANT',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
    });

    it('should return 400 for weak password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'weak',
          role: 'TENANT',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
    });

    it('should return 409 if email already exists', async () => {
      // First registration
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'duplicate@example.com',
          password: 'SecurePass123!',
          role: 'TENANT',
        },
      });

      // Second registration with same email
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'duplicate@example.com',
          password: 'SecurePass123!',
          role: 'TENANT',
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toContain('already exists');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Create a user for login tests
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'login@example.com',
          password: 'SecurePass123!',
          role: 'TENANT',
        },
      });
    });

    it('should login existing user successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'login@example.com',
          password: 'SecurePass123!',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('user');
      expect(body).toHaveProperty('token');
      expect(body.user).toHaveProperty('email', 'login@example.com');
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'login@example.com',
          password: 'WrongPassword123!',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toContain('Invalid credentials');
    });

    it('should return 401 for non-existent user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'SecurePass123!',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let authToken: string;

    beforeEach(async () => {
      // Register and get token
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'me@example.com',
          password: 'SecurePass123!',
          role: 'OWNER',
        },
      });
      const body = JSON.parse(response.body);
      authToken = body.token;
    });

    it('should return current user with valid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('user');
      expect(body.user).toHaveProperty('email', 'me@example.com');
      expect(body.user).not.toHaveProperty('passwordHash');
    });

    it('should return 401 without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
    });

    it('should return 401 with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: 'Bearer invalid-token-here',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
    });
  });
});
