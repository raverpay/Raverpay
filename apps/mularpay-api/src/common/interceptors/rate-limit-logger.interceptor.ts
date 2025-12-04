import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ThrottlerException } from '@nestjs/throttler';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountLockingService } from '../services/account-locking.service';
import * as maxmind from 'maxmind';
import * as path from 'path';

/**
 * Interceptor that logs rate limit violations to the database
 * with geolocation information
 */
@Injectable()
export class RateLimitLoggerInterceptor implements NestInterceptor {
  private geoReader: maxmind.Reader<maxmind.CityResponse> | null = null;

  constructor(
    private prisma: PrismaService,
    private accountLockingService: AccountLockingService,
  ) {
    void this.initializeGeoIP();
  }

  /**
   * Initialize MaxMind GeoIP database
   */
  private async initializeGeoIP() {
    try {
      // Use absolute path from project root
      const dbPath = path.join(process.cwd(), 'data/GeoLite2-City.mmdb');
      this.geoReader = await maxmind.open<maxmind.CityResponse>(dbPath);
      console.log('✅ GeoIP database loaded for rate limit tracking');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.warn('⚠️  GeoIP database not available:', message);
      console.warn(
        '   Rate limit violations will be logged without location data',
      );
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        // Only log throttler exceptions
        if (error instanceof ThrottlerException) {
          const request = context.switchToHttp().getRequest<Request>();
          void this.logViolation(request);
        }

        return throwError(() => error);
      }),
    );
  }

  /**
   * Log rate limit violation with geolocation data
   */
  private async logViolation(request: Request): Promise<void> {
    try {
      const user = request.user as
        | { id?: string; kycTier?: string }
        | undefined;
      const ip = request.ip || request.socket.remoteAddress || 'unknown';

      // Get geolocation data
      let country: string | undefined;
      let city: string | undefined;

      if (this.geoReader && ip !== 'unknown') {
        try {
          const geo = this.geoReader.get(ip);
          country = geo?.country?.names?.en;
          city = geo?.city?.names?.en;
        } catch {
          // Silently fail geolocation lookup
        }
      }

      // Log to database
      await this.prisma.rateLimitViolation.create({
        data: {
          userId: user?.id,
          ip,
          endpoint: request.path,
          method: request.method,
          userAgent: request.headers['user-agent'],
          country,
          city,
          limit: this.getEndpointLimit(request.path),
          hitCount: 1, // We don't have the actual count, use 1 as indicator
        },
      });

      // Update daily metrics
      await this.updateDailyMetrics(request.path, ip, user?.id);

      // Check if account should be locked (only for authenticated users)
      if (user?.id) {
        await this.accountLockingService.checkAndLockAccount(user.id);
      }
    } catch (error) {
      // Don't fail the request if logging fails
      console.error('Failed to log rate limit violation:', error);
    }
  }

  /**
   * Get the rate limit for an endpoint (for logging purposes)
   */
  private getEndpointLimit(path: string): number {
    // Map endpoints to their limits (from our throttle decorators)
    if (path.includes('/auth/login')) return 5;
    if (path.includes('/auth/register')) return 3;
    if (path.includes('/transactions/fund/card')) return 10;
    if (path.includes('/transactions/withdraw')) return 5;
    if (path.includes('/vtu/airtime') || path.includes('/vtu/data')) return 30;
    if (path.includes('/vtu/cable-tv') || path.includes('/vtu/electricity'))
      return 20;
    if (path.includes('/admin/wallets')) return 20;

    return 200; // Default global limit
  }

  /**
   * Update daily aggregated metrics for the dashboard
   */
  private async updateDailyMetrics(
    endpoint: string,
    ip: string,
    userId?: string,
  ): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Upsert metrics record
      await this.prisma.rateLimitMetrics.upsert({
        where: {
          date_endpoint: {
            date: today,
            endpoint,
          },
        },
        update: {
          totalHits: { increment: 1 },
          violations: { increment: 1 },
          uniqueIPs: { increment: 0 }, // Will be recalculated in aggregation job
          uniqueUsers: { increment: 0 }, // Will be recalculated in aggregation job
        },
        create: {
          date: today,
          endpoint,
          totalHits: 1,
          violations: 1,
          uniqueIPs: 1,
          uniqueUsers: userId ? 1 : 0,
        },
      });
    } catch (error) {
      console.error('Failed to update daily metrics:', error);
    }
  }
}
