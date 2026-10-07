import { Client } from 'pg';

async function run() {
  const c = new Client({ connectionString: 'postgres://ratedeck:ratedeck@127.0.0.1:5433/ratedeck' });
  await c.connect();
  
  const res = await c.query('SELECT rating_status, COUNT(*) FROM cdrs GROUP BY rating_status');
  console.log(res.rows);
  
  await c.end();
}
run().catch(console.error);
