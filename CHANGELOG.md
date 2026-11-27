# Changelog: Secret Catalyst

Every version is a git tag (`git checkout v0.4.0` to see it, `git diff v0.4.0 v0.5.0` to compare).
`main` auto-deploys to https://secret-catalyst.vercel.app. Database changes ship as migrations in
`supabase/migrations/` and are applied with `npx supabase db push --remote --yes` **before** the code that
needs them is pushed.

Newest first. Add to **Unreleased** as you go; when it ships, give it a version and a tag.

## Unreleased

## v0.5.1: Riddles live, smarter Hint Book, shelf arrivals (2026-11-27)
**Added**
- Newly found bottles get their own arrival on the lab shelf (drop, pixel burst, "New" tag); bottles you've
  already seen stay still.

**Changed**
- The rewritten riddles (round 1 creative direction) are now live in production, so the nicknames the
  tutorial and Hint Book legend teach ("two tinies, one breath") actually appear in the riddles.
- Hint Book ranks riddles by the nicknames you hold minus the ones you're missing, so water is first for a
  new lab.
- The scanner's "Camera is off" panel no longer overlaps the viewfinder corners.

## v0.5.0: New-player experience (2026-11-27)
The organizer said the app was confusing and lifeless for a first-timer. This version is built around
"someone who has never heard of the game opens it between classes".

**Added**
- **Lab Induction:** a 5-step interactive tutorial on first visit. Your LAB sign flickers on; you scan a
  practice QR and watch a bottle drop onto your shelf; you pour H + H + O into a flask that fills step by
  step until it stamps WATER; you open an envelope that reveals your real secret catalyst; then three rules
  (bad mixes freeze you, isotope drops, how you win). Skippable, and replayable from the new **Help** button.
- **"Your next move"** card on the lab. It always shows the most useful next step from your real state:
  frozen, isotope live, find your first QR, make your first compound (it names water when you hold H and O),
  lend your catalyst, fill your shelf, crack a harder riddle. It stamps **DONE** when you complete one.
- **Motion:** stamps slam in, element and compound reveals burst with pixel sparks, shelf bottles drop in,
  the score counts up with a floating +N, a failed mix shakes the rig with rising smoke, and the scanner
  has pixel corners and a sweeping scan line. All of it is stepped (pixel-true) and off under reduced motion.
- **Hint Book:** a legend of your elements' nicknames ("H = the tiny one"). Riddles that mention elements
  you hold sort to the top, so water comes first for a new lab.
- **Scanner:** "Turn on camera" retry with iPhone and Android steps, plus a "Where to look" list that the
  organizer can edit (`WHERE_TO_LOOK` in `src/app/(game)/scan/page.tsx`).
- **Mix bench:** the flask fills as you add elements, an "In the flask" line, a sticky Synthesize button
  that names the recipe, and a failed mix that says what you mixed and what to do next.
- **Landing page:** an animated lab scene and a real three-step "how it works".

**Changed**
- One-row top bar (LAB sign, score with "Rank #", Help). The Day Shift toggle moved to Settings.
- Nav tabs have pixel icons. Headings and labels are plain sentence case instead of spaced pixel capitals.
- Empty rare and isotope cabinets fold into one explained line instead of a wall of grey bottles.
- An empty mix bench shows one instruction ("scan your first QR") instead of an empty rig.
- Shelf plates show each element's nickname.

## v0.4.0: Night Shift design shipped, public-name opt-out, lab numbers (2026-11-27)
**Added**
- The approved pixel-art "Night Shift" design across the whole app. Tokens, Silkscreen + Atkinson
  Hyperlegible type, a pixel sprite kit (rarity shown by bottle shape + pips + tag, never colour alone),
  stepped halos, hazard stripes, and pixel catalyst icons.
- Restyled lab, scan reveal, mix bench (running / failed / synthesized), hints, board, crew, market, recap,
  landing, login, projector, finale and Instagram story cards.
- `/settings` (display name, show name or "Lab 0248" on public screens, Day Shift, recap, sign out) and
  `/frozen` (countdown and what you can still do).
- Lab number = last 4 digits of the college ID.
- Isotope drop cards can hint a rough area ("Last seen: near the library").

**Security / privacy**
- Public surfaces never show a formula or catalyst during play (sealed "?" flask until the finale).
- Migrations 6–11: name opt-out masks names in the feed, leaderboard, hint book and finale; renames keep
  old feed lines in sync; only the leading actor name is ever swapped; opt-in and opt-out are idempotent;
  "Lab NNNN" names are reserved on every path; look-alike characters are folded before the check.

## v0.3.0: Creative direction (2026-11-27)
- `creative-director` and `design-critic` agents iterated in 2 rounds (round 1 REVISE, round 2 APPROVE);
  see `design/direction.md` and `design/critique.md`.
- HTML mockups for every key screen in `design/screens/`, plus a font and rarity test sheet. Pixelify
  Sans was rejected because C looked like O and 5 looked like S.
- Riddles rewritten in the game's voice (`content/catalog.json`).
- Organizer decisions recorded: manual Day Shift, names public unless opted out, isotope area hints,
  lab number from the college ID.

## v0.2.0: Deploy + organizer toolbox (2026-11-26)
- Vercel deployment (`.vercelignore` keeps env files out).
- Admin: access modes (university-only, verification, username test logins, test server), per-player
  Manage panel (grant or revoke anything, random loadouts), CSV export, catalog editor, resets,
  broadcast, admins list, audit log.
- Security: CSV formula injection neutralized.

## v0.1.1: Security hardening (2026-11-26)
- Post-login redirect hardened against backslash and dot-segment open-redirect tricks (with unit tests).

## v0.1.0: Playable game (2026-11-26)
- Design spec, content catalog (25 elements, 58 compounds, 6 catalysts), creative subagents.
- Backend: Supabase schema; all game rules as Postgres RPCs with RLS and an explicit execute allow-list;
  admin RPCs; SQL tests and a concurrency test.
- Frontend: player app (lab, scan, mix bench, catalysts, hints, crew with alliances and gifts,
  leaderboards, black market, recap), admin control room, big screen, finale, story cards.
- README with local dev, tests and architecture.
