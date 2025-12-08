/**
 * P2P Transfer Email Template
 * Used for peer-to-peer money transfers
 */

interface P2PTransferDetails {
  firstName: string;
  amount: string;
  senderName: string;
  senderTag?: string;
  message?: string;
  reference: string;
  date: string;
  recipientTag?: string;
  transactionType: 'received' | 'sent';
}

export function p2pTransferEmailTemplate(details: P2PTransferDetails): {
  html: string;
  subject: string;
} {
  const isReceived = details.transactionType === 'received';
  const subject = isReceived
    ? `You've Received ${details.amount} from ${details.senderName}`
    : `You Sent ${details.amount} to ${details.senderName}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${isReceived ? 'Money Received' : 'Money Sent'}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 40px 20px;">

              <!-- Main Container -->
              <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);" cellpadding="0" cellspacing="0">

                <!-- Header -->
                <tr>
                  <td style="background: #5b55f6; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
                  
                    <h2 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                      ${isReceived ? 'Money Received!' : 'Money Sent'}
                    </h2>
                    <p style="margin: 15px 0 0 0; color: rgba(255, 255, 255, 0.95); font-size: 18px; font-weight: 600;">
                      ${details.amount}
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
                      ${
                        isReceived
                          ? `<strong>${details.senderName}</strong> ${details.senderTag ? `(@${details.senderTag})` : ''} sent you ${details.amount}. The money has been credited to your wallet.`
                          : `You successfully sent ${details.amount} to <strong>${details.senderName}</strong>${details.recipientTag ? ` (@${details.recipientTag})` : ''}.`
                      }
                    </p>

                    ${
                      details.message
                        ? `
                    <!-- Message Card -->
                    <div style="background: #f0f4ff; border-left: 4px solid #667eea; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                      <p style="margin: 0; color: #666666; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; margin-bottom: 8px;">
                        Message
                      </p>
                      <p style="margin: 0; color: #333333; font-size: 15px; line-height: 1.6; font-style: italic;">
                        "${details.message}"
                      </p>
                    </div>
                    `
                        : ''
                    }

                    <!-- Transaction Details Card -->
                    <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
                      <h3 style="margin: 0 0 20px 0; font-size: 18px; color: #333333; font-weight: 600;">
                        Transaction Details
                      </h3>

                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 12px 0; color: #666666; font-size: 14px; vertical-align: top; border-bottom: 1px solid #e5e7eb;">
                            ${isReceived ? 'From' : 'To'}
                          </td>
                          <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #333333; font-size: 14px; border-bottom: 1px solid #e5e7eb;">
                            ${details.senderName}${details.senderTag || details.recipientTag ? ` (@${details.senderTag || details.recipientTag})` : ''}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 12px 0; color: #666666; font-size: 14px; vertical-align: top; border-bottom: 1px solid #e5e7eb;">
                            Amount
                          </td>
                          <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #10b981; font-size: 16px; border-bottom: 1px solid #e5e7eb;">
                            ${details.amount}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 12px 0; color: #666666; font-size: 14px; vertical-align: top; border-bottom: 1px solid #e5e7eb;">
                            Transaction Type
                          </td>
                          <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #333333; font-size: 14px; border-bottom: 1px solid #e5e7eb;">
                            P2P Transfer
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 12px 0; color: #666666; font-size: 14px; vertical-align: top; border-bottom: 1px solid #e5e7eb;">
                            Reference
                          </td>
                          <td style="padding: 12px 0; text-align: right; font-weight: 500; color: #666666; font-size: 13px; font-family: 'Courier New', monospace; border-bottom: 1px solid #e5e7eb;">
                            ${details.reference}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 12px 0; color: #666666; font-size: 14px; vertical-align: top;">
                            Date & Time
                          </td>
                          <td style="padding: 12px 0; text-align: right; font-weight: 500; color: #666666; font-size: 14px;">
                            ${details.date}
                          </td>
                        </tr>
                      </table>
                    </div>

                    ${
                      isReceived
                        ? `
                    <!-- Info Box -->
                    <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin-bottom: 30px;">
                      <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                        <strong>Quick Tip:</strong> You can send money instantly to any RaverPay user using their @tag. It's fast, free, and secure!
                      </p>
                    </div>
                    `
                        : `
                    <!-- Success Message -->
                    <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 16px; margin-bottom: 30px;">
                      <p style="margin: 0; color: #065f46; font-size: 14px; line-height: 1.6;">
                        ✓ Your transfer was completed successfully. The recipient has been notified.
                      </p>
                    </div>
                    `
                    }

                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 35px 0;">
                      <a href="raverpay://app/transactions" style="display: inline-block; background: #5b55f6; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 30px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                        View Transaction
                      </a>
                    </div>

                    <!-- Support -->
                    <div style="text-align: center; margin-top: 30px;">
                      <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px;">
                        Need help with this transaction?
                      </p>
                      <a href="mailto:support@raverpay.com" style="color: #667eea; text-decoration: none; font-weight: 600; font-size: 14px;">
                        Contact Support
                      </a>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="text-align: center; padding-bottom: 15px;">
                          <p style="margin: 0 0 15px 0; color: #9ca3af; font-size: 13px;">
                            Follow us on social media
                          </p>
                          <a href="https://x.com/useraverpay" style="display: inline-block; margin: 0 10px; color: #667eea; text-decoration: none; font-size: 12px;">Twitter</a>
                          <a href="https://www.instagram.com/useraverpay" style="display: inline-block; margin: 0 10px; color: #667eea; text-decoration: none; font-size: 12px;">Instagram</a>
                          <a href="https://www.facebook.com/useraverpay" style="display: inline-block; margin: 0 10px; color: #667eea; text-decoration: none; font-size: 12px;">Facebook</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="text-align: center; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                          <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 13px; font-weight: 600;">
                            <strong>RaverPay</strong>
                          </p>
                          <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                            Your Trusted Fintech Partner
                          </p>
                          <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 11px;">
                            &copy; 2025 RaverPay. All rights reserved.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="text-align: center; padding-top: 15px;">
                          <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 11px; line-height: 1.5;">
                            This email was sent to you because you have a RaverPay account.<br>
                            Please do not reply to this email. For support, contact us through the app.
                          </p>
                          <div style="margin-top: 10px;">
                            <a href="https://raverpay.expertvetteddigital.tech/privacy" style="color: #667eea; text-decoration: none; margin: 0 10px; font-size: 11px;">Privacy Policy</a>
                            <a href="https://raverpay.expertvetteddigital.tech/tos" style="color: #667eea; text-decoration: none; margin: 0 10px; font-size: 11px;">Terms of Service</a>
                          </div>
                        </td>
                      </tr>
                    </table>
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
