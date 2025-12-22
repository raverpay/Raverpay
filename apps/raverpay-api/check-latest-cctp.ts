import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get the latest CCTP transfer
  const latestCCTP = await prisma.circleCCTPTransfer.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  if (!latestCCTP) {
    console.log('No CCTP transfers found');
    return;
  }

  console.log('\n=== Latest CCTP Transfer ===');
  console.log(`Reference: ${latestCCTP.reference}`);
  console.log(`State: ${latestCCTP.state}`);
  console.log(`Burn Transaction ID: ${latestCCTP.burnTransactionId}`);
  console.log(`Burn Transaction Hash: ${latestCCTP.burnTransactionHash}`);
  console.log(`Burn Confirmed At: ${latestCCTP.burnConfirmedAt}`);

  // Check if CircleTransaction exists
  const circleTransaction = await prisma.circleTransaction.findFirst({
    where: { refId: latestCCTP.reference },
  });

  console.log('\n=== CircleTransaction ===');
  if (circleTransaction) {
    console.log(`✅ EXISTS`);
    console.log(`State: ${circleTransaction.state}`);
    console.log(`Transaction Hash: ${circleTransaction.transactionHash}`);
  } else {
    console.log(`❌ NOT FOUND`);
  }

  // Check webhooks
  const webhooks = await prisma.circleWebhookLog.findMany({
    where: {
      payload: {
        path: ['notification', 'refId'],
        equals: latestCCTP.reference,
      },
    },
    orderBy: { receivedAt: 'asc' },
  });

  console.log(`\n=== Webhooks (${webhooks.length} total) ===`);
  webhooks.forEach((log, i) => {
    const notification = (log.payload as any).notification;
    console.log(
      `${i + 1}. State: ${notification?.state}, Processed: ${log.processed}, Error: ${log.error || 'none'}`,
    );
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
