import { Module, Global } from '@nestjs/common';
import { LogtailService } from './logtail.service';
import { CustomLoggerService } from './custom-logger.service';

/**
 * Logtail Module
 *
 * Provides Logtail logging service globally.
 */
@Global()
@Module({
  providers: [LogtailService, CustomLoggerService],
  exports: [LogtailService, CustomLoggerService],
})
export class LogtailModule {}
