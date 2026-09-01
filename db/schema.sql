-- db/schema.sql
-- Reference only — api/_shared/db.js creates these automatically on first
-- request. You can also run this manually in Vercel's Postgres query editor
-- if you'd like to create the tables ahead of time or inspect the shape.

CREATE TABLE IF NOT EXISTS users (
  discord_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  rank TEXT NOT NULL,
  slots INTEGER NOT NULL,
  avatar TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS characters (
  id SERIAL PRIMARY KEY,
  user_discord_id TEXT NOT NULL REFERENCES users(discord_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age TEXT,
  house TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Future phases (not built yet — pets, cosmetics, achievements, quests,
-- purchases) would each get their own table with a user_discord_id column,
-- following this same pattern.
