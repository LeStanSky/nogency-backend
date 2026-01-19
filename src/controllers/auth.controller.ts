import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth.service.js';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from '../schemas/auth.schema.js';
import { ZodError } from 'zod';
import {
  ValidationError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
} from '../utils/errors.js';

export class AuthController {
  /**
   * Register a new user
   * POST /api/v1/auth/register
   */
  static async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Validate request body
      const data = registerSchema.parse(request.body);

      // Register user
      const result = await AuthService.register(data);

      return reply.code(201).send(result);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Validation error', {
          fields: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        });
      }

      if (error instanceof Error) {
        if (error.message === 'Email already exists') {
          throw new ConflictError('Email already exists');
        }
      }

      throw error;
    }
  }

  /**
   * Login existing user
   * POST /api/v1/auth/login
   */
  static async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Validate request body
      const data = loginSchema.parse(request.body);

      // Login user
      const result = await AuthService.login(data.email, data.password);

      return reply.code(200).send(result);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Validation error', {
          fields: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        });
      }

      if (error instanceof Error) {
        if (error.message === 'Invalid credentials') {
          throw new UnauthorizedError('Invalid credentials');
        }
      }

      throw error;
    }
  }

  /**
   * Get current authenticated user
   * GET /api/v1/auth/me
   */
  static async me(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Get userId from request (set by auth middleware)
      const userId = request.userId;

      if (!userId) {
        throw new UnauthorizedError();
      }

      // Get user data
      const user = await AuthService.getUserById(userId);

      return reply.code(200).send({ user });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'User not found') {
          throw new NotFoundError('User not found');
        }
      }

      throw error;
    }
  }

  /**
   * Verify email with token
   * POST /api/v1/auth/verify-email
   */
  static async verifyEmail(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = verifyEmailSchema.parse(request.body);
      const result = await AuthService.verifyEmail(data.token);
      return reply.code(200).send(result);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Validation error', {
          fields: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        });
      }

      if (error instanceof Error) {
        if (error.message.includes('Invalid') || error.message.includes('expired')) {
          throw new BadRequestError(error.message);
        }
      }

      throw error;
    }
  }

  /**
   * Resend verification email
   * POST /api/v1/auth/resend-verification
   */
  static async resendVerification(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = resendVerificationSchema.parse(request.body);
      const result = await AuthService.resendVerificationEmail(data.email);
      return reply.code(200).send(result);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Validation error', {
          fields: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        });
      }

      if (error instanceof Error) {
        if (error.message.includes('already verified')) {
          throw new BadRequestError(error.message);
        }
      }

      throw error;
    }
  }

  /**
   * Request password reset
   * POST /api/v1/auth/request-password-reset
   */
  static async requestPasswordReset(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = requestPasswordResetSchema.parse(request.body);
      const result = await AuthService.requestPasswordReset(data.email);
      return reply.code(200).send(result);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Validation error', {
          fields: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        });
      }

      throw error;
    }
  }

  /**
   * Reset password with token
   * POST /api/v1/auth/reset-password
   */
  static async resetPassword(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = resetPasswordSchema.parse(request.body);
      const result = await AuthService.resetPassword(data.token, data.password);
      return reply.code(200).send(result);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Validation error', {
          fields: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        });
      }

      if (error instanceof Error) {
        if (error.message.includes('Invalid') || error.message.includes('expired')) {
          throw new BadRequestError(error.message);
        }
      }

      throw error;
    }
  }
}
