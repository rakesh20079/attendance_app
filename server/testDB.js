const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: 'postgres', // connect to default DB first
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function listDbs() {
  try {
    const res = await pool.query('SELECT datname FROM pg_database');
    console.log('Available databases:', res.rows.map(r => r.datname).join(', '));
  } catch (err) {
    console.error('Error connecting to postgres default DB:', err.message);
  } finally {
    await pool.end();
  }
}
listDbs();
