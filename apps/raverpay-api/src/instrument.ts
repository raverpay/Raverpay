// IMPORTANT: This file must be imported at the very top of main.ts
// This initializes Sentry before any other code runs

import * as Sentry from '@sentry/nestjs';

// IMPORTANT: instrument.ts runs BEFORE .env is loaded, so we hardcode the DSN
const sentryDsn =
  'https://9aae50bc00dcdabdc343a4f50552b156@o4510566567182336.ingest.de.sentry.io/4510572878037072';
const environment = process.env.NODE_ENV || 'production';
const release = '1.0.0';

console.log('🔧 Initializing Sentry...');
console.log('DSN:', sentryDsn ? 'Found' : 'Missing');
console.log('Environment:', environment);

try {
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

  console.log('✅ Sentry initialized successfully!');
} catch (error) {
  console.error('❌ Failed to initialize Sentry:', error);
}
