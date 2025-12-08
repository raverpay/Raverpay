import { SetMetadata } from '@nestjs/common';

/**
 * Public Decorator
 *
 * Marks a route as public (no authentication required)
 * Usage: @Public()
 */
export const Public = () => SetMetadata('isPublic', true);
