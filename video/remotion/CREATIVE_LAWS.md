# CREATIVE LAWS — APUSH Video Lessons

Strict rules for building episodes. No exceptions. These govern every creative decision.

---

## 1. Pacing: Fast or Dead

- **Visual change every 5-8 seconds MAX.** No exceptions.
- If a screen sits static for 8+ seconds, it's broken. Add a beat, move the camera, swap the visual.
- **No text-only screens.** Every frame has an image, map, texture, or visual. Text floats OVER visuals, never on blank.
- **No slide-deck pacing.** If it feels like PowerPoint, kill it. This is video, not slides.

## 2. Hosts Are Mandatory

- **Maya and Marcus appear on screen.** Talking heads are not optional.
- Heads switch on speaker. The viewer always knows who's talking.
- Heads are positioned to NOT cover key visuals (bottom-right default, auto-layout handles conflicts).
- No long stretches of "voiceover over images" — the hosts ARE the show.

## 3. Visual Hierarchy

- **One idea per shot.** Don't cram three concepts into one visual.
- **Text is declarative, not decorative.** If text is on screen, it earns its place.
- **SmartText levels are law:**
  - `hero` (88px): One word/phrase. The punchline. Use sparingly.
  - `title` (68px): Section headers, key terms.
  - `subtitle` (46px): Supporting points.
  - `body` (34px): Minimum. Never smaller.
- **No small text.** If the viewer can't read it on a phone, it's too small.
- **No overlap.** Text never covers faces, text never covers text. Validators enforce this.

## 4. Images: Real, Not Decorative

- **Every image must EARN its screen time.** Ask: "What does this image SHOW that words can't?"
- **Static images get procedural life.** Ken Burns drift, parallax, subtle zoom. No frozen frames.
- **Serious scenes = photorealistic.** Disease, death, slavery, war — real images, real weight.
- **Fun scenes = semi-cartoon OK.** Jokes, asides, playful moments can use stylized visuals.
- **No flat SVG, no geometric stand-ins, no circles with initials.** Ever.
- **Maps must be period-accurate** when overlays need to align. No modern state outlines on a 1500s map.
- **Source images during creative direction**, not after. The script tells you what you need.

## 5. Tone Discipline

- **Match the visual to the emotional register.** 
  - Fun beat (potato jokes) → playful visuals, bright colors, cartoon OK
  - Serious beat (8/10 dead) → dark, real, no jokes in the visual
- **Tone shifts are deliberate.** When the script goes serious, the visuals go serious. No whiplash.
- **The ToneProvider is not decoration.** Set it per section, respect it.

## 6. Map Discipline

- **Maps show MOVEMENT, not just geography.** Arrows, routes, items traveling.
- **Direction matters.** Westbound = right-to-left on Atlantic maps. Get it right.
- **Labels are cumulative** where it helps (E2's Ortelius map). Don't make the viewer memorize.
- **One map per concept.** Don't reuse the same map for three different ideas without a reason.

## 7. Text Discipline

- **Text anchors to WORDS, not seconds.** Every text entrance is tied to a measured word time.
- **Text exits.** Don't leave text on screen after the thought is done. It becomes wallpaper.
- **No paragraphs on screen.** If you need a paragraph, you're doing it wrong. Break it into beats.
- **Emphasis is visual.** The key word gets the stamp entrance, the color, the size. Not everything shouts.

## 8. Component Discipline

- **No inline components.** Everything lives in `src/components/`, episodes import.
- **Use the library.** 70 components exist. Don't reinvent.
- **If a component doesn't exist and you need it 3+ times, build it.** If once, inline the logic in the episode (but still no inline component definitions).

## 9. Audio-Visual Sync

- **Visuals land WHEN the word is spoken.** Not before, not after.
- **Measured timing is law.** TTS → Vosk → word times → beats. Never estimated.
- **If the audio says "potato," the potato is on screen.** Not 2 seconds later.

## 10. The Heimler Test

After every act, ask:
- **Is it interesting with audio muted?** If not, the visuals are failing.
- **Would Heimler be jealous?** If not, push harder.
- **Does it feel alive or slide-deck?** Be honest.
- **Would a student rewatch this?** If it's a chore, it's broken.

---

## Enforcement

- **Validators catch mechanical violations** (overlap, small text, static screens).
- **Layer 2 checklist catches visual failures** (readability, empty frames, wrong maps).
- **Layer 3 (human) catches creative failures** (boring, incoherent, wrong tone).
- **No act advances with Layer 2 failures.** Fix first, then proceed.

These are not guidelines. They are laws.
