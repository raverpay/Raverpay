import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get webhooks for the latest CCTP
  const webhooks = await prisma.circleWebhookLog.findMany({
    where: {
      payload: {
        path: ['notification', 'refId'],
        equals: 'CCTP-1766348669894-4F2F3215',
      },
    },
    orderBy: { receivedAt: 'asc' },
  });

  console.log(`Found ${webhooks.length} webhooks\n`);

  webhooks.forEach((log, i) => {
    const notification = (log.payload as any).notification;
    console.log(`Webhook ${i + 1}:`);
    console.log(`  Notification ID: ${log.notificationId}`);
    console.log(`  State: ${notification?.state}`);
    console.log(`  Transaction ID: ${notification?.id}`);
    console.log(`  Processed: ${log.processed}`);
    console.log(`  Error: ${log.error || 'none'}`);
    console.log(`  Received: ${log.receivedAt}`);
    console.log(`  Processed At: ${log.processedAt}`);
    console.log('');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
