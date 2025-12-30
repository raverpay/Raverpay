import { Injectable, ExecutionContext, Inject } from '@nestjs/common';

import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import {
  ThrottlerGuard,
  ThrottlerException,
  ThrottlerStorage,
  ThrottlerModuleOptions,
  InjectThrottlerOptions,
  InjectThrottlerStorage,
} from '@nestjs/throttler';

/**
 * Custom throttler guard that provides user-based rate limiting
 * in addition to IP-based limiting
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() protected readonly options: any,
    @InjectThrottlerStorage()
    protected readonly storageService: ThrottlerStorage,
    protected readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {
    super(options, storageService, reflector);
  }

  /**
   * Generate unique tracking key for rate limiting
   * Uses userId explicitly (from decoded token), otherwise falls back to IP
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // 1. Try to get user from request (if AuthGuard ran already)
    if (req.user?.id) {
      console.log(`[Throttler] Tracking by req.user: ${req.user.id}`);
      return `user:${req.user.id}`;
    }

    // 2. Try to decode JWT from header (if AuthGuard hasn't ran yet, which is typical for Global guards)
    const authHeader = req.headers?.authorization;
    if (
      authHeader &&
      typeof authHeader === 'string' &&
      authHeader.startsWith('Bearer ')
    ) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = this.jwtService.decode(token) as { sub: string } | null;
        if (decoded?.sub) {
          console.log(`[Throttler] Tracking by decoded JWT: ${decoded.sub}`);
          return `user:${decoded.sub}`;
        }
      } catch (e) {
        console.log(`[Throttler] JWT Decode Error: ${e.message}`);
      }
    }

    // 3. Fallback: Track by IP
    const tracker = req.ip || req.socket?.remoteAddress || 'unknown';
    console.log(`[Throttler] Tracking by IP: ${tracker}`);
    return tracker;
  }

  /**
   * Custom error message based on context
   */
  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: any,
  ): Promise<void> {
    const request = context.switchToHttp().getRequest<Request>();
    // We can't rely on req.user here if it wasn't set.

    throw new ThrottlerException('Too many requests. Please try again later.');
  }
}
