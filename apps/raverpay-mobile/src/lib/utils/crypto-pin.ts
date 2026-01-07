// src/lib/utils/crypto-pin.ts
// Crypto wallet uses 6-digit PIN (different from regular transaction PIN which is 4-digit)

// Utility to check for weak 6-digit PINs
const WEAK_6_DIGIT_PINS = [
  '000000',
  '111111',
  '222222',
  '333333',
  '444444',
  '555555',
  '666666',
  '777777',
  '888888',
  '999999',
  '123456',
  '654321',
  '012345',
  '123450',
  '000001',
  '111110',
];

export function isWeakCryptoPin(pin: string): boolean {
  return WEAK_6_DIGIT_PINS.includes(pin);
}

export function validateCryptoPin(pin: string): {
  isValid: boolean;
  error?: string;
} {
  if (pin.length !== 6) {
    return {
      isValid: false,
      error: 'PIN must be 6 digits',
    };
  }

  if (!/^\d{6}$/.test(pin)) {
    return {
      isValid: false,
      error: 'PIN must contain only numbers',
    };
  }

  if (isWeakCryptoPin(pin)) {
    return {
      isValid: false,
      error: 'PIN is too weak. Please choose a more secure PIN',
    };
  }

  return { isValid: true };
}
