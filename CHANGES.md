# What changed

## Profile page (`profile.html`)

The old tabs — **Characters** (with the create form baked in), **Pets & Cosmetics**,
and **Achievements & Quests** — are replaced with:

- **Characters** — just the list of your characters, each with an
  **Approved** or **Pending Review** badge.
- **Create** — the character form, on its own tab. Submitting now creates
  the character with `status = 'pending'` instead of it going live
  immediately.
- **Inbox** — every approve/decline decision that's ever been sent to you,
  newest first, with the Overseer's message if they left one. Opening the
  tab clears the unread badge.
- **Applications** — *only visible if your rank is Overseer.* Lists every
  pending application from every applicant, with their Discord avatar,
  username, and rank. Each one has a message box and **Accept**/**Decline**
  buttons.

Pets, Cosmetics, Achievements, and Quests weren't live features yet (they
were stub "coming soon" placeholders), so nothing real was removed — just
the placeholders.

## How review works

1. A player submits a character on **Create** → row is inserted with
   `status = 'pending'`. It still counts against their slot limit, so
   people can't queue up unlimited pending apps.
2. An Overseer opens **Applications**, writes an optional message, and
   clicks **Accept** or **Decline**.
   - **Accept** → the character's `status` flips to `approved` and it
     shows the green **Approved** badge on the applicant's Characters tab.
   - **Decline** → the character row is deleted outright (it never holds
     a slot). The applicant only sees the decision in their **Inbox**.
3. Either way, a row is inserted into a new `inbox_messages` table for the
   applicant, with the decision, the Overseer's message (if any), and who
   reviewed it. That's what powers their **Inbox** tab.

## Database

Two changes to the schema (see `db/schema.sql`) — both applied
automatically by `api/_shared/db.js` on the next request, no manual
migration needed:

- `characters` gains `status` (`pending` / `approved`), `reviewed_by`,
  and `reviewed_at`.
- New table: `inbox_messages`.

## New API endpoints

- `GET /api/inbox/list` — the signed-in user's inbox messages; marks them
  read.
- `GET /api/applications/list` — Overseer-only; every pending application
  plus the applicant's Discord info.
- `POST /api/applications/review` — Overseer-only; body
  `{ characterId, decision: 'approve' | 'decline', message }`.

## Rank check

"Overseer" is read straight from the signed session (`session.rank`,
same JWT that already carries slot counts) — the same role mapped in
`api/discord/_lib.js`'s `RANK_ROLES`. No new env vars or Discord role IDs
needed.
