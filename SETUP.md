# Hogarth Discord Verification — Setup Guide

This adds real Discord OAuth verification + rank-checking to `start.html`,
backed by four small serverless functions in `api/discord/`.

## 1. Create the Discord application

1. Go to https://discord.com/developers/applications → **New Application**.
   Name it something like "Hogarth Institute Verify".
2. Under **OAuth2 → General**, copy the **Client ID** and **Client Secret**.
3. Still under **OAuth2 → General**, add a redirect:
   `https://YOUR-DOMAIN/api/discord/callback`
   (use your actual Vercel domain once you have it — see step 4).
4. Under **Bot**, click **Add Bot**. You don't need any special bot
   permissions or code running — the bot just needs to *exist* and be a
   member of your server, because Discord requires that for the
   `guilds.members.read` scope to return member data.
5. Under **OAuth2 → URL Generator**, tick scope `bot`, leave permissions at
   0 (or add "View Channels" if you want it visible in your member list),
   and use the generated URL to invite the bot to your Hogarth server.

## 2. Get your Guild ID and Role IDs

1. In Discord, enable Developer Mode: **User Settings → Advanced → Developer Mode**.
2. Right-click your server icon → **Copy Server ID** → this is `DISCORD_GUILD_ID`.
3. Right-click each rank role in **Server Settings → Roles** → **Copy Role ID**.
4. Open `api/discord/_lib.js` and fill in `RANK_ROLES` with your real role
   IDs, highest rank first:

   ```js
   const RANK_ROLES = [
     { roleId: '111111111111111111', rank: 'VIP+' },
     { roleId: '222222222222222222', rank: 'VIP' },
     { roleId: '333333333333333333', rank: 'Early Supporter' },
   ];
   ```

   Anyone verified but without one of these roles gets `DEFAULT_RANK`
   ("Member") — change that in the same file if you'd like a different label.

## 3. Deploy to Vercel

1. Push this project (or merge it into your existing site repo) to GitHub.
2. Go to https://vercel.com → **New Project** → import the repo.
   Vercel auto-detects the `api/` folder as serverless functions and serves
   `start.html`, `index.html`, etc. as static files — no build config needed.
3. In **Project Settings → Environment Variables**, add everything from
   `.env.example`:
   - `DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_SECRET`
   - `DISCORD_GUILD_ID`
   - `DISCORD_REDIRECT_URI` → `https://YOUR-VERCEL-DOMAIN/api/discord/callback`
   - `HOGARTH_SESSION_SECRET` → generate with `openssl rand -hex 32`
   - `SITE_URL` → `https://YOUR-VERCEL-DOMAIN`
4. Deploy. Then go back to the Discord Developer Portal and make sure the
   redirect URI you added in step 1.3 exactly matches your real
   `DISCORD_REDIRECT_URI`.
5. Once you have a custom domain, update `DISCORD_REDIRECT_URI` and
   `SITE_URL` to match it, and add the new redirect URI in Discord too.

## 4. Test it

1. Visit `/start.html`, click **Verify with Discord**.
2. Approve the app. You should land back on `start.html` with:
   - "Verified as `<your username>`" under Verify Discord
   - "Rank confirmed: `<your rank>`" under Rank Check
   - The character registration form unlocked
3. Try it with an account that is *not* in your server — you should see
   "Discord verified, but you're not in the Hogarth server" and the form
   should stay locked.

## How it works, briefly

- `login.js` sends the browser to Discord's consent screen with a random
  `state` value stored in a short-lived cookie (CSRF protection).
- `callback.js` is where Discord redirects back. It swaps the `code` for an
  access token (using your client secret — this step can only happen
  server-side), fetches the user's identity and their member/roles info in
  *your* guild specifically, decides their rank, and stores it all in a
  signed, httpOnly session cookie. The Discord access token itself is never
  given to the browser or stored anywhere.
- `status.js` is what `start.html` calls on every page load to ask "is this
  visitor verified, and what's their rank?" — it just reads and verifies the
  session cookie, no Discord API calls needed after the initial verification.
- `logout.js` clears the session, if you want to add a "sign out" link later.

## Notes / things to decide later

- Session cookies expire after 2 hours (`expiresIn: '2h'` in `_lib.js`) —
  after that, visitors need to re-verify. Adjust to taste.
- The actual character-submission form is still a placeholder per your
  original note — this only handles the verify/unlock gate in front of it.
- If someone's Discord roles change, they won't see the update until they
  re-verify (their session was signed at verification time). If you want
  live role syncing on every page load, `status.js` could re-check Discord
  instead of trusting the cookie — this trades a snappier UI for extra API
  calls and rate-limit exposure, so I left it as the simpler cookie-trust
  version for now.
