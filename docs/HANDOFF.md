# Handoff — Secret Catalyst (state as of 2026-11-27)

Read this first in a new session. Then `README.md` (how to run) and
`docs/specs/2026-11-26-secret-catalyst-design.md` (full game design).

## Where things are

| Thing | Where |
|---|---|
| Live site | https://secret-catalyst.vercel.app (Vercel project `secret-catalyst`, linked in `.vercel/`) |
| Admin | `/admin` (control room), `/admin/access` (access & testing), `/admin/qr`, `/admin/catalog`, `/screen`, `/screen/finale` |
| Database | Supabase project `secret-catalyst`, ref `qjpzcqfosffuejwfvmxr`, Mumbai (ap-south-1). The CLI is linked; push with `npx supabase db push --remote --yes` |
| Repo | https://github.com/aaaditt/chemical-scavenger-hunt (`main`). Commit and push every change (the user's standing request) |
| Organizer | f20240248@dubai.bits-pilani.ac.in (in `admin_emails` on production) |
| Google sign-in | Reuses the **mecha-cham** OAuth client (Google Cloud project `meccha-campus`, client "Meccha Campus Website"). A second redirect URI was added for Supabase, and a second client secret was created and pasted into Supabase → Auth → Google. **Do not change branding or audience there, because that would affect mecha-cham.** |
| Env | `.env.local` = local dev (local Supabase). `.env.production.local` = cloud URL and publishable key. Vercel production env holds `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL=https://secret-catalyst.vercel.app` and `NEXT_PUBLIC_DEV_LOGIN=false`. The service-role key is not used anywhere. |

## Production state
- Migrations 1–5 applied, catalog seeded (25 elements, 58 compounds, 6 catalysts).
  - **The catalog riddles were rewritten locally by the creative-director, but `supabase/catalog.sql` has
    NOT been re-pushed to production.** To push: `npx supabase db query --remote --yes -f supabase/catalog.sql`
- 28 test QR codes with `location_label = 'TEST'` (one per element, plus hints for ammonia, glucose and
  caffeine). Disable or delete them before the real event.
- Game is **closed**. Admins can play while it's closed. Settings: university-only ON, verification OFF,
  username login OFF, test server OFF.
- Supabase Auth: Google enabled, anonymous sign-ins enabled (the DB trigger still blocks them unless the
  admin "Username sign-in" switch is on; verified in production), site URL and redirect set to the Vercel domain.

## Done
- Game rules entirely in Postgres RPCs (`supabase/migrations/2026112600000{1..5}*.sql`), with RLS and an
  explicit execute allow-list.
- Player app: lab, scan (camera and `/s/CODE`), mix bench, catalysts, hints, crew (alliances, gifts),
  leaderboards, black market and recap.
- Admin: everything listed in the README, plus access modes, verification, username test logins,
  test server, a per-player Manage panel (grant or revoke anything, random loadouts), CSV export,
  catalog editor, resets and an audit log.
- Story cards (`/api/card/*`), big screen, finale.
- Tests: `npm run test:sql` (48 game + 27 admin assertions), `npm run test:race`, `npm test` (22 unit tests).
- Security fixes from the automated review: function grants, open redirects (backslash and dot-segment),
  CSV formula injection.

## Creative direction: APPROVED (round 2, 2026-11-27)
The user's process was: `creative-director` ↔ `design-critic` (`.claude/agents/`) iterate until both are satisfied.
Round 1 got REVISE, round 2 got APPROVE (see `design/critique.md`).

- **References:** `design/references/` (4 pixel-art lab videos + stills/contact sheets).
- **Direction:** `design/direction.md` (includes the "Round 2 changes" section). Type is Silkscreen (multiples of 8px)
  plus Atkinson Hyperlegible for symbols, formulas and small numbers. Pixelify Sans was rejected for C/O and 5/S confusion.
  Public screens never reveal catalysts or recipes during play (they show a sealed "?" flask).
- **Mockups:** `design/screens/*.html` share `kit.js`/`kit.css`; `type-test.html` is the glyph and tier test sheet.
  Screenshots via `bash scripts/shoot-mockups.sh` → `design/screens/shots/`.
- **Fix during implementation** (critic's round 2 should-fix list): the SYNTHESIZED caption overlaps the note;
  the projector "CATALYZED ?" chip clips (and needs 24px); auto-fit hero names (64/48/40/32); solid-step candle glow;
  give Legendary its own shape vs. the Light catalyst; the moon icon; whole-pixel text positions.
  Hint Book, Lend Catalyst and Black Market have no mockups yet.
- **Open questions for the user:** auto Day Shift 10–16h? (director assumed yes); names on public screens opt-out
  vs. opt-in? (assumed opt-out); area hints in isotope Instagram posts?; "LAB 1137" number random vs. from ID?
- **Next:** apply the direction to the real app. Replace the `@theme` block in `src/app/globals.css` with
  `design/tokens.css`, redo `src/components/Bottle.tsx` as pixel sprites from `kit.js`, then restyle the screens,
  story cards (`src/app/api/card/[kind]/route.tsx`, Silkscreen TTF for next/og) and placards.

## Other open items
- Run `game-balancer` on the catalog. Catalyst demand is uneven (Heat gates 7 compounds, Acid 3).
- Story-card ⭐ emoji renders blank in next/og.
- Before the event: disable or delete TEST QRs, delete test players, reshuffle catalysts, create and print
  the real QRs, then open the game.
- Optional hardening: turn off the Supabase email provider (Google is the only intended route).

## Local dev notes
- `npx supabase start -x studio,imgproxy,vector,logflare,edge-runtime,pooler`. Docker Desktop must be running.
- Because the CLI is linked to the cloud project, `supabase/.temp/rest-version` was renamed to `.cloud`.
  Otherwise the local start tries to pull a PostgREST image that isn't available.
- `node scripts/dev-users.mjs` creates admin@ and player1..4@dubai.bits-pilani.ac.in with password `devpassword`.
