import pool from './src/db/pool.js';
(async () => {
  try {
    const r = await pool.query('SELECT COUNT(*) AS total FROM books');
    console.log('DB OK: ' + r.rows[0].total + ' books');
  } catch (err) {
    console.log('DB failed: ' + err.message);
  }
  await pool.end();
})();
