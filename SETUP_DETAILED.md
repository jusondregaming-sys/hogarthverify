# Hogarth Discord Verification — Complete Setup Walkthrough

This covers everything from "empty folder" to "live verification working on
your real domain." Follow it in order — later steps depend on earlier ones.

---

## Part 0 — What you're building

Right now your site is pure static files (`index.html`, `lore.html`,
`start.html`, `store.html`, `fonts.css`, `grain.css`) with no server behind
them. You're adding:

- 5 small server-side files (in a folder called `api/discord/`) that run on
  Vercel whenever they're requested — you don't manage a server, Vercel just
  runs them on demand.
- An updated `start.html` that talks to those files.

**Final folder layout** (this is the important part — where everything goes):

```
your-site/                 ← the root of your project/repo
├── index.html              (existing — unchanged)
├── lore.html                (existing — unchanged)
├── store.html                (existing — unchanged)
├── start.html                 (existing — REPLACE with the new version)
├── fonts.css                   (existing — unchanged)
├── grain.css                    (existing — unchanged)
├── package.json                  (NEW — from me)
├── .env.example                    (NEW — from me, for reference only)
└── api/
    └── discord/
        ├── _lib.js                  (NEW — from me)
        ├── login.js                  (NEW — from me)
        ├── callback.js                 (NEW — from me)
        ├── status.js                    (NEW — from me)
        └── logout.js                     (NEW — from me)
```

The `api/` folder is special — Vercel automatically treats every `.js` file
inside it as a live endpoint. `api/discord/login.js` becomes the URL
`/api/discord/login`, and so on. `_lib.js` is the one exception (its name
starts with `_`), Vercel skips it — it's just a shared helper the other four
files import.

You do **not** need `node_modules` or to run `npm install` for anything to
work on Vercel — Vercel installs your one dependency (`jsonwebtoken`)
automatically during deployment because it's listed in `package.json`.

---

## Part 1 — Assemble the project folder

1. Find the folder on your computer where `index.html`, `lore.html`, etc.
   currently live.
2. Download the files I gave you (`start.html`, `package.json`,
   `.env.example`, and the `api/discord/` folder with its 5 files).
3. Copy them into that same folder, matching the layout above exactly:
   - `start.html` → **overwrite** your existing `start.html`
   - `package.json` → goes in the root, next to `index.html`
   - `.env.example` → goes in the root, next to `index.html`
   - The whole `api` folder (with `discord` inside it, with its 5 files
     inside that) → goes in the root, next to `index.html`
4. Double check: from your project root, you should be able to see
   `api/discord/login.js` — if `api` ended up nested inside another folder,
   move it up so it's a direct sibling of `index.html`.

---

## Part 2 — Put the project on GitHub

Vercel deploys from a GitHub (or GitLab/Bitbucket) repository, so if your
site isn't on GitHub yet, do this first.

1. Go to https://github.com and sign in (or create a free account).
2. Click the **+** icon top-right → **New repository**.
3. Name it something like `hogarth-site`. Keep it **Private** if you'd
   rather not make the source public (this doesn't affect anything — private
   repos deploy to Vercel exactly the same way). Click **Create repository**.
4. On the next page, follow GitHub's own instructions under
   **"…or push an existing repository from the command line"** — it'll look
   like this, run from inside your project folder in a terminal:

   ```
   git init
   git add .
   git commit -m "Initial site with Discord verification"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/hogarth-site.git
   git push -u origin main
   ```

   If you've never used git/terminal before and this feels like a lot:
   GitHub Desktop (https://desktop.github.com) does the same thing with
   buttons instead of commands — install it, "Add existing repository" your
   folder, then "Publish repository."

5. Confirm on github.com that your repo now shows all your files, including
   the `api` folder.

---

## Part 3 — Create the Discord Application

1. Go to https://discord.com/developers/applications and log in with the
   Discord account that manages your server.
2. Click **New Application** (top right).
3. Name it (e.g. "Hogarth Verify") and click **Create**.
4. You'll land on the **General Information** page. Leave this open — you'll
   come back here.

### 3a. Get your Client ID and Client Secret

1. In the left sidebar, click **OAuth2** → **General**.
2. Under **Client information**, copy the **Client ID** — paste it somewhere
   safe (a notes file), you'll need it soon.
3. Click **Reset Secret** (or **Copy** if a secret is already shown) under
   **Client Secret**, confirm, and copy the value immediately — Discord only
   shows it once. Save it in the same notes file.

   ⚠️ Treat this secret like a password. Never put it in your HTML/JS files
   or commit it to GitHub — it only ever goes into Vercel's environment
   variables (Part 6).

### 3b. Add the redirect URL

Still on the **OAuth2 → General** page:

1. Scroll to **Redirects**, click **Add Redirect**.
2. For now, type a placeholder — you'll fix this in Part 7 once you know
   your real Vercel URL:
   `https://placeholder.vercel.app/api/discord/callback`
3. Click **Save Changes** at the bottom of the page.

### 3c. Add a bot to the application

You don't need the bot to do anything active — Discord requires an
application's bot to be present in a server before that application can
read member roles via OAuth.

1. In the left sidebar, click **Bot**.
2. Click **Add Bot** → confirm.
3. Under **Privileged Gateway Intents**, you can leave everything off — not
   needed for this.

### 3d. Invite the bot to your server

1. In the left sidebar, click **OAuth2** → **URL Generator**.
2. Under **Scopes**, check **bot**.
3. Under **Bot Permissions**, you don't need to check anything (0
   permissions is fine) — or check **View Channels** if you'd like it to
   show up in your member list normally.
4. Scroll down, copy the **Generated URL**.
5. Paste that URL into a new browser tab, choose your Hogarth server from
   the dropdown, click **Continue** → **Authorize**.
6. Confirm the bot now appears in your server's member list (it'll show as
   offline, which is fine — it doesn't need to run anything).

---

## Part 4 — Get your Guild ID and Role IDs

1. In the Discord app (not the developer portal): **User Settings** (gear
   icon near your name) → **Advanced** → turn on **Developer Mode**.
2. Close settings. Right-click your server's icon in the left sidebar →
   **Copy Server ID**. Save this — it's your `DISCORD_GUILD_ID`.
3. Go to **Server Settings** → **Roles**.
4. For each rank you want recognized (e.g. VIP+, VIP, Early Supporter),
   right-click the role in the list → **Copy Role ID**. Save each one with a
   label so you don't mix them up.

---

## Part 5 — Fill in your role IDs in the code

1. Open `api/discord/_lib.js` in a text editor (VS Code, Notepad++,
   anything).
2. Find this block near the top:

   ```js
   const RANK_ROLES = [
     { roleId: 'REPLACE_WITH_VIP_PLUS_ROLE_ID', rank: 'VIP+' },
     { roleId: 'REPLACE_WITH_VIP_ROLE_ID', rank: 'VIP' },
     { roleId: 'REPLACE_WITH_EARLY_SUPPORTER_ROLE_ID', rank: 'Early Supporter' },
   ];
   ```

3. Replace each placeholder string with the real role ID you copied in
   Part 4, keeping the highest rank first — the code checks top to bottom
   and stops at the first match. Add or remove lines if you have more or
   fewer ranks. Example:

   ```js
   const RANK_ROLES = [
     { roleId: '1123456789012345678', rank: 'VIP+' },
     { roleId: '1234567890123456789', rank: 'VIP' },
     { roleId: '1345678901234567890', rank: 'Early Supporter' },
   ];
   ```

4. Anyone verified but without any of these roles gets whatever
   `DEFAULT_RANK` is set to (currently `'Member'`), a few lines below — edit
   that string if you want different wording.
5. Save the file, then commit and push the change to GitHub:

   ```
   git add api/discord/_lib.js
   git commit -m "Add real Discord role IDs"
   git push
   ```

---

## Part 6 — Create the Vercel project

1. Go to https://vercel.com and sign up (the free "Hobby" plan is enough for
   this) — easiest is to click **Continue with GitHub** so it's linked
   automatically.
2. On your Vercel dashboard, click **Add New…** → **Project**.
3. Under **Import Git Repository**, find `hogarth-site` (or whatever you
   named it) and click **Import**. If you don't see it, click **Adjust GitHub
   App Permissions** and grant Vercel access to that repo.
4. On the configuration screen:
   - **Framework Preset**: leave as **Other** (it's not a framework, just
     static files + functions — Vercel handles this fine).
   - **Root Directory**: leave as `./` (unless your files are inside a
     subfolder, in which case point it there).
   - Leave **Build Command** and **Output Directory** blank/default.
5. Before clicking Deploy, expand **Environment Variables** and add these
   one at a time (Name, then Value, then **Add**):

   | Name | Value |
   |---|---|
   | `DISCORD_CLIENT_ID` | the Client ID from Part 3a |
   | `DISCORD_CLIENT_SECRET` | the Client Secret from Part 3a |
   | `DISCORD_GUILD_ID` | the Server ID from Part 4 |
   | `DISCORD_REDIRECT_URI` | `https://placeholder.vercel.app/api/discord/callback` (fix in Part 7) |
   | `HOGARTH_SESSION_SECRET` | any long random string — see below |
   | `SITE_URL` | `https://placeholder.vercel.app` (fix in Part 7) |

   To generate `HOGARTH_SESSION_SECRET`: if you have a terminal, run
   `openssl rand -hex 32` and paste the output. If not, any long
   unpredictable string (30+ random characters, letters+numbers) works —
   just don't reuse a real password.

6. Click **Deploy**. Vercel will build and give you a live URL like
   `https://hogarth-site-abc123.vercel.app` within a minute or two.

---

## Part 7 — Wire the real URL back into both places

Now that you have your real Vercel URL, two placeholders need fixing.

### 7a. Update Vercel's environment variables

1. In your Vercel project, go to **Settings** → **Environment Variables**.
2. Edit `DISCORD_REDIRECT_URI` → set it to
   `https://YOUR-REAL-URL.vercel.app/api/discord/callback`
3. Edit `SITE_URL` → set it to `https://YOUR-REAL-URL.vercel.app` (no
   trailing slash).
4. Go to the **Deployments** tab, click the **⋯** menu on the latest
   deployment → **Redeploy** (env var changes need a redeploy to take
   effect).

### 7b. Update the Discord redirect

1. Back in the Discord Developer Portal → your app → **OAuth2** → **General**.
2. Under **Redirects**, edit the placeholder to match exactly:
   `https://YOUR-REAL-URL.vercel.app/api/discord/callback`
3. Click **Save Changes**.

These two values must match **exactly** (same protocol, same domain, same
path) or Discord will reject the login with a redirect URI mismatch error.

---

## Part 8 — Test it

1. Visit `https://YOUR-REAL-URL.vercel.app/start.html`.
2. Click **Verify with Discord**. You should be sent to Discord's consent
   screen asking for permission to view your username and server roles.
3. Approve it. You should land back on `start.html` and see:
   - "Verified as `<your Discord username>`" under Verify Discord
   - "Rank confirmed: `<your rank>`" under Rank Check
   - The character registration form no longer greyed out
4. Optional: test the failure path by verifying with a Discord account
   that's *not* in your server — you should see "Discord verified, but
   you're not in the Hogarth server" and the form should stay locked.

If something doesn't work, check **Troubleshooting** below before re-reading
everything — it's almost always one of those four causes.

---

## Part 9 — Optional: point your real domain at it

If you have (or want) a custom domain instead of the `.vercel.app` one:

1. In Vercel, go to your project → **Settings** → **Domains** → add your
   domain and follow Vercel's DNS instructions (usually one CNAME or A
   record at your domain registrar).
2. Once it's live, repeat Part 7 with your custom domain instead of the
   `.vercel.app` one — update `DISCORD_REDIRECT_URI` and `SITE_URL` in
   Vercel, update the redirect in Discord, redeploy.

---

## Troubleshooting

**"Invalid OAuth2 redirect_uri" on Discord's consent screen**
The redirect URL in Discord's app settings doesn't exactly match
`DISCORD_REDIRECT_URI` in Vercel. Check for `http` vs `https`, trailing
slashes, and typos — they must be character-for-character identical.

**Redirected back with `?verify=not_member`, but you ARE in the server**
Your bot isn't actually in the server (recheck Part 3d), or
`DISCORD_GUILD_ID` doesn't match the server you invited it to (recheck
Part 4, step 2).

**Redirected back with `?verify=error`**
Check the function logs: Vercel dashboard → your project → **Deployments**
→ click the latest one → **Functions** tab → click
`api/discord/callback` → look at the log output, it'll show the real error
(usually a missing/mistyped environment variable).

**Rank shows as "Member" for everyone, even people with special roles**
The role IDs in `api/discord/_lib.js` don't match your server's actual role
IDs, or weren't saved/pushed/redeployed after editing. Recheck Part 5 and
make sure you pushed to GitHub (Vercel redeploys automatically on every
push to your main branch).

**Changes to code don't show up on the live site**
Vercel only redeploys when you push to GitHub (for code changes) or when
you manually redeploy (for environment-variable-only changes). Confirm
`git push` succeeded and check the **Deployments** tab for a new build.

**Locked out of your own test after tweaking things**
Session cookies last 2 hours. Visit
`https://YOUR-REAL-URL.vercel.app/api/discord/logout` to clear yours and
start fresh, or just wait it out.
