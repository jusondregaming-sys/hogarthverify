// api/characters/delete.js
// POST /api/characters/delete   body: { id }
// Deletes a character, but only if it belongs to the verified user making
// the request — the WHERE clause checks user_discord_id, not just id.
// Works on both pending and approved characters, so this also doubles as
// "withdraw my application" while it's still awaiting review.

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

  const { id } = req.body || {};
  const characterId = Number(id);
  if (!characterId) {
    return res.status(400).json({ error: 'id_required' });
  }

  try {
    await ensureSchema();

    const { rowCount } = await sql`
      DELETE FROM characters
      WHERE id = ${characterId} AND user_discord_id = ${session.discordId};
    `;

    if (rowCount === 0) {
      return res.status(404).json({ error: 'not_found' });
    }

    res.status(200).json({ deleted: true });
  } catch (err) {
    console.error('characters/delete error:', err);
    res.status(500).json({ error: 'server_error' });
  }
};
