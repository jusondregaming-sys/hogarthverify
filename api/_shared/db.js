// api/_shared/db.js
// Shared by api/profile/me.js, api/characters/*.js, api/inbox/*.js, and
// api/applications/*.js.
// Directory name starts with `_` so Vercel does NOT turn this into a route.

const { sql } = require('@vercel/postgres');

let schemaReady = false;

// Creates the tables if they don't exist yet, and migrates in any columns
// added after the tables first shipped. Safe to call on every request —
// every statement here is a no-op once already applied — but we cache a
// flag per warm serverless instance to skip the round trip most of the
// time.
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
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_by TEXT,
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  // Backfill columns for a characters table that existed before the
  // application-review workflow was added.
  await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';`;
  await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS reviewed_by TEXT;`;
  await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;`;

  await sql`
    CREATE TABLE IF NOT EXISTS inbox_messages (
      id SERIAL PRIMARY KEY,
      user_discord_id TEXT NOT NULL REFERENCES users(discord_id) ON DELETE CASCADE,
      character_name TEXT NOT NULL,
      decision TEXT NOT NULL,
      message TEXT,
      reviewed_by TEXT,
      is_read BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  schemaReady = true;
}

module.exports = { sql, ensureSchema };
