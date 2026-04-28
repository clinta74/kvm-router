import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_PATH = process.env.DB_PATH ?? '/data/kvm.db';

// Ensure the directory exists in development
let db: Database.Database;
try {
  db = new Database(DB_PATH);
} catch {
  // Fallback for local dev when /data doesn't exist
  db = new Database(path.join(process.cwd(), 'kvm.db'));
}

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS hosts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    url TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    max_body_size TEXT NOT NULL DEFAULT '10m',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migrate existing DB: add max_body_size if missing
try {
  db.exec(`ALTER TABLE hosts ADD COLUMN max_body_size TEXT NOT NULL DEFAULT '10m'`);
} catch {
  // Column already exists
}

// Seed admin from environment variables if no users exist yet
const adminUsername = process.env.ADMIN_USERNAME;
const adminPassword = process.env.ADMIN_PASSWORD;
if (adminUsername && adminPassword) {
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(adminUsername);
  if (!existingUser) {
    const hash = bcrypt.hashSync(adminPassword, 12);
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(adminUsername, hash);
    console.log(`[db] Seeded admin user: ${adminUsername}`);
  }
}

export default db;
