import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

/**
 * Request Metadata Interceptor
 *
 * Captures and attaches client metadata to all incoming requests
 * This metadata can be used for audit logging, analytics, and security monitoring
 *
 * Captured Metadata:
 * - Real IP address (considering proxies and load balancers)
 * - User-Agent string
 * - Device ID (from custom header)
 * - Request ID (for correlation)
 * - Request timestamp
 * - Request duration
 */
@Injectable()
export class RequestMetadataInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();

    // Extract real IP address (considering various proxy headers)
    const ipAddress = this.extractRealIp(request);

    // Extract User-Agent
    const userAgent = request.headers['user-agent'] || 'unknown';

    // Extract custom headers for device identification
    const deviceId = request.headers['x-device-id'] as string;
    const deviceType = request.headers['x-device-type'] as string;
    const appVersion = request.headers['x-app-version'] as string;

    // Generate or extract request ID for correlation
    const requestId =
      (request.headers['x-request-id'] as string) ||
      (request.headers['x-correlation-id'] as string) ||
      this.generateRequestId();

    // Attach metadata to request object for use in controllers/services
    (request as any).metadata = {
      ipAddress,
      userAgent,
      deviceId,
      deviceType,
      appVersion,
      requestId,
      timestamp: new Date(),
    };

    // Set request ID in response headers for client tracking
    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        response.setHeader('X-Request-ID', requestId);
        response.setHeader('X-Response-Time', `${Date.now() - startTime}ms`);
      }),
    );
  }

  /**
   * Extract real IP address from request
   * Handles various proxy headers and configurations
   */
  private extractRealIp(request: Request): string {
    // Priority order for IP extraction:
    // 1. X-Forwarded-For (from load balancers/proxies)
    // 2. X-Real-IP (from nginx and similar)
    // 3. CF-Connecting-IP (from Cloudflare)
    // 4. X-Client-IP (from some proxies)
    // 5. request.ip (Express default)
    // 6. socket.remoteAddress (fallback)

    // X-Forwarded-For can contain multiple IPs (client, proxy1, proxy2, ...)
    // We want the first one (the client's original IP)
    const xForwardedFor = request.headers['x-forwarded-for'] as string;
    if (xForwardedFor) {
      const ips = xForwardedFor.split(',').map((ip) => ip.trim());
      if (ips[0]) return ips[0];
    }

    // Check other proxy headers
    const xRealIp = request.headers['x-real-ip'] as string;
    if (xRealIp) return xRealIp;

    const cfConnectingIp = request.headers['cf-connecting-ip'] as string;
    if (cfConnectingIp) return cfConnectingIp;

    const xClientIp = request.headers['x-client-ip'] as string;
    if (xClientIp) return xClientIp;

    // Fallback to Express defaults
    if (request.ip) return request.ip;
    if (request.socket?.remoteAddress) return request.socket.remoteAddress;

    return 'unknown';
  }

  /**
   * Generate a unique request ID for correlation
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Extend Express Request type to include metadata
 */
declare global {
  namespace Express {
    interface Request {
      metadata?: {
        ipAddress: string;
        userAgent: string;
        deviceId?: string;
        deviceType?: string;
        appVersion?: string;
        requestId: string;
        timestamp: Date;
      };
    }
  }
}
