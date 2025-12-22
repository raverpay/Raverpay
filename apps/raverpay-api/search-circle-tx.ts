import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const burnTxId = 'bfb225a1-b042-599f-a492-737925df62ad';

  // Search by circle transaction ID
  const byCircleTxId = await prisma.circleTransaction.findFirst({
    where: { circleTransactionId: burnTxId },
  });

  console.log(
    'Search by circleTransactionId:',
    byCircleTxId ? 'FOUND' : 'NOT FOUND',
  );

  // Search by refId
  const byRefId = await prisma.circleTransaction.findFirst({
    where: { refId: 'CCTP-1766348669894-4F2F3215' },
  });

  console.log('Search by refId:', byRefId ? 'FOUND' : 'NOT FOUND');

  // List ALL circle transactions created in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentTxs = await prisma.circleTransaction.findMany({
    where: {
      createdAt: { gte: oneHourAgo },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log(`\nRecent CircleTransactions (last hour): ${recentTxs.length}`);
  recentTxs.forEach((tx, i) => {
    console.log(
      `${i + 1}. ID: ${tx.circleTransactionId}, refId: ${tx.refId}, state: ${tx.state}, created: ${tx.createdAt}`,
    );
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
