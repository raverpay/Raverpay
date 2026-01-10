/**
 * Update Collection Wallet Addresses in System Config
 *
 * This script updates the CIRCLE_FEE_CONFIG in the database with the
 * collection wallet addresses created for each network.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Collection wallet addresses from script output
const COLLECTION_WALLETS = {
  'MATIC-AMOY': '0x4955c8ee667c98b0118994d99dbb56611f727df1',
  'ARB-SEPOLIA': '0x69476b0a0cb611faf8e9be80274b3b6ce63f54f4',
  'BASE-SEPOLIA': '0x1c409c1184ef28d72f091246416847725683bb2d',
  'OP-SEPOLIA': '0xeaccbb34d6fa2782d0e1c21e3a9222f300736102',
  // Mainnet wallets - to be added later
  'BASE-MAINNET': '',
  'OP-MAINNET': '',
  'ARB-MAINNET': '',
  'MATIC-POLYGON': '',
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
      console.log('Creating new configuration...');

      await prisma.systemConfig.create({
        data: {
          key: 'CIRCLE_FEE_CONFIG',
          value: {
            enabled: true,
            percentage: 0.5,
            minFeeUsdc: 0.0625,
            collectionWallets: COLLECTION_WALLETS,
          },
          updatedBy: 'system-script',
        },
      });

      console.log('✅ Created new CIRCLE_FEE_CONFIG with collection wallets');
    } else {
      console.log('📝 Current configuration:');
      console.log(JSON.stringify(currentConfig.value, null, 2));

      // Merge with existing config
      const existingConfig = currentConfig.value as any;
      const updatedConfig = {
        ...existingConfig,
        collectionWallets: {
          ...existingConfig.collectionWallets,
          ...COLLECTION_WALLETS,
        },
      };

      console.log('\n🔄 Updating with new collection wallets...');

      await prisma.systemConfig.update({
        where: { key: 'CIRCLE_FEE_CONFIG' },
        data: {
          value: updatedConfig,
          updatedBy: 'system-script',
        },
      });

      console.log('✅ Updated CIRCLE_FEE_CONFIG with collection wallets');
    }

    // Display final config
    const finalConfig = await prisma.systemConfig.findUnique({
      where: { key: 'CIRCLE_FEE_CONFIG' },
    });

    console.log('\n📋 Final configuration:');
    console.log(JSON.stringify(finalConfig?.value, null, 2));

    console.log('\n✨ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
