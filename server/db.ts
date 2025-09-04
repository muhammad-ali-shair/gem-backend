import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Please configure your PostgreSQL connection.",
  );
}

// Enhanced connection configuration for self-hosted PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Connection pool settings
  max: 20, // Maximum number of connections
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Timeout for new connections
  // SSL configuration for production
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Connection error handling
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test the connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error acquiring client', err.stack);
    process.exit(-1);
  }
  console.log('Successfully connected to PostgreSQL database');
  release();
});

export { pool };
export const db = drizzle(pool, { schema });