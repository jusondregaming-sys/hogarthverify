// api/discord/callback.js
// GET /api/discord/callback?code=...&state=...
// Discord redirects here after the user approves the app.

const {
  STATE_COOKIE,
  NEXT_COOKIE,
  COOKIE_NAME,
  parseCookies,
  serializeCookie,
  signSession,
  rankFromRoleIds,
} = require('./_lib');

const SITE_URL = process.env.SITE_URL || '/'; // e.g. https://yoursite.vercel.app

module.exports = async (req, res) => {
  const { code, state, error } = req.query;
  const cookies = parseCookies(req);

  // Where to send the user back to. Falls back to profile.html if the
  // cookie is missing/expired/tampered with.
  const next = cookies[NEXT_COOKIE] && /^[a-zA-Z0-9_-]+\.html$/.test(cookies[NEXT_COOKIE])
    ? cookies[NEXT_COOKIE]
    : 'profile.html';

  const clearOauthCookies = [
    serializeCookie(STATE_COOKIE, '', { maxAge: 0 }),
    serializeCookie(NEXT_COOKIE, '', { maxAge: 0 }),
  ];

  if (error) {
    res.setHeader('Set-Cookie', clearOauthCookies);
    res.writeHead(302, { Location: `${SITE_URL}/${next}?verify=denied` });
    return res.end();
  }

  if (!code || !state || state !== cookies[STATE_COOKIE]) {
    res.setHeader('Set-Cookie', clearOauthCookies);
    res.writeHead(302, { Location: `${SITE_URL}/${next}?verify=error` });
    return res.end();
  }

  try {
    // 1. Exchange the code for an access token.
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) throw new Error(`token exchange failed: ${tokenRes.status}`);
    const tokenData = await tokenRes.json();

    // 2. Get basic user info.
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!userRes.ok) throw new Error(`user fetch failed: ${userRes.status}`);
    const user = await userRes.json();

    // 3. Get the user's member info (roles) in YOUR guild specifically.
    //    This requires your bot to also be a member of that guild.
    const memberRes = await fetch(
      `https://discord.com/api/users/@me/guilds/${process.env.DISCORD_GUILD_ID}/member`,
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );

    if (memberRes.status === 404) {
      // Token exchange succeeded but the user isn't in the server.
      res.setHeader('Set-Cookie', clearOauthCookies);
      res.writeHead(302, { Location: `${SITE_URL}/${next}?verify=not_member` });
      return res.end();
    }
    if (!memberRes.ok) throw new Error(`member fetch failed: ${memberRes.status}`);
    const member = await memberRes.json();

    const { rank, slots } = rankFromRoleIds(member.roles || []);

    // 4. Store a signed session so status.js can trust this later without
    //    re-hitting Discord on every page load.
    const session = signSession({
      discordId: user.id,
      username: `${user.username}`,
      avatar: user.avatar,
      rank,
      slots,
      verifiedAt: Date.now(),
    });

    res.setHeader('Set-Cookie', [
      serializeCookie(COOKIE_NAME, session, { maxAge: 60 * 60 * 2 }),
      ...clearOauthCookies,
    ]);

    res.writeHead(302, { Location: `${SITE_URL}/${next}?verify=success` });
    res.end();
  } catch (err) {
    console.error('Discord OAuth callback error:', err);
    res.setHeader('Set-Cookie', clearOauthCookies);
    res.writeHead(302, { Location: `${SITE_URL}/${next}?verify=error` });
    res.end();
  }
};
