# Secret Catalyst: Creative Direction, "NIGHT SHIFT"

Status: round 2 complete (answers critique round 1), waiting for `design-critic`.
Artifacts: `design/tokens.css` (drop-in Tailwind v4 `@theme`), and `design/screens/` with `lab.html`, `mix.html`,
`scan-reveal.html`, `frozen.html`, `screen.html` (projector, 1920x1080), `story-card.html` (1080x1920) and
`type-test.html` (glyph confusables strip + tier silhouette test). All mockups share `screens/kit.js` (sprites, halo,
hazard: the reference implementation) and `screens/kit.css` (mirrored tokens, keyframes).

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
3. **Ref 1's soft candle bloom vs. crisp pixels.** Crisp wins. Every glow is a **stepped octagon** of 2x2 art-px blocks,
   two rings at 38% and 16%, drawn by the one `halo()` generator. There's no `radial-gradient`, CSS circle, `blur()` or soft
   `box-shadow` anywhere, and no separate "spotlight" layer. The halo is the light. (Round 1 had a radial-gradient spotlight;
   it rendered as smooth discs and is gone.)
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
   on a stepped halo, a huge pixel name and one paper note. That's the same anatomy every time, so a screenshot is recognisable
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
| Rare | Quicksilver `#e4ecf7` | **Diamond decanter**: a 6-row faceted gem stopper, a 2-px neck (the jar mouth is 8), diamond shoulders 16 px wide (the jar is 12), a tapered body on a stem and foot | 3 | 4-point sparkles; **the first sparkle is static**, so Rare reads on a still screenshot and under reduced motion | RARE |
| Isotope | Uranium `#d4ff2a` | Sealed **ampoule** with a hazard band | 4 hazard-striped pips | step flicker | ISOTOPE / UNSTABLE |
| Legendary (compounds) | Gold `#ffcb3d` | Erlenmeyer with gold stopper | 5 gold pips | gold liquid; **only the 1-px meniscus** steps through the 6 catalyst colors (a glint, not a rainbow) | LEGENDARY |

Silhouettes in one line: jar = rectangle, flask = bulb, decanter = diamond on a foot, ampoule = banded capsule, Erlenmeyer = triangle.
`type-test.html` section 5 shows all five in color, grayscale and solid ink silhouette on both shifts. If the solid row reads, shape carries rarity alone.

Compounds always use the **Erlenmeyer**. Basic compounds use Sage liquid. Catalyzed compounds take **the catalyst's color** plus its icon chip
**on the owner's own phone only**. Public surfaces use the **sealed flask** (section 8b).
Compound rarity is shown by pips and tag. `frozen.html` still proves shape carries tier: K (flask) and Zn (diamond decanter) frozen to one color.

### Sealed (public surfaces only)
| Name | Hex | Role |
|---|---|---|
| Seal wrap | Parchment `#eadf9e` / `#c9b96a` | Liquid stand-in for any catalyzed compound on the projector, story cards and feed. Reads as "wrapped specimen". |
| Wax | Alarm `#ff4b3e` | The stopper on a sealed flask |
| "?" | Ink | 5x7 question mark drawn on the wrap |
Sealed flasks glow **Candle**, never the catalyst's color.

---

## 4. Typography

Round 1's Pixelify Sans is **dropped**. It merged C/O, 5/S, B/8 and Z/2, and it isn't drawn on a fixed grid, so it anti-aliased.

| Role | Face | Weights | Sizes (px) | Usage |
|---|---|---|---|---|
| Display / pixel | **Silkscreen** (Jason Kottke; Google Fonts, OFL; `Silkscreen-Regular.ttf` in google/fonts for `next/og`) | **400 only** | **Multiples of its 8px em only:** 16 tag/label · 24 HUD, buttons, card heads · 32 title, points · 40 stamp · 48 / 64 hero name · 80 / 96 timer | Stamps, hero names, buttons, tags, LED signs, HUD labels, and **pure-digit tokens 24px or larger** (score, rank, points, timers, clock). Uppercase only. |
| Game-state glyphs | **Atkinson Hyperlegible 700**, tabular figures (`.font-num`) | 700 | any | **Every element symbol** (bottles, chips, rig tags), **every formula**, and **any digit inside a mixed letter+digit string or below 24px** ("LAB 1137", "BOTTLE 3 OF 5", "U-235", "15:39" in a log heading). Its slashed 0, tailed l, flagged 1 and open C are why it was designed. |
| Body | **Atkinson Hyperlegible** | 400, 700 | 16 min · 17 to 18 for key sentences · 14 only for plate captions on label stock | Every sentence: riddles, notes, explanations, names on boards. |

Why Silkscreen, and what I rejected:
- **Silkscreen**: an 8px bitmap em, so its sizes (8, 16, 24, 32...) land on our 4px phone grid, the 8px projector grid and the 12px story grid (24, 48, 96). At about 5 glyph pixels per letter, "SYNTHESIZED" should fit at 40px on a 390 phone and "AMMONIA" at 144px on the card (the round-2 shots will confirm it). It ships on Google Fonts, so `next/font/google` works with no self-hosting.
- **Departure Mono** (OFL, self-host from GitHub): rejected on grid, not taste. It's an 11px grid (11/22/33/44), and 11 isn't a multiple of 4, so it can never sit on our pixel grid.
- **Press Start 2P** (Google, 8px grid): runner-up. It passes on grid, but at 8px per glyph advance "HYDROGEN" is 512px at 64, too wide for the phone hero. It's in `type-test.html` for comparison.
- **The honest caveat:** I can't render glyphs from here. `type-test.html` is the verification instrument: `C O 0 Q D · S 5 · B 8 · Z 2 · I l 1 · G 6 · Cu Co Ca Cl Zn Si S` at 16 to 96px in Silkscreen (Night, Bench and Day stock), Atkinson at 14 to 40, plus Press Start 2P and Pixelify as baselines. The rules above are built so correctness **doesn't depend** on Silkscreen's 0 vs O or lowercase (it draws lowercase as small caps). Mixed tokens and symbols never use it. If the strip shows Silkscreen failing S/5, B/8 or Z/2 at 16px, tags at 16 switch to Atkinson 700 uppercase. Nothing else has to change.

Rules:
- **Silkscreen only at multiples of 8, weight 400, `letter-spacing: 0`, `font-synthesis: none`.** No faux bold (it smears the grid). If you want letter-spacing, add whole glyph pixels (size ÷ 8).
- Line-height equals the font size (or a multiple of 8) and boxes sit on integer pixels, so glyph edges land on device pixels.
- **Body text is 700 weight by default** outdoors. Use 400 only on Day Shift or long-form (rules page).
- A hero name steps down 64 → 48 → 32 to stay on one line. Never wrap a stamp or a hero name. Hero names carry no digits: isotopes show "URANIUM" and put "isotope 235" in the Atkinson subtitle.
- Projector: minimum 24px for anything, 28px for sentences. Story card: minimum 32px.
- Implementation: `<Num>` (or `.font-num`) wraps digits inside pixel strings. `next/font/google` setup is in the header comment of `tokens.css`.

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
| Day Shift | A toggle in the lab scene that shows **a sun or moon icon plus the state it switches TO** ("DAY SHIFT" / "NIGHT SHIFT"). It's a **manual toggle only** (organizer decision: never switches on automatically); the choice is remembered per device. Same layout. Halos are hidden. Text-muted becomes `#34505a` (7.1:1). |
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
- `src/lib/sprites.ts`: the `SPR` string grids and the `P` / `LIQ` palettes, copied verbatim from `design/screens/kit.js` (one file now, not six copies).
- `<Sprite name tier liquid scale sealed? />`: a server component that run-length-encodes rows into `<rect>`s (`rects()` in `kit.js` is the reference implementation).
- `<Halo r color scale q=2/>`: `haloRects()` in `kit.js`, a stepped octagon of q x q blocks. It's the **only** way to draw light. `<Hazard w h scale/>` works the same way.
- Animation is CSS only: classes `.bub`, `.spk`, `.iso`, `.prism` (meniscus only), `.blinkA` (alarm lamp) and `.f1`/`.f2`/`.f3` map to the keyframes in `kit.css` / `tokens.css`.
- `next/og` story cards: render the same SVG string to a data URI `<img>`, load `Silkscreen-Regular.ttf` and `AtkinsonHyperlegible-Bold.ttf`,
  replace the ⭐ emoji (it renders blank in Satori) with the `star` sprite, and only ever call the card with **public** data (section 8b).
- Tailwind v4: `@theme` in `tokens.css` sets `--spacing: 4px` (so `p-2` = 2 art px) and zeroes every radius.

---

## 7. Motifs and textures

- **Stone tile wall:** 4px seams on 96x64 (ref 1). It's the only background texture. There's no noise or grain overlay, because grain kills sun legibility and screenshots.
- **Bottles on planks:** the lab shelf is real shelves. Each shelf is a plank and each bottle has a clinic **plate** under it (name + pips).
- **Paper notes with a red pin:** parchment notes hold secrets: riddles, the lab log, "first in the lab". The pin is a 3x3 alarm pixel square with an ink ring.
- **LED sign:** bench panel with LED-green Silkscreen for screen titles (MIX BENCH, LAB 1137) and the stamp on success.
- **Holo monitors:** teal panels for score, rank and points chips (ref 2).
- **Apparatus rack (ref 4):** the mix bench shows the player's tubes feeding orthogonal glass pipes. Liquid "marches" as a 2-on/2-off dash, passes the catalyst icon, and lands in the flask.
  While building, the flask is **empty**, and it fills only on success.
- **Stepped halo:** a 2x2-block octagon, 2 rings at 38% and 16% alpha, in the tier or catalyst color (Candle on public surfaces).
  **Stamps always sit above the halo**, and the halo **ends at least 16px above the hero name**, so the name and its subtitle sit on plain wall
  (white name; Clinic-shade subtitle at 7.3:1). The reveal layout is fixed: halo y128 to 352, name at 372.
- **Alarm lamp (ref 2):** an 8x6 lamp hanging from the mix rack. It's dim at rest. On a failed mix it lights, gets a stepped red halo and blinks in `steps(1)`, alongside the red NOTHING panel.
- **Sealed flask:** the public face of every catalyzed compound: parchment wrap, red wax stopper, ink "?", Candle halo.
- **Colored rack:** feed pipes are filled with each reagent's tier liquid, and the post-catalyst pipe carries the catalyst color. The dash only marches during the **running** state (1.6s, input locked, flask filling from the bottom in steps).
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
- Never leak an exact QR spot or a locked hint in shareable copy. Isotope-drop announcements may name a rough area ("somewhere near the library") — organizer decision.

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
| Projector feed, lending | **Aisha N** lent a catalyst. 9th time. |
| Projector hero, first discovery | UREA · +25 · CATALYZED ? · Meera K, 15:42. How? Revealed at the finale. |
| Under POST IT (private screen) | Your post shows the name and the time. The catalyst stays sealed. |

---

## 8b. Public surfaces keep the secret (hard rule)

The spec says only the player sees their own catalyst, and the locked hint (exact catalyst + quantities) is something you pay for.
So anything **other people can see while the game is live** follows this rule:

| Surface | During play: SHOW | During play: NEVER SHOW |
|---|---|---|
| Projector hero, projector feed, story cards, Insta captions, share text | Compound **name**, **tier tag + pips**, **points**, **first discoverer's name + time**, a **CATALYZED ?** chip (the `q7` / `i_mystery` "?" icon on parchment) | The **formula** (it is the recipe quantities), the **catalyst name, icon or color** (liquid and halo included), **who lent** a catalyst, or which catalyst anyone holds |
| Feed lines about lending | "**Aisha N** lent a catalyst. 9th time." | "lent Heat" |
| Your own phone (SYNTHESIZED, lab shelf, mix bench) | Everything: formula, catalyst chip, liquid color, lender ("+6 to Kabir for the Pressure") | |

- Catalyzed compounds on public surfaces render as the **sealed flask** with a **Candle** halo. Basic compounds keep their Sage liquid (there's nothing to hide), but still show no formula.
- **Finale and Lab Recap** are the reveal. The sealed flask cracks open (3-step stamp), and the formula, catalyst chip and lender credits appear. That's a second, separately shareable moment.
- `next/og` and the projector API should take a **public DTO** that doesn't contain `formula`, `catalyst` or `lender` at all, so the rule is enforced by data, not by template discipline.

---

## 9. Riddle voice

The riddles in `content/catalog.json` were rewritten in round 1 and re-checked in round 2. They're all on-voice, so I made no further edits.
Riddles may hint at a catalyst with a verb ("squeezes"): that's the intended free clue. They must never be quoted on a public surface next to the compound they solve.
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
- Keep story-card content inside y 240 to 1680 (Instagram UI covers the rest). Every card carries its owner ("MEERA K · LAB 1137") and a way in (the join QR plus "Hunt the QRs. Borrow a catalyst. Beat this.").
- Let the wall be empty. Negative dark space is the mood.
- Draw every glow with `halo()`. Check that a reveal's halo ends 16px above the name.
- Run new strings with digits or symbols past `type-test.html`.

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
- `radial-gradient`, CSS circles, `border-radius: 50%` glows or "spotlight" overlays. They render as smooth discs and break the one grid.
- A pixel font at a non-native size (14, 18, 20, 28px), faux-bolded, or letter-spaced in fractions of a glyph pixel. Element symbols or formulas in the pixel face.
- A catalyst name, color or formula on anything public before the finale. That includes a purple flask on a story card.
- A full-rainbow Legendary. The prism is a 1-px meniscus glint on gold.

---

## 11. Organizer decisions (2026-11-27)
1. **Day Shift:** manual toggle only; never switches on automatically.
2. **Names on public screens and story cards:** shown by default; players can opt out.
3. **Isotope announcements:** may hint at a rough area ("near the library"), never the exact QR spot.
4. **Lab number:** derived from the player's college ID (the digits of the BITS ID, e.g. f2024**0248** → LAB 0248).

## 12. Round 2 changes (answers critique round 1)

**Blocking**
1. **Type.** Pixelify Sans is replaced by **Silkscreen** (8px bitmap em, Google Fonts, OFL, TTF for `next/og`). It's used only at multiples of 8, weight 400, letter-spacing 0, with `font-synthesis: none`. **Atkinson Hyperlegible 700** now sets every element symbol, every formula, and any digit in a mixed or sub-24px string (`.n` / `.font-num`). Departure Mono was rejected because its 11px grid can't sit on our 4px grid, and Press Start 2P was too wide. New `design/screens/type-test.html` renders `C O 0 Q D · S 5 · B 8 · Z 2 · I l 1 · G 6 · Cu Co Ca Cl Zn Si S` at 14 to 96px on Clinic, Bench and Day stock, with Pixelify as the failing baseline. The isotope hero is now "URANIUM", with "isotope 235" in the subtitle.
2. **Public surfaces keep the secret** (new section 8b). The projector hero and story card show name, tier, points, first discoverer and time, and a **CATALYZED ?** chip, on a **sealed flask** (parchment wrap, wax, "?") with a Candle halo. Formula, catalyst name or color, and lender are removed. The feed now says "Aisha N lent a catalyst. 9th time." Full reveal moves to the finale and the Lab Recap. The private SYNTHESIZED screen keeps everything and adds the line "Your post shows the name and the time. The catalyst stays sealed."
3. **No smooth circles.** The `.spot` radial-gradient layers are deleted. Every glow (reveal heroes, lab lamp, shelf glows, projector, story card, alarm lamp) comes from one `halo()` generator, a 2x2-block stepped octagon. Reveal halos end at y352, the hero name starts at y372 on plain wall, and the subtitle is Clinic-shade at 7.3:1. On the story card the halo ends at y1116 and the name starts at y1140.
4. **Rare has its own silhouette.** It's now a diamond decanter: a 6-row gem stopper, a 2-px neck, 16-px diamond shoulders, and a stem and foot. The first sparkle is static. `type-test.html` section 5 shows all 5 tier vessels in color, grayscale and solid ink silhouette on Night and Day.

**Should-fix items done**
- SYNTHESIZED: the Kabir line moved inside the FIRST IN THE LAB note as its last line, in ink. No catalyst-colored small text.
- Story card: an owner plate ("MEERA K · LAB 1137") under the stamp, plus a QR and CTA at y1572 to 1680. Safe-area guides render only with `#guides`, so `next/og` can't ship them.
- Mix rack: pipes are filled with reagent liquid. New **RUNNING** frame (marching dash, flask filling from the bottom, input locked). The **ref-2 alarm lamp** lights and blinks on a failed mix.
- Legendary is specified as gold with a meniscus-only prism, and rendered in the tier sheet.
- Projector: kickers are now 24px, columns are labelled (PLAYER / COMPOUNDS / SCORE), the race values read "14 compounds" and "248 pts", and the ticker's "holds ACID" line became "holds what you need".
- Lab shelf: rows are tightened so the last plate row clears the SCAN overhang (ends at y720, SCAN starts at y724). The scroll container gets 32px of bottom padding.
- The Day/Night toggle shows a sun or moon icon plus the target state, and is auto-offered 10:00 to 16:00.
- All mockups now share `kit.js` and `kit.css`, so there's one sprite source instead of six diverging copies.

**Not done this round:** the Hint Book, Lend Catalyst and Black Market reveal screens, and a Legendary on the Compounds shelf tab or as a SYNTHESIZED hero (it's only in the tier sheet). These are next in line.
