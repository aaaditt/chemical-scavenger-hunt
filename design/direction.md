# Secret Catalyst: Creative Direction, "NIGHT SHIFT"

Status: round 1 complete, waiting for `design-critic`.
Artifacts: `design/tokens.css` (drop-in Tailwind v4 `@theme`), and `design/screens/` with `lab.html`, `mix.html`,
`scan-reveal.html`, `frozen.html`, `screen.html` (projector, 1920x1080) and `story-card.html` (1080x1920).

---

## 0. What the references show

All four references are **side-view, single-plane, animated pixel-art chemistry labs**. Every object sits on one
bench or floor line, the camera never moves, and the motion comes from small loops: bubbles, flames and flowing liquid.

| Ref | Palette | Type and signage | Texture | Composition | Energy |
|---|---|---|---|---|---|
| **1** Candlelit lab | Deep bottle-green walls (#12302c-ish), black-green bench, one hot **cyan** flask, a warm **amber** candle pool, a pale **parchment** note | Hand-lettered "JUNE" on a pinned paper note | Big stone wall tiles with dark seams. The candle halo is soft. | Round flask on the left, stand and burner in the middle, jar on the right, all on one table line | Very quiet. Bubbles rise, the flame flickers, and the empty flask slowly fills. Secretive, after hours. |
| **2** Industrial lab | Concrete grey, **teal holo screens**, a **red alarm lamp** glow, **yellow/black hazard stripes** on the door | Monitor text ("UNKNOWN NUMBERS"), graphs, tiny UI glyphs | Riveted panels, ceiling pipes, vents, crates | A long horizontal corridor with a scientist, a desk, a specimen tube and a door | Ambient. The alarm pulses and the specimen floats. It has a "something is off in here" feel. |
| **3** Clinical lab | Pale **clinic blue-grey**, mint stasis tubes, a **green LED "LAB" sign**, a red warning light | LED sign lettering, heartbeat monitors | Clean tiles, lit from above | A corridor of stasis tubes and monitors, with a door marked LAB | The only bright one, and the most kinetic: a creature bounces off walls and leaves red splats. |
| **4** Apparatus rack | Dark slate background, **saturated liquids** (pink, lime, cyan, violet, amber) in clear glass, steel-grey frame | A tiny copyright line only | Chrome pipes, glass highlights | A symmetrical rack. Liquid travels through coils, dashed lines and valves from tube to flask. | Mechanical and hypnotic. Colors flow from one vessel to the next and the final flask changes color. |

**Derived direction:** a pixel-art lab at night. The room is dark and quiet (refs 1, 2 and 4). The **glass holds all the
color** (ref 4). Information lives on **paper labels, LED signs and holo monitors** (refs 1, 3 and 2). The apparatus rack
(ref 4) is literally how mixing works. Ref 3's bright clinic is the **Day Shift**, the same lab with the lights on.

### Conflicts in the references, and the calls I made
1. **Dark and moody (refs 1, 2, 4) vs. bright and clinical (ref 3), and vs. Dubai sun on a phone.** I did not settle on a mid-grey
   compromise. **The rooms are dark and the labels are light.** Everything you need in order to play is dark ink on light label stock
   (clinic, parchment, holo or candle panels, all 10:1 or better). The dark wall only holds atmosphere. For direct sun there is
   a one-tap **Day Shift** (ref 3 palette, `[data-shift="day"]`) with the same layout and sprites. Night Shift stays the
   default because it's what gets screenshotted: dark plus glowing glass looks good in a story, and a pale UI doesn't.
2. **Ref 4's rainbow vs. ref 1's restraint (one cyan accent).** Both win, in different places. **Saturated color is only allowed
   inside glass** (liquids, which encode catalyst and rarity) and on the single primary button. Walls, panels and
   chrome stay inside the muted green and ink family. That's why a cyan flask on a green wall hits as hard as in ref 1.
3. **Ref 1's soft candle bloom vs. crisp pixels.** Glows are **quantised**: 2 to 3 hard concentric rings drawn as pixels, with
   no blur. They're never CSS `blur()` or soft `box-shadow`.
4. **Ref 3's gore (red splats, a creature).** Not adopted. Failure in this game is **brown sludge and a puff of smoke**, which is funny
   and not gross. Ref 3 gives us its palette, its LED sign and its monitors, not its violence.

---

## 1. Concept

**After hours, the whole campus becomes one pixel-art lab, and everyone on the night shift is secretly carrying the
ingredient someone else needs.**

We're in a 16-bit chemistry lab after lights-out: stone walls, one lamp, shelves of glass, an apparatus rack that hums.
It's half science fair and half secret society. Your phone is your bench. Each QR you find is a bottle on your shelf, each
mix runs liquid through ref 4's coils, and your catalyst is the one thing you never put on the shelf, because you carry it.
The look is a cozy, specific game world rather than an app skin: dark room, glowing glass, paper labels,
LED signage and hazard tape where things get risky (isotopes, the black market).

---

## 2. Visual pillars

1. **Dark room, light labels.** The wall is atmosphere and the labels are information. Anything a player must read
   sits on label stock (clinic, parchment, holo or candle) in ink, at 10:1 or better. Nothing you need to play is ever light text on a texture.
2. **Color lives in the glass.** Saturated hues are reserved for liquids (catalysts and rarity), the one primary action
   (candle amber) and danger (alarm, hazard). If a panel is "colorful", it's wrong.
3. **One pixel grid, no exceptions.** 1 art pixel = 4 CSS px on the phone. Every border, gap, offset and sprite is a multiple of 4.
   There are no rounded corners, no blur and no easing on sprites. Corners are stepped and motion is `steps()`.
4. **Every big moment is a stamp.** Collected, Synthesized, Frozen, Unstable: a hard-edged stamp, a hero bottle close-up
   on a quantised halo, a huge pixel name and one paper note. That's the same anatomy every time, so a screenshot is recognisable
   in an Instagram feed at thumbnail size.
5. **Objects, not illustrations.** We draw bottles, flasks, a lamp, a rack and pipes as tiny pixel sprites (code, not art packs). The
   "room" is CSS tile seams. Anything that would need an illustrator is out of scope.

---

## 3. Palette

All values are in `design/tokens.css`. The contrast figures are WCAG ratios against the surface listed.

### Room (atmosphere only, never carries required text)
| Name | Hex | Role |
|---|---|---|
| Ink | `#071312` | Outlines, pixel borders, and **all text on light surfaces** |
| Bench | `#0b1a19` | Deepest panels, LED housings, shelf planks |
| Wall | `#12302c` | App background (ref 1 wall). Tiled with 4px **Seam** `#0d2521` on a 96x64 grid |
| Tile | `#1e4640` | Raised edges, plank tops |
| Moss | `#2a5c54` | Empty-slot outlines, disabled |
| Fog | `#8fb0a8` | Secondary text on the wall, **6.0:1**. Non-critical only, at 16px or larger |

### Label stock (where information lives)
| Name | Hex | Role | Ink on it |
|---|---|---|---|
| Clinic | `#dce7ee` (shade `#a9bcc8`) | Data: bottle labels, plates, score cards, list rows | 15.0:1 |
| Parchment | `#eadf9e` (shade `#c9b96a`) | Secrets: riddles, hints, the lab log, "first in the lab" notes (ref 1's JUNE note) | 14.0:1 |
| Holo | `#43e6c6` (deep `#1fa88e`) | HUD monitors: score, points chips, leaderboard headers (ref 2) | 12.0:1 |
| LED | `#8df25f` | LED-sign lettering on Bench (ref 3's LAB sign), stamps and clocks | 12.8:1 on Bench |

### Light and signal
| Name | Hex | Role |
|---|---|---|
| **Candle** | `#ffb547` (deep `#d9851c`) | **The primary action**, and only that, plus the #1 rank. It's the warm light in the cold room. 10.8:1 with ink. |
| Alarm | `#ff4b3e` | Failed mix, strikes, errors, pins on notes. 5.7:1 with ink. |
| Hazard | `#f7c61b` | Hazard stripes (isotopes, black market, ticker), always paired with Ink stripes |
| Frost | `#bdf4ff` (deep `#6cc9e6`) | Frozen state only. 14.9:1 on Bench. |
| Sludge | `#6b5a2e` | Failed-mix liquid. Decorative only. |

### Catalyst accents (liquid colors, chip fills and pixel icons)
| Catalyst | Hex | Icon sprite (10x10) | Ink on it |
|---|---|---|---|
| Heat | `#ff5a36` | flame | 6.1:1 |
| Pressure | `#a57bff` | gauge | 6.2:1 |
| Light | `#ffe14a` | sun with rays | 14.5:1 |
| Electricity | `#4db2ff` | bolt | 8.2:1 |
| Enzyme | `#4bf08b` | double helix | 12.7:1 |
| Acid | `#ff5fae` | droplet | 6.8:1 |

Rule: catalyst colors are **fills with ink text** (chips, liquid). As text on the wall they only reach about 4.5:1, so they're
allowed as text only at 24px or larger, or as a single emphasised word at 16px if it reaches 4.5:1 (Pressure, Electricity, Enzyme, Light).
Heat and Acid are never small text on dark. Use Candle for the callout instead (see `frozen.html`).

### Rarity tiers (never conveyed by color alone)
| Tier | Color | **Vessel shape** | **Pips** | Motion | Tag |
|---|---|---|---|---|---|
| Common | Sage `#9fc2b8` | Squat **jar** with red cap | 1 | none | COMMON |
| Uncommon | Reagent Cyan `#3ff0e6` | Round-bottom **flask** (ref 1) | 2 | bubbles | UNCOMMON |
| Rare | Quicksilver `#e4ecf7` | **Decanter** with gem stopper | 3 | 4-point sparkles | RARE |
| Isotope | Uranium `#d4ff2a` | Sealed **ampoule** with a hazard band | 4 hazard-striped pips | step flicker | ISOTOPE / UNSTABLE |
| Legendary (compounds) | Prism, gold anchor `#ffcb3d` | Erlenmeyer with gold stopper | 5 gold pips | liquid steps through all 6 catalyst colors | LEGENDARY |

Compounds always use the **Erlenmeyer**. Basic compounds use Sage liquid. Catalyzed compounds take **the catalyst's color** plus its icon chip.
Compound rarity is shown by pips and tag. Proof that shape carries rarity on its own: `frozen.html` shows queued bottles with
all liquid frozen to one color, and K (flask) vs. Zn (decanter) still read as different tiers.

---

## 4. Typography

| Role | Face | Weights | Sizes (px) | Usage |
|---|---|---|---|---|
| Display / pixel | **Pixelify Sans** (Google Fonts, OFL, TTF available for `next/og`) | 500, 700 | 14 tag · 16 label · 24 HUD · 32 title · 40 stamp · 48 / 64 hero name · 96 timer and mega | Stamps, names, numbers, HUD, buttons, tags. ALWAYS UPPERCASE for stamps, buttons and tags. Numbers are always Pixelify. |
| Body | **Atkinson Hyperlegible** (Google Fonts, OFL) | 400, 700 | 16 min · 17 to 18 for key sentences · 14 only for plate captions on label stock | Every sentence: riddles, notes, explanations, names on boards. It was designed for low-vision legibility, which is exactly the Dubai-noon problem. |

Rules:
- **Body text is 700 weight by default** outdoors. Use 400 only on Day Shift or long-form (rules page).
- Pixelify sizes on the phone are multiples of 4 (prefer 8), except 14 for tags (bold, uppercase, on solid label stock only).
- A hero name steps down 64 → 48 → 32 to stay on one line. Never wrap a stamp or a hero name.
- Letter-spacing on Pixelify is +0.02em, and +0.04 to 0.08em for tiny tags and LED labels.
- Projector: minimum 24px for anything, 28px for sentences. Story card: minimum 36px.
- `next/font/google` setup is in the header comment of `tokens.css`.

---

## 5. Sunlight rules (the dark-vs-sun tension, made concrete)

| Rule | Value |
|---|---|
| Text required to play (names, points, timers, instructions, buttons) | **7:1 or better (AAA)**. In practice all label-stock pairs are 10 to 15:1. |
| Secondary text (Fog on Wall) | 4.5:1 or better (we use 6.0:1), at 16px or larger, never the only place a fact appears |
| Decorative pixels (seams, halos, sludge, smoke) | No requirement. They must never sit behind body text unless it's on a label panel. |
| Tap targets | **48x48 minimum** (12 art px). Primary buttons are **64 tall**, full width or paired. SCAN is **88x88**. Steppers are 44x48 with 0 gap. |
| Primary action | Exactly one Candle button per screen, at the bottom, inside the thumb zone |
| Body size | 16px minimum, 17 to 18px for the one sentence that matters on a reveal |
| State | Never color alone: strikes are pixel **X glyphs**, rarity is **shape + pips + tag**, catalysts are **icon + word** |
| Day Shift | One tap in the HUD (`DAY` / `NIGHT`), remembered per device. Same layout. Glows become ink rings. Text-muted becomes `#34505a` (7.1:1). |
| Motion | Everything in `steps()`. `prefers-reduced-motion` shows the resting frame. Glows and color stay, only motion stops. |

---

## 6. Pixel scale (one grid)

- **Art pixel = 4 CSS px on the phone** (390 wide). Sprites, borders (`--shadow-px`), gaps and offsets are all multiples of 4.
- **Hero close-up = exactly 2x (8 CSS px)**, used for **one sprite per screen** in a reveal moment (scan reveal, synthesized, frozen).
  It's a camera zoom, so a 2x sprite never sits in the same row or grid as 1x sprites.
- Larger canvases scale the whole grid by an integer: **projector 8 (hero 16)**, **story card 12 (hero 24)**.
- Sprites are **16x20** (bottles, flasks), **10x10** (catalyst icons), **7x7** (feed glyphs on the projector), and **88x56** (the mix rack).
- Rendering: inline `<svg viewBox="0 0 16 20" shape-rendering="crispEdges">` with one `<rect>` per horizontal run,
  plus `image-rendering: pixelated`. No raster assets.

### How to build it in Next.js + Tailwind
- `src/lib/sprites.ts`: the `SPR` string grids and the `P` / `LIQ` palettes, copied verbatim from the mockups.
- `<Sprite name tier liquid scale />`: a server component that run-length-encodes rows into `<rect>`s (the `rects()` function in the mockups is the reference implementation).
- `<Halo r color scale/>`, `<Hazard w h scale/>`: the same, as procedural rect generators.
- Animation is CSS only: classes `.bub`, `.spk`, `.iso`, `.prism` and `.f1`/`.f2`/`.f3` map to the keyframes in `tokens.css`.
- `next/og` story cards: render the same SVG string to a data URI `<img>`, load the Pixelify and Atkinson TTFs, and replace the ⭐ emoji
  (it renders blank in Satori) with the `star` sprite.
- Tailwind v4: `@theme` in `tokens.css` sets `--spacing: 4px` (so `p-2` = 2 art px) and zeroes every radius.

---

## 7. Motifs and textures

- **Stone tile wall:** 4px seams on 96x64 (ref 1). It's the only background texture. There's no noise or grain overlay, because grain kills sun legibility and screenshots.
- **Bottles on planks:** the lab shelf is real shelves. Each shelf is a plank and each bottle has a clinic **plate** under it (name + pips).
- **Paper notes with a red pin:** parchment notes hold secrets: riddles, the lab log, "first in the lab". The pin is a 3x3 alarm pixel square with an ink ring.
- **LED sign:** bench panel with LED-green Pixelify for screen titles (MIX BENCH, LAB 1137) and the stamp on success.
- **Holo monitors:** teal panels for score, rank and points chips (ref 2).
- **Apparatus rack (ref 4):** the mix bench shows the player's tubes feeding orthogonal glass pipes. Liquid "marches" as a 2-on/2-off dash, passes the catalyst icon, and lands in the flask.
  While building, the flask is **empty**, and it fills only on success.
- **Quantised halo:** 2 rings at 38% and 16% alpha, drawn in pixels, in the tier or catalyst color. **Stamps always sit above the halo**, never on it.
- **Hazard stripes:** a pixel staircase diagonal, never an anti-aliased gradient. Used only on isotopes, the black market and the projector ticker.
- **Frost:** icicles along the top edge, an ice block around the hero flask, frozen liquid, and blinking snowflakes. It's the one screen with **no halo** because the lamp is out.
- **Stamps:** a hard-edged block, scaled 1.75 → 1 in 3 steps. They're the screenshot anchor.
- **Pixel X glyphs** for strikes. **Pips** (8x8 squares) for rarity. **Catalyst icons** instead of emoji, everywhere in UI.

---

## 8. Voice and tone

**The lab's night-shift supervisor:** dry, deadpan, slightly conspiratorial, and on your side but enjoying your mistakes.
It sounds like a friend who has the keys to the building after hours.

- Second person. Short sentences. Exact numbers in digits ("2 of 3", "12 minutes", "+20").
- **No exclamation marks.** No "Oops", "Awesome" or "Congrats". The stamp does the shouting, and the copy stays calm.
- Never explain chemistry. Players use nicknames ("the tiny one") and real names, and formulas appear only as decoration.
- The joke is on the lab or the situation, never on the player's intelligence.
- Suggest social moves ("Be nice to Kabir", "Someone out there holds the catalyst") because the game needs people to talk.
- No emoji in UI strings. Pixel icons replace them. (The `emoji` field in the catalog is for Instagram captions only.)
- Never leak a QR location or a locked hint in shareable copy.

### Sample lines
| Moment | Line |
|---|---|
| Scan success (rare) | **COLLECTED.** Two Silvers left on campus. Whoever has them will not tell you where. |
| Scan success (common) | Hydrogen. The tiny one. Everyone has it, and now you do too. |
| Duplicate scan | **ALREADY SHELVED.** No points for twins. |
| Failed mix | **NOTHING.** Brown sludge and a bad smell. That's 2 of 3. |
| Freeze | **LAB FROZEN.** Three bad mixes in a row. The bench needs a minute. Twelve, actually. |
| Thaw | Thawed. 2 scans just landed. Try not to do that again. |
| Black market opens | The back door is open for 10 minutes. One deal each. No refunds, no receipts. |
| Black market, gamble won | +300. The house will remember your face. |
| Black market, gamble lost | The house wins. Your lab is on ice for an hour. You knew the odds. |
| Isotope drop | Something unstable just turned up on campus. 10 claims. 30 minutes. Go. |
| Catalyst reveal (sign-up) | Your secret is **HEAT**. Half this lab is waiting on you. Tell nobody. Or tell everybody, and lie. |
| Lending | Code burns in 10:00. Give it to someone you trust, or someone who owes you. |
| First discovery | **FIRST IN THE LAB.** Nobody on campus had made Ammonia until 15:42. Your name is in the book now. |
| Leaving an alliance | Leaving costs 50 points, and the door locks behind you. |

---

## 9. Riddle voice

The riddles in `content/catalog.json` were rewritten in round 1 and spot-checked this round. They're all on-voice, so I made no further edits.
Guidelines for any new ones:
1. **Open with an everyday hook** the player has actually met (chai, fries, exam week, hand sanitizer, the ceiling alarm).
2. **Give the recipe in nicknames and counts** ("one air, three tinies"), never with symbols or the compound's name.
3. **Hint at the catalyst with a verb, not a noun.** Heat is fire, cooked or forged. Pressure is squeeze. Light is sunlight or stitch.
   Electricity is a jolt or zap. Enzyme is "something alive". Acid is "a sour shove". The **locked hint** is where the exact catalyst gets named.
4. Use 35 words or fewer, no exclamation marks, and allow at most one gross-out joke per riddle (it's a uni crowd, not a kids' show).
5. The riddle should still work if you read it aloud to a friend across a courtyard, since that's how hints get traded.

---

## 10. Do / Don't

**Do**
- Make every reveal the same five-part anatomy: stamp → halo → hero vessel → pixel name → one paper note.
- Put real names and real times on things ("Meera K, 15:42"). Specificity is what gets shared.
- Keep the projector readable from the back of a hall: names at 36px, scores at 48px, no Fog text.
- Keep story-card content inside y 240 to 1680 (Instagram UI covers the rest).
- Let the wall be empty. Negative dark space is the mood.

**Don't (what would make this generic, templated or cringe)**
- Purple-to-pink gradients, glassmorphism, frosted blur panels, soft drop shadows or rounded cards. Our corners are stepped and our shadows are ink.
- Emoji as icons (🔥⚡🧪). They render inconsistently, they look like every hackathon app, and one blanks in `next/og`.
- Mixed pixel scales in one row, sprites scaled by non-integers, or anti-aliased "pixel art" (missing `crispEdges` or `pixelated`).
- Neon-on-black "cyberpunk". This is a lived-in lab with stone and wood, not a rave.
- Fake chemistry jargon ("Molecular synergy achieved!"), lab-coat clip-art or periodic-table-tile grids as decoration.
- Light text on the tiled wall for anything required. Colored text under 24px for Heat or Acid.
- More than one candle button per screen, or saturated color on chrome or panels.
- Confetti. Our celebration is a stamp, a halo and a name in lights.
- Gore, or anything from ref 3's splats. Sludge and smoke are as dark as it gets.

---

## 11. Open questions for the organizer
1. **Day Shift default:** should the app auto-offer Day Shift on first open between 10:00 and 16:00, or leave it as a manual toggle only?
2. **Names on shareables:** are display names on the projector and story cards fine, or should players opt in? (The mockups assume opt-out.)
3. **Isotope announcements:** do Insta drops name a rough area ("near the library")? The in-app copy currently doesn't, to keep hunting fair.
4. **Lab number:** the mockups show "LAB 1137" as a player handle. Is it derived from the student ID (with privacy implications) or random?
