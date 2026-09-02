// api/applications/review.js
// POST /api/applications/review   body: { characterId, decision, message }
// Overseer-only. Approves or declines a pending character application and
// always drops a note in the applicant's inbox.
//
// decision: 'approve' | 'decline'
//   approve -> character.status becomes 'approved' and it stays on the
//              applicant's profile with an Approved mark.
//   decline -> the character row is deleted (a declined application never
//              held a permanent slot) — the applicant only sees the
//              inbox message explaining why.
//
// message is optional either way, but strongly encouraged for declines.

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
  if (session.rank !== 'Overseer') {
    return res.status(403).json({ error: 'forbidden' });
  }

  const { characterId, decision, message } = req.body || {};
  const id = Number(characterId);
  if (!id) {
    return res.status(400).json({ error: 'character_id_required' });
  }
  if (decision !== 'approve' && decision !== 'decline') {
    return res.status(400).json({ error: 'invalid_decision' });
  }

  try {
    await ensureSchema();

    const { rows: charRows } = await sql`
      SELECT id, user_discord_id, name, status
      FROM characters
      WHERE id = ${id};
    `;
    const character = charRows[0];

    if (!character) {
      return res.status(404).json({ error: 'not_found' });
    }
    if (character.status !== 'pending') {
      // Someone else already reviewed this one (or it was withdrawn) —
      // avoid double-processing / double-messaging the applicant.
      return res.status(409).json({ error: 'already_reviewed' });
    }

    const trimmedMessage = message ? String(message).trim() : '';
    const outcome = decision === 'approve' ? 'approved' : 'declined';

    if (decision === 'approve') {
      await sql`
        UPDATE characters
        SET status = 'approved', reviewed_by = ${session.username}, reviewed_at = now()
        WHERE id = ${id};
      `;
    } else {
      await sql`DELETE FROM characters WHERE id = ${id};`;
    }

    await sql`
      INSERT INTO inbox_messages (user_discord_id, character_name, decision, message, reviewed_by)
      VALUES (
        ${character.user_discord_id},
        ${character.name},
        ${outcome},
        ${trimmedMessage || null},
        ${session.username}
      );
    `;

    res.status(200).json({ decision: outcome });
  } catch (err) {
    console.error('applications/review error:', err);
    res.status(500).json({ error: 'server_error' });
  }
};
