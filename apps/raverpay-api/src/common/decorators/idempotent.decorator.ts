import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to mark endpoints as idempotent
 * When applied, the IdempotencyInterceptor will check for 'Idempotency-Key' header
 * and return cached responses for duplicate requests
 *
 * @example
 * ```typescript
 * @Post('transfer')
 * @Idempotent()
 * async transfer(@Body() dto: TransferDto) {
 *   // ...
 * }
 * ```
 */
export const IDEMPOTENT_KEY = 'requiresIdempotency';
export const Idempotent = () => SetMetadata(IDEMPOTENT_KEY, true);
