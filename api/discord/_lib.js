// api/discord/_lib.js
// Shared helpers used by login.js, callback.js, status.js, logout.js.
// This file is not itself an endpoint (it doesn't export a `handler`),
// Vercel will not deploy it as a route.

const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'hogarth_session';
const STATE_COOKIE = 'hogarth_oauth_state';

// ---------------------------------------------------------------------
// Map your Discord role IDs to a rank name AND how many characters that
// rank is allowed to register. Highest rank first — the first match wins.
// Anyone with NO matching role still falls through to DEFAULT_RANK below,
// which is set to allow 1 character.
// ---------------------------------------------------------------------
const RANK_ROLES = [
  { roleId: '1544453130765344828', rank: 'VIP+', slots: 3 },
  { roleId: '1544453072380624977', rank: 'VIP', slots: 2 },
  { roleId: '1544453257496231946', rank: 'Early Supporter', slots: 1 },
];

// Used when a verified member has none of the roles above.
// slots: 1 means they're still allowed to register one character.
const DEFAULT_RANK = { rank: 'Member', slots: 1 };

function rankFromRoleIds(roleIds) {
  for (const entry of RANK_ROLES) {
    if (roleIds.includes(entry.roleId)) return { rank: entry.rank, slots: entry.slots };
  }
  return DEFAULT_RANK;
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(
    header.split(';').filter(Boolean).map((pair) => {
      const idx = pair.indexOf('=');
      const key = decodeURIComponent(pair.slice(0, idx).trim());
      const val = decodeURIComponent(pair.slice(idx + 1).trim());
      return [key, val];
    })
  );
}

function serializeCookie(name, value, opts = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${opts.path || '/'}`);
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
  parts.push('HttpOnly');
  parts.push(`SameSite=${opts.sameSite || 'Lax'}`);
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

function clearCookie(name) {
  return serializeCookie(name, '', { maxAge: 0 });
}

function signSession(payload) {
  return jwt.sign(payload, process.env.HOGARTH_SESSION_SECRET, { expiresIn: '2h' });
}

function readSession(req) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.HOGARTH_SESSION_SECRET);
  } catch {
    return null;
  }
}

module.exports = {
  COOKIE_NAME,
  STATE_COOKIE,
  rankFromRoleIds,
  parseCookies,
  serializeCookie,
  clearCookie,
  signSession,
  readSession,
};
