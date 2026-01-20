import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { logger, RequestContext } from '../utils/logger.js';
import { addBreadcrumb, setTag, setUser } from '../utils/sentry.js';

declare module 'fastify' {
  interface FastifyRequest {
    requestContext: RequestContext;
  }
}

/**
 * Generate a unique request ID
 */
const generateRequestId = (): string => {
  return nanoid(12);
};

/**
 * Extract client IP from request
 */
const getClientIp = (request: FastifyRequest): string => {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return request.ip || 'unknown';
};

/**
 * Sanitize URL by removing sensitive query parameters
 */
const sanitizeUrl = (url: string): string => {
  try {
    const urlObj = new URL(url, 'http://localhost');
    const sensitiveParams = ['token', 'key', 'secret', 'password', 'apiKey'];
    sensitiveParams.forEach((param) => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '[REDACTED]');
      }
    });
    return urlObj.pathname + urlObj.search;
  } catch {
    return url;
  }
};

/**
 * Register logging hooks on Fastify instance
 */
export const registerLoggingHooks = (app: FastifyInstance) => {
  // Add request ID to every request
  app.addHook('onRequest', async (request: FastifyRequest, _reply: FastifyReply) => {
    const requestId = (request.headers['x-request-id'] as string) || generateRequestId();
    const sanitizedUrl = sanitizeUrl(request.url);

    // Create request context
    request.requestContext = {
      requestId,
      method: request.method,
      url: sanitizedUrl,
      ip: getClientIp(request),
    };

    // Set request ID header for client correlation
    _reply.header('x-request-id', requestId);

    // Add Sentry breadcrumb
    addBreadcrumb({
      category: 'http',
      message: `${request.method} ${sanitizedUrl}`,
      level: 'info',
      data: {
        requestId,
        method: request.method,
        url: sanitizedUrl,
      },
    });

    // Set Sentry tags
    setTag('request.id', requestId);
  });

  // Log request start
  app.addHook('preHandler', async (request: FastifyRequest, _reply: FastifyReply) => {
    // Add user context if authenticated
    if (request.user) {
      request.requestContext.userId = request.user.id;
      request.requestContext.userRole = request.user.roles?.[0];

      setUser({
        id: request.user.id,
        email: request.user.email,
        role: request.user.roles?.[0],
      });
    }

    // Log request (debug level for normal requests)
    logger.debug(
      {
        requestId: request.requestContext.requestId,
        method: request.method,
        url: request.requestContext.url,
        userId: request.requestContext.userId,
        userAgent: request.headers['user-agent'],
        ip: request.requestContext.ip,
      },
      `Incoming request: ${request.method} ${request.requestContext.url}`
    );
  });

  // Log response
  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const responseTime = reply.elapsedTime;
    const statusCode = reply.statusCode;

    const logData = {
      requestId: request.requestContext?.requestId,
      method: request.method,
      url: request.requestContext?.url || request.url,
      statusCode,
      responseTimeMs: Math.round(responseTime),
      userId: request.requestContext?.userId,
    };

    // Choose log level based on status code and response time
    if (statusCode >= 500) {
      logger.error(logData, `Request failed: ${request.method} ${request.url} - ${statusCode}`);
    } else if (statusCode >= 400) {
      logger.warn(logData, `Request error: ${request.method} ${request.url} - ${statusCode}`);
    } else if (responseTime > 3000) {
      logger.warn(logData, `Slow request: ${request.method} ${request.url} - ${responseTime}ms`);
    } else {
      logger.info(
        logData,
        `Request completed: ${request.method} ${request.url} - ${statusCode} in ${Math.round(responseTime)}ms`
      );
    }
  });

  // Log errors
  app.addHook('onError', async (request: FastifyRequest, _reply: FastifyReply, error: Error) => {
    logger.error(
      {
        requestId: request.requestContext?.requestId,
        method: request.method,
        url: request.requestContext?.url || request.url,
        userId: request.requestContext?.userId,
        error: {
          message: error.message,
          name: error.name,
          stack: error.stack,
        },
      },
      `Request error: ${error.message}`
    );
  });
};

/**
 * Middleware to log slow database queries (can be used with Prisma middleware)
 */
export const logSlowQuery = (
  operation: string,
  model: string | undefined,
  duration: number,
  args?: unknown
) => {
  const logData = {
    operation,
    model,
    durationMs: duration,
    ...(duration > 1000 && { args }),
  };

  if (duration > 5000) {
    logger.warn(logData, `Very slow database query: ${operation} on ${model} took ${duration}ms`);
  } else if (duration > 1000) {
    logger.info(logData, `Slow database query: ${operation} on ${model} took ${duration}ms`);
  }
};
