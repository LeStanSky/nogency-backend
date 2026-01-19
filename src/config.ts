import dotenv from 'dotenv';

dotenv.config();

interface Config {
  env: string;
  port: number;
  frontendUrl: string;
  database: {
    url: string;
  };
  supabase: {
    url: string;
    anonKey: string;
    serviceKey: string;
  };
  anthropic: {
    apiKey: string;
  };
  stripe: {
    secretKey: string;
    webhookSecret: string;
  };
  email: {
    resendApiKey: string;
    fromAddress: string;
    fromName: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  rateLimit: {
    global: {
      max: number;
      timeWindow: string;
    };
    auth: {
      max: number;
      timeWindow: string;
    };
  };
}

export const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  database: {
    url: process.env.DATABASE_URL || '',
  },
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },
  email: {
    resendApiKey: process.env.RESEND_API_KEY || '',
    fromAddress: process.env.EMAIL_FROM_ADDRESS || 'noreply@nogency.com',
    fromName: process.env.EMAIL_FROM_NAME || 'NoGency AI',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-this',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  rateLimit: {
    global: {
      max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      timeWindow: process.env.RATE_LIMIT_TIME_WINDOW || '1 minute',
    },
    auth: {
      max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10', 10),
      timeWindow: process.env.RATE_LIMIT_AUTH_TIME_WINDOW || '1 minute',
    },
  },
};
