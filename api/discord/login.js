// api/discord/login.js
// GET /api/discord/login
// Redirects the browser to Discord's OAuth consent screen.

const crypto = require('crypto');
const { STATE_COOKIE, serializeCookie } = require('./_lib');

module.exports = (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');

  res.setHeader('Set-Cookie', serializeCookie(STATE_COOKIE, state, { maxAge: 600 }));

  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: process.env.DISCORD_REDIRECT_URI, // e.g. https://yoursite.vercel.app/api/discord/callback
    response_type: 'code',
    scope: 'identify guilds.members.read',
    state,
    prompt: 'consent',
  });

  res.writeHead(302, { Location: `https://discord.com/oauth2/authorize?${params.toString()}` });
  res.end();
};
