import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logtail } from '@logtail/node';

/**
 * Logtail Service
 *
 * Provides centralized log aggregation via Logtail.
 */
@Injectable()
export class LogtailService implements OnModuleInit {
  private readonly logger = new Logger(LogtailService.name);
  private logtail: Logtail | null = null;
  private enabled = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const sourceToken = this.configService.get<string>('LOGTAIL_SOURCE_TOKEN');

    if (!sourceToken) {
      this.logger.warn(
        'LOGTAIL_SOURCE_TOKEN not configured - log aggregation disabled',
      );
      return;
    }

    try {
      // Initialize Logtail with Better Stack endpoint
      // According to Better Stack docs, endpoint should be the full URL
      // Format: https://{INGESTING_HOST}
      // For source 1641618 in eu-nbg-2 region: https://s1641618.eu-nbg-2.betterstackdata.com
      this.logtail = new Logtail(sourceToken, {
        endpoint: 'https://s1641618.eu-nbg-2.betterstackdata.com',
      });
      this.enabled = true;
      this.logger.log(
        '✅ Logtail initialized with Better Stack endpoint (s1641618.eu-nbg-2.betterstackdata.com)',
      );

      // Send a test log on initialization to verify connection
      this.logtail
        .info('Logtail service initialized', {
          timestamp: new Date().toISOString(),
          environment: this.configService.get('NODE_ENV') || 'development',
        })
        .then(async () => {
          this.logger.log('📤 Test log queued');
          // Flush immediately to send the log
          if (this.logtail) {
            await this.logtail.flush();
            this.logger.log('✅ Test log flushed to Better Stack');
          }
        })
        .catch((err) => {
          this.logger.error(
            '❌ Failed to send test log to Better Stack:',
            err.message,
          );
        });
    } catch (error) {
      this.logger.error('Failed to initialize Logtail', error);
    }
  }

  /**
   * Log info message
   */
  async info(message: string, context?: Record<string, any>): Promise<void> {
    if (!this.enabled || !this.logtail) {
      return;
    }

    try {
      await this.logtail.info(message, context);
    } catch (error) {
      // Don't throw - logging failures shouldn't break the app
      this.logger.debug('Failed to send log to Logtail', error);
    }
  }

  /**
   * Log warning message
   */
  async warn(message: string, context?: Record<string, any>): Promise<void> {
    if (!this.enabled || !this.logtail) {
      return;
    }

    try {
      await this.logtail.warn(message, context);
    } catch (error) {
      this.logger.debug('Failed to send log to Logtail', error);
    }
  }

  /**
   * Log error message
   */
  async error(message: string, context?: Record<string, any>): Promise<void> {
    if (!this.enabled || !this.logtail) {
      return;
    }

    try {
      await this.logtail.error(message, context);
    } catch (error) {
      this.logger.debug('Failed to send log to Logtail', error);
    }
  }

  /**
   * Log debug message
   */
  async debug(message: string, context?: Record<string, any>): Promise<void> {
    if (!this.enabled || !this.logtail) {
      return;
    }

    try {
      await this.logtail.debug(message, context);
    } catch (error) {
      this.logger.debug('Failed to send log to Logtail', error);
    }
  }

  /**
   * Check if Logtail is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Flush pending logs to Better Stack
   * Call this to ensure logs are sent immediately
   */
  async flush(): Promise<void> {
    if (!this.enabled || !this.logtail) {
      return;
    }

    try {
      await this.logtail.flush();
    } catch (error) {
      this.logger.debug('Failed to flush logs to Logtail', error);
    }
  }
}
