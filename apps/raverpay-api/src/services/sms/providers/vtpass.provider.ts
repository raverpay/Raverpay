import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { ISmsProvider } from '../interfaces/sms-provider.interface';
import { verificationCodeSmsTemplate } from '../templates/verification-code.template';

interface VTPassSMSResponse {
  responseCode: string;
  response: string;
  batchId: number;
  clientBatchId: string | null;
  sentDate: string;
  messages: Array<{
    statusCode: string;
    recipient: string;
    messageId: string;
    status: string;
    description: string;
    network: string;
    country: string;
    deliveryCode: string;
    deliveryDate: string;
    bulkId: string;
  }>;
}

@Injectable()
export class VTPassProvider implements ISmsProvider {
  private readonly logger = new Logger(VTPassProvider.name);
  private readonly client: AxiosInstance;
  private readonly publicKey: string;
  private readonly secretKey: string;
  private readonly sender: string;
  private readonly enabled: boolean;
  private readonly useDndRoute: boolean;

  constructor(private configService: ConfigService) {
    this.publicKey = this.configService.get<string>(
      'VTPASS_MESSAGING_PUBLIC_KEY',
      '',
    );
    this.secretKey = this.configService.get<string>(
      'VTPASS_MESSAGING_SECRET_KEY',
      '',
    );
    this.sender =
      this.configService.get<string>('VTPASS_SMS_SENDER') || 'MularPay';
    this.enabled =
      this.configService.get<string>('ENABLE_SMS_VERIFICATION') === 'true';
    this.useDndRoute =
      this.configService.get<string>('VTPASS_USE_DND_ROUTE') === 'true';

    this.client = axios.create({
      baseURL: 'https://messaging.vtpass.com',
      timeout: 15000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (this.publicKey && this.secretKey) {
      this.logger.log('✅ VTPass SMS provider initialized');
    } else {
      this.logger.warn(
        '⚠️  VTPASS_MESSAGING keys not found - SMS service will run in MOCK mode',
      );
    }
  }

  getProviderName(): string {
    return 'VTPass';
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
      this.logger.log(
        `📱 [MOCK] [${this.getProviderName()}] Verification code SMS to ${phone}: ${code}`,
      );
      return true;
    }

    if (!this.publicKey || !this.secretKey) {
      this.logger.warn(
        `📱 [MOCK] [${this.getProviderName()}] Would send verification code to ${phone}: ${code}`,
      );
      return true;
    }

    try {
      // Format phone number (ensure it starts with 234)
      const formattedPhone = this.formatPhoneNumber(phone);

      // Get SMS message
      const message = verificationCodeSmsTemplate(code, firstName);

      // Choose route based on configuration
      const endpoint = this.useDndRoute
        ? '/v2/api/sms/dnd-fallback' // Uses normal route, falls back to DND if needed
        : '/v2/api/sms/sendsms'; // Normal route only

      // Prepare form data
      const params = new URLSearchParams();
      params.append('sender', this.sender);
      params.append('recipient', formattedPhone);
      params.append('message', message);
      params.append('responsetype', 'json');

      const response = await this.client.post<VTPassSMSResponse>(
        endpoint,
        params,
        {
          headers: {
            'X-Token': this.publicKey,
            'X-Secret': this.secretKey,
          },
        },
      );

      // Check if SMS was processed
      if (response.data.responseCode === 'TG00') {
        const message = response.data.messages[0];
        if (message.status === 'SENT' || message.status === 'DND_SENT') {
          this.logger.log(
            `✅ [${this.getProviderName()}] Verification SMS sent to ${phone} (ID: ${message.messageId}, Network: ${message.network})`,
          );
          return true;
        } else {
          this.logger.error(
            `[${this.getProviderName()}] Failed to send SMS to ${phone}: ${message.status} - ${message.description}`,
          );
          return false;
        }
      } else {
        this.logger.error(
          `[${this.getProviderName()}] SMS API error: ${response.data.responseCode} - ${response.data.response}`,
        );
        return false;
      }
    } catch (error) {
      this.logger.error(
        `[${this.getProviderName()}] Error sending verification SMS to ${phone}:`,
        error,
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

    if (!this.publicKey || !this.secretKey) {
      this.logger.warn(
        `📱 [MOCK] [${this.getProviderName()}] Would send password reset code to ${phone}: ${code}`,
      );
      return true;
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      const message = `Hi ${firstName}! Your MularPay password reset code is: ${code}. Valid for 10 minutes. Never share this code. - MularPay`;

      const endpoint = this.useDndRoute
        ? '/v2/api/sms/dnd-fallback'
        : '/v2/api/sms/sendsms';

      const params = new URLSearchParams();
      params.append('sender', this.sender);
      params.append('recipient', formattedPhone);
      params.append('message', message);
      params.append('responsetype', 'json');

      const response = await this.client.post<VTPassSMSResponse>(
        endpoint,
        params,
        {
          headers: {
            'X-Token': this.publicKey,
            'X-Secret': this.secretKey,
          },
        },
      );

      if (response.data.responseCode === 'TG00') {
        const msg = response.data.messages[0];
        if (msg.status === 'SENT' || msg.status === 'DND_SENT') {
          this.logger.log(
            `✅ [${this.getProviderName()}] Password reset SMS sent to ${phone} (ID: ${msg.messageId})`,
          );
          return true;
        }
      }

      this.logger.error(
        `[${this.getProviderName()}] Failed to send password reset SMS: ${response.data.response}`,
      );
      return false;
    } catch (error) {
      this.logger.error(
        `[${this.getProviderName()}] Error sending password reset SMS to ${phone}:`,
        error,
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

    if (!this.publicKey || !this.secretKey) {
      this.logger.warn(
        `📱 [MOCK] [${this.getProviderName()}] Would send transaction alert to ${phone}`,
      );
      return true;
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      const message = `Hi ${firstName}! Your ${transactionDetails.type} of ₦${transactionDetails.amount} was successful. Ref: ${transactionDetails.reference}. - MularPay`;

      const params = new URLSearchParams();
      params.append('sender', this.sender);
      params.append('recipient', formattedPhone);
      params.append('message', message);
      params.append('responsetype', 'json');

      const response = await this.client.post<VTPassSMSResponse>(
        '/v2/api/sms/sendsms',
        params,
        {
          headers: {
            'X-Token': this.publicKey,
            'X-Secret': this.secretKey,
          },
        },
      );

      if (response.data.responseCode === 'TG00') {
        const msg = response.data.messages[0];
        if (msg.status === 'SENT' || msg.status === 'DND_SENT') {
          this.logger.log(
            `✅ [${this.getProviderName()}] Transaction alert SMS sent to ${phone} (ID: ${msg.messageId})`,
          );
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.error(
        `[${this.getProviderName()}] Error sending transaction alert SMS to ${phone}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Check SMS balance
   */
  async checkBalance(): Promise<number> {
    if (!this.publicKey || !this.secretKey) {
      this.logger.warn(
        `📱 [MOCK] [${this.getProviderName()}] SMS balance check - no credentials`,
      );
      return 0;
    }

    try {
      const response = await this.client.get<string>('/api/sms/balance', {
        headers: {
          'X-Token': this.publicKey,
          'X-Secret': this.secretKey,
        },
      });

      const balance = parseFloat(String(response.data));
      this.logger.log(
        `💰 [${this.getProviderName()}] SMS Balance: ${balance} units`,
      );
      return balance;
    } catch (error) {
      this.logger.error(
        `[${this.getProviderName()}] Error checking SMS balance:`,
        error,
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
