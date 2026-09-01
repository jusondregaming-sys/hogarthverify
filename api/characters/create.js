// api/characters/create.js
// POST /api/characters/create   body: { name, age, house, bio }
// Creates a character for the verified user, if they haven't used all
// their slots yet. Slot count comes from the session (set at Discord
// verification time), never from the client.

const { readSession } = require('../discord/_lib');
const { sql, ensureSchema } = require('../_shared/db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const session = readSession(req);
  if (!session) {
    return res.status(401).json({ error: 'not_verified' });
  }

  const { name, age, house, bio } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'name_required' });
  }

  try {
    await ensureSchema();

    const { rows: countRows } = await sql`
      SELECT COUNT(*)::int AS count
      FROM characters
      WHERE user_discord_id = ${session.discordId};
    `;
    const used = countRows[0].count;

    if (used >= session.slots) {
      return res.status(403).json({ error: 'slot_limit_reached', slots: session.slots, used });
    }

    const { rows } = await sql`
      INSERT INTO characters (user_discord_id, name, age, house, bio)
      VALUES (
        ${session.discordId},
        ${String(name).trim()},
        ${age ? String(age).trim() : null},
        ${house ? String(house).trim() : null},
        ${bio ? String(bio).trim() : null}
      )
      RETURNING id, name, age, house, bio, created_at;
    `;

    res.status(201).json({ character: rows[0] });
  } catch (err) {
    console.error('characters/create error:', err);
    res.status(500).json({ error: 'server_error' });
  }
};
