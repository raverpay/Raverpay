/**
 * Birthday SMS Template
 * Returns formatted SMS message for birthday wishes
 */

export function birthdaySmsTemplate(firstName: string): string {
  // Keep it short for SMS (max 160 characters)
  return `Happy Birthday, ${firstName}! The RaverPay team wishes you a wonderful day filled with joy. Thank you for being part of our family!`;
}
