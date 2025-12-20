import { Module, Global } from '@nestjs/common';
import { PostHogService } from './posthog.service';

/**
 * PostHog Module
 *
 * Provides PostHog analytics service globally.
 */
@Global()
@Module({
  providers: [PostHogService],
  exports: [PostHogService],
})
export class PostHogModule {}
