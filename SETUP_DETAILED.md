# Hogarth Discord Verification — Complete Setup Walkthrough

This covers everything from "empty folder" to "live verification working on
your real domain." Follow it in order — later steps depend on earlier ones.

---

## Part 0 — What you're building

Right now your site is pure static files (`index.html`, `lore.html`,
`start.html`, `store.html`, `fonts.css`, `grain.css`) with no server behind
them. You're adding:

- Several small server-side files (in a folder called `api/`) that run on
  Vercel whenever they're requested — you don't manage a server, Vercel just
  runs them on demand.
- `profile.html` — a page backed by those server-side files and a database.

**Folder layout** — see the file tree in the chat message alongside this zip
for the exact, current placement of every file.

The `api/` folder is special — Vercel automatically treats every `.js` file
inside it as a live endpoint, except files/folders starting with `_`
(those are shared helpers, skipped by Vercel's router).

You do **not** need `node_modules` or to run `npm install` for anything to
work on Vercel — Vercel installs dependencies automatically during
deployment because they're listed in `package.json`.

---

## Part 1 — Assemble the project folder

Copy every file from this zip into your existing project folder, matching
the same relative paths (overwrite files that already exist, add the ones
that are new). See the folder tree sent in chat for the exact layout.

---

## Part 2 — Put the project on GitHub

Vercel deploys from a GitHub (or GitLab/Bitbucket) repository.

1. Go to https://github.com and sign in (or create a free account).
2. Click the **+** icon top-right → **New repository**. Name it, choose
   Private or Public, click **Create repository**.
3. From inside your project folder in a terminal:
   ```
   git init
   git add .
   git commit -m "Add Discord verification and profile system"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
   git push -u origin main
   ```
   (GitHub Desktop works too if you'd rather avoid the terminal.)

---

## Part 3 — Discord Developer Portal

1. https://discord.com/developers/applications → **New Application**.
2. **OAuth2 → General**: copy **Client ID** and **Client Secret**. Add a
   redirect: `https://YOUR-DOMAIN/api/discord/callback`.
3. **Bot** tab → **Add Bot** (no special permissions needed — it just needs
   to exist and be a member of your server).
4. **OAuth2 → URL Generator** → scope `bot` → copy the generated URL, open
   it, invite the bot to your Hogarth server.

## Part 4 — Guild ID and Role IDs

1. Discord app → **User Settings → Advanced → Developer Mode** (turn on).
2. Right-click your server icon → **Copy Server ID** → this is
   `DISCORD_GUILD_ID`.
3. **Server Settings → Roles** → right-click each rank role → **Copy Role ID**.
4. Already filled in for you in `api/discord/_lib.js` (VIP, VIP+, Early
   Supporter) — edit there if roles change.

## Part 5 — Vercel

1. https://vercel.com → sign up with GitHub → **Add New… → Project** →
   import your repo.
2. Framework Preset: **Other**. Leave build/output settings blank.
3. Add Environment Variables before deploying:
   - `DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_SECRET`
   - `DISCORD_GUILD_ID`
   - `DISCORD_REDIRECT_URI` → `https://YOUR-DOMAIN/api/discord/callback`
   - `HOGARTH_SESSION_SECRET` → any long random string (`openssl rand -hex 32`)
   - `SITE_URL` → `https://YOUR-DOMAIN`
4. Deploy. Use your **Domains** tab URL (not the hashed per-deployment URL)
   as `YOUR-DOMAIN` everywhere above — update the env vars and the Discord
   redirect to match once you know it, then redeploy.

## Part 6 — Database (for Profile / Characters)

See `PROFILE_SETUP.md` in this zip — one extra step: connect a free Vercel
Postgres database to the project from the **Storage** tab, then redeploy.
Tables are created automatically the first time the API runs.

---

## Testing

1. `https://YOUR-DOMAIN/profile.html` → **Sign in with Discord** → approve
   → you should see your username, avatar, rank, and an empty character
   list with a create form.
2. Create a character, confirm it appears and the slot counter updates.
3. Delete it, confirm it disappears and the slot frees up.
4. Try exceeding your rank's slot limit — the form should hide itself.

## Troubleshooting

**"Invalid OAuth2 redirect_uri"** — the redirect saved in Discord's OAuth2
settings and `DISCORD_REDIRECT_URI` in Vercel must match character-for-
character. Remember to redeploy after editing env vars.

**"server_error" on the profile page** — check Vercel → Deployments →
latest → Functions → the relevant `api/...` file → logs. Usually means the
database isn't connected yet (Part 6) or an env var is missing/mistyped.

**Rank shows wrong / character limit seems off** — the rank is set at the
moment someone verifies via Discord and cached in their session cookie for
2 hours. If you change their roles in Discord, they need to re-verify (via
`/api/discord/login`) to pick up the change.
