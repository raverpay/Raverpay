// lib/utils/idempotency.ts

/**
 * Generate a unique idempotency key for API requests
 * Uses browser's crypto.randomUUID() for generating unique identifiers
 */
export const generateIdempotencyKey = (): string => {
  try {
    // Use browser's crypto API (available in modern browsers)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers or Node.js environments
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  } catch (error) {
    // Fallback: Generate a simple unique string if crypto fails
    console.warn('Failed to generate UUID, using fallback:', error);
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
};

/**
 * List of endpoints that require idempotency keys
 * These match the endpoints marked with @Idempotent() decorator in the backend
 */
export const IDEMPOTENT_ENDPOINTS = [
  '/admin/wallets/', // Admin wallet adjustments (ends with /adjust)
] as const;

/**
 * Check if an endpoint requires idempotency key
 */
export const requiresIdempotencyKey = (endpoint: string): boolean => {
  // Admin wallet adjustments
  if (endpoint.includes('/admin/wallets/') && endpoint.includes('/adjust')) {
    return true;
  }
  return false;
};
