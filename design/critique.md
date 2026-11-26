# Secret Catalyst: Design Critique

Critic: `design-critic`. Rounds are appended and earlier rounds are never deleted.

---

## Round 1 — VERDICT: REVISE

Judged from the rendered shots in `design/screens/shots/` (lab, mix, scan-reveal and frozen at 1400x1000 with 390x844 frames, screen at 1920x1080, story-card at 1080x1920), compared against all 4 contact sheets plus `ref-2-03.jpg` and `ref-3-06.jpg`. I checked suspect glyphs by cropping and zooming the PNGs with nearest-neighbour scaling.

### What works (keep)
- **"Dark room, light labels"** is a real answer to the sun problem, not a compromise. Everything you need to play sits on clinic, parchment or holo stock with ink text. Day Shift (lab.png, frame 02) keeps the same layout and reads clearly as ref 3's clinic palette. Keep both.
- **Rarity by shape, pips and tag.** Jar, flask, decanter and ampoule, plus 1 to 4 pips on the plate and a text tag. `frozen.png` proves the point: K and Zn are frozen to the same liquid and still read as different vessels. Keep it, but see must-fix 4 about Common vs Rare.
- **Reveal anatomy** (stamp, halo, hero vessel, name, note) is consistent across COLLECTED, UNSTABLE, ALREADY SHELVED, SYNTHESIZED and LAB FROZEN. A post is recognisable at thumbnail size. The stamped-halo hero flask on the story card is the strongest frame in the set.
- **Failed mix** (mix.png, frame 02) is understood in under a second: brown sludge, a smoke puff, a red NOTHING. panel and 2 of 3 pixel-X strikes. The lab-log note that hints "somebody has to squeeze" is exactly the right voice.
- **Frozen** is the best screen. Icicles, the ice block, a 96px timer, queued scans, and the turn toward "Lending isn't [frozen]" keeps a frozen player in the social loop. LEND HEAT as the only candle button is correct.
- **SCAN** is an 88px candle block in the thumb zone with one candle button per screen. It's easy to find while walking.
- **Buildability.** Sprites are string grids that run-length-encode to `<rect>` SVG, motion is CSS `steps()`, and there are no raster assets or engine. This is fine on mid-range Android and in `next/og`.
- **Voice.** Deadpan, digits, no exclamation marks ("No points for twins", "Twelve, actually"). Keep it.
- Gore from ref 3 was correctly rejected.

### Must fix (blocking)

1. **The display face fails glyph discrimination, and the game depends on those glyphs.** I confirmed the reported C/O problem in the shots, and it's worse than reported:
   - **C and O are identical.** On the lab shelf (lab.png, row 1) the Carbon jar and the Oxygen jar both read "O". The mix chip row reads "O O Na Ol Fe", so Carbon is indistinguishable from Oxygen and Cl reads "Ol". The locked Copper reads "Ou". Branding reads "SEORET OATALYST" (screen.png, story-card.png).
   - **5 and S are the same, and 5 is close to 8.** "URANIUM-235" renders "URANIUM-23S" and "+50" renders "+S0"/"+80" (scan-reveal frame 02, checked at zoom). On the projector, scores 588, 551 and 455 read "S88", "SS1" and "4SS".
   - **B and 8 are the same.** "LAB" reads "LA8", "BAD MIXES" reads "8AD MIXES" and "BITS DUBAI" reads "8ITS DU8AI".
   - **Z and 2 are the same.** "SYNTHESIZED" reads "SYNTHESI2ED", "LAB FROZEN" reads "LA8 FRO2EN", and the Zn bottle reads "2n" (frozen.png).
   - Pixelify Sans at 14, 16 and 24px is also **rendered anti-aliased**, with soft grey edge pixels on every glyph in the zoomed HUD crop. That breaks pillar 3 ("no anti-aliased blur") in the most visible element on screen.

   Element symbols, scores, points, timers and formulas are game state. A player who can't tell C from O or 5 from 8 will mix the wrong thing. **Fix I'd accept:**
   - (a) Replace Pixelify Sans with a pixel face drawn on a fixed bitmap grid, used only at integer multiples of that grid so it renders crisp. Candidates: **Departure Mono** (OFL, self-host, 11px grid: 11/22/33/44/66/88), **Silkscreen** (Google, 8px grid: 16/24/32/40/48/64, caps) or **Press Start 2P** (Google, 8px grid, wide, so only for stamps and numbers). It must ship as a TTF for `next/og`.
   - (b) Add a **glyph test strip** to the mockups and the shots: `C O 0 Q D · B 8 · S 5 · Z 2 · I 1 l · G 6 · Cl Cu Co Zn` at 14, 16, 24, 40 and 96px, on both Night and Day stock. Every pair must be distinguishable at 100% zoom.
   - (c) If no pixel face passes at 14 to 16px, **element symbols on bottles and chips, the HUD score and all numbers below 24px switch to Atkinson Hyperlegible 700**, and the pixel face is kept for stamps, hero names and timers only. Drop the rule "Numbers are always Pixelify."
   - The size floor alone won't fix it. C and O already merge at 40px ("COLLECTED") and 64px ("SECRET CATALYST" on the story card).

2. **Public surfaces leak the secret mechanics.** The spec says "Only the player can see their own catalyst", and the locked hint is what "names the exact catalyst or gives the quantities". The direction itself says never leak a locked hint in shareable copy. The mockups break this in four places:
   - The projector feed says "Aisha N lent **Heat**. 9th time.", which outs her catalyst to the whole hall.
   - The projector hero says "**Rohan lent the Pressure**." That outs Rohan, and the PRESSURE chip gives away Urea's locked hint.
   - The projector shows Urea's formula "CH4N2O". The formula *is* the recipe quantities, which is the other half of the locked hint.
   - The story card shows **NH3 + PRESSURE**, which is the complete recipe on Instagram. If the player used their own catalyst, it also outs them.

   **Fix I'd accept:** while the game is live, the projector and story cards show **compound name, rarity tag, points, the first-discoverer's name and time, and a "CATALYZED" chip with a mystery "?" icon**. They never show the formula, the catalyst name, or a lender name. Feed lines become "Aisha N lent a catalyst. 9th time." The full catalyst, formula and lender reveal moves to the finale and the Lab Recap. The player's private SYNTHESIZED screen can keep everything.

3. **Smooth circles contradict the one-grid rule and break text contrast.** The `.spot` "quantised spotlight" in `scan-reveal.html` and `mix.html` is a CSS `radial-gradient(circle …)`. In the shots it renders as large **anti-aliased smooth discs** behind the stepped halo, visible as curved edges on scan-reveal frames 01 and 02, mix frame 03, and the full width of story-card.png. The lab-shelf glows behind Ag and U are smooth too. The hero subtitle sits on these rings. "the heavyweight" is Fog text on the 38% and 16% uranium rings, which I estimate at about 2:1 to 3.7:1, below AA. That text is the nickname the riddles use, so players need to read it.

   **Fix I'd accept:**
   - Draw every spotlight and glow with the same stepped `<Halo>` rect generator on the 4px grid (8 on the projector, 12 on the story card). No `radial-gradient` and no CSS circles anywhere.
   - The halo must end at least 16px above the hero name, so the name and subtitle sit on plain wall.
   - The subtitle must be White or Fog on plain Wall, at 4.5:1 or better.

4. **Common and Rare can't be told apart at a glance.** Common is sage `#9fc2b8` in a rectangular jar. Rare is quicksilver `#e4ecf7` in a rectangular-bodied decanter. They're the two palest, most desaturated vessels with near-identical silhouettes, and only the stopper differs (lab.png: H jar vs Ag decanter). The most valuable element tier looks *less* exciting than cyan Uncommon. In sun at arm's length, Ag looks like a common jar with a glare spot.

   **Fix I'd accept:**
   - Give Rare a silhouette that differs from the jar at 1x. For example, a faceted, diamond-shouldered decanter at least 2 art px narrower at the neck and 2 wider at the shoulder, with a visible gem stopper that's 3 art px or taller.
   - Keep the 4-point sparkle on the resting frame (it's visible with reduced motion too).
   - Add a **grayscale silhouette test strip** to lab.html: the 5 tier vessels at 1x, desaturated, side by side. All 5 must be distinguishable.

### Should fix (non-blocking)
- **SYNTHESIZED phone screen (mix frame 03):** "+6 to Kabir for the Pressure. Be nice to Kabir." touches the bottom edge of the FIRST IN THE LAB note with 0px gap. "Pressure" is purple text at about 15px on the wall, which is below the direction's own 16px floor for catalyst-colored text. Move the line inside the note as its last line, or leave a 16px gap and set "Pressure" in White.
- **Story card has no owner or invitation.** There's no player name or lab number, and nothing tells a viewer where to play. Add "MEERA K · LAB 1137" on label stock under the stamp, and a short URL or QR in the lower safe zone (y 1560 to 1680). The direction says "Put real names on things" and the card doesn't.
- **Mix rack under-delivers on ref 4.** The pipes carry a white/grey dash, so the reagents have no color and the rack reads as a wireframe. Color each feed pipe with its element's tier liquid and merge them at the catalyst node. Also mock the **running** frame between SYNTHESIZE and the stamp (liquid marching, flask filling in `steps()`), because that's the hypnotic moment ref 4 is about.
- **Failed mix borrows nothing from ref 2's alarm lamp.** Add a small red alarm-lamp sprite to the rack with a stepped 2-frame pulse on a failed mix. It's cheap, on-reference, and it pairs with the red panel so the state isn't conveyed by the panel alone.
- **Legendary tier isn't rendered anywhere.** "Liquid steps through all 6 catalyst colors" could easily turn into a rainbow cliché. Show one Legendary on the lab shelf (Compounds tab) and one as a SYNTHESIZED hero before Round 2.
- **Projector type below its own 24px floor:** "SPEED CHEMIST", "MASTER OF THE OBSCURE" and "LAB CLOSES IN" are about 14px at 1920. Raise them to 24px. Also label what "· 14" and "· 248" mean ("14 COMPOUNDS", "248 PTS").
- **Lab shelf scroll edge:** the bottom plate row (Silver, Lithium, Gold, U-235) has its pips cut off by the nav, and the SCAN block overlaps the U-235 plate at rest. Give the nav a 4px ink top border and pad the scroll content by the SCAN overhang (about 32px) so the last row rests fully visible.
- **DAY/NIGHT toggle label is ambiguous** (does it show the current state or the action?). Use a sun or moon pixel icon plus the target state ("DAY SHIFT"). I'd also answer open question 1 with "yes, auto-offer Day Shift from 10:00 to 16:00 on first open." It's an afternoon outdoor game.
- **Missing screens that carry core loops:** the Hint Book (parchment riddles, locked hint), Lend Catalyst (10:00 code) and the Black Market reveal. The spec calls the Black Market reveal "a great story-card moment". They don't block the direction, but Round 2 should show at least the Hint Book.
- The "IG SAFE TOP/BOTTOM" guide lines and labels on story-card.png are mockup annotations. Make sure the `next/og` template can't render them.

### Reference check
- **Ref 1 (candlelit lab):** honored. The bottle-green stone-tile wall, cyan flask over a candle, parchment notes with a red pin (the JUNE note becomes LAB NOTES) and quiet stepped motion are all there. The weak spot is that the room only appears in a roughly 130px header vignette on the lab screen, and the candle's warm pool is tiny.
- **Ref 2 (industrial lab):** partially honored. The holo-teal HUD chips and hazard stripes (isotope, projector ticker) are on-reference. The monitor graphs and the red alarm-lamp glow, ref 2's signature, are absent.
- **Ref 3 (clinical lab):** honored as the Day Shift palette and the green LED sign lettering (MIX BENCH, LAB 1137, stamps). Its gore was correctly rejected.
- **Ref 4 (apparatus rack):** partially honored. The rack exists on the mix bench (tubes, coils, catalyst node, flask), but the saturated colored liquid flowing vessel to vessel, the whole point of ref 4, is missing because the pipes are colorless and there's no running-state mockup.
