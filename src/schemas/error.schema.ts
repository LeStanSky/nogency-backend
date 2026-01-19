/**
 * Standardized error response schemas for Swagger/OpenAPI documentation
 */

/**
 * Standard error response schema
 * Used across all endpoints for consistent error responses
 */
export const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string', description: 'Error message' },
    statusCode: { type: 'number', description: 'HTTP status code' },
    code: { type: 'string', description: 'Error code for programmatic handling' },
    details: {
      type: 'object',
      description: 'Additional error details (validation errors, etc.)',
      additionalProperties: true,
    },
  },
  required: ['error', 'statusCode'],
};

/**
 * Common error responses for reuse in route schemas
 */
export const commonErrorResponses = {
  400: {
    description: 'Bad Request - Invalid input data',
    ...errorResponseSchema,
    examples: [
      {
        error: 'Validation failed',
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        details: { fields: ['email: Invalid email format'] },
      },
    ],
  },
  401: {
    description: 'Unauthorized - Authentication required',
    ...errorResponseSchema,
    examples: [
      {
        error: 'No token provided',
        statusCode: 401,
        code: 'UNAUTHORIZED',
      },
      {
        error: 'Invalid or expired token',
        statusCode: 401,
        code: 'UNAUTHORIZED',
      },
    ],
  },
  403: {
    description: 'Forbidden - Access denied',
    ...errorResponseSchema,
    examples: [
      {
        error: 'You do not have permission to access this resource',
        statusCode: 403,
        code: 'FORBIDDEN',
      },
    ],
  },
  404: {
    description: 'Not Found - Resource not found',
    ...errorResponseSchema,
    examples: [
      {
        error: 'Resource not found',
        statusCode: 404,
        code: 'NOT_FOUND',
      },
    ],
  },
  409: {
    description: 'Conflict - Resource already exists',
    ...errorResponseSchema,
    examples: [
      {
        error: 'Email already exists',
        statusCode: 409,
        code: 'CONFLICT',
      },
    ],
  },
  429: {
    description: 'Too Many Requests - Rate limit exceeded',
    ...errorResponseSchema,
    examples: [
      {
        error: 'Too many requests, please try again later',
        statusCode: 429,
        code: 'TOO_MANY_REQUESTS',
      },
    ],
  },
  500: {
    description: 'Internal Server Error',
    ...errorResponseSchema,
    examples: [
      {
        error: 'Internal server error',
        statusCode: 500,
        code: 'INTERNAL_SERVER_ERROR',
      },
    ],
  },
};
