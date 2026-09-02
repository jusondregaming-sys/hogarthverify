// api/characters/create.js
// POST /api/characters/create
// body: {
//   surname, givenNames, bloodStatus, species, dob, gender,
//   height, eyeColour,
//   wandWood, wandCore, wandLength, wandAdaptability,
//   bio (optional)
// }
//
// Creates a character for the verified user, if they haven't used all
// their slots yet. Slot count comes from the session (set at Discord
// verification time), never from the client.
//
// New characters always start as status = 'pending' — they don't show up
// in api/applications/list until reviewed, and they still count against
// the applicant's slot usage so people can't queue up unlimited pending
// applications.

const { readSession } = require('../discord/_lib');
const { sql, ensureSchema } = require('../_shared/db');

const BLOOD_STATUSES = ['Pureblood', 'Half-blooded', 'Non-Magickal-Born', 'Maladroit', 'Corrupt-blooded'];

// Elves are lore-only / unplayable, so they're deliberately excluded here
// even though they're described on the form's info panel.
const SPECIES = ['Elven-Human', 'Magickal Human', 'Human', 'Kthenosthrope', 'Half-Breed', 'Vampire'];

const WOOD_TYPES = [
  'Ash', 'Maple', 'Birch', 'Elder', 'Oak', 'Willow', 'Bloodwood', 'Rosewood', 'Mahogany', 'Cherry', 'Walnut', 'Ebony', // hardwoods
  'Pine', 'Sequoia', 'Yew', 'Cedar', 'Spruce', // softwoods
];

const CORE_TYPES = [
  'Unicorn Hair', 'Pheonix Feather', 'Dragon Scale', 'Matagot Whisker', 'Cù-Sìth Fur', // common
  'Basilisk Fang', 'Griffin Feather', 'Wyvern Spike', // rare/restricted — flagged for Overseer review below
];

// Restricted cores aren't blocked outright (an Overseer may still want to
// approve one for a professor/combat-staff character), but every
// application already goes through manual review, so we just make sure
// the value is one of the real options and let the Overseer take the
// restriction into account when they approve/decline.
const RESTRICTED_CORES = ['Basilisk Fang', 'Griffin Feather', 'Wyvern Spike'];

const WAND_LENGTHS = [
  '10"', '10 1/4"', '10 1/2"', '10 3/4"',
  '11"', '11 1/4"', '11 1/2"', '11 3/4"',
  '12"', '12 1/4"', '12 1/2"', '12 3/4"',
  '13"', '13 1/4"', '13 1/2"', '13 3/4"',
  '14"', '14 1/4"', '14 1/2"', '14 3/4"',
  '15"',
];

const ADAPTABILITIES = ['Supple', 'Bendy', 'Amenable', 'Finicky', 'Obstinate'];

const EARLIEST_DOB = new Date('1944-01-01T00:00:00Z');

function clean(value) {
  return value ? String(value).trim() : '';
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const session = readSession(req);
  if (!session) {
    return res.status(401).json({ error: 'not_verified' });
  }

  const body = req.body || {};
  const surname = clean(body.surname);
  const givenNames = clean(body.givenNames);
  const bloodStatus = clean(body.bloodStatus);
  const species = clean(body.species);
  const dobRaw = clean(body.dob);
  const gender = clean(body.gender);
  const height = clean(body.height);
  const eyeColour = clean(body.eyeColour);
  const wandWood = clean(body.wandWood);
  const wandCore = clean(body.wandCore);
  const wandLength = clean(body.wandLength);
  const wandAdaptability = clean(body.wandAdaptability);
  const bio = clean(body.bio);

  // ---- required-field validation ----
  if (!surname) return res.status(400).json({ error: 'surname_required' });
  if (!givenNames) return res.status(400).json({ error: 'given_names_required' });
  if (!BLOOD_STATUSES.includes(bloodStatus)) return res.status(400).json({ error: 'invalid_blood_status' });
  if (!SPECIES.includes(species)) return res.status(400).json({ error: 'invalid_species' });
  if (!gender) return res.status(400).json({ error: 'gender_required' });
  if (!height) return res.status(400).json({ error: 'height_required' });
  if (!eyeColour) return res.status(400).json({ error: 'eye_colour_required' });
  if (!wandWood || !WOOD_TYPES.includes(wandWood)) return res.status(400).json({ error: 'invalid_wand_wood' });
  if (!wandCore || !CORE_TYPES.includes(wandCore)) return res.status(400).json({ error: 'invalid_wand_core' });
  if (!wandLength || !WAND_LENGTHS.includes(wandLength)) return res.status(400).json({ error: 'invalid_wand_length' });
  if (!wandAdaptability || !ADAPTABILITIES.includes(wandAdaptability)) return res.status(400).json({ error: 'invalid_wand_adaptability' });

  // dob comes in as YYYY-MM-DD from <input type="date">
  const dobDate = dobRaw ? new Date(`${dobRaw}T00:00:00Z`) : null;
  if (!dobDate || Number.isNaN(dobDate.getTime())) {
    return res.status(400).json({ error: 'dob_required' });
  }
  if (dobDate < EARLIEST_DOB) {
    return res.status(400).json({ error: 'dob_too_early' });
  }
  if (dobDate > new Date()) {
    return res.status(400).json({ error: 'dob_in_future' });
  }

  const name = `${givenNames} ${surname}`.trim();

  try {
    await ensureSchema();

    const { rows: countRows } = await sql`
      SELECT COUNT(*)::int AS count
      FROM characters
      WHERE user_discord_id = ${session.discordId};
    `;
    const used = countRows[0].count;

    if (session.slots !== null && used >= session.slots) {
      return res.status(403).json({ error: 'slot_limit_reached', slots: session.slots, used });
    }

    const { rows } = await sql`
      INSERT INTO characters (
        user_discord_id, name, surname, given_names, blood_status, species,
        dob, gender, height, eye_colour,
        wand_wood, wand_core, wand_length, wand_adaptability,
        bio, status
      )
      VALUES (
        ${session.discordId}, ${name}, ${surname}, ${givenNames}, ${bloodStatus}, ${species},
        ${dobRaw}, ${gender}, ${height}, ${eyeColour},
        ${wandWood}, ${wandCore}, ${wandLength}, ${wandAdaptability},
        ${bio || null}, 'pending'
      )
      RETURNING id, name, surname, given_names, blood_status, species, dob, gender,
                height, eye_colour, wand_wood, wand_core, wand_length, wand_adaptability,
                bio, status, created_at;
    `;

    res.status(201).json({
      character: rows[0],
      wandCoreRestricted: RESTRICTED_CORES.includes(wandCore),
    });
  } catch (err) {
    console.error('characters/create error:', err);
    res.status(500).json({ error: 'server_error' });
  }
};
