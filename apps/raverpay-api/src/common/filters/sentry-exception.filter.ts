import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { SentryService } from '../sentry/sentry.service';

/**
 * Sentry Exception Filter
 *
 * Captures all exceptions and sends them to Sentry with context.
 */
@Injectable()
@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  constructor(private readonly sentryService: SentryService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Get status code
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Get error message
    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception instanceof Error
          ? exception.message
          : 'Internal server error';

    // Extract user ID from request if available
    const userId = (request as any).user?.id || (request as any).user?.userId;

    // Set user context in Sentry
    if (userId) {
      this.sentryService.setUser({
        id: userId,
        email: (request as any).user?.email,
        username: (request as any).user?.username,
      });
    }

    // Set request context
    this.sentryService.setContext('request', {
      method: request.method,
      url: request.url,
      headers: this.sanitizeHeaders(request.headers),
      query: request.query,
      body: this.sanitizeBody(request.body),
      ip: request.ip,
      userAgent: request.get('user-agent'),
    });

    // Add breadcrumb
    this.sentryService.addBreadcrumb({
      category: 'http',
      message: `${request.method} ${request.url}`,
      level: status >= 500 ? 'error' : 'warning',
      data: {
        status,
        method: request.method,
        url: request.url,
      },
    });

    // Capture exception (only for server errors or if explicitly configured)
    if (status >= 500 || process.env.SENTRY_CAPTURE_ALL === 'true') {
      this.sentryService.captureException(exception, {
        request: {
          method: request.method,
          url: request.url,
          headers: this.sanitizeHeaders(request.headers),
          query: request.query,
          body: this.sanitizeBody(request.body),
        },
        userId,
        status,
      });
    }

    // Send response
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message:
        typeof message === 'string'
          ? message
          : (message as any).message || 'Internal server error',
      ...(process.env.NODE_ENV !== 'production' && {
        error: exception instanceof Error ? exception.stack : undefined,
      }),
    });
  }

  /**
   * Sanitize headers to remove sensitive data
   */
  private sanitizeHeaders(headers: any): Record<string, any> {
    const sensitive = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    const sanitized = { ...headers };

    sensitive.forEach((key) => {
      if (sanitized[key]) {
        sanitized[key] = '[Filtered]';
      }
    });

    return sanitized;
  }

  /**
   * Sanitize request body to remove sensitive data
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitive = ['password', 'pin', 'bvn', 'nin', 'token'];
    const sanitized = { ...body };

    sensitive.forEach((key) => {
      if (sanitized[key]) {
        sanitized[key] = '[Filtered]';
      }
    });

    return sanitized;
  }
}
