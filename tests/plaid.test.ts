import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { FastifyInstance } from 'fastify';
import { prisma } from '../src/db/client.js';

// Mock Plaid SDK
vi.mock('plaid', () => {
  const mockLinkToken = 'link-sandbox-test-token';
  const mockAccessToken = 'access-sandbox-test-token';
  const mockItemId = 'item-sandbox-test-id';

  const mockPaystub = {
    employer: { name: 'Acme Corp' },
    net_pay: { current_amount: 4500 },
    pay_period_details: { pay_frequency: 'MONTHLY' },
  };

  return {
    Configuration: vi.fn().mockImplementation(() => ({})),
    PlaidApi: vi.fn().mockImplementation(() => ({
      linkTokenCreate: vi.fn().mockResolvedValue({
        data: { link_token: mockLinkToken },
      }),
      itemPublicTokenExchange: vi.fn().mockResolvedValue({
        data: {
          access_token: mockAccessToken,
          item_id: mockItemId,
        },
      }),
      incomeVerificationPaystubsGet: vi.fn().mockResolvedValue({
        data: {
          paystubs: [mockPaystub, mockPaystub, mockPaystub],
        },
      }),
      itemRemove: vi.fn().mockResolvedValue({ data: {} }),
    })),
    PlaidEnvironments: {
      sandbox: 'https://sandbox.plaid.com',
      development: 'https://development.plaid.com',
      production: 'https://production.plaid.com',
    },
    Products: {
      Income: 'income',
    },
    CountryCode: {
      Es: 'ES',
      Us: 'US',
    },
  };
});

describe('Plaid API', () => {
  let app: FastifyInstance;
  let _ownerUserId: string;
  let ownerToken: string;
  let _tenantUserId: string;
  let tenantProfileId: string;
  let tenantToken: string;

  beforeAll(async () => {
    console.log('🧪 Setting up Plaid API test environment...');
    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    console.log('✅ Plaid tests completed, cleaning up...');
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    console.log('🧪 Setting up plaid test data...');

    // Clean up in correct order
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

    // Use unique email with timestamp to avoid conflicts
    const timestamp = Date.now();
    const ownerEmail = `plaid-owner-${timestamp}@test.com`;
    const tenantEmail = `plaid-tenant-${timestamp}@test.com`;

    // Create owner user via API
    const ownerRegisterResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: ownerEmail,
        password: 'SecurePass123!',
        phone: `+3461111${timestamp.toString().slice(-4)}`,
        role: 'OWNER',
      },
    });

    if (ownerRegisterResponse.statusCode !== 201) {
      throw new Error(`Failed to register owner: ${ownerRegisterResponse.body}`);
    }

    const ownerRegisterBody = JSON.parse(ownerRegisterResponse.body);
    ownerToken = ownerRegisterBody.token;
    _ownerUserId = ownerRegisterBody.user?.id;

    // Create owner profile via API
    await app.inject({
      method: 'POST',
      url: '/api/v1/profiles/owner',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        firstName: 'Plaid',
        lastName: 'Owner',
        documentType: 'DNI',
        documentNumber: '12345678A',
      },
    });

    // Create tenant user via API
    const tenantRegisterResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: tenantEmail,
        password: 'SecurePass123!',
        phone: `+3462222${timestamp.toString().slice(-4)}`,
        role: 'TENANT',
      },
    });

    if (tenantRegisterResponse.statusCode !== 201) {
      throw new Error(`Failed to register tenant: ${tenantRegisterResponse.body}`);
    }

    const tenantRegisterBody = JSON.parse(tenantRegisterResponse.body);
    tenantToken = tenantRegisterBody.token;
    _tenantUserId = tenantRegisterBody.user?.id;

    // Create tenant profile via API
    const tenantProfileResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/profiles/tenant',
      headers: { authorization: `Bearer ${tenantToken}` },
      payload: {
        firstName: 'Plaid',
        lastName: 'Tenant',
        documentType: 'NIE',
        documentNumber: 'X1234567A',
        monthlyIncome: 3500,
        occupation: 'EMPLOYED',
      },
    });

    const tenantProfileBody = JSON.parse(tenantProfileResponse.body);
    tenantProfileId = tenantProfileBody.id;

    console.log('✅ Plaid test data created');
  });

  describe('POST /api/v1/plaid/link-token', () => {
    it('should create link token for tenant', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/plaid/link-token',
        headers: { Authorization: `Bearer ${tenantToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.linkToken).toBeDefined();
      expect(body.linkToken).toBe('link-sandbox-test-token');
    });

    it('should reject owner from creating link token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/plaid/link-token',
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/plaid/link-token',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/plaid/exchange-token', () => {
    it('should exchange public token successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/plaid/exchange-token',
        headers: { Authorization: `Bearer ${tenantToken}` },
        payload: {
          publicToken: 'public-sandbox-test-token',
          institutionId: 'ins_123',
          institutionName: 'Test Bank',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.institutionName).toBe('Test Bank');

      // Verify tenant profile was updated
      const profile = await prisma.tenantProfile.findUnique({
        where: { id: tenantProfileId },
      });
      expect(profile?.plaidItemId).toBe('item-sandbox-test-id');
      expect(profile?.plaidInstitutionName).toBe('Test Bank');
      expect(profile?.incomeVerifiedViaPlaid).toBe(true);
    });

    it('should reject missing public token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/plaid/exchange-token',
        headers: { Authorization: `Bearer ${tenantToken}` },
        payload: {
          institutionId: 'ins_123',
          institutionName: 'Test Bank',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject owner from exchanging token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/plaid/exchange-token',
        headers: { Authorization: `Bearer ${ownerToken}` },
        payload: {
          publicToken: 'public-sandbox-test-token',
          institutionId: 'ins_123',
          institutionName: 'Test Bank',
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /api/v1/plaid/status', () => {
    it('should return not connected status initially', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/plaid/status',
        headers: { Authorization: `Bearer ${tenantToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.isConnected).toBe(false);
      expect(body.institutionName).toBeNull();
      expect(body.incomeVerified).toBe(false);
    });

    it('should return connected status after exchange', async () => {
      // First exchange token
      await app.inject({
        method: 'POST',
        url: '/api/v1/plaid/exchange-token',
        headers: { Authorization: `Bearer ${tenantToken}` },
        payload: {
          publicToken: 'public-sandbox-test-token',
          institutionId: 'ins_123',
          institutionName: 'Test Bank',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/plaid/status',
        headers: { Authorization: `Bearer ${tenantToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.isConnected).toBe(true);
      expect(body.institutionName).toBe('Test Bank');
      expect(body.incomeVerified).toBe(true);
      expect(body.verifiedMonthlyIncome).toBe(4500);
    });

    it('should reject owner from accessing status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/plaid/status',
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /api/v1/plaid/income', () => {
    it('should return not verified income when not connected', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/plaid/income',
        headers: { Authorization: `Bearer ${tenantToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.isVerified).toBe(false);
      expect(body.monthlyIncome).toBeNull();
    });

    it('should return verified income after exchange', async () => {
      // First exchange token
      await app.inject({
        method: 'POST',
        url: '/api/v1/plaid/exchange-token',
        headers: { Authorization: `Bearer ${tenantToken}` },
        payload: {
          publicToken: 'public-sandbox-test-token',
          institutionId: 'ins_123',
          institutionName: 'Test Bank',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/plaid/income',
        headers: { Authorization: `Bearer ${tenantToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.isVerified).toBe(true);
      expect(body.institutionName).toBe('Test Bank');
      expect(body.monthlyIncome).toBe(4500);
      expect(body.incomeStreams).toBeInstanceOf(Array);
    });

    it('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/plaid/income',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/v1/plaid/disconnect', () => {
    it('should fail to disconnect when not connected', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/plaid/disconnect',
        headers: { Authorization: `Bearer ${tenantToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should disconnect successfully when connected', async () => {
      // First exchange token
      await app.inject({
        method: 'POST',
        url: '/api/v1/plaid/exchange-token',
        headers: { Authorization: `Bearer ${tenantToken}` },
        payload: {
          publicToken: 'public-sandbox-test-token',
          institutionId: 'ins_123',
          institutionName: 'Test Bank',
        },
      });

      // Verify connected
      const statusBefore = await app.inject({
        method: 'GET',
        url: '/api/v1/plaid/status',
        headers: { Authorization: `Bearer ${tenantToken}` },
      });
      expect(statusBefore.json().isConnected).toBe(true);

      // Disconnect
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/plaid/disconnect',
        headers: { Authorization: `Bearer ${tenantToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);

      // Verify disconnected
      const statusAfter = await app.inject({
        method: 'GET',
        url: '/api/v1/plaid/status',
        headers: { Authorization: `Bearer ${tenantToken}` },
      });
      expect(statusAfter.json().isConnected).toBe(false);
    });

    it('should reject owner from disconnecting', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/plaid/disconnect',
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('POST /api/v1/plaid/webhook', () => {
    it('should handle income verification webhook', async () => {
      // First connect Plaid
      await app.inject({
        method: 'POST',
        url: '/api/v1/plaid/exchange-token',
        headers: { Authorization: `Bearer ${tenantToken}` },
        payload: {
          publicToken: 'public-sandbox-test-token',
          institutionId: 'ins_123',
          institutionName: 'Test Bank',
        },
      });

      // Get the item_id from the profile
      const profile = await prisma.tenantProfile.findUnique({
        where: { id: tenantProfileId },
      });

      const webhookPayload = {
        webhook_type: 'INCOME',
        webhook_code: 'INCOME_VERIFICATION_STATUS_UPDATED',
        item_id: profile?.plaidItemId,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/plaid/webhook',
        payload: webhookPayload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().received).toBe(true);
    });

    it('should handle item error webhook', async () => {
      const webhookPayload = {
        webhook_type: 'ITEM',
        webhook_code: 'ERROR',
        item_id: 'unknown-item-id',
        error: {
          error_type: 'ITEM_ERROR',
          error_code: 'ITEM_LOGIN_REQUIRED',
          error_message: 'The login credentials for this item have changed.',
        },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/plaid/webhook',
        payload: webhookPayload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().received).toBe(true);
    });

    it('should reject invalid webhook payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/plaid/webhook',
        payload: { invalid: 'data' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Scoring Integration with Plaid', () => {
    let applicationId: string;
    let listingId: string;

    beforeEach(async () => {
      // Create property
      const propertyResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/properties',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          address: {
            street: 'Calle Test',
            number: '123',
            city: 'Madrid',
            postalCode: '28001',
            province: 'Madrid',
            country: 'Spain',
          },
          propertyType: 'APARTMENT',
          totalArea: 75,
          roomCount: 3,
          furnished: 'FULLY',
        },
      });

      const propertyBody = JSON.parse(propertyResponse.body);
      const propertyId = propertyBody.id;

      // Create listing
      const listingResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/listings',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          propertyId,
          title: 'Beautiful apartment for rent',
          description: 'A great apartment in the city center',
          monthlyRent: 1200,
          depositAmount: 2400,
          minLeaseTermMonths: 12,
          availableFrom: '2026-02-01',
        },
      });

      const listingBody = JSON.parse(listingResponse.body);
      listingId = listingBody.id;

      // Publish listing
      await app.inject({
        method: 'POST',
        url: `/api/v1/listings/${listingId}/publish`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      // Create application
      const applicationResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/applications',
        headers: { authorization: `Bearer ${tenantToken}` },
        payload: {
          listingId,
          message: 'I am very interested in this property',
          proposedMoveInDate: '2026-02-01',
          proposedLeaseTermMonths: 12,
        },
      });

      const applicationBody = JSON.parse(applicationResponse.body);
      applicationId = applicationBody.id;
    });

    it('should score higher with Plaid-verified income', async () => {
      // Score without Plaid
      const scoringBefore = await app.inject({
        method: 'POST',
        url: `/api/v1/applications/${applicationId}/score`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      const scoreBefore = scoringBefore.json();

      // Connect Plaid
      await app.inject({
        method: 'POST',
        url: '/api/v1/plaid/exchange-token',
        headers: { Authorization: `Bearer ${tenantToken}` },
        payload: {
          publicToken: 'public-sandbox-test-token',
          institutionId: 'ins_123',
          institutionName: 'Test Bank',
        },
      });

      // Score with Plaid
      const scoringAfter = await app.inject({
        method: 'POST',
        url: `/api/v1/applications/${applicationId}/score`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      const scoreAfter = scoringAfter.json();

      // Plaid-verified income should give higher score
      expect(scoreAfter.incomeScore).toBeGreaterThanOrEqual(scoreBefore.incomeScore);
      expect(scoreAfter.verificationScore).toBeGreaterThan(scoreBefore.verificationScore);
      expect(scoreAfter.financialStabilityScore).toBeDefined();
      expect(scoreAfter.financialStabilityScore).toBeGreaterThan(0);

      // Notes should mention Plaid verification
      expect(scoreAfter.notes).toContain('Plaid');
    });

    it('should include financial stability score only when Plaid connected', async () => {
      // Score without Plaid
      const scoringWithout = await app.inject({
        method: 'POST',
        url: `/api/v1/applications/${applicationId}/score`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      const scoreWithout = scoringWithout.json();
      expect(scoreWithout.financialStabilityScore).toBeNull();

      // Connect Plaid and score again
      await app.inject({
        method: 'POST',
        url: '/api/v1/plaid/exchange-token',
        headers: { Authorization: `Bearer ${tenantToken}` },
        payload: {
          publicToken: 'public-sandbox-test-token',
          institutionId: 'ins_123',
          institutionName: 'Test Bank',
        },
      });

      const scoringWith = await app.inject({
        method: 'POST',
        url: `/api/v1/applications/${applicationId}/score`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      const scoreWith = scoringWith.json();
      expect(scoreWith.financialStabilityScore).not.toBeNull();
      expect(typeof scoreWith.financialStabilityScore).toBe('number');
    });
  });
});
