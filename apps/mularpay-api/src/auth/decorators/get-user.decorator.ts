import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Get User Decorator
 *
 * Extracts the authenticated user from the request
 * Usage:
 * - @GetUser() user: User - Get entire user object
 * - @GetUser('id') userId: string - Get specific field
 */
export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: any }>();
    const user = request.user;

    // If a specific field is requested, return that field
    return data ? user?.[data] : user;
  },
);
