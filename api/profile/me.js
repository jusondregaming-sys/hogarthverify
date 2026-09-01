// api/profile/me.js
// GET /api/profile/me
// Called by profile.html on load. Upserts the user's latest known
// rank/slots (from their session) and returns their character list.

const { readSession } = require('../discord/_lib');
const { sql, ensureSchema } = require('../_shared/db');

module.exports = async (req, res) => {
  const session = readSession(req);
  if (!session) {
    return res.status(401).json({ error: 'not_verified' });
  }

  try {
    await ensureSchema();

    await sql`
      INSERT INTO users (discord_id, username, rank, slots, avatar)
      VALUES (${session.discordId}, ${session.username}, ${session.rank}, ${session.slots}, ${session.avatar || null})
      ON CONFLICT (discord_id) DO UPDATE
      SET username = EXCLUDED.username,
          rank = EXCLUDED.rank,
          slots = EXCLUDED.slots,
          avatar = EXCLUDED.avatar,
          updated_at = now();
    `;

    const { rows: characters } = await sql`
      SELECT id, name, age, house, bio, created_at
      FROM characters
      WHERE user_discord_id = ${session.discordId}
      ORDER BY created_at ASC;
    `;

    res.status(200).json({
      discordId: session.discordId,
      username: session.username,
      avatar: session.avatar,
      rank: session.rank,
      slots: session.slots,
      slotsUsed: characters.length,
      characters,
    });
  } catch (err) {
    console.error('profile/me error:', err);
    res.status(500).json({ error: 'server_error' });
  }
};
