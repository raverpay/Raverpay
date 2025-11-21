/**
 * VTU Transaction Email Template
 * Used for all VTU and bill payment transactions
 */

interface VTUTransactionDetails {
  firstName: string;
  serviceType: string; // 'Airtime', 'Data', 'Cable TV', 'Electricity', 'Showmax', 'International Airtime'
  serviceName: string; // e.g., 'MTN Airtime', 'DStv Premium', 'EKEDC Prepaid'
  amount: string;
  recipient: string; // Phone number, smartcard number, meter number, etc.
  reference: string;
  status: 'success' | 'failed';
  date: string;
  additionalInfo?: {
    label: string;
    value: string;
  }[];
}

export function vtuTransactionEmailTemplate(details: VTUTransactionDetails): {
  html: string;
  subject: string;
} {
  const isSuccess = details.status === 'success';
  const statusColor = isSuccess ? '#10b981' : '#ef4444';
  const statusText = isSuccess ? 'Successful' : 'Failed';

  // Extract electricity token and units for prominent display
  const electricityToken = details.additionalInfo?.find(
    (info) => info.label === 'Token',
  )?.value;
  const electricityUnits = details.additionalInfo?.find(
    (info) => info.label === 'Units',
  )?.value;

  const subject = ` ${details.serviceType} ${statusText} - ${details.serviceName}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${details.serviceType} Transaction ${statusText}</title>
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
                      ${details.serviceType} ${statusText}
                    </h2>
                    <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                      ${details.serviceName}
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
                        isSuccess
                          ? `Your ${details.serviceType.toLowerCase()} purchase was successful!`
                          : `We couldn't complete your ${details.serviceType.toLowerCase()} purchase. Please try again or contact support.`
                      }
                    </p>

                    <!-- Transaction Details Card -->
                    <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 4px solid ${statusColor};">
                      <h3 style="margin: 0 0 20px 0; font-size: 18px; color: #333333; font-weight: 600;">
                        Transaction Details
                      </h3>

                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 10px 0; color: #666666; font-size: 14px; vertical-align: top;">
                            Service Type
                          </td>
                          <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #333333; font-size: 14px;">
                            ${details.serviceType}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 10px 0; color: #666666; font-size: 14px; vertical-align: top;">
                            Service
                          </td>
                          <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #333333; font-size: 14px;">
                            ${details.serviceName}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 10px 0; border-top: 1px solid #e0e0e0; color: #666666; font-size: 14px; vertical-align: top;">
                            Amount
                          </td>
                          <td style="padding: 10px 0; border-top: 1px solid #e0e0e0; text-align: right; font-weight: 700; color: #667eea; font-size: 18px;">
                            ₦${details.amount}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 10px 0; color: #666666; font-size: 14px; vertical-align: top;">
                            Recipient
                          </td>
                          <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #333333; font-size: 14px; word-break: break-all;">
                            ${details.recipient}
                          </td>
                        </tr>
                        ${
                          details.additionalInfo &&
                          details.additionalInfo.length > 0
                            ? details.additionalInfo
                                .map(
                                  (info) => `
                        <tr>
                          <td style="padding: 10px 0; color: #666666; font-size: 14px; vertical-align: top;">
                            ${info.label}
                          </td>
                          <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #333333; font-size: 14px; word-break: break-all;">
                            ${info.value}
                          </td>
                        </tr>
                        `,
                                )
                                .join('')
                            : ''
                        }
                        <tr>
                          <td style="padding: 10px 0; border-top: 1px solid #e0e0e0; color: #666666; font-size: 14px; vertical-align: top;">
                            Status
                          </td>
                          <td style="padding: 10px 0; border-top: 1px solid #e0e0e0; text-align: right;">
                            <span style="display: inline-block; background: ${statusColor}; color: #ffffff; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                              ${statusText}
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
                      isSuccess
                        ? `
                    <!-- Success Message -->
                    <div style="background: #d1fae5; border-radius: 8px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #10b981;">
                      <p style="margin: 0; font-size: 14px; color: #065f46; line-height: 1.5;">
                        <strong>Transaction Completed</strong><br>
                        Your ${details.serviceType.toLowerCase()} has been processed successfully. You can view this transaction in your app history.
                      </p>
                    </div>
                    ${
                      details.serviceType === 'Electricity' && electricityToken
                        ? `
                    <!-- Electricity Token - Prominent Display -->
                    <div style="background: #5b55f6; border-radius: 12px; padding: 30px; margin-bottom: 25px; text-align: center; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                      <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #ffffff; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                        ⚡ Electricity Token
                      </h3>
                      <div style="background: #ffffff; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
                        <p style="margin: 0; font-family: 'Courier New', monospace; font-size: 24px; font-weight: 700; color: #333333; letter-spacing: 3px; word-break: break-all;">
                          ${electricityToken}
                        </p>
                      </div>
                      ${
                        electricityUnits
                          ? `<p style="margin: 0; font-size: 14px; color: rgba(255, 255, 255, 0.9);">
                          Units: <strong>${electricityUnits}</strong>
                        </p>`
                          : ''
                      }
                      <p style="margin: 15px 0 0 0; font-size: 12px; color: rgba(255, 255, 255, 0.8); line-height: 1.5;">
                        Enter this token on your prepaid meter to recharge your electricity.
                      </p>
                    </div>
                    `
                        : ''
                    }
                    `
                        : `
                    <!-- Error Message -->
                    <div style="background: #fee2e2; border-radius: 8px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #ef4444;">
                      <p style="margin: 0; font-size: 14px; color: #991b1b; line-height: 1.5;">
                        <strong>Transaction Failed</strong><br>
                        If money was deducted from your wallet, it will be refunded within 24 hours. Please contact support if you need assistance.
                      </p>
                    </div>
                    `
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
