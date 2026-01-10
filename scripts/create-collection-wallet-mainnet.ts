/**
 * Create Collection Wallets - MAINNET
 * 
 * WARNING: This script creates MAINNET wallets and costs real money.
 * Only run this when you're ready to go to production!
 * 
 * This will:
 * 1. Create Circle wallets for mainnet networks
 * 2. Update the CIRCLE_FEE_CONFIG with mainnet wallet addresses
 */

const API_URL = 'http://localhost:3001/api';

const USER_DATA = {
  email: 'collectionwallets@raverpay.com',
  password: 'joseph6thbornR$',
  phone: '08123456789',
  firstName: 'Collection',
  lastName: 'Wallet',
};

const MAINNET_WALLETS_TO_CREATE = [
  'BASE',           // Base Mainnet
  'OP',             // Optimism Mainnet
  'ARB',            // Arbitrum One
  'MATIC',          // Polygon PoS
];

async function main() {
  try {
    console.log('⚠️  WARNING: Creating MAINNET Collection Wallets');
    console.log('⚠️  This will cost real money and create production wallets!');
    console.log('');
    
    // Add a 5 second delay for safety
    console.log('Starting in 5 seconds... Press Ctrl+C to cancel');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('');
    console.log('1. Registering/Logging in user...');
    
    let accessToken: string;
    
    // Try to login first
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: USER_DATA.email,
        password: USER_DATA.password,
      }),
    });

    if (loginRes.ok) {
      console.log('✅ User already exists, logging in...');
      const data = await loginRes.json() as any;
      accessToken = data.accessToken;
    } else {
      console.log('ℹ️  Using existing user (should already exist from testnet setup)');
      console.log('If this fails, run the testnet script first');
      throw new Error('Login failed. Run testnet script first to create user.');
    }

    console.log('Access Token obtained.');
    console.log('');
    console.log('2. Creating MAINNET Circle Wallets...');
    console.log('');
    
    const createdWallets: Record<string, { address: string; walletId: string }> = {};
    
    for (const blockchain of MAINNET_WALLETS_TO_CREATE) {
      console.log(`📍 Creating wallet for ${blockchain} (MAINNET)...`);
      
      const walletRes = await fetch(`${API_URL}/circle/wallets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          blockchain,
          accountType: 'SCA',
          name: `Collection Wallet - ${blockchain} MAINNET`,
        }),
      });

      if (!walletRes.ok) {
        const error = await walletRes.json() as any;
        console.error(`❌ Failed to create wallet for ${blockchain}:`, error.message || error);
      } else {
        const data = await walletRes.json() as any;
        const address = data.data.address;
        const walletId = data.data.walletId;
        
        createdWallets[`${blockchain}-MAINNET`] = { address, walletId };
        
        console.log(`✅ Created ${blockchain} wallet`);
        console.log(`   Address: ${address}`);
        console.log(`   Wallet ID: ${walletId}`);
        console.log('');
      }
    }
    
    if (Object.keys(createdWallets).length === 0) {
      console.log('⚠️  No wallets were created. Exiting...');
      return;
    }
    
    console.log('');
    console.log('3. Updating system configuration...');
    console.log('');
    
    // Create update script content
    const walletMapping = Object.entries(createdWallets).map(([key, val]) => {
      return `  '${key}': '${val.address}',`;
    }).join('\n');
    
    console.log('📝 Copy these wallet addresses for update-collection-wallets-mainnet.ts:');
    console.log('');
    console.log('const MAINNET_COLLECTION_WALLETS = {');
    console.log(walletMapping);
    console.log('};');
    console.log('');
    
    console.log('✨ Done! Mainnet collection wallets created successfully!');
    console.log('');
    console.log('📌 NEXT STEPS:');
    console.log('1. Run: npx tsx scripts/update-collection-wallets-mainnet.ts');
    console.log('2. Verify wallets in admin dashboard');
    console.log('3. Fund these wallets if needed for gas (though Circle sponsors gas)');
    console.log('4. Update your environment to use mainnet Circle API keys');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
