import { Client } from 'pg';

async function run() {
  const c = new Client({ connectionString: 'postgres://ratedeck:ratedeck@127.0.0.1:5433/ratedeck' });
  await c.connect();
  
  await c.query("SET app.scope = 'root'");
  
  // 1. Insert Deck
  const deckRes = await c.query(`
    INSERT INTO rate_decks (owner_account_id, account_path, kind, currency, name)
    VALUES (1, 'root', 'wholesale', 'USD', 'Seeded Deck')
    RETURNING id;
  `);
  const deckId = deckRes.rows[0].id;
  
  // 2. Insert Deck Version
  const dvRes = await c.query(`
    INSERT INTO rate_deck_versions (deck_id, account_path, version, status, effective)
    VALUES ($1, 'root', 1, 'published', '[2020-01-01 00:00:00+00,)')
    RETURNING id;
  `, [deckId]);
  const deckVersionId = dvRes.rows[0].id;
  
  // 3. Insert Rates
  await c.query(`
    INSERT INTO rates (deck_version_id, account_path, prefix, destination, rate_per_min, connection_fee, increment_first, increment_next, effective)
    VALUES 
    ($1, 'root', '1555', 'US 555', 0.015, 0, 60, 60, '[2020-01-01 00:00:00+00,)'),
    ($1, 'root', '1444', 'US 444', 0.025, 0, 60, 60, '[2020-01-01 00:00:00+00,)'),
    ($1, 'root', '44', 'UK', 0.05, 0, 1, 1, '[2020-01-01 00:00:00+00,)');
  `, [deckVersionId]);
  
  console.log('Deck and rates seeded.');
  await c.end();
}
run().catch(console.error);
