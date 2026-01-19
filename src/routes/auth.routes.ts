import { FastifyInstance } from 'fastify';
import { AuthController } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { config } from '../config.js';

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
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'object' },
          },
          examples: [
            {
              error: 'Validation failed',
              details: { password: ['Password must be at least 8 characters'] },
            },
          ],
        },
        409: {
          description: 'Email already registered',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
          examples: [{ error: 'Email already registered' }],
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
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
          examples: [{ error: 'Invalid email or password' }],
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
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
          examples: [{ error: 'Invalid or expired token' }],
        },
      },
    },
    handler: AuthController.me,
  });
}
