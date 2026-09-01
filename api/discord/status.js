// api/discord/status.js
// GET /api/discord/status
// Called by start.html on page load to check if the visitor is verified.

const { readSession } = require('./_lib');

module.exports = (req, res) => {
  const session = readSession(req);

  if (!session) {
    return res.status(200).json({ verified: false });
  }

  res.status(200).json({
    verified: true,
    username: session.username,
    rank: session.rank,
    slots: session.slots,
  });
};
