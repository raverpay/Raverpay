/**
 * List of reserved tags that cannot be used for P2P transfers
 * These tags are reserved for system use, admin accounts, and brand protection
 */
export const RESERVED_TAGS = [
  // System reserved
  'admin',
  'support',
  'system',
  'official',
  'help',
  'security',
  'root',
  'superadmin',
  'moderator',
  'staff',

  // Brand reserved
  'mularpay',
  'raverpay',
  'mular',
  'raver',
  'pay',

  // Financial terms
  'payment',
  'payments',
  'wallet',
  'wallets',
  'bank',
  'banks',
  'transaction',
  'transactions',
  'transfer',
  'transfers',
  'withdrawal',
  'withdrawals',
  'deposit',
  'deposits',

  // Technical reserved
  'api',
  'bot',
  'service',
  'webhook',
  'callback',
  'null',
  'undefined',
  'admin',
  'root',

  // Common reserved
  'guest',
  'user',
  'users',
  'customer',
  'customers',
  'account',
  'accounts',
];

/**
 * Check if a tag is reserved
 * @param tag - Tag to check (case-insensitive)
 * @returns true if the tag is reserved
 */
export function isReservedTag(tag: string): boolean {
  return RESERVED_TAGS.includes(tag.toLowerCase());
}

/**
 * Validate tag format
 * @param tag - Tag to validate
 * @returns true if valid, error message if invalid
 */
export function validateTag(tag: string): { valid: boolean; error?: string } {
  const trimmed = tag.trim().toLowerCase();

  // Check length
  if (trimmed.length < 3) {
    return { valid: false, error: 'Tag must be at least 3 characters long' };
  }

  if (trimmed.length > 20) {
    return { valid: false, error: 'Tag must not exceed 20 characters' };
  }

  // Check format (alphanumeric + underscores only)
  const validFormat = /^[a-z0-9_]+$/;
  if (!validFormat.test(trimmed)) {
    return {
      valid: false,
      error: 'Tag can only contain lowercase letters, numbers, and underscores',
    };
  }

  // Check reserved words
  if (isReservedTag(trimmed)) {
    return { valid: false, error: 'This tag is reserved and cannot be used' };
  }

  return { valid: true };
}
