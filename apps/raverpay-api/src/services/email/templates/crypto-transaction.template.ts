/**
 * Crypto Transaction Email Template
 * Used for crypto send/receive transactions
 */

interface CryptoTransactionDetails {
  userName: string;
  transactionType: 'SEND' | 'RECEIVE';
  tokenSymbol: string;
  amount: string;
  usdValue: string;
  address: string;
  transactionHash: string;
  network: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  timestamp: string;
  memo?: string;
  recipientName?: string;
  gasFee?: string;
  gasFeeUsd?: string;
}

export function cryptoTransactionEmailTemplate(
  details: CryptoTransactionDetails,
): {
  subject: string;
  html: string;
} {
  const statusIcons = {
    PENDING: '⏳',
    COMPLETED: '✅',
    FAILED: '❌',
  };

  const statusColors = {
    PENDING: '#fbbf24',
    COMPLETED: '#10b981',
    FAILED: '#ef4444',
  };

  const statusText = {
    PENDING: 'Pending',
    COMPLETED: details.transactionType === 'SEND' ? 'Sent' : 'Received',
    FAILED: 'Failed',
  };

  const icon = statusIcons[details.status];
  const color = statusColors[details.status];
  const status = statusText[details.status];

  const subject =
    details.transactionType === 'SEND'
      ? `${icon} Crypto ${status}: ${details.amount} ${details.tokenSymbol}`
      : `${icon} Crypto ${status}: ${details.amount} ${details.tokenSymbol}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Crypto Transaction ${status}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; line-height: 1.6;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #5b55f6 0%, #4338ca 100%); padding: 35px 30px; text-align: center; border-radius: 16px 16px 0 0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background: rgba(255, 255, 255, 0.2); width: 80px; height: 80px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                <span style="font-size: 40px;">${icon}</span>
            </div>
            <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 28px; font-weight: 700;">
                ${details.transactionType === 'SEND' ? 'Crypto Sent' : 'Crypto Received'}
            </h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 0; font-size: 16px;">
                ${details.amount} ${details.tokenSymbol} • ${details.status}
            </p>
        </div>

        <!-- Main Content -->
        <div style="background: #ffffff; padding: 35px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <!-- Greeting -->
            <p style="color: #1e293b; font-size: 16px; margin: 0 0 25px 0;">
                Hi <strong>${details.userName}</strong>,
            </p>

            <!-- Transaction Details Card -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
                <h2 style="color: #334155; font-size: 18px; margin: 0 0 20px 0; font-weight: 600; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px;">
                    Transaction Details
                </h2>
                
                <!-- Amount -->
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 15px;">Amount</span>
                    <span style="color: #1e293b; font-weight: 600; font-size: 15px;">
                        ${details.amount} ${details.tokenSymbol}
                    </span>
                </div>

                <!-- USD Value -->
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 15px;">USD Value</span>
                    <span style="color: #1e293b; font-weight: 600; font-size: 15px;">
                        $${details.usdValue}
                    </span>
                </div>

                <!-- Address -->
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 15px;">${details.transactionType === 'SEND' ? 'To' : 'From'}</span>
                    <span style="color: #1e293b; font-weight: 500; font-size: 13px; font-family: monospace; word-break: break-all; text-align: right; max-width: 60%;">
                        ${details.address}
                    </span>
                </div>

                <!-- Network -->
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 15px;">Network</span>
                    <span style="color: #1e293b; font-weight: 600; font-size: 15px;">
                        ${details.network}
                    </span>
                </div>

                ${
                  details.gasFee
                    ? `
                <!-- Gas Fee -->
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 15px;">Gas Fee</span>
                    <span style="color: #1e293b; font-weight: 600; font-size: 15px;">
                        ${details.gasFee} MATIC${details.gasFeeUsd ? ` ($${details.gasFeeUsd})` : ''}
                    </span>
                </div>
                `
                    : ''
                }

                <!-- Transaction Hash -->
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 15px;">Tx Hash</span>
                    <a href="https://amoy.polygonscan.com/tx/${details.transactionHash}" 
                       style="color: #5b55f6; font-weight: 500; font-size: 13px; font-family: monospace; text-decoration: none; word-break: break-all; text-align: right; max-width: 60%;">
                        ${details.transactionHash.substring(0, 10)}...${details.transactionHash.substring(details.transactionHash.length - 8)}
                    </a>
                </div>

                <!-- Status -->
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 15px;">Status</span>
                    <span style="color: ${color}; font-weight: 600; font-size: 15px;">
                        ${icon} ${status}
                    </span>
                </div>

                <!-- Timestamp -->
                <div style="display: flex; justify-content: space-between; padding: 12px 0;">
                    <span style="color: #64748b; font-size: 15px;">Date & Time</span>
                    <span style="color: #1e293b; font-weight: 600; font-size: 15px;">
                        ${details.timestamp}
                    </span>
                </div>

                ${
                  details.memo
                    ? `
                <!-- Memo -->
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-top: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 15px;">Memo</span>
                    <span style="color: #1e293b; font-weight: 500; font-size: 15px; text-align: right; max-width: 60%;">
                        ${details.memo}
                    </span>
                </div>
                `
                    : ''
                }
            </div>

            <!-- Status Message -->
            ${
              details.status === 'COMPLETED'
                ? `
            <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px 20px; border-radius: 8px; margin-bottom: 25px;">
                <p style="color: #15803d; margin: 0; font-size: 15px; line-height: 1.6;">
                    <strong>${details.transactionType === 'SEND' ? '✅ Transaction Completed' : '✅ Funds Received'}</strong><br>
                    ${
                      details.transactionType === 'SEND'
                        ? 'Your crypto has been sent successfully and confirmed on the blockchain.'
                        : 'Your crypto has been received and confirmed on the blockchain.'
                    }
                </p>
            </div>
            `
                : details.status === 'PENDING'
                  ? `
            <div style="background: #fefce8; border-left: 4px solid #fbbf24; padding: 16px 20px; border-radius: 8px; margin-bottom: 25px;">
                <p style="color: #a16207; margin: 0; font-size: 15px; line-height: 1.6;">
                    <strong>⏳ Transaction Pending</strong><br>
                    Your transaction is being processed on the blockchain. This usually takes 1-3 minutes. You'll receive another notification once it's confirmed.
                </p>
            </div>
            `
                  : `
            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px 20px; border-radius: 8px; margin-bottom: 25px;">
                <p style="color: #dc2626; margin: 0; font-size: 15px; line-height: 1.6;">
                    <strong>❌ Transaction Failed</strong><br>
                    Your transaction could not be completed. Please try again or contact support if the issue persists.
                </p>
            </div>
            `
            }

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="raverpay://app/crypto/transactions" style="display: inline-block; background: #5b55f6; color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                    View Transaction History
                </a>
            </div>

            <!-- Help Text -->
            <p style="color: #64748b; font-size: 14px; text-align: center; margin: 25px 0 0 0; line-height: 1.6;">
                Need help? Contact our support team at
                <a href="mailto:support@raverpay.com" style="color: #5b55f6; text-decoration: none;">support@raverpay.com</a>
            </p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 25px 20px; color: #94a3b8; font-size: 13px;">
            <p style="margin: 0 0 10px 0;">
                This is an automated notification from RaverPay.<br>
                Please do not reply to this email.
            </p>
            <p style="margin: 0;">
                © ${new Date().getFullYear()} RaverPay. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
  `;

  return { subject, html };
}
