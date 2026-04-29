import Stripe from 'stripe';
import { prisma } from '../db/client.js';
import { config } from '../config.js';
import { CreatePaymentIntentInput, PaymentQueryInput } from '../schemas/payment.schema.js';
import { Prisma, PaymentType } from '@prisma/client';

const stripe = new Stripe(config.stripe.secretKey);

export class PaymentService {
  /**
   * Create a Stripe payment intent and record payment in DB
   */
  static async createPaymentIntent(tenantProfileId: string, input: CreatePaymentIntentInput) {
    // Get contract and verify tenant access
    const contract = await prisma.leaseContract.findUnique({
      where: { id: input.contractId },
      include: {
        tenant: true,
        owner: true,
      },
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    if (contract.tenantId !== tenantProfileId) {
      throw new Error('Only the tenant can create payments for this contract');
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(input.amount * 100), // Convert to cents
      currency: 'eur',
      metadata: {
        contractId: input.contractId,
        tenantId: tenantProfileId,
        ownerId: contract.ownerId,
        type: input.type,
      },
    });

    // Create payment record in DB
    const payment = await prisma.payment.create({
      data: {
        contractId: input.contractId,
        tenantId: tenantProfileId,
        ownerId: contract.ownerId,
        type: input.type,
        amount: input.amount,
        currency: 'EUR',
        status: 'PENDING',
        dueDate: new Date(),
        transactionId: paymentIntent.id,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      },
    });

    // Update payment intent metadata with paymentId
    await stripe.paymentIntents.update(paymentIntent.id, {
      metadata: {
        ...paymentIntent.metadata,
        paymentId: payment.id,
      },
    });

    return {
      paymentId: payment.id,
      clientSecret: paymentIntent.client_secret,
      amount: input.amount,
      currency: 'EUR',
    };
  }

  /**
   * Get payments for a user (owner or tenant)
   */
  static async getPayments(userId: string, query: PaymentQueryInput) {
    // Get user's profiles
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId },
    });

    const tenantProfile = await prisma.tenantProfile.findUnique({
      where: { userId },
    });

    const where: Prisma.PaymentWhereInput = {};

    // Filter by owner or tenant
    const orConditions: Array<{ ownerId?: string; tenantId?: string }> = [];
    if (ownerProfile) {
      orConditions.push({ ownerId: ownerProfile.id });
    }
    if (tenantProfile) {
      orConditions.push({ tenantId: tenantProfile.id });
    }

    if (orConditions.length === 0) {
      return { payments: [], total: 0, page: query.page, limit: query.limit };
    }

    where.OR = orConditions;

    // Apply filters
    if (query.status) {
      where.status = query.status;
    }
    if (query.type) {
      where.type = query.type as PaymentType;
    }
    if (query.contractId) {
      where.contractId = query.contractId;
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          contract: {
            include: {
              listing: {
                include: {
                  property: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      payments,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  /**
   * Get payment by ID
   */
  static async getPaymentById(paymentId: string, userId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        contract: {
          include: {
            listing: {
              include: {
                property: true,
              },
            },
          },
        },
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!payment) {
      return null;
    }

    // Check if user has access to this payment
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId },
    });

    const tenantProfile = await prisma.tenantProfile.findUnique({
      where: { userId },
    });

    const isOwner = ownerProfile && payment.ownerId === ownerProfile.id;
    const isTenant = tenantProfile && payment.tenantId === tenantProfile.id;

    if (!isOwner && !isTenant) {
      throw new Error('Access denied');
    }

    return payment;
  }

  /**
   * Get payments for a specific contract
   */
  static async getPaymentsByContract(contractId: string, userId: string) {
    // Verify user has access to the contract
    const contract = await prisma.leaseContract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId },
    });

    const tenantProfile = await prisma.tenantProfile.findUnique({
      where: { userId },
    });

    const isOwner = ownerProfile && contract.ownerId === ownerProfile.id;
    const isTenant = tenantProfile && contract.tenantId === tenantProfile.id;

    if (!isOwner && !isTenant) {
      throw new Error('Access denied');
    }

    const payments = await prisma.payment.findMany({
      where: { contractId },
      orderBy: { dueDate: 'desc' },
    });

    return { payments };
  }

  /**
   * Handle Stripe webhook events
   */
  static async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const paymentId = paymentIntent.metadata?.paymentId;

        if (paymentId) {
          await prisma.payment.update({
            where: { id: paymentId },
            data: {
              status: 'COMPLETED',
              paidAt: new Date(),
              paymentMethod: 'CARD',
            },
          });
        } else {
          // Try to find by transaction ID
          await prisma.payment.updateMany({
            where: { transactionId: paymentIntent.id },
            data: {
              status: 'COMPLETED',
              paidAt: new Date(),
              paymentMethod: 'CARD',
            },
          });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const paymentId = paymentIntent.metadata?.paymentId;

        if (paymentId) {
          await prisma.payment.update({
            where: { id: paymentId },
            data: {
              status: 'FAILED',
            },
          });
        } else {
          await prisma.payment.updateMany({
            where: { transactionId: paymentIntent.id },
            data: {
              status: 'FAILED',
            },
          });
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent as string;

        if (paymentIntentId) {
          await prisma.payment.updateMany({
            where: { transactionId: paymentIntentId },
            data: {
              status: 'REFUNDED',
            },
          });
        }
        break;
      }

      default:
        // Ignore unhandled event types
        break;
    }

    return { received: true };
  }

  /**
   * Verify Stripe webhook signature
   */
  static verifyWebhookSignature(payload: string, signature: string): Stripe.Event {
    return stripe.webhooks.constructEvent(payload, signature, config.stripe.webhookSecret);
  }
}
