import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db/client.js';

// Mock AIService to avoid real Claude API calls in tests
vi.mock('../src/services/ai.service.js', () => ({
  AIService: {
    verifyDocument: vi.fn(async (fileUrl: string, documentType: string) => {
      // Return mock data based on document type
      switch (documentType) {
        case 'ID':
        case 'NIE_TIE':
          return {
            fullName: 'John Doe',
            documentNumber: 'X1234567Y',
            dateOfBirth: '1990-01-15',
            nationality: 'Spanish',
            expirationDate: '2030-12-31',
            documentType: 'NIE',
          };
        case 'PAYSLIP':
          return {
            employerName: 'Tech Company SL',
            employeeName: 'John Doe',
            monthlyGrossIncome: 3500.0,
            monthlyNetIncome: 2800.0,
            paymentDate: '2024-01-31',
            employmentStatus: 'FULL_TIME',
            currency: 'EUR',
          };
        case 'BANK_STATEMENT':
          return {
            accountHolder: 'John Doe',
            accountNumber: '1234',
            accountBalance: 15000.0,
            monthlyIncome: 2800.0,
            statementPeriod: 'January 2024',
            currency: 'EUR',
            largeTransactions: [],
          };
        default:
          return {
            extracted: 'data',
          };
      }
    }),
  },
}));

describe('AI Document Verification API', () => {
  let app: FastifyInstance;
  let authToken: string;
  let userId: string;
  let documentId: string;

  beforeAll(async () => {
    console.log('🧪 Setting up AI verification test environment...');
    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    console.log('✅ AI verification tests completed, cleaning up...');
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up database (comprehensive order)
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

    // Use unique email with timestamp to avoid conflicts across test runs
    const timestamp = Date.now();

    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: `tenant-${timestamp}@test.com`,
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

    // Create a test document
    const doc = await prisma.document.create({
      data: {
        userId,
        type: 'ID',
        fileName: 'test-dni.pdf',
        fileUrl: 'https://example.com/test-dni.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        status: 'PENDING',
      },
    });
    documentId = doc.id;
  });

  describe('POST /api/v1/documents/:id/verify', () => {
    it('should verify DNI/NIE document and extract data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/documents/${documentId}/verify`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      // Check response structure
      expect(body).toHaveProperty('id', documentId);
      expect(body).toHaveProperty('status', 'VERIFIED');
      expect(body).toHaveProperty('verificationData');

      // Check extracted data for DNI/NIE
      const verificationData = body.verificationData;
      expect(verificationData).toHaveProperty('fullName');
      expect(verificationData).toHaveProperty('documentNumber');
      expect(verificationData).toHaveProperty('dateOfBirth');
      expect(verificationData).toHaveProperty('nationality');
      expect(verificationData).toHaveProperty('expirationDate');
    });

    it('should verify payslip and extract income data', async () => {
      // Create payslip document
      const payslip = await prisma.document.create({
        data: {
          userId,
          type: 'PAYSLIP',
          fileName: 'payslip.pdf',
          fileUrl: 'https://example.com/payslip.pdf',
          mimeType: 'application/pdf',
          fileSize: 2048,
          status: 'PENDING',
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/documents/${payslip.id}/verify`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.status).toBe('VERIFIED');
      expect(body.verificationData).toHaveProperty('employerName');
      expect(body.verificationData).toHaveProperty('monthlyGrossIncome');
      expect(body.verificationData).toHaveProperty('monthlyNetIncome');
      expect(body.verificationData).toHaveProperty('employmentStatus');
    });

    it('should verify bank statement and extract data', async () => {
      // Create bank statement document
      const bankStatement = await prisma.document.create({
        data: {
          userId,
          type: 'BANK_STATEMENT',
          fileName: 'bank-statement.pdf',
          fileUrl: 'https://example.com/bank-statement.pdf',
          mimeType: 'application/pdf',
          fileSize: 3072,
          status: 'PENDING',
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/documents/${bankStatement.id}/verify`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.status).toBe('VERIFIED');
      expect(body.verificationData).toHaveProperty('accountBalance');
      expect(body.verificationData).toHaveProperty('monthlyIncome');
    });

    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/documents/${documentId}/verify`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 for non-existent document', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/documents/${fakeId}/verify`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 when verifying other user document', async () => {
      // Create another user
      const otherUser = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'other@example.com',
          password: 'SecurePass123!',
          phone: '+34698765432',
          role: 'TENANT',
        },
      });

      const otherBody = JSON.parse(otherUser.body);

      // Create document for other user
      const otherDoc = await prisma.document.create({
        data: {
          userId: otherBody.user.id,
          type: 'ID',
          fileName: 'other-dni.pdf',
          fileUrl: 'https://example.com/other-dni.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
          status: 'PENDING',
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/documents/${otherDoc.id}/verify`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 400 if document already verified', async () => {
      // Mark document as verified
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'VERIFIED' },
      });

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/documents/${documentId}/verify`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('already verified');
    });
  });

  describe('GET /api/v1/documents/:id', () => {
    it('should return document with verification data if verified', async () => {
      // Verify document first
      await app.inject({
        method: 'POST',
        url: `/api/v1/documents/${documentId}/verify`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      // Get document
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/documents/${documentId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('VERIFIED');
      expect(body.verificationData).toBeDefined();
    });
  });
});
