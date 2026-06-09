// Node.js example: use dotenv and pg to connect using env vars
// Install: npm install pg dotenv

require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

async function test() {
  const res = await pool.query('SELECT NOW() as now')
  console.log('DB connected, server time:', res.rows[0].now)
  await pool.end()
}

test().catch((err) => {
  console.error('DB connection error', err)
  process.exit(1)
})
