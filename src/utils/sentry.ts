import * as Sentry from '@sentry/node';
import { config } from '../config.js';
import { logger } from './logger.js';

/**
 * Initialize Sentry for error tracking
 * Only initializes in production or staging environments
 */
export const initSentry = () => {
  if (!config.sentry.dsn) {
    logger.info('Sentry DSN not configured, error tracking disabled');
    return;
  }

  if (config.env === 'test') {
    logger.debug('Sentry disabled in test environment');
    return;
  }

  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.env,
    release: `nogency-api@${config.version}`,

    // Performance Monitoring
    tracesSampleRate: config.env === 'production' ? 0.1 : 1.0,

    // Set sampling rate for profiling
    profilesSampleRate: config.env === 'production' ? 0.1 : 1.0,

    // Filtering
    beforeSend(event, hint) {
      // Filter out certain errors
      const error = hint.originalException;
      if (error instanceof Error) {
        // Don't send 4xx errors to Sentry (they're not bugs)
        if ('statusCode' in error && typeof error.statusCode === 'number') {
          if (error.statusCode >= 400 && error.statusCode < 500) {
            return null;
          }
        }
      }
      return event;
    },

    // Integrations
    integrations: [
      // Add additional integrations as needed
    ],
  });

  logger.info({ dsn: config.sentry.dsn.substring(0, 30) + '...' }, 'Sentry initialized');
};

/**
 * Capture an exception and send to Sentry
 */
export const captureException = (error: Error, context?: Record<string, unknown>) => {
  if (!config.sentry.dsn || config.env === 'test') {
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(error);
  });
};

/**
 * Capture a message and send to Sentry
 */
export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, unknown>
) => {
  if (!config.sentry.dsn || config.env === 'test') {
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureMessage(message, level);
  });
};

/**
 * Set user context for Sentry
 */
export const setUser = (user: { id: string; email?: string; role?: string }) => {
  if (!config.sentry.dsn || config.env === 'test') {
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email,
    // Don't include role in Sentry user context, use tags instead
  });

  if (user.role) {
    Sentry.setTag('user.role', user.role);
  }
};

/**
 * Clear user context
 */
export const clearUser = () => {
  if (!config.sentry.dsn || config.env === 'test') {
    return;
  }
  Sentry.setUser(null);
};

/**
 * Add breadcrumb for debugging
 */
export const addBreadcrumb = (breadcrumb: Sentry.Breadcrumb) => {
  if (!config.sentry.dsn || config.env === 'test') {
    return;
  }
  Sentry.addBreadcrumb(breadcrumb);
};

/**
 * Set a tag for the current scope
 */
export const setTag = (key: string, value: string) => {
  if (!config.sentry.dsn || config.env === 'test') {
    return;
  }
  Sentry.setTag(key, value);
};

/**
 * Flush Sentry events before shutdown
 */
export const flushSentry = async (timeout = 2000) => {
  if (!config.sentry.dsn || config.env === 'test') {
    return;
  }
  await Sentry.close(timeout);
};

export { Sentry };
