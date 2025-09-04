import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";
import path from 'path';

// Create database file in project root
const dbPath = path.join(process.cwd(), 'database.db');
export const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });

// Initialize database with schema
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT UNIQUE NOT NULL,
    username TEXT,
    total_points INTEGER DEFAULT 0,
    referral_code TEXT,
    referred_by INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    activity_type TEXT NOT NULL,
    points INTEGER NOT NULL,
    transaction_hash TEXT,
    block_number INTEGER,
    metadata TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id INTEGER NOT NULL,
    referee_id INTEGER NOT NULL,
    points_earned INTEGER DEFAULT 0,
    is_qualified BOOLEAN DEFAULT 0,
    qualification_amount REAL DEFAULT 0.00,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referrer_id) REFERENCES users(id),
    FOREIGN KEY (referee_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS accolades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    accolade_type TEXT NOT NULL,
    level INTEGER DEFAULT 1,
    multiplier REAL DEFAULT 0,
    unlocked_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS point_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_type TEXT UNIQUE NOT NULL,
    base_points INTEGER NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS blockchain_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    transaction_hash TEXT NOT NULL,
    block_number INTEGER NOT NULL,
    user_address TEXT NOT NULL,
    metadata TEXT,
    processed BOOLEAN DEFAULT FALSE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log(`SQLite database initialized at: ${dbPath}`);