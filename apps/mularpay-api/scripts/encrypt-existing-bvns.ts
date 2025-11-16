/**
 * Migration Script: Encrypt Existing BVN Values
 *
 * This script encrypts all existing plain text BVN values in the database.
 * Run this script once after deploying the BVN encryption service.
 *
 * Usage:
 *   ts-node scripts/encrypt-existing-bvns.ts
 *
 * Environment Variables Required:
 *   - DATABASE_URL: PostgreSQL connection string
 *   - BVN_ENCRYPTION_KEY: Encryption key for BVN
 *   - BVN_ENCRYPTION_SALT: Salt for key derivation (optional, uses key if not provided)
 */

import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { BVNEncryptionService } from '../src/utils/bvn-encryption.service';

// Load environment variables from .env file if it exists
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach((line) => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const prisma = new PrismaClient();

// Create ConfigService instance (it will use process.env)
const configService = new ConfigService();

// Create BVNEncryptionService instance
const bvnEncryptionService = new BVNEncryptionService(configService);

async function encryptExistingBVNs() {
  console.log('🔐 Starting BVN encryption migration...\n');

  try {
    // Get all users with BVN
    const users = await prisma.user.findMany({
      where: {
        bvn: {
          not: null,
        },
      },
      select: {
        id: true,
        email: true,
        bvn: true,
      },
    });

    console.log(`Found ${users.length} users with BVN values\n`);

    let encryptedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        // Check if BVN is already encrypted
        if (user.bvn && bvnEncryptionService.isEncrypted(user.bvn)) {
          console.log(
            `⏭️  Skipping user ${user.email} - BVN already encrypted`,
          );
          skippedCount++;
          continue;
        }

        if (!user.bvn) {
          console.log(`⏭️  Skipping user ${user.email} - No BVN`);
          skippedCount++;
          continue;
        }

        // Encrypt BVN
        const encryptedBvn = bvnEncryptionService.encrypt(user.bvn);

        // Update user with encrypted BVN
        await prisma.user.update({
          where: { id: user.id },
          data: { bvn: encryptedBvn },
        });

        console.log(
          `✅ Encrypted BVN for user ${user.email} - Masked: ${bvnEncryptionService.maskForLogging(user.bvn)}`,
        );
        encryptedCount++;
      } catch (error) {
        console.error(
          `❌ Error encrypting BVN for user ${user.email}:`,
          error instanceof Error ? error.message : error,
        );
        errorCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Encrypted: ${encryptedCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📝 Total: ${users.length}\n`);

    if (errorCount > 0) {
      console.log(
        '⚠️  Some errors occurred during migration. Please review the logs above.',
      );
      process.exit(1);
    }

    console.log('✅ BVN encryption migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
encryptExistingBVNs()
  .then(() => {
    console.log('\n✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
