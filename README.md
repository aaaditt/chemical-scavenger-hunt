# Secret Catalyst 🧪

*(working title)*: a campus-wide chemistry scavenger hunt for BITS Pilani Dubai.

Scan QR codes hidden around campus to collect elements into your virtual lab. Mix them into
compounds. Hunt down rare elements and 30-minute unstable isotopes. Your **secret catalyst** is
the one thing other players need, and you need theirs.

## Run it locally
Requirements: Node 22+, Docker Desktop running.

```bash
npm install
npx supabase start          # local Postgres/Auth/Realtime in Docker
npm run db:reset            # apply migrations + catalog + DEV QR codes
node scripts/dev-users.mjs  # admin@ + player1..4@dubai.bits-pilani.ac.in, password "devpassword"; opens the game
npm run dev                 # http://localhost:3000
```

- Use the **Dev login** on `/login`, which only appears when `NEXT_PUBLIC_DEV_LOGIN=true`.
- Scan without a camera by visiting `/s/DEV-H`, `/s/DEV-O`, `/s/DEV-N` and so on (one DEV code per
  element). Isotopes start dormant, so release them from `/admin`.
- Organizer tools: `/admin` (control room), `/admin/qr` (create and print QR placards),
  `/screen` (projector) and `/screen/finale`.

## Tests
```bash
npm run test:sql    # 48 game-rule assertions (scans, freezes, catalysts, alliances, gifts, market, RLS)
npm run test:race   # 30 players racing a cap-5 QR → exactly 5 win
```

## Content
`content/catalog.json` is the single source for elements, catalysts, compounds, riddles and points.
After editing it, run `npm run content`, which validates it and regenerates
`docs/content/priority-list.md` and `supabase/catalog.sql`.

## Architecture
- **Next.js 16** (App Router), mobile-first, almost entirely client-rendered game screens.
- **Supabase**. All game rules are `SECURITY DEFINER` Postgres functions (`supabase/migrations/`),
  so every action is one atomic transaction. Clients can only read their own rows (RLS) and call an
  explicit allow-list of RPCs. The `@dubai.bits-pilani.ac.in` domain is enforced by a trigger on
  `auth.users`. Realtime powers the live feed and leaderboard.
- Story cards are drawn by `src/app/api/card/[kind]` (`next/og`).

| Doc | What |
|-----|------|
| [`docs/specs/2026-11-26-secret-catalyst-design.md`](docs/specs/2026-11-26-secret-catalyst-design.md) | Full game + system design |
| [`docs/content/priority-list.md`](docs/content/priority-list.md) | Compound priority list (generated) |
| [`.claude/agents/`](.claude/agents/) | Creative / design / balance subagents |
| `design/references/` | Drop mood-board / reference images here |
