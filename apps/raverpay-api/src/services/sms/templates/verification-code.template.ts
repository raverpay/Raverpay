/**
 * SMS template for verification code
 * Keep it short (max 160 characters for single SMS page)
 */
export function verificationCodeSmsTemplate(
  code: string,
  firstName: string,
): string {
  // Short and sweet - fits in single SMS (< 160 chars)
  return `Hi ${firstName}! Your RaverPay verification code is: ${code}. Valid for 10 minutes. Never share this code. - RaverPay`;
}

/**
 * Alternative template (even shorter)
 */
export function verificationCodeShortTemplate(code: string): string {
  return `Your RaverPay code is ${code}. Valid for 10 mins. Do not share.`;
}

/**
 * Welcome SMS template
 */
export function welcomeSmsTemplate(firstName: string): string {
  return `Hi ${firstName}! Welcome to RaverPay! Your account is ready. Start buying airtime, data, paying bills and more. Enjoy seamless payments! - RaverPay`;
}

/**
 * Transaction success template
 */
export function transactionSuccessSmsTemplate(
  firstName: string,
  type: string,
  amount: string,
  reference: string,
): string {
  return `Hi ${firstName}! Your ${type} of ₦${amount} was successful. Ref: ${reference}. Thank you for using RaverPay!`;
}

/**
 * Low balance alert template
 */
export function lowBalanceAlertTemplate(
  firstName: string,
  balance: string,
): string {
  return `Hi ${firstName}! Your RaverPay wallet balance is low (₦${balance}). Fund your wallet to continue enjoying our services. - RaverPay`;
}
