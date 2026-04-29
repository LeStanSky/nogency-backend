import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db/client.js';
import { EmailService } from '../src/services/email.service.js';
import crypto from 'crypto';

console.log('🧪 Setting up test environment...');

describe('Email Verification & Password Reset API', () => {
  let app: FastifyInstance;
  let testUserEmail: string;
  let testUserPassword: string;
  let verificationToken: string;
  let passwordResetToken: string;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.userRole.deleteMany({
      where: { user: { email: { contains: 'email-test-' } } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: 'email-test-' } },
    });
    await app.close();
    console.log('✅ Tests completed, cleaning up...');
  });

  beforeEach(() => {
    // Generate unique email for each test
    testUserEmail = `email-test-${Date.now()}@example.com`;
    testUserPassword = 'TestPassword123!';
  });

  describe('EmailService', () => {
    it('should send verification email (mocked)', async () => {
      const result = await EmailService.sendVerificationEmail(
        'test@example.com',
        'test-token-123',
        'Test User'
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should send password reset email (mocked)', async () => {
      const result = await EmailService.sendPasswordResetEmail(
        'test@example.com',
        'reset-token-456',
        'Test User'
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should send welcome email (mocked)', async () => {
      const result = await EmailService.sendWelcomeEmail('test@example.com', 'Test User');

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should send application received email (mocked)', async () => {
      const result = await EmailService.sendApplicationReceivedEmail(
        'owner@example.com',
        'John Owner',
        'Jane Tenant',
        'Beautiful Apartment in Madrid',
        'app-123'
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should send application status email (mocked)', async () => {
      const result = await EmailService.sendApplicationStatusEmail(
        'tenant@example.com',
        'Jane Tenant',
        'Beautiful Apartment in Madrid',
        'APPROVED'
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/register (with email verification)', () => {
    it('should register user and send verification email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: testUserEmail,
          password: testUserPassword,
          role: 'OWNER',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.user.email).toBe(testUserEmail);
      expect(body.user.isEmailVerified).toBe(false);

      // Check that verification token was created
      const user = await prisma.user.findUnique({
        where: { email: testUserEmail },
      });
      expect(user?.emailVerificationToken).toBeDefined();
      expect(user?.emailVerificationExpires).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(new Date(user!.emailVerificationExpires!).getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('POST /api/v1/auth/verify-email', () => {
    beforeEach(async () => {
      // Create user with verification token
      verificationToken = crypto.randomBytes(32).toString('hex');
      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(testUserPassword, 10);

      await prisma.user.create({
        data: {
          email: testUserEmail,
          passwordHash,
          isEmailVerified: false,
          emailVerificationToken: verificationToken,
          emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          roles: {
            create: { role: 'OWNER' },
          },
        },
      });
    });

    it('should verify email with valid token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/verify-email',
        payload: {
          token: verificationToken,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('verified');

      // Check user is now verified
      const user = await prisma.user.findUnique({
        where: { email: testUserEmail },
      });
      expect(user?.isEmailVerified).toBe(true);
      expect(user?.emailVerificationToken).toBeNull();
      expect(user?.emailVerificationExpires).toBeNull();
    });

    it('should reject invalid token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/verify-email',
        payload: {
          token: 'invalid-token',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Invalid');
    });

    it('should reject expired token', async () => {
      // Update token to be expired
      await prisma.user.update({
        where: { email: testUserEmail },
        data: {
          emailVerificationExpires: new Date(Date.now() - 1000), // expired
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/verify-email',
        payload: {
          token: verificationToken,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('expired');
    });
  });

  describe('POST /api/v1/auth/resend-verification', () => {
    beforeEach(async () => {
      // Create unverified user
      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(testUserPassword, 10);

      await prisma.user.create({
        data: {
          email: testUserEmail,
          passwordHash,
          isEmailVerified: false,
          roles: {
            create: { role: 'OWNER' },
          },
        },
      });
    });

    it('should resend verification email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/resend-verification',
        payload: {
          email: testUserEmail,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('sent');

      // Check token was created
      const user = await prisma.user.findUnique({
        where: { email: testUserEmail },
      });
      expect(user?.emailVerificationToken).toBeDefined();
    });

    it('should not reveal if email does not exist', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/resend-verification',
        payload: {
          email: 'nonexistent@example.com',
        },
      });

      // Should return 200 to not reveal email existence
      expect(response.statusCode).toBe(200);
    });

    it('should not send if already verified', async () => {
      // Mark user as verified
      await prisma.user.update({
        where: { email: testUserEmail },
        data: { isEmailVerified: true },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/resend-verification',
        payload: {
          email: testUserEmail,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('already verified');
    });
  });

  describe('POST /api/v1/auth/request-password-reset', () => {
    beforeEach(async () => {
      // Create verified user
      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(testUserPassword, 10);

      await prisma.user.create({
        data: {
          email: testUserEmail,
          passwordHash,
          isEmailVerified: true,
          roles: {
            create: { role: 'OWNER' },
          },
        },
      });
    });

    it('should send password reset email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/request-password-reset',
        payload: {
          email: testUserEmail,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('sent');

      // Check reset token was created
      const user = await prisma.user.findUnique({
        where: { email: testUserEmail },
      });
      expect(user?.passwordResetToken).toBeDefined();
      expect(user?.passwordResetExpires).toBeDefined();
    });

    it('should not reveal if email does not exist', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/request-password-reset',
        payload: {
          email: 'nonexistent@example.com',
        },
      });

      // Should return 200 to not reveal email existence
      expect(response.statusCode).toBe(200);
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    beforeEach(async () => {
      // Create user with reset token
      passwordResetToken = crypto.randomBytes(32).toString('hex');
      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(testUserPassword, 10);

      await prisma.user.create({
        data: {
          email: testUserEmail,
          passwordHash,
          isEmailVerified: true,
          passwordResetToken,
          passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
          roles: {
            create: { role: 'OWNER' },
          },
        },
      });
    });

    it('should reset password with valid token', async () => {
      const newPassword = 'NewPassword456!';

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: passwordResetToken,
          password: newPassword,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('reset');

      // Check token was cleared
      const user = await prisma.user.findUnique({
        where: { email: testUserEmail },
      });
      expect(user?.passwordResetToken).toBeNull();
      expect(user?.passwordResetExpires).toBeNull();

      // Check can login with new password
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: testUserEmail,
          password: newPassword,
        },
      });
      expect(loginResponse.statusCode).toBe(200);
    });

    it('should reject invalid token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: 'invalid-token',
          password: 'NewPassword456!',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Invalid');
    });

    it('should reject expired token', async () => {
      // Update token to be expired
      await prisma.user.update({
        where: { email: testUserEmail },
        data: {
          passwordResetExpires: new Date(Date.now() - 1000), // expired
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: passwordResetToken,
          password: 'NewPassword456!',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('expired');
    });

    it('should validate password strength', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: passwordResetToken,
          password: '123', // Too weak
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
