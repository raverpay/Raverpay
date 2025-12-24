import { Injectable, Logger } from '@nestjs/common';
import { CircleApiClient } from '../circle-api.client';

/**
 * Email Authentication Service
 * Handles email OTP authentication for user-controlled wallets
 */
@Injectable()
export class EmailAuthService {
  private readonly logger = new Logger(EmailAuthService.name);

  constructor(private readonly circleApi: CircleApiClient) {}

  /**
   * Get device token for email authentication
   * This initiates the email OTP flow
   */
  async getDeviceToken(params: { email: string; deviceId: string }) {
    const { email, deviceId } = params;

    this.logger.log(`Getting device token for email: ${email}`);

    try {
      const response = await this.circleApi.post<{
        data: {
          deviceToken: string;
          deviceEncryptionKey: string;
          otpToken?: string;
        };
      }>('/w3s/users/email/token', {
        idempotencyKey: this.circleApi.generateIdempotencyKey(),
        email,
        deviceId,
      });

      this.logger.log(`Device token generated for: ${email}`);

      return {
        deviceToken: response.data.data.deviceToken,
        deviceEncryptionKey: response.data.data.deviceEncryptionKey,
        otpToken: response.data.data.otpToken,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get device token: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to get device token: ${error.message}`);
    }
  }

  /**
   * Verify OTP code
   * Note: OTP verification is typically handled by the Circle SDK on the client side
   * This method is here for reference but may not be called directly from backend
   */
  async verifyOTP(params: { otpToken: string; otp: string }) {
    const { otpToken, otp } = params;

    this.logger.log('Verifying OTP');

    try {
      // Note: Circle's OTP verification is handled client-side via their SDK
      // This is a placeholder for any backend verification logic if needed

      this.logger.log('OTP verification initiated');

      return {
        verified: true,
      };
    } catch (error) {
      this.logger.error(`Failed to verify OTP: ${error.message}`, error.stack);
      throw new Error(`Failed to verify OTP: ${error.message}`);
    }
  }
}
