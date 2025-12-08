import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { ISmsProvider } from '../interfaces/sms-provider.interface';
import { verificationCodeSmsTemplate } from '../templates/verification-code.template';

interface TermiiSendResponse {
  code: string;
  message_id: string;
  message: string;
  balance: number;
  user: string;
}

interface TermiiBalanceResponse {
  user: string;
  balance: number;
  currency: string;
}

@Injectable()
export class TermiiProvider implements ISmsProvider {
  private readonly logger = new Logger(TermiiProvider.name);
  private readonly client: AxiosInstance;
  private readonly apiKey: string;
  private readonly sender: string;
  private readonly enabled: boolean;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('TERMII_API_KEY', '');
    this.sender =
      this.configService.get<string>('TERMII_SENDER_ID') || 'RaverPay';
    this.enabled =
      this.configService.get<string>('ENABLE_SMS_VERIFICATION') === 'true';

    this.client = axios.create({
      baseURL:
        this.configService.get<string>('TERMII_BASE_URL') ||
        'https://api.ng.termii.com',
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (this.apiKey) {
      this.logger.log('✅ Termii SMS provider initialized');
    } else {
      this.logger.warn(
        '⚠️  TERMII_API_KEY not found - SMS service will run in MOCK mode',
      );
    }
  }

  getProviderName(): string {
    return 'Termii';
  }

  /**
   * Send verification code SMS
   */
  async sendVerificationCode(
    phone: string,
    code: string,
    firstName: string,
  ): Promise<boolean> {
    if (!this.enabled) {
      console.log('Is enabled: ', this.enabled);
      this.logger.log(
        `📱 [MOCK] [${this.getProviderName()}] Verification code SMS to ${phone}: ${code}`,
      );
      return true;
    }

    if (!this.apiKey) {
      this.logger.warn(
        `📱 [MOCK] [${this.getProviderName()}] Would send verification code to ${phone}: ${code}`,
      );
      return true;
    }

    try {
      // Format phone number
      const formattedPhone = this.formatPhoneNumber(phone);

      // Get SMS message
      const message = verificationCodeSmsTemplate(code, firstName);

      const payload = {
        to: formattedPhone,
        from: this.sender,
        sms: message,
        type: 'plain',
        api_key: this.apiKey,
        channel: 'generic', // Use DND for transactional/OTP messages
      };

      const response = await this.client.post<TermiiSendResponse>(
        '/api/sms/send',
        payload,
      );

      // Check if SMS was sent successfully
      if (response.data.code === 'ok') {
        this.logger.log(
          `✅ [${this.getProviderName()}] Verification SMS sent to ${phone} (ID: ${response.data.message_id}, Balance: ${response.data.balance})`,
        );
        return true;
      } else {
        this.logger.error(
          `[${this.getProviderName()}] Failed to send SMS to ${phone}: ${response.data.message}`,
        );
        return false;
      }
    } catch (error) {
      this.logger.error(
        `[${this.getProviderName()}] Error sending verification SMS to ${phone}:`,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error?.response?.data || error.message,
      );
      return false;
    }
  }

  /**
   * Send password reset SMS
   */
  async sendPasswordResetSms(
    phone: string,
    code: string,
    firstName: string,
  ): Promise<boolean> {
    if (!this.enabled) {
      this.logger.log(
        `📱 [MOCK] [${this.getProviderName()}] Password reset SMS to ${phone}: ${code}`,
      );
      return true;
    }

    if (!this.apiKey) {
      this.logger.warn(
        `📱 [MOCK] [${this.getProviderName()}] Would send password reset code to ${phone}: ${code}`,
      );
      return true;
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      const message = `Hi ${firstName}! Your RaverPay password reset code is: ${code}. Valid for 10 minutes. Never share this code. - RaverPay`;

      const payload = {
        to: formattedPhone,
        from: this.sender,
        sms: message,
        type: 'plain',
        api_key: this.apiKey,
        channel: 'generic', // Use DND for transactional messages
      };

      const response = await this.client.post<TermiiSendResponse>(
        '/api/sms/send',
        payload,
      );

      if (response.data.code === 'ok') {
        this.logger.log(
          `✅ [${this.getProviderName()}] Password reset SMS sent to ${phone} (ID: ${response.data.message_id})`,
        );
        return true;
      }

      this.logger.error(
        `[${this.getProviderName()}] Failed to send password reset SMS: ${response.data.message}`,
      );
      return false;
    } catch (error) {
      this.logger.error(
        `[${this.getProviderName()}] Error sending password reset SMS to ${phone}:`,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error?.response?.data || error.message,
      );
      return false;
    }
  }

  /**
   * Send transaction alert SMS
   */
  async sendTransactionAlert(
    phone: string,
    firstName: string,
    transactionDetails: {
      type: string;
      amount: string;
      reference: string;
    },
  ): Promise<boolean> {
    if (!this.enabled) {
      this.logger.log(
        `📱 [MOCK] [${this.getProviderName()}] Transaction alert SMS to ${phone}`,
      );
      return true;
    }

    if (!this.apiKey) {
      this.logger.warn(
        `📱 [MOCK] [${this.getProviderName()}] Would send transaction alert to ${phone}`,
      );
      return true;
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      const message = `Hi ${firstName}! Your ${transactionDetails.type} of ₦${transactionDetails.amount} was successful. Ref: ${transactionDetails.reference}. - RaverPay`;

      const payload = {
        to: formattedPhone,
        from: this.sender,
        sms: message,
        type: 'plain',
        api_key: this.apiKey,
        channel: 'generic', // Transaction alerts are transactional
      };

      const response = await this.client.post<TermiiSendResponse>(
        '/api/sms/send',
        payload,
      );

      if (response.data.code === 'ok') {
        this.logger.log(
          `✅ [${this.getProviderName()}] Transaction alert SMS sent to ${phone} (ID: ${response.data.message_id})`,
        );
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(
        `[${this.getProviderName()}] Error sending transaction alert SMS to ${phone}:`,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error?.response?.data || error.message,
      );
      return false;
    }
  }

  /**
   * Check SMS balance
   */
  async checkBalance(): Promise<number> {
    if (!this.apiKey) {
      this.logger.warn(
        `📱 [MOCK] [${this.getProviderName()}] SMS balance check - no credentials`,
      );
      return 0;
    }

    try {
      const response = await this.client.get<TermiiBalanceResponse>(
        `/api/get-balance?api_key=${this.apiKey}`,
      );

      const balance = response.data.balance;
      this.logger.log(
        `💰 [${this.getProviderName()}] SMS Balance: ${balance} ${response.data.currency}`,
      );
      return balance;
    } catch (error) {
      this.logger.error(
        `[${this.getProviderName()}] Error checking SMS balance:`,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error?.response?.data || error?.message,
      );
      return 0;
    }
  }

  /**
   * Format phone number to international format
   * Converts: 08012345678 → 2348012345678
   */
  private formatPhoneNumber(phone: string): string {
    // Remove any spaces, dashes, or plus signs
    let cleaned = phone.replace(/[\s\-+]/g, '');

    // If starts with 0, replace with 234
    if (cleaned.startsWith('0')) {
      cleaned = '234' + cleaned.substring(1);
    }

    // If doesn't start with 234, prepend it
    if (!cleaned.startsWith('234')) {
      cleaned = '234' + cleaned;
    }

    return cleaned;
  }
}
