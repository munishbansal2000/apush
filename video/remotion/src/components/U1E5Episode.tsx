/**
 * U1E5Episode — Unit 1 Episode 5: Silver Empire.
 *
 * Potosí, Zacatecas, pieces of eight, the royal fifth, mercantilism,
 * the price revolution, the Black Legend's backdrop. One mountain
 * bankrolled an empire — and the empire still went broke four times.
 * Four boxes: the silver machine, the human cost, Bodin and the birth
 * of inflation theory, the Manila galleons.
 *
 * Tone arc: PLAYFUL (wind vs llama, altitude sickness, pirate treasure,
 * dollar-sign keyboard) → SERIOUS/DARK (mercury poisoning, the mita,
 * Guamán Poma's unread letter) → ANALYTICAL (Bodin vs Malestroit,
 * resource-curse debate) → ADVENTURE (galleons, Urdaneta's tornaviaje)
 * → RECAP (exam devices, closing tagline).
 *
 * 71 turns, ~657 seconds, 30fps.
 * Script: audio_scripts/unit1/apush-audio-u1-e5-script-v5-DRAFT.md (canonical)
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
import { MapJourney, JourneyItem } from './MapJourney';
import { PrimarySourceSpotlight } from './PrimarySourceSpotlight';
import { VersusPolarization } from './VersusPolarization';
import { ToneProvider } from '../validation/ToneContext';
import { EpisodeMusic } from './EpisodeMusic';
import { AutoLayoutProvider } from '../validation/AutoLayout';

import turnsData from '../data/e5/turns.json';
import timingData from '../data/e5/timing_map.json';

interface Turn {
  id: string;
  speaker: string;
  text: string;
  duration_sec: number;
  pause_after?: number;
}

const turns = turnsData as Turn[];
const starts = (timingData as { starts: number[] }).starts;
const durations = (timingData as { durations: number[] }).durations;

const EP = 'u1e5';

/* ------------------------------------------------------------------ */
/* Sub-beats: timed visual events. offset = seconds into the turn.      */
/* Offsets are heuristic within-turn placements (word_times.json is    */
/* empty for this episode); every offset is < its turn's duration.     */
/* Within a turn, SmartText boxes never overlap (validator-enforced).   */
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
  // === ACT 1: THE SILVER MACHINE (t00-t15) ===

  // t00: Opening — title via TitleCard; foreshadow boxes
  { turnId: 't00', offset: 8.0, kind: 'smarttext', text: 'ONE MOUNTAIN. ONE EMPIRE.', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't00', offset: 24.0, kind: 'smarttext', text: 'FOUR BOXES', level: 'subtitle', position: [0.5, 0.65], entrance: 'fade' },

  // t01: The strike — 1545, Huallpa, the wind
  { turnId: 't01', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e5/potosi-cerro-rico.jpg' },
  { turnId: 't01', offset: 1.0, kind: 'smarttext', text: '1545', level: 'hero', position: [0.5, 0.18], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't01', offset: 4.0, kind: 'smarttext', text: 'DIEGO HUALLPA', level: 'title', position: [0.5, 0.36], entrance: 'stamp' },

  // t02: llama vs wind (fun)
  { turnId: 't02', offset: 0.5, kind: 'bubble', text: 'A llama?! 🦙', position: [0.5, 0.3], width: 260 },

  // t04: 13,000 feet + Mammoth joke
  { turnId: 't04', offset: 1.0, kind: 'smarttext', text: '13,000 FEET', level: 'hero', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't04', offset: 5.0, kind: 'bubble', text: 'Altitude sickness on a ski lift 😵', position: [0.5, 0.45], width: 380 },

  // t05: "Where do you put the mint?"
  { turnId: 't05', offset: 0.5, kind: 'smarttext', text: 'WHERE DO YOU PUT THE MINT?', level: 'subtitle', position: [0.5, 0.28] },

  // t06: "Seville?" (trap setup)
  { turnId: 't06', offset: 0.3, kind: 'smarttext', text: 'SEVILLE?', level: 'hero', position: [0.5, 0.25], entrance: 'stamp', color: '#ffd700' },

  // t07: Potosí mint, pieces of eight, royal fifth
  { turnId: 't07', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e5/potosi-mint.jpg' },
  { turnId: 't07', offset: 1.0, kind: 'smarttext', text: 'POTOSÍ', level: 'hero', position: [0.5, 0.18], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't07', offset: 4.0, kind: 'smarttext', text: 'PIECES OF EIGHT', level: 'title', position: [0.5, 0.38], entrance: 'stamp' },
  { turnId: 't07', offset: 7.5, kind: 'smarttext', text: 'THE ROYAL FIFTH: 20%', level: 'subtitle', position: [0.5, 0.56], color: '#ffd700' },

  // t08: pirate treasure!
  { turnId: 't08', offset: 0.5, kind: 'bubble', text: 'PIRATE TREASURE?! 🏴‍☠️', position: [0.5, 0.3], width: 340 },
  { turnId: 't08', offset: 3.0, kind: 'bg-swap', bgImage: 'historic/u1e5/pieces-of-eight.jpg' },

  // t09: "Same coins."
  { turnId: 't09', offset: 0.5, kind: 'smarttext', text: 'SAME COINS', level: 'title', position: [0.5, 0.25], entrance: 'stamp', color: '#ffd700' },

  // t10: dollar sign question
  { turnId: 't10', offset: 0.5, kind: 'bubble', text: 'The dollar sign?! 💲', position: [0.5, 0.3], width: 300 },

  // t11: Pillars of Hercules — leading theory
  { turnId: 't11', offset: 1.0, kind: 'bg-swap', bgImage: 'historic/u1e5/pillars-hercules-coin.jpg' },
  { turnId: 't11', offset: 2.0, kind: 'smarttext', text: 'PILLARS OF HERCULES', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't11', offset: 5.5, kind: 'smarttext', text: 'LEADING THEORY — NOT SETTLED', level: 'subtitle', position: [0.5, 0.38], color: '#ffd700' },

  // t12: "And the town at the foot of it?" (bridge into t13 reveal)

  // t13: 160,000 people — a city in the clouds
  { turnId: 't13', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e5/potosi-city-view.jpg' },
  { turnId: 't13', offset: 1.5, kind: 'smarttext', text: '160,000 PEOPLE', level: 'hero', position: [0.5, 0.2], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't13', offset: 5.0, kind: 'smarttext', text: 'A CITY IN THE CLOUDS', level: 'subtitle', position: [0.5, 0.38] },
  { turnId: 't13', offset: 7.5, kind: 'smarttext', text: 'MATCHED LONDON', level: 'body', position: [0.5, 0.54] },

  // t14: exam tip — mint at Potosí, Seville is the trap
  { turnId: 't14', offset: 1.0, kind: 'smarttext', text: 'EXAM TIP: BOX 1', level: 'subtitle', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't14', offset: 3.5, kind: 'smarttext', text: 'THE MINT WAS AT POTOSÍ', level: 'title', position: [0.5, 0.36], entrance: 'stamp' },
  { turnId: 't14', offset: 6.5, kind: 'smarttext', text: 'SEVILLE IS THE TRAP', level: 'subtitle', position: [0.5, 0.54], color: '#ff6b6b' },

  // t15: "leading theory" mistake
  { turnId: 't15', offset: 1.0, kind: 'smarttext', text: '"LEADING THEORY" — NOT SETTLED', level: 'subtitle', position: [0.5, 0.3], color: '#ffd700' },

  // === ACT 2: THE HUMAN COST (t16-t28) ===

  // t16: the easy ore was gone — enter mercury
  { turnId: 't16', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e5/mercury-patio.jpg' },
  { turnId: 't16', offset: 1.5, kind: 'smarttext', text: 'THE EASY ORE WAS GONE', level: 'title', position: [0.5, 0.2], entrance: 'stamp', color: '#ff6b6b' },
  { turnId: 't16', offset: 5.5, kind: 'smarttext', text: 'THE TRICK: MERCURY', level: 'subtitle', position: [0.5, 0.38], color: '#ffd700' },

  // t17: "Mercury. The liquid metal."
  { turnId: 't17', offset: 0.3, kind: 'smarttext', text: 'MERCURY', level: 'hero', position: [0.5, 0.25], entrance: 'stamp' },

  // t18: poisoning — trembling, teeth loosening
  { turnId: 't18', offset: 1.0, kind: 'smarttext', text: 'THE TREMBLING', level: 'subtitle', position: [0.5, 0.24], color: '#ff6b6b' },
  { turnId: 't18', offset: 4.5, kind: 'smarttext', text: 'THE TEETH LOOSENING', level: 'subtitle', position: [0.5, 0.42], color: '#ff6b6b' },

  // t19: prediction — what does the viceroy do?
  { turnId: 't19', offset: 10.0, kind: 'smarttext', text: '1570s. WHAT DOES THE VICEROY DO?', level: 'subtitle', position: [0.5, 0.3], entrance: 'fade' },

  // t20: "The mita."
  { turnId: 't21', offset: 0.5, kind: 'smarttext', text: 'THE MITA', level: 'hero', position: [0.5, 0.25], entrance: 'stamp', color: '#ff6b6b' },
  { turnId: 't21', offset: 2.5, kind: 'smarttext', text: 'AN OLD INCA DRAFT, MADE HARDER', level: 'body', position: [0.5, 0.46] },

  // t21: Toledo's rebuild — one in seven
  { turnId: 't22', offset: 1.0, kind: 'bg-swap', bgImage: 'historic/u1e5/mita-miners.jpg' },
  { turnId: 't22', offset: 2.0, kind: 'smarttext', text: 'ONE IN SEVEN', level: 'hero', position: [0.5, 0.2], entrance: 'stamp', color: '#ff6b6b' },
  { turnId: 't22', offset: 7.0, kind: 'smarttext', text: 'PULLED FROM THEIR VILLAGES', level: 'subtitle', position: [0.5, 0.4] },
  { turnId: 't22', offset: 12.0, kind: 'smarttext', text: 'MARCHED UP TO THE MINES', level: 'subtitle', position: [0.5, 0.56] },

  // t22: "So it was slavery."
  { turnId: 't23', offset: 0.2, kind: 'bubble', text: 'So... slavery?', position: [0.5, 0.3], width: 280 },

  // t23: forced draft, NOT slavery — Versus
  { turnId: 't24', offset: 3.0, kind: 'versus' },

  // t24: box-two mistake
  { turnId: 't25', offset: 1.0, kind: 'smarttext', text: "THE MITA WASN'T SLAVERY", level: 'subtitle', position: [0.5, 0.25], color: '#ffd700' },
  { turnId: 't25', offset: 4.5, kind: 'smarttext', text: 'FORCED ROTATION · PAID BADLY · THEN HOME', level: 'body', position: [0.5, 0.42] },

  // t25: Guamán Poma — PrimarySourceSpotlight
  { turnId: 't26', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e5/guaman-poma-miner.jpg' },
  { turnId: 't26', offset: 3.0, kind: 'primarysource',
    documentTitle: 'Nueva corónica y buen gobierno',
    authorAndDate: 'Felipe Guamán Poma de Ayala, ~1615',
    excerptText: 'Page after page: the abuses of colonial rule, drawn by a man living under it — nearly twelve hundred pages, hundreds of his own drawings, addressed as a letter to the king of Spain.',
    highlightedPhrase: 'drawn by a man living under it',
    hippType: 'Point of View',
    hippExplanation: 'An Indigenous nobleman testifies from inside the colonial system. The colonized almost never got to speak — here one did, in the empire\'s own language, to the king himself.' },

  // t26: "And the king read it and fixed everything?"
  { turnId: 't27', offset: 0.2, kind: 'bubble', text: 'The king fixed everything? 👑', position: [0.5, 0.3], width: 340 },

  // t27: "The king never saw it." (gut punch)
  { turnId: 't28', offset: 1.0, kind: 'smarttext', text: 'THE KING NEVER SAW IT', level: 'title', position: [0.5, 0.25], entrance: 'stamp', color: '#ff6b6b' },
  { turnId: 't28', offset: 4.5, kind: 'smarttext', text: 'SAT UNREAD FOR CENTURIES', level: 'subtitle', position: [0.5, 0.44] },

  // t28: "Two boxes down."
  { turnId: 't29', offset: 0.1, kind: 'smarttext', text: '✓✓ TWO BOXES DOWN', level: 'subtitle', position: [0.5, 0.3], color: '#90ee90' },

  // === ACT 3: BODIN & INFLATION (t29-t40) ===

  // t29: Box 3 — what happens to prices?
  { turnId: 't30', offset: 1.0, kind: 'smarttext', text: 'BOX 3: INFLATION THEORY', level: 'title', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't30', offset: 4.0, kind: 'smarttext', text: 'SILVER FLOODS IN. WHAT HAPPENS TO PRICES?', level: 'body', position: [0.5, 0.45] },

  // t30: prices climbed; Malestroit's argument
  { turnId: 't31', offset: 1.0, kind: 'smarttext', text: 'PRICES CLIMBED FOR A CENTURY', level: 'subtitle', position: [0.5, 0.24] },
  { turnId: 't31', offset: 5.5, kind: 'smarttext', text: 'MALESTROIT: BLAME THE COINS', level: 'subtitle', position: [0.5, 0.42], color: '#ffd700' },

  // t31: "That sounds almost reasonable."
  { turnId: 't32', offset: 0.5, kind: 'bubble', text: 'Sounds reasonable...', position: [0.5, 0.3], width: 300 },

  // t32: 1568 — Bodin answers; birth of the quantity theory
  { turnId: 't33', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e5/jean-bodin.jpg' },
  { turnId: 't33', offset: 1.5, kind: 'smarttext', text: '1568', level: 'hero', position: [0.5, 0.18], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't33', offset: 4.5, kind: 'smarttext', text: 'BODIN: BLAME THE SILVER', level: 'title', position: [0.5, 0.37], entrance: 'stamp' },
  { turnId: 't33', offset: 8.0, kind: 'smarttext', text: 'MORE MONEY, SAME GOODS', level: 'subtitle', position: [0.5, 0.56], color: '#ffd700' },

  // t33: "But wages?"
  { turnId: 't34', offset: 0.5, kind: 'bubble', text: 'But wages?', position: [0.5, 0.3], width: 220 },

  // t34: wages lagged; Spain felt it first
  { turnId: 't35', offset: 1.0, kind: 'smarttext', text: 'WAGES ROSE. PRICES ROSE FASTER.', level: 'subtitle', position: [0.5, 0.25] },
  { turnId: 't35', offset: 5.0, kind: 'smarttext', text: 'SPAIN FELT IT FIRST', level: 'subtitle', position: [0.5, 0.42], color: '#ff6b6b' },

  // t35: "How do you hold the silver mountain and end up broke?"
  { turnId: 't36', offset: 0.5, kind: 'smarttext', text: 'SILVER MOUNTAIN... BROKE?', level: 'title', position: [0.5, 0.25], entrance: 'stamp' },

  // t36: resource-curse debate — Versus
  { turnId: 't37', offset: 1.0, kind: 'smarttext', text: 'HISTORIANS STILL ARGUE', level: 'subtitle', position: [0.5, 0.2] },
  { turnId: 't37', offset: 4.0, kind: 'versus' },

  // t37: "Bankrupt? With the silver still coming in?"
  { turnId: 't38', offset: 0.3, kind: 'bubble', text: 'Bankrupt?! 💸', position: [0.5, 0.3], width: 240 },

  // t38: four bankruptcies under Philip II
  { turnId: 't39', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e5/philip-ii.jpg' },
  { turnId: 't39', offset: 1.5, kind: 'smarttext', text: 'BANKRUPT', level: 'hero', position: [0.5, 0.2], entrance: 'stamp', color: '#ff6b6b' },
  { turnId: 't39', offset: 4.0, kind: 'smarttext', text: 'FOUR TIMES UNDER PHILIP II', level: 'subtitle', position: [0.5, 0.4] },

  // t39: scoring move — write the mechanism
  { turnId: 't40', offset: 1.0, kind: 'smarttext', text: 'SCORING MOVE', level: 'subtitle', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't40', offset: 3.5, kind: 'smarttext', text: 'WRITE THE MECHANISM', level: 'title', position: [0.5, 0.36], entrance: 'stamp' },
  { turnId: 't40', offset: 7.5, kind: 'smarttext', text: 'MORE MONEY CHASING THE SAME GOODS', level: 'body', position: [0.5, 0.54], color: '#ffd700' },

  // t40: Malestroit trap
  { turnId: 't41', offset: 1.0, kind: 'smarttext', text: 'MALESTROIT = WRONG ANSWER', level: 'subtitle', position: [0.5, 0.25], color: '#ff6b6b' },
  { turnId: 't41', offset: 4.0, kind: 'smarttext', text: 'IN A RIGHT-ANSWER COSTUME', level: 'subtitle', position: [0.5, 0.42], color: '#ffd700' },

  // === ACT 4: MANILA GALLEONS (t41-t52) ===

  // t41: the galleons — Acapulco ↔ Manila, 2.5 centuries
  { turnId: 't42', offset: 2.0, kind: 'mapjourney', mapImage: 'historic/u1e5/pacific-galleon-route.jpg',
    items: [
      { id: 'galleon1', content: '⛵', from: [700, 420], to: [250, 380], duration: 6, style: 'float', size: 56 },
      { id: 'galleon2', content: '⛵', from: [720, 460], to: [270, 420], duration: 6.5, delay: 2.0, style: 'float', size: 44 },
    ],
    caption: 'THE MANILA GALLEONS: 1560s–1815', variant: 'overview' },
  { turnId: 't42', offset: 11.0, kind: 'smarttext', text: '4–6 MONTHS EACH WAY', level: 'subtitle', position: [0.5, 0.14] },

  // t42: "So what sailed which way?"
  { turnId: 't43', offset: 0.2, kind: 'bubble', text: 'Which way did what sail?', position: [0.5, 0.3], width: 340 },

  // t43: silver west, silk east — MapJourney with both directions
  { turnId: 't44', offset: 1.0, kind: 'mapjourney', mapImage: 'historic/u1e5/pacific-galleon-route.jpg',
    items: [
      { id: 'silver', content: '🪙', from: [700, 400], to: [250, 360], duration: 5, style: 'fly', size: 48 },
      { id: 'silk', content: '🧵', from: [250, 440], to: [700, 400], duration: 5, delay: 1.0, style: 'fly', size: 48 },
    ],
    caption: 'SILVER WEST · SILK EAST', variant: 'overview' },
  { turnId: 't44', offset: 8.0, kind: 'smarttext', text: 'SILVER SAILED WEST. SILK SAILED EAST.', level: 'body', position: [0.5, 0.12] },

  // t44: prediction — how do you get home?
  { turnId: 't45', offset: 7.0, kind: 'smarttext', text: 'THE WINDS PUSH WEST. HOW DO YOU GET HOME?', level: 'subtitle', position: [0.5, 0.3], entrance: 'fade' },

  // t45: "sail the long way around"
  { turnId: 't47', offset: 1.0, kind: 'smarttext', text: 'SAIL THE LONG WAY AROUND', level: 'subtitle', position: [0.5, 0.25] },
  { turnId: 't47', offset: 3.5, kind: 'smarttext', text: 'NORTH, PAST JAPAN', level: 'subtitle', position: [0.5, 0.42], color: '#ffd700' },

  // t46: Urdaneta 1565 — the tornaviaje route
  { turnId: 't48', offset: 1.0, kind: 'mapjourney', mapImage: 'historic/u1e5/pacific-galleon-route.jpg',
    items: [
      { id: 'urdaneta1', content: '⛵', from: [250, 380], to: [430, 140], duration: 4, style: 'fly', size: 52 },
      { id: 'urdaneta2', content: '⛵', from: [430, 140], to: [700, 400], duration: 4, delay: 4.0, style: 'fly', size: 52 },
    ],
    caption: "1565: URDANETA'S TORNAVIAJE", variant: 'overview' },
  { turnId: 't48', offset: 10.5, kind: 'smarttext', text: 'CATCH THE WESTERLIES HOME', level: 'subtitle', position: [0.5, 0.12], color: '#ffd700' },

  // t47: "One man figures out the winds"
  { turnId: 't49', offset: 0.5, kind: 'bubble', text: 'One guy. Two centuries of ships. 🧭', position: [0.5, 0.3], width: 380 },

  // t48: "the silver doesn't even go to Spain"
  { turnId: 't50', offset: 0.5, kind: 'smarttext', text: 'NEVER WENT TO SPAIN?', level: 'title', position: [0.5, 0.25], entrance: 'stamp', color: '#ffd700' },

  // t49: "It doesn't?"
  { turnId: 't51', offset: 0.1, kind: 'bubble', text: 'Wait, what?', position: [0.5, 0.3], width: 240 },

  // t50: the merchants kept the profit
  { turnId: 't52', offset: 1.0, kind: 'smarttext', text: 'THE MERCHANTS KEPT IT', level: 'title', position: [0.5, 0.22], entrance: 'stamp' },
  { turnId: 't52', offset: 6.0, kind: 'smarttext', text: 'MANILA + MEXICO CITY PROFIT', level: 'subtitle', position: [0.5, 0.4] },

  // t51: tornaviaje explainer — winds, not the map
  { turnId: 't53', offset: 1.0, kind: 'smarttext', text: 'START FROM THE WINDS, NOT THE MAP', level: 'subtitle', position: [0.5, 0.25] },
  { turnId: 't53', offset: 6.0, kind: 'smarttext', text: 'TRADE WINDS → WEST', level: 'body', position: [0.5, 0.42] },
  { turnId: 't53', offset: 9.5, kind: 'smarttext', text: 'WESTERLIES → EAST', level: 'body', position: [0.5, 0.56], color: '#ffd700' },

  // t52: box-four mistake
  { turnId: 't54', offset: 1.0, kind: 'smarttext', text: "DON'T SAIL THE SILVER EAST", level: 'subtitle', position: [0.5, 0.25], color: '#ff6b6b' },
  { turnId: 't54', offset: 4.5, kind: 'smarttext', text: 'SILVER → WEST. SILK → EAST.', level: 'subtitle', position: [0.5, 0.42], color: '#ffd700' },

  // === ACT 5: RECAP + EXAM (t53-t70) ===

  // t53: box 1 recap
  { turnId: 't55', offset: 1.0, kind: 'smarttext', text: '📦 BOX 1: SILVER MACHINE ✓', level: 'title', position: [0.5, 0.2], color: '#90ee90' },
  { turnId: 't55', offset: 6.0, kind: 'smarttext', text: '1545 · HUALLPA · POTOSÍ MINT', level: 'body', position: [0.5, 0.38] },
  { turnId: 't55', offset: 11.0, kind: 'smarttext', text: 'PIECES OF EIGHT · $ THEORY', level: 'body', position: [0.5, 0.52] },

  // t54: box 2 recap
  { turnId: 't56', offset: 1.0, kind: 'smarttext', text: '📦 BOX 2: HUMAN COST ✓', level: 'title', position: [0.5, 0.2], color: '#90ee90' },
  { turnId: 't56', offset: 5.0, kind: 'smarttext', text: 'MITA · 1 IN 7 · MERCURY', level: 'body', position: [0.5, 0.38] },
  { turnId: 't56', offset: 7.5, kind: 'smarttext', text: "GUAMÁN POMA'S UNREAD LETTER", level: 'body', position: [0.5, 0.52] },

  // t55: "Around 1615." (Marcus confirms — head carries it)

  // t56: box 3 recap
  { turnId: 't58', offset: 1.0, kind: 'smarttext', text: '📦 BOX 3: BODIN ✓', level: 'title', position: [0.5, 0.2], color: '#90ee90' },
  { turnId: 't58', offset: 5.0, kind: 'smarttext', text: 'MALESTROIT ❌ · BODIN ✓', level: 'subtitle', position: [0.5, 0.38] },
  { turnId: 't58', offset: 9.0, kind: 'smarttext', text: 'MECHANISM > "INFLATION"', level: 'body', position: [0.5, 0.54], color: '#ffd700' },

  // t57: "A fifth. Yes." (Marcus confirms — head carries it)

  // t58: box 4 recap
  { turnId: 't60', offset: 1.0, kind: 'smarttext', text: '📦 BOX 4: GALLEONS ✓', level: 'title', position: [0.5, 0.2], color: '#90ee90' },
  { turnId: 't60', offset: 5.0, kind: 'smarttext', text: 'SILVER WEST · SILK EAST', level: 'body', position: [0.5, 0.38] },
  { turnId: 't60', offset: 8.0, kind: 'smarttext', text: "URDANETA · CHINA'S SILVER HUNGER", level: 'body', position: [0.5, 0.52] },

  // t59: "Three questions, AP-shaped."
  { turnId: 't61', offset: 0.5, kind: 'smarttext', text: '3 QUESTIONS, AP-SHAPED', level: 'subtitle', position: [0.5, 0.25] },

  // t60: Q1 stimulus — Guamán Poma drawing
  { turnId: 't62', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e5/guaman-poma-miner.jpg' },
  { turnId: 't62', offset: 2.0, kind: 'smarttext', text: 'Q1: WHY IS THIS SOURCE GOLD?', level: 'subtitle', position: [0.5, 0.22] },

  // t61: Q1 answer — an Indigenous voice
  { turnId: 't64', offset: 2.0, kind: 'smarttext', text: 'AN INDIGENOUS VOICE', level: 'title', position: [0.5, 0.22], entrance: 'stamp' },
  { turnId: 't64', offset: 7.0, kind: 'smarttext', text: 'TESTIFYING FROM INSIDE', level: 'subtitle', position: [0.5, 0.4] },
  { turnId: 't64', offset: 13.0, kind: 'smarttext', text: 'TO THE KING HIMSELF', level: 'subtitle', position: [0.5, 0.56], color: '#ffd700' },

  // t62: Q2 stimulus
  { turnId: 't65', offset: 1.0, kind: 'smarttext', text: 'Q2: "RULERS WATERED DOWN THE COINS"?', level: 'body', position: [0.5, 0.25] },

  // t63: Q2 answer — Bodin refuted Malestroit
  { turnId: 't67', offset: 2.0, kind: 'smarttext', text: "MALESTROIT'S MISTAKE", level: 'subtitle', position: [0.5, 0.22], color: '#ff6b6b' },
  { turnId: 't67', offset: 6.5, kind: 'smarttext', text: 'BODIN, 1568: IT WAS THE SILVER', level: 'title', position: [0.5, 0.39], entrance: 'stamp' },
  { turnId: 't67', offset: 11.5, kind: 'smarttext', text: 'QUANTITY THEORY IS BORN', level: 'subtitle', position: [0.5, 0.57], color: '#ffd700' },

  // t64: Q3 stimulus
  { turnId: 't68', offset: 1.0, kind: 'smarttext', text: 'Q3: DID SPAIN GET RICH?', level: 'body', position: [0.5, 0.25] },

  // t65: Q3 answer — refute it
  { turnId: 't70', offset: 1.0, kind: 'smarttext', text: 'REFUTE IT', level: 'hero', position: [0.5, 0.2], entrance: 'stamp', color: '#ff6b6b' },
  { turnId: 't70', offset: 4.5, kind: 'smarttext', text: 'THE MERCHANTS GOT RICH', level: 'subtitle', position: [0.5, 0.4] },
  { turnId: 't70', offset: 8.5, kind: 'smarttext', text: 'MADRID GOT THE ATLANTIC CUT', level: 'body', position: [0.5, 0.56] },

  // t66: bonus — one in how many?
  { turnId: 't71', offset: 0.5, kind: 'smarttext', text: 'BONUS: ONE IN HOW MANY?', level: 'body', position: [0.5, 0.3] },

  // t67: "One in seven."
  { turnId: 't73', offset: 0.1, kind: 'smarttext', text: 'ONE IN SEVEN', level: 'title', position: [0.5, 0.3], entrance: 'stamp', color: '#ffd700' },

  // t68: carry-forward
  { turnId: 't74', offset: 2.0, kind: 'smarttext', text: 'ONE MOUNTAIN. BIGGEST EMPIRE.', level: 'subtitle', position: [0.5, 0.22] },
  { turnId: 't74', offset: 7.0, kind: 'smarttext', text: 'BROKE FOUR TIMES ANYWAY', level: 'title', position: [0.5, 0.39], entrance: 'stamp', color: '#ff6b6b' },
  { turnId: 't74', offset: 12.0, kind: 'smarttext', text: 'ALL FOUR BOXES CHECKED?', level: 'body', position: [0.5, 0.57], color: '#90ee90' },

  // t69-t70: CLOSING TAGLINE (held beat across the em dash)
  { turnId: 't75', offset: 0.3, kind: 'smarttext', text: 'POTOSÍ TURNED A MOUNTAIN INTO MONEY —', level: 'subtitle', position: [0.5, 0.3] },
  { turnId: 't76', offset: 0.2, kind: 'smarttext', text: 'AND THE MONEY KEPT MOVING.', level: 'title', position: [0.5, 0.45], entrance: 'stamp', color: '#ffd700' },
];

/* ------------------------------------------------------------------ */
/* Versus: slavery vs the mita (t23)                                    */
/* ------------------------------------------------------------------ */
const VERSUS_MITA = {
  clashTitle: 'MITA: SLAVERY OR DRAFT?',
  periodLabel: 'POTOSÍ, 1570s',
  entityA: {
    name: 'SLAVERY',
    subtitle: "What Maya guessed",
    points: ['Owned people', 'For life', 'No pay, no exit'],
    color: '#ff6b6b',
    accentColor: '#ff6b6b',
    faction: 'THE GUESS',
    portraitDesc: '⛓️',
    coreIdeology: 'People owned outright, for life.',
  },
  entityB: {
    name: 'THE MITA',
    subtitle: 'What it was',
    points: ['Forced rotation', 'One in seven men', 'Paid badly, then home'],
    color: '#ffd700',
    accentColor: '#ffd700',
    faction: 'THE REALITY',
    portraitDesc: '⛏️',
    coreIdeology: 'A draft rebuilt harder — different system, different word.',
  },
  verdictSummary: "A forced draft, not slavery. Don't let an answer choice blur them.",
};

/* ------------------------------------------------------------------ */
/* Versus: resource curse debate (t36)                                  */
/* ------------------------------------------------------------------ */
const VERSUS_CURSE = {
  clashTitle: 'SILVER: CURSE OR NOT?',
  periodLabel: "THE HISTORIANS' DEBATE",
  entityA: {
    name: 'RESOURCE CURSE',
    subtitle: 'One side argues',
    points: ['Easy silver, climbing prices', 'Workshops undercut by imports', 'Wars burned silver faster than mines made it'],
    color: '#ff6b6b',
    accentColor: '#ff6b6b',
    faction: 'SIDE A',
    portraitDesc: '📉',
    coreIdeology: 'The silver broke Spain from the inside.',
  },
  entityB: {
    name: 'OVERSTATED',
    subtitle: 'The other side',
    points: ['Biggest empire on earth', 'For a century', '"Curse" overstates it'],
    color: '#ffd700',
    accentColor: '#ffd700',
    faction: 'SIDE B',
    portraitDesc: '👑',
    coreIdeology: 'An empire that ran the world for a hundred years.',
  },
  verdictSummary: 'Historians still argue. Know both sides — the exam rewards the debate.',
};

/* ------------------------------------------------------------------ */
/* Background per turn                                                  */
/* ------------------------------------------------------------------ */
const getBackgroundForTurn = (turnId: string | null, subBeatBg: string | null): string => {
  if (subBeatBg) return subBeatBg;
  if (!turnId) return 'historic/u1e5/potosi-cerro-rico.jpg';
  const n = parseInt(turnId.slice(1), 10);
  if (n === 0) return 'historic/u1e5/potosi-cerro-rico.jpg';
  // Act 1: the silver machine (playful)
  if (n <= 4) return 'historic/u1e5/potosi-cerro-rico.jpg';
  if (n <= 6) return 'historic/u1e5/potosi-cerro-rico.jpg';
  if (n <= 9) return 'historic/u1e5/pieces-of-eight.jpg';
  if (n <= 11) return 'historic/u1e5/pillars-hercules-coin.jpg';
  if (n <= 13) return 'historic/u1e5/potosi-city-view.jpg';
  if (n <= 15) return 'historic/u1e5/potosi-mint.jpg';
  // Act 2: the human cost (dark)
  if (n <= 18) return 'historic/u1e5/mercury-patio.jpg';
  if (n <= 21) return 'historic/u1e5/mita-miners.jpg';
  if (n <= 24) return 'historic/u1e5/mita-miners.jpg';
  if (n <= 27) return 'historic/u1e5/guaman-poma-miner.jpg';
  if (n === 28) return 'historic/u1e5/mita-miners.jpg';
  // Act 3: Bodin & inflation (analytical)
  if (n <= 31) return 'historic/u1e5/silver-ingots.jpg';
  if (n === 32) return 'historic/u1e5/jean-bodin.jpg';
  if (n <= 35) return 'historic/u1e5/silver-ingots.jpg';
  if (n <= 38) return 'historic/u1e5/philip-ii.jpg';
  if (n <= 40) return 'historic/u1e5/silver-ingots.jpg';
  // Act 4: Manila galleons (adventure)
  if (n <= 43) return 'historic/u1e5/pacific-galleon-route.jpg';
  if (n <= 47) return 'historic/u1e5/manila-galleon.jpg';
  if (n <= 52) return 'historic/u1e5/pacific-galleon-route.jpg';
  // Act 5: recap
  if (n <= 58) return 'historic/u1e5/potosi-cerro-rico.jpg';
  if (n <= 61) return 'historic/u1e5/guaman-poma-miner.jpg';
  return 'historic/u1e5/potosi-cerro-rico.jpg';
};

/* ------------------------------------------------------------------ */
/* Main episode                                                         */
/* ------------------------------------------------------------------ */
export const U1E5Episode: React.FC = () => {
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

  // Tone: playful for the machine + galleons, serious for the human cost + inflation debate
  const turnNum = activeTurn ? parseInt(activeTurn.id.slice(1), 10) : 0;
  const isSeriousSection = (turnNum >= 16 && turnNum <= 40);

  const showHead = activeTurn &&
    (activeTurn.speaker === 'maya' || activeTurn.speaker === 'marcus') &&
    !(activeTurn.id === 't00' && turnElapsed < 3);

  return (
    <ToneProvider tone={isSeriousSection ? 'serious' : 'playful'}>
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

          {/* Branded music */}
          <EpisodeMusic episode="E5" />

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
            <TitleCard kicker="UNIT 1 · EPISODE 5:"
              title="SILVER EMPIRE" subline="POTOSÍ AND THE PRICE OF SILVER" at={activeStartFrame} />
          )}

          {/* Versus: slavery vs the mita (t23) */}
          {activeTurn?.id === 't23' && turnElapsed >= 3 && (
            <VersusPolarization
              clashTitle={VERSUS_MITA.clashTitle}
              periodLabel={VERSUS_MITA.periodLabel}
              entityA={VERSUS_MITA.entityA}
              entityB={VERSUS_MITA.entityB}
              verdictSummary={VERSUS_MITA.verdictSummary}
            />
          )}

          {/* Versus: resource curse debate (t36) */}
          {activeTurn?.id === 't36' && turnElapsed >= 4 && (
            <VersusPolarization
              clashTitle={VERSUS_CURSE.clashTitle}
              periodLabel={VERSUS_CURSE.periodLabel}
              entityA={VERSUS_CURSE.entityA}
              entityB={VERSUS_CURSE.entityB}
              verdictSummary={VERSUS_CURSE.verdictSummary}
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
                mapImage={beat.mapImage || 'historic/u1e5/pacific-galleon-route.jpg'}
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
