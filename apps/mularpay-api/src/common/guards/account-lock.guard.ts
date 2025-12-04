import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccountLockingService } from '../services/account-locking.service';

/**
 * Guard to check if user account is locked
 * Add @SkipAccountLockCheck() decorator to bypass this check
 */
@Injectable()
export class AccountLockGuard implements CanActivate {
  constructor(
    private accountLockingService: AccountLockingService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route should skip lock check
    const skipLockCheck = this.reflector.getAllAndOverride<boolean>(
      'skipAccountLockCheck',
      [context.getHandler(), context.getClass()],
    );

    if (skipLockCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If no user (public route), allow
    if (!user?.id) {
      return true;
    }

    // Check if account is locked
    const isLocked = await this.accountLockingService.isAccountLocked(user.id);

    if (isLocked) {
      throw new ForbiddenException(
        'Your account has been temporarily locked due to suspicious activity. Please contact support or wait for the lock to expire.',
      );
    }

    return true;
  }
}
