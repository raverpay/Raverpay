import { PrismaClient, UserRole, UserStatus, KYCTier } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Check if SUPER_ADMIN already exists
  const existingSuperAdmin = await prisma.user.findFirst({
    where: { role: UserRole.SUPER_ADMIN },
  });

  if (existingSuperAdmin) {
    console.log('✅ SUPER_ADMIN already exists:', existingSuperAdmin.email);
    return;
  }

  // Get environment variables or use defaults
  const email = process.env.SUPER_ADMIN_EMAIL || 'admin@mularpay.com';
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
      // Create wallet for the admin
      wallet: {
        create: {
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

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
