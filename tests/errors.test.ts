import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { createApp } from '../src/app.js';
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  ConflictError,
  BadRequestError,
} from '../src/utils/errors.js';

console.log('🧪 Setting up test environment...');

describe('Centralized Error Handling', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
    console.log('✅ Tests completed, cleaning up...');
  });

  describe('Custom Error Classes', () => {
    it('should create AppError with correct properties', () => {
      const error = new AppError(500, 'Something went wrong', 'INTERNAL_ERROR');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Something went wrong');
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.isOperational).toBe(true);
    });

    it('should create NotFoundError with correct defaults', () => {
      const error = new NotFoundError('User not found');

      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('User not found');
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should create UnauthorizedError with correct defaults', () => {
      const error = new UnauthorizedError();

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Unauthorized');
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('should create ForbiddenError with correct defaults', () => {
      const error = new ForbiddenError('Access denied');

      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Access denied');
      expect(error.code).toBe('FORBIDDEN');
    });

    it('should create ValidationError with details', () => {
      const details = { email: ['Invalid email format'] };
      const error = new ValidationError('Validation failed', details);

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual(details);
    });

    it('should create ConflictError with correct defaults', () => {
      const error = new ConflictError('Email already exists');

      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Email already exists');
      expect(error.code).toBe('CONFLICT');
    });

    it('should create BadRequestError with correct defaults', () => {
      const error = new BadRequestError('Invalid input');

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('BAD_REQUEST');
    });
  });

  describe('Global Error Handler', () => {
    it('should return standardized error format for 404', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/nonexistent-endpoint',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('statusCode');
      expect(body.statusCode).toBe(404);
    });

    it('should return standardized error for invalid JSON body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: {
          'content-type': 'application/json',
        },
        payload: 'invalid json{',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('statusCode');
    });

    it('should return standardized error for validation failures', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'invalid-email',
          password: '123', // Too short
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('statusCode');
      expect(body.statusCode).toBe(400);
    });

    it('should return standardized error for unauthorized access', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        // No authorization header
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('statusCode');
      expect(body.statusCode).toBe(401);
    });

    it('should not expose stack traces in production', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/nonexistent-endpoint',
      });

      const body = JSON.parse(response.body);
      // Stack should only be present in development
      if (process.env.NODE_ENV === 'production') {
        expect(body).not.toHaveProperty('stack');
      }
    });
  });

  describe('Error Response Format', () => {
    it('should have consistent error structure', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'WrongPassword123!',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);

      // Required fields
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('statusCode');

      // Error should be a string message
      expect(typeof body.error).toBe('string');
      expect(typeof body.statusCode).toBe('number');
    });
  });
});
