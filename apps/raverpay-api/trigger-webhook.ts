import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function main() {
  const webhookId = 'eb98dc73-fd9a-433e-aaf3-701615e3d7bb';

  // Get the webhook log
  const log = await prisma.circleWebhookLog.findUnique({
    where: { notificationId: webhookId },
  });

  if (!log) {
    console.error('Webhook not found!');
    return;
  }

  console.log('Manually reprocessing webhook...');
  console.log(`Notification ID: ${log.notificationId}`);
  console.log(`Event Type: ${log.eventType}`);

  // Call the webhook endpoint
  try {
    const response = await axios.post(
      'http://localhost:3001/api/circle/webhooks',
      log.payload,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('✅ Webhook reprocessed successfully!');
    console.log('Response:', response.data);
  } catch (error) {
    console.error('❌ Error reprocessing webhook:', error.message);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
