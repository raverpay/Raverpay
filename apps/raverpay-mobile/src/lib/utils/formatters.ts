// lib/utils/formatters.ts
import { format, formatDistanceToNow } from 'date-fns';

export const formatCurrency = (amount: number, showSymbol: boolean = true): string => {
  const formatted = new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  return showSymbol ? `₦${formatted}` : formatted;
};

export const formatPhone = (phone: string): string => {
  // Remove +234 prefix if exists
  let cleaned = phone.replace(/^\+234/, '0');

  // Format as 0801 234 5678
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }

  return cleaned;
};

export const formatDate = (date: string | Date, pattern: string = 'MMM dd, yyyy'): string => {
  try {
    return format(new Date(date), pattern);
  } catch {
    return 'Invalid date';
  }
};

export const formatDateTime = (date: string | Date): string => {
  try {
    return format(new Date(date), "MMM dd, yyyy 'at' hh:mm a");
  } catch {
    return 'Invalid date';
  }
};

export const formatRelativeTime = (date: string | Date): string => {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return 'Invalid date';
  }
};

export const formatCardNumber = (cardNumber: string): string => {
  // Format as **** **** **** 1234
  const last4 = cardNumber.slice(-4);
  return `**** **** **** ${last4}`;
};

export const formatReference = (reference: string): string => {
  // Format transaction reference for display
  return reference.toUpperCase();
};

export const maskEmail = (email: string): string => {
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 3) {
    return `${localPart[0]}***@${domain}`;
  }
  return `${localPart.slice(0, 3)}***@${domain}`;
};

export const maskPhone = (phone: string): string => {
  // Format as 0801 *** **78
  const cleaned = phone.replace(/^\+234/, '0');
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 4)} *** **${cleaned.slice(-2)}`;
  }
  return cleaned;
};
