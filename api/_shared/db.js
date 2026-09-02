// api/_shared/db.js
// Shared by api/profile/me.js and api/characters/create.js.
// Directory name starts with `_` so Vercel does NOT turn this into a route.

const { sql } = require('@vercel/postgres');

let schemaReady = false;

// Creates the tables if they don't exist yet. Safe to call on every
// request — CREATE TABLE IF NOT EXISTS is a no-op once the tables exist —
// but we cache a flag per warm serverless instance to skip the round trip
// most of the time.
async function ensureSchema() {
  if (schemaReady) return;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      discord_id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      rank TEXT NOT NULL,
      slots INTEGER,
      avatar TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  // slots is NULL for unlimited-character ranks (e.g. Overseer). If this
  // table was created before that was accounted for, it may still have a
  // NOT NULL constraint on slots — this is safe to run every time; it's a
  // no-op once the column is already nullable.
  await sql`
    ALTER TABLE users ALTER COLUMN slots DROP NOT NULL;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS characters (
      id SERIAL PRIMARY KEY,
      user_discord_id TEXT NOT NULL REFERENCES users(discord_id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      age TEXT,
      house TEXT,
      bio TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  schemaReady = true;
}

module.exports = { sql, ensureSchema };
