// src/constants/network-prefixes.ts
// Nigerian Mobile Network Prefixes Database
// Last updated: 2025

/**
 * Network prefix mappings for Nigerian mobile operators
 * These prefixes are used to auto-detect the network from phone numbers
 */
export const NETWORK_PREFIXES: Record<string, string[]> = {
  mtn: [
    '0803',
    '0806',
    '0810',
    '0813',
    '0814',
    '0816',
    '0903',
    '0906',
    '0913',
    '0916',
    '0703',
    '0706',
  ],
  glo: ['0805', '0807', '0811', '0815', '0905', '0915', '0705'],
  airtel: ['0802', '0808', '0812', '0901', '0902', '0904', '0907', '0912', '0701', '0708'],
  '9mobile': ['0809', '0817', '0818', '0909', '0908'],
};

/**
 * Detects the network provider based on phone number prefix
 * @param phoneNumber - The phone number to check (can include spaces/dashes)
 * @returns Network code ('mtn', 'glo', 'airtel', '9mobile') or null if unknown
 */
export function detectNetwork(phoneNumber: string): string | null {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');

  // Need at least 4 digits to detect
  if (cleaned.length < 4) {
    return null;
  }

  // Extract first 4 digits (prefix)
  const prefix = cleaned.substring(0, 4);

  // Search for matching network
  for (const [network, prefixes] of Object.entries(NETWORK_PREFIXES)) {
    if (prefixes.includes(prefix)) {
      return network;
    }
  }

  return null; // Unknown prefix
}

/**
 * Validates if a phone number is a valid Nigerian mobile number
 * @param phoneNumber - The phone number to validate
 * @returns true if valid, false otherwise
 */
export function isValidNigerianNumber(phoneNumber: string): boolean {
  const cleaned = phoneNumber.replace(/\D/g, '');

  // Must be 11 digits starting with 0, or 10 digits without leading 0
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return true;
  }

  if (cleaned.length === 10 && !cleaned.startsWith('0')) {
    return true;
  }

  return false;
}

/**
 * Formats a phone number for display
 * @param phoneNumber - The phone number to format
 * @returns Formatted phone number (e.g., "0803 456 7890")
 */
export function formatPhoneNumber(phoneNumber: string): string {
  const cleaned = phoneNumber.replace(/\D/g, '');

  if (cleaned.length === 11) {
    return `${cleaned.substring(0, 4)} ${cleaned.substring(4, 7)} ${cleaned.substring(7)}`;
  }

  return phoneNumber;
}
