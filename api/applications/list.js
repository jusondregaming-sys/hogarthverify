// api/applications/list.js
// GET /api/applications/list
// Overseer-only. Returns every pending character application, along with
// the applicant's Discord username/avatar/rank, oldest first (so the
// longest-waiting applicants are reviewed first).

const { readSession } = require('../discord/_lib');
const { sql, ensureSchema } = require('../_shared/db');

module.exports = async (req, res) => {
  const session = readSession(req);
  if (!session) {
    return res.status(401).json({ error: 'not_verified' });
  }
  if (session.rank !== 'Overseer') {
    return res.status(403).json({ error: 'forbidden' });
  }

  try {
    await ensureSchema();

    const { rows: applications } = await sql`
      SELECT
        c.id, c.name, c.age, c.house, c.bio, c.created_at,
        u.discord_id AS applicant_discord_id,
        u.username AS applicant_username,
        u.avatar AS applicant_avatar,
        u.rank AS applicant_rank
      FROM characters c
      JOIN users u ON u.discord_id = c.user_discord_id
      WHERE c.status = 'pending'
      ORDER BY c.created_at ASC;
    `;

    res.status(200).json({ applications });
  } catch (err) {
    console.error('applications/list error:', err);
    res.status(500).json({ error: 'server_error' });
  }
};
