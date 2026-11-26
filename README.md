# Secret Catalyst 🧪

*(working title)*: a campus-wide chemistry scavenger hunt for BITS Pilani Dubai.

Scan QR codes hidden around campus to collect elements into your virtual lab. Mix them into
compounds. Hunt down rare elements and 30-minute unstable isotopes. Your **secret catalyst** is
the one thing other players need, and you need theirs.

## Status
Planning / design phase.

| Doc | What |
|-----|------|
| [`docs/specs/2026-11-26-secret-catalyst-design.md`](docs/specs/2026-11-26-secret-catalyst-design.md) | Full game + system design |
| [`content/catalog.json`](content/catalog.json) | Draft elements, catalysts, compounds, riddles, points (organizers edit this) |
| [`docs/content/priority-list.md`](docs/content/priority-list.md) | Human-readable compound priority list (generated) |
| [`.claude/agents/`](.claude/agents/) | Creative / design / balance subagents |
| `design/references/` | Drop mood-board / reference images here |

## Regenerate the priority list
```bash
node scripts/priority-list.mjs
```
This validates `content/catalog.json` (unknown symbols, duplicate ids, missing catalysts) and
rewrites `docs/content/priority-list.md`.

## Planned stack
Next.js (mobile-first web app) · Supabase (Postgres, Realtime, Google Auth restricted to
`@dubai.bits-pilani.ac.in`) · Vercel.
