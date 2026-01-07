// lib/utils/validators.ts
import { z } from 'zod';

// Email validation
export const emailSchema = z.string().email('Invalid email address').toLowerCase();

// Phone validation (Nigerian)
export const phoneSchema = z
  .string()
  .regex(/^(\+?234|0)[789]\d{9}$/, 'Invalid phone number. Must be a valid Nigerian number');

// Password validation
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d@$!%*?&#])/,
    'Password must contain uppercase, lowercase, and a number or special character',
  );

// PIN validation
export const pinSchema = z
  .string()
  .length(4, 'PIN must be exactly 4 digits')
  .regex(/^\d{4}$/, 'PIN must contain only numbers')
  .refine(
    (pin) =>
      ![
        '0000',
        '1111',
        '2222',
        '3333',
        '4444',
        '5555',
        '6666',
        '7777',
        '8888',
        '9999',
        '1234',
        '4321',
      ].includes(pin),
    'PIN is too weak. Please choose a stronger PIN',
  );

// BVN validation
export const bvnSchema = z
  .string()
  .length(11, 'BVN must be exactly 11 digits')
  .regex(/^\d{11}$/, 'BVN must contain only numbers');

// NIN validation
export const ninSchema = z
  .string()
  .length(11, 'NIN must be exactly 11 digits')
  .regex(/^\d{11}$/, 'NIN must contain only numbers');

// Amount validation
export const amountSchema = (min: number = 100, max?: number) =>
  z
    .number()
    .min(min, `Amount must be at least ₦${min}`)
    .refine((val) => !max || val <= max, `Amount must not exceed ₦${max?.toLocaleString()}`);

// Name validation
export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must not exceed 50 characters')
  .regex(/^[a-zA-Z\s-']+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');

// Date validation
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD');

// Utility functions
export const isValidEmail = (email: string): boolean => {
  try {
    emailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
};

export const isValidPhone = (phone: string): boolean => {
  try {
    phoneSchema.parse(phone);
    return true;
  } catch {
    return false;
  }
};

export const isValidPassword = (password: string): boolean => {
  try {
    passwordSchema.parse(password);
    return true;
  } catch {
    return false;
  }
};

export const getPasswordStrength = (
  password: string,
): {
  level: 'Weak' | 'Medium' | 'Strong';
  score: number;
} => {
  let score = 0;

  // Return weak for empty or very short passwords
  if (!password || password.length < 4) {
    return { level: 'Weak', score: 0 };
  }

  // Length
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;

  // Character types
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[@$!%*?&#]/.test(password)) score += 1;

  if (score <= 2) return { level: 'Weak', score };
  if (score <= 4) return { level: 'Medium', score };
  return { level: 'Strong', score };
};
