import { Pool } from 'pg';
import { from as copyFrom } from 'pg-copy-streams';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const DB_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/ratedeck';
const TARGET_ROWS = 10_000_000;
const BATCH_SIZE = 100_000;

async function run() {
  console.log(`Connecting to ${DB_URL}`);
  const pool = new Pool({ connectionString: DB_URL });
  const client = await pool.connect();
  
  try {
    console.log(`Starting to seed ${TARGET_ROWS} synthetic CDRs...`);
    const startTime = Date.now();
    let rowsGenerated = 0;
    
    // Generate some account/trunk IDs for reference.
    const accountId = 1; 
    const accountPath = '1';
    const trunkId = 1;

    for (let batch = 0; batch < TARGET_ROWS / BATCH_SIZE; batch++) {
      const stream = client.query(
        copyFrom(`COPY cdrs (start_time, account_id, account_path, source_id, external_call_id, caller, callee, duration_sec, disposition, trunk_id, rating_status) FROM STDIN WITH (FORMAT csv)`)
      );
      
      const generator = new Readable({
        read() {
          // Generate lines for the batch
          let csvStr = '';
          const limit = Math.min(BATCH_SIZE, TARGET_ROWS - rowsGenerated);
          
          for (let i = 0; i < limit; i++) {
            const externalCallId = `ext-${rowsGenerated + i}`;
            const caller = `1555${Math.floor(100000 + Math.random() * 900000)}`;
            const callee = `1444${Math.floor(100000 + Math.random() * 900000)}`;
            const durationSec = Math.floor(Math.random() * 3600);
            const disposition = Math.random() > 0.1 ? 'ANSWERED' : 'FAILED';
            const timestampStr = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString();
            
            csvStr += `${timestampStr},${accountId},${accountPath},1,${externalCallId},${caller},${callee},${durationSec},${disposition},${trunkId},0\n`;
          }
          
          rowsGenerated += limit;
          this.push(csvStr);
          this.push(null); // End of stream for this batch
        }
      });
      
      await pipeline(generator, stream);
      console.log(`Inserted batch ${batch + 1}, total: ${rowsGenerated} rows`);
    }

    const elapsed = (Date.now() - startTime) / 1000;
    console.log(`Finished inserting ${TARGET_ROWS} rows in ${elapsed} seconds.`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('Seeder failed:', err);
  process.exit(1);
});
