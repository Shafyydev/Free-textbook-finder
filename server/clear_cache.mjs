import { Pool } from 'pg';
const pool = new Pool();
(async () => {
  try {
    await pool.query("DELETE FROM provider_cache");
    console.log('Cache cleared');
  } catch(e) {
    console.log('Cache clear error:', e.message);
  }
  await pool.end();
})();
