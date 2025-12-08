import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { verificationCodeTemplate } from './templates/verification-code.template';
import { welcomeEmailTemplate } from './templates/welcome.template';
import { vtuTransactionEmailTemplate } from './templates/vtu-transaction.template';
import { birthdayEmailTemplate } from './templates/birthday.template';
import { withdrawalTransactionEmailTemplate } from './templates/withdrawal-transaction.template';
import { walletLockedTemplate } from './templates/wallet-locked.template';
import { deviceVerificationTemplate } from './templates/device-verification.template';
import { p2pTransferEmailTemplate } from './templates/p2p-transfer.template';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly enabled: boolean;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      'noreply@expertvetteddigital.tech';
    this.fromName =
      this.configService.get<string>('RESEND_FROM_NAME') || 'RaverPay';
    this.enabled =
      this.configService.get<string>('ENABLE_EMAIL_VERIFICATION') === 'true';

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('✅ Resend email service initialized');
    } else {
      this.logger.warn(
        '⚠️ RESEND_API_KEY not found - Email service will run in MOCK mode',
      );
    }
    this.logger.log(
      `EmailService config -> enabled=${this.enabled}, resendInitialized=${!!this.resend}, from="${this.fromName} <${this.fromEmail}>"`,
    );
  }

  /**
   * Send verification code email
   */
  async sendVerificationCode(
    email: string,
    code: string,
    firstName: string,
  ): Promise<boolean> {
    this.logger.log(
      `sendVerificationCode called -> to=${email}, enabled=${this.enabled}, resendInitialized=${!!this.resend}`,
    );
    if (!this.enabled) {
      this.logger.log(`📧 [MOCK] Verification code email to ${email}: ${code}`);
      return true;
    }

    if (!this.resend) {
      this.logger.warn(
        `📧 [MOCK] Would send verification code to ${email}: ${code}`,
      );
      return true;
    }

    try {
      const { html, subject } = verificationCodeTemplate(code, firstName);

      const result = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [email],
        subject,
        html,
      });

      if (result.error) {
        this.logger.error(
          `Failed to send verification email to ${email}:`,
          result.error,
        );
        return false;
      }

      this.logger.log(
        `✅ Verification email sent to ${email} (ID: ${result.data?.id})`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Error sending verification email to ${email}:`, error);
      return false;
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, firstName: string): Promise<boolean> {
    if (!this.enabled) {
      this.logger.log(`📧 [MOCK] Welcome email to ${email}`);
      return true;
    }

    if (!this.resend) {
      this.logger.warn(`📧 [MOCK] Would send welcome email to ${email}`);
      return true;
    }

    try {
      const { html, subject } = welcomeEmailTemplate(firstName);

      const result = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [email],
        subject,
        html,
      });

      if (result.error) {
        this.logger.error(
          `Failed to send welcome email to ${email}:`,
          result.error,
        );
        return false;
      }

      this.logger.log(
        `✅ Welcome email sent to ${email} (ID: ${result.data?.id})`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Error sending welcome email to ${email}:`, error);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    code: string,
    firstName: string,
  ): Promise<boolean> {
    if (!this.enabled) {
      this.logger.log(`📧 [MOCK] Password reset email to ${email}: ${code}`);
      return true;
    }

    if (!this.resend) {
      this.logger.warn(
        `📧 [MOCK] Would send password reset code to ${email}: ${code}`,
      );
      return true;
    }

    try {
      const { html, subject } = verificationCodeTemplate(firstName, code, true);

      const result = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [email],
        subject,
        html,
      });

      if (result.error) {
        this.logger.error(
          `Failed to send password reset email to ${email}:`,
          result.error,
        );
        return false;
      }

      this.logger.log(
        `✅ Password reset email sent to ${email} (ID: ${result.data?.id})`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Error sending password reset email to ${email}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Send transaction receipt email
   */
  async sendTransactionReceipt(
    email: string,
    firstName: string,
    transactionDetails: {
      type: string;
      amount: string;
      reference: string;
      date: string;
    },
  ): Promise<boolean> {
    if (!this.enabled) {
      this.logger.log(`📧 [MOCK] Transaction receipt to ${email}`);
      return true;
    }

    if (!this.resend) {
      this.logger.warn(`📧 [MOCK] Would send transaction receipt to ${email}`);
      return true;
    }

    try {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #5B55F6; color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">RaverPay</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Transaction Receipt</p>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
              <p>Hi <strong>${firstName}</strong>,</p>
              
              <p>Your transaction was successful!</p>
              
              <div style="background: #f7f7f7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Type:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600;">${transactionDetails.type}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Amount:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600;">₦${transactionDetails.amount}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Reference:</td>
                    <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px;">${transactionDetails.reference}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Date:</td>
                    <td style="padding: 8px 0; text-align: right;">${transactionDetails.date}</td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #666; font-size: 14px;">If you have any questions, please contact our support team. support@raverpay.com</p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #999; font-size: 12px;">
                <p>RaverPay - Your Trusted Fintech Partner</p>
                <p>This is an automated email, please do not reply.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const result = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [email],
        subject: `Transaction Receipt - ${transactionDetails.reference}`,
        html,
      });

      if (result.error) {
        this.logger.error(
          `Failed to send transaction receipt to ${email}:`,
          result.error,
        );
        return false;
      }

      this.logger.log(
        `✅ Transaction receipt sent to ${email} (ID: ${result.data?.id})`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Error sending transaction receipt to ${email}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Send generic notification email (used by NotificationDispatcher)
   */
  async sendGenericNotification(
    email: string,
    firstName: string,
    title: string,
    message: string,
    data?: any,
  ): Promise<boolean> {
    if (!this.enabled) {
      this.logger.log(`📧 [MOCK] Generic notification to ${email}: ${title}`);
      return true;
    }

    if (!this.resend) {
      this.logger.warn(
        `📧 [MOCK] Would send notification to ${email}: ${title}`,
      );
      return true;
    }

    try {
      // Filter out internal metadata that shouldn't be shown to users
      const internalKeys = [
        'broadcastId',
        'sentBy',
        'isAdminBroadcast',
        'userId',
        'adminId',
        'internalRef',
        'systemGenerated',
        'requestId',
        'type',
        'rejectionReason',
        'notes',
        'scheduledFor',
        'transactionId', // Internal ID, don't show to users
        'bankCode', // Technical field, bankName is more user-friendly
        'kycTier', // Internal field, not user-friendly
        'upgradeUrl', // Will be shown as button, not text
        'source', // Internal tracking
        'senderTag', // Already in message
        'depositAmount', // Already mentioned in message
        'deviceId', // Internal UUID, not user-friendly
      ];

      const filteredData = data
        ? Object.fromEntries(
            Object.entries(data).filter(([key]) => !internalKeys.includes(key)),
          )
        : null;

      // Only include data section if there's non-internal data to show
      const hasVisibleData =
        filteredData && Object.keys(filteredData).length > 0;

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #5B55F6; color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">RaverPay</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">${title}</p>
            </div>

            <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
              <p>Hi <strong>${firstName}</strong>,</p>

              <p>${message}</p>

              ${
                hasVisibleData
                  ? `<div style="background: #f7f7f7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                ${Object.entries(filteredData)
                  .map(([key, value]) => {
                    // Convert technical keys to user-friendly labels
                    const labelMap: Record<string, string> = {
                      amount: 'Amount',
                      fee: 'Processing Fee',
                      totalDebit: 'Total Debit',
                      accountNumber: 'Account Number',
                      accountName: 'Account Name',
                      bankName: 'Bank',
                      reference: 'Reference',
                      status: 'Status',
                    };
                    const friendlyLabel =
                      labelMap[key] ||
                      key.charAt(0).toUpperCase() +
                        key
                          .slice(1)
                          .replace(/([A-Z])/g, ' $1')
                          .trim();
                    // Format currency values
                    const formattedValue =
                      (key === 'amount' ||
                        key === 'fee' ||
                        key === 'totalDebit') &&
                      typeof value === 'number'
                        ? `₦${value.toLocaleString()}`
                        : value;
                    return `<p style="margin: 5px 0;"><strong>${friendlyLabel}:</strong> ${formattedValue}</p>`;
                  })
                  .join('')}
              </div>`
                  : ''
              }

              <p style="color: #666; font-size: 14px;">If you have any questions, please contact our support team.</p>

              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #999; font-size: 12px;">
                <p>RaverPay - Your Trusted Fintech Partner</p>
                <p>This is an automated email, please do not reply.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const result = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [email],
        subject: title,
        html,
      });

      if (result.error) {
        this.logger.error(
          `Failed to send notification to ${email}:`,
          result.error,
        );
        return false;
      }

      this.logger.log(
        `✅ Notification email sent to ${email} (ID: ${result.data?.id})`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Error sending notification to ${email}:`, error);
      return false;
    }
  }

  /**
   * Send VTU transaction email with professional template
   */
  async sendVTUTransactionEmail(
    email: string,
    details: {
      firstName: string;
      serviceType: string;
      serviceName: string;
      amount: string;
      recipient: string;
      reference: string;
      status: 'success' | 'failed';
      date: string;
      additionalInfo?: { label: string; value: string }[];
    },
  ): Promise<boolean> {
    if (!this.enabled) {
      this.logger.log(
        `📧 [MOCK] VTU transaction email to ${email}: ${details.serviceType}`,
      );
      return true;
    }

    if (!this.resend) {
      this.logger.warn(
        `📧 [MOCK] Would send VTU transaction email to ${email}: ${details.serviceType}`,
      );
      return true;
    }

    try {
      const { html, subject } = vtuTransactionEmailTemplate(details);

      const result = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [email],
        subject,
        html,
      });

      if (result.error) {
        this.logger.error(
          `Failed to send VTU transaction email to ${email}:`,
          result.error,
        );
        return false;
      }

      this.logger.log(
        `✅ VTU transaction email sent to ${email} (ID: ${result.data?.id})`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Error sending VTU transaction email to ${email}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Send birthday email
   */
  async sendBirthdayEmail(
    email: string,
    firstName: string,
    lastName?: string,
  ): Promise<boolean> {
    // Birthday emails should always be sent regardless of enabled flag
    if (!this.resend) {
      this.logger.log(`📧 [MOCK] Birthday email to ${email}`);
      return true;
    }

    try {
      const { html, subject } = birthdayEmailTemplate({ firstName, lastName });

      const result = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [email],
        subject,
        html,
      });

      if (result.error) {
        this.logger.error(
          `Failed to send birthday email to ${email}:`,
          result.error,
        );
        return false;
      }

      this.logger.log(
        `✅ Birthday email sent to ${email} (ID: ${result.data?.id})`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Error sending birthday email to ${email}:`, error);
      return false;
    }
  }

  /**
   * Send withdrawal transaction email with professional template
   */
  async sendWithdrawalTransactionEmail(
    email: string,
    details: {
      firstName: string;
      amount: string;
      fee: string;
      totalDebit: string;
      accountName: string;
      accountNumber: string;
      bankName?: string;
      reference: string;
      status: 'initiated' | 'success' | 'failed';
      date: string;
    },
  ): Promise<boolean> {
    if (!this.enabled) {
      this.logger.log(
        `📧 [MOCK] Withdrawal transaction email to ${email}: ${details.status}`,
      );
      return true;
    }

    if (!this.resend) {
      this.logger.warn(
        `📧 [MOCK] Would send withdrawal transaction email to ${email}: ${details.status}`,
      );
      return true;
    }

    try {
      const { html, subject } = withdrawalTransactionEmailTemplate(details);

      const result = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [email],
        subject,
        html,
      });

      if (result.error) {
        this.logger.error(
          `Failed to send withdrawal transaction email to ${email}:`,
          result.error,
        );
        return false;
      }

      this.logger.log(
        `✅ Withdrawal transaction email sent to ${email} (ID: ${result.data?.id})`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Error sending withdrawal transaction email to ${email}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Send wallet locked notification email
   */
  async sendWalletLockedEmail(
    email: string,
    data: {
      firstName: string;
      depositAmount: number;
      kycTier: 'TIER_0' | 'TIER_1' | 'TIER_2' | 'TIER_3';
      dailyLimit: number;
      upgradeUrl?: string;
    },
  ): Promise<boolean> {
    if (!this.enabled) {
      this.logger.log(
        `📧 [MOCK] Wallet locked email to ${email}: Deposit ₦${data.depositAmount.toLocaleString()}`,
      );
      return true;
    }

    if (!this.resend) {
      this.logger.warn(`📧 [MOCK] Would send wallet locked email to ${email}`);
      return true;
    }

    try {
      const { html, subject } = walletLockedTemplate(data);

      const result = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [email],
        subject,
        html,
      });

      if (result.error) {
        this.logger.error(
          `Failed to send wallet locked email to ${email}:`,
          result.error,
        );
        return false;
      }

      this.logger.log(
        `✅ Wallet locked email sent to ${email} (ID: ${result.data?.id})`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Error sending wallet locked email to ${email}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Send device verification email
   */
  async sendDeviceVerificationEmail(
    email: string,
    data: {
      firstName: string;
      code: string;
      deviceName: string;
      deviceType: string;
      deviceModel?: string;
      osVersion?: string;
    },
  ): Promise<boolean> {
    if (!this.enabled) {
      this.logger.log(
        `📧 [MOCK] Device verification email to ${email}: ${data.code}`,
      );
      return true;
    }

    if (!this.resend) {
      this.logger.warn(
        `📧 [MOCK] Would send device verification email to ${email}`,
      );
      return true;
    }

    try {
      const { html, subject } = deviceVerificationTemplate(
        data.code,
        data.firstName,
        {
          deviceName: data.deviceName,
          deviceType: data.deviceType,
          deviceModel: data.deviceModel,
          osVersion: data.osVersion,
        },
      );

      const result = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [email],
        subject,
        html,
      });

      if (result.error) {
        this.logger.error(
          `Failed to send device verification email to ${email}:`,
          result.error,
        );
        return false;
      }

      this.logger.log(
        `✅ Device verification email sent to ${email} (ID: ${result.data?.id})`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Error sending device verification email to ${email}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Send P2P transfer email (sent or received)
   */
  async sendP2PTransferEmail(
    email: string,
    data: {
      firstName: string;
      amount: number;
      senderName: string;
      senderTag?: string;
      recipientTag?: string;
      message?: string;
      reference: string;
      transactionType: 'received' | 'sent';
    },
  ): Promise<boolean> {
    if (!this.enabled) {
      this.logger.log(
        `📧 [MOCK] P2P transfer email to ${email}: ${data.transactionType}`,
      );
      return true;
    }

    if (!this.resend) {
      this.logger.warn(`📧 [MOCK] Would send P2P transfer email to ${email}`);
      return true;
    }

    try {
      const { html, subject } = p2pTransferEmailTemplate({
        firstName: data.firstName,
        amount: `₦${data.amount.toLocaleString()}`,
        senderName: data.senderName,
        senderTag: data.senderTag,
        recipientTag: data.recipientTag,
        message: data.message,
        reference: data.reference,
        date: new Date().toLocaleString('en-NG', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
        transactionType: data.transactionType,
      });

      const result = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [email],
        subject,
        html,
      });

      if (result.error) {
        this.logger.error(
          `Failed to send P2P transfer email to ${email}:`,
          result.error,
        );
        return false;
      }

      this.logger.log(
        `✅ P2P transfer email sent to ${email} (ID: ${result.data?.id})`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Error sending P2P transfer email to ${email}:`, error);
      return false;
    }
  }
}
