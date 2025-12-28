import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth.service.js';
import { registerSchema, loginSchema } from '../schemas/auth.schema.js';
import { ZodError } from 'zod';

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
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }

      if (error instanceof Error) {
        if (error.message === 'Email already exists') {
          return reply.code(409).send({
            error: 'Email already exists',
          });
        }
      }

      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal server error',
      });
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
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }

      if (error instanceof Error) {
        if (error.message === 'Invalid credentials') {
          return reply.code(401).send({
            error: 'Invalid credentials',
          });
        }
      }

      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal server error',
      });
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
        return reply.code(401).send({
          error: 'Unauthorized',
        });
      }

      // Get user data
      const user = await AuthService.getUserById(userId);

      return reply.code(200).send({ user });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'User not found') {
          return reply.code(404).send({
            error: 'User not found',
          });
        }
      }

      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  }
}
