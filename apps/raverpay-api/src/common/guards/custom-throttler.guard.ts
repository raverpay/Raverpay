import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * Custom throttler guard that provides user-based rate limiting
 * in addition to IP-based limiting
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  /**
   * Generate unique tracking key for rate limiting
   * Uses userId if authenticated, otherwise falls back to IP
   */
  protected getTracker(req: Request): Promise<string> {
    const user = req.user as { id?: string } | undefined;

    // For authenticated requests, track by userId
    if (user?.id) {
      return Promise.resolve(`user:${user.id}`);
    }

    // For unauthenticated requests, track by IP
    return Promise.resolve(req.ip || req.socket.remoteAddress || 'unknown');
  }

  /**
   * Custom error message based on context
   */
  protected throwThrottlingException(context: ExecutionContext): Promise<void> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as { id?: string } | undefined;

    if (user?.id) {
      throw new ThrottlerException(
        'Too many requests from your account. Please try again later.',
      );
    }

    throw new ThrottlerException(
      'Too many requests from this IP address. Please try again later.',
    );
  }
}
