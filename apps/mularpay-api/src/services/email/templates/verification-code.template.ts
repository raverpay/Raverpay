/**
 * Email template for verification code
 */
export function verificationCodeTemplate(
  code: string,
  firstName: string,
  isPasswordReset = false,
): { html: string; subject: string } {
  const subject = isPasswordReset
    ? 'Reset Your Password - RaverPay'
    : 'Verify Your Email - RaverPay';

  const title = isPasswordReset ? 'Reset Your Password' : 'Verify Your Email';
  const message = isPasswordReset
    ? 'You requested to reset your password. Use the code below:'
    : 'Thank you for signing up! Use the code below to verify your email:';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
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
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                      RaverPay
                    </h1>
                    <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                    Your Trusted Fintech Partner
                    </p>
                  </td>
                </tr>
                
                <!-- Body -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                      Hi <strong>${firstName}</strong>,
                    </p>
                    
                    <p style="margin: 0 0 30px 0; font-size: 16px; color: #666666; line-height: 1.6;">
                      ${message}
                    </p>
                    
                    <!-- Verification Code Box -->
                    <div style="background: #5b55f6; border-radius: 10px; padding: 30px; text-align: center; margin: 30px 0;">
                      <p style="margin: 0 0 10px 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                        Your Verification Code
                      </p>
                      <div style="background: rgba(255, 255, 255, 0.2); border-radius: 8px; padding: 20px; display: inline-block;">
                        <p style="margin: 0; color: #ffffff; font-size: 42px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                          ${code}
                        </p>
                      </div>
                    </div>
                    
                    <!-- Instructions -->
                    <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; border-radius: 6px; margin: 30px 0;">
                      <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666; line-height: 1.5;">
                        <strong>⏱This code expires in 10 minutes</strong>
                      </p>
                      <p style="margin: 0; font-size: 14px; color: #666666; line-height: 1.5;">
                        If you didn't request this code, please ignore this email or contact our support team.
                      </p>
                    </div>
                    
                    <!-- Security Notice -->
                    <p style="margin: 30px 0 0 0; font-size: 13px; color: #999999; line-height: 1.5; border-top: 1px solid #e0e0e0; padding-top: 20px;">
                      <strong>Security Tip:</strong> Never share your verification code with anyone. RaverPay will never ask for your code via phone, email, or social media.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background: #f8f9fa; padding: 30px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e0e0e0;">
                    <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px;">
                      <strong>RaverPay</strong> - Making Payments Easy
                    </p>
                    <p style="margin: 0 0 15px 0; color: #999999; font-size: 12px;">
                      Lagos, Nigeria 
                    </p>
                    <p style="margin: 0; color: #cccccc; font-size: 11px;">
                      This is an automated email. Please do not reply to this message.
                    </p>
                  </td>
                </tr>
                
              </table>
              
              <!-- Extra Footer Links -->
              <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; margin-top: 20px;" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center; padding: 0 20px;">
                    <p style="margin: 0; color: #999999; font-size: 12px;">
                      Need help? Contact us at <a href="mailto:support@expertvetteddigital.tech" style="color: #667eea; text-decoration: none;">support@RaverPay.com</a>
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
