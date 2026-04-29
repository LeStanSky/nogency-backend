import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

// Mock OtpService (Supabase Auth) — must be before imports
vi.mock('../src/services/otp.service.js', () => ({
  OtpService: {
    sendOtp: vi.fn(),
    verifyOtp: vi.fn(),
  },
}));

import { FastifyInstance } from 'fastify';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db/client.js';
import { OtpService } from '../src/services/otp.service.js';

const mockedOtpService = vi.mocked(OtpService);

describe('Phone OTP Authentication', () => {
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
    await prisma.userRole.deleteMany({});
    await prisma.user.deleteMany({});
    vi.clearAllMocks();
  });

  // =========================================================================
  // POST /api/v1/auth/otp/send
  // =========================================================================
  describe('POST /api/v1/auth/otp/send', () => {
    it('should send OTP to valid phone number', async () => {
      mockedOtpService.sendOtp.mockResolvedValue({ success: true });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/otp/send',
        payload: { phone: '+34612345678' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('message', 'OTP sent successfully');
      expect(mockedOtpService.sendOtp).toHaveBeenCalledWith('+34612345678');
    });

    it('should return 400 for missing phone', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/otp/send',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for invalid phone format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/otp/send',
        payload: { phone: 'not-a-phone' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for phone without country code', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/otp/send',
        payload: { phone: '612345678' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 503 when Supabase OTP service fails', async () => {
      mockedOtpService.sendOtp.mockRejectedValue(new Error('Supabase service unavailable'));

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/otp/send',
        payload: { phone: '+34612345678' },
      });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
    });
  });

  // =========================================================================
  // POST /api/v1/auth/otp/verify
  // =========================================================================
  describe('POST /api/v1/auth/otp/verify', () => {
    it('should verify OTP and create new user', async () => {
      mockedOtpService.verifyOtp.mockResolvedValue({ valid: true });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/otp/verify',
        payload: {
          phone: '+34612345678',
          code: '123456',
          email: 'newuser@example.com',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('user');
      expect(body).toHaveProperty('token');
      expect(body).toHaveProperty('isNewUser', true);
      expect(body.user.phone).toBe('+34612345678');
      expect(body.user.email).toBe('newuser@example.com');
      expect(body.user.isPhoneVerified).toBe(true);
    });

    it('should verify OTP and login existing user by phone', async () => {
      // Create existing user with phone
      await prisma.user.create({
        data: {
          email: 'existing@example.com',
          phone: '+34612345678',
          passwordHash: 'some-hash',
          isPhoneVerified: true,
          roles: { create: { role: 'TENANT' } },
        },
      });

      mockedOtpService.verifyOtp.mockResolvedValue({ valid: true });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/otp/verify',
        payload: {
          phone: '+34612345678',
          code: '123456',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('isNewUser', false);
      expect(body.user.email).toBe('existing@example.com');
      expect(body.user.phone).toBe('+34612345678');
    });

    it('should create user without passwordHash for phone-only registration', async () => {
      mockedOtpService.verifyOtp.mockResolvedValue({ valid: true });

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/otp/verify',
        payload: {
          phone: '+34612345678',
          code: '123456',
          email: 'phoneuser@example.com',
        },
      });

      // Verify user in DB has no password
      const user = await prisma.user.findFirst({
        where: { phone: '+34612345678' },
      });
      expect(user).toBeTruthy();
      expect(user!.passwordHash).toBeNull();
      expect(user!.isPhoneVerified).toBe(true);
    });

    it('should generate placeholder email when email not provided', async () => {
      mockedOtpService.verifyOtp.mockResolvedValue({ valid: true });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/otp/verify',
        payload: {
          phone: '+34612345678',
          code: '123456',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.isNewUser).toBe(true);

      // Verify placeholder email was generated
      const user = await prisma.user.findFirst({
        where: { phone: '+34612345678' },
      });
      expect(user).toBeTruthy();
      expect(user!.email).toContain('34612345678');
    });

    it('should accept optional role parameter for new users', async () => {
      mockedOtpService.verifyOtp.mockResolvedValue({ valid: true });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/otp/verify',
        payload: {
          phone: '+34612345678',
          code: '123456',
          email: 'owner@example.com',
          role: 'OWNER',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.isNewUser).toBe(true);

      // Verify role in DB
      const user = await prisma.user.findFirst({
        where: { phone: '+34612345678' },
        include: { roles: true },
      });
      expect(user!.roles[0].role).toBe('OWNER');
    });

    it('should default to TENANT role for new users', async () => {
      mockedOtpService.verifyOtp.mockResolvedValue({ valid: true });

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/otp/verify',
        payload: {
          phone: '+34612345678',
          code: '123456',
        },
      });

      const user = await prisma.user.findFirst({
        where: { phone: '+34612345678' },
        include: { roles: true },
      });
      expect(user!.roles[0].role).toBe('TENANT');
    });

    it('should return 401 for invalid OTP code', async () => {
      mockedOtpService.verifyOtp.mockRejectedValue(new Error('Invalid OTP'));

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/otp/verify',
        payload: {
          phone: '+34612345678',
          code: '000000',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
    });

    it('should return 400 for missing code', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/otp/verify',
        payload: { phone: '+34612345678' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for missing phone', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/otp/verify',
        payload: { code: '123456' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return valid JWT token that works with /me endpoint', async () => {
      mockedOtpService.verifyOtp.mockResolvedValue({ valid: true });

      const verifyResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/otp/verify',
        payload: {
          phone: '+34612345678',
          code: '123456',
          email: 'jwttest@example.com',
        },
      });

      const { token } = JSON.parse(verifyResponse.body);
      expect(token).toBeTruthy();

      // Use the token to call /me
      const meResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(meResponse.statusCode).toBe(200);
      const meBody = JSON.parse(meResponse.body);
      expect(meBody.user.phone).toBe('+34612345678');
      expect(meBody.user.email).toBe('jwttest@example.com');
    });

    it('should not leak passwordHash in response', async () => {
      mockedOtpService.verifyOtp.mockResolvedValue({ valid: true });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/otp/verify',
        payload: {
          phone: '+34612345678',
          code: '123456',
        },
      });

      const body = JSON.parse(response.body);
      expect(body.user).not.toHaveProperty('passwordHash');
    });

    it('should handle email conflict when creating new user', async () => {
      // Create existing user with this email but different phone
      await prisma.user.create({
        data: {
          email: 'taken@example.com',
          phone: '+34999999999',
          passwordHash: 'some-hash',
          roles: { create: { role: 'TENANT' } },
        },
      });

      mockedOtpService.verifyOtp.mockResolvedValue({ valid: true });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/otp/verify',
        payload: {
          phone: '+34612345678',
          code: '123456',
          email: 'taken@example.com',
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
    });
  });

  // =========================================================================
  // Email+Password login for phone-only users
  // =========================================================================
  describe('Email+Password login for phone-registered users', () => {
    it('should not allow password login for phone-only users (no password set)', async () => {
      // Create phone-only user via OTP
      mockedOtpService.verifyOtp.mockResolvedValue({ valid: true });

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/otp/verify',
        payload: {
          phone: '+34612345678',
          code: '123456',
          email: 'phoneonly@example.com',
        },
      });

      // Try to login with password — should fail
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'phoneonly@example.com',
          password: 'AnyPassword123',
        },
      });

      expect(loginResponse.statusCode).toBe(401);
    });
  });
});
