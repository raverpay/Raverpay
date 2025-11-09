import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Get User Decorator
 *
 * Extracts the authenticated user from the request
 * Usage: @GetUser() user: User
 */
export const GetUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: unknown }>();
    return request.user;
  },
);
