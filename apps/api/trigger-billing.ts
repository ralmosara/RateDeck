import { Queue } from 'bullmq';
import { ENV } from './src/config/env';

async function main() {
  const queue = new Queue('billing', { connection: { url: 'redis://localhost:6379' } });
  
  await queue.add('bill-manual-' + Date.now(), {
    accountId: 1,
    accountPath: 'root'
  });
  
  console.log('Queued billing job for account 1 (root)');
  await queue.close();
}

main().catch(console.error);
