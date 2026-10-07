import { Pool } from 'pg';
const pool = new Pool({ connectionString: 'postgres://ratedeck:ratedeck@localhost:5433/ratedeck' });

async function main() {
  const result = await pool.query(`SELECT SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END) as balance FROM ledger_entries WHERE account_path = 'root'`);
  console.log("BALANCE:", result.rows[0].balance);
  
  const entries = await pool.query(`SELECT * FROM ledger_entries WHERE account_path = 'root'`);
  console.log("ENTRIES:", entries.rows);
  
  const txs = await pool.query(`SELECT * FROM ledger_transactions WHERE account_path = 'root'`);
  console.log("TRANSACTIONS:", txs.rows);
  
  const invs = await pool.query(`SELECT * FROM invoices WHERE account_path = 'root'`);
  console.log("INVOICES:", invs.rows);
  
  await pool.end();
}

main().catch(console.error);
