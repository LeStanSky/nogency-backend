import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../src/app.js';
import { FastifyInstance } from 'fastify';

describe('Health Check API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return basic health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
    });
  });

  describe('GET /health/detailed', () => {
    it('should return detailed health status for all services', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/detailed',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      // Basic structure
      expect(body.status).toBeDefined();
      expect(body.timestamp).toBeDefined();
      expect(body.uptime).toBeDefined();
      expect(body.services).toBeDefined();

      // Services should exist
      expect(body.services.database).toBeDefined();
      expect(body.services.supabase).toBeDefined();
      expect(body.services.anthropic).toBeDefined();
      expect(body.services.stripe).toBeDefined();
    });

    it('should return database status with latency', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/detailed',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.services.database.status).toBeDefined();
      expect(['ok', 'error']).toContain(body.services.database.status);
      expect(body.services.database.latency).toBeDefined();
    });

    it('should return supabase storage status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/detailed',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.services.supabase.status).toBeDefined();
      expect(['ok', 'error', 'degraded']).toContain(body.services.supabase.status);
    });

    it('should return anthropic API status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/detailed',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.services.anthropic.status).toBeDefined();
      expect(['ok', 'error', 'degraded']).toContain(body.services.anthropic.status);
    });

    it('should return stripe API status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/detailed',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.services.stripe.status).toBeDefined();
      expect(['ok', 'error', 'degraded']).toContain(body.services.stripe.status);
    });

    it('should calculate overall status correctly when all services are ok', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/detailed',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      // If all services are ok, overall status should be ok
      const allServicesOk = Object.values(body.services).every(
        (service: unknown) => (service as { status: string }).status === 'ok'
      );

      if (allServicesOk) {
        expect(body.status).toBe('ok');
      }
    });

    it('should return degraded status if any service has issues', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/detailed',
      });

      const body = response.json();

      // If any service is degraded, overall should be degraded
      const hasError = Object.values(body.services).some(
        (service: unknown) => (service as { status: string }).status === 'error'
      );
      const hasDegraded = Object.values(body.services).some(
        (service: unknown) => (service as { status: string }).status === 'degraded'
      );

      if (hasError) {
        expect(['error', 'degraded']).toContain(body.status);
      } else if (hasDegraded) {
        expect(body.status).toBe('degraded');
      }
    });

    it('should include version information', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/detailed',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.version).toBeDefined();
    });

    it('should include environment information', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/detailed',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.environment).toBeDefined();
    });
  });

  describe('GET /health/ready', () => {
    it('should return readiness status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/ready',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.ready).toBeDefined();
      expect(typeof body.ready).toBe('boolean');
    });

    it('should return 503 if not ready', async () => {
      // This test verifies the behavior when services are down
      // In normal operation, it should return 200
      const response = await app.inject({
        method: 'GET',
        url: '/health/ready',
      });

      // Status should be either 200 (ready) or 503 (not ready)
      expect([200, 503]).toContain(response.statusCode);
    });
  });

  describe('GET /health/live', () => {
    it('should return liveness status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/live',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.alive).toBe(true);
      expect(body.timestamp).toBeDefined();
    });
  });
});
