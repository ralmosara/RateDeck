import { Queue } from 'bullmq';
import { QUEUES } from './src/infrastructure/queue/queues';

async function run() {
  const queue = new Queue(QUEUES.rating, { 
    connection: { url: process.env.REDIS_URL || 'redis://localhost:6379' }
  });

  await queue.add('rate-account', { accountId: 1, accountPath: 'root' }, { jobId: `rate-manual-${Date.now()}` });
  console.log('Queued rating job for account 1 (root)');
  
  await queue.close();
}

run().catch(console.error);
