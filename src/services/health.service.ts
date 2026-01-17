import Stripe from 'stripe';
import { prisma, supabaseAdmin } from '../db/client.js';
import { config } from '../config.js';

type ServiceStatus = 'ok' | 'error' | 'degraded';

interface ServiceHealth {
  status: ServiceStatus;
  latency?: number;
  message?: string;
}

interface DetailedHealth {
  status: ServiceStatus;
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: ServiceHealth;
    supabase: ServiceHealth;
    anthropic: ServiceHealth;
    stripe: ServiceHealth;
  };
}

const startTime = Date.now();

export class HealthService {
  private static stripe = new Stripe(config.stripe.secretKey);

  /**
   * Check PostgreSQL database connectivity
   */
  static async checkDatabase(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;
      return {
        status: 'ok',
        latency,
      };
    } catch (error) {
      return {
        status: 'error',
        latency: Date.now() - start,
        message: error instanceof Error ? error.message : 'Database connection failed',
      };
    }
  }

  /**
   * Check Supabase Storage connectivity
   */
  static async checkSupabase(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      // Check if we can list buckets (simple connectivity test)
      const { error } = await supabaseAdmin.storage.listBuckets();

      if (error) {
        return {
          status: 'error',
          latency: Date.now() - start,
          message: error.message,
        };
      }

      return {
        status: 'ok',
        latency: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'error',
        latency: Date.now() - start,
        message: error instanceof Error ? error.message : 'Supabase connection failed',
      };
    }
  }

  /**
   * Check Anthropic API connectivity
   * Uses a lightweight check (no actual API call to save costs)
   */
  static async checkAnthropic(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      // Check if API key is configured
      if (!config.anthropic.apiKey) {
        return {
          status: 'error',
          latency: Date.now() - start,
          message: 'Anthropic API key not configured',
        };
      }

      // Validate API key format (starts with sk-ant-)
      if (!config.anthropic.apiKey.startsWith('sk-ant-')) {
        return {
          status: 'degraded',
          latency: Date.now() - start,
          message: 'Anthropic API key format may be invalid',
        };
      }

      return {
        status: 'ok',
        latency: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'error',
        latency: Date.now() - start,
        message: error instanceof Error ? error.message : 'Anthropic check failed',
      };
    }
  }

  /**
   * Check Stripe API connectivity
   */
  static async checkStripe(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      // Check if API key is configured
      if (!config.stripe.secretKey) {
        return {
          status: 'error',
          latency: Date.now() - start,
          message: 'Stripe API key not configured',
        };
      }

      // Use Stripe's balance endpoint as a health check (lightweight)
      await this.stripe.balance.retrieve();

      return {
        status: 'ok',
        latency: Date.now() - start,
      };
    } catch (error) {
      // If it's an authentication error, the API is reachable but key is invalid
      if (error instanceof Stripe.errors.StripeAuthenticationError) {
        return {
          status: 'degraded',
          latency: Date.now() - start,
          message: 'Stripe API key invalid',
        };
      }

      return {
        status: 'error',
        latency: Date.now() - start,
        message: error instanceof Error ? error.message : 'Stripe connection failed',
      };
    }
  }

  /**
   * Get detailed health status for all services
   */
  static async getDetailedHealth(): Promise<DetailedHealth> {
    // Run all health checks in parallel
    const [database, supabase, anthropic, stripe] = await Promise.all([
      this.checkDatabase(),
      this.checkSupabase(),
      this.checkAnthropic(),
      this.checkStripe(),
    ]);

    const services = { database, supabase, anthropic, stripe };

    // Calculate overall status
    const statuses = Object.values(services).map((s) => s.status);
    let overallStatus: ServiceStatus = 'ok';

    if (statuses.includes('error')) {
      overallStatus = 'error';
    } else if (statuses.includes('degraded')) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      version: '1.0.0',
      environment: config.env,
      services,
    };
  }

  /**
   * Check if the application is ready to serve requests
   * (database must be accessible)
   */
  static async isReady(): Promise<boolean> {
    const dbHealth = await this.checkDatabase();
    return dbHealth.status === 'ok';
  }

  /**
   * Check if the application is alive (always true if server is running)
   */
  static isAlive(): boolean {
    return true;
  }
}
