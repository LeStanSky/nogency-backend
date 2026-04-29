import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { createApp } from '../src/app.js';

describe('Rate Limiting', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Enable rate limiting explicitly for these tests
    app = await createApp({ enableRateLimit: true });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Global Rate Limiting', () => {
    it('should include rate limit headers in response', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('should decrement remaining count on each request', async () => {
      const response1 = await app.inject({
        method: 'GET',
        url: '/health',
      });

      const remaining1 = parseInt(response1.headers['x-ratelimit-remaining'] as string, 10);

      const response2 = await app.inject({
        method: 'GET',
        url: '/health',
      });

      const remaining2 = parseInt(response2.headers['x-ratelimit-remaining'] as string, 10);

      expect(remaining2).toBe(remaining1 - 1);
    });
  });

  describe('Auth Rate Limiting', () => {
    it('should have rate limit headers on auth endpoints', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'password123',
        },
      });

      // Even if login fails, rate limit headers should be present
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });

    it('should enforce stricter rate limit on auth endpoints', async () => {
      // Auth endpoints should have lower limit (10) compared to global (100)
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'password123',
        },
      });

      const limit = parseInt(response.headers['x-ratelimit-limit'] as string, 10);

      // Auth limit should be 10 (stricter than global 100)
      expect(limit).toBe(10);
    });
  });

  describe('Rate Limit Exceeded', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      // Create a new app instance with rate limiting enabled
      const testApp = await createApp({ enableRateLimit: true });

      // Make requests until limit is exceeded
      // Default auth limit is 10, so we need 11 requests
      const requests = [];
      for (let i = 0; i < 12; i++) {
        requests.push(
          testApp.inject({
            method: 'POST',
            url: '/api/v1/auth/login',
            payload: {
              email: 'test@example.com',
              password: 'password123',
            },
          })
        );
      }

      const responses = await Promise.all(requests);

      // At least one response should be 429
      const hasRateLimitExceeded = responses.some((r) => r.statusCode === 429);
      expect(hasRateLimitExceeded).toBe(true);

      // Rate limited response should have retry-after header
      const rateLimitedResponse = responses.find((r) => r.statusCode === 429);
      if (rateLimitedResponse) {
        expect(rateLimitedResponse.headers['retry-after']).toBeDefined();
      }

      await testApp.close();
    });
  });
});
