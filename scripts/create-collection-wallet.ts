
const API_URL = 'http://localhost:3001/api';

const USER_DATA = {
  email: 'collectionwallets@raverpay.com',
  password: 'joseph6thbornR$',
  phone: '08123456789', // Random Nigerian number
  firstName: 'Collection',
  lastName: 'Wallet',
};

const WALLETS_TO_CREATE = [
  'ETH-SEPOLIA',
  'MATIC-AMOY',
  'ARB-SEPOLIA',
  'BASE-SEPOLIA',
  'OP-SEPOLIA',
  'AVAX-FUJI',
  'SOL-DEVNET',
];

async function main() {
  try {
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
       console.log('User already exists, logging in...');
       const data = await loginRes.json() as any;
       accessToken = data.accessToken;
    } else {
       console.log('Creating new user...');
       const registerRes = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(USER_DATA),
      });
      
      if (!registerRes.ok) {
        const error = await registerRes.json();
        throw new Error(`Registration failed: ${JSON.stringify(error)}`);
      }
      
      const data = await registerRes.json() as any;
      accessToken = data.accessToken;
    }

    console.log('Access Token obtained.');

    console.log('2. Creating Circle Wallets...');
    
    for (const blockchain of WALLETS_TO_CREATE) {
      console.log(`Creating wallet for ${blockchain}...`);
      
      const walletRes = await fetch(`${API_URL}/circle/wallets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          blockchain,
          accountType: 'SCA',
          name: `Collection Wallet - ${blockchain}`,
        }),
      });

      if (!walletRes.ok) {
         // It might fail if wallet already exists, which is fine
         const error = await walletRes.json() as any;
         console.warn(`Failed to create wallet for ${blockchain}:`, error.message || error);
      } else {
         const data = await walletRes.json() as any;
         console.log(`✅ Created ${blockchain} wallet: ${data.data.address} (ID: ${data.data.walletId})`);
      }
    }
    
    console.log('Done!');

  } catch (error) {
    console.error('Error:', error);
  }
}

main();
