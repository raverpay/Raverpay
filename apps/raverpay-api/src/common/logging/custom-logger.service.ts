import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { LogtailService } from './logtail.service';

/**
 * Custom Logger Service
 *
 * Extends NestJS Logger to send logs to Logtail while maintaining console output.
 */
@Injectable({ scope: Scope.TRANSIENT })
export class CustomLoggerService implements LoggerService {
  private context?: string;

  constructor(private readonly logtail: LogtailService) {}

  setContext(context: string) {
    this.context = context;
  }

  log(message: any, context?: string) {
    const ctx = context || this.context || 'Application';
    console.log(`[${ctx}] ${message}`);
    void this.logtail.info(message, { context: ctx });
  }

  error(message: any, trace?: string, context?: string) {
    const ctx = context || this.context || 'Application';
    console.error(`[${ctx}] ${message}`, trace || '');
    void this.logtail.error(message, {
      context: ctx,
      trace,
    });
  }

  warn(message: any, context?: string) {
    const ctx = context || this.context || 'Application';
    console.warn(`[${ctx}] ${message}`);
    void this.logtail.warn(message, { context: ctx });
  }

  debug(message: any, context?: string) {
    const ctx = context || this.context || 'Application';
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[${ctx}] ${message}`);
    }
    void this.logtail.debug(message, { context: ctx });
  }

  verbose(message: any, context?: string) {
    const ctx = context || this.context || 'Application';
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${ctx}] ${message}`);
    }
    void this.logtail.debug(message, { context: ctx });
  }
}
