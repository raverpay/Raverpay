import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * Better Stack Direct HTTP Logger
 *
 * Sends logs directly to Better Stack via HTTP POST
 * instead of using the Logtail SDK (which doesn't work with custom endpoints)
 */
@Injectable()
export class BetterStackService implements OnModuleInit {
  private readonly logger = new Logger(BetterStackService.name);
  private sourceToken: string | null = null;
  private endpoint: string | null = null;
  private enabled = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.sourceToken =
      this.configService.get<string>('LOGTAIL_SOURCE_TOKEN') ?? null;

    if (!this.sourceToken) {
      this.logger.warn(
        'LOGTAIL_SOURCE_TOKEN not configured - Better Stack logging disabled',
      );
      return;
    }

    // Better Stack endpoint for source 1641618
    this.endpoint = 'https://s1641618.eu-nbg-2.betterstackdata.com';
    this.enabled = true;

    this.logger.log('✅ Better Stack HTTP logger initialized');

    // Send test log
    this.sendTestLog();
  }

  private async sendTestLog() {
    try {
      await this.info('Better Stack HTTP logger initialized', {
        timestamp: new Date().toISOString(),
        environment: this.configService.get('NODE_ENV') || 'development',
        service: 'BetterStackService',
      });
      this.logger.log('📤 Test log sent via HTTP to Better Stack');
    } catch (error) {
      this.logger.error('❌ Failed to send test log:', error.message);
    }
  }

  /**
   * Send log to Better Stack via HTTP POST
   */
  private async sendLog(
    level: string,
    message: string,
    context?: Record<string, any>,
  ): Promise<void> {
    if (!this.enabled || !this.sourceToken || !this.endpoint) {
      this.logger.debug('Better Stack not enabled or not configured');
      return;
    }

    try {
      const payload = {
        dt: new Date().toISOString().replace('T', ' ').replace('Z', ' UTC'),
        message,
        level,
        ...context,
      };

      this.logger.debug(`Sending log to Better Stack: ${message}`);
      this.logger.debug(`Payload: ${JSON.stringify(payload)}`);
      this.logger.debug(
        `Token (first 10 chars): ${this.sourceToken?.substring(0, 10)}...`,
      );

      const response = await axios.post(this.endpoint, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.sourceToken}`,
        },
        timeout: 5000,
      });

      this.logger.debug(`Better Stack response: ${response.status}`);
    } catch (error) {
      // Log the error so we can see what's wrong
      this.logger.error(`Failed to send log to Better Stack: ${error.message}`);
      if (error.response) {
        this.logger.error(`Response status: ${error.response.status}`);
        this.logger.error(
          `Response data: ${JSON.stringify(error.response.data)}`,
        );
      }
    }
  }

  /**
   * Log info message
   */
  async info(message: string, context?: Record<string, any>): Promise<void> {
    return this.sendLog('info', message, context);
  }

  /**
   * Log warning message
   */
  async warn(message: string, context?: Record<string, any>): Promise<void> {
    return this.sendLog('warn', message, context);
  }

  /**
   * Log error message
   */
  async error(message: string, context?: Record<string, any>): Promise<void> {
    return this.sendLog('error', message, context);
  }

  /**
   * Log debug message
   */
  async debug(message: string, context?: Record<string, any>): Promise<void> {
    return this.sendLog('debug', message, context);
  }

  /**
   * Check if Better Stack is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}
