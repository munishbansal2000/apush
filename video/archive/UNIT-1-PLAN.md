# UNIT 1 PLAN — Period 1, 1491–1607 (video transcripts, scene-based)

Converged from 4 competitor transcripts (see video/TRANSCRIPT-CONVERGENCE-u1.md).
Rule: structure and facts converge; every line of prose is original.

## Unit thesis
Geography wrote the first draft of American history — then contact rewrote it in blood.
Five videos, one emotional arc each, ~6 minutes each.

## The five videos

| # | Title | Chapter | Arc | Job |
|---|---|---|---|---|
| vid-u1-01 | The World in 1491 | 1.1a | wonder | Regional survey: every society gets its organizing fact |
| vid-u1-02 | Three Ways to Live in America | 1.1b | the click of understanding | Causal engine: maize → surplus → hierarchy |
| vid-u1-03 | Why Europe Sailed West | 1.2 | ambition | Motives: the question 3 of 4 transcripts never ask |
| vid-u1-04 | Conquest, Silver, and the Exchange | 1.3a | awe curdling into horror | Mechanism: how 600 men toppled an empire; what moved both ways |
| vid-u1-05 | Who Had the Right? | 1.3b | moral argument → defiant lift | Debate in two voices; closes the unit on 1680 resistance |

## TTS delivery system

### Voice cast (roles; he picks the actual voices in Fish/Edge)
- **HOST** — the through-line narrator. Smart, fast, wry. Never a lecturer; a fellow traveler who did the reading. Carries all 5 videos.
- **WITNESS** — primary-source voice. Reads Columbus's journal, de Bry's captions, Aztec accounts. Older, flatter, period weight. Used in u1-03, u1-04.
- **LAS CASAS** — u1-05 only. Passionate, ragged, guilty.
- **SEPÚLVEDA** — u1-05 only. Cold, precise, Aristotelian.
- **POPÉ** — u1-05 closer only. Quiet, certain. One scene, and it must land.

### Direction tags (unified — compiles to either engine)
Pipeline-native (render_narration_fish.py already parses these):
- `[beat]` — dramatic half-second pause
- `[pause:N]` — timed silence, N seconds
- `[slow]`…`[/slow]`, `[fast]`…`[/fast]` — rate shifts
- `[emphasis]`…`[/emphasis]` — stressed phrase

Performance direction (renderer maps to Edge SSML styles or Fish emotion refs):
- `[wry]`, `[awed]`, `[solemn]`, `[fierce]`, `[whisper]`, `[urgent]` — emotional color
- `[VOICE:NAME]` — speaker switch mid-script
- `[refrain]`…`[/refrain]` — the memory line; delivered identically every repetition

Edge SSML mapping: emotion → `<mstts:express-as style="…">`; rate → `<prosody rate="…">`;
pauses → `<break time="…"/>`; speaker → `<voice name="…">`. Fish mapping: pipeline tags
direct; emotion via the voice's reference performance.

### Delivery laws (from the convergence)
1. Cold opens land the paradox first — never "hey students."
2. One emotional arc per video (table above); mark it in stage directions.
3. Pace is punctuation: fast/clipped for lists and triads, half-speed for landings.
4. Two voices where argument lives (u1-05 debate; u1-03 journal).
5. Direct address rationed to scene pivots ("picture this," "now freeze this").
6. Refrains repeat 3× per video, never 5×.
7. Every video ends on a forward lean into the next.

## Scene breakdowns

### vid-u1-01 "The World in 1491" (~360s) — wonder
1. **Hook (0:00–0:30):** paradox — the largest city in North America rivaled London, and you've never heard of it. [awed]
2. **Frame (0:30–1:10):** geography sets the menu — map draws three zones. [refrain #1: "the environment sets the menu"]
3. **Eastern Woodlands (1:10–2:40):** Cahokia/Mississippians (20,000; Monks Mound) + Iroquois Confederacy — a consensus constitution against Europe's kings. Numbers + mechanism.
4. **Great Plains (2:40–3:40):** mobile bison bands; the horse hasn't arrived yet — this is the BEFORE picture.
5. **Southwest (3:40–4:30):** Pueblo irrigation towns; desert caps growth.
6. **Mesoamerica & Andes (4:30–5:30):** Aztec/Maya/Inca at scale — Tenochtitlan 200,000+, bigger than Seville. Organizing fact each: tribute + chinampas; terrace + quipu.
7. **Outro (5:30–6:00):** none of these worlds were static — forward lean: "next, the engine that made them different."

### vid-u1-02 "Three Ways to Live in America" (~360s) — the click
Full screenplay + run sheet already exist (12 scenes, 5 AI clips). Full TTS
performance script below in this file's appendix. Thesis: maize → surplus →
staying put → hierarchy → cities. [refrain: "surplus is the mother of hierarchy."]

### vid-u1-03 "Why Europe Sailed West" (~360s) — ambition
1. **Hook (0:00–0:30):** the richest prize on earth was a shortcut — the Ottoman price squeeze. [urgent]
2. **Reconquista mindset (0:30–1:30):** 700 years of holy war ends in 1492 — Spain is a crusader state with an army and nowhere to point it. [fierce]
3. **The technology (1:30–2:30):** Prince Henry's school — caravel, lateen sail, astrolabe. Mechanism, not magic.
4. **The gamble (2:30–3:40):** [VOICE:WITNESS] Columbus's journal; his math was wrong — F&I funded him because three small ships were a cheap lottery ticket.
5. **The papal line (3:40–4:40):** Tordesillas — a pope literally divides the world. Map animation.
6. **The triad (4:40–5:20):** gold, God, glory — with the honest hierarchy: [refrain] "gold first." [wry]
7. **Outro (5:20–6:00):** they found a world on no map — forward lean to conquest.

### vid-u1-04 "Conquest, Silver, and the Exchange" (~360s) — awe → horror
1. **Hook (0:00–0:30):** 600 men toppled an empire of millions. How? [urgent]
2. **The real answer (0:30–2:00):** not just guns — smallpox, Tlaxcalan alliances, steel, horses. Mechanism over myth. [solemn]
3. **Potosí (2:00–3:10):** the silver mountain — the engine of Spain's empire; the price revolution in Europe. Counter: tons of silver.
4. **The Exchange, both ways (3:10–4:40):** [fast] itemized — to Europe: maize, potato, tomato, tobacco; to the Americas: wheat, sugar, horse, pig, smallpox. Effects: Europe's population boom; the horse remakes the Plains.
5. **Labor (4:40–5:30):** encomienda → the dying workforce → African slavery. The mechanism, not the slogan. [solemn]
6. **Outro (5:30–6:00):** horror landing — "and Spain asked itself whether any of this was right." Forward lean to the debate.

### vid-u1-05 "Who Had the Right?" (~360s) — argument → defiant lift
1. **Hook (0:00–0:30):** "Were the conquistadors heroes or criminals? In 1550, Spain put itself on trial." [solemn]
2. **The Spanish case, fairly (0:30–1:30):** protection + faith — steelman before the debate. [VOICE:HOST, even]
3. **Sepúlveda (1:30–2:40):** [VOICE:SEPÚLVEDA] Aristotle, natural slavery — cold, precise.
4. **Las Casas answers (2:40–4:00):** [VOICE:LAS CASAS] passionate, ragged — and his tragic irony: he once proposed African labor, then spent his life regretting it. [fierce]→[solemn]
5. **The verdict (4:00–4:50):** it changed little on the ground — but invented the language of human rights.
6. **Closer: 1680 (4:50–6:00):** [VOICE:POPÉ] the Pueblo Revolt — the only successful Native revolt, Spaniards expelled for twelve years. [quiet]→[fierce] Defiant lift. End of Unit 1.

## APPENDIX — vid-u1-02 full TTS performance script (360s)

Arc: the click of understanding. Voice: HOST throughout. Refrain (3×):
[refrain] "surplus is the mother of hierarchy." [/refrain]

---

**SCENE 1 — HOOK OPEN (0:00–0:10)** · AI clip 1 · title slam at 0:01
[VOICE:HOST] [awed]
In 1491, North America held not one civilization — [beat] but three completely
different ways of being human.

**SCENE 2 — HOOK (0:10–0:40)** · pan across de Bry engraving · slam "MAIZE = DENSITY = COMPLEXITY" at 0:30
[VOICE:HOST]
This is Florida, drawn from a French expedition's report. Row after row of planted
maize. And here's what most textbooks bury: [emphasis] maize wasn't just food.
[/emphasis] [pause:0.6] Where maize grew reliably, people stayed in one place.
Where they stayed, populations exploded. And where populations exploded, strangers
had to figure out how to live together — [fast] rulers, priests, armies, cities.
[/fast] [beat] This planting row is the seed of everything in this video.

**SCENE 3 — THE QUESTION (0:40–1:20)** · map fills 3 regions · counter "3" · "WHY DID THEY DIVERGE?" at 1:10
[VOICE:HOST]
Geography dealt three different hands. [pause:0.5] In the river valleys of the
East: deep soil, long summers — maize on a massive scale. On the Great Plains:
oceans of grass and millions of bison — but no reliable farming, so people kept
moving. In the arid Southwest: maize only where desert rivers ran, so people
clustered tight around water. [beat] Same continent. Mostly the same crop. Three
totally different societies. [slow] The question this video answers: why? [/slow]

**SCENE 4 — WAY 1 OPEN (1:20–1:30)** · AI clip 2 · lower third "WAY 1 — THE EAST"
[VOICE:HOST]
First — the East. [pause:0.4] Where the rivers ran, cities rose.

**SCENE 5 — WAY 1: CAHOKIA (1:30–2:40)** · zoom into mound · counter 0→20,000 at 1:50 · "NO WHEELS. NO DRAFT ANIMALS. NO METAL." at 2:10
[VOICE:HOST] [awed]
This is Cahokia, outside modern St. Louis. Around the year 1200, [emphasis]
twenty thousand people [/emphasis] lived here — as large as London. At its
center, Monks Mound: a hundred feet of packed earth, built basketful by
basketful — [slow] with no wheels, no draft animals, no metal tools. [/slow]
A temple on top. A stockaded city with guard towers below. [beat] This wasn't a
village. It was a chiefdom — one paramount chief who could command thousands of
laborers. And it all rested on maize. The Mississippi floodplain grew corn in
such surplus that not everyone had to farm — which meant artisans, priests,
soldiers, rulers. [refrain] Surplus is the mother of hierarchy. [/refrain]
[pause:0.8] [solemn] But here's what students miss: Cahokia was already declining
before any European arrived. Drought, deforestation, maybe revolt — by 1400 it
stood largely empty. [slow] Complexity is fragile. [/slow]

**SCENE 6 — WAY 2 OPEN (2:40–2:50)** · AI clip 3 · lower third "WAY 2 — THE PLAINS"
[VOICE:HOST]
Second — the Plains. [pause:0.4] No maize. No cities. A totally different answer.

**SCENE 7 — WAY 2: THE BISON ECONOMY (2:50–3:55)** · pan across Catlin hunt · counter "MILLIONS OF BISON" · "SPEED WAS THEIR SURPLUS" at 3:30
[VOICE:HOST]
The Great Plains are a sea of grass — and the open Plains were brutally hard to
live on. Little wood, little stone, and the bison — [emphasis] millions [/emphasis]
of them — too fast to catch on foot. So Plains peoples lived as small, mobile
bands: following the herds, living in tipis they could pack in an hour,
organizing around the hunt instead of the harvest. [beat] Then the Spanish brought
the horse — [urgent] and everything changed. [/urgent] A hunter on horseback could
take bison at will. The Plains began to support the Lakota, the Comanche — mounted
powers built on mobility itself. [pause:0.6] Notice the contrast: the Mississippians
built power by staying put and stacking surplus grain. The Plains built power by
moving. [refrain] Speed was their surplus. [/refrain]

**SCENE 8 — WAY 3 OPEN (3:55–4:05)** · AI clip 4 · lower third "WAY 3 — THE SOUTHWEST"
[VOICE:HOST]
Third — the Southwest. [pause:0.4] Maize, but only where the water ran.

**SCENE 9 — WAY 3: THE PUEBLOS (4:05–4:50)** · zoom into Taos terraces · "THE DESERT CAPPED EVERYTHING" at 4:30
[VOICE:HOST]
Taos Pueblo, New Mexico — people have lived in these adobe terraces for a
thousand years. The Southwest is desert, so maize farming worked only along rivers
and where the summer rains fell. Pueblo peoples clustered tight: multi-story
apartment towns around a shared plaza, with irrigation, granaries, ceremony.
Dense like the East, but small — [slow] the desert capped how large any town
could grow. [/slow] And when the great drought came around 1300, whole towns were
abandoned — the migrations that emptied Mesa Verde. [beat] The lesson of all three
ways: [refrain] the environment sets the menu — and every society orders from it.
[/refrain]

**SCENE 10 — THE TURN (4:50–5:30)** · Atlantic map, route arrows · counter "90%"
[VOICE:HOST] [solemn]
Now freeze this picture. [pause:0.8] Because a fourth way of life is about to crash
into all three. Europeans arrive with steel, gunpowder, horses — and deadliest of
all, diseases no Native immune system had ever met. Within a century, in some
regions [emphasis] up to ninety percent [/emphasis] of the Native population is
gone. The three ways of life you just learned don't vanish — but they are bent,
broken, and remade under conquest, trade, and epidemic. [beat] That's the next video.

**SCENE 11 — OUTRO OPEN (5:30–5:40)** · AI clip 5 · no text
[VOICE:HOST] [quiet]
Three lands. Three answers. [pause:0.5] One collision coming.

**SCENE 12 — OUTRO (5:40–6:00)** · three recap cards slam in sequence · end card "NEXT: COLLISION"
[VOICE:HOST] [fast]
East: maize, cities, chiefs. Plains: bison, mobility, the horse. Southwest:
desert rivers, pueblos, tight towns. [beat] [slow] Geography wrote the first draft
of American history. [/slow] [pause:0.5] Next: Europe arrives.
