/**
 * SQLite Migration Script
 * Creates core tables for demo/development.
 */
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

const envPath = process.env.DB_SQLITE_PATH;
const dbPath = envPath
  ? path.isAbsolute(envPath) ? envPath : path.join(process.cwd(), envPath)
  : path.join(process.cwd(), 'data', 'ainova.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

console.log('[SQLite] Creating tables...');

// Core settings
db.exec(`
  CREATE TABLE IF NOT EXISTS core_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT,
    updated_by TEXT,
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )
`);

// Core users
db.exec(`
  CREATE TABLE IF NOT EXISTS core_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    email TEXT,
    role TEXT DEFAULT 'user',
    is_active INTEGER DEFAULT 1,
    first_login INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )
`);

// Core sessions
db.exec(`
  CREATE TABLE IF NOT EXISTS core_sessions (
    session_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    last_activity TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )
`);

// Core audit log
db.exec(`
  CREATE TABLE IF NOT EXISTS core_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    user_id INTEGER,
    username TEXT,
    ip_address TEXT,
    success INTEGER DEFAULT 0,
    details TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )
`);

// Core modules
db.exec(`
  CREATE TABLE IF NOT EXISTS core_modules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    tier TEXT DEFAULT 'basic',
    config TEXT
  )
`);

// Core units
db.exec(`
  CREATE TABLE IF NOT EXISTS core_units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    type TEXT,
    base_unit_id INTEGER,
    conversion_factor REAL DEFAULT 1
  )
`);

// Core roles
db.exec(`
  CREATE TABLE IF NOT EXISTS core_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    permissions TEXT
  )
`);

// Core translations
db.exec(`
  CREATE TABLE IF NOT EXISTS core_translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    translation_key TEXT NOT NULL,
    locale TEXT NOT NULL,
    translation_value TEXT NOT NULL,
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE(translation_key, locale)
  )
`);

// Failed login attempts
db.exec(`
  CREATE TABLE IF NOT EXISTS core_failed_logins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL,
    attempted_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )
`);

// Core permissions
db.exec(`
  CREATE TABLE IF NOT EXISTS core_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    permission_code TEXT UNIQUE NOT NULL,
    description TEXT,
    module_id TEXT,
    is_builtin INTEGER DEFAULT 0
  )
`);

// Core import configs
db.exec(`
  CREATE TABLE IF NOT EXISTS core_import_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    module_id TEXT,
    config TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )
`);

// Workflow rules
db.exec(`
  CREATE TABLE IF NOT EXISTS core_workflow_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    module_id TEXT,
    trigger_event TEXT,
    conditions TEXT,
    actions TEXT,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )
`);

// API keys
db.exec(`
  CREATE TABLE IF NOT EXISTS core_api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    key_hash TEXT UNIQUE NOT NULL,
    permissions TEXT,
    expires_at TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )
`);

// Sites
db.exec(`
  CREATE TABLE IF NOT EXISTS core_sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    address TEXT,
    is_default INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )
`);

// Dashboard layouts
db.exec(`
  CREATE TABLE IF NOT EXISTS core_dashboard_layouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    layout TEXT,
    is_default INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )
`);

// Insert default roles
db.exec(`
  INSERT OR IGNORE INTO core_roles (name, permissions) VALUES 
    ('admin', '["*"]'),
    ('manager', '["read", "write", "export"]'),
    ('operator', '["read", "write"]'),
    ('viewer', '["read"]')
`);

console.log('[SQLite] Migration complete!');
console.log(`[SQLite] Database: ${dbPath}`);

db.close();
