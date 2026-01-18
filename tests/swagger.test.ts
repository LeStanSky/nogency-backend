import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../src/app.js';
import { FastifyInstance } from 'fastify';

describe('Swagger API Documentation', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /docs', () => {
    it('should return Swagger UI HTML', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs',
      });

      // Swagger UI redirects or returns HTML
      expect([200, 302]).toContain(response.statusCode);
    });

    it('should serve Swagger UI static files', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs/static/index.html',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
    });
  });

  describe('GET /docs/json', () => {
    it('should return OpenAPI JSON spec', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs/json',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');

      const spec = response.json();
      expect(spec.openapi).toBe('3.0.0');
      expect(spec.info.title).toBe('NoGency AI API');
      expect(spec.info.version).toBe('1.0.0');
    });

    it('should include all API tags', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs/json',
      });

      const spec = response.json();
      const tagNames = spec.tags.map((t: { name: string }) => t.name);

      expect(tagNames).toContain('Auth');
      expect(tagNames).toContain('Profiles');
      expect(tagNames).toContain('Documents');
      expect(tagNames).toContain('Properties');
      expect(tagNames).toContain('Listings');
      expect(tagNames).toContain('Applications');
      expect(tagNames).toContain('Contracts');
      expect(tagNames).toContain('Payments');
      expect(tagNames).toContain('Health');
    });

    it('should include security scheme', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs/json',
      });

      const spec = response.json();
      expect(spec.components.securitySchemes.bearerAuth).toBeDefined();
      expect(spec.components.securitySchemes.bearerAuth.type).toBe('http');
      expect(spec.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
    });

    it('should document Auth endpoints', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs/json',
      });

      const spec = response.json();
      expect(spec.paths['/api/v1/auth/register']).toBeDefined();
      expect(spec.paths['/api/v1/auth/login']).toBeDefined();
      expect(spec.paths['/api/v1/auth/me']).toBeDefined();
    });

    it('should document Profile endpoints', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs/json',
      });

      const spec = response.json();
      expect(spec.paths['/api/v1/profiles/owner']).toBeDefined();
      expect(spec.paths['/api/v1/profiles/tenant']).toBeDefined();
      expect(spec.paths['/api/v1/profiles/me']).toBeDefined();
    });

    it('should document Health endpoints', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs/json',
      });

      const spec = response.json();
      expect(spec.paths['/health/detailed']).toBeDefined();
      expect(spec.paths['/health/ready']).toBeDefined();
      expect(spec.paths['/health/live']).toBeDefined();
    });
  });

  describe('GET /docs/yaml', () => {
    it('should return OpenAPI YAML spec', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs/yaml',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('yaml');
      expect(response.payload).toContain('openapi: 3.0.0');
    });
  });
});
