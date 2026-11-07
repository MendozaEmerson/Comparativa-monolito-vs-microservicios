import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'benchmark_user',
  password: process.env.DB_PASSWORD || 'benchmark_pass',
  database: process.env.DB_NAME || 'ticket_db',
  max: parseInt(process.env.DB_POOL_MAX || '15', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

