/**
 * Wallet Locked Email Template
 * Sent when user's wallet is locked due to deposit limit exceeded
 */

interface WalletLockedData {
  firstName: string;
  depositAmount: number;
  kycTier: 'TIER_0' | 'TIER_1' | 'TIER_2' | 'TIER_3';
  dailyLimit: number;
  upgradeUrl?: string;
}

export function walletLockedTemplate(data: WalletLockedData): {
  html: string;
  subject: string;
} {
  const {
    firstName,
    depositAmount,
    kycTier,
    dailyLimit,
    upgradeUrl = '/kyc/upgrade',
  } = data;

  // Determine next tier and its benefits
  const tierInfo: Record<
    string,
    { nextTier: string; nextLimit: string; action: string }
  > = {
    TIER_0: {
      nextTier: 'TIER 1',
      nextLimit: '₦300,000',
      action: 'Verify your email and phone number',
    },
    TIER_1: {
      nextTier: 'TIER 2',
      nextLimit: '₦5,000,000',
      action: 'Complete BVN verification',
    },
    TIER_2: {
      nextTier: 'TIER 3',
      nextLimit: 'Unlimited',
      action: 'Complete full KYC verification',
    },
    TIER_3: {
      nextTier: '',
      nextLimit: '',
      action: '',
    },
  };

  const info = tierInfo[kycTier];

  const subject = '🔒 Your Wallet Has Been Locked - Action Required';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        
        <!-- Header with Lock Icon -->
        <div style="background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%); color: white; padding: 40px 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <div style="background: rgba(255,255,255,0.2); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            <div style="font-size: 40px;">🔒</div>
          </div>
          <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Wallet Locked</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.95; font-size: 16px;">Deposit limit exceeded</p>
        </div>

        <!-- Main Content -->
        <div style="background: white; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="margin: 0 0 20px 0; font-size: 16px;">Hi <strong>${firstName}</strong>,</p>

          <div style="background: #FEF2F2; border-left: 4px solid #DC2626; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; font-size: 15px; color: #991B1B; line-height: 1.6;">
              <strong>Your wallet has been temporarily locked</strong> because your recent deposit of <strong>₦${depositAmount.toLocaleString()}</strong> exceeds your current ${kycTier} daily limit of <strong>₦${dailyLimit.toLocaleString()}</strong>.
            </p>
          </div>

          <h2 style="color: #1F2937; font-size: 20px; margin: 30px 0 15px 0; font-weight: 600;">Don't worry, your money is safe! 💰</h2>
          
          <p style="margin: 0 0 20px 0; font-size: 15px; color: #4B5563;">
            Your deposit has been successfully credited to your wallet. However, to protect your account and comply with regulatory requirements, we've temporarily locked transactions.
          </p>

          ${
            kycTier !== 'TIER_3'
              ? `
          <!-- Upgrade CTA -->
          <div style="background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%); padding: 25px; border-radius: 10px; margin: 30px 0;">
            <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #1E40AF; font-weight: 600;">✨ Unlock Your Wallet in Minutes</h3>
            
            <p style="margin: 0 0 20px 0; font-size: 15px; color: #1E40AF;">
              Upgrade to <strong>${info.nextTier}</strong> and enjoy:
            </p>

            <ul style="margin: 0 0 20px 0; padding-left: 20px; color: #1E40AF;">
              <li style="margin-bottom: 8px;">Daily limit: <strong>${info.nextLimit}</strong></li>
              <li style="margin-bottom: 8px;">Instant wallet unlock</li>
              <li style="margin-bottom: 8px;">Full access to all features</li>
            </ul>

            <div style="text-align: center; margin-top: 25px;">
              <a href="${upgradeUrl}" style="display: inline-block; background: #5B55F6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(91, 85, 246, 0.3);">
                Upgrade to ${info.nextTier} Now →
              </a>
            </div>

            <p style="margin: 15px 0 0 0; font-size: 13px; color: #6B7280; text-align: center;">
              ${info.action} • Takes less than 5 minutes
            </p>
          </div>
          `
              : ''
          }

          <!-- Transaction Details -->
          <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <h4 style="margin: 0 0 15px 0; font-size: 14px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Transaction Details</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Deposit Amount</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1F2937; font-size: 14px;">₦${depositAmount.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Current Tier</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1F2937; font-size: 14px;">${kycTier}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Daily Limit</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1F2937; font-size: 14px;">₦${dailyLimit.toLocaleString()}</td>
              </tr>
              <tr style="border-top: 2px solid #E5E7EB;">
                <td style="padding: 12px 0 0 0; color: #DC2626; font-size: 14px; font-weight: 600;">Status</td>
                <td style="padding: 12px 0 0 0; text-align: right; font-weight: 700; color: #DC2626; font-size: 14px;">🔒 LOCKED</td>
              </tr>
            </table>
          </div>

          <!-- Help Section -->
          <div style="background: #FFFBEB; border: 1px solid #FDE68A; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #92400E;">
              <strong>Need help?</strong> Our support team is here for you 24/7.
            </p>
            <p style="margin: 0; font-size: 14px; color: #92400E;">
              📧 Email: <a href="mailto:support@raverpay.com" style="color: #92400E; text-decoration: underline;">support@raverpay.com</a><br>
              💬 Live Chat: Open the app and tap "Support"
            </p>
          </div>

        </div>

        <!-- Footer -->
        <div style="background: #F9FAFB; padding: 30px; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 12px 12px; text-align: center;">
          <p style="margin: 0 0 10px 0; color: #6B7280; font-size: 14px; font-weight: 600;">RaverPay</p>
          <p style="margin: 0 0 15px 0; color: #9CA3AF; font-size: 12px;">Your Trusted Fintech Partner</p>
          <p style="margin: 0; color: #9CA3AF; font-size: 11px; line-height: 1.5;">
            This is an automated security notification.<br>
            For your protection, please do not share this information.
          </p>
        </div>

      </body>
    </html>
  `;

  return { html, subject };
}
