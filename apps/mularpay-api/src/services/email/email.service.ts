import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { verificationCodeTemplate } from './templates/verification-code.template';
import { welcomeEmailTemplate } from './templates/welcome.template';

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
      this.configService.get<string>('RESEND_FROM_NAME') || 'MularPay';
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
      const { html, subject } = verificationCodeTemplate(code, firstName, true);

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
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">MularPay</h1>
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
              
              <p style="color: #666; font-size: 14px;">If you have any questions, please contact our support team.</p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #999; font-size: 12px;">
                <p>MularPay - Your Trusted Fintech Partner</p>
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
}
