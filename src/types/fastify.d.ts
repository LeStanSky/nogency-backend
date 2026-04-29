import 'fastify';
import '@fastify/rate-limit';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }

  interface FastifyContextConfig {
    rateLimit?: {
      max: number;
      timeWindow: string;
    };
    rawBody?: boolean;
  }
}
