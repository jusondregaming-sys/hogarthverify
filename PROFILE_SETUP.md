# Adding the Profile / Characters database

This is the one manual step needed for the new Profile page to work.
Everything else (tables, upserts) is handled automatically by the code.

## 1. Create the Postgres database

1. Go to your Vercel project → **Storage** tab (top nav, next to Deployments).
2. Click **Create Database** → choose **Postgres** (it's backed by Neon —
   that's normal, Vercel just manages it for you).
3. Name it anything (e.g. `hogarth-db`), pick a region close to your users,
   click **Create**.
4. On the next screen, click **Connect Project** and select your
   `hogarthverify` project. This automatically adds all the
   `POSTGRES_*` environment variables Vercel's `@vercel/postgres` package
   needs — you don't type these in yourself.

## 2. Redeploy

Environment variables (even ones Vercel adds for you) only apply to new
deployments:

1. Go to **Deployments** → **⋯** on the latest one → **Redeploy**.

## 3. That's it — tables are created automatically

The first time anyone hits `/api/profile/me` or `/api/characters/create`,
the code runs `CREATE TABLE IF NOT EXISTS` for `users` and `characters`.
You don't need to run any SQL yourself. `db/schema.sql` in this project is
just a reference copy of that same schema, in case you want to poke around
in Vercel's Postgres query editor (**Storage** → your database → **Query**).

## 4. Test it

1. Go to `https://hogarthverify.vercel.app/profile.html`.
2. If you're not signed in, you'll see a **Sign in with Discord** button —
   click it (same OAuth flow as the Start page).
3. Once signed in, you should see your username, avatar, and rank, an empty
   "no characters yet" state, and a character creation form.
4. Fill it in and click **Create Character** — it should appear in the list
   immediately, and the slot counter (e.g. "1 of 1 character used") should
   update. Try creating more than your rank allows — the form should hide
   itself once you're at the limit, and the server rejects it either way.

## Troubleshooting

**"server_error" when loading the profile page or creating a character**
Check **Deployments → (latest) → Functions → api/profile/me** (or
`api/characters/create`) for the actual error in the logs. The most common
cause is the database not being connected to this project yet — redo step 1.

**Character count doesn't reset / slot limit feels wrong**
The slot count comes from your rank at the time you last verified (stored
in your session cookie), not read live from Discord on every page load. If
you change someone's roles in Discord, they need to click **Verify with
Discord** again on the Start page to pick up the new rank/slot count.
