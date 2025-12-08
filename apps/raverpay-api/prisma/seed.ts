import { PrismaClient, UserRole, UserStatus, KYCTier } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function seedSuperAdmin() {
  console.log('🌱 Seeding SUPER_ADMIN...');

  // Check if SUPER_ADMIN already exists
  const existingSuperAdmin = await prisma.user.findFirst({
    where: { role: UserRole.SUPER_ADMIN },
  });

  if (existingSuperAdmin) {
    console.log('✅ SUPER_ADMIN already exists:', existingSuperAdmin.email);
    return;
  }

  // Get environment variables or use defaults
  const email = process.env.SUPER_ADMIN_EMAIL || 'admin@raverpay.com';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!';
  const firstName = process.env.SUPER_ADMIN_FIRST_NAME || 'Super';
  const lastName = process.env.SUPER_ADMIN_LAST_NAME || 'Admin';
  const phone = process.env.SUPER_ADMIN_PHONE || '+2348000000000';

  // Hash password
  const hashedPassword = await argon2.hash(password);

  // Create SUPER_ADMIN user
  const superAdmin = await prisma.user.create({
    data: {
      email,
      phone,
      password: hashedPassword,
      firstName,
      lastName,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      kycTier: KYCTier.TIER_3, // Full KYC for admin
      emailVerified: true,
      phoneVerified: true,
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
      // Create NAIRA wallet for the admin
      wallets: {
        create: {
          type: 'NAIRA',
          balance: 0,
          ledgerBalance: 0,
          currency: 'NGN',
        },
      },
    },
  });

  console.log('✅ SUPER_ADMIN created successfully!');
  console.log('📧 Email:', superAdmin.email);
  console.log('🔑 Password:', password);
  console.log('⚠️  IMPORTANT: Change the password after first login!');
  console.log('🆔 User ID:', superAdmin.id);
}

async function seedHelpCenter() {
  console.log('🌱 Seeding Help Center content...');

  // Check if help collections already exist
  const existingCollections = await prisma.helpCollection.count();
  if (existingCollections > 0) {
    console.log('✅ Help Center already seeded with', existingCollections, 'collections');
    return;
  }

  // Help Collections and Articles
  const collections = [
    {
      title: 'Getting Started',
      description: 'Learn the basics of using RaverPay',
      icon: 'rocket',
      order: 1,
      articles: [
        {
          title: 'How to Create an Account',
          slug: 'how-to-create-an-account',
          content: `# How to Create an Account\n\nCreating your RaverPay account is quick and easy:\n\n1. **Download the App**: Get RaverPay from the App Store or Google Play Store.\n\n2. **Sign Up**: Tap "Sign Up" and enter your phone number.\n\n3. **Verify Phone**: Enter the OTP sent to your phone.\n\n4. **Set Up Profile**: Enter your name and email address.\n\n5. **Create PIN**: Set a secure 4-digit transaction PIN.\n\n6. **Complete KYC**: Verify your identity to unlock all features.\n\nThat's it! Your account is ready to use.`,
          order: 1,
        },
        {
          title: 'How to Fund Your Wallet',
          slug: 'how-to-fund-wallet',
          content: `# How to Fund Your Wallet\n\nThere are multiple ways to add money to your RaverPay wallet:\n\n## Bank Transfer\n1. Go to your wallet and tap "Fund Wallet"\n2. Copy your unique virtual account number\n3. Transfer from any bank to this account\n4. Funds reflect instantly\n\n## Card Payment\n1. Tap "Fund with Card"\n2. Enter your card details\n3. Complete payment via Paystack\n4. Funds are added immediately\n\n## USSD\n1. Dial *919*amount*virtual account number#\n2. Complete the transfer`,
          order: 2,
        },
        {
          title: 'Understanding KYC Verification',
          slug: 'understanding-kyc',
          content: `# Understanding KYC Verification\n\nKYC (Know Your Customer) verification helps us keep your account secure.\n\n## Tier Levels\n\n**Tier 1** (Basic)\n- Phone verification only\n- Daily limit: ₦50,000\n- Features: Airtime & Data only\n\n**Tier 2** (Standard)\n- BVN verification\n- Daily limit: ₦200,000\n- Features: All VTU services\n\n**Tier 3** (Premium)\n- ID verification + Selfie\n- Daily limit: ₦1,000,000\n- Features: All services + Higher limits\n\n## How to Verify\n1. Go to Profile > KYC Verification\n2. Complete each tier step by step\n3. Verification is usually instant`,
          order: 3,
        },
      ],
    },
    {
      title: 'Airtime & Data',
      description: 'Buy airtime and data bundles easily',
      icon: 'phone-portrait',
      order: 2,
      articles: [
        {
          title: 'How to Buy Airtime',
          slug: 'how-to-buy-airtime',
          content: `# How to Buy Airtime\n\n1. Open RaverPay and tap "Airtime"\n2. Select your network (MTN, Airtel, Glo, 9Mobile)\n3. Enter the phone number or select from contacts\n4. Enter the amount\n5. Tap "Buy Airtime"\n6. Confirm with your PIN\n\n**Tips:**\n- You can buy for yourself or others\n- Save frequent numbers for quick recharge\n- Enjoy instant delivery\n- Get cashback on purchases over ₦500`,
          order: 1,
        },
        {
          title: 'How to Buy Data',
          slug: 'how-to-buy-data',
          content: `# How to Buy Data\n\n1. Open RaverPay and tap "Data"\n2. Select your network\n3. Choose a data plan\n4. Enter the phone number\n5. Tap "Buy Data"\n6. Confirm with your PIN\n\n**Available Plans:**\n- Daily plans (1-7 days)\n- Weekly plans\n- Monthly plans\n- SME Data (reseller)\n\n**Note:** Data is delivered instantly to your line.`,
          order: 2,
        },
        {
          title: 'What to Do if Airtime/Data Fails',
          slug: 'airtime-data-failed',
          content: `# What to Do if Your Purchase Fails\n\nIf your airtime or data purchase fails:\n\n## Check First\n1. Verify the phone number is correct\n2. Ensure you have sufficient wallet balance\n3. Check if the network is having issues\n\n## Automatic Refund\nIf the transaction fails, your wallet is automatically refunded within 5 minutes.\n\n## Still Having Issues?\n1. Check your transaction history\n2. If money was debited but not received:\n   - Wait 30 minutes\n   - Contact support with your transaction ID\n\n## Contact Support\nTap the Help icon in the app and start a chat with our support team.`,
          order: 3,
        },
      ],
    },
    {
      title: 'Bill Payments',
      description: 'Pay for cable TV, electricity, and more',
      icon: 'receipt',
      order: 3,
      articles: [
        {
          title: 'How to Pay Electricity Bills',
          slug: 'how-to-pay-electricity',
          content: `# How to Pay Electricity Bills\n\n1. Tap "Electricity" on the home screen\n2. Select your distribution company (DISCO)\n3. Enter your meter number\n4. Select prepaid or postpaid\n5. Enter the amount\n6. Tap "Pay"\n7. Confirm with your PIN\n\n**For Prepaid Meters:**\n- Your token will be displayed immediately\n- We also send it via SMS\n- Copy and enter on your meter\n\n**Supported DISCOs:**\nIBEDC, EKEDC, IKEDC, AEDC, PHED, KEDCO, JEDC, KAEDCO, BEDC`,
          order: 1,
        },
        {
          title: 'How to Pay Cable TV',
          slug: 'how-to-pay-cable-tv',
          content: `# How to Pay Cable TV\n\n1. Tap "Cable TV" on the home screen\n2. Select your provider (DSTV, GOtv, Startimes)\n3. Enter your smart card/IUC number\n4. Select a subscription package\n5. Tap "Pay"\n6. Confirm with your PIN\n\n**Your subscription is activated instantly!**\n\n**Tips:**\n- Save your smart card number for quick payments\n- Set reminders before subscription expires\n- Enjoy cashback on monthly renewals`,
          order: 2,
        },
        {
          title: 'Electricity Token Not Received',
          slug: 'electricity-token-not-received',
          content: `# Electricity Token Not Received?\n\nIf you paid but didn't receive your token:\n\n## Check SMS\nTokens are sent via SMS. Check your messages.\n\n## View in App\n1. Go to Transactions\n2. Find the electricity payment\n3. Tap to view token details\n\n## Still No Token?\nIf the transaction shows "Completed" but no token:\n1. Contact support immediately\n2. Provide your transaction ID\n3. We'll requery and send your token\n\n## Refund Policy\nIf we can't generate your token, you'll receive a full refund within 24 hours.`,
          order: 3,
        },
      ],
    },
    {
      title: 'Wallet & Transactions',
      description: 'Manage your money and view transactions',
      icon: 'wallet',
      order: 4,
      articles: [
        {
          title: 'How to Check Wallet Balance',
          slug: 'check-wallet-balance',
          content: `# How to Check Your Wallet Balance\n\nYour wallet balance is displayed on the home screen.\n\n**Show/Hide Balance:**\nTap the eye icon to show or hide your balance for privacy.\n\n**Balance Types:**\n- **Available Balance**: Money you can spend\n- **Ledger Balance**: Total including pending transactions\n\n**Refresh Balance:**\nPull down on the home screen to refresh your balance.`,
          order: 1,
        },
        {
          title: 'View Transaction History',
          slug: 'view-transaction-history',
          content: `# View Your Transaction History\n\n1. Tap "Transactions" on the bottom navigation\n2. View all your transactions\n\n**Filter Options:**\n- By date range\n- By transaction type\n- By status (Success, Failed, Pending)\n\n**Transaction Details:**\nTap any transaction to see:\n- Full amount and fees\n- Date and time\n- Reference number\n- Status\n- Recipient details`,
          order: 2,
        },
        {
          title: 'Understanding Transaction Status',
          slug: 'transaction-status',
          content: `# Understanding Transaction Status\n\n**SUCCESS (Green)**\nTransaction completed successfully.\n\n**PENDING (Yellow)**\nTransaction is being processed. Usually completes within minutes.\n\n**FAILED (Red)**\nTransaction did not complete. Your money will be refunded.\n\n**REVERSED (Blue)**\nTransaction was reversed after initial success. Money returned to wallet.\n\n**What to do if stuck on PENDING:**\n1. Wait 30 minutes\n2. If still pending, contact support\n3. Never retry a pending transaction`,
          order: 3,
        },
      ],
    },
    {
      title: 'Account & Security',
      description: 'Keep your account safe and secure',
      icon: 'shield-checkmark',
      order: 5,
      articles: [
        {
          title: 'How to Change Your PIN',
          slug: 'change-pin',
          content: `# How to Change Your Transaction PIN\n\n1. Go to Profile > Security\n2. Tap "Change Transaction PIN"\n3. Enter your current PIN\n4. Enter your new PIN\n5. Confirm new PIN\n\n**PIN Requirements:**\n- Must be 4 digits\n- Avoid sequential numbers (1234)\n- Avoid repeated numbers (0000)\n- Don't use your birth year\n\n**Forgot Your PIN?**\nTap "Forgot PIN" and verify with OTP to reset.`,
          order: 1,
        },
        {
          title: 'How to Reset Password',
          slug: 'reset-password',
          content: `# How to Reset Your Password\n\n**If Logged In:**\n1. Go to Profile > Security\n2. Tap "Change Password"\n3. Enter current password\n4. Enter new password\n5. Confirm new password\n\n**If Forgotten:**\n1. On login screen, tap "Forgot Password"\n2. Enter your email or phone\n3. Enter the OTP received\n4. Set a new password\n\n**Password Requirements:**\n- Minimum 8 characters\n- At least one uppercase letter\n- At least one number\n- At least one special character`,
          order: 2,
        },
        {
          title: 'Enable Biometric Login',
          slug: 'biometric-login',
          content: `# Enable Biometric Login\n\nUse your fingerprint or face to log in securely.\n\n1. Go to Profile > Security\n2. Toggle on "Biometric Login"\n3. Authenticate with your current method\n4. Scan your fingerprint/face\n5. Done!\n\n**Note:**\n- Biometric is an additional security layer\n- You can still use PIN/password\n- Disable anytime from settings`,
          order: 3,
        },
      ],
    },
    {
      title: 'Refunds & Disputes',
      description: 'Learn about refunds and how to resolve issues',
      icon: 'refresh',
      order: 6,
      articles: [
        {
          title: 'Refund Policy',
          slug: 'refund-policy',
          content: `# RaverPay Refund Policy\n\n**Automatic Refunds:**\nFailed transactions are automatically refunded within 5-30 minutes.\n\n**Manual Refund Requests:**\nFor disputed transactions:\n1. Contact support within 7 days\n2. Provide transaction details\n3. Allow 24-48 hours for investigation\n4. Eligible refunds processed within 24 hours\n\n**Eligible for Refund:**\n- Failed transactions\n- Double charges\n- Services not delivered\n- Technical errors\n\n**Not Eligible:**\n- Successful transactions\n- User error (wrong number)\n- Transactions over 30 days old`,
          order: 1,
        },
        {
          title: 'How to Request a Refund',
          slug: 'request-refund',
          content: `# How to Request a Refund\n\n1. Go to Transactions\n2. Find the disputed transaction\n3. Tap the help icon\n4. Select "Request Refund"\n5. Provide details of the issue\n6. Submit request\n\n**What Happens Next:**\n- You'll receive a ticket number\n- Our team reviews within 24 hours\n- You'll be notified of the decision\n- Approved refunds credited immediately\n\n**Speed Up Your Request:**\n- Include screenshots if applicable\n- Provide accurate transaction ID\n- Describe the issue clearly`,
          order: 2,
        },
      ],
    },
    {
      title: 'Troubleshooting',
      description: 'Common issues and how to fix them',
      icon: 'build',
      order: 7,
      articles: [
        {
          title: 'App Not Loading',
          slug: 'app-not-loading',
          content: `# App Not Loading?\n\n**Try These Steps:**\n\n1. **Check Internet Connection**\n   - Switch between WiFi and mobile data\n   - Try airplane mode on/off\n\n2. **Force Close & Reopen**\n   - Close the app completely\n   - Wait a few seconds\n   - Reopen the app\n\n3. **Clear Cache**\n   - Go to phone Settings\n   - Find RaverPay in Apps\n   - Clear cache (not data)\n\n4. **Update the App**\n   - Check App Store/Play Store for updates\n   - Install latest version\n\n5. **Reinstall App**\n   - Last resort\n   - Uninstall and reinstall\n   - Log in with your credentials`,
          order: 1,
        },
        {
          title: 'Payment Failed',
          slug: 'payment-failed',
          content: `# Payment Failed?\n\n**Common Reasons:**\n\n1. **Insufficient Balance**\n   - Check your wallet balance\n   - Fund your wallet and retry\n\n2. **Network Issues**\n   - Check your internet connection\n   - Wait a few minutes and retry\n\n3. **Service Provider Down**\n   - The provider may be having issues\n   - Try again later\n\n4. **Wrong Details**\n   - Verify phone/meter/card number\n   - Check for typos\n\n**Your Money is Safe:**\n- Failed transactions are auto-refunded\n- Check transaction history for status\n- Contact support if not refunded in 30 mins`,
          order: 2,
        },
        {
          title: "Can't Login",
          slug: 'cant-login',
          content: `# Can't Login?\n\n**Check Credentials:**\n1. Ensure correct email/phone\n2. Check password (case sensitive)\n3. Try copy-pasting password\n\n**Forgot Password:**\n1. Tap "Forgot Password"\n2. Verify via OTP\n3. Set new password\n\n**Account Locked:**\nAfter 5 failed attempts, account is locked for 30 minutes.\n\n**Still Can't Access?**\nContact support with:\n- Your registered email\n- Your registered phone\n- Any recent transaction`,
          order: 3,
        },
      ],
    },
    {
      title: 'Contact & Support',
      description: 'Get help from our support team',
      icon: 'chatbubbles',
      order: 8,
      articles: [
        {
          title: 'How to Contact Support',
          slug: 'contact-support',
          content: `# How to Contact RaverPay Support\n\n**In-App Chat (Fastest)**\n1. Tap the Help icon in the app\n2. Start a conversation\n3. Our bot will assist or connect you to an agent\n4. Average response time: 5 minutes\n\n**Email**\nsupport@raverpay.com\nResponse time: 24 hours\n\n**Social Media**\n- Twitter: @raverpay\n- Instagram: @raverpay\n- Facebook: RaverPay\n\n**Support Hours:**\nMonday - Sunday\n8:00 AM - 10:00 PM WAT`,
          order: 1,
        },
        {
          title: 'Response Time Expectations',
          slug: 'response-times',
          content: `# What to Expect\n\n**In-App Chat:**\n- Bot response: Instant\n- Agent response: Under 5 minutes\n- Resolution: Usually same session\n\n**Email:**\n- First response: Within 24 hours\n- Resolution: 1-3 business days\n\n**Urgent Issues (Money-related):**\n- Prioritized in queue\n- Aim for 2-hour resolution\n\n**Tips for Faster Resolution:**\n- Use in-app chat for urgent issues\n- Provide transaction IDs\n- Include screenshots\n- Be specific about the problem`,
          order: 2,
        },
      ],
    },
  ];

  // Create collections and articles
  for (const collection of collections) {
    const { articles, ...collectionData } = collection;

    const createdCollection = await prisma.helpCollection.create({
      data: {
        ...collectionData,
        isActive: true,
      },
    });

    console.log(`  📁 Created collection: ${collection.title}`);

    for (const article of articles) {
      await prisma.helpArticle.create({
        data: {
          ...article,
          collectionId: createdCollection.id,
          isActive: true,
          viewCount: 0,
          helpfulCount: 0,
          unhelpfulCount: 0,
        },
      });
      console.log(`    📄 Created article: ${article.title}`);
    }
  }

  console.log('✅ Help Center seeded successfully!');
}

async function main() {
  console.log('🌱 Starting database seeding...\n');

  await seedSuperAdmin();
  console.log('');
  await seedHelpCenter();

  console.log('\n🎉 All seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
