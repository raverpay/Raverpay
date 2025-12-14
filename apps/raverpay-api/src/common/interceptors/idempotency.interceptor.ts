import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Observable, throwError, from } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { Request } from 'express';
import { IdempotencyService } from '../services/idempotency.service';
import { Reflector } from '@nestjs/core';

/**
 * Interceptor to handle idempotency keys
 *
 * Usage:
 * - Add @Idempotent() decorator to endpoints that should support idempotency
 * - Clients send 'Idempotency-Key' header with a unique key
 * - Duplicate requests with same key return cached response
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(
    private readonly idempotencyService: IdempotencyService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();

    // Check if endpoint requires idempotency (via decorator)
    const requiresIdempotency = this.reflector.getAllAndOverride<boolean>(
      'requiresIdempotency',
      [context.getHandler(), context.getClass()],
    );

    // If not required, skip idempotency check
    if (!requiresIdempotency) {
      return next.handle();
    }

    // Get idempotency key from header (case-insensitive)
    const idempotencyKey =
      (request.headers['idempotency-key'] as string) ||
      (request.headers['Idempotency-Key'] as string);

    // Log for debugging (using log instead of debug to ensure visibility)
    this.logger.log(
      `[Idempotency] Endpoint: ${request.method} ${request.path}, Has key: ${!!idempotencyKey}`,
    );

    // If no key provided, allow request to proceed (optional idempotency)
    if (!idempotencyKey) {
      this.logger.log(
        `[Idempotency] No idempotency key provided for ${request.method} ${request.path}, proceeding normally`,
      );
      return next.handle();
    }

    // Validate key format
    if (!this.isValidIdempotencyKey(idempotencyKey)) {
      throw new BadRequestException(
        'Invalid idempotency key format. Must be a valid UUID or unique string (1-255 characters).',
      );
    }

    // Get user ID if authenticated
    const userId = (request.user as { id?: string })?.id;

    // Generate request hash
    const requestHash = this.idempotencyService.generateRequestHash(
      request.body,
    );

    // Get endpoint and method
    const endpoint = request.path;
    const method = request.method;

    this.logger.log(
      `[Idempotency] Processing request with key: ${idempotencyKey.substring(0, 8)}... for ${method} ${endpoint}`,
    );

    // Check for existing idempotency key
    try {
      const checkResult = await this.idempotencyService.checkIdempotencyKey(
        idempotencyKey,
        endpoint,
        method,
        requestHash,
        userId,
      );

      // If duplicate with cached response, return it
      if (checkResult.isDuplicate && checkResult.cachedResponse) {
        this.logger.log(
          `Returning cached response for idempotency key: ${idempotencyKey}`,
        );
        return new Observable((observer) => {
          observer.next(checkResult.cachedResponse);
          observer.complete();
        });
      }

      // Create or get idempotency key record
      const expiresAt = this.idempotencyService.calculateExpirationDate();
      this.logger.log(
        `[Idempotency] Creating idempotency key record: ${idempotencyKey} for ${method} ${endpoint}`,
      );

      const { id: idempotencyKeyId } =
        await this.idempotencyService.createIdempotencyKey({
          key: idempotencyKey,
          userId,
          endpoint,
          method,
          requestHash,
          expiresAt,
        });

      this.logger.log(
        `[Idempotency] Created idempotency key record with ID: ${idempotencyKeyId}`,
      );

      // Store idempotency key ID in request for later use
      (request as any).idempotencyKeyId = idempotencyKeyId;

      // Handle the request and cache response
      return next.handle().pipe(
        tap((data) => {
          // Mark as completed and cache response
          if (idempotencyKeyId) {
            this.idempotencyService
              .markCompleted(idempotencyKeyId, data)
              .catch((err) =>
                this.logger.error(
                  'Failed to mark idempotency key as completed',
                  err,
                ),
              );
          }
        }),
        catchError((error) => {
          // Mark as failed
          if (idempotencyKeyId) {
            this.idempotencyService
              .markFailed(idempotencyKeyId, error)
              .catch((err) =>
                this.logger.error(
                  'Failed to mark idempotency key as failed',
                  err,
                ),
              );
          }
          return throwError(() => error);
        }),
      );
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        'Error processing idempotency key, allowing request',
        error,
      );
      // Fail open - allow request to proceed
      return next.handle();
    }
  }

  /**
   * Validate idempotency key format
   * Accepts UUIDs or any string between 1-255 characters
   */
  private isValidIdempotencyKey(key: string): boolean {
    if (!key || typeof key !== 'string') {
      return false;
    }

    // Must be between 1 and 255 characters
    if (key.length < 1 || key.length > 255) {
      return false;
    }

    // Allow UUIDs, alphanumeric strings, and common formats
    // Reject obviously invalid formats
    if (key.includes('\n') || key.includes('\r')) {
      return false;
    }

    return true;
  }
}
