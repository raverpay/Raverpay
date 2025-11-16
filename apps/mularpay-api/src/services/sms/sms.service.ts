import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISmsProvider } from './interfaces/sms-provider.interface';
import { VTPassProvider } from './providers/vtpass.provider';
import { TermiiProvider } from './providers/termii.provider';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly provider: ISmsProvider;

  constructor(private configService: ConfigService) {
    // Determine which SMS provider to use
    const smsProvider = this.configService
      .get<string>('SMS_PROVIDER', 'termii')
      .toLowerCase();

    // Initialize the appropriate provider
    if (smsProvider === 'vtpass') {
      this.provider = new VTPassProvider(configService);
      this.logger.log('📱 SMS Service using provider: VTPass');
    } else if (smsProvider === 'termii') {
      this.provider = new TermiiProvider(configService);
      this.logger.log('📱 SMS Service using provider: Termii');
    } else {
      // Default to Termii
      this.logger.warn(
        `⚠️  Unknown SMS provider "${smsProvider}", defaulting to Termii`,
      );
      this.provider = new TermiiProvider(configService);
    }
  }

  /**
   * Send verification code SMS
   */
  async sendVerificationCode(
    phone: string,
    code: string,
    firstName: string,
  ): Promise<boolean> {
    return this.provider.sendVerificationCode(phone, code, firstName);
  }

  /**
   * Send password reset SMS
   */
  async sendPasswordResetSms(
    phone: string,
    code: string,
    firstName: string,
  ): Promise<boolean> {
    return this.provider.sendPasswordResetSms(phone, code, firstName);
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
    return this.provider.sendTransactionAlert(
      phone,
      firstName,
      transactionDetails,
    );
  }

  /**
   * Check SMS balance
   */
  async checkBalance(): Promise<number> {
    return this.provider.checkBalance();
  }

  /**
   * Get current provider name
   */
  getProviderName(): string {
    return this.provider.getProviderName();
  }

  /**
   * Send generic notification SMS (used by NotificationDispatcher)
   */
  async sendGenericNotification(
    phone: string,
    firstName: string,
    message: string,
  ): Promise<boolean> {
    // Format phone number (ensure it starts with 234)
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '234' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('234')) {
      formattedPhone = '234' + formattedPhone;
    }

    // Truncate message to 160 characters for SMS
    const truncatedMessage =
      message.length > 160 ? message.substring(0, 157) + '...' : message;

    // Format: "Hi {name}! {message} - MularPay"
    const smsText = `Hi ${firstName}! ${truncatedMessage} - MularPay`;

    this.logger.log(
      `Sending generic notification SMS to ${formattedPhone} via ${this.getProviderName()}`,
    );

    // Use the provider's send method
    // For now, we'll use the transaction alert method as a fallback
    // TODO: Add sendGenericSms to ISmsProvider interface
    try {
      return await this.provider.sendTransactionAlert(phone, firstName, {
        type: 'NOTIFICATION',
        amount: '',
        reference: truncatedMessage,
      });
    } catch (error) {
      this.logger.error(`Failed to send generic SMS:`, error);
      return false;
    }
  }
}
