import { FastifyInstance } from 'fastify';
import { AuthController } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { config } from '../config.js';
import { errorResponseSchema } from '../schemas/error.schema.js';

/**
 * Auth routes
 * Prefix: /api/v1/auth
 */
export default async function authRoutes(app: FastifyInstance) {
  // Stricter rate limiting for auth endpoints (brute force protection)
  const authRateLimit = {
    max: config.rateLimit.auth.max,
    timeWindow: config.rateLimit.auth.timeWindow,
  };

  // POST /api/v1/auth/register - Register new user
  app.post('/register', {
    config: { rateLimit: authRateLimit },
    schema: {
      description: 'Register a new user account',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', description: 'User email address' },
          password: {
            type: 'string',
            minLength: 8,
            description: 'Password (min 8 characters)',
          },
          phone: { type: 'string', description: 'Phone number' },
          role: {
            type: 'string',
            enum: ['OWNER', 'TENANT'],
            description: 'Initial user role',
          },
        },
        examples: [
          {
            email: 'owner@example.com',
            password: 'SecurePass123!',
            phone: '+34612345678',
            role: 'OWNER',
          },
          {
            email: 'tenant@example.com',
            password: 'SecurePass123!',
            role: 'TENANT',
          },
        ],
      },
      response: {
        201: {
          description: 'User created successfully',
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' },
                phone: { type: 'string', nullable: true },
                isEmailVerified: { type: 'boolean' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
            token: { type: 'string', description: 'JWT access token' },
          },
          examples: [
            {
              user: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                email: 'owner@example.com',
                phone: '+34612345678',
                isEmailVerified: false,
                createdAt: '2026-01-18T12:00:00.000Z',
              },
              token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
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
              details: { fields: ['password: Password must be at least 8 characters'] },
            },
          ],
        },
        409: {
          description: 'Email already registered',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Email already exists',
              statusCode: 409,
              code: 'CONFLICT',
            },
          ],
        },
      },
    },
    handler: AuthController.register,
  });

  // POST /api/v1/auth/login - Login existing user
  app.post('/login', {
    config: { rateLimit: authRateLimit },
    schema: {
      description: 'Login with email and password',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', description: 'User email address' },
          password: { type: 'string', description: 'User password' },
        },
        examples: [
          {
            email: 'owner@example.com',
            password: 'SecurePass123!',
          },
        ],
      },
      response: {
        200: {
          description: 'Login successful',
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' },
                phone: { type: 'string', nullable: true },
                isEmailVerified: { type: 'boolean' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
            token: { type: 'string', description: 'JWT access token' },
          },
          examples: [
            {
              user: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                email: 'owner@example.com',
                phone: '+34612345678',
                isEmailVerified: true,
                createdAt: '2026-01-18T12:00:00.000Z',
              },
              token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          ],
        },
        401: {
          description: 'Invalid credentials',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Invalid credentials',
              statusCode: 401,
              code: 'UNAUTHORIZED',
            },
          ],
        },
      },
    },
    handler: AuthController.login,
  });

  // GET /api/v1/auth/me - Get current user (protected)
  app.get('/me', {
    preHandler: authMiddleware,
    schema: {
      description: 'Get current authenticated user',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'Current user data',
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' },
                phone: { type: 'string', nullable: true },
                isEmailVerified: { type: 'boolean' },
                createdAt: { type: 'string', format: 'date-time' },
                roles: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      role: { type: 'string', enum: ['OWNER', 'TENANT'] },
                    },
                  },
                },
              },
            },
          },
          examples: [
            {
              user: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                email: 'owner@example.com',
                phone: '+34612345678',
                isEmailVerified: true,
                createdAt: '2026-01-18T12:00:00.000Z',
                roles: [{ role: 'OWNER' }, { role: 'TENANT' }],
              },
            },
          ],
        },
        401: {
          description: 'Unauthorized - Invalid or missing token',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Invalid or expired token',
              statusCode: 401,
              code: 'UNAUTHORIZED',
            },
          ],
        },
      },
    },
    handler: AuthController.me,
  });

  // POST /api/v1/auth/verify-email - Verify email with token
  app.post('/verify-email', {
    config: { rateLimit: authRateLimit },
    schema: {
      description: 'Verify email address using token sent to email',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['token'],
        properties: {
          token: { type: 'string', description: 'Verification token from email' },
        },
        examples: [{ token: 'a1b2c3d4e5f6...' }],
      },
      response: {
        200: {
          description: 'Email verified successfully',
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
          examples: [{ message: 'Email successfully verified' }],
        },
        400: {
          description: 'Invalid or expired token',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Invalid or expired verification token',
              statusCode: 400,
              code: 'BAD_REQUEST',
            },
          ],
        },
      },
    },
    handler: AuthController.verifyEmail,
  });

  // POST /api/v1/auth/resend-verification - Resend verification email
  app.post('/resend-verification', {
    config: { rateLimit: authRateLimit },
    schema: {
      description: 'Resend email verification link',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email', description: 'Email address to verify' },
        },
        examples: [{ email: 'user@example.com' }],
      },
      response: {
        200: {
          description: 'Verification email sent (if account exists)',
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
          examples: [{ message: 'If the email exists, a verification link has been sent' }],
        },
        400: {
          description: 'Email already verified',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Email is already verified',
              statusCode: 400,
              code: 'BAD_REQUEST',
            },
          ],
        },
      },
    },
    handler: AuthController.resendVerification,
  });

  // POST /api/v1/auth/request-password-reset - Request password reset
  app.post('/request-password-reset', {
    config: { rateLimit: authRateLimit },
    schema: {
      description: 'Request a password reset link via email',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email', description: 'Account email address' },
        },
        examples: [{ email: 'user@example.com' }],
      },
      response: {
        200: {
          description: 'Reset email sent (if account exists)',
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
          examples: [{ message: 'If the email exists, a password reset link has been sent' }],
        },
      },
    },
    handler: AuthController.requestPasswordReset,
  });

  // POST /api/v1/auth/otp/send - Send OTP to phone number
  app.post('/otp/send', {
    config: { rateLimit: authRateLimit },
    schema: {
      description: 'Send OTP code to phone number via SMS',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['phone'],
        properties: {
          phone: {
            type: 'string',
            pattern: '^\\+[1-9]\\d{6,14}$',
            description: 'Phone number in E.164 format (e.g., +34612345678)',
          },
        },
        examples: [{ phone: '+34612345678' }],
      },
      response: {
        200: {
          description: 'OTP sent successfully',
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
          examples: [{ message: 'OTP sent successfully' }],
        },
        400: {
          description: 'Invalid phone format',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Validation error',
              statusCode: 400,
              code: 'VALIDATION_ERROR',
              details: { fields: ['phone: Invalid phone format'] },
            },
          ],
        },
        503: {
          description: 'OTP service unavailable',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Failed to send OTP. Please try again later.',
              statusCode: 503,
              code: 'SERVICE_UNAVAILABLE',
            },
          ],
        },
      },
    },
    handler: AuthController.sendOtp,
  });

  // POST /api/v1/auth/otp/verify - Verify OTP and login/register
  app.post('/otp/verify', {
    config: { rateLimit: authRateLimit },
    schema: {
      description: 'Verify OTP code and login or register user',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['phone', 'code'],
        properties: {
          phone: {
            type: 'string',
            pattern: '^\\+[1-9]\\d{6,14}$',
            description: 'Phone number in E.164 format',
          },
          code: {
            type: 'string',
            minLength: 6,
            maxLength: 6,
            description: '6-digit OTP code',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Email for new user (optional)',
          },
          role: {
            type: 'string',
            enum: ['OWNER', 'TENANT'],
            description: 'Role for new user (defaults to TENANT)',
          },
        },
        examples: [
          { phone: '+34612345678', code: '123456' },
          {
            phone: '+34612345678',
            code: '123456',
            email: 'user@example.com',
            role: 'OWNER',
          },
        ],
      },
      response: {
        200: {
          description: 'OTP verified, user logged in or registered',
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string' },
                phone: { type: 'string' },
                isEmailVerified: { type: 'boolean' },
                isPhoneVerified: { type: 'boolean' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
            token: { type: 'string', description: 'JWT access token' },
            isNewUser: { type: 'boolean', description: 'Whether a new account was created' },
          },
        },
        400: {
          description: 'Validation error',
          ...errorResponseSchema,
        },
        401: {
          description: 'Invalid or expired OTP',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Invalid or expired OTP code',
              statusCode: 401,
              code: 'UNAUTHORIZED',
            },
          ],
        },
        409: {
          description: 'Email already in use',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Email already in use',
              statusCode: 409,
              code: 'CONFLICT',
            },
          ],
        },
      },
    },
    handler: AuthController.verifyOtp,
  });

  // POST /api/v1/auth/reset-password - Reset password with token
  app.post('/reset-password', {
    config: { rateLimit: authRateLimit },
    schema: {
      description: 'Reset password using token from email',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['token', 'password'],
        properties: {
          token: { type: 'string', description: 'Reset token from email' },
          password: {
            type: 'string',
            minLength: 8,
            description: 'New password (min 8 characters)',
          },
        },
        examples: [{ token: 'a1b2c3d4e5f6...', password: 'NewSecurePass123!' }],
      },
      response: {
        200: {
          description: 'Password reset successfully',
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
          examples: [{ message: 'Password successfully reset' }],
        },
        400: {
          description: 'Invalid or expired token',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Invalid or expired reset token',
              statusCode: 400,
              code: 'BAD_REQUEST',
            },
          ],
        },
      },
    },
    handler: AuthController.resetPassword,
  });
}
