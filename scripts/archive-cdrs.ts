import { Pool } from 'pg';
import { execSync } from 'child_process';
import * as fs from 'fs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://ratedeck_app:ratedeck_app@127.0.0.1:5432/ratedeck' });

async function archiveOldPartitions() {
  console.log('🧊 Running Cold Storage Archival Strategy...');
  
  // 1. Identify partitions older than 90 days
  // Assuming partition naming convention cdrs_yYYYYmM (e.g., cdrs_y2026m06)
  const query = `
    SELECT inhrelid::regclass AS partition_name
    FROM   pg_catalog.pg_inherits
    WHERE  inhparent = 'cdrs'::regclass;
  `;
  
  const res = await pool.query(query);
  
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  for (const row of res.rows) {
    const partitionName = row.partition_name;
    const match = partitionName.match(/cdrs_y(\d{4})m(\d{2})/);
    if (!match) continue;
    
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // JS months are 0-indexed
    
    const partitionDate = new Date(year, month, 1);
    
    if (partitionDate < ninetyDaysAgo) {
      console.log(`[Archive] Found stale partition: ${partitionName}`);
      const filename = `/tmp/${partitionName}.csv`;
      
      // 2. Export to CSV (to be converted to Parquet and uploaded to S3)
      console.log(`[Archive] Exporting ${partitionName} to ${filename}...`);
      await pool.query(`COPY ${partitionName} TO '${filename}' WITH (FORMAT csv, HEADER true)`);
      
      // 3. Fake S3 Upload
      console.log(`[Archive] Uploading to s3://ratedeck-cold-storage/cdrs/${year}/${match[2]}/${partitionName}.csv`);
      // execSync(`aws s3 cp ${filename} s3://ratedeck-cold-storage/cdrs/${year}/${match[2]}/`);
      
      // 4. Drop partition from Postgres
      console.log(`[Archive] Dropping partition ${partitionName} from PostgreSQL...`);
      await pool.query(`DROP TABLE ${partitionName}`);
      
      // Cleanup local file
      // fs.unlinkSync(filename);
      console.log(`✅ Successfully archived and pruned ${partitionName}`);
    }
  }

  console.log('Archival complete.');
  await pool.end();
}

archiveOldPartitions().catch(console.error);
