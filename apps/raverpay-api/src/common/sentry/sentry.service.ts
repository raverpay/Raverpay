import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

/**
 * Sentry Service
 *
 * Initializes and configures Sentry for error tracking and performance monitoring.
 */
@Injectable()
export class SentryService implements OnModuleInit {
  private readonly logger = new Logger(SentryService.name);
  private initialized = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const dsn = this.configService.get<string>('SENTRY_DSN');
    const environment =
      this.configService.get<string>('SENTRY_ENVIRONMENT') ||
      this.configService.get<string>('NODE_ENV') ||
      'development';
    const release =
      this.configService.get<string>('SENTRY_RELEASE') ||
      this.configService.get<string>('npm_package_version') ||
      '1.0.0';

    if (!dsn) {
      this.logger.warn('SENTRY_DSN not configured - error tracking disabled');
      return;
    }

    try {
      Sentry.init({
        dsn,
        environment,
        release,
        tracesSampleRate: environment === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
        profilesSampleRate: environment === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
        integrations: [
          // Enable HTTP instrumentation (tracing is enabled by default)
          Sentry.httpIntegration(),
          // Enable profiling
          nodeProfilingIntegration(),
        ],
        // Filter out sensitive data
        beforeSend(event, hint) {
          // Remove sensitive fields from request data
          if (event.request?.headers) {
            // Remove passwords, tokens, BVN, etc.
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

      this.initialized = true;
      this.logger.log(
        `✅ Sentry initialized for environment: ${environment}, release: ${release}`,
      );
    } catch (error) {
      this.logger.error('Failed to initialize Sentry', error);
    }
  }

  /**
   * Check if Sentry is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Capture exception
   */
  captureException(exception: unknown, context?: Record<string, any>): string {
    if (!this.initialized) {
      return '';
    }

    return Sentry.captureException(exception, {
      extra: context,
    });
  }

  /**
   * Capture message
   */
  captureMessage(
    message: string,
    level: Sentry.SeverityLevel = 'info',
    context?: Record<string, any>,
  ): string {
    if (!this.initialized) {
      return '';
    }

    return Sentry.captureMessage(message, {
      level,
      extra: context,
    });
  }

  /**
   * Set user context
   */
  setUser(user: {
    id?: string;
    email?: string;
    username?: string;
    [key: string]: any;
  }): void {
    if (!this.initialized) {
      return;
    }

    Sentry.setUser(user);
  }

  /**
   * Set additional context
   */
  setContext(name: string, context: Record<string, any>): void {
    if (!this.initialized) {
      return;
    }

    Sentry.setContext(name, context);
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
    if (!this.initialized) {
      return;
    }

    Sentry.addBreadcrumb(breadcrumb);
  }
}
