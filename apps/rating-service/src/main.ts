import Redis from 'ioredis';
import { Pool } from 'pg';

import { RatingWorker } from './rating.worker';

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function bootstrap() {
  console.log('🚀 Standalone Rating Service starting...');
  console.log('Subscribing to rating jobs queue (BullMQ extraction target)...');
  
  new RatingWorker(redis, pool);
}

bootstrap().catch(console.error);
