import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth.service.js';
import { UnauthorizedError } from '../utils/errors.js';
import { serviceLoggers } from '../utils/logger.js';

const log = serviceLoggers.auth;

/**
 * Auth middleware to protect routes
 * Verifies JWT token and adds userId to request
 */
export async function authMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = AuthService.verifyToken(token);

    if (!decoded) {
      throw new UnauthorizedError('Invalid token');
    }

    // Add userId to request
    request.userId = decoded.userId;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    log.warn({ error }, 'Token verification failed');
    throw new UnauthorizedError('Invalid or expired token');
  }
}
