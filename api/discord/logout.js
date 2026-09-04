// api/discord/logout.js
// GET /api/discord/logout
// Clears the session cookie and sends the user back to start.html.

const { COOKIE_NAME, clearCookie } = require('./_lib');

const SITE_URL = process.env.SITE_URL || '/';

module.exports = (req, res) => {
  res.setHeader('Set-Cookie', clearCookie(COOKIE_NAME));
  res.writeHead(302, { Location: `${SITE_URL}/start.html` });
  res.end();
};
