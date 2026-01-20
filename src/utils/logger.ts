import pino from 'pino';
import { config } from '../config.js';

/**
 * Sensitive fields that should be redacted from logs
 */
const REDACTED_FIELDS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'authorization',
  'cookie',
  'creditCard',
  'cardNumber',
  'cvv',
  'ssn',
  'plaidAccessToken',
];

/**
 * Create redact paths for pino
 */
const redactPaths = REDACTED_FIELDS.flatMap((field) => [
  field,
  `*.${field}`,
  `*.*.${field}`,
  `req.headers.authorization`,
  `req.headers.cookie`,
  `body.${field}`,
  `data.${field}`,
]);

/**
 * Logger configuration based on environment
 */
const getLoggerConfig = (): pino.LoggerOptions => {
  const baseConfig: pino.LoggerOptions = {
    level: config.env === 'test' ? 'silent' : config.env === 'development' ? 'debug' : 'info',
    redact: {
      paths: redactPaths,
      censor: '[REDACTED]',
    },
    formatters: {
      level: (label) => ({ level: label }),
      bindings: (bindings) => ({
        pid: bindings.pid,
        hostname: bindings.hostname,
        service: 'nogency-api',
        version: '1.0.0',
        environment: config.env,
      }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  // Use pretty printing in development
  if (config.env === 'development') {
    return {
      ...baseConfig,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    };
  }

  return baseConfig;
};

/**
 * Main application logger instance
 */
export const logger = pino(getLoggerConfig());

/**
 * Create a child logger with additional context
 */
export const createChildLogger = (context: Record<string, unknown>) => {
  return logger.child(context);
};

/**
 * Request context interface for logging
 */
export interface RequestContext {
  requestId: string;
  method: string;
  url: string;
  userId?: string;
  userRole?: string;
  ip?: string;
}

/**
 * Create a logger for a specific service
 */
export const createServiceLogger = (serviceName: string) => {
  return logger.child({ service: serviceName });
};

/**
 * Predefined service loggers
 */
export const serviceLoggers = {
  auth: createServiceLogger('auth'),
  documents: createServiceLogger('documents'),
  ai: createServiceLogger('ai'),
  storage: createServiceLogger('storage'),
  payment: createServiceLogger('payment'),
  email: createServiceLogger('email'),
  scoring: createServiceLogger('scoring'),
  contract: createServiceLogger('contract'),
  application: createServiceLogger('application'),
  listing: createServiceLogger('listing'),
  property: createServiceLogger('property'),
  profile: createServiceLogger('profile'),
  health: createServiceLogger('health'),
};

/**
 * Log levels helper
 */
export const LogLevel = {
  TRACE: 'trace',
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal',
} as const;

/**
 * Performance logging helper
 */
export const logPerformance = (
  serviceLogger: pino.Logger,
  operation: string,
  startTime: number,
  metadata?: Record<string, unknown>
) => {
  const duration = Date.now() - startTime;
  const logData = {
    operation,
    durationMs: duration,
    ...metadata,
  };

  if (duration > 5000) {
    serviceLogger.warn(logData, `Slow operation: ${operation} took ${duration}ms`);
  } else if (duration > 1000) {
    serviceLogger.info(logData, `Operation ${operation} completed in ${duration}ms`);
  } else {
    serviceLogger.debug(logData, `Operation ${operation} completed in ${duration}ms`);
  }
};

/**
 * Error logging helper with context
 */
export const logError = (
  serviceLogger: pino.Logger,
  error: Error,
  context?: Record<string, unknown>
) => {
  serviceLogger.error(
    {
      err: {
        message: error.message,
        name: error.name,
        stack: error.stack,
      },
      ...context,
    },
    `Error: ${error.message}`
  );
};

export default logger;
