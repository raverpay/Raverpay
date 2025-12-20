// IMPORTANT: This file must be imported at the very top of main.ts
// This initializes Sentry before any other code runs

import * as Sentry from '@sentry/nestjs';

const sentryDsn = process.env.SENTRY_DSN;
const environment =
  process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';
const release =
  process.env.SENTRY_RELEASE || process.env.npm_package_version || '1.0.0';

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment,
    release,
    // Performance monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
    // Send structured logs to Sentry
    enableLogs: true,
    // Setting this option to true will send default PII data to Sentry.
    // For example, automatic IP address collection on events
    sendDefaultPii: true,
    // Filter out sensitive data
    beforeSend(event, hint) {
      // Remove sensitive fields from request data
      if (event.request?.headers) {
        const sensitiveFields = [
          'password',
          'pin',
          'token',
          'bvn',
          'nin',
          'authorization',
          'x-api-key',
        ];

        sensitiveFields.forEach((field) => {
          if (event.request?.headers?.[field]) {
            event.request.headers[field] = '[Filtered]';
          }
        });
      }

      if (event.request?.data) {
        const data = event.request.data as Record<string, any>;
        const sensitiveFields = ['password', 'pin', 'token', 'bvn', 'nin'];
        sensitiveFields.forEach((field) => {
          if (data[field]) {
            data[field] = '[Filtered]';
          }
        });
      }

      return event;
    },
    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      'ResizeObserver loop limit exceeded',
      // Network errors that are expected
      'NetworkError',
      'Failed to fetch',
    ],
  });
}

