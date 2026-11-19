import pool from './src/db/pool.js';
(async () => {
  try {
    const r = await pool.query('SELECT COUNT(*) AS total FROM books');
    console.log('DB connection works! Total books: ' + r.rows[0].total);
  } catch (err) {
    console.log('DB connection failed: ' + err.message);
  }
  await pool.end();
})();
