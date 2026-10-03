# AI Ambient-Clip Animation Plan — Chapters 1.1–4.1 (28 videos)

**Scope:** vid-u1-01 through vid-u4-04. Per video: 2–3 AI ambient-clip hero shots (hooks and high-impact moments only — spice, not backbone; 3 max per video per the series rule).
**Tool:** `video/animate_still.py` (LTX-Video 13B distilled, runs on the 5090). Run every command with `--dry-run` first per the runbook.
**Conventions:** every clip 5s, silent by design (narration comes from the stage MP3 — no sound/music in prompts); every prompt 35–60 words, layered sky → midground → foreground, naming only elements actually visible in the image; every prompt verified through `animate_still.check_prompt_safety` (47/47 pass at plan time; ch3.1/ch3.3 pending). Seeds are fixed ints, unique per clip.
**Manifests:** NOT modified by this plan (vid-u1-01/03/04 are live in 5090 renders). Where a manifest exists, beats anchor to real stage names; elsewhere the intended beat is named. Manifest `ai_clips` wiring happens later.
**Base images:** catalog reuse preferred; new images are PD-verified via the Commons API (LicenseShortName "Public domain", or CC0 + PD-old/pre-1930 basis, flagged honestly) and live under `assets/images/u<N>/` with CATALOG.json entries.

## Format exemplar — video1 (Federalist DBQ walkthrough, DONE)

**Shot 1 — hook (s0a):** base `video/assets/federalist/federal-hall-inauguration-1789.jpg` (Doolittle 1790 engraving, PD). Prompt: "High thin clouds drift slowly across the pale sky above Federal Hall; the long red-and-white bunting swagged across the balcony sways almost imperceptibly in a light breeze; dust motes drift through the still afternoon air; a faint heat shimmer rises off the sunlit rooftop." 5s, seed 42.
`python video/animate_still.py --image video/assets/federalist/federal-hall-inauguration-1789.jpg --prompt "High thin clouds drift slowly across the pale sky above Federal Hall; the long red-and-white bunting swagged across the balcony sways almost imperceptibly in a light breeze; dust motes drift through the still afternoon air; a faint heat shimmer rises off the sunlit rooftop." --out video/ai_clips/video1-hook-federal-hall.mp4 --duration 5 --seed 42`

**Shot 2 — Whiskey beat (s3):** base `video/assets/federalist/washington-reviews-western-army-1794.jpg` (Kemmelmeyer c.1795, Met Open Access, PD). Prompt: "Heavy clouds churn and roll slowly over the distant blue mountains; a light breeze stirs pale dust across the parade ground; the white canvas of the encampment tents trembles faintly in the wind; grass ripples in gusts along the field edge." 5s, seed 7.
`python video/animate_still.py --image video/assets/federalist/washington-reviews-western-army-1794.jpg --prompt "Heavy clouds churn and roll slowly over the distant blue mountains; a light breeze stirs pale dust across the parade ground; the white canvas of the encampment tents trembles faintly in the wind; grass ripples in gusts along the field edge." --out video/ai_clips/video1-whiskey-kemmelmeyer.mp4 --duration 5 --seed 7`

---

## Chapter 1.1 — Three Worlds on the Eve of Contact

### vid-u1-01 — "The World in 1491"
*Narrative question: What did the Americas, Europe, and Africa each look like right before contact — and why did the encounter happen when it did?*

**Shot 1 — hook (stage: `hook`)** — catalog reuse
- Beat: Cold open — Stradanus engraving (Discovery of America, Nova Reperta plate 1, c.1600): caravels arriving, banner planted.
- Base image: `assets/images/u1/5s24-ch06-mcq-01.jpg`
- Prompt (51w): "Thin clouds drift across the pale sky above the anchored caravels; ocean waves ripple and shimmer around the ships' hulls; the tall cross-topped banner flutters gently in the breeze; dense tree foliage stirs in the wind; a thin column of smoke rises and drifts from the distant campfire on the shore."
- Duration 5s · Seed 40
- `python video/animate_still.py --image assets/images/u1/5s24-ch06-mcq-01.jpg --prompt "Thin clouds drift across the pale sky above the anchored caravels; ocean waves ripple and shimmer around the ships' hulls; the tall cross-topped banner flutters gently in the breeze; dense tree foliage stirs in the wind; a thin column of smoke rises and drifts from the distant campfire on the shore." --out video/ai_clips/vid-u1-01-hook-discovery-america.mp4 --duration 5 --seed 40`

**Shot 2 — beat2a (stage: `beat2a`)** — catalog reuse
- Beat: First primary-source voice — Columbus's journal (13 Oct 1492); the video's signature document/voice technique.
- Base image: `assets/images/u1/5s24-ch06-mcq-04.jpg` (de Bry, Columbus landing on Hispaniola, 1594)
- Prompt (38w): "Light clouds drift slowly across the engraved sky; ocean waves ripple and shimmer around the anchored caravels; the full square sails billow gently; small pennants flutter on the masts; the distant shoreline trees stir in a faint breeze."
- Duration 5s · Seed 41
- `python video/animate_still.py --image assets/images/u1/5s24-ch06-mcq-04.jpg --prompt "Light clouds drift slowly across the engraved sky; ocean waves ripple and shimmer around the anchored caravels; the full square sails billow gently; small pennants flutter on the masts; the distant shoreline trees stir in a faint breeze." --out video/ai_clips/vid-u1-01-beat2a-columbus-landing.mp4 --duration 5 --seed 41`

**Shot 3 — beat1d (stage: `beat1d`)** — NEW image
- Beat: Africa's gold/trade world — Songhai, Timbuktu; a dedicated image replacing the reused Stradanus right-half.
- Base image: `assets/images/u1/anim-timbuktu-caillie-1830.jpg` (Caillié lithograph, 1830; PD via Commons API; 974×771 max available)
- Prompt (45w): "A pale heat haze shimmers over the flat-roofed mud city; thin dust drifts through the empty sky above the hills; the sparse trees at the city's edge stir faintly in a dry breeze; soft shadows move across the rooftops as the haze thickens and thins."
- Duration 5s · Seed 42
- `python video/animate_still.py --image assets/images/u1/anim-timbuktu-caillie-1830.jpg --prompt "A pale heat haze shimmers over the flat-roofed mud city; thin dust drifts through the empty sky above the hills; the sparse trees at the city's edge stir faintly in a dry breeze; soft shadows move across the rooftops as the haze thickens and thins." --out video/ai_clips/vid-u1-01-beat1d-timbuktu.mp4 --duration 5 --seed 42`

### vid-u1-02 — "Three Ways to Live in America"
*Narrative question: Why were some Native societies huge and hierarchical while others stayed small and mobile?*

**Shot 1 — hook (intended beat: hook)** — catalog reuse
- Beat: "Maize is the organizing fact" — planting = density = complexity.
- Base image: `assets/images/u1/original-u1-native-01.jpg` (de Bry after Le Moyne, Florida Indians planting, 1591)
- Prompt (37w): "Thin horizontal clouds drift slowly across the engraved sky; fine dust drifts across the tilled planting rows; the engraved cloud bands ripple faintly as a light breeze passes; a soft haze shimmers over the distant field edge."
- Duration 5s · Seed 43
- `python video/animate_still.py --image assets/images/u1/original-u1-native-01.jpg --prompt "Thin horizontal clouds drift slowly across the engraved sky; fine dust drifts across the tilled planting rows; the engraved cloud bands ripple faintly as a light breeze passes; a soft haze shimmers over the distant field edge." --out video/ai_clips/vid-u1-02-hook-maize-planting.mp4 --duration 5 --seed 43`

**Shot 2 — Mississippian chiefdoms** — NEW image
- Beat: "Where maize grew, cities rose" — Cahokia's monumental earthworks.
- Base image: `assets/images/u1/anim-cahokia-mound-1907.jpg` (LOC photo, 16 Oct 1907; PD via Commons API; film-frame scan border — crop at assembly)
- Prompt (41w): "Faint clouds drift across the pale sky above the great earthen mound; a breeze stirs the trees crowning the terraces; the long rows of the cultivated field shimmer and ripple faintly; thin dust drifts over the bare ground between the rows."
- Duration 5s · Seed 44
- `python video/animate_still.py --image assets/images/u1/anim-cahokia-mound-1907.jpg --prompt "Faint clouds drift across the pale sky above the great earthen mound; a breeze stirs the trees crowning the terraces; the long rows of the cultivated field shimmer and ripple faintly; thin dust drifts over the bare ground between the rows." --out video/ai_clips/vid-u1-02-cahokia-mound.mp4 --duration 5 --seed 44`

**Shot 3 — Southwest culture area** — catalog reuse
- Beat: The Southwest Pueblos — maize farming where the land allowed.
- Base image: `assets/images/u1/original-u1-native-09.jpg` (Taos Pueblo, photo 1880; cabinet-card mount border — crop at assembly)
- Prompt (43w): "Thin clouds drift across the pale sky above the adobe terraces; a dry breeze stirs dust across the plaza; the forested mountainside behind the pueblo shimmers faintly in the heat; soft shadows move over the clay walls as the haze thickens and thins."
- Duration 5s · Seed 45
- `python video/animate_still.py --image assets/images/u1/original-u1-native-09.jpg --prompt "Thin clouds drift across the pale sky above the adobe terraces; a dry breeze stirs dust across the plaza; the forested mountainside behind the pueblo shimmers faintly in the heat; soft shadows move over the clay walls as the haze thickens and thins." --out video/ai_clips/vid-u1-02-taos-pueblo.mp4 --duration 5 --seed 45`

## Chapter 1.2 — Europe Reaches America

### vid-u1-03 — "Why Europe Sailed West"
*Narrative question: Why did tiny Portugal and newly-unified Spain suddenly start crossing oceans in the 1400s?*

**Shot 1 — hook (stage: `hook`)** — catalog reuse
- Beat: "Why did they sail west at all?" — de Bry 1594 Columbus landing.
- Base image: `assets/images/u1/5s24-ch06-mcq-04.jpg`
- Prompt (48w): "Thin clouds drift slowly across the hatched sky above the open sea; gentle waves ripple and break softly around the three anchored caravels off the coast; the furled sails and rigging lines tremble faintly in the sea breeze; the trees along the distant green shoreline stir almost imperceptibly."
- Duration 5s · Seed 51
- `python video/animate_still.py --image assets/images/u1/5s24-ch06-mcq-04.jpg --prompt "Thin clouds drift slowly across the hatched sky above the open sea; gentle waves ripple and break softly around the three anchored caravels off the coast; the furled sails and rigging lines tremble faintly in the sea breeze; the trees along the distant green shoreline stir almost imperceptibly." --out video/ai_clips/vid-u1-03-landing-sea.mp4 --duration 5 --seed 51`

**Shot 2 — caravel technology (stage: `beat1b`)** — NEW image
- Beat: Portugal's navigation innovation — the caravel.
- Base image: `assets/images/u1/u1-caravel-fleet-huys.jpg` (Frans Huys after Bruegel, c.1565, MET MM15834; Commons LicenseShortName "CC0" + artist d.1562 PD-old — flagged honestly)
- Prompt (47w): "Massive pale clouds churn and drift slowly behind the caravel's great billowing sails; long pennant streamers flutter from the masthead in the ocean wind; low waves ripple and glitter across the open sea; the sun's bright rays shimmer faintly above the lateen sails of the trailing galleys."
- Duration 5s · Seed 53
- `python video/animate_still.py --image assets/images/u1/u1-caravel-fleet-huys.jpg --prompt "Massive pale clouds churn and drift slowly behind the caravel's great billowing sails; long pennant streamers flutter from the masthead in the ocean wind; low waves ripple and glitter across the open sea; the sun's bright rays shimmer faintly above the lateen sails of the trailing galleys." --out video/ai_clips/vid-u1-03-caravel-tech.mp4 --duration 5 --seed 53`

**Shot 3 — significance (stage: `significance`)** — catalog reuse
- Beat: Europe permanently stakes its claim — banner raised on the beach.
- Base image: `assets/images/u1/saq-set-19-q3.jpg` (Vanderlyn, "Landing of Columbus")
- Prompt (50w): "Soft clouds drift across the hazy sky over the bay where the caravels lie at anchor; the tall Castile-and-Leon banner held high above the shore ripples and flutters gently in the sea breeze; the great tropical trees along the right shore sway almost imperceptibly; small waves shimmer along the sand."
- Duration 5s · Seed 55
- `python video/animate_still.py --image assets/images/u1/saq-set-19-q3.jpg --prompt "Soft clouds drift across the hazy sky over the bay where the caravels lie at anchor; the tall Castile-and-Leon banner held high above the shore ripples and flutters gently in the sea breeze; the great tropical trees along the right shore sway almost imperceptibly; small waves shimmer along the sand." --out video/ai_clips/vid-u1-03-banner-planting.mp4 --duration 5 --seed 55`

### vid-u1-04 — "Conquest, Silver, and the Exchange"
*Narrative question: How did a few hundred Spaniards topple two empires — and what did the whole world get in return?*

**Shot 1 — hook (stage: `hook`)** — NEW image
- Beat: "The prize: a whole empire, taken" — panoramic Cusco, Pizarro's Inca prize.
- Base image: `assets/images/u1/u1-debry-cusco-fall.jpg` (de Bry after Gastaldi; PD via Commons API, de Bry d.1598)
- Prompt (48w): "Pale cloud streaks drift slowly across the wide sky above the Andes; a faint heat haze shimmers over the walled grid of Cusco's city blocks; thin dust drifts along the fortress terraces in the foreground; the scattered trees on the surrounding hillsides stir gently in the mountain breeze."
- Duration 5s · Seed 57
- `python video/animate_still.py --image assets/images/u1/u1-debry-cusco-fall.jpg --prompt "Pale cloud streaks drift slowly across the wide sky above the Andes; a faint heat haze shimmers over the walled grid of Cusco's city blocks; thin dust drifts along the fortress terraces in the foreground; the scattered trees on the surrounding hillsides stir gently in the mountain breeze." --out video/ai_clips/vid-u1-04-cusco.mp4 --duration 5 --seed 57`

**Shot 2 — Potosí silver (stage: `beat2b`)** — catalog reuse
- Beat: The mountain of silver — mit'a laborers in the Potosí mine (de Bry 1590).
- Base image: `assets/images/u1/gap-g-v02-1-potosi-mitayos-debry.jpg`
- Prompt (48w): "Wispy clouds drift across the pale sky beyond the cliff edge; the branches of the lone tree clinging to the rock face tremble faintly in the thin mountain air; the flames of the miners' torches flicker within the dark mine mouth; fine dust drifts through the torch-lit interior."
- Duration 5s · Seed 58
- `python video/animate_still.py --image assets/images/u1/gap-g-v02-1-potosi-mitayos-debry.jpg --prompt "Wispy clouds drift across the pale sky beyond the cliff edge; the branches of the lone tree clinging to the rock face tremble faintly in the thin mountain air; the flames of the miners' torches flicker within the dark mine mouth; fine dust drifts through the torch-lit interior." --out video/ai_clips/vid-u1-04-potosi-mine.mp4 --duration 5 --seed 58`

**Shot 3 — Columbian Exchange, two-way (stage: `beat3a`)** — catalog reuse
- Beat: The world swaps its cargo — Stradanus Discovery plate.
- Base image: `assets/images/u1/5s24-ch06-mcq-01.jpg`
- Prompt (52w): "Small waves ripple and curl softly around the caravel anchored off the shore; the long banner on the tall pole lifts and settles gently in the sea breeze; the dense tree canopy above the clearing stirs and rustles; a thin ribbon of smoke curls upward from the distant fire in the background."
- Duration 5s · Seed 59
- `python video/animate_still.py --image assets/images/u1/5s24-ch06-mcq-01.jpg --prompt "Small waves ripple and curl softly around the caravel anchored off the shore; the long banner on the tall pole lifts and settles gently in the sea breeze; the dense tree canopy above the clearing stirs and rustles; a thin ribbon of smoke curls upward from the distant fire in the background." --out video/ai_clips/vid-u1-04-discovery-plate.mp4 --duration 5 --seed 59`

## Chapter 1.3 — The Argument Over Conquest

### vid-u1-05 — "Who Had the Right?"
*Narrative question: Did anyone at the time think conquest was wrong — and what did their argument change?*

**Shot 1 — hook** — catalog reuse
- Beat: Frontispiece of Las Casas's 1665 German-edition book — conquest scenes above, Native leader with tribute-bearers below.
- Base image: `assets/images/u1/original-ctx-u1-05.jpg`
- Prompt (47w): "White gunpowder smoke curls slowly upward from the cannon blast and the arquebus bursts at the top of the page, thinning as it drifts across the sky; a thin haze of dust hangs over the massed pikes below; a faint heat shimmer rises off the dry hillside."
- Duration 5s · Seed 61
- `python video/animate_still.py --image assets/images/u1/original-ctx-u1-05.jpg --prompt "White gunpowder smoke curls slowly upward from the cannon blast and the arquebus bursts at the top of the page, thinning as it drifts across the sky; a thin haze of dust hangs over the massed pikes below; a faint heat shimmer rises off the dry hillside." --out video/ai_clips/vid-u1-05-hook.mp4 --duration 5 --seed 61`

**Shot 2 — significance landing** — NEW image
- Beat: Las Casas himself — the man behind the New Laws of 1542 and the Valladolid debate (1550–51).
- Base image: `assets/images/u1/original-u1-lascasas-portrait-01.jpg` (1791 engraving; PD via Commons API)
- Prompt (44w): "The heavy dark curtain behind the writing desk sways almost imperceptibly in the quiet study; the corners of the loose papers beside the ink pot tremble faintly in a draft; dust motes drift slowly through the dim air above the desk; nothing else stirs."
- Duration 5s · Seed 64
- `python video/animate_still.py --image assets/images/u1/original-u1-lascasas-portrait-01.jpg --prompt "The heavy dark curtain behind the writing desk sways almost imperceptibly in the quiet study; the corners of the loose papers beside the ink pot tremble faintly in a draft; dust motes drift slowly through the dim air above the desk; nothing else stirs." --out video/ai_clips/vid-u1-05-significance.mp4 --duration 5 --seed 64`

**Shot 3 — RP2/causation turn** — catalog reuse
- Beat: Weighing causes of the demographic catastrophe; the plantation labor engine Spain shifted to.
- Base image: `assets/images/u1/gap-g-v01-1-columbian-sugar-engraving.jpg`
- Prompt (46w): "Thick steam billows continuously from the great copper boiling cauldrons, curling upward and thinning against the dark arched roof; bright flames flicker beneath the vats; through the open arches the cane field sways in a distant breeze and a pale sail shimmers on the far sea."
- Duration 5s · Seed 67
- `python video/animate_still.py --image assets/images/u1/gap-g-v01-1-columbian-sugar-engraving.jpg --prompt "Thick steam billows continuously from the great copper boiling cauldrons, curling upward and thinning against the dark arched roof; bright flames flicker beneath the vats; through the open arches the cane field sways in a distant breeze and a pale sail shimmers on the far sea." --out video/ai_clips/vid-u1-05-causation.mp4 --duration 5 --seed 67`

---

## Chapter 2.1 — Three Models of Empire

### vid-u2-01 — "Three Europes, One Coast"
*Narrative question: Why did the Spanish conquer, the French trade, and the English settle?*

**Shot 1 — Spanish model: conquest → silver economy** — catalog reuse
- Beat: The Spanish imperial model — conquest-funded extraction flowing through fortified Caribbean ports (Durnford/Canot 1765 Havana harbor).
- Base image: `assets/images/u2/original-u1-trade-12.jpg`
- Prompt (46w): "Heavy gray clouds churn slowly across the sky above Havana harbor; tall-masted ships ride at anchor in the calm water, their hulls and rigging reflected in faint drifting ripples; palm fronds sway gently along the shoreline hills; a thin haze drifts over the distant city rooftops."
- Duration 5s · Seed 70
- `python video/animate_still.py --image assets/images/u2/original-u1-trade-12.jpg --prompt "Heavy gray clouds churn slowly across the sky above Havana harbor; tall-masted ships ride at anchor in the calm water, their hulls and rigging reflected in faint drifting ripples; palm fronds sway gently along the shoreline hills; a thin haze drifts over the distant city rooftops." --out video/ai_clips/vid-u2-01-spanish-harbor.mp4 --duration 5 --seed 70`

**Shot 2 — French model: St. Lawrence fur-trade** — NEW image
- Beat: The French imperial model — the fortified Habitation anchoring the fur-trade alliance network.
- Base image: `assets/images/u2/champlain-habitation-quebec.jpg` (Champlain's 1613 engraving "Abitation de Qvebecq"; PD via Commons API, Champlain d.1635)
- Prompt (53w): "Thin gray smoke curls upward from the stone chimneys of the Habitation de Quebec and drifts across the pale sky; the small pennant atop the gabled building flutters faintly in the breeze; the river below laps in gentle ripples along the palisade shore; reeds and garden rows tremble almost imperceptibly in the wind."
- Duration 5s · Seed 71
- `python video/animate_still.py --image assets/images/u2/champlain-habitation-quebec.jpg --prompt "Thin gray smoke curls upward from the stone chimneys of the Habitation de Quebec and drifts across the pale sky; the small pennant atop the gabled building flutters faintly in the breeze; the river below laps in gentle ripples along the palisade shore; reeds and garden rows tremble almost imperceptibly in the wind." --out video/ai_clips/vid-u2-01-quebec-habitation.mp4 --duration 5 --seed 71`

**Shot 3 — English model: joint-stock landing** — NEW image
- Beat: The English model — gentlemen-adventurers coming ashore; ships at anchor, longboats, the settlement beginning.
- Base image: `assets/images/u2/english-settlers-landing-virginia-1607.jpg` (1899 illustration; Commons LicenseShortName "CC0" + published 1899 pre-1930 — flagged honestly)
- Prompt (49w): "Still gray air hangs over the shore where the anchored ships lie becalmed, their sails hanging slack on the masts; soft ripples spread slowly across the calm water around the longboats; tall grass and tree branches along the bank stir faintly; a light mist drifts just above the waterline."
- Duration 5s · Seed 72
- `python video/animate_still.py --image assets/images/u2/english-settlers-landing-virginia-1607.jpg --prompt "Still gray air hangs over the shore where the anchored ships lie becalmed, their sails hanging slack on the masts; soft ripples spread slowly across the calm water around the longboats; tall grass and tree branches along the bank stir faintly; a light mist drifts just above the waterline." --out video/ai_clips/vid-u2-01-virginia-landing.mp4 --duration 5 --seed 72`

### vid-u2-02 — "Jamestown's Desperate Gamble"
*Narrative question: Why did England's first permanent colony nearly starve — and what saved it?*

**Shot 1 — hook: 1609, the ships aren't coming** — NEW image
- Beat: Present-tense immersion — the "starving time" made visible: a sickness-ravaged camp.
- Base image: `assets/images/u2/sickness-at-jamestown-1898.jpg` (Jan Beary illustration, 1898; PD via Commons API)
- Prompt (42w): "Thin dust drifts through the still camp air beneath the trees; the drooping canvas canopy of the lean-to trembles faintly in a light breeze; thatch and dry grass stir along the hut roofs and palisade; leaves rustle softly in the branches above."
- Duration 5s · Seed 73
- `python video/animate_still.py --image assets/images/u2/sickness-at-jamestown-1898.jpg --prompt "Thin dust drifts through the still camp air beneath the trees; the drooping canvas canopy of the lean-to trembles faintly in a light breeze; thatch and dry grass stir along the hut roofs and palisade; leaves rustle softly in the branches above." --out video/ai_clips/vid-u2-02-starving-camp.mp4 --duration 5 --seed 73`

**Shot 2 — tobacco: what saved it** — catalog reuse
- Beat: Tobacco made the venture pay — the crop that turned Jamestown from failing business into a viable colony (1874 illustration).
- Base image: `assets/images/u2/pr25e-ch06-q03.jpg`
- Prompt (43w): "The broad tobacco leaves rustle and sway gently in a light breeze; tall weeds and grasses tremble at the field edge; the leafy tree branches beyond the tended rows stir softly; dust motes drift through the still warm air over the furrowed soil."
- Duration 5s · Seed 74
- `python video/animate_still.py --image assets/images/u2/pr25e-ch06-q03.jpg --prompt "The broad tobacco leaves rustle and sway gently in a light breeze; tall weeds and grasses tremble at the field edge; the leafy tree branches beyond the tended rows stir softly; dust motes drift through the still warm air over the furrowed soil." --out video/ai_clips/vid-u2-02-tobacco-saves.mp4 --duration 5 --seed 74`

**Shot 3 — Plymouth contrast** — catalog reuse
- Beat: The other English logic — Plymouth (1620) as a religious community, not a gold-hunting venture.
- Base image: `assets/images/u2/pr25e-test2-q02.jpg` (ship anchored in a brooding harbor)
- Prompt (44w): "Dark clouds roll slowly across the gray sky above Plymouth Harbor; white-capped waves ripple and shift across the water; the anchored ship's furled sails tremble faintly on the masts; its hull rocks almost imperceptibly in the swell; shoreline trees sway softly in the wind."
- Duration 5s · Seed 75
- `python video/animate_still.py --image assets/images/u2/pr25e-test2-q02.jpg --prompt "Dark clouds roll slowly across the gray sky above Plymouth Harbor; white-capped waves ripple and shift across the water; the anchored ship's furled sails tremble faintly on the masts; its hull rocks almost imperceptibly in the swell; shoreline trees sway softly in the wind." --out video/ai_clips/vid-u2-02-plymouth-contrast.mp4 --duration 5 --seed 75`

## Chapter 2.2 — Thirteen Different Colonies

### vid-u2-03 — "Three Colonial Americas"
*Narrative question: Was there ever really one "colonial America," or three?*

**Shot 1 — New England (maritime)** — catalog reuse
- Beat: New England's sea economy — mixed farming, fishing, town meetings.
- Base image: `assets/images/u2/pr25e-test2-q02.jpg`
- Prompt (45w): "Low clouds drift across the pale dawn sky over Plymouth Harbor; gentle ripples spread across the still water around the anchored Mayflower; her furled sails hang motionless in the calm air; a faint shimmer glints off the ship's reflection; mist thins along the dark shoreline."
- Duration 5s · Seed 80
- `python video/animate_still.py --image assets/images/u2/pr25e-test2-q02.jpg --prompt "Low clouds drift across the pale dawn sky over Plymouth Harbor; gentle ripples spread across the still water around the anchored Mayflower; her furled sails hang motionless in the calm air; a faint shimmer glints off the ship's reflection; mist thins along the dark shoreline." --out video/ai_clips/vid-u2-03-plymouth-harbor.mp4 --duration 5 --seed 80`

**Shot 2 — Middle colonies (Philadelphia port)** — NEW image
- Beat: Breadbasket diversity and the commercial hub — Philadelphia.
- Base image: `assets/images/u2/philadelphia-east-prospect-1768.jpg` (Vandergucht after Heap/Scull, 1768; PD via Commons API)
- Prompt (42w): "Thin clouds drift slowly across the sky above the Delaware River; the full sails of the merchant vessels billow gently in the wind; ripples spread across the harbor water around the anchored hulls; the flag atop the Battery flutters in the breeze."
- Duration 5s · Seed 81
- `python video/animate_still.py --image assets/images/u2/philadelphia-east-prospect-1768.jpg --prompt "Thin clouds drift slowly across the sky above the Delaware River; the full sails of the merchant vessels billow gently in the wind; ripples spread across the harbor water around the anchored hulls; the flag atop the Battery flutters in the breeze." --out video/ai_clips/vid-u2-03-philadelphia-port.mp4 --duration 5 --seed 81`

**Shot 3 — Southern colonies (plantation staples)** — catalog reuse
- Beat: Tobacco, the cash crop that built the southern labor system.
- Base image: `assets/images/u2/pr25e-ch06-q03.jpg`
- Prompt (39w): "A light breeze stirs the broad tobacco leaves in the foreground rows; dust drifts across the sunlit tilled field; the grass at the field's edge sways gently; a faint haze hangs over the distant trees in the bright air."
- Duration 5s · Seed 82
- `python video/animate_still.py --image assets/images/u2/pr25e-ch06-q03.jpg --prompt "A light breeze stirs the broad tobacco leaves in the foreground rows; dust drifts across the sunlit tilled field; the grass at the field's edge sways gently; a faint haze hangs over the distant trees in the bright air." --out video/ai_clips/vid-u2-03-tobacco-field.mp4 --duration 5 --seed 82`

### vid-u2-04 — "Sugar, Ships, and the Middle Passage"
*Narrative question: What made the Atlantic economy run — and who paid for it?*

**Shot 1 — sugar** — catalog reuse
- Beat: The staple crop powering the triangular trade's Americas→Europe leg (Fumagalli 1830 West Indies sugar plantation).
- Base image: `assets/images/u2/original-u1-trade-11.png`
- Prompt (41w): "Palm fronds sway in the warm trade wind above the cane fields; the broad cane leaves rustle in the breeze; a heat shimmer rises off the sunlit fields; thin clouds drift across the pale sky; dust drifts along the plantation road."
- Duration 5s · Seed 83
- `python video/animate_still.py --image assets/images/u2/original-u1-trade-11.png --prompt "Palm fronds sway in the warm trade wind above the cane fields; the broad cane leaves rustle in the breeze; a heat shimmer rises off the sunlit fields; thin clouds drift across the pale sky; dust drifts along the plantation road." --out video/ai_clips/vid-u2-04-sugar-plantation.mp4 --duration 5 --seed 83`

**Shot 2 — ships** — catalog reuse
- Beat: The triangular trade as practice — the colonial ports where the circuit's ships gathered (Havana harbor 1765).
- Base image: `assets/images/u2/original-u1-trade-12.jpg`
- Prompt (39w): "Heavy clouds churn and drift across the sky above the harbor; palm fronds in the foreground sway in the sea breeze; gentle ripples spread across the harbor water around the anchored sailing ships; mist thins along the distant shoreline."
- Duration 5s · Seed 84
- `python video/animate_still.py --image assets/images/u2/original-u1-trade-12.jpg --prompt "Heavy clouds churn and drift across the sky above the harbor; palm fronds in the foreground sway in the sea breeze; gentle ripples spread across the harbor water around the anchored sailing ships; mist thins along the distant shoreline." --out video/ai_clips/vid-u2-04-havana-harbor.mp4 --duration 5 --seed 84`

**Shot 3 — the Middle Passage (who paid)** — catalog reuse
- Beat: Enslaved Africans loaded onto European ships at Elmina — the "who paid for it" hook (1732 engraving).
- Base image: `assets/images/u2/original-u1-trade-05.jpg`
- Prompt (38w): "Waves ripple gently across the harbor toward the shore; the flag atop the fort flutters in the sea breeze; thin clouds drift over the distant coastline; the sails of the anchored ships hang heavy in the still air."
- Duration 5s · Seed 85
- `python video/animate_still.py --image assets/images/u2/original-u1-trade-05.jpg --prompt "Waves ripple gently across the harbor toward the shore; the flag atop the fort flutters in the sea breeze; thin clouds drift over the distant coastline; the sails of the anchored ships hang heavy in the still air." --out video/ai_clips/vid-u2-04-elmina-harbor.mp4 --duration 5 --seed 85`

### vid-u2-05 — "Allies, Enemies, and Everything Between"
*Narrative question: Were Native peoples just victims of colonization — or players in it?*

**Shot 1 — Powhatan Confederacy** — catalog reuse
- Beat: The Chesapeake world the English entered — hook for Native agency (Smith's 1612 Virginia map).
- Base image: `assets/images/u2/5s24-ch03-mcq-23.jpg`
- Prompt (40w): "The engraved wave lines ripple gently across the Virginian Sea; the tall ship's sails stir in a faint sea breeze; a light haze drifts over the forests and rivers of Powhatan's country; a faint shimmer catches on the compass rose."
- Duration 5s · Seed 86
- `python video/animate_still.py --image assets/images/u2/5s24-ch03-mcq-23.jpg --prompt "The engraved wave lines ripple gently across the Virginian Sea; the tall ship's sails stir in a faint sea breeze; a light haze drifts over the forests and rivers of Powhatan's country; a faint shimmer catches on the compass rose." --out video/ai_clips/vid-u2-05-powhatan-map.mp4 --duration 5 --seed 86`

**Shot 2 — fur trade (diplomacy/entanglement)** — catalog reuse
- Beat: The "allies / everything between" beat — French traders and an Indigenous trader, pipes with visible smoke.
- Base image: `assets/images/u2/saq-set-03-q3.jpg`
- Prompt (36w): "Thin smoke curls drift upward from the two pipes and thin into the still air; the dark fur pelt sways faintly where it is held between the traders; a faint haze settles over the hatched background."
- Duration 5s · Seed 87
- `python video/animate_still.py --image assets/images/u2/saq-set-03-q3.jpg --prompt "Thin smoke curls drift upward from the two pipes and thin into the still air; the dark fur pelt sways faintly where it is held between the traders; a faint haze settles over the hatched background." --out video/ai_clips/vid-u2-05-fur-trade.mp4 --duration 5 --seed 87`

**Shot 3 — Metacom's/King Philip's War** — NEW image
- Beat: Native military agency — the "enemies" beat (1675–76).
- Base image: `assets/images/u2/king-philip-war-darley.jpg` (F.O.C. Darley engraving, 1886; PD via Commons API)
- Prompt (40w): "Musket smoke billows and thins across the clearing; tall grass sways in gusts across the field; leaves rustle in the dark trees at the clearing's edge; dust drifts through the pale light while heat shimmer rises off the trampled ground."
- Duration 5s · Seed 88
- `python video/animate_still.py --image assets/images/u2/king-philip-war-darley.jpg --prompt "Musket smoke billows and thins across the clearing; tall grass sways in gusts across the field; leaves rustle in the dark trees at the clearing's edge; dust drifts through the pale light while heat shimmer rises off the trampled ground." --out video/ai_clips/vid-u2-05-king-philip-war.mp4 --duration 5 --seed 88`

## Chapter 2.3 — Slavery and Society

### vid-u2-06 — "How Slavery Became Racial"
*Narrative question: Slavery wasn't always racial in the colonies — so when and why did it become so?*

**Shot 1 — Bacon's Rebellion (hook)** — catalog reuse
- Beat: The hinge — 1676 terrified planters into dividing poor whites from enslaved Blacks (Pyle 1905, burning Jamestown at night).
- Base image: `assets/images/u2/pr25e-test3-q01.jpg`
- Prompt (48w): "Smoke billows and drifts upward through the moonlit night sky above Jamestown; torch flames gutter and flicker along the dark street; the lantern hanging from the tavern sign sways gently, its flame wavering; thin clouds drift past the half moon; dust stirs softly in the still night air."
- Duration 5s · Seed 90
- `python video/animate_still.py --image assets/images/u2/pr25e-test3-q01.jpg --prompt "Smoke billows and drifts upward through the moonlit night sky above Jamestown; torch flames gutter and flicker along the dark street; the lantern hanging from the tavern sign sways gently, its flame wavering; thin clouds drift past the half moon; dust stirs softly in the still night air." --out video/ai_clips/vid-u2-06-bacon-rebellion.mp4 --duration 5 --seed 90`

**Shot 2 — slave codes harden** — NEW image
- Beat: Slave codes hardened into lifelong, hereditary, racial slavery — what the system looked like (1670 painting, unknown artist).
- Base image: `assets/images/u2/tobacco-sheds-1670.jpg` (PD via Commons API). CAVEAT: palm trees suggest a possibly non-Chesapeake (Caribbean/Brazilian?) plantation — do not claim Virginia specifically.
- Prompt (49w): "Thin smoke rises and drifts from the cook fire under the small shelter; palm fronds sway gently above the tobacco sheds; high clouds drift slowly across the pale sky; the low flames beneath the cooking pot flicker; leaves tremble in the breeze around the broad trees behind the sheds."
- Duration 5s · Seed 93
- `python video/animate_still.py --image assets/images/u2/tobacco-sheds-1670.jpg --prompt "Thin smoke rises and drifts from the cook fire under the small shelter; palm fronds sway gently above the tobacco sheds; high clouds drift slowly across the pale sky; the low flames beneath the cooking pot flicker; leaves tremble in the breeze around the broad trees behind the sheds." --out video/ai_clips/vid-u2-06-tobacco-sheds.mp4 --duration 5 --seed 93`

### vid-u2-07 — "Awakenings and Arguments"
*Narrative question: What did the colonies argue about before they argued about Britain?*

**Shot 1 — Great Awakening revival (hook)** — catalog reuse
- Beat: Itinerant preaching challenged established churches and seeded democratic habits (1852 LOC camp-meeting print — Second Great Awakening era, used as a revival-meeting stand-in; no better PD First-Awakening image found).
- Base image: `assets/images/u2/barrons-2027-pt2-49.jpg`
- Prompt (49w): "A warm breeze sways the leafy canopy shading the outdoor meeting; branches and leaves rustle gently overhead; thin clouds drift slowly over the treetops; dust motes hang and drift in the still air above the crowded benches; the wooden shingles of the small shelter shiver faintly in the wind."
- Duration 5s · Seed 96
- `python video/animate_still.py --image assets/images/u2/barrons-2027-pt2-49.jpg --prompt "A warm breeze sways the leafy canopy shading the outdoor meeting; branches and leaves rustle gently overhead; thin clouds drift slowly over the treetops; dust motes hang and drift in the still air above the crowded benches; the wooden shingles of the small shelter shiver faintly in the wind." --out video/ai_clips/vid-u2-07-revival-meeting.mp4 --duration 5 --seed 96`

**Shot 2 — Enlightenment / Franklin** — NEW image
- Beat: Enlightenment ideas took colonial root — Franklin's 1752 kite experiment as the iconic "colonists learning to question."
- Base image: `assets/images/u2/franklin-kite-west-1816.jpg` (Benjamin West, c.1816; PD via Commons API, West d.1820)
- Prompt (49w): "Heavy storm clouds churn and roll above Franklin's upraised hand; pale lightning flickers deep within the dark cloud bank; rain sweeps in thin sheets across the turbulent sky; the folds of his red cloak whip and flutter in the rising wind; the kite string trembles taut against the storm."
- Duration 5s · Seed 99
- `python video/animate_still.py --image assets/images/u2/franklin-kite-west-1816.jpg --prompt "Heavy storm clouds churn and roll above Franklin's upraised hand; pale lightning flickers deep within the dark cloud bank; rain sweeps in thin sheets across the turbulent sky; the folds of his red cloak whip and flutter in the rising wind; the kite string trembles taut against the storm." --out video/ai_clips/vid-u2-07-franklin-kite.mp4 --duration 5 --seed 99`

---

## Chapter 3.2 — Inventing the Republic

### vid-u3-07 — "The Government That Couldn't"
*Narrative question: Why did the government that won the war fail at governing?*

**Shot 1 — hook: Shays' Rebellion as proof of breakdown** — catalog reuse
- Beat: Springfield, 1786–87 — the proof the Articles system was breaking (C. Kendrick, c.1902).
- Base image: `assets/images/u3/barrons-2027-ch05-07.jpg`
- Prompt (54w): "Thin gray musket smoke drifts and curls slowly across the road where the Springfield clash rages; the bare winter branches of the roadside trees sway faintly; pale dust stirs along the trampled ground; a cold haze hangs over the white farmhouse in the distance while the smoky air thickens above the far tree line."
- Duration 5s · Seed 121
- `python video/animate_still.py --image assets/images/u3/barrons-2027-ch05-07.jpg --prompt "Thin gray musket smoke drifts and curls slowly across the road where the Springfield clash rages; the bare winter branches of the roadside trees sway faintly; pale dust stirs along the trampled ground; a cold haze hangs over the white farmhouse in the distance while the smoky air thickens above the far tree line." --out video/ai_clips/vid-u3-07-shays-springfield.mp4 --duration 5 --seed 121`

### vid-u3-08 — "The Fight to Ratify"
*Narrative question: The Constitution was written in secret — how did anyone get the country to agree to it?*

**Shot 1 — hook: Philadelphia, the secret-convention city** — NEW image
- Beat: The 1787 convention city — panoramic Delaware harbor (Scull & Heap, 1755; PD via Commons API, Vandergucht d.1776; 1266×685 original, no upscaling).
- Base image: `assets/images/u3/philadelphia-east-prospect-1755.jpg`
- Prompt (50w): "High thin clouds drift slowly over the Philadelphia waterfront; the anchored ships' sails and rigging stir almost imperceptibly as small boats rock gently on the Delaware's rippling surface; the British ensign flutters faintly above the distant battery; a soft river mist hangs over the far shore beneath the pale sky."
- Duration 5s · Seed 124
- `python video/animate_still.py --image assets/images/u3/philadelphia-east-prospect-1755.jpg --prompt "High thin clouds drift slowly over the Philadelphia waterfront; the anchored ships' sails and rigging stir almost imperceptibly as small boats rock gently on the Delaware's rippling surface; the British ensign flutters faintly above the distant battery; a soft river mist hangs over the far shore beneath the pale sky." --out video/ai_clips/vid-u3-08-philadelphia-convention.mp4 --duration 5 --seed 124`

### vid-u3-09 — "The Constitution's Bargains"
*Narrative question: What deals did the founders make to get a Constitution — and what did each deal cost?*

**Shot 1 — hook: the slavery bargains and their cost** — NEW image
- Beat: Three-Fifths, the fugitive slave clause, the 1808 slave-trade clause — and what each cost (1759 Virginia tobacco plantation engraving; PD via Commons API; 739×493 original, no upscaling).
- Base image: `assets/images/u3/tobacco-plantation-virginia-1759.jpg`
- Prompt (54w): "Slow clouds drift across the pale sky above the tobacco fields; the broad leaves of the tobacco plants stir faintly in a warm breeze; fine dust hangs in the still air around the packing hogsheads; heat shimmer rises off the sun-baked ground while the distant tree line trembles almost imperceptibly at the field's edge."
- Duration 5s · Seed 127
- `python video/animate_still.py --image assets/images/u3/tobacco-plantation-virginia-1759.jpg --prompt "Slow clouds drift across the pale sky above the tobacco fields; the broad leaves of the tobacco plants stir faintly in a warm breeze; fine dust hangs in the still air around the packing hogsheads; heat shimmer rises off the sun-baked ground while the distant tree line trembles almost imperceptibly at the field's edge." --out video/ai_clips/vid-u3-09-slavery-bargains.mp4 --duration 5 --seed 127`

## Chapter 4.1 — The Young Republic

### vid-u4-01 — "The Republic Grows Up"
*Narrative question: What kind of country was the United States in 1800 — and what was about to hit it?*

**Shot 1 — hook: a rural republic** — catalog reuse
- Beat: ~5 million people, overwhelmingly rural, stretching to the Mississippi (Thomas Cole, The Oxbow, 1836).
- Base image: `assets/images/u4/original-misc-us-culture-13.jpg`
- Prompt (46w): "Dark storm clouds churn slowly over the Connecticut River valley while pale mist hangs along the far fields; the winding river shimmers with faint ripples; the leaves of the gnarled foreground tree tremble in the rising breeze; sunlit clouds drift at the horizon."
- Duration 5s · Seed 140
- `python video/animate_still.py --image assets/images/u4/original-misc-us-culture-13.jpg --prompt "Dark storm clouds churn slowly over the Connecticut River valley while pale mist hangs along the far fields; the winding river shimmers with faint ripples; the leaves of the gnarled foreground tree tremble in the rising breeze; sunlit clouds drift at the horizon." --out video/ai_clips/vid-u4-01-rural-republic.mp4 --duration 5 --seed 140`

**Shot 2 — twin engine: territorial expansion** — catalog reuse
- Beat: The vast west the nation was about to double into (Bierstadt, Rocky Mountain Landscape).
- Base image: `assets/images/u4/original-misc-us-culture-16.jpg`
- Prompt (45w): "Thin mist drifts slowly through the mountain canyon while high clouds stream across the glowing sky; the waterfall pours down the cliff face; gentle ripples cross the still lake, breaking the mountains' reflection into shimmering fragments; the dark foliage at the water's edge sways faintly."
- Duration 5s · Seed 141
- `python video/animate_still.py --image assets/images/u4/original-misc-us-culture-16.jpg --prompt "Thin mist drifts slowly through the mountain canyon while high clouds stream across the glowing sky; the waterfall pours down the cliff face; gentle ripples cross the still lake, breaking the mountains' reflection into shimmering fragments; the dark foliage at the water's edge sways faintly." --out video/ai_clips/vid-u4-01-western-expanse.mp4 --duration 5 --seed 141`

### vid-u4-02 — "Jefferson's America"
*Narrative question: Could a president who distrusted government double the country?*

**Shot 1 — Louisiana Purchase (1803)** — NEW image
- Beat: The constitutional stretch — the country doubled at New Orleans (Thulstrup painting; PD via Commons API, artist d.1930; 753×1125, lower-res than ideal).
- Base image: `assets/images/u4/louisiana-purchase-thulstrup.jpg`
- Prompt (52w): "The Stars and Stripes ripples and billows atop the tall flagpole as the French tricolor hangs slack below; pale musket smoke drifts slowly across the parade ground and thins into the air; clouds drift across the blue sky above the plaza's towers; the grass at the frame's edge sways faintly in the breeze."
- Duration 5s · Seed 142
- `python video/animate_still.py --image assets/images/u4/louisiana-purchase-thulstrup.jpg --prompt "The Stars and Stripes ripples and billows atop the tall flagpole as the French tricolor hangs slack below; pale musket smoke drifts slowly across the parade ground and thins into the air; clouds drift across the blue sky above the plaza's towers; the grass at the frame's edge sways faintly in the breeze." --out video/ai_clips/vid-u4-02-louisiana-purchase.mp4 --duration 5 --seed 142`

**Shot 2 — Lewis and Clark expedition** — NEW image
- Beat: Mapping the doubled country; the ideals-vs-actions tension (Russell 1912 Ross' Hole mural; PD via Commons API, artist d.1926).
- Base image: `assets/images/u4/lewis-clark-ross-hole.jpg`
- Prompt (52w): "Soft clouds drift slowly across the wide sky above the distant blue mountains; a warm haze shimmers over the valley floor; pale dust drifts across the grassy plain; the tall grass ripples in long waves beneath the horsemen, and the canvas tipis tremble faintly at the camp's edge."
- Duration 5s · Seed 143
- `python video/animate_still.py --image assets/images/u4/lewis-clark-ross-hole.jpg --prompt "Soft clouds drift slowly across the wide sky above the distant blue mountains; a warm haze shimmers over the valley floor; pale dust drifts across the grassy plain; the tall grass ripples in long waves beneath the horsemen, and the canvas tipis tremble faintly at the camp's edge." --out video/ai_clips/vid-u4-02-lewis-and-clark.mp4 --duration 5 --seed 143`

**Shot 3 — Embargo Act (1807)** — catalog reuse
- Beat: The backfiring principle (Ograbme cartoon, 1807–08).
- Base image: `assets/images/u4/original-misc-worldstage-02.jpg`
- Prompt (50w): "The narrow strip of harbor water behind the cartoon's foreground glints with faint ripples as tiny waves lap at the distant dock; the pennant on the tall ship's mast flutters almost imperceptibly in the sea breeze; dust motes drift across the aged paper; thin clouds drift above the harbor horizon."
- Duration 5s · Seed 144
- `python video/animate_still.py --image assets/images/u4/original-misc-worldstage-02.jpg --prompt "The narrow strip of harbor water behind the cartoon's foreground glints with faint ripples as tiny waves lap at the distant dock; the pennant on the tall ship's mast flutters almost imperceptibly in the sea breeze; dust motes drift across the aged paper; thin clouds drift above the harbor horizon." --out video/ai_clips/vid-u4-02-embargo-act.mp4 --duration 5 --seed 144`

### vid-u4-03 — "The Court Builds a Nation"
*Narrative question: How did an unelected court become the most powerful branch of government?*

**Shot 1 — Gibbons v. Ogden (1824), the steamboat age** — NEW image
- Beat: Interstate commerce — the steamboat age (Figuier engraving, Fulton boarding the Clermont 1807; PD via Commons API, Figuier d.1894; 1171×867, lower-res than ideal).
- Base image: `assets/images/u4/fulton-clermont-1807.jpg`
- Prompt (48w): "Dark smoke billows from the steamboat's funnel and drifts slowly across the sky; the small pennants atop the tall masts flutter in the breeze; pale clouds drift overhead; a thin shimmer of heat rises off the iron paddle-wheel housing; dust motes drift through the dockside air."
- Duration 5s · Seed 145
- `python video/animate_still.py --image assets/images/u4/fulton-clermont-1807.jpg --prompt "Dark smoke billows from the steamboat's funnel and drifts slowly across the sky; the small pennants atop the tall masts flutter in the breeze; pale clouds drift overhead; a thin shimmer of heat rises off the iron paddle-wheel housing; dust motes drift through the dockside air." --out video/ai_clips/vid-u4-03-steamboat-commerce.mp4 --duration 5 --seed 145`

**Shot 2 — McCulloch v. Maryland (1819), the national bank** — NEW image
- Beat: Implied powers — the bank at the center of the case (C. Burton engraving, published 1831; PD via Commons API; large white print margin — crop before animating).
- Base image: `assets/images/u4/second-bank-philadelphia.jpg`
- Prompt (42w): "Soft clouds drift slowly across the sky above the bank's white pediment; the leaves of the small street trees stir faintly in the breeze; dust motes drift through the still air before the columns; a faint shimmer rises off the sun-warmed stone steps."
- Duration 5s · Seed 146
- `python video/animate_still.py --image assets/images/u4/second-bank-philadelphia.jpg --prompt "Soft clouds drift slowly across the sky above the bank's white pediment; the leaves of the small street trees stir faintly in the breeze; dust motes drift through the still air before the columns; a faint shimmer rises off the sun-warmed stone steps." --out video/ai_clips/vid-u4-03-second-bank.mp4 --duration 5 --seed 146`

### vid-u4-04 — "America's Second War for Independence"
*Narrative question: Why did Americans call a stalemate a victory — and what did the war actually win?*

**Shot 1 — causes: British naval pressure** — NEW image — FLAGGED OPTIONAL
- Beat: British sea power bearing down on American shipping (Fischer painting of the July 1812 chase of USS Constitution; PD via Commons API). FLAG: depicts a wartime chase, not a pre-war cause — thematic stand-in; cut if the video needs strict cause-depiction.
- Base image: `assets/images/u4/chase-of-the-constitution-1812.jpg`
- Prompt (52w): "The great white sails of the frigate billow and strain in the wind as she flees before the British squadron; whitecaps break across the rolling green waves; high clouds stream across the sky; spray drifts from the bow and thins into the sea air; the distant pursuers' sails shimmer in the haze."
- Duration 5s · Seed 147
- `python video/animate_still.py --image assets/images/u4/chase-of-the-constitution-1812.jpg --prompt "The great white sails of the frigate billow and strain in the wind as she flees before the British squadron; whitecaps break across the rolling green waves; high clouds stream across the sky; spray drifts from the bow and thins into the sea air; the distant pursuers' sails shimmer in the haze." --out video/ai_clips/vid-u4-04-british-sea-power.mp4 --duration 5 --seed 147`

**Shot 2 — burning of Washington (Aug 1814)** — NEW image
- Beat: The shock that made the stalemate's ending feel like survival (period engraving; PD via Commons API, pre-1930).
- Base image: `assets/images/u4/burning-of-washington-1814.jpg`
- Prompt (46w): "Thick black smoke billows skyward from the burning buildings and rolls slowly across the darkened sky; flames flicker and flare along the rooftops; glowing embers drift upward through the smoke; the bare branches of the foreground trees tremble faintly; pale clouds drift above the smoke column."
- Duration 5s · Seed 148
- `python video/animate_still.py --image assets/images/u4/burning-of-washington-1814.jpg --prompt "Thick black smoke billows skyward from the burning buildings and rolls slowly across the darkened sky; flames flicker and flare along the rooftops; glowing embers drift upward through the smoke; the bare branches of the foreground trees tremble faintly; pale clouds drift above the smoke column." --out video/ai_clips/vid-u4-04-washington-burns.mp4 --duration 5 --seed 148`

**Shot 3 — Jackson at New Orleans** — NEW image
- Beat: The "victory" Americans celebrated — the psychological product (nationalism, Federalist death, Monroe Doctrine) (Duval after Laclotte, 1816; PD via Commons API).
- Base image: `assets/images/u4/battle-of-new-orleans-duval.jpg`
- Prompt (44w): "Heavy gun smoke hangs over the battlefield and drifts slowly across the field; dark clouds churn above the distant tree line; the broad river in the foreground ripples faintly; dust drifts across the embankments; the foliage of the riverside trees stirs in the breeze."
- Duration 5s · Seed 149
- `python video/animate_still.py --image assets/images/u4/battle-of-new-orleans-duval.jpg --prompt "Heavy gun smoke hangs over the battlefield and drifts slowly across the field; dark clouds churn above the distant tree line; the broad river in the foreground ripples faintly; dust drifts across the embankments; the foliage of the riverside trees stirs in the breeze." --out video/ai_clips/vid-u4-04-new-orleans-1815.mp4 --duration 5 --seed 149`

---

## PENDING — Chapters 3.1 and 3.3

Sections for Chapter 3.1 (vid-u3-01…vid-u3-06) and Chapter 3.3 (vid-u3-10…vid-u3-12) land here when their planning passes complete. Seeds reserved: 100–119 (ch3.1), 130–139 (ch3.3).

---

## GAP LOG (all chapters)

Beats with no sourceable PD image — left unshot rather than filled decoratively:
- vid-u1-01 beat2d (Florentine Codex smallpox) and beat3a/3b (Lienzo de Tlaxcala): flat codex imagery, no ambient-motion substrate.
- vid-u1-03 beat2b (1507 naming of "America"): catalog Waldseemüller detail is a map crop with no ambient elements.
- vid-u1-03 beat3a (Roanoke / French fur-trade comparison): no PD image sourced.
- vid-u1-04 conquest close-combat alternative: no PD battle image with ambient elements; used the de Bry Cusco panorama.
- vid-u2-05 Pueblo Revolt (1680): no PD depiction on Commons.
- vid-u2-06 Stono Rebellion (1739): no usable PD image (2013 marker photo not PD; Haitian-revolution print is the wrong event).
- vid-u2-06 "assemblies practiced self-rule": no assembly-house exterior with ambient elements.
- vid-u3-07 Northwest Ordinance (1787) achievement beat: only a static 1936 map in catalog.
- vid-u3-08 ratification-battle beat: only fleuron ornaments, portraits, documents — no motion substrate.
- vid-u3-09 federalism / separation-of-powers bargains: abstract concepts, no depictable PD visual.
- vid-u4-01 "Revolution of 1800" peaceful transfer + slavery fault-line beats: no ambient-suitable PD images.
- vid-u4-02 election of 1800 / shrinking-government beats: no ambient-suitable PD images.
- vid-u4-03 Marbury / judicial-review beat + Missouri Compromise backdrop: no ambient-suitable PD images.
- vid-u4-04 impressment beat: no PD depiction exists; the Chase of the Constitution shot is a flagged thematic stand-in (optional).
- Rejected near-misses (never substituted): de Bry Florida column (wrong colony), Pyle "Burning of Jamestown" for Native-agency beats (wrong event — it depicts Bacon's Rebellion), catalog West Indies sugar plantation for mainland-slavery beats (wrong geography), "Westward the course of empire" 1868 print (anachronistic for 1800–1812), Birch First Bank engraving (wrong bank — McCulloch concerned the Second Bank), Brookes slave-ship stowage plan (flat diagram), Gilpin Taos mission (dubious PD + 521px), "No restrictions" Flickr Taos photo (not "Public domain").

## Verification summary (honest partition)

**Verified in code / by hand on this machine:**
- All 47 prompts ran through `animate_still.check_prompt_safety`: 47/47 pass, zero failures at plan time (several drafts were rewritten by the planning agents for banned words — "dance", "figure", "figures", "marching", "runs", "troop" — and re-run clean).
- All prompts 35–60 words (verified by count).
- All 21 new images: downloaded from upload.wikimedia.org / thumb.wikimedia.org, valid JPEG/WebP-decoded, PIL-verified, dimensions recorded.
- PD licenses: 19 new images verified "Public domain" via the Commons API (LicenseShortName). 2 images carry "CC0" (Huys caravel fleet c.1565; 1899 Virginia landing illustration) — CC0 is a public-domain dedication, and both works are independently PD (artist d.1562 / published 1899 pre-1930); kept with the flag in their catalog license_note.
- New images visually read: the planning agents read every base image they used (catalog + new) with the read tool and confirmed prompt elements are actually visible; the coordinator spot-verified the mechanism (PIL dimensions + file validity) for all 21.
- Seeds: unique per clip within chapters (40–149 ranges, no collisions in the planned set).

**Never ran:**
- Actual clip generation — no GPU on this machine. The 5090 runs `animate_still.py` (always `--dry-run` first per the runbook). Expected ~1–4 min per 5s clip.
- The validator's AI-CLIP gate against real manifests (no manifests exist yet for these videos except vid-u1-01/03/04, which this plan does not modify).
- Manifest `ai_clips` wiring — happens later, after video1's pattern is proven.

**Known caveats carried into production:**
- Lower-res base images: Timbuktu lithograph 974×771 (max available); Thulstrup 753×1125; Clermont 1171×867; Philadelphia 1755 prospect 1266×685; tobacco plantation 1759 739×493 (both used at original size, no upscaling).
- Border artifacts: Taos Pueblo (cabinet-card mount), Cahokia 1907 (film-frame scan border), Second Bank 1831 (large white print margin) — crop before animating.
- Content caveats: tobacco-sheds-1670 may depict a non-Chesapeake plantation (do not claim Virginia); 1852 Eastham camp-meeting print is a Second-Great-Awakening-era stand-in for the First; vid-u4-04 shot 1 is a flagged thematic stand-in (optional).
