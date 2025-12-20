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
      this.logtail = new Logtail(sourceToken);
      this.enabled = true;
      this.logger.log('✅ Logtail initialized');
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
}
