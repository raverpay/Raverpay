/**
 * Birthday Email Template
 * Used for sending birthday wishes to users
 */

interface BirthdayEmailDetails {
  firstName: string;
  lastName?: string;
}

export function birthdayEmailTemplate(details: BirthdayEmailDetails): {
  html: string;
  subject: string;
} {
  const subject = `Happy Birthday, ${details.firstName}! - RaverPay`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Happy Birthday from RaverPay</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 40px 20px;">

              <!-- Main Container -->
              <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);" cellpadding="0" cellspacing="0">

                <!-- Header with Celebration Theme -->
                <tr>
                  <td style="background: #5b55f6; padding: 50px 30px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">
                      Happy Birthday!
                    </h1>
                    <p style="margin: 15px 0 0 0; color: rgba(255, 255, 255, 0.95); font-size: 18px;">
                      ${details.firstName}${details.lastName ? ' ' + details.lastName : ''}
                    </p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 25px 0; font-size: 18px; color: #333333; line-height: 1.7; text-align: center;">
                      On this special day, all of us at <strong style="color: #5B55F6;">RaverPay</strong> want to wish you the happiest of birthdays!
                    </p>

                    <p style="margin: 25px 0; font-size: 16px; color: #666666; line-height: 1.7; text-align: center;">
                      Thank you for being a valued member of the RaverPay family. We're honored to be part of your financial journey.
                    </p>

                    <!-- Special Birthday Wishes -->
                    <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 30px 0; border-left: 4px solid #667eea;">
                      <p style="margin: 0; font-size: 15px; color: #555555; line-height: 1.7; font-style: italic;">
                        "May your birthday be the start of a year filled with good luck, good health, and much happiness."
                      </p>
                      <p style="margin: 15px 0 0 0; font-size: 14px; color: #888888; text-align: right;">
                        - The RaverPay Team
                      </p>
                    </div>

                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 35px 0;">
                      <a href="raverpay://app" style="display: inline-block; background: #5b55f6; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 30px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                        Open RaverPay App
                      </a>
                    </div>

                    <p style="margin: 30px 0 0 0; font-size: 16px; color: #333333; line-height: 1.6; text-align: center;">
                      Wishing you an amazing day!
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
                      &copy; 2025 RaverPay. All rights reserved.
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
