import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
  LinkTokenCreateRequest,
  ItemPublicTokenExchangeRequest,
  IncomeVerificationPaystubsGetRequest,
} from 'plaid';
import crypto from 'crypto';
import { prisma } from '../db/client.js';
import { config } from '../config.js';
import { ExchangeTokenInput, PlaidWebhookPayload } from '../schemas/plaid.schema.js';
import { serviceLoggers } from '../utils/logger.js';

const logger = serviceLoggers.plaid;

// Encryption key derived from JWT secret (use proper key management in production)
const ENCRYPTION_KEY = crypto.createHash('sha256').update(config.jwt.secret).digest();
const IV_LENGTH = 16;

/**
 * Encrypt sensitive token data using AES-256-CBC
 */
function encryptToken(token: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt sensitive token data
 */
function decryptToken(encryptedToken: string): string {
  const parts = encryptedToken.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Get Plaid environment from config
 */
function getPlaidEnvironment(): string {
  const env = config.plaid.env.toLowerCase();
  switch (env) {
    case 'production':
      return PlaidEnvironments.production;
    case 'development':
      return PlaidEnvironments.development;
    case 'sandbox':
    default:
      return PlaidEnvironments.sandbox;
  }
}

/**
 * Initialize Plaid client
 */
function createPlaidClient(): PlaidApi {
  const configuration = new Configuration({
    basePath: getPlaidEnvironment(),
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': config.plaid.clientId,
        'PLAID-SECRET': config.plaid.secret,
      },
    },
  });

  return new PlaidApi(configuration);
}

export class PlaidService {
  private static plaidClient = createPlaidClient();

  /**
   * Create a Link token for initializing Plaid Link
   */
  static async createLinkToken(userId: string): Promise<{ linkToken: string }> {
    // Get tenant profile to verify user is a tenant
    const tenantProfile = await prisma.tenantProfile.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!tenantProfile) {
      throw new Error('Tenant profile not found');
    }

    const request: LinkTokenCreateRequest = {
      user: {
        client_user_id: userId,
      },
      client_name: 'NoGency AI',
      products: [Products.Income],
      country_codes: [CountryCode.Es, CountryCode.Us],
      language: 'es',
      webhook: config.plaid.webhookUrl || undefined,
    };

    try {
      const response = await this.plaidClient.linkTokenCreate(request);
      logger.info({ userId }, 'Plaid Link token created');
      return { linkToken: response.data.link_token };
    } catch (error) {
      logger.error({ userId, error }, 'Failed to create Plaid Link token');
      throw new Error('Failed to create Plaid Link token');
    }
  }

  /**
   * Exchange public token for access token and store encrypted
   */
  static async exchangePublicToken(
    userId: string,
    input: ExchangeTokenInput
  ): Promise<{ success: boolean; institutionName: string }> {
    const tenantProfile = await prisma.tenantProfile.findUnique({
      where: { userId },
    });

    if (!tenantProfile) {
      throw new Error('Tenant profile not found');
    }

    const request: ItemPublicTokenExchangeRequest = {
      public_token: input.publicToken,
    };

    try {
      const response = await this.plaidClient.itemPublicTokenExchange(request);
      const accessToken = response.data.access_token;
      const itemId = response.data.item_id;

      // Encrypt and store the access token
      const encryptedToken = encryptToken(accessToken);

      await prisma.tenantProfile.update({
        where: { userId },
        data: {
          plaidAccessToken: encryptedToken,
          plaidItemId: itemId,
          plaidInstitutionName: input.institutionName,
          plaidVerifiedAt: new Date(),
        },
      });

      logger.info(
        { userId, institutionName: input.institutionName },
        'Plaid account connected successfully'
      );

      // Trigger income verification
      await this.fetchAndStoreIncome(userId);

      return { success: true, institutionName: input.institutionName };
    } catch (error) {
      logger.error({ userId, error }, 'Failed to exchange Plaid public token');
      throw new Error('Failed to connect bank account');
    }
  }

  /**
   * Fetch income data from Plaid and store in database
   */
  private static async fetchAndStoreIncome(userId: string): Promise<void> {
    const tenantProfile = await prisma.tenantProfile.findUnique({
      where: { userId },
    });

    if (!tenantProfile?.plaidAccessToken) {
      throw new Error('Plaid not connected');
    }

    try {
      const accessToken = decryptToken(tenantProfile.plaidAccessToken);

      // Get paystubs for income verification
      const request: IncomeVerificationPaystubsGetRequest = {
        access_token: accessToken,
      };

      const response = await this.plaidClient.incomeVerificationPaystubsGet(request);
      const paystubs = response.data.paystubs;

      // Calculate average monthly income from paystubs
      let totalIncome = 0;
      const incomeStreams: Array<{
        name: string | null;
        amount: number;
        frequency: string | null;
        confidence: number | null;
      }> = [];

      for (const paystub of paystubs) {
        const netPay = paystub.net_pay?.current_amount || 0;
        totalIncome += netPay;

        incomeStreams.push({
          name: paystub.employer?.name || null,
          amount: netPay,
          frequency: paystub.pay_period_details?.pay_frequency || null,
          confidence: null,
        });
      }

      // Calculate average monthly income (assuming paystubs are monthly)
      const monthlyIncome = paystubs.length > 0 ? totalIncome / paystubs.length : 0;

      // Store income data
      await prisma.tenantProfile.update({
        where: { userId },
        data: {
          incomeVerifiedViaPlaid: monthlyIncome > 0,
          plaidVerifiedMonthlyIncome: monthlyIncome > 0 ? monthlyIncome : null,
          plaidVerifiedAt: new Date(),
          plaidData: {
            incomeStreams,
            lastUpdated: new Date().toISOString(),
            paystubCount: paystubs.length,
          },
        },
      });

      logger.info(
        { userId, monthlyIncome, paystubCount: paystubs.length },
        'Plaid income data fetched and stored'
      );
    } catch (error) {
      logger.error({ userId, error }, 'Failed to fetch Plaid income data');
      // Don't throw - income verification is optional
    }
  }

  /**
   * Get income verification data for a user
   */
  static async getIncome(userId: string) {
    const tenantProfile = await prisma.tenantProfile.findUnique({
      where: { userId },
    });

    if (!tenantProfile) {
      throw new Error('Tenant profile not found');
    }

    if (!tenantProfile.plaidAccessToken) {
      return {
        isVerified: false,
        institutionName: null,
        verifiedAt: null,
        monthlyIncome: null,
        incomeStreams: [],
        accountBalance: null,
      };
    }

    const plaidData = tenantProfile.plaidData as {
      incomeStreams?: Array<{
        name: string | null;
        amount: number;
        frequency: string | null;
        confidence: number | null;
      }>;
      accountBalance?: number;
    } | null;

    return {
      isVerified: tenantProfile.incomeVerifiedViaPlaid,
      institutionName: tenantProfile.plaidInstitutionName,
      verifiedAt: tenantProfile.plaidVerifiedAt,
      monthlyIncome: tenantProfile.plaidVerifiedMonthlyIncome
        ? Number(tenantProfile.plaidVerifiedMonthlyIncome)
        : null,
      incomeStreams: plaidData?.incomeStreams || [],
      accountBalance: plaidData?.accountBalance || null,
    };
  }

  /**
   * Get Plaid connection status
   */
  static async getStatus(userId: string) {
    const tenantProfile = await prisma.tenantProfile.findUnique({
      where: { userId },
    });

    if (!tenantProfile) {
      throw new Error('Tenant profile not found');
    }

    return {
      isConnected: !!tenantProfile.plaidAccessToken,
      institutionName: tenantProfile.plaidInstitutionName,
      verifiedAt: tenantProfile.plaidVerifiedAt,
      incomeVerified: tenantProfile.incomeVerifiedViaPlaid,
      verifiedMonthlyIncome: tenantProfile.plaidVerifiedMonthlyIncome
        ? Number(tenantProfile.plaidVerifiedMonthlyIncome)
        : null,
    };
  }

  /**
   * Disconnect Plaid account
   */
  static async disconnect(userId: string): Promise<{ success: boolean }> {
    const tenantProfile = await prisma.tenantProfile.findUnique({
      where: { userId },
    });

    if (!tenantProfile) {
      throw new Error('Tenant profile not found');
    }

    if (!tenantProfile.plaidAccessToken) {
      throw new Error('Plaid is not connected');
    }

    try {
      // Remove item from Plaid
      const accessToken = decryptToken(tenantProfile.plaidAccessToken);
      await this.plaidClient.itemRemove({ access_token: accessToken });
    } catch (error) {
      // Log error but continue with local cleanup
      logger.warn({ userId, error }, 'Failed to remove item from Plaid');
    }

    // Clear Plaid data from database
    await prisma.tenantProfile.update({
      where: { userId },
      data: {
        plaidAccessToken: null,
        plaidItemId: null,
        plaidInstitutionName: null,
        plaidVerifiedAt: null,
        incomeVerifiedViaPlaid: false,
        plaidVerifiedMonthlyIncome: null,
        plaidData: null,
      },
    });

    logger.info({ userId }, 'Plaid account disconnected');
    return { success: true };
  }

  /**
   * Handle Plaid webhook events
   */
  static async handleWebhook(payload: PlaidWebhookPayload): Promise<{ received: boolean }> {
    const webhookType = payload.webhook_type;
    const webhookCode = payload.webhook_code;
    const itemId = payload.item_id;

    logger.info({ webhookType, webhookCode, itemId }, 'Received Plaid webhook');

    // Find tenant by itemId
    if (itemId) {
      const tenantProfile = await prisma.tenantProfile.findFirst({
        where: { plaidItemId: itemId },
      });

      if (tenantProfile) {
        switch (webhookType) {
          case 'INCOME':
            if (webhookCode === 'INCOME_VERIFICATION_STATUS_UPDATED') {
              // Re-fetch income data
              await this.fetchAndStoreIncome(tenantProfile.userId);
            }
            break;

          case 'ITEM':
            if (webhookCode === 'ERROR') {
              // Mark connection as potentially broken
              logger.warn(
                { userId: tenantProfile.userId, error: payload.error },
                'Plaid item error'
              );
            } else if (webhookCode === 'PENDING_EXPIRATION') {
              // Token is expiring, user needs to re-authenticate
              logger.warn({ userId: tenantProfile.userId }, 'Plaid token pending expiration');
            }
            break;

          default:
            logger.debug({ webhookType, webhookCode }, 'Unhandled Plaid webhook type');
        }
      }
    }

    return { received: true };
  }

  /**
   * Refresh income data for a connected user
   */
  static async refreshIncome(userId: string): Promise<void> {
    const tenantProfile = await prisma.tenantProfile.findUnique({
      where: { userId },
    });

    if (!tenantProfile?.plaidAccessToken) {
      throw new Error('Plaid is not connected');
    }

    await this.fetchAndStoreIncome(userId);
  }
}
