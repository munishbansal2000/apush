/**
 * U1E4Episode — Unit 1 Episode 4: Planting, Not Raiding.
 *
 * Jamestown and the start of English America. They sailed here hunting
 * gold — and ended up planting themselves.
 * Four boxes: Jamestown, tobacco, House of Burgesses, 1619.
 *
 * Tone arc: FUN (gold fever jokes, Disney myth-busting) → DARK
 * (starving time, 500→60) → HOPE (tobacco saves them) → SERIOUS
 * (1619 contradiction: assembly AND slave ship, same year).
 *
 * 76 turns, ~725 seconds, 30fps.
 * Script: audio_scripts/unit1/apush-audio-u1-e4-script-v6-DRAFT.md (canonical)
 */
import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { TalkingHead } from './TalkingHead';
import { TitleCard } from './TitleCard';
import { SpeechBubble } from './SpeechBubble';
import { GravityText } from './GravityDrop';
import { SmartText } from './SmartText';
import { MapJourney, JourneyItem } from '../legacy/MapJourney';
import { PrimarySourceSpotlight } from './PrimarySourceSpotlight';
import { VersusPolarization } from './VersusPolarization';
import { ToneProvider } from '../validation/ToneContext';
import { AutoLayoutProvider } from '../validation/AutoLayout';

import { loadEpisodeData, type EpisodeData } from '../lib/load-episode-data';

interface Turn {
  id: string;
  speaker: string;
  text: string;
  duration_sec: number;
  pause_after?: number;
}


const EP = 'u1e4';

/* ------------------------------------------------------------------ */
/* Sub-beats: timed visual events. offset = seconds into the turn.      */
/* All offsets from Vosk word_times.json (measured, never estimated).  */
/* ------------------------------------------------------------------ */
interface SubBeat {
  turnId: string;
  offset: number;
  kind: 'smarttext' | 'bubble' | 'gravity' | 'bg-swap' | 'leader' | 'mapjourney' | 'primarysource' | 'versus' | 'timeline';
  text?: string;
  position?: [number, number];
  level?: 'hero' | 'title' | 'subtitle' | 'body';
  color?: string;
  entrance?: 'stamp' | 'fade' | 'typewriter';
  bgImage?: string;
  width?: number;
  // MapJourney props
  mapImage?: string;
  items?: JourneyItem[];
  caption?: string;
  variant?: 'overview' | 'detail' | 'dark';
  // PrimarySource props
  documentTitle?: string;
  authorAndDate?: string;
  excerptText?: string;
  highlightedPhrase?: string;
  hippType?: 'Historical Context' | 'Intended Audience' | 'Purpose' | 'Point of View';
  hippExplanation?: string;
}

const SUB_BEATS: SubBeat[] = [
  // === ACT 1: JAMESTOWN FOUNDING (t00-t20) ===

  // t00: Opening — title via TitleCard, foreshadow the tagline
  { turnId: 't00', offset: 28.0, kind: 'smarttext', text: 'FOUR BOXES', level: 'subtitle', position: [0.5, 0.65], entrance: 'fade' },

  // t01: "no king paid for Jamestown" — JOINT-STOCK COMPANY
  { turnId: 't01', offset: 4.0, kind: 'smarttext', text: 'JOINT-STOCK COMPANY', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't01', offset: 8.0, kind: 'smarttext', text: 'NOT THE KING\'S MONEY', level: 'subtitle', position: [0.5, 0.35], color: '#ffd700' },

  // t02: Maya's misconception
  { turnId: 't02', offset: 0.5, kind: 'bubble', text: 'Wait — the king didn\'t pay?', position: [0.5, 0.3], width: 360 },

  // t03: "The king's charter, the merchants' money"
  { turnId: 't03', offset: 0.5, kind: 'smarttext', text: 'KING\'S CHARTER', level: 'subtitle', position: [0.5, 0.2], color: '#c9a227' },
  { turnId: 't03', offset: 3.0, kind: 'smarttext', text: 'MERCHANTS\' MONEY', level: 'subtitle', position: [0.5, 0.35], color: '#90ee90' },

  // t04: "So who actually got on the boats?"
  { turnId: 't04', offset: 0.3, kind: 'bubble', text: 'Who got on the boats? ⛵', position: [0.5, 0.3], width: 340 },

  // t05: Three ships MapJourney — England → Jamestown
  { turnId: 't05', offset: 2.0, kind: 'mapjourney', mapImage: 'historic/u1e4/james-river-map.jpg',
    items: [
      { id: 'ship1', content: '⛵', from: [780, 180], to: [280, 380], duration: 5, style: 'float', size: 52 },
      { id: 'ship2', content: '⛵', from: [800, 220], to: [300, 400], duration: 5.5, delay: 0.8, style: 'float', size: 44 },
      { id: 'ship3', content: '⛵', from: [780, 260], to: [280, 420], duration: 6, delay: 1.6, style: 'float', size: 40 },
    ],
    caption: '1607: THREE SHIPS → JAMESTOWN', variant: 'overview' },
  { turnId: 't05', offset: 3.0, kind: 'smarttext', text: '105 MEN AND BOYS', level: 'title', position: [0.5, 0.15], entrance: 'stamp' },
  { turnId: 't05', offset: 10.0, kind: 'smarttext', text: 'SWAMP SITE: DEFENSIBLE, UNDRINKABLE', level: 'body', position: [0.5, 0.55] },

  // t06: Maya's camping joke
  { turnId: 't06', offset: 0.5, kind: 'bubble', text: 'I got sick off lake water once 🏕️', position: [0.5, 0.3], width: 380 },

  // t07: "dig gold, refine gold, load gold" — THE QUOTE (hero)
  { turnId: 't07', offset: 12.0, kind: 'smarttext', text: 'DIG GOLD, REFINE GOLD, LOAD GOLD', level: 'hero', position: [0.5, 0.25], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't07', offset: 12.0, kind: 'bg-swap', bgImage: 'historic/u1e4/three-ships.jpg' },

  // t08: "Digging for gold. In Virginia."
  { turnId: 't08', offset: 0.5, kind: 'bubble', text: 'Digging for gold... in Virginia? 🤨', position: [0.5, 0.3], width: 380 },

  // t09: John Smith + his law + fool's gold reveal
  { turnId: 't09', offset: 1.0, kind: 'smarttext', text: 'FOOL\'S GOLD', level: 'title', position: [0.5, 0.15], entrance: 'stamp', color: '#ff6b6b' },
  { turnId: 't09', offset: 3.0, kind: 'smarttext', text: 'IRON PYRITE', level: 'subtitle', position: [0.5, 0.3] },
  { turnId: 't09', offset: 7.0, kind: 'bg-swap', bgImage: 'historic/u1e4/john-smith.jpg' },
  { turnId: 't09', offset: 8.0, kind: 'smarttext', text: '"HE THAT WILL NOT WORK, SHALL NOT EAT"', level: 'title', position: [0.5, 0.4], entrance: 'stamp', color: '#ffd700' },

  // t10: "Cold."
  { turnId: 't10', offset: 0.2, kind: 'bubble', text: 'Cold. 🥶', position: [0.5, 0.3], width: 200 },

  // t11: Smith's gunpowder fire, sails home
  { turnId: 't11', offset: 4.0, kind: 'smarttext', text: '1609: SMITH SAILS HOME', level: 'subtitle', position: [0.5, 0.25], color: '#ff6b6b' },

  // t12: Pocahontas rescue?
  { turnId: 't12', offset: 0.5, kind: 'bubble', text: 'Disney lied? 🏹', position: [0.5, 0.3], width: 280 },
  { turnId: 't12', offset: 1.5, kind: 'bg-swap', bgImage: 'historic/u1e4/pocahontas-real.jpg' },

  // t13: Myth-busting — made up or misunderstood
  { turnId: 't13', offset: 3.0, kind: 'smarttext', text: 'MADE UP?', level: 'subtitle', position: [0.5, 0.25], color: '#ff6b6b' },
  { turnId: 't13', offset: 5.0, kind: 'smarttext', text: 'MISUNDERSTOOD CEREMONY?', level: 'subtitle', position: [0.5, 0.4], color: '#ffd700' },
  { turnId: 't13', offset: 9.0, kind: 'smarttext', text: 'NOBODY\'S FULLY SURE', level: 'body', position: [0.5, 0.5] },

  // t14: Prediction beat — "What happens next?"
  { turnId: 't14', offset: 8.0, kind: 'smarttext', text: 'WINTER 1609. WHAT HAPPENS NEXT?', level: 'subtitle', position: [0.5, 0.3], entrance: 'fade' },

  // t15: "500 → 60" — STARVING TIME (hero, red)
  { turnId: 't16', offset: 2.0, kind: 'smarttext', text: '500 → 60', level: 'hero', position: [0.5, 0.25], entrance: 'stamp', color: '#ff0000' },
  { turnId: 't16', offset: 2.0, kind: 'bg-swap', bgImage: 'historic/u1e4/starving-time.jpg' },
  { turnId: 't16', offset: 5.0, kind: 'smarttext', text: 'THE STARVING TIME', level: 'subtitle', position: [0.5, 0.45], color: '#ff6b6b' },

  // t16: They quit + Delaware arrives (irony)
  { turnId: 't17', offset: 6.0, kind: 'smarttext', text: 'SPRING 1610: THEY QUIT', level: 'subtitle', position: [0.5, 0.2], color: '#ff6b6b' },
  { turnId: 't17', offset: 10.0, kind: 'smarttext', text: 'DE LA WARR ARRIVES AS THEY LEAVE', level: 'subtitle', position: [0.5, 0.35], entrance: 'stamp', color: '#ffd700' },

  // t17: Delaware irony
  { turnId: 't18', offset: 0.5, kind: 'bubble', text: 'Ran into your replacement on the way out 😅', position: [0.5, 0.3], width: 400 },

  // t18: "The bay, the river, and the state"
  { turnId: 't19', offset: 0.5, kind: 'smarttext', text: 'DELAWARE: BAY, RIVER, STATE', level: 'subtitle', position: [0.5, 0.3] },
  { turnId: 't19', offset: 1.0, kind: 'bg-swap', bgImage: 'historic/u1e4/delaware-portrait.jpg' },

  // t19: Exam question setup
  { turnId: 't20', offset: 2.0, kind: 'smarttext', text: 'SWAMP OR PEOPLE?', level: 'title', position: [0.5, 0.25], entrance: 'stamp' },

  // t20: THESIS — "The swamp hurt, but the gold-fever killed"
  { turnId: 't21', offset: 1.0, kind: 'smarttext', text: 'THE SWAMP HURT', level: 'subtitle', position: [0.5, 0.25] },
  { turnId: 't21', offset: 4.0, kind: 'smarttext', text: 'THE GOLD-FEVER KILLED', level: 'title', position: [0.5, 0.4], entrance: 'stamp', color: '#ff6b6b' },

  // === ACT 2: TOBACCO (t21-t35) ===

  // t21: Box 1 mistake
  { turnId: 't22', offset: 1.0, kind: 'smarttext', text: '📦 BOX 1 MISTAKE', level: 'subtitle', position: [0.5, 0.2] },
  { turnId: 't22', offset: 3.0, kind: 'smarttext', text: 'NOT THE KING\'S MONEY', level: 'subtitle', position: [0.5, 0.35], color: '#ffd700' },
  { turnId: 't22', offset: 5.5, kind: 'smarttext', text: '✓ BOX 1 CHECKED', level: 'body', position: [0.5, 0.5], color: '#90ee90' },

  // t22: "One plant" — Rolfe's tobacco
  { turnId: 't23', offset: 6.0, kind: 'smarttext', text: 'ONE PLANT', level: 'hero', position: [0.5, 0.2], entrance: 'stamp', color: '#90ee90' },
  { turnId: 't23', offset: 8.0, kind: 'smarttext', text: 'JOHN ROLFE + TOBACCO, ~1612', level: 'subtitle', position: [0.5, 0.35] },
  { turnId: 't23', offset: 8.0, kind: 'bg-swap', bgImage: 'historic/u1e4/tobacco-plant.jpg' },

  // t23: "Rolfe the tobacco guy is Rolfe the husband guy"
  { turnId: 't24', offset: 0.3, kind: 'bubble', text: 'Same guy?! 💍🌿', position: [0.5, 0.3], width: 280 },

  // t24: Tobacco selling in London
  { turnId: 't25', offset: 3.0, kind: 'smarttext', text: 'THE WEED THAT SAVED THEM', level: 'subtitle', position: [0.5, 0.3], color: '#90ee90' },
  { turnId: 't25', offset: 5.0, kind: 'bg-swap', bgImage: 'historic/u1e4/tobacco-curing.jpg' },

  // t25: King hated smoking?
  { turnId: 't26', offset: 0.3, kind: 'bubble', text: 'The king hated smoking?', position: [0.5, 0.3], width: 320 },

  // t26: Counterblaste
  { turnId: 't27', offset: 2.0, kind: 'smarttext', text: 'A COUNTERBLASTE TO TOBACCO', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't27', offset: 4.0, kind: 'smarttext', text: '1604 — JAMES I', level: 'subtitle', position: [0.5, 0.35] },
  { turnId: 't27', offset: 4.0, kind: 'bg-swap', bgImage: 'historic/u1e4/james-i.jpg' },
  { turnId: 't27', offset: 6.5, kind: 'smarttext', text: 'NEVER STOOD A CHANCE AGAINST THE MONEY', level: 'body', position: [0.5, 0.55], color: '#ffd700' },

  // t27: Disney version?
  { turnId: 't28', offset: 0.5, kind: 'bubble', text: 'How much Disney survives? 🎬', position: [0.5, 0.3], width: 340 },

  // t28: Pocahontas reality — 1613, 1614, 1617
  { turnId: 't29', offset: 2.0, kind: 'smarttext', text: '1613: CAPTURED', level: 'body', position: [0.5, 0.2] },
  { turnId: 't29', offset: 5.0, kind: 'smarttext', text: '1614: MARRIED ROLFE', level: 'body', position: [0.5, 0.32] },
  { turnId: 't29', offset: 8.0, kind: 'smarttext', text: '1617: DIED IN ENGLAND, ~20', level: 'body', position: [0.5, 0.44], color: '#ff6b6b' },

  // t29: Who works the fields?
  { turnId: 't30', offset: 0.5, kind: 'bubble', text: 'Who plants all this? 🌿', position: [0.5, 0.3], width: 300 },

  // t30: Headright explained
  { turnId: 't31', offset: 4.0, kind: 'smarttext', text: 'HEADRIGHT, 1618', level: 'title', position: [0.5, 0.15], entrance: 'stamp' },
  { turnId: 't31', offset: 6.0, kind: 'smarttext', text: '50 ACRES PER PASSAGE PAID', level: 'subtitle', position: [0.5, 0.3], color: '#ffd700' },
  { turnId: 't31', offset: 9.0, kind: 'smarttext', text: '50 ACRES × 6 HEADS = 300 ACRES', level: 'body', position: [0.5, 0.45], color: '#ffd700' },

  // t31: Workers get acres? (misconception)
  { turnId: 't32', offset: 0.3, kind: 'bubble', text: 'Workers got the land?', position: [0.5, 0.3], width: 300 },

  // t32: "The boss, not the boat ride" (who benefits)
  { turnId: 't33', offset: 1.0, kind: 'smarttext', text: 'THE BOSS, NOT THE BOAT RIDE', level: 'subtitle', position: [0.5, 0.3], color: '#ff6b6b' },

  // t33: Workers signed up?
  { turnId: 't34', offset: 0.3, kind: 'bubble', text: 'They signed up for this?', position: [0.5, 0.3], width: 320 },

  // t34: "4-7 YEARS" — indentured servitude
  { turnId: 't35', offset: 2.0, kind: 'smarttext', text: '4–7 YEARS', level: 'hero', position: [0.5, 0.25], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't35', offset: 4.0, kind: 'smarttext', text: 'INDENTURED SERVITUDE', level: 'subtitle', position: [0.5, 0.42] },
  { turnId: 't35', offset: 4.0, kind: 'bg-swap', bgImage: 'historic/u1e4/tobacco-curing.jpg' },

  // t35: Prediction — where does fresh land come from?
  { turnId: 't36', offset: 5.0, kind: 'smarttext', text: 'FRESH FIELDS HAVE TO COME FROM SOMEWHERE...', level: 'subtitle', position: [0.5, 0.3], entrance: 'fade' },

  // === ACT 3: 1619 — THE CONTRADICTION (t36-t55) ===

  // t36: "Powhatan land" (serious)
  { turnId: 't38', offset: 1.0, kind: 'smarttext', text: 'POWHATAN LAND', level: 'title', position: [0.5, 0.25], entrance: 'stamp', color: '#ff6b6b' },
  { turnId: 't38', offset: 1.0, kind: 'bg-swap', bgImage: 'historic/u1e4/powhatan-village.jpg' },

  // t37: Exam warning
  { turnId: 't39', offset: 2.0, kind: 'smarttext', text: 'TOBACCO + LABOR = ONE SYSTEM', level: 'subtitle', position: [0.5, 0.3] },

  // t38: Box 2 mistake + checked
  { turnId: 't40', offset: 1.0, kind: 'smarttext', text: 'HEADRIGHT → THE PLANTER WHO PAID', level: 'subtitle', position: [0.5, 0.3], color: '#ffd700' },
  { turnId: 't40', offset: 5.0, kind: 'smarttext', text: '✓ BOX 2 CHECKED', level: 'body', position: [0.5, 0.5], color: '#90ee90' },

  // t39: Who's running this place? + 1619 HERO
  { turnId: 't41', offset: 4.0, kind: 'bubble', text: 'Who\'s in charge here?', position: [0.5, 0.3], width: 300 },
  { turnId: 't41', offset: 6.0, kind: 'smarttext', text: '1619', level: 'hero', position: [0.5, 0.2], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't41', offset: 7.5, kind: 'smarttext', text: 'HOUSE OF BURGESSES', level: 'title', position: [0.5, 0.4], entrance: 'stamp' },
  { turnId: 't41', offset: 7.5, kind: 'bg-swap', bgImage: 'historic/u1e4/burgesses-assembly.jpg' },

  // t40: "The company just handed over power?" (bridge)
  { turnId: 't42', offset: 0.3, kind: 'bubble', text: 'They just... gave up power?', position: [0.5, 0.3], width: 320 },

  // t41: Traded power for settlers
  { turnId: 't43', offset: 3.0, kind: 'smarttext', text: 'A LITTLE POWER → A LOT OF SETTLERS', level: 'subtitle', position: [0.5, 0.3] },

  // t42: "Democracy year?"
  { turnId: 't44', offset: 0.5, kind: 'bubble', text: 'Democracy year? 🗳️', position: [0.5, 0.3], width: 280 },

  // t43: "Careful." — franchise narrowed
  { turnId: 't45', offset: 1.0, kind: 'smarttext', text: 'FREE MEN AT FIRST', level: 'body', position: [0.5, 0.25] },
  { turnId: 't45', offset: 4.0, kind: 'smarttext', text: 'THEN IT NARROWED', level: 'subtitle', position: [0.5, 0.38], color: '#ff6b6b' },
  { turnId: 't45', offset: 7.0, kind: 'smarttext', text: 'NEVER: WOMEN, SERVANTS, ENSLAVED', level: 'body', position: [0.5, 0.52] },

  // t44: Box 3 mistake
  { turnId: 't46', offset: 1.0, kind: 'smarttext', text: 'NOT EVERYONE VOTED', level: 'subtitle', position: [0.5, 0.3], color: '#ff6b6b' },

  // t45: Exam point
  { turnId: 't47', offset: 3.0, kind: 'smarttext', text: 'COLONISTS EXPECTED A SAY', level: 'subtitle', position: [0.5, 0.3] },

  // t46: "Same year... something else?"
  { turnId: 't48', offset: 1.0, kind: 'bubble', text: 'Same year... something else? 🤔', position: [0.5, 0.3], width: 360 },

  // t47: WHITE LION + "20 and odd" (dark)
  { turnId: 't49', offset: 6.0, kind: 'smarttext', text: 'THE WHITE LION', level: 'title', position: [0.5, 0.2], entrance: 'stamp', color: '#ff6b6b' },
  { turnId: 't49', offset: 6.0, kind: 'bg-swap', bgImage: 'historic/u1e4/white-lion-ship.jpg' },
  { turnId: 't49', offset: 12.0, kind: 'smarttext', text: '"20 AND ODD" AFRICANS', level: 'subtitle', position: [0.5, 0.38], color: '#ff6b6b' },

  // t48: Start of slavery?
  { turnId: 't50', offset: 0.5, kind: 'bubble', text: 'Start of slavery?', position: [0.5, 0.3], width: 280 },

  // t49: Status murky (hedged)
  { turnId: 't51', offset: 6.0, kind: 'smarttext', text: 'STOLEN TWICE OVER', level: 'subtitle', position: [0.5, 0.25], color: '#ff6b6b' },
  { turnId: 't51', offset: 10.0, kind: 'smarttext', text: 'SYSTEM COMES DECADES LATER', level: 'body', position: [0.5, 0.4] },

  // t50: "Same year. An assembly votes, and a slave ship lands." (the line)
  { turnId: 't52', offset: 0.5, kind: 'smarttext', text: 'SAME YEAR', level: 'title', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't52', offset: 2.0, kind: 'smarttext', text: 'AN ASSEMBLY VOTES. A SLAVE SHIP LANDS.', level: 'subtitle', position: [0.5, 0.42], color: '#ff6b6b' },

  // t51: THE CONTRADICTION (title, serious)
  { turnId: 't53', offset: 1.0, kind: 'smarttext', text: 'THE CONTRADICTION', level: 'title', position: [0.5, 0.2], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't53', offset: 3.0, kind: 'smarttext', text: 'AT THE START OF ENGLISH AMERICA', level: 'subtitle', position: [0.5, 0.35] },
  { turnId: 't53', offset: 12.0, kind: 'smarttext', text: '1622: OPECHANCANOUGH STRIKES', level: 'subtitle', position: [0.5, 0.55], color: '#ff6b6b' },

  // t52: "A quarter"
  { turnId: 't54', offset: 0.5, kind: 'smarttext', text: '347 DEAD. A QUARTER OF THE COLONY.', level: 'title', position: [0.5, 0.3], entrance: 'stamp', color: '#ff0000' },

  // t53: Not sudden
  { turnId: 't55', offset: 1.0, kind: 'smarttext', text: '15 YEARS OF PLANTING PAST EVERY BOUNDARY', level: 'subtitle', position: [0.5, 0.3] },

  // t54: Retaliation + 1624
  { turnId: 't56', offset: 8.0, kind: 'smarttext', text: '1624: ROYAL COLONY', level: 'title', position: [0.5, 0.3], entrance: 'stamp' },
  { turnId: 't56', offset: 12.0, kind: 'smarttext', text: 'CHARTER REVOKED', level: 'subtitle', position: [0.5, 0.45], color: '#ff6b6b' },

  // t55: Exam warning (1619 compare)
  { turnId: 't57', offset: 3.0, kind: 'smarttext', text: '1619: BUILT FOR A COMPARE QUESTION', level: 'subtitle', position: [0.5, 0.3] },

  // === ACT 4: RECAP + EXAM (t56-t75) ===

  // t56: Box 4 mistake
  { turnId: 't58', offset: 1.0, kind: 'smarttext', text: 'NOT A SLAVE COLONY OVERNIGHT', level: 'subtitle', position: [0.5, 0.3] },

  // t57: Four boxes intro
  { turnId: 't59', offset: 2.0, kind: 'smarttext', text: 'FOUR BOXES', level: 'hero', position: [0.5, 0.2], entrance: 'stamp' },

  // t58: Box 1 checked
  { turnId: 't60', offset: 2.0, kind: 'smarttext', text: '📦 BOX 1: JAMESTOWN ✓', level: 'title', position: [0.5, 0.25], color: '#90ee90' },
  { turnId: 't60', offset: 8.0, kind: 'smarttext', text: '1607 · COMPANY MONEY · GOLD-FEVER', level: 'body', position: [0.5, 0.42] },

  // t59: Box 2 checked
  { turnId: 't61', offset: 2.0, kind: 'smarttext', text: '📦 BOX 2: TOBACCO ✓', level: 'title', position: [0.5, 0.25], color: '#90ee90' },
  { turnId: 't61', offset: 6.0, kind: 'smarttext', text: 'ROLFE · HEADRIGHT · 4-7 YEARS', level: 'body', position: [0.5, 0.42] },

  // t60: Box 3 checked
  { turnId: 't62', offset: 2.0, kind: 'smarttext', text: '📦 BOX 3: BURGESSES ✓', level: 'title', position: [0.5, 0.25], color: '#90ee90' },
  { turnId: 't62', offset: 5.0, kind: 'smarttext', text: '1619 · FIRST ELECTED ASSEMBLY', level: 'body', position: [0.5, 0.42] },

  // t61-t63: Box 4
  { turnId: 't63', offset: 0.5, kind: 'bubble', text: 'Arrivals ≠ system', position: [0.5, 0.3], width: 300 },
  { turnId: 't64', offset: 3.0, kind: 'smarttext', text: 'ARRIVALS 1619 · SYSTEM DECADES LATER', level: 'subtitle', position: [0.5, 0.3] },
  { turnId: 't64', offset: 8.0, kind: 'smarttext', text: '1622: OPECHANCANOUGH · 1624: ROYAL COLONY', level: 'body', position: [0.5, 0.45] },
  { turnId: 't65', offset: 0.5, kind: 'smarttext', text: '📦 BOX 4: 1619 ✓', level: 'title', position: [0.5, 0.3], color: '#90ee90' },

  // t64-t70: Exam questions
  { turnId: 't66', offset: 1.0, kind: 'smarttext', text: '3 QUESTIONS, AP-SHAPED', level: 'subtitle', position: [0.5, 0.25] },
  { turnId: 't67', offset: 2.0, kind: 'smarttext', text: 'Q1: "DIG GOLD, REFINE GOLD, LOAD GOLD"', level: 'body', position: [0.5, 0.25] },
  { turnId: 't69', offset: 2.0, kind: 'smarttext', text: 'GOLD-FEVER > SWAMP', level: 'subtitle', position: [0.5, 0.3], color: '#ffd700' },
  { turnId: 't70', offset: 1.0, kind: 'smarttext', text: 'Q2: 6 SERVANTS → 300 ACRES?', level: 'body', position: [0.5, 0.25] },
  { turnId: 't72', offset: 2.0, kind: 'smarttext', text: 'HEADRIGHT: PLANTER BENEFITS', level: 'subtitle', position: [0.5, 0.3], color: '#ffd700' },
  { turnId: 't73', offset: 1.0, kind: 'smarttext', text: 'Q3: 1619 — ASSEMBLY + WHITE LION?', level: 'body', position: [0.5, 0.25] },
  { turnId: 't75', offset: 2.0, kind: 'smarttext', text: 'THE CONTRADICTION, SIDE BY SIDE', level: 'subtitle', position: [0.5, 0.3], color: '#ffd700' },

  // t71-t72: Bonus question
  { turnId: 't76', offset: 1.0, kind: 'smarttext', text: 'BONUS: ROYAL COLONY 1624?', level: 'body', position: [0.5, 0.3] },
  { turnId: 't78', offset: 1.0, kind: 'smarttext', text: 'VIRGINIA COMPANY\'S CHARTER REVOKED', level: 'subtitle', position: [0.5, 0.3], color: '#ff6b6b' },

  // t73: Carry forward
  { turnId: 't79', offset: 4.0, kind: 'smarttext', text: 'A WEED SAVED THEM. THEN IT BROKE THE PEACE.', level: 'subtitle', position: [0.5, 0.3] },

  // t74-t75: CLOSING TAGLINE
  { turnId: 't80', offset: 0.3, kind: 'smarttext', text: 'THEY SAILED HERE HUNTING GOLD —', level: 'subtitle', position: [0.5, 0.3] },
  { turnId: 't81', offset: 0.3, kind: 'smarttext', text: 'AND ENDED UP PLANTING THEMSELVES.', level: 'title', position: [0.5, 0.45], entrance: 'stamp', color: '#90ee90' },
];

/* ------------------------------------------------------------------ */
/* Versus: crown vs merchants (t01)                                     */
/* ------------------------------------------------------------------ */
const VERSUS_E4 = {
  clashTitle: 'WHO PAID FOR JAMESTOWN?',
  periodLabel: '1606–1607',
  entityA: {
    name: 'THE CROWN',
    subtitle: 'What people assume',
    points: ['Signed the charter', 'Gave permission', 'Paid nothing'],
    color: '#c9a227',
    accentColor: '#c9a227',
    faction: 'ASSUMPTION',
    portraitDesc: '👑',
    coreIdeology: 'The king\'s colony, the king\'s money — right?',
  },
  entityB: {
    name: 'THE MERCHANTS',
    subtitle: 'What actually happened',
    points: ['Virginia Company (joint-stock)', 'Private money, private risk', 'Profit motive drove everything'],
    color: '#90ee90',
    accentColor: '#90ee90',
    faction: 'REALITY',
    portraitDesc: '💰',
    coreIdeology: 'Pool private money, chase profit, bear the risk.',
  },
  verdictSummary: 'The king\'s charter, the merchants\' money.',
};

/* ------------------------------------------------------------------ */
/* Background per turn                                                  */
/* ------------------------------------------------------------------ */
const getBackgroundForTurn = (turnId: string | null, subBeatBg: string | null): string => {
  if (subBeatBg) return subBeatBg;
  if (!turnId) return 'historic/u1e4/james-river-map.jpg';
  const n = parseInt(turnId.slice(1), 10);
  if (n === 0) return 'historic/u1e4/james-river-map.jpg';
  // Act 1: founding (fun → serious)
  if (n <= 3) return 'historic/u1e4/virginia-company.jpg';
  if (n <= 5) return 'historic/u1e4/james-river-map.jpg';
  if (n === 6) return 'historic/u1e4/three-ships.jpg';
  if (n <= 8) return 'historic/u1e4/three-ships.jpg';
  if (n === 9) return 'historic/u1e4/john-smith.jpg';
  if (n <= 11) return 'historic/u1e4/three-ships.jpg';
  if (n <= 13) return 'historic/u1e4/pocahontas-real.jpg';
  if (n <= 16) return 'historic/u1e4/starving-time.jpg';
  if (n <= 18) return 'historic/u1e4/james-river-map.jpg';
  if (n <= 20) return 'historic/u1e4/three-ships.jpg';
  // Act 2: tobacco (hope)
  if (n === 21) return 'historic/u1e4/three-ships.jpg';
  if (n <= 24) return 'historic/u1e4/tobacco-plant.jpg';
  if (n <= 26) return 'historic/u1e4/james-i.jpg';
  if (n <= 28) return 'historic/u1e4/pocahontas-real.jpg';
  if (n <= 30) return 'historic/u1e4/tobacco-curing.jpg';
  if (n <= 34) return 'historic/u1e4/tobacco-curing.jpg';
  if (n === 35) return 'historic/u1e4/tobacco-curing.jpg';
  // Act 3: 1619 (serious)
  if (n === 36) return 'historic/u1e4/powhatan-village.jpg';
  if (n <= 39) return 'historic/u1e4/tobacco-curing.jpg';
  if (n <= 46) return 'historic/u1e4/burgesses-assembly.jpg';
  if (n <= 50) return 'historic/u1e4/white-lion-ship.jpg';
  if (n <= 54) return 'historic/u1e4/powhatan-village.jpg';
  if (n <= 56) return 'historic/u1e4/white-lion-ship.jpg';
  // Act 4: recap
  return 'historic/u1e4/james-river-map.jpg';
};

/* ------------------------------------------------------------------ */
/* Main episode                                                         */
/* ------------------------------------------------------------------ */
export const U1E4Episode: React.FC<{ episodeData?: EpisodeData }> = ({ episodeData }) => {
  const data = React.useMemo(() => episodeData ?? loadEpisodeData('e4'), [episodeData]);
  const turns = data.turns as Turn[];
  const starts = data.starts;
  const durations = data.durations;
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const timeSec = frame / fps;

  let activeIndex = -1;
  for (let i = 0; i < turns.length; i++) {
    if (timeSec >= starts[i] && timeSec < starts[i] + durations[i]) {
      activeIndex = i;
      break;
    }
  }

  const activeTurn = activeIndex >= 0 ? turns[activeIndex] : null;
  const activeStartFrame = activeIndex >= 0 ? Math.floor(starts[activeIndex] * fps) : 0;
  const turnElapsed = activeTurn ? timeSec - starts[activeIndex] : 0;

  const activeSubBeats = activeTurn
    ? SUB_BEATS.filter(b => b.turnId === activeTurn.id && turnElapsed >= b.offset)
    : [];

  const subBeatBg = activeSubBeats.find(b => b.kind === 'bg-swap')?.bgImage || null;
  const bgSrc = getBackgroundForTurn(activeTurn?.id || null, subBeatBg);

  // Ken Burns drift
  const kbProgress = frame / 1800;
  const kbScale = 1.05 + Math.sin(kbProgress * Math.PI * 2) * 0.03;
  const kbX = Math.sin(kbProgress * Math.PI * 2) * 20;
  const kbY = Math.cos(kbProgress * Math.PI * 2) * 12;

  // Tone: playful for founding fun, serious from starving time (t14+), dark for 1619 (t46+)
  const turnNum = activeTurn ? parseInt(activeTurn.id.slice(1), 10) : 0;
  const isDarkSection = turnNum >= 46;
  const isSeriousSection = turnNum >= 14;

  const showHead = activeTurn &&
    (activeTurn.speaker === 'maya' || activeTurn.speaker === 'marcus') &&
    !(activeTurn.id === 't00' && turnElapsed < 3);

  return (
    <ToneProvider tone={isDarkSection ? 'serious' : isSeriousSection ? 'serious' : 'playful'}>
      <AutoLayoutProvider debug={false}>
        <AbsoluteFill style={{ backgroundColor: '#1a1512' }}>
          {/* Background */}
          <div style={{
            position: 'absolute', inset: -60,
            transform: `scale(${kbScale}) translate(${kbX}px, ${kbY}px)`,
          }}>
            <Img src={staticFile(bgSrc)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
          </div>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 40%, rgba(0,0,0,0.2) 100%)',
          }} />

          {/* Audio */}
          {turns.map((turn, i) => (
            <Sequence key={`audio-${turn.id}`}
              from={Math.floor(starts[i] * fps)}
              durationInFrames={Math.max(1, Math.floor(durations[i] * fps))}>
              <Audio src={staticFile(`audio/${EP}/${turn.id}.mp3`)} />
            </Sequence>
          ))}

          {/* Talking head */}
          {showHead && (
            <TalkingHead
              key={`head-${activeTurn!.id}`}
              speakerName={activeTurn!.speaker === 'maya' ? 'Maya' : 'Marcus'}
              speakerColor={activeTurn!.speaker === 'maya' ? '#c9a227' : '#2c5aa0'}
              position="bottom-right"
              size={0.26}
              speaking={true}
              showName={true}
              assetPair={{
                realistic: staticFile(activeTurn!.speaker === 'maya' ? 'maya-real.webp' : 'marcus-real.webp'),
                stylized: staticFile(activeTurn!.speaker === 'maya' ? 'maya-toon.webp' : 'maya-toon.webp'),
              }}
              frameStyle="rounded"
            />
          )}

          {/* Title card */}
          {activeTurn?.id === 't00' && turnElapsed < 3 && (
            <TitleCard kicker="UNIT 1 · EPISODE 4:"
              title="PLANTING, NOT RAIDING" subline="JAMESTOWN AND ENGLISH AMERICA" at={activeStartFrame} />
          )}

          {/* Versus: crown vs merchants (t01) */}
          {activeTurn?.id === 't01' && turnElapsed >= 10 && (
            <VersusPolarization
              clashTitle={VERSUS_E4.clashTitle}
              periodLabel={VERSUS_E4.periodLabel}
              entityA={VERSUS_E4.entityA}
              entityB={VERSUS_E4.entityB}
              verdictSummary={VERSUS_E4.verdictSummary}
            />
          )}

          {/* Sub-beats */}
          {activeSubBeats.map((beat, idx) => {
            const beatFrame = activeStartFrame + Math.floor(beat.offset * fps);
            const key = `${beat.turnId}-${beat.offset}-${idx}`;

            if (beat.kind === 'smarttext' && beat.text) {
              // Supersede logic: later beats at same position replace earlier ones
              const pos = beat.position || [0.5, 0.2];
              const isSuperseded = activeSubBeats.some(b => {
                if (b.kind !== 'smarttext') return false;
                if (b.offset <= beat.offset || turnElapsed < b.offset) return false;
                const bp = b.position || [0.5, 0.2];
                const dist = Math.hypot(bp[0] - pos[0], bp[1] - pos[1]);
                return dist < 0.15;
              });
              if (isSuperseded) return null;
              return <SmartText key={key} text={beat.text} level={beat.level || 'title'}
                position={beat.position || [0.5, 0.2]} color={beat.color || '#f5e6c8'}
                entrance={beat.entrance || 'fade'} at={beatFrame} />;
            }

            if (beat.kind === 'bubble' && beat.text) {
              return <SpeechBubble key={key} text={beat.text}
                position={beat.position || [0.5, 0.3]} width={beat.width || 380}
                at={beatFrame} />;
            }

            if (beat.kind === 'gravity' && beat.text) {
              return <GravityText key={key} text={beat.text}
                landAt={beat.position || [0.5, 0.2]} at={beatFrame} dropHeight={350} />;
            }

            if (beat.kind === 'mapjourney' && beat.items) {
              return <MapJourney key={key}
                at={beatFrame}
                mapImage={beat.mapImage || 'historic/u1e4/james-river-map.jpg'}
                items={beat.items}
                caption={beat.caption}
                variant={beat.variant || 'overview'}
              />;
            }

            if (beat.kind === 'primarysource' && beat.documentTitle) {
              return <PrimarySourceSpotlight key={key}
                documentTitle={beat.documentTitle}
                authorAndDate={beat.authorAndDate || ''}
                excerptText={beat.excerptText || ''}
                highlightedPhrase={beat.highlightedPhrase || ''}
                hippType={beat.hippType || 'Point of View'}
                hippExplanation={beat.hippExplanation || ''}
              />;
            }

            // versus is handled above (full-turn component)
            // bg-swap is handled via subBeatBg

            return null;
          })}

          {/* Debug */}
          <div style={{
            position: 'absolute', top: 10, left: 10,
            fontFamily: 'monospace', fontSize: 13,
            color: 'rgba(255,255,255,0.5)', zIndex: 100,
          }}>
            {activeTurn ? `${activeTurn.id} [${activeTurn.speaker}] ${timeSec.toFixed(1)}s` : '—'}
          </div>
        </AbsoluteFill>
      </AutoLayoutProvider>
    </ToneProvider>
  );
};
