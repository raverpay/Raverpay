import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Reset the CONFIRMED webhook so it can be reprocessed
  const webhookId = 'eb98dc73-fd9a-433e-aaf3-701615e3d7bb'; // CONFIRMED state

  console.log(`Resetting webhook ${webhookId} for reprocessing...`);

  await prisma.circleWebhookLog.update({
    where: { notificationId: webhookId },
    data: {
      processed: false,
      processedAt: null,
      error: null,
    },
  });

  console.log(
    '✅ Webhook reset! It will be reprocessed on the next retry from Circle.',
  );
  console.log(
    'Or you can manually trigger it by calling the webhook endpoint.',
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
