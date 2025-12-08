/**
 * Welcome email template
 */
export function welcomeEmailTemplate(firstName: string): {
  html: string;
  subject: string;
} {
  const subject = 'Welcome to RaverPay!';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to RaverPay</title>
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
                    <h2 style="margin: 15px 0 0 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                      Welcome to RaverPay!
                    </h2>
                    <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                      Your journey to seamless payments starts now
                    </p>
                  </td>
                </tr>
                
                <!-- Body -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px 0; font-size: 18px; color: #333333; line-height: 1.6;">
                      Hi <strong>${firstName}</strong>! 
                    </p>
                    
                    <p style="margin: 0 0 25px 0; font-size: 16px; color: #666666; line-height: 1.6;">
                      Thank you for joining RaverPay! We're excited to have you on board. Your account has been successfully verified and you're ready to start using our services.
                    </p>
                    
                    <!-- Features Grid -->
                    <h3 style="margin: 30px 0 20px 0; font-size: 20px; color: #333333; font-weight: 600;">
                      What You Can Do:
                    </h3>
                    
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 20px 0;" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 15px; background: #f8f9fa; border-radius: 8px; vertical-align: top;" width="48%">
                          <p style="margin: 0 0 5px 0; font-size: 15px; color: #333333; font-weight: 600;">
                            Fund Your Wallet
                          </p>
                          <p style="margin: 0; font-size: 13px; color: #666666; line-height: 1.4;">
                            Add money via card or bank transfer instantly
                          </p>
                        </td>
                        <td width="4%"></td>
                        <td style="padding: 15px; background: #f8f9fa; border-radius: 8px; vertical-align: top;" width="48%">
                         
                          <p style="margin: 0 0 5px 0; font-size: 15px; color: #333333; font-weight: 600;">
                            Buy Airtime & Data
                          </p>
                          <p style="margin: 0; font-size: 13px; color: #666666; line-height: 1.4;">
                            All networks at your fingertips
                          </p>
                        </td>
                      </tr>
                      <tr><td colspan="3" style="height: 12px;"></td></tr>
                      <tr>
                        <td style="padding: 15px; background: #f8f9fa; border-radius: 8px; vertical-align: top;">
                        
                          <p style="margin: 0 0 5px 0; font-size: 15px; color: #333333; font-weight: 600;">
                            Pay Cable TV
                          </p>
                          <p style="margin: 0; font-size: 13px; color: #666666; line-height: 1.4;">
                            DStv, GOtv, StarTimes & more
                          </p>
                        </td>
                        <td width="4%"></td>
                        <td style="padding: 15px; background: #f8f9fa; border-radius: 8px; vertical-align: top;">
                          <p style="margin: 0 0 5px 0; font-size: 15px; color: #333333; font-weight: 600;">
                            Electricity Bills
                          </p>
                          <p style="margin: 0; font-size: 13px; color: #666666; line-height: 1.4;">
                            All DISCOs, prepaid & postpaid
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- CTA Section -->
                    <div style="background: #5b55f6; border-radius: 10px; padding: 30px; text-align: center; margin: 30px 0;">
                      <p style="margin: 0 0 15px 0; color: #ffffff; font-size: 18px; font-weight: 600;">
                        Ready to get started?
                      </p>
                      <a href="raverpay://app" style="display: inline-block; background: #ffffff; color: #667eea; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                        Open RaverPay App
                      </a>
                    </div>
                    
                    <!-- Tips Section -->
                    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; border-radius: 6px; margin: 30px 0;">
                      <p style="margin: 0 0 10px 0; font-size: 15px; color: #856404; font-weight: 600;">
                        Quick Tip
                      </p>
                      <p style="margin: 0; font-size: 14px; color: #856404; line-height: 1.5;">
                        Complete your KYC verification to increase your transaction limits and unlock more features!
                      </p>
                    </div>
                    
                    <!-- Help Section -->
                    <p style="margin: 30px 0 0 0; font-size: 14px; color: #666666; line-height: 1.6;">
                      Need help getting started? Our support team is here to assist you 24/7.
                    </p>
                    
                    <p style="margin: 15px 0 0 0; font-size: 14px; color: #666666;">
                      Happy transacting!<br>
                      <strong>The RaverPay Team</strong>
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
