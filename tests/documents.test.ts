import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db/client.js';

describe('Document Upload API', () => {
  let app: FastifyInstance;
  let authToken: string;
  let userId: string;
  let otherUserId: string;

  beforeAll(async () => {
    console.log('🧪 Setting up test environment...');
    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    console.log('✅ Tests completed, cleaning up...');
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up database before each test (comprehensive order)
    await prisma.payment.deleteMany();
    await prisma.depositRecord.deleteMany();
    await prisma.commissionRecord.deleteMany();
    await prisma.keyHandover.deleteMany();
    await prisma.leaseEvent.deleteMany();
    await prisma.leaseContract.deleteMany();
    await prisma.tenantScoring.deleteMany();
    await prisma.applicationDocument.deleteMany();
    await prisma.application.deleteMany();
    await prisma.viewingSlot.deleteMany();
    await prisma.listing.deleteMany();
    await prisma.propertyPhoto.deleteMany();
    await prisma.propertyDocument.deleteMany();
    await prisma.property.deleteMany();
    await prisma.document.deleteMany();
    await prisma.tenantProfile.deleteMany();
    await prisma.ownerProfile.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.user.deleteMany();

    // Use unique emails with timestamp to avoid conflicts across test runs
    const timestamp = Date.now();

    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: `testuser-${timestamp}@test.com`,
        password: 'SecurePass123!',
        phone: `+3461${timestamp.toString().slice(-7)}`,
        role: 'TENANT',
      },
    });

    if (registerResponse.statusCode !== 201) {
      throw new Error(`Failed to register user: ${registerResponse.body}`);
    }

    const registerBody = JSON.parse(registerResponse.body);
    authToken = registerBody.token;
    userId = registerBody.user.id;

    // Create second test user for authorization tests
    const otherRegisterResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: `otheruser-${timestamp}@test.com`,
        password: 'SecurePass123!',
        phone: `+3469${timestamp.toString().slice(-7)}`,
        role: 'TENANT',
      },
    });

    if (otherRegisterResponse.statusCode !== 201) {
      throw new Error(`Failed to register other user: ${otherRegisterResponse.body}`);
    }

    const otherRegisterBody = JSON.parse(otherRegisterResponse.body);
    otherUserId = otherRegisterBody.user.id;
  });

  describe('POST /api/v1/documents', () => {
    it('should upload a document successfully', async () => {
      // Create a test PDF file buffer
      const testPdfContent = Buffer.from('%PDF-1.4 test content');

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/documents',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          file: testPdfContent,
          type: 'ID',
          fileName: 'test-dni.pdf',
          mimeType: 'application/pdf',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('userId', userId);
      expect(body).toHaveProperty('type', 'ID');
      expect(body).toHaveProperty('fileName', 'test-dni.pdf');
      expect(body).toHaveProperty('fileUrl');
      expect(body).toHaveProperty('status', 'PENDING');
    });

    it('should return 401 without authentication', async () => {
      const testPdfContent = Buffer.from('%PDF-1.4 test content');

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/documents',
        payload: {
          file: testPdfContent,
          type: 'ID',
          fileName: 'test.pdf',
          mimeType: 'application/pdf',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 for invalid file type', async () => {
      const testContent = Buffer.from('invalid content');

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/documents',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          file: testContent,
          type: 'ID',
          fileName: 'test.exe',
          mimeType: 'application/x-msdownload',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
    });

    it('should return 413 for file too large (>10MB)', async () => {
      // Create a buffer larger than 10MB
      const largeFile = Buffer.alloc(11 * 1024 * 1024);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/documents',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          file: largeFile,
          type: 'ID',
          fileName: 'large-file.pdf',
          mimeType: 'application/pdf',
        },
      });

      expect(response.statusCode).toBe(413);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/documents',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          // Missing file and type
          fileName: 'test.pdf',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/documents', () => {
    beforeEach(async () => {
      // Create test documents for the user
      await prisma.document.createMany({
        data: [
          {
            userId,
            type: 'ID',
            fileName: 'dni.pdf',
            fileUrl: 'https://example.com/dni.pdf',
            mimeType: 'application/pdf',
            fileSize: 1024,
            status: 'PENDING',
          },
          {
            userId,
            type: 'BANK_STATEMENT',
            fileName: 'bank.pdf',
            fileUrl: 'https://example.com/bank.pdf',
            mimeType: 'application/pdf',
            fileSize: 2048,
            status: 'VERIFIED',
          },
          {
            userId: otherUserId,
            type: 'ID',
            fileName: 'other-dni.pdf',
            fileUrl: 'https://example.com/other-dni.pdf',
            mimeType: 'application/pdf',
            fileSize: 1024,
            status: 'PENDING',
          },
        ],
      });
    });

    it('should list all user documents', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/documents',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toBeInstanceOf(Array);
      expect(body).toHaveLength(2); // Only current user's documents
      expect(body[0]).toHaveProperty('type');
      expect(body[0]).toHaveProperty('fileName');
      expect(body[0]).toHaveProperty('status');
    });

    it('should return empty array if no documents', async () => {
      // Delete all documents first
      await prisma.document.deleteMany({ where: { userId } });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/documents',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toBeInstanceOf(Array);
      expect(body).toHaveLength(0);
    });

    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/documents',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/documents/:id', () => {
    let documentId: string;
    let otherUserDocumentId: string;

    beforeEach(async () => {
      // Create test document for current user
      const doc = await prisma.document.create({
        data: {
          userId,
          type: 'ID',
          fileName: 'dni.pdf',
          fileUrl: 'https://example.com/dni.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
          status: 'PENDING',
        },
      });
      documentId = doc.id;

      // Create document for other user
      const otherDoc = await prisma.document.create({
        data: {
          userId: otherUserId,
          type: 'ID',
          fileName: 'other-dni.pdf',
          fileUrl: 'https://example.com/other-dni.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
          status: 'PENDING',
        },
      });
      otherUserDocumentId = otherDoc.id;
    });

    it('should get document by id', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/documents/${documentId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('id', documentId);
      expect(body).toHaveProperty('userId', userId);
      expect(body).toHaveProperty('type', 'ID');
      expect(body).toHaveProperty('fileName', 'dni.pdf');
    });

    it('should return 404 for non-existent document', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/documents/${fakeId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 when accessing other user document', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/documents/${otherUserDocumentId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
    });

    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/documents/${documentId}`,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/v1/documents/:id', () => {
    let documentId: string;
    let otherUserDocumentId: string;

    beforeEach(async () => {
      // Create test document for current user
      const doc = await prisma.document.create({
        data: {
          userId,
          type: 'ID',
          fileName: 'dni.pdf',
          fileUrl: 'https://example.com/dni.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
          status: 'PENDING',
        },
      });
      documentId = doc.id;

      // Create document for other user
      const otherDoc = await prisma.document.create({
        data: {
          userId: otherUserId,
          type: 'ID',
          fileName: 'other-dni.pdf',
          fileUrl: 'https://example.com/other-dni.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
          status: 'PENDING',
        },
      });
      otherUserDocumentId = otherDoc.id;
    });

    it('should delete document successfully', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/documents/${documentId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('message');

      // Verify document was deleted
      const deletedDoc = await prisma.document.findUnique({
        where: { id: documentId },
      });
      expect(deletedDoc).toBeNull();
    });

    it('should return 404 for non-existent document', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/documents/${fakeId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 when deleting other user document', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/documents/${otherUserDocumentId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');

      // Verify document was NOT deleted
      const doc = await prisma.document.findUnique({
        where: { id: otherUserDocumentId },
      });
      expect(doc).not.toBeNull();
    });

    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/documents/${documentId}`,
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
