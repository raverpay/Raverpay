/**
 * SMS Provider Interface
 * All SMS providers (VTPass, Termii, etc.) must implement this interface
 */
export interface ISmsProvider {
  /**
   * Send verification code SMS
   */
  sendVerificationCode(
    phone: string,
    code: string,
    firstName: string,
  ): Promise<boolean>;

  /**
   * Send password reset SMS
   */
  sendPasswordResetSms(
    phone: string,
    code: string,
    firstName: string,
  ): Promise<boolean>;

  /**
   * Send transaction alert SMS
   */
  sendTransactionAlert(
    phone: string,
    firstName: string,
    transactionDetails: {
      type: string;
      amount: string;
      reference: string;
    },
  ): Promise<boolean>;

  /**
   * Check SMS balance (optional, can return 0 if not supported)
   */
  checkBalance(): Promise<number>;

  /**
   * Get provider name
   */
  getProviderName(): string;
}
