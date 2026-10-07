import { Client } from 'pg';

async function run() {
  const c = new Client({ connectionString: 'postgres://ratedeck:ratedeck@127.0.0.1:5433/ratedeck' });
  await c.connect();
  const res = await c.query('SELECT * FROM accounts');
  console.log(res.rows);
  await c.end();
}
run();
