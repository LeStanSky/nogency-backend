import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth.service.js';

/**
 * Auth middleware to protect routes
 * Verifies JWT token and adds userId to request
 */
export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({
        error: 'Unauthorized - No token provided',
      });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = AuthService.verifyToken(token);

    if (!decoded) {
      return reply.code(401).send({
        error: 'Unauthorized - Invalid token',
      });
    }

    // Add userId to request
    request.userId = decoded.userId;
  } catch (error) {
    request.log.error(error);
    return reply.code(401).send({
      error: 'Unauthorized',
    });
  }
}
