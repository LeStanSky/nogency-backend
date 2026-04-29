import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { FastifyInstance } from 'fastify';
import { prisma } from '../src/db/client.js';

// Mock Stripe
vi.mock('stripe', () => {
  const mockPaymentIntent = {
    id: 'pi_test_123',
    client_secret: 'pi_test_123_secret_abc',
    amount: 240000,
    currency: 'eur',
    status: 'requires_payment_method',
    metadata: {},
  };

  return {
    default: vi.fn().mockImplementation(() => ({
      paymentIntents: {
        create: vi.fn().mockResolvedValue(mockPaymentIntent),
        retrieve: vi.fn().mockResolvedValue(mockPaymentIntent),
        update: vi.fn().mockResolvedValue(mockPaymentIntent),
      },
      webhooks: {
        constructEvent: vi.fn().mockImplementation((body, _sig, _secret) => {
          return JSON.parse(body);
        }),
      },
    })),
  };
});

describe('Payment API', () => {
  let app: FastifyInstance;
  let _ownerUserId: string;
  let _ownerProfileId: string;
  let ownerToken: string;
  let _tenantUserId: string;
  let _tenantProfileId: string;
  let tenantToken: string;
  let contractId: string;

  beforeAll(async () => {
    console.log('🧪 Setting up Payment API test environment...');
    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    console.log('✅ Payment tests completed, cleaning up...');
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    console.log('🧪 Setting up payment test data...');

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
    const ownerEmail = `payment-owner-${timestamp}@test.com`;
    const tenantEmail = `payment-tenant-${timestamp}@test.com`;

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
    const ownerProfileResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/profiles/owner',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        firstName: 'Payment',
        lastName: 'Owner',
        documentType: 'DNI',
        documentNumber: '12345678A',
      },
    });

    const ownerProfileBody = JSON.parse(ownerProfileResponse.body);
    _ownerProfileId = ownerProfileBody.id;

    // Create property via API
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

    // Create listing via API
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
    const listingId = listingBody.id;

    // Publish listing
    await app.inject({
      method: 'POST',
      url: `/api/v1/listings/${listingId}/publish`,
      headers: { authorization: `Bearer ${ownerToken}` },
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
        firstName: 'Payment',
        lastName: 'Tenant',
        documentType: 'NIE',
        documentNumber: 'X1234567A',
        monthlyIncome: 3500,
        occupation: 'EMPLOYED',
      },
    });

    const tenantProfileBody = JSON.parse(tenantProfileResponse.body);
    _tenantProfileId = tenantProfileBody.id;

    // Create application via API
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
    const applicationId = applicationBody.id;

    // Approve application
    await app.inject({
      method: 'PATCH',
      url: `/api/v1/applications/${applicationId}/status`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        status: 'APPROVED',
      },
    });

    // Create contract via API
    const contractResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/contracts',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        applicationId,
        startDate: '2026-02-01',
        endDate: '2027-02-01',
        monthlyRent: 1200,
        depositAmount: 2400,
        depositMonths: 2,
        paymentDueDay: 1,
        utilitiesResponsibility: 'TENANT',
      },
    });

    const contractBody = JSON.parse(contractResponse.body);
    contractId = contractBody.id;

    // Send contract for signing
    await app.inject({
      method: 'POST',
      url: `/api/v1/contracts/${contractId}/send-for-signing`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    // Sign contract as owner
    await app.inject({
      method: 'POST',
      url: `/api/v1/contracts/${contractId}/sign`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    // Sign contract as tenant
    await app.inject({
      method: 'POST',
      url: `/api/v1/contracts/${contractId}/sign`,
      headers: { authorization: `Bearer ${tenantToken}` },
    });

    console.log('✅ Payment test data created');
  });

  describe('POST /api/v1/payments/create-intent', () => {
    it('should create payment intent for deposit', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/create-intent',
        headers: { Authorization: `Bearer ${tenantToken}` },
        payload: {
          contractId,
          type: 'DEPOSIT',
          amount: 2400,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.clientSecret).toBeDefined();
      expect(body.paymentId).toBeDefined();
      expect(body.amount).toBe(2400);
    });

    it('should create payment intent for monthly rent', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/create-intent',
        headers: { Authorization: `Bearer ${tenantToken}` },
        payload: {
          contractId,
          type: 'RENT',
          amount: 1200,
          periodStart: '2026-02-01',
          periodEnd: '2026-02-28',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.clientSecret).toBeDefined();
      expect(body.amount).toBe(1200);
    });

    it('should reject if user is not tenant of contract', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/create-intent',
        headers: { Authorization: `Bearer ${ownerToken}` },
        payload: {
          contractId,
          type: 'DEPOSIT',
          amount: 2400,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should reject if contract does not exist', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/create-intent',
        headers: { Authorization: `Bearer ${tenantToken}` },
        payload: {
          contractId: '00000000-0000-0000-0000-000000000000',
          type: 'DEPOSIT',
          amount: 2400,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should reject invalid payment type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/create-intent',
        headers: { Authorization: `Bearer ${tenantToken}` },
        payload: {
          contractId,
          type: 'INVALID_TYPE',
          amount: 2400,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/create-intent',
        payload: {
          contractId,
          type: 'DEPOSIT',
          amount: 2400,
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/payments', () => {
    beforeEach(async () => {
      if (!contractId) {
        throw new Error('contractId is not defined');
      }

      // Create payments via API (create payment intents and mark as completed)
      const depositResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/create-intent',
        headers: { Authorization: `Bearer ${tenantToken}` },
        payload: {
          contractId,
          type: 'DEPOSIT',
          amount: 2400,
        },
      });

      if (depositResponse.statusCode === 201) {
        const depositBody = JSON.parse(depositResponse.body);
        // Simulate payment completion by updating status
        await prisma.payment.update({
          where: { id: depositBody.paymentId },
          data: {
            status: 'COMPLETED',
            paidAt: new Date('2026-01-25'),
            paymentMethod: 'CARD',
          },
        });
      }

      await app.inject({
        method: 'POST',
        url: '/api/v1/payments/create-intent',
        headers: { Authorization: `Bearer ${tenantToken}` },
        payload: {
          contractId,
          type: 'RENT',
          amount: 1200,
          periodStart: '2026-03-01',
          periodEnd: '2026-03-31',
        },
      });

      // Rent payment stays PENDING
    });

    it('should list payments for tenant', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/payments',
        headers: { Authorization: `Bearer ${tenantToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.payments).toBeInstanceOf(Array);
      expect(body.payments.length).toBe(2);
      expect(body.total).toBe(2);
    });

    it('should list payments for owner', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/payments',
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.payments).toBeInstanceOf(Array);
      expect(body.payments.length).toBe(2);
    });

    it('should filter payments by contract', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/payments?contractId=${contractId}`,
        headers: { Authorization: `Bearer ${tenantToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.payments.length).toBe(2);
    });

    it('should filter payments by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/payments?status=PENDING',
        headers: { Authorization: `Bearer ${tenantToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.payments.length).toBe(1);
      expect(body.payments[0].status).toBe('PENDING');
    });

    it('should filter payments by type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/payments?type=DEPOSIT',
        headers: { Authorization: `Bearer ${tenantToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.payments.length).toBe(1);
      expect(body.payments[0].type).toBe('DEPOSIT');
    });

    it('should paginate results', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/payments?page=1&limit=1',
        headers: { Authorization: `Bearer ${tenantToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.payments.length).toBe(1);
      expect(body.total).toBe(2);
      expect(body.page).toBe(1);
      expect(body.limit).toBe(1);
    });
  });

  describe('GET /api/v1/payments/:id', () => {
    let paymentId: string;

    beforeEach(async () => {
      if (!contractId) {
        throw new Error('contractId is not defined');
      }

      // Create payment via API
      const paymentResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/create-intent',
        headers: { Authorization: `Bearer ${tenantToken}` },
        payload: {
          contractId,
          type: 'DEPOSIT',
          amount: 2400,
        },
      });

      if (paymentResponse.statusCode !== 201) {
        throw new Error(`Failed to create payment: ${paymentResponse.body}`);
      }

      const paymentBody = JSON.parse(paymentResponse.body);
      paymentId = paymentBody.paymentId;

      // Mark as completed for testing
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'COMPLETED',
          paidAt: new Date('2026-01-25'),
          paymentMethod: 'CARD',
          transactionId: 'pi_test_payment',
        },
      });
    });

    it('should get payment by id for tenant', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/payments/${paymentId}`,
        headers: { Authorization: `Bearer ${tenantToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe(paymentId);
      expect(body.type).toBe('DEPOSIT');
      expect(body.amount).toBe('2400');
      expect(body.status).toBe('COMPLETED');
    });

    it('should get payment by id for owner', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/payments/${paymentId}`,
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe(paymentId);
    });

    it('should return 404 for non-existent payment', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/payments/00000000-0000-0000-0000-000000000000',
        headers: { Authorization: `Bearer ${tenantToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should deny access to unrelated user', async () => {
      // Create another user via API with unique email
      const timestamp = Date.now();
      const otherRegisterResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `other-user-${timestamp}@test.com`,
          password: 'SecurePass123!',
          phone: `+3465555${timestamp.toString().slice(-4)}`,
          role: 'TENANT',
        },
      });

      if (otherRegisterResponse.statusCode !== 201) {
        throw new Error(`Failed to register other user: ${otherRegisterResponse.body}`);
      }

      const otherRegisterBody = JSON.parse(otherRegisterResponse.body);
      const otherToken = otherRegisterBody.token;

      await app.inject({
        method: 'POST',
        url: '/api/v1/profiles/tenant',
        headers: { authorization: `Bearer ${otherToken}` },
        payload: {
          firstName: 'Other',
          lastName: 'User',
          documentType: 'NIE',
          documentNumber: 'Y9999999A',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/payments/${paymentId}`,
        headers: { Authorization: `Bearer ${otherToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('POST /api/v1/payments/webhook', () => {
    let paymentId: string;

    beforeEach(async () => {
      if (!contractId) {
        throw new Error('contractId is not defined');
      }

      // Create payment via API
      const paymentResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/create-intent',
        headers: { Authorization: `Bearer ${tenantToken}` },
        payload: {
          contractId,
          type: 'DEPOSIT',
          amount: 2400,
        },
      });

      if (paymentResponse.statusCode !== 201) {
        throw new Error(`Failed to create payment: ${paymentResponse.body}`);
      }

      const paymentBody = JSON.parse(paymentResponse.body);
      paymentId = paymentBody.paymentId;

      // Update transaction ID for webhook testing
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          transactionId: 'pi_webhook_test',
        },
      });
    });

    it('should handle payment_intent.succeeded webhook', async () => {
      const webhookPayload = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_webhook_test',
            amount: 240000,
            currency: 'eur',
            status: 'succeeded',
            metadata: {
              paymentId,
            },
          },
        },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/webhook',
        headers: {
          'stripe-signature': 'test_signature',
          'content-type': 'application/json',
        },
        payload: JSON.stringify(webhookPayload),
      });

      expect(response.statusCode).toBe(200);

      // Verify payment was updated
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
      });
      expect(payment?.status).toBe('COMPLETED');
      expect(payment?.paidAt).toBeDefined();
    });

    it('should handle payment_intent.payment_failed webhook', async () => {
      const webhookPayload = {
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_webhook_test',
            amount: 240000,
            currency: 'eur',
            status: 'failed',
            metadata: {
              paymentId,
            },
          },
        },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/webhook',
        headers: {
          'stripe-signature': 'test_signature',
          'content-type': 'application/json',
        },
        payload: JSON.stringify(webhookPayload),
      });

      expect(response.statusCode).toBe(200);

      // Verify payment was updated
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
      });
      expect(payment?.status).toBe('FAILED');
    });

    it('should ignore unknown webhook events', async () => {
      const webhookPayload = {
        type: 'customer.created',
        data: {
          object: {
            id: 'cus_test',
          },
        },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/webhook',
        headers: {
          'stripe-signature': 'test_signature',
          'content-type': 'application/json',
        },
        payload: JSON.stringify(webhookPayload),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().received).toBe(true);
    });
  });

  describe('GET /api/v1/contracts/:id/payments', () => {
    beforeEach(async () => {
      if (!contractId) {
        throw new Error('contractId is not defined');
      }

      // Create payments via API
      const depositResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/create-intent',
        headers: { Authorization: `Bearer ${tenantToken}` },
        payload: {
          contractId,
          type: 'DEPOSIT',
          amount: 2400,
        },
      });

      if (depositResponse.statusCode === 201) {
        const depositBody = JSON.parse(depositResponse.body);
        await prisma.payment.update({
          where: { id: depositBody.paymentId },
          data: {
            status: 'COMPLETED',
            paidAt: new Date('2026-01-25'),
          },
        });
      }

      await app.inject({
        method: 'POST',
        url: '/api/v1/payments/create-intent',
        headers: { Authorization: `Bearer ${tenantToken}` },
        payload: {
          contractId,
          type: 'RENT',
          amount: 1200,
          periodStart: '2026-03-01',
          periodEnd: '2026-03-31',
        },
      });
    });

    it('should list payments for specific contract', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/contracts/${contractId}/payments`,
        headers: { Authorization: `Bearer ${tenantToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.payments).toBeInstanceOf(Array);
      expect(body.payments.length).toBe(2);
    });

    it('should return empty array for contract without payments', async () => {
      // Delete all payments first
      await prisma.payment.deleteMany({ where: { contractId } });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/contracts/${contractId}/payments`,
        headers: { Authorization: `Bearer ${tenantToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.payments).toBeInstanceOf(Array);
      expect(body.payments.length).toBe(0);
    });
  });
});
