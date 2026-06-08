import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env['DATABASE_URL'],
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5000,
});

export default pool;
