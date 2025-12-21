import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { BetterStackService } from '../logging/better-stack.service';

/**
 * Request Logger Interceptor
 *
 * Logs all HTTP requests with structured data for monitoring and debugging.
 * Captures request/response details, timing, and user context.
 * Sends logs to Better Stack via direct HTTP.
 */
@Injectable()
export class RequestLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggerInterceptor.name);

  constructor(private readonly betterStackService: BetterStackService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    // Extract request details
    const { method, originalUrl, ip, headers, user, body, query, params } =
      request;

    // Extract user ID from request (set by auth guard)
    const userId = (user as any)?.id || (user as any)?.userId || 'anonymous';

    // Sanitize sensitive data from request body
    const sanitizedBody = this.sanitizeRequestBody(body);

    // Create request log entry
    const requestLog = {
      timestamp: new Date().toISOString(),
      method,
      url: originalUrl,
      userId,
      ip: this.getClientIP(request),
      userAgent: headers['user-agent'] || 'unknown',
      contentType: headers['content-type'] || 'unknown',
      query: Object.keys(query).length > 0 ? query : undefined,
      params: Object.keys(params).length > 0 ? params : undefined,
      body: sanitizedBody,
      requestId: headers['x-request-id'] || this.generateRequestId(),
    };

    // Log request start
    this.logger.log(
      `${method} ${originalUrl} - User: ${userId} - IP: ${requestLog.ip}`,
    );

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          // Create response log entry
          const responseLog = {
            ...requestLog,
            duration,
            statusCode,
            responseSize: this.getResponseSize(data),
            success: statusCode < 400,
          };

          // Log successful response
          this.logger.log(
            `${method} ${originalUrl} - ${statusCode} - ${duration}ms - User: ${userId}`,
          );

          // Send structured log to Better Stack
          this.logger.debug(
            `About to send log to Better Stack for ${method} ${originalUrl}`,
          );
          this.betterStackService.info('HTTP Request Completed', responseLog);
          this.logger.debug(`Called betterStackService.info()`);
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          // Create error log entry
          const errorLog = {
            ...requestLog,
            duration,
            statusCode,
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack,
            },
            success: false,
          };

          // Log error response
          this.logger.error(
            `${method} ${originalUrl} - ${statusCode} - ${duration}ms - User: ${userId} - Error: ${error.message}`,
          );

          // Send error log to Better Stack
          this.betterStackService.info('HTTP Request Failed', errorLog);
        },
      }),
    );
  }

  /**
   * Sanitize sensitive data from request body
   */
  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = [
      'password',
      'pin',
      'bvn',
      'token',
      'secret',
      'key',
      'authorization',
      'cardNumber',
      'cvv',
      'expiryMonth',
      'expiryYear',
      'otp',
      'verificationCode',
    ];

    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Recursively sanitize nested objects
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeRequestBody(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Get client IP address, checking proxy headers
   */
  private getClientIP(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'] as string;
    const realIP = request.headers['x-real-ip'] as string;
    const cfConnectingIP = request.headers['cf-connecting-ip'] as string;

    // Priority: CF-Connecting-IP > X-Real-IP > X-Forwarded-For > direct IP
    return (
      cfConnectingIP ||
      realIP ||
      (forwarded ? forwarded.split(',')[0].trim() : null) ||
      request.ip ||
      'unknown'
    );
  }

  /**
   * Get response size in bytes
   */
  private getResponseSize(data: any): number {
    try {
      if (typeof data === 'string') {
        return Buffer.byteLength(data, 'utf8');
      }
      const jsonString = JSON.stringify(data);
      return Buffer.byteLength(jsonString, 'utf8');
    } catch {
      return 0;
    }
  }

  /**
   * Generate a unique request ID if not provided
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
