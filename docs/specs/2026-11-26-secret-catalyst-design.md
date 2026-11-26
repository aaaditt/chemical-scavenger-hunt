# Secret Catalyst — Design Spec

*Status: approved direction (2026-11-26). Working title, subject to change.*

## 1. Intent
A campus QR scavenger-hunt for BITS Pilani Dubai. Players collect elements by scanning QR codes
around campus, and they build a virtual chemistry lab by synthesizing compounds.

**The core problem being solved:** a pure "run around and guess" game gets shallow fast.
Players should have to **talk, trade information and cooperate** without needing any real
chemistry knowledge. Three mechanics deliver that:
1. **Secret catalysts.** Every player secretly holds one catalyst, and the high-value compounds
   need it.
2. **Riddle hint cards.** Some are public, some are locked, so knowledge itself becomes something
   to trade.
3. **Alliances.** Small groups pool their common elements.

**Promotion and virality are first-class goals.** The game should look striking and produce
moments people want to post.

### Goals
- A fun afternoon on event day, for 100–500 players.
- Live, trustworthy scores, a big-screen leaderboard, and organizer control in real time.
- Shareable moments: story cards, first-discoverer credit, a finale reveal and a recap.

### Non-goals
- Teaching real chemistry rigorously. Real formulas are used for flavor, and riddles never
  require knowledge.
- A native app. It's a web app, and scanning with the phone camera opens it.

### Anti-goals (failure even if it "works")
- Scores that players don't trust, from cheating, leaked QR photos or race conditions.
- Solo players who never need to talk to anyone.
- A launch-day crash or a slow leaderboard.
- A generic-looking template UI that nobody would screenshot.

## 2. Game rules

### 2.1 Elements and scanning
| Tier | Examples | QR supply | Points (first scan of that element) |
|------|----------|-----------|------|
| Common | H C N O Na Cl S Ca | Many duplicates everywhere | 3 |
| Uncommon | K Mg Fe Cu P Si Al F | Several, spread out | 8 |
| Rare (niche) | Li Zn Ag I Au | Very few, hidden, **claim-capped** | 20 |
| Unstable isotope | D (²H), C-14, O-18, U-235 | Admin-activated for **30 min**, claim-capped, announced on Insta | 50 |

- Scanning an element you already own gives no points. The lab shows a "you already have this" moment.
- Elements are **not consumed** by synthesis.
- **Gifting:** elements marked `giftable` in the catalog can be shared through a one-time link.
  The sender keeps the element and the receiver gets it too. Each player can make a limited
  number of gift links (default 3, admin-tunable).

### 2.2 Synthesis
- **Mix bench:** the player picks element types *and quantities* (e.g. H ×2, O ×1) and, if they
  have one, attaches a catalyst code, then presses Synthesize.
  - *My call:* quantities are part of the recipe even though elements aren't consumed. Without
    them, H₂O and H₂O₂ would collide, and the riddles ("two of one, one of the other") need them.
    You can mix any quantity of an element you own.
- Match → the compound is added to the lab with points (see catalog). A mix that is already
  owned is just a no-op that shows a "you already have this" message.
- **3 wrong mixes in a row → the lab freezes** for 12 min by default (admin-tunable). Frozen
  means no scanning-for-points and no mixing. Scans made during a freeze are queued and granted
  when it ends. A success resets the counter.

### 2.3 Secret catalysts
- Six catalysts: 🔥 Heat, 🗜️ Pressure, ☀️ Light, ⚡ Electricity, 🧬 Enzyme, 🧪 Acid.
- Each player is randomly assigned one at sign-up, balanced so each catalyst covers roughly
  1/6 of players. Only the player can see their own catalyst.
- Catalyst-gated compounds need the right catalyst **attached to the mix**.
- **Using a catalyst:** the holder taps "Lend catalyst" and gets a single-use code plus link
  that expires in 10 min. The mixer redeems it on the mix bench. Holders can also use their
  own catalyst on their own mixes, unlimited and with no code.
- **Rewards:** the mixer gets the compound's full points. The holder gets a **catalysis bonus**
  of 30% of the points, but only if the mix succeeds.
- A failed mix with a borrowed code burns the code. That's my call, so codes stay scarce and
  people don't brute-force with one code.
- Players are free to tell (or lie about) what their catalyst is. That's part of the game.

### 2.4 Hint cards (riddles)
- Each compound has a **public riddle**, visible in the Hint Book from the start.
- Catalyst-gated, rare and isotope compounds also have a **locked hint** that names the exact
  catalyst or gives the quantities. A locked hint can be unlocked by:
  - scanning a "hint QR" (a separate QR type placed around campus)
  - a random handout at sign-up (each player gets 2 locked hints)
  - being in an alliance with someone who has unlocked it (allies share the Hint Book)
- Hints are knowledge, so players can trade them by telling each other.

### 2.5 Alliances
- Up to **3 players**. You create one, invite by code, and the invitee accepts.
- Allies can use each other's **common elements** in their mixes. Uncommon, rare and isotope
  elements and catalysts are **not** shared.
- Allies share their unlocked hints.
- **Leaving costs 50 points**, and you can't rejoin that same alliance.
- *My call:* compounds stay individual. Whoever presses Synthesize gets them.

### 2.6 Black market
- Admin opens it for about 10 minutes, announced on Instagram and pushed in-app.
- Each player gets one play per window:
  - **Safe:** +100
  - **Gamble:** 40% +200, 25% +300, 35% lab frozen for 60 min. The odds are admin-tunable.
- The result shows as a dramatic reveal, which makes a great story-card moment.

### 2.7 Winners
1. **Speed Chemist:** most compounds by the end. A tie goes to whoever reached that count first.
2. **Master of the Obscure:** the highest sum of compound points over rare-tier and above
   (rare, isotope, legendary).
3. *(Suggestion)* **Most Sought-After Catalyst:** the most successful catalyst lends. This is
   cheap to add and rewards the social mechanic.

There's also a live overall score leaderboard. It counts all points, including scans, bonuses,
the black market and penalties.

### 2.8 Shareables and promotion
- **Story cards (9:16):** "I just synthesized Ammonia", a lab shelf snapshot and a rank card.
  Each has a one-tap share or download and is branded.
- **First discoverer:** the first player to make each compound gets credited in the catalog
  ("Ammonia — first synthesized by …"). This shows on the big screen as a live event.
- **Catalyst reveal finale:** a big-screen sequence that reveals everyone's secret catalyst,
  plus awards (biggest gambler, most-lent catalyst, first isotope).
- **Lab Recap:** a Wrapped-style, multi-slide personal recap after the game, made to be posted.
- **Admin Insta helpers:** isotope and black-market drops auto-generate a story image and
  caption text.

## 3. System design

### 3.1 Stack (my call)
- **Next.js (App Router), mobile-first.** No app install. QR codes encode
  `https://<domain>/s/<signed-token>`, which the phone camera opens. There's also an in-app
  scanner for speed.
- **Supabase:** Postgres is the single source of truth, Realtime runs the leaderboard and live
  feed, and Auth handles Google sign-in.
- **Vercel** hosting. Story cards are generated server-side with `next/og`.

### 3.2 Auth
- Google sign-in only. **The email must end in `@dubai.bits-pilani.ac.in`**, checked server-side
  on every session, not only in the UI.
- The student ID comes from the email local-part (e.g. `f20240248` → batch 2024). Display names
  are editable and moderated by admins.
- An admin allow-list (by email) grants access to the admin and big-screen surfaces.

### 3.3 Trust and anti-cheat
- Every game action runs **server-side** in a single Postgres transaction through RPCs or route
  handlers. The client never computes score.
- QR tokens are **HMAC-signed** (`qr_id` + type), so codes can't be guessed or forged.
- **Claim caps** on rare QRs and isotopes are enforced atomically (`SELECT … FOR UPDATE` or
  a conditional update) so they're race-safe.
- Idempotency comes from unique constraints: `(player, qr)`, `(player, element)` and
  `(player, compound)`.
- Rate limits: max ~1 scan per 3 s and ~1 mix per 2 s per player.
- Game window: actions are only accepted while the admin has the game "open".
- The admin can freeze, unfreeze, adjust points and disqualify players, and every action is
  written to an audit log.

### 3.4 Data model (core)
`players` (id, email, student_id, display_name, catalyst, score, frozen_until, wrong_streak) ·
`elements` (symbol, name, tier, points, giftable) · `qr_codes` (id, kind: element|hint|isotope,
element, hint_compound, cap, claimed_count, active_from/to, location_label) · `claims` ·
`player_elements` · `compounds` (id, name, formula, recipe jsonb, catalyst, tier, points,
riddle, locked_hint, first_by, first_at) · `syntheses` · `mix_attempts` · `catalyst_codes`
(code, owner, expires_at, used_by, used_at) · `gift_links` · `alliances` · `alliance_members`
(+ left_at) · `hint_unlocks` · `events` (isotope_drop | black_market, window) · `market_plays` ·
`score_ledger` (every point change with a reason, which is the audit trail and the source for
the recap) · `admin_actions`.

The score is denormalized onto `players` for fast leaderboards, but `score_ledger` is the truth.

### 3.5 Surfaces
- **Player app:** onboarding (with the catalyst reveal), Lab shelf (reagent bottles), Mix
  bench, Hint Book, Catalyst (lend/redeem), Alliance, Gifts, Leaderboard, Live feed, Share/Recap.
- **Admin:** game open/close; live stats; players (search, freeze, adjust, DQ); flags; isotope
  drop and black-market buttons with Insta asset generation; content editor (catalog); QR
  generator and printable sheets (A4, labelled by location).
- **Big screen:** the live leaderboard, a ticker of first discoveries and drops, and the finale.

### 3.6 Content
`content/catalog.json` is the editable source. It's seeded into the DB, and the admin can edit
it live. `docs/content/priority-list.md` is generated from it.

## 4. Build milestones (2–4 weeks)
| # | Milestone |
|---|-----------|
| M0 | Design direction from reference images (creative agents) |
| M1 | Auth (domain-locked), QR scanning, lab shelf, scoring ledger |
| M2 | Mix bench, recipes, catalysts and codes, hint book, freezes |
| M3 | Alliances, gift links, black market, isotope drops |
| M4 | Admin dashboard, QR generator/printing, big screen |
| M5 | Story cards, first discoverer, finale, recap |
| M6 | Load test (~500 simulated players), campus playtest, fixes |

## 5. Verification
- Unit tests for recipe matching, scoring, freeze logic, claim caps and alliance rules.
- Concurrency tests that race 50 players against a cap-5 QR, with exactly 5 succeeding.
- A load simulation of 500 bots against staging, checking leaderboard latency.
- Playwright mobile E2E coverage of the full player loop.
- A campus dry run with printed QRs.

## 6. Calls made by Claude (check these)
- Recipe quantities matter on the mix bench, even though elements aren't consumed.
- The element points per tier (3 / 8 / 20 / 50) and the catalog's compound points.
- The list of 6 catalysts, and balanced assignment of them.
- Catalyst codes expire after 10 min, and a failed mix burns the code.
- The default freeze is 12 min. Scans made during a freeze are queued.
- Gift links: 3 per player by default.
- Black market odds of 40 / 25 / 35.
- Each player is handed 2 random locked hints at sign-up.
- Compounds made in an alliance go to whoever synthesized them.
- An optional third award, Most Sought-After Catalyst.
