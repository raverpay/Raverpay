import { Module, Global } from '@nestjs/common';
import { SentryService } from './sentry.service';

/**
 * Sentry Module
 *
 * Provides Sentry error tracking service globally.
 */
@Global()
@Module({
  providers: [SentryService],
  exports: [SentryService],
})
export class SentryModule {}
