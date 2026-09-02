// api/inbox/list.js
// GET /api/inbox/list
// Called by profile.html when the Inbox tab is opened. Returns the
// verified user's application-decision messages, newest first, and marks
// them all as read (the unread count on the tab is what api/profile/me
// reports).

const { readSession } = require('../discord/_lib');
const { sql, ensureSchema } = require('../_shared/db');

module.exports = async (req, res) => {
  const session = readSession(req);
  if (!session) {
    return res.status(401).json({ error: 'not_verified' });
  }

  try {
    await ensureSchema();

    const { rows: messages } = await sql`
      SELECT id, character_name, decision, message, reviewed_by, is_read, created_at
      FROM inbox_messages
      WHERE user_discord_id = ${session.discordId}
      ORDER BY created_at DESC;
    `;

    await sql`
      UPDATE inbox_messages
      SET is_read = true
      WHERE user_discord_id = ${session.discordId} AND is_read = false;
    `;

    res.status(200).json({ messages });
  } catch (err) {
    console.error('inbox/list error:', err);
    res.status(500).json({ error: 'server_error' });
  }
};
