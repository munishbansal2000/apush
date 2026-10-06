# E2 Full Scene Spec — image + animation + timing per turn

## Design language
- **Background**: historic image, Ken Burns drift, 0.6 opacity + gradient
- **Talking head**: bottom-right, Maya (gold) / Marcus (blue), always on
- **Beats**: SmartText (hero/title/subtitle/body), SpeechBubble (jokes),
  GravityText (quiz), LeaderSticker (cartoon leaders), ThreeBoxesE2 (progress)
- **Entrances**: `fade` (default), `stamp` (punchy terms), `typewriter` (quotes)
- **Timing**: all offsets from Vosk `work/word_times.json`, aliases applied

## Image pool (30 assets in public/historic/u1e2/)
- Ships/voyage: caravel-replicas, debry-columbus-departs, debry-columbus-landing
- Maps: tordesillas-map, portolan-chart, portolan-chart-clean, behaim-erdapfel-1492
- People: columbus-portrait, columbus-manuscript, henry-navigator,
  isabella-ferdinand, virgen-reyes-catolicos
- Gold/wealth: gold-coins, debry-gold-streams
- Church: cathedral
- Tools: astrolabe, astrolabe-detail, medicao-astrolabio-1547, cannon,
  pirotechnia-cannons-1540
- Crops/food: fuchs-maize-1542, maize, potatoes, bruegel-harvesters-1565,
  sugarcane-harvest
- Animals: comanche-horses, durer-large-horse-1505
- Disease: smallpox-florentine-codex
- Conquest: lienzo-tlaxcala, debry-hispaniola-mines

---

## TURN-BY-TURN SPEC

### t00 [0.0s, 25.4s] Maya — intro, three boxes
- **BG**: tordesillas-map.jpg (voyage theme from the start)
- **0-3s**: TitleCard (kicker "UNIT 1 · EPISODE 2", title "THE COLLISION",
  subline "EUROPE SAILS WEST")
- **5.31s** ("collision"): SmartText hero `TWO WORLDS COLLIDE` @[0.5,0.15],
  stamp entrance — the thesis lands visually
- **14.19s** ("colombian"): ThreeBoxesE2 box 1 appears (fuchs-maize image)
- **15.96s** ("income"=encomienda): box 2 appears (hispaniola-mines image)
- **18.54s** ("toward"=tordesillas): box 3 appears (tordesillas-map image)

### t01 [25.4s, 11.8s] Marcus — gold, God, glory
- **BG**: gold-coins.jpg → bg-swap to cathedral.jpg at 4.05s (God),
  back to gold-coins at 4.47s? No — keep gold-coins, text carries it.
- **3.66s** ("gold"): SmartText hero `GOLD` @[0.25,0.3], gold color, stamp
- **4.05s** ("god"): SmartText hero `GOD` @[0.5,0.3], stamp
- **4.47s** ("glory"): SmartText hero `GLORY` @[0.75,0.3], red, stamp
- Trio stays up as he explains each

### t02 [37.1s, 3.0s] Maya — "What about God and glory?"
- **BG**: gold-coins.jpg (carry)
- **0s**: SmartText subtitle `GOD + GLORY?` @[0.5,0.2], fade — her question
  visually echoes the trio

### t03 [40.1s, 19.8s] Marcus — Reconquista mindset
- **BG**: bg-swap → isabella-ferdinand.jpg at 0.99s (Ferdinand & Isabella,
  the Catholic Monarchs who finished it)
- **0.99s** ("reconquest"): SmartText title `RECONQUISTA` @[0.5,0.15], stamp
- **3.57s** ("centuries"): SmartText subtitle `CENTURIES OF HOLY WAR`
  @[0.5,0.3], fade — the timescale lands

### t04 [59.8s, 3.4s] Maya — "arms race with sails"
- **BG**: isabella-ferdinand.jpg (carry)
- **0s**: SpeechBubble `"Arms race — with sails ⛵"` @[0.5,0.25], w=420 —
  her joke gets the playful bubble

### t05 [63.2s, 3.0s] Marcus — "pope draws a line"
- **BG**: bg-swap → tordesillas-map.jpg at 1.65s (foreshadow the line)
- **1.65s** ("pope"): SmartText subtitle `THE POPE DRAWS A LINE`
  @[0.5,0.2], fade

### t06 [66.2s, 6.1s] Maya — 1453, Ottomans middleman
- **BG**: portolan-chart.jpg (trade routes context)
- **2.67s** ("ottomans"): SmartText hero `1453` @[0.5,0.2], red, stamp
- **2.67s**: SmartText subtitle `CONSTANTINOPLE FALLS` @[0.5,0.35], fade

### t07 [72.3s, 15.1s] Marcus — tariffs up, find own route
- **BG**: portolan-chart.jpg (carry)
- **1.32s** ("constantinople"): SmartText title `TARIFFS GO UP` @[0.5,0.15],
  gold, stamp
- **5.01s** ("finding"): SmartText subtitle `FIND YOUR OWN ROUTE`
  @[0.5,0.3], fade — the motive crystallizes

### t08 [87.4s, 3.0s] Maya — "never actually sailed anywhere"
- **BG**: henry-navigator.jpg (Prince Henry portrait)
- **0s**: SpeechBubble `"The guy who never sailed anywhere"` @[0.5,0.25],
  w=420

### t09 [90.3s, 20.7s] Marcus — Henry's captains, navigation tools
- **BG**: henry-navigator.jpg → bg-swap astrolabe.jpg at 5.37s (tools section)
- **5.37s** ("avail"=caravel): SmartText title `CARAVEL` @[0.3,0.2], stamp
- **6.69s** ("latino"=lateen): SmartText title `LATEEN SAIL` @[0.5,0.2], stamp
- **~8s**: SmartText title `ASTROLABE` @[0.7,0.2], stamp — three tools,
  staggered as named (astrolabe word not in Vosk; timed to follow lateen)

### t10 [111.0s, 10.6s] Maya — queasy on the ferry joke
- **BG**: astrolabe.jpg → bg-swap caravel-replicas.jpg at 0s (ships, her fear)
- **0s**: SpeechBubble `"Compass and a prayer 🧭🙏"` @[0.5,0.25], w=400

### t11 [121.6s, 9.4s] Marcus — 1492, Granada, crown has cash
- **BG**: bg-swap debry-columbus-departs.jpg at 0s (ships leaving)
- **0s**: SmartText hero `1492` @[0.5,0.2], gold, stamp
- **~4s**: SmartText subtitle `GRANADA FALLS → CROWN HAS CASH` @[0.5,0.35],
  fade ("granada" not in Vosk; timed to narrative flow)

### t12 [131.1s, 3.6s] Maya — "Columbus. Wrong about everything."
- **BG**: debry-columbus-landing.jpg (carry)
- **0s**: LeaderSticker Columbus @[0.28,0.52], size 320 — he enters

### t13 [134.7s, 8.0s] Marcus — wrong about Asia distance
- **BG**: bg-swap behaim-erdapfel-1492.jpg at 2.1s (1492 globe showing
  the wrong worldview)
- **2.1s** ("asia"): SmartText title `WRONG ABOUT ASIA` @[0.5,0.15],
  red, stamp
- Columbus leader persists

### t14 [142.7s, 4.3s] Maya — flat earth myth
- **BG**: behaim-erdapfel-1492.jpg (carry — the globe proves the point)
- **0s**: SpeechBubble `"Nobody educated thought the earth was flat"`
  @[0.5,0.2], w=480
- Columbus leader persists

### t15 [147.0s, 15.6s] Marcus — Columbus wrong about distance
- **BG**: behaim-erdapfel-1492.jpg (carry)
- **~8s**: SmartText subtitle `WRONG ABOUT DISTANCE, NOT SHAPE` @[0.5,0.3],
  fade ("distance" not in Vosk; mid-turn)
- Columbus leader persists

### t16 [162.6s, 1.8s] Maya — "Never even saw North America."
- **BG**: debry-columbus-landing.jpg
- **0s**: SmartText subtitle `NEVER SAW NORTH AMERICA` @[0.5,0.2], fade
- Columbus leader persists (ironic — he's here but never saw it)

### t17 [164.4s, 9.8s] Marcus — four voyages, Portugal furious
- **BG**: bg-swap tordesillas-map.jpg at 0.39s (tension → the line)
- **0.39s** ("voyages"): SmartText title `4 VOYAGES` @[0.5,0.15], stamp
- **4.02s** ("portugal"): SmartText subtitle `PORTUGAL IS FURIOUS`
  @[0.5,0.3], red, fade

### t18 [174.2s, 2.5s] Maya — "pope divides up the planet?"
- **BG**: tordesillas-map.jpg (carry)
- **0s**: SpeechBubble `"Just... divides up the planet? 🌍"` @[0.5,0.2], w=440

### t19 [176.7s, 13.2s] Marcus — Treaty of Tordesillas 1494
- **BG**: tordesillas-map.jpg (carry — the map IS the visual)
- **3.48s** ("tortoises"=tordesillas): SmartText hero `1494` @[0.5,0.15],
  gold, stamp
- **3.48s**: SmartText title `TREATY OF TORDESILLAS` @[0.5,0.3], stamp

### t20 [189.9s, 2.4s] Maya — "France and England agree?"
- **BG**: tordesillas-map.jpg (carry)
- **0s**: SpeechBubble `"France and England: ignored it completely"`
  @[0.5,0.2], w=440

### t21 [192.3s, 8.7s] Marcus — Brazil speaks Portuguese
- **BG**: tordesillas-map.jpg (carry)
- **4.68s** ("brazil"): SmartText subtitle `WHY BRAZIL SPEAKS PORTUGUESE`
  @[0.5,0.2], stamp — the payoff

### t22 [201.0s, 2.0s] Maya — "One down, two to go."
- **BG**: bruegel-harvesters-1565.jpg (transition to exchange)
- **0s**: ThreeBoxesE2 checked=['tordesillas'] @[0.5,0.55] — progress tracker

### t23 [203.0s, 11.4s] Marcus — exchange begins
- **BG**: bruegel-harvesters-1565.jpg → bg-swap fuchs-maize-1542.jpg at 9.81s
- **1.68s** ("plants"): SmartText body `PLANTS · ANIMALS · PEOPLE · DISEASE`
  @[0.5,0.2], fade — the four categories
- **9.81s** ("colombian"): SmartText hero `THE COLUMBIAN EXCHANGE`
  @[0.5,0.15], stamp

### t24 [214.4s, 3.3s] Maya — "potatoes east, horses west?"
- **BG**: fuchs-maize-1542.jpg (carry)
- **0s**: SmartText title `🥔 → EAST  🐴 → WEST` @[0.5,0.2], stamp —
  previews next beats

### t25 [217.7s, 7.6s] Marcus — crops sail east
- **BG**: bg-swap potatoes.jpg at 0.78s
- **0.78s** ("potatoes"): SmartText title `🥔 POTATOES → EAST` @[0.5,0.2], stamp

### t26 [225.3s, 2.0s] Maya — "a lot of groceries"
- **BG**: potatoes.jpg → bg-swap sugarcane-harvest.jpg at 0s (more crops)
- **0s**: SpeechBubble `"A lot of groceries 🛒🌊"` @[0.5,0.25], w=380

### t27 [227.3s, 6.4s] Marcus — livestock sail west
- **BG**: bg-swap comanche-horses.jpg at 1.53s
- **1.53s** ("horses"): SmartText title `🐴 HORSES → WEST` @[0.5,0.2], stamp

### t28 [233.7s, 7.9s] Maya — "My whole personality is a lie"
- **BG**: bg-swap durer-large-horse-1505.jpg at 0s (Dürer horse — art + horses)
- **0s**: SpeechBubble `"My whole personality is a lie"` @[0.5,0.25], w=380

### t29 [241.6s, 14.4s] Marcus — disease, the dark side
- **BG**: bg-swap smallpox-florentine-codex.jpg at 4.26s
- **4.26s** ("smallpox"): SmartText hero `SMALLPOX` @[0.5,0.2], red, stamp
- **4.26s**: SmartText subtitle `THE DARK SIDE` @[0.5,0.35], fade

### t30 [255.9s, 8.5s] Maya — cause-and-effect test question
- **BG**: smallpox-florentine-codex.jpg (carry)
- **1.11s** ("cause"): SmartText subtitle `CAUSE → EFFECT` @[0.5,0.2], stamp
- **~4s**: GravityText `WHAT CLEARED THE GROUND?` @[0.5,0.35] — the exam
  question drops in

### t31 [264.4s, 4.6s] Marcus — "disease cleared the ground"
- **BG**: smallpox-florentine-codex.jpg (carry)
- **2.64s** ("disease"): SmartText title `DISEASE DID THE WORK` @[0.5,0.2],
  stamp — answers t30's question

### t32 [269.0s, 2.7s] Maya — "Anything go back east?"
- **BG**: smallpox-florentine-codex.jpg (carry)
- **0s**: SpeechBubble `"Did anything go EAST? 🤔"` @[0.5,0.25], w=360

### t33 [271.7s, 3.6s] Marcus — syphilis debate
- **BG**: smallpox-florentine-codex.jpg (carry)
- **1.05s** ("syphilis"): SmartText subtitle `SYPHILIS? — DEBATED`
  @[0.5,0.2], fade

### t34 [275.3s, 0.9s] Maya — "Two down."
- **BG**: smallpox-florentine-codex.jpg (carry)
- **0s**: ThreeBoxesE2 checked=['tordesillas','exchange'] @[0.5,0.55]

### t35 [276.2s, 9.2s] Marcus — conquest pattern
- **BG**: bg-swap lienzo-tlaxcala.jpg at 3.84s (Tlaxcala manuscript —
  conquest from the Native perspective)
- **3.84s** ("conquest"): LeaderSticker Cortés @[0.28,0.52], size 320

### t36 [285.4s, 3.0s] Maya — "A few hundred? Against an empire?"
- **BG**: lienzo-tlaxcala.jpg → bg-swap cannon.jpg at 0s (guns)
- **0s**: SmartText title `A FEW HUNDRED vs AN EMPIRE` @[0.5,0.15], stamp
- Cortés leader persists

### t37 [288.3s, 13.2s] Marcus — guns, horses, smallpox + allies
- **BG**: cannon.jpg → bg-swap pirotechnia-cannons-1540.jpg at 4.92s
- **4.92s** ("tens"): SmartText subtitle `TENS OF THOUSANDS OF NATIVE ALLIES`
  @[0.5,0.3], fade — "the part people skip"
- Cortés leader persists

### t38 [301.6s, 2.4s] Maya — "Spain just owns everyone?"
- **BG**: pirotechnia-cannons-1540.jpg (carry)
- **0s**: SpeechBubble `"Just... owns everyone? 👑"` @[0.5,0.25], w=360

### t39 [304.0s, 11.2s] Marcus — encomienda system
- **BG**: bg-swap debry-hispaniola-mines.jpg at 0s (forced labor visual)
- **0s**: SmartText hero `ENCOMIENDA SYSTEM` @[0.5,0.15], stamp
- **3.6s** ("grant"): SmartText subtitle `GRANT = LABOR + TRIBUTE`
  @[0.5,0.3], fade

### t40 [315.2s, 1.1s] Maya — "Supposed to."
- **BG**: debry-hispaniola-mines.jpg (carry)
- **0s**: SpeechBubble `"Supposed to. 🙄"` @[0.5,0.3], w=280 — deadpan

### t41 [316.4s, 20.2s] Marcus — forced labor, Las Casas speaks up
- **BG**: debry-hispaniola-mines.jpg (carry)
- **7.92s** ("casas"): LeaderSticker Las Casas @[0.28,0.52], size 320
- **7.92s**: SpeechBubble `"One of them spoke up"` @[0.65,0.25], w=320

### t42 [336.5s, 1.3s] Maya — "Did it work?"
- **BG**: debry-hispaniola-mines.jpg (carry)
- **0s**: SmartText subtitle `DID IT WORK?` @[0.5,0.2], stamp
- Las Casas persists

### t43 [337.8s, 11.9s] Marcus — New Laws failed
- **BG**: debry-hispaniola-mines.jpg (carry)
- **1.77s** ("revolted"): SmartText subtitle `COLONISTS NEARLY REVOLTED`
  @[0.5,0.2], red, fade
- Las Casas persists

### t44 [349.7s, 1.8s] Maya — "And that's all three."
- **BG**: debry-hispaniola-mines.jpg (carry)
- **0s**: ThreeBoxesE2 checked=['tordesillas','exchange','encomienda']
  @[0.5,0.55] — all checked

### t45 [351.5s, 6.0s] Maya — recap 1: Tordesillas
- **BG**: caravel-replicas.jpg (voyage out → voyage home)
- **0s**: ThreeBoxesE2 checked=['tordesillas'] @[0.5,0.55]
- **4.8s** ("tordesillas"): SmartText title `① TORDESILLAS: 1494`
  @[0.5,0.2], stamp

### t46 [357.6s, 9.5s] Marcus — 1494 detail
- **BG**: bg-swap tordesillas-map.jpg at 3.54s (show the line again)
- **3.54s** ("leagues"): SmartText subtitle `370 LEAGUES WEST OF CAPE VERDE`
  @[0.5,0.2], fade
- **4.26s** ("cape"): SmartText subtitle `WEST → SPAIN · EAST → PORTUGAL`
  @[0.5,0.32], fade

### t47 [367.1s, 5.9s] Maya — recap 2: Exchange
- **BG**: caravel-replicas.jpg
- **0s**: ThreeBoxesE2 checked=['tordesillas','exchange'] @[0.5,0.55]
- **1.5s** ("exchange"): SmartText title `② EXCHANGE: BOTH WAYS`
  @[0.5,0.2], stamp

### t48 [373.0s, 14.4s] Marcus — disease west, crops both
- **BG**: caravel-replicas.jpg → bg-swap fuchs-maize-1542.jpg at 4.32s
- **1.95s** ("disease"): SmartText subtitle `☠️ → WEST (one way)` @[0.5,0.2],
  red, fade
- **4.32s** ("both"): SmartText subtitle `🥔🌽 ↔ BOTH WAYS` @[0.5,0.32], fade

### t49 [387.4s, 2.4s] Maya — recap 3: encomienda
- **BG**: caravel-replicas.jpg
- **0s**: ThreeBoxesE2 checked=['tordesillas','exchange','encomienda']
  @[0.5,0.55]
- **0s**: SmartText title `③ ENCOMIENDA` @[0.5,0.2], stamp

### t50 [389.8s, 12.5s] Marcus — encomienda expanded
- **BG**: debry-hispaniola-mines.jpg (back to the mines for the brutal truth)
- **0s**: SmartText title `LABOR + TRIBUTE` @[0.5,0.15], stamp
- **4.11s** ("christianity"): SmartText subtitle `"FOR CHRISTIANITY"`
  @[0.5,0.3], fade — air-quotes energy

### t51 [402.3s, 10.5s] Maya — quiz intro
- **BG**: caravel-replicas.jpg
- **0s**: GravityText `QUIZ TIME` @[0.5,0.2] — drops in
- **3.21s** ("answer"): SmartText subtitle `SAY YOUR ANSWER FIRST`
  @[0.5,0.35], fade

### t52 [412.8s, 9.3s] Maya — quiz Q1 + A1
- **BG**: caravel-replicas.jpg
- **0s**: SmartText subtitle `EUROPE GOT: 🥔🌽🍅` @[0.5,0.25], stamp
- **5.25s** ("horses"): SmartText subtitle `AMERICAS GOT: 🐴🌾` @[0.5,0.35],
  stamp

### t53 [422.0s, 4.9s] Maya — quiz Q2
- **BG**: caravel-replicas.jpg
- **0s**: GravityText `Q2: ENCOMIENDA IN ONE SENTENCE?` @[0.5,0.2]

### t54 [427.0s, 9.8s] Maya — quiz A2
- **BG**: caravel-replicas.jpg
- **0s**: SmartText subtitle `ENCOMIENDA = LABOR GRANT` @[0.5,0.25], stamp
- **4.02s** ("supposedly"): SpeechBubble `"Supposedly for Christianity"`
  @[0.5,0.4], w=400 — air quotes

### t55 [436.8s, 8.0s] Maya — outro
- **BG**: debry-columbus-departs.jpg (ships sailing into the sunset —
  next episode teaser)
- **0s**: SmartText hero `EPISODE 2 ✓` @[0.5,0.3], green, stamp

### t56 [444.8s, 2.2s] Marcus — "Two worlds, one ocean —"
- **BG**: debry-columbus-departs.jpg (carry)
- **0s**: SmartText hero `TWO WORLDS, ONE OCEAN` @[0.5,0.3], fade —
  shared with t57

### t57 [447.0s, 1.3s] Maya — "No going back."
- **BG**: debry-columbus-departs.jpg (carry)
- **0s**: SmartText hero `NO GOING BACK.` @[0.5,0.4], stamp — final punch
