import express from 'express';
import Redis from 'ioredis';
import { Pool } from 'pg';

const app = express();
app.use(express.json());

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// High performance SIP Authorization endpoint for Kamailio / FreeSWITCH
app.post('/v1/sip/authorize', async (req, res) => {
  const { caller, callee, accountId } = req.body;
  
  if (!accountId || !callee) {
    return res.status(400).json({ error: 'Missing accountId or callee' });
  }

  // 1. Fast lookup: Balance check from cached projections in Redis
  const balanceStr = await redis.get(`balance:account:${accountId}`);
  if (!balanceStr) {
    // Fallback to database if not in cache (omitted for brevity)
    return res.status(403).json({ authorized: false, reason: 'No balance found' });
  }
  
  const balance = parseFloat(balanceStr);
  if (balance <= 0) {
    return res.json({ authorized: false, reason: 'Insufficient funds' });
  }

  // 2. Rate quote lookup: How much is this destination per minute?
  // In a real scenario, this would hit the in-memory Trie Cache or Redis
  // Mocking a fixed rate for now: $0.05 per minute
  const ratePerMin = 0.05; 
  
  // 3. Calculate MAX call duration = (Balance / Rate_Per_Min) * 60
  const maxDurationSec = Math.floor((balance / ratePerMin) * 60);

  // 4. Return 200 OK with `Max-Duration`
  res.json({
    authorized: true,
    max_duration_sec: maxDurationSec
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 SIP Authorisation API listening on port ${PORT}`);
});
