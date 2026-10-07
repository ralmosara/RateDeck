import { Pool } from 'pg';
const pool = new Pool({ connectionString: 'postgres://ratedeck:ratedeck@localhost:5433/ratedeck' });

async function main() {
  const result = await pool.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`);
  console.log("TABLES:", result.rows.map(row => row.tablename));
  await pool.end();
}

main().catch(console.error);
