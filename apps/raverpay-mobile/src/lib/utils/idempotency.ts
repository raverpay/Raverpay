// lib/utils/idempotency.ts
import * as Crypto from 'expo-crypto';

/**
 * Generate a unique idempotency key for API requests
 * Uses crypto.randomUUID() for generating unique identifiers
 */
export const generateIdempotencyKey = async (): Promise<string> => {
  try {
    // Use expo-crypto to generate UUID v4
    const uuid = await Crypto.randomUUID();
    return uuid;
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
  '/transactions/send', // P2P transfers
  '/transactions/fund/card', // Wallet funding
  '/transactions/withdraw', // Withdrawals
  '/vtu/airtime/purchase', // VTU airtime
  '/vtu/data/purchase', // VTU data
  '/v1/crypto/convert', // Crypto conversions
] as const;

/**
 * Check if an endpoint requires idempotency key
 */
export const requiresIdempotencyKey = (endpoint: string): boolean => {
  return IDEMPOTENT_ENDPOINTS.some((idempotentEndpoint) => endpoint.includes(idempotentEndpoint));
};
