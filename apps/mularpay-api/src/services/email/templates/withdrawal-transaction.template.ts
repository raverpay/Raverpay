/**
 * Withdrawal Transaction Email Template
 * Used for bank withdrawal notifications
 */

interface WithdrawalTransactionDetails {
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
}

export function withdrawalTransactionEmailTemplate(
  details: WithdrawalTransactionDetails,
): { html: string; subject: string } {
  const statusConfig = {
    initiated: {
      color: '#f59e0b',
      text: 'Initiated',
      message: 'Your withdrawal has been initiated and is being processed.',
    },
    success: {
      color: '#10b981',
      text: 'Successful',
      message:
        'Your withdrawal has been successfully completed and sent to your bank account.',
    },
    failed: {
      color: '#ef4444',
      text: 'Failed',
      message:
        'Your withdrawal could not be completed. The amount has been refunded to your wallet.',
    },
  };

  const config = statusConfig[details.status];
  const isProcessing = details.status === 'initiated';
  const isSuccess = details.status === 'success';
  const isFailed = details.status === 'failed';

  const subject = `Withdrawal ${config.text} - ₦${details.amount}`;

  // Mask account number for security (show last 4 digits only)
  const maskedAccountNumber =
    details.accountNumber.length > 4
      ? `****${details.accountNumber.slice(-4)}`
      : details.accountNumber;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Withdrawal ${config.text}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 40px 20px;">

              <!-- Main Container -->
              <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);" cellpadding="0" cellspacing="0">

                <!-- Header -->
                <tr>
                  <td style="background: #5B55F6; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h2 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                      Withdrawal ${config.text}
                    </h2>
                    <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                      Bank Transfer
                    </p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                      Hi <strong>${details.firstName}</strong>,
                    </p>

                    <p style="margin: 0 0 30px 0; font-size: 16px; color: #666666; line-height: 1.6;">
                      ${config.message}
                    </p>

                    <!-- Transaction Details Card -->
                    <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 4px solid ${config.color};">
                      <h3 style="margin: 0 0 20px 0; font-size: 18px; color: #333333; font-weight: 600;">
                        Transaction Details
                      </h3>

                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 10px 0; color: #666666; font-size: 14px; vertical-align: top;">
                            Amount
                          </td>
                          <td style="padding: 10px 0; text-align: right; font-weight: 700; color: #667eea; font-size: 18px;">
                            ₦${details.amount}
                          </td>
                        </tr>
                        ${
                          details.fee && parseFloat(details.fee) > 0
                            ? `
                        <tr>
                          <td style="padding: 10px 0; color: #666666; font-size: 14px; vertical-align: top;">
                            Processing Fee
                          </td>
                          <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #333333; font-size: 14px;">
                            ₦${details.fee}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 10px 0; border-top: 1px solid #e0e0e0; color: #666666; font-size: 14px; vertical-align: top;">
                            Total Debit
                          </td>
                          <td style="padding: 10px 0; border-top: 1px solid #e0e0e0; text-align: right; font-weight: 700; color: #333333; font-size: 16px;">
                            ₦${details.totalDebit}
                          </td>
                        </tr>
                        `
                            : ''
                        }
                        <tr>
                          <td style="padding: 15px 0 10px 0; border-top: 1px solid #e0e0e0; color: #666666; font-size: 14px; vertical-align: top;">
                            Account Name
                          </td>
                          <td style="padding: 15px 0 10px 0; border-top: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #333333; font-size: 14px; word-break: break-word;">
                            ${details.accountName}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 10px 0; color: #666666; font-size: 14px; vertical-align: top;">
                            Account Number
                          </td>
                          <td style="padding: 10px 0; text-align: right; font-family: 'Courier New', monospace; font-weight: 600; color: #333333; font-size: 14px;">
                            ${maskedAccountNumber}
                          </td>
                        </tr>
                        ${
                          details.bankName
                            ? `
                        <tr>
                          <td style="padding: 10px 0; color: #666666; font-size: 14px; vertical-align: top;">
                            Bank
                          </td>
                          <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #333333; font-size: 14px;">
                            ${details.bankName}
                          </td>
                        </tr>
                        `
                            : ''
                        }
                        <tr>
                          <td style="padding: 10px 0; border-top: 1px solid #e0e0e0; color: #666666; font-size: 14px; vertical-align: top;">
                            Status
                          </td>
                          <td style="padding: 10px 0; border-top: 1px solid #e0e0e0; text-align: right;">
                            <span style="display: inline-block; background: ${config.color}; color: #ffffff; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                              ${config.text}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 10px 0; color: #666666; font-size: 14px; vertical-align: top;">
                            Reference
                          </td>
                          <td style="padding: 10px 0; text-align: right; font-family: 'Courier New', monospace; color: #333333; font-size: 12px; word-break: break-all;">
                            ${details.reference}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 10px 0; color: #666666; font-size: 14px; vertical-align: top;">
                            Date
                          </td>
                          <td style="padding: 10px 0; text-align: right; color: #333333; font-size: 14px;">
                            ${details.date}
                          </td>
                        </tr>
                      </table>
                    </div>

                    ${
                      isProcessing
                        ? `
                    <!-- Processing Message -->
                    <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #f59e0b;">
                      <p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.5;">
                        <strong>⏳ Processing</strong><br>
                        Your withdrawal is being processed. This usually takes a few minutes to 24 hours. You'll receive another notification once it's completed.
                      </p>
                    </div>
                    `
                        : ''
                    }

                    ${
                      isSuccess
                        ? `
                    <!-- Success Message -->
                    <div style="background: #d1fae5; border-radius: 8px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #10b981;">
                      <p style="margin: 0; font-size: 14px; color: #065f46; line-height: 1.5;">
                        <strong>✅ Transaction Completed</strong><br>
                        The funds have been successfully transferred to your bank account. Please check your bank statement to confirm receipt.
                      </p>
                    </div>
                    `
                        : ''
                    }

                    ${
                      isFailed
                        ? `
                    <!-- Error Message -->
                    <div style="background: #fee2e2; border-radius: 8px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #ef4444;">
                      <p style="margin: 0; font-size: 14px; color: #991b1b; line-height: 1.5;">
                        <strong>❌ Transaction Failed</strong><br>
                        The withdrawal could not be completed. The amount (including fees) has been automatically refunded to your wallet. Please verify your account details and try again.
                      </p>
                    </div>
                    `
                        : ''
                    }

                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="raverpay://app/transactions" style="display: inline-block; background: #5b55f6; color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                        View Transaction History
                      </a>
                    </div>

                    <!-- Help Section -->
                    <p style="margin: 30px 0 0 0; font-size: 14px; color: #666666; line-height: 1.6; text-align: center;">
                      Need help? Contact our support team at<br>
                      <a href="mailto:expertvetteddigital@gmail.com" style="color: #667eea; text-decoration: none; font-weight: 600;">expertvetteddigital@gmail.com</a>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background: #f8f9fa; padding: 30px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e0e0e0;">
                    <p style="margin: 0 0 15px 0; color: #666666; font-size: 14px; font-weight: 600;">
                      Follow us on social media
                    </p>
                    <p style="margin: 0 0 20px 0;">
                      <a href="https://x.com/useraverpay" style="display: inline-block; margin: 0 10px; color: #667eea; text-decoration: none; font-size: 12px;">Twitter</a>
                      <a href="https://www.instagram.com/useraverpay" style="display: inline-block; margin: 0 10px; color: #667eea; text-decoration: none; font-size: 12px;">Instagram</a>
                      <a href="https://www.facebook.com/useraverpay" style="display: inline-block; margin: 0 10px; color: #667eea; text-decoration: none; font-size: 12px;">Facebook</a>
                    </p>
                    <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px;">
                      <strong>RaverPay</strong>
                    </p>
                    <p style="margin: 0 0 15px 0; color: #999999; font-size: 12px;">
                      Lagos, Nigeria
                    </p>
                    <p style="margin: 0; color: #cccccc; font-size: 11px;">
                      © 2025 RaverPay. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>

              <!-- Privacy Links -->
              <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; margin-top: 20px;" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center; padding: 0 20px;">
                    <p style="margin: 0; color: #999999; font-size: 12px;">
                      <a href="https://raverpay.expertvetteddigital.tech/privacy" style="color: #667eea; text-decoration: none; margin: 0 10px;">Privacy Policy</a>
                      <a href="https://raverpay.expertvetteddigital.tech/tos" style="color: #667eea; text-decoration: none; margin: 0 10px;">Terms of Service</a>
                      <a href="mailto:expertvetteddigital@gmail.com" style="color: #667eea; text-decoration: none; margin: 0 10px;">Contact Support</a>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return { html, subject };
}
