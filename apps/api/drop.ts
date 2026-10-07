import { Client } from 'pg';

async function run() {
  const c = new Client({ connectionString: 'postgres://ratedeck:ratedeck@127.0.0.1:5433/ratedeck' });
  await c.connect();
  await c.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public; CREATE EXTENSION IF NOT EXISTS ltree; CREATE EXTENSION IF NOT EXISTS btree_gist; CREATE EXTENSION IF NOT EXISTS citext; GRANT ALL ON SCHEMA public TO ratedeck; GRANT ALL ON SCHEMA public TO public;');
  await c.end();
  console.log('Dropped');
}
run();
