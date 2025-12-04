import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to skip account lock check
 * Use on routes that should be accessible even when account is locked
 * (e.g., support contact, account unlock request)
 */
export const SkipAccountLockCheck = () =>
  SetMetadata('skipAccountLockCheck', true);
