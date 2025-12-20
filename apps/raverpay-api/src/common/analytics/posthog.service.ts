import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostHog } from 'posthog-node';

/**
 * PostHog Service
 *
 * Provides product analytics and feature flags via PostHog.
 */
@Injectable()
export class PostHogService implements OnModuleInit {
  private readonly logger = new Logger(PostHogService.name);
  private posthog: PostHog | null = null;
  private enabled = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('POSTHOG_API_KEY');
    const host =
      this.configService.get<string>('POSTHOG_HOST') ||
      'https://app.posthog.com';

    if (!apiKey) {
      this.logger.warn('POSTHOG_API_KEY not configured - analytics disabled');
      return;
    }

    try {
      this.posthog = new PostHog(apiKey, {
        host,
        flushAt: 20, // Flush after 20 events
        flushInterval: 10000, // Or every 10 seconds
      });
      this.enabled = true;
      this.logger.log('✅ PostHog initialized');
    } catch (error) {
      this.logger.error('Failed to initialize PostHog', error);
    }
  }

  /**
   * Identify a user
   */
  identify(userId: string, properties?: Record<string, any>): void {
    if (!this.enabled || !this.posthog) {
      return;
    }

    try {
      this.posthog.identify({
        distinctId: userId,
        properties,
      });
    } catch (error) {
      this.logger.debug('Failed to identify user in PostHog', error);
    }
  }

  /**
   * Track an event
   */
  capture(event: {
    distinctId: string;
    event: string;
    properties?: Record<string, any>;
  }): void {
    if (!this.enabled || !this.posthog) {
      return;
    }

    try {
      this.posthog.capture({
        distinctId: event.distinctId,
        event: event.event,
        properties: {
          ...event.properties,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      this.logger.debug('Failed to capture event in PostHog', error);
    }
  }

  /**
   * Set user properties
   */
  setUserProperties(userId: string, properties: Record<string, any>): void {
    if (!this.enabled || !this.posthog) {
      return;
    }

    try {
      this.posthog.identify({
        distinctId: userId,
        properties,
      });
    } catch (error) {
      this.logger.debug('Failed to set user properties in PostHog', error);
    }
  }

  /**
   * Check feature flag
   */
  async isFeatureEnabled(userId: string, flagKey: string): Promise<boolean> {
    if (!this.enabled || !this.posthog) {
      return false;
    }

    try {
      const result = await this.posthog.isFeatureEnabled(flagKey, userId);
      return result || false;
    } catch (error) {
      this.logger.debug('Failed to check feature flag in PostHog', error);
      return false;
    }
  }

  /**
   * Shutdown PostHog (call on app shutdown)
   */
  async shutdown(): Promise<void> {
    if (this.posthog) {
      await this.posthog.shutdown();
      this.logger.log('PostHog shutdown complete');
    }
  }

  /**
   * Check if PostHog is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}
