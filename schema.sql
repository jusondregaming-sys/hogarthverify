-- db/schema.sql
-- Reference only — api/_shared/db.js creates/migrates these automatically
-- on first request. You can also run this manually in Vercel's Postgres
-- query editor if you'd like to create the tables ahead of time or
-- inspect the shape.

CREATE TABLE IF NOT EXISTS users (
  discord_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  rank TEXT NOT NULL,
  slots INTEGER, -- NULL means unlimited (e.g. Overseer)
  avatar TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS characters (
  id SERIAL PRIMARY KEY,
  user_discord_id TEXT NOT NULL REFERENCES users(discord_id) ON DELETE CASCADE,
  name TEXT NOT NULL,      -- derived: "<given_names> <surname>", kept so
                            -- existing code (inbox snapshots, cards, etc.)
                            -- has one field to display
  age TEXT,                 -- legacy, no longer set by the create form (dob replaces it)
  house TEXT,                -- legacy, no longer set by the create form
  bio TEXT,

  -- ---- Wizarding Passport: Standard Information ----
  surname TEXT,
  given_names TEXT,
  blood_status TEXT,       -- Pureblood | Half-blooded | Non-Magickal-Born | Maladroit | Corrupt-blooded
  species TEXT,             -- Elven-Human | Magickal Human | Human | Kthenosthrope | Half-Breed | Vampire
  dob DATE,                 -- minimum (earliest allowed) is 1944-01-01
  gender TEXT,

  -- ---- Physical Description ----
  height TEXT,               -- free text, e.g. "170cm" or "5'7\""
  eye_colour TEXT,

  -- ---- Magical Description & Miscellaneous ----
  wand_wood TEXT,
  wand_core TEXT,
  wand_length TEXT,
  wand_adaptability TEXT,

  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'declined'
  reviewed_by TEXT,        -- Overseer's Discord username, once reviewed
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A declined character is DELETED rather than kept around with
-- status = 'declined' — it never held a slot on the applicant's profile,
-- and the reason for the decline lives on in inbox_messages instead.
-- 'declined' still appears as a possible status value/decision for
-- clarity in code and in inbox_messages.decision.

CREATE TABLE IF NOT EXISTS inbox_messages (
  id SERIAL PRIMARY KEY,
  user_discord_id TEXT NOT NULL REFERENCES users(discord_id) ON DELETE CASCADE,
  character_name TEXT NOT NULL,   -- snapshot, in case the character is later deleted
  decision TEXT NOT NULL,          -- 'approved' | 'declined'
  message TEXT,                    -- the Overseer's note to the applicant
  reviewed_by TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Future phases (not built yet — cosmetics, pets, purchases) would each
-- get their own table with a user_discord_id column, following this same
-- pattern.
