-- Run this once in Cloudflare: Storage & Databases -> D1 -> your database -> Console
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS photos (id TEXT PRIMARY KEY, mime TEXT NOT NULL, data TEXT NOT NULL, updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL, page TEXT, name TEXT, phone TEXT, email TEXT, message TEXT,
  status TEXT NOT NULL DEFAULT 'new', ip TEXT, created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_requests_created ON requests (created DESC);
CREATE TABLE IF NOT EXISTS logins (ip TEXT NOT NULL, created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_logins ON logins (ip, created);
