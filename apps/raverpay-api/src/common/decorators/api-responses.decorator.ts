import { applyDecorators } from '@nestjs/common';
import {
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiTooManyRequestsResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';

/**
 * Standard API response decorators for common HTTP status codes
 * Use these to maintain consistency across all endpoints
 */

/**
 * Apply standard error responses that are common to most endpoints
 * Includes: 401 Unauthorized, 500 Internal Server Error
 */
export const ApiStandardResponses = () => {
  return applyDecorators(
    ApiUnauthorizedResponse({
      description: 'Unauthorized - Invalid or missing JWT token',
      schema: {
        example: {
          statusCode: 401,
          message: 'Unauthorized',
          error: 'Unauthorized',
        },
      },
    }),
    ApiInternalServerErrorResponse({
      description: 'Internal server error',
      schema: {
        example: {
          statusCode: 500,
          message: 'Internal server error',
          error: 'Internal Server Error',
        },
      },
    }),
  );
};

/**
 * Apply standard protected endpoint responses
 * Includes: 401 Unauthorized, 403 Forbidden, 500 Internal Server Error
 */
export const ApiProtectedResponses = () => {
  return applyDecorators(
    ApiUnauthorizedResponse({
      description: 'Unauthorized - Invalid or missing JWT token',
    }),
    ApiForbiddenResponse({
      description: 'Forbidden - Insufficient permissions',
    }),
    ApiInternalServerErrorResponse({
      description: 'Internal server error',
    }),
  );
};

/**
 * Rate limit exceeded response
 * Use on endpoints with rate limiting
 */
export const ApiRateLimitResponse = () => {
  return ApiTooManyRequestsResponse({
    description: 'Rate limit exceeded. Try again later.',
    headers: {
      'X-RateLimit-Limit': {
        description: 'Request limit per time window',
        schema: { type: 'string', example: '100' },
      },
      'X-RateLimit-Remaining': {
        description: 'Remaining requests in current window',
        schema: { type: 'string', example: '95' },
      },
      'X-RateLimit-Reset': {
        description: 'Time when the rate limit resets (Unix timestamp)',
        schema: { type: 'string', example: '1704067200' },
      },
    },
    schema: {
      example: {
        statusCode: 429,
        message: 'ThrottlerException: Too Many Requests',
        error: 'Too Many Requests',
      },
    },
  });
};

/**
 * Bad request response (validation errors)
 */
export const ApiValidationErrorResponse = () => {
  return ApiBadRequestResponse({
    description: 'Validation error - Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'email must be a valid email address',
          'password must be at least 8 characters long',
        ],
        error: 'Bad Request',
      },
    },
  });
};

/**
 * Not found response
 */
export const ApiNotFoundErrorResponse = (resourceName = 'Resource') => {
  return ApiNotFoundResponse({
    description: `${resourceName} not found`,
    schema: {
      example: {
        statusCode: 404,
        message: `${resourceName} not found`,
        error: 'Not Found',
      },
    },
  });
};

/**
 * Paginated response decorator
 * Use for endpoints that return paginated data
 */
export const ApiPaginatedResponse = (dataType: string) => {
  return applyDecorators();
  // You can add specific pagination response schema here
};
