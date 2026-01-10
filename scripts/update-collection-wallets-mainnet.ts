/**
 * Update Collection Wallet Addresses - MAINNET
 * 
 * This script updates the CIRCLE_FEE_CONFIG in the database with the
 * MAINNET collection wallet addresses.
 * 
 * Run this AFTER you've run create-collection-wallet-mainnet.ts
 * and copied the wallet addresses here.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// TODO: Update these addresses after running create-collection-wallet-mainnet.ts
const MAINNET_COLLECTION_WALLETS = {
  'BASE-MAINNET': '',  // TODO: Add BASE mainnet wallet address
  'OP-MAINNET': '',    // TODO: Add Optimism mainnet wallet address
  'ARB-MAINNET': '',   // TODO: Add Arbitrum mainnet wallet address
  'MATIC-POLYGON': '', // TODO: Add Polygon mainnet wallet address
};

async function main() {
  try {
    console.log('🔍 Fetching current fee configuration...');

    // Get current config
    const currentConfig = await prisma.systemConfig.findUnique({
      where: { key: 'CIRCLE_FEE_CONFIG' },
    });

    if (!currentConfig) {
      console.log('❌ CIRCLE_FEE_CONFIG not found in database');
      console.log('Run the API server first to initialize the config');
      process.exit(1);
    }

    console.log('📝 Current configuration:');
    console.log(JSON.stringify(currentConfig.value, null, 2));
    console.log('');

    // Check if all mainnet wallets are provided
    const emptyWallets = Object.entries(MAINNET_COLLECTION_WALLETS)
      .filter(([_, address]) => !address)
      .map(([network]) => network);

    if (emptyWallets.length > 0) {
      console.log('⚠️  WARNING: The following mainnet wallets are not configured:');
      emptyWallets.forEach(network => console.log(`   - ${network}`));
      console.log('');
      console.log('Please update the MAINNET_COLLECTION_WALLETS object in this script');
      console.log('after running create-collection-wallet-mainnet.ts');
      console.log('');
      
      // Ask for confirmation
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise<string>((resolve) => {
        readline.question('Continue anyway? (y/N): ', resolve);
      });
      
      readline.close();
      
      if (answer.toLowerCase() !== 'y') {
        console.log('Aborted.');
        process.exit(0);
      }
    }

    // Merge with existing config
    const existingConfig = currentConfig.value as any;
    const updatedConfig = {
      ...existingConfig,
      collectionWallets: {
        ...existingConfig.collectionWallets,
        ...MAINNET_COLLECTION_WALLETS,
      },
    };

    console.log('🔄 Updating with MAINNET collection wallets...');

    await prisma.systemConfig.update({
      where: { key: 'CIRCLE_FEE_CONFIG' },
      data: {
        value: updatedConfig,
        updatedBy: 'system-script-mainnet',
      },
    });

    console.log('✅ Updated CIRCLE_FEE_CONFIG with MAINNET collection wallets');

    // Display final config
    const finalConfig = await prisma.systemConfig.findUnique({
      where: { key: 'CIRCLE_FEE_CONFIG' },
    });

    console.log('');
    console.log('📋 Final configuration:');
    console.log(JSON.stringify(finalConfig?.value, null, 2));

    console.log('');
    console.log('✨ Done!');
    console.log('');
    console.log('📌 NEXT STEPS:');
    console.log('1. Verify wallet addresses in admin dashboard');
    console.log('2. Update Circle API keys to use MAINNET keys');
    console.log('3. Enable mainnet blockchains in admin dashboard');
    console.log('4. Test with small amounts first!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
