/**
 * U1E9Episode — Unit 1 Episode 9: Cram Session, Unit 1.
 *
 * Story Mode: Maya drives the quiz; Jay answers under pressure, gets
 * corrected, lands answers. Ten questions covering all eight episodes,
 * then an eight-box check, three AP-shaped questions with real silence,
 * and the closing tagline. No new content — pure retrieval practice.
 *
 * Tone arc: ENERGETIC throughout — this is a cram session, fast-paced
 * and high-energy. Maya is the quizmaster, Jay is the study buddy who
 * gets things wrong and gets corrected. The exam spine: "fit every
 * answer to the unit's three shapes: what changed, what stayed the same,
 * who pushed back."
 *
 * 140 turns (78 Maya + 42 Jay + 20 pauses), ~995 seconds, 30fps.
 * Script: audio_scripts/unit1/apush-audio-u1-e9-script-v8-DRAFT.md (canonical)
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
import { ToneProvider } from '../validation/ToneContext';
import { EpisodeMusic } from './EpisodeMusic';
import { AutoLayoutProvider } from '../validation/AutoLayout';

import turnsData from '../data/e9/turns.json';
import timingData from '../data/e9/timing_map.json';

interface Turn {
  id: string;
  speaker: string;
  text: string;
  pause_after?: number;
}

const turns = turnsData as Turn[];
const starts = (timingData as { starts: number[] }).starts;
const durations = (timingData as { durations: number[] }).durations;

const EP = 'u1e9';

/* ------------------------------------------------------------------ */
/* Sub-beats: timed visual events. offset = seconds into the turn.      */
/* Offsets are heuristic within-turn placements; every offset is < its */
/* turn's duration. Within a turn, SmartText boxes never overlap.       */
/* ------------------------------------------------------------------ */
interface SubBeat {
  turnId: string;
  offset: number;
  kind: 'smarttext' | 'bubble' | 'gravity' | 'bg-swap' | 'versus';
  text?: string;
  position?: [number, number];
  level?: 'hero' | 'title' | 'subtitle' | 'body';
  color?: string;
  entrance?: 'stamp' | 'fade' | 'typewriter';
  bgImage?: string;
  width?: number;
}

const SUB_BEATS: SubBeat[] = [
  // === INTRO (t00-t01) ===

  // t00: Maya intro — 8 boxes, 3 shapes
  { turnId: 't00', offset: 1.0, kind: 'bg-swap', bgImage: 'historic/cahokia-monks-mound.jpg' },
  { turnId: 't00', offset: 2.0, kind: 'smarttext', text: 'CRAM SESSION', level: 'hero', position: [0.5, 0.18], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't00', offset: 8.0, kind: 'smarttext', text: 'TEN QUESTIONS · EIGHT EPISODES', level: 'title', position: [0.5, 0.4] },
  { turnId: 't00', offset: 15.0, kind: 'smarttext', text: 'WHAT CHANGED · WHAT STAYED · WHO PUSHED BACK', level: 'subtitle', position: [0.5, 0.58], color: '#ffd700' },
  { turnId: 't00', offset: 25.0, kind: 'smarttext', text: 'CIRCLE THE ONES YOU COULDN\u2019T EXPLAIN', level: 'body', position: [0.5, 0.72] },

  // t01: Jay — any mercy?
  { turnId: 't01', offset: 0.3, kind: 'bubble', text: 'Ten questions. Any mercy today?', position: [0.5, 0.3], width: 380 },

  // === Q1: NATIVE SOCIETIES (t02-t09) ===

  // t02: Maya Q1 setup
  { turnId: 't02', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/cahokia-monks-mound.jpg' },
  { turnId: 't02', offset: 1.0, kind: 'smarttext', text: 'QUESTION 1', level: 'hero', position: [0.5, 0.18], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't02', offset: 3.0, kind: 'smarttext', text: 'THREE NATIVE REGIONS', level: 'title', position: [0.5, 0.4] },

  // t04: Jay answers — 3 regions
  { turnId: 't04', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/bison-herd.jpg' },
  { turnId: 't04', offset: 1.0, kind: 'smarttext', text: 'SOUTHWEST: PUEBLO FARMERS', level: 'subtitle', position: [0.5, 0.2] },
  { turnId: 't04', offset: 4.0, kind: 'smarttext', text: 'PLAINS: BISON HUNTERS', level: 'subtitle', position: [0.5, 0.38] },
  { turnId: 't04', offset: 7.0, kind: 'smarttext', text: 'NORTHEAST: MIXED FARMING', level: 'subtitle', position: [0.5, 0.56] },

  // t06: Jay — maize
  { turnId: 't06', offset: 0.3, kind: 'bubble', text: 'Maize, bred from a wild grass. No maize, no Cahokia.', position: [0.5, 0.3], width: 440 },
  { turnId: 't06', offset: 1.0, kind: 'smarttext', text: 'MAIZE = THE ENGINE', level: 'title', position: [0.5, 0.55], color: '#ffd700', entrance: 'stamp' },

  // t07: Maya — Cahokia, Iroquois
  { turnId: 't07', offset: 1.0, kind: 'smarttext', text: 'CAHOKIA: 10\u201320,000', level: 'subtitle', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't07', offset: 5.0, kind: 'smarttext', text: 'LONDON-SIZED · 100-FOOT MOUND', level: 'body', position: [0.5, 0.38] },

  // t08: Jay — Five nations
  { turnId: 't08', offset: 1.0, kind: 'smarttext', text: 'FIVE NATIONS · ONE COUNCIL', level: 'subtitle', position: [0.5, 0.25] },
  { turnId: 't08', offset: 4.0, kind: 'smarttext', text: 'CLAN MOTHERS CHOSE LEADERS', level: 'body', position: [0.5, 0.45], color: '#ffd700' },

  // t09: Maya — myth to drop, scoring move
  { turnId: 't09', offset: 1.0, kind: 'smarttext', text: 'DROP: "UNTOUCHED WILDERNESS"', level: 'title', position: [0.5, 0.25], color: '#ff6b6b', entrance: 'stamp' },
  { turnId: 't09', offset: 6.0, kind: 'smarttext', text: 'SCORING MOVE: BIG CITY \u2192 FOOD QUESTION', level: 'subtitle', position: [0.5, 0.5], color: '#51cf66' },

  // === Q2: WHY EUROPE SAILED (t10-t22) ===

  // t10: Maya Q2 setup
  { turnId: 't10', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e2/caravel-replicas.jpg' },
  { turnId: 't10', offset: 1.0, kind: 'smarttext', text: 'QUESTION 2', level: 'hero', position: [0.5, 0.18], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't10', offset: 3.0, kind: 'smarttext', text: 'WHAT GOT EUROPE ACROSS?', level: 'title', position: [0.5, 0.4] },

  // t12: Jay — 3 Gs
  { turnId: 't12', offset: 1.0, kind: 'smarttext', text: 'GOLD · GOD · GLORY', level: 'hero', position: [0.5, 0.2], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't12', offset: 5.0, kind: 'smarttext', text: 'GOLD LED — ECONOMICS FIRST', level: 'subtitle', position: [0.5, 0.45], color: '#51cf66' },

  // t14: Jay — tools
  { turnId: 't14', offset: 1.0, kind: 'smarttext', text: 'CARAVEL · LATEEN · ASTROLABE', level: 'subtitle', position: [0.5, 0.25] },
  { turnId: 't14', offset: 5.0, kind: 'smarttext', text: 'HENRY\u2019S MONEY WAS REAL · SCHOOL WAS LEGEND', level: 'body', position: [0.5, 0.45] },

  // t16: Jay — Tordesillas
  { turnId: 't16', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e2/tordesillas-map.jpg' },
  { turnId: 't16', offset: 1.0, kind: 'smarttext', text: 'TORDESILLAS, 1494', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't16', offset: 4.0, kind: 'smarttext', text: '370 LEAGUES WEST OF CAPE VERDE', level: 'subtitle', position: [0.5, 0.42] },

  // t17: Maya — flip correction
  { turnId: 't17', offset: 0.3, kind: 'bubble', text: 'Flip those! Spain WEST, Portugal EAST.', position: [0.5, 0.3], width: 400 },
  { turnId: 't17', offset: 1.0, kind: 'smarttext', text: 'SPAIN \u2190 WEST · EAST \u2192 PORTUGAL', level: 'subtitle', position: [0.5, 0.55], color: '#ff6b6b' },
  { turnId: 't17', offset: 5.0, kind: 'smarttext', text: 'THAT\u2019S WHY BRAZIL SPEAKS PORTUGUESE', level: 'body', position: [0.5, 0.72], color: '#51cf66' },

  // t19: Maya bonus — why Spain funded Columbus
  { turnId: 't19', offset: 1.0, kind: 'smarttext', text: 'BONUS: WHY FUND COLUMBUS?', level: 'subtitle', position: [0.5, 0.25], color: '#ffd700' },

  // t21: Jay — Granada
  { turnId: 't21', offset: 1.0, kind: 'smarttext', text: 'GRANADA, JANUARY 1492', level: 'title', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't21', offset: 5.0, kind: 'smarttext', text: 'FRESH OFF THE HOLY WAR · DESPERATE', level: 'subtitle', position: [0.5, 0.48] },

  // === Q3: THE EXCHANGE (t23-t31) ===

  // t23: Maya Q3 setup
  { turnId: 't23', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e2/cantino-planisphere.jpg' },
  { turnId: 't23', offset: 1.0, kind: 'smarttext', text: 'QUESTION 3', level: 'hero', position: [0.5, 0.18], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't23', offset: 3.0, kind: 'smarttext', text: 'THE EXCHANGE · EACH WAY', level: 'title', position: [0.5, 0.4] },

  // t25: Jay — West/East, disease
  { turnId: 't25', offset: 1.0, kind: 'smarttext', text: 'WEST: WHEAT · HORSES · CATTLE', level: 'subtitle', position: [0.5, 0.2] },
  { turnId: 't25', offset: 5.0, kind: 'smarttext', text: 'EAST: MAIZE · POTATOES · TOMATOES', level: 'subtitle', position: [0.5, 0.38] },
  { turnId: 't25', offset: 9.0, kind: 'smarttext', text: 'DEADLIEST: DISEASE · 8\u20139 OF 10', level: 'title', position: [0.5, 0.58], color: '#ff6b6b', entrance: 'stamp' },

  // t27: Jay — syphilis both sides
  { turnId: 't27', offset: 0.3, kind: 'bubble', text: 'Syphilis, maybe. Both sides argued. Nobody settled it.', position: [0.5, 0.3], width: 440 },
  { turnId: 't27', offset: 1.0, kind: 'smarttext', text: 'NAME BOTH SIDES OR IT\u2019S A TRAP', level: 'body', position: [0.5, 0.6], color: '#ffd700' },

  // t28: Maya — Crosby, who gained?
  { turnId: 't28', offset: 1.0, kind: 'smarttext', text: 'CROSBY NAMED IT, 1972', level: 'subtitle', position: [0.5, 0.25] },
  { turnId: 't28', offset: 5.0, kind: 'smarttext', text: 'NO TREATY · NO VOTE · BIGGEST CARGO', level: 'body', position: [0.5, 0.45] },

  // t30: Jay — Plains, horse
  { turnId: 't30', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e2/comanche-horses.jpg' },
  { turnId: 't30', offset: 1.0, kind: 'smarttext', text: 'THE PLAINS · THE HORSE', level: 'title', position: [0.5, 0.25], color: '#ffd700', entrance: 'stamp' },
  { turnId: 't30', offset: 5.0, kind: 'smarttext', text: 'HORSE CULTURES: POST-EXCHANGE', level: 'subtitle', position: [0.5, 0.48] },
  { turnId: 't30', offset: 6.5, kind: 'smarttext', text: 'OLD, BUT NOT ANCIENT', level: 'body', position: [0.5, 0.64] },

  // t31: Maya — box-three mistake
  { turnId: 't31', offset: 1.0, kind: 'smarttext', text: 'LIVESTOCK WENT WEST', level: 'title', position: [0.5, 0.3], color: '#ff6b6b', entrance: 'stamp' },
  { turnId: 't31', offset: 4.0, kind: 'smarttext', text: 'DON\u2019T SEND THEM EAST', level: 'subtitle', position: [0.5, 0.52] },

  // === Q4: JAMESTOWN (t32-t42) ===

  // t32: Maya Q4 setup
  { turnId: 't32', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e4/three-ships.jpg' },
  { turnId: 't32', offset: 1.0, kind: 'smarttext', text: 'QUESTION 4', level: 'hero', position: [0.5, 0.18], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't32', offset: 3.0, kind: 'smarttext', text: 'JAMESTOWN: WHY IT ALMOST DIED', level: 'title', position: [0.5, 0.4] },

  // t34: Jay — Virginia Company, starving winter
  { turnId: 't34', offset: 1.0, kind: 'smarttext', text: 'VIRGINIA COMPANY, 1606', level: 'subtitle', position: [0.5, 0.2] },
  { turnId: 't34', offset: 5.0, kind: 'smarttext', text: 'GENTLEMEN HUNTING GOLD IN A SWAMP', level: 'body', position: [0.5, 0.4] },
  { turnId: 't34', offset: 9.0, kind: 'smarttext', text: 'WINTER 1609: 500 \u2192 60', level: 'hero', position: [0.5, 0.58], color: '#ff6b6b', entrance: 'stamp' },

  // t36: Jay — De La Warr
  { turnId: 't36', offset: 1.0, kind: 'smarttext', text: 'DE LA WARR TURNED THEM AROUND', level: 'subtitle', position: [0.5, 0.3] },

  // t38: Jay — tobacco, headright
  { turnId: 't38', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e4/tobacco-plant.jpg' },
  { turnId: 't38', offset: 1.0, kind: 'smarttext', text: 'TOBACCO SAVED IT', level: 'title', position: [0.5, 0.25], color: '#51cf66', entrance: 'stamp' },
  { turnId: 't38', offset: 5.0, kind: 'smarttext', text: 'ROLFE\u2019S STRAIN · HEADRIGHT: 50 ACRES', level: 'subtitle', position: [0.5, 0.48] },

  // t41: Jay — 1619
  { turnId: 't41', offset: 1.0, kind: 'smarttext', text: '1619', level: 'hero', position: [0.5, 0.2], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't41', offset: 4.0, kind: 'smarttext', text: 'BURGESSES + WHITE LION', level: 'title', position: [0.5, 0.45] },
  { turnId: 't41', offset: 8.0, kind: 'smarttext', text: '"20 AND ODD" AT POINT COMFORT', level: 'subtitle', position: [0.5, 0.62] },

  // t42: Maya — 1622
  { turnId: 't42', offset: 1.0, kind: 'smarttext', text: '1622: 347 DEAD', level: 'subtitle', position: [0.5, 0.3], color: '#ff6b6b' },
  { turnId: 't42', offset: 4.0, kind: 'smarttext', text: 'ROYAL COLONY BY 1624', level: 'body', position: [0.5, 0.5] },

  // === Q5: POTOS\u00cd (t43-t56) ===

  // t43: Maya Q5 setup
  { turnId: 't43', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e5/potosi-cerro-rico.jpg' },
  { turnId: 't43', offset: 1.0, kind: 'smarttext', text: 'QUESTION 5', level: 'hero', position: [0.5, 0.18], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't43', offset: 3.0, kind: 'smarttext', text: 'WHY WAS POTOS\u00cd THE ENGINE?', level: 'title', position: [0.5, 0.4] },

  // t45: Jay — 1545 strike
  { turnId: 't45', offset: 1.0, kind: 'smarttext', text: '1545: THE STRIKE', level: 'title', position: [0.5, 0.2], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't45', offset: 5.0, kind: 'smarttext', text: '13,000 FEET · THE QUINTO: A FIFTH', level: 'subtitle', position: [0.5, 0.42] },

  // t47: Jay — 160,000, mita
  { turnId: 't47', offset: 1.0, kind: 'smarttext', text: '160,000 IN THE CLOUDS', level: 'subtitle', position: [0.5, 0.25], color: '#ffd700' },
  { turnId: 't47', offset: 5.0, kind: 'smarttext', text: 'THE MITA: ONE IN SEVEN', level: 'title', position: [0.5, 0.45], color: '#ff6b6b' },
  { turnId: 't47', offset: 9.0, kind: 'smarttext', text: 'FORCED DRAFT \u2014 NOT SLAVERY', level: 'body', position: [0.5, 0.62] },

  // t49: Jay — Guam\u00e1n Poma
  { turnId: 't49', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e5/guaman-poma-miner.jpg' },
  { turnId: 't49', offset: 1.0, kind: 'smarttext', text: 'GUAM\u00c1N POMA: 1,200 PAGES', level: 'subtitle', position: [0.5, 0.25] },
  { turnId: 't49', offset: 5.0, kind: 'smarttext', text: 'THE KING NEVER SAW IT', level: 'body', position: [0.5, 0.45], color: '#ff6b6b' },

  // t50: Maya prediction — save it or break it?
  { turnId: 't50', offset: 1.0, kind: 'smarttext', text: 'SAVE IT OR BREAK IT?', level: 'hero', position: [0.5, 0.3], entrance: 'stamp', color: '#ffd700' },

  // t52: Maya — it breaks it
  { turnId: 't52', offset: 1.0, kind: 'smarttext', text: 'IT BREAKS IT', level: 'hero', position: [0.5, 0.2], entrance: 'stamp', color: '#ff6b6b' },
  { turnId: 't52', offset: 5.0, kind: 'smarttext', text: 'BANKRUPT \u00d74 UNDER PHILIP II', level: 'subtitle', position: [0.5, 0.45] },
  { turnId: 't52', offset: 9.0, kind: 'smarttext', text: 'BODIN, 1568: MORE MONEY, SAME GOODS', level: 'body', position: [0.5, 0.62] },

  // t55: Jay — Manila galleons
  { turnId: 't55', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e5/manila-galleon.jpg' },
  { turnId: 't55', offset: 1.0, kind: 'smarttext', text: 'SILVER WEST · SILK EAST', level: 'title', position: [0.5, 0.25], color: '#ffd700' },
  { turnId: 't55', offset: 5.0, kind: 'smarttext', text: 'THE MERCHANTS KEPT MOST OF IT', level: 'subtitle', position: [0.5, 0.48] },

  // t56: Maya — box-five mistake
  { turnId: 't56', offset: 1.0, kind: 'smarttext', text: 'DON\u2019T SAIL THE SILVER EAST', level: 'title', position: [0.5, 0.35], color: '#ff6b6b' },

  // === Q6: LABOR SYSTEMS (t57-t73) ===

  // t57: Maya Q6 setup
  { turnId: 't57', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e6/encomienda-workers.jpg' },
  { turnId: 't57', offset: 1.0, kind: 'smarttext', text: 'QUESTION 6', level: 'hero', position: [0.5, 0.18], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't57', offset: 3.0, kind: 'smarttext', text: 'WHAT DROVE EACH LABOR SHIFT?', level: 'title', position: [0.5, 0.4] },

  // t59: Jay — encomienda, New Laws
  { turnId: 't59', offset: 1.0, kind: 'smarttext', text: 'ENCOMIENDA: LABOR + TRIBUTE', level: 'subtitle', position: [0.5, 0.2] },
  { turnId: 't59', offset: 5.0, kind: 'smarttext', text: 'NEW LAWS, 1542 \u2192 A\u00d1AQUITO, 1546', level: 'body', position: [0.5, 0.4] },
  { turnId: 't59', offset: 9.0, kind: 'smarttext', text: 'THE REFORM DIED · THE CROWN CAVED', level: 'subtitle', position: [0.5, 0.58], color: '#ff6b6b' },

  // t61: Jay — drafts
  { turnId: 't61', offset: 1.0, kind: 'smarttext', text: 'REPARTIMIENTO · MITA', level: 'title', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't61', offset: 5.0, kind: 'smarttext', text: 'SAME IDEA · TWO NAMES', level: 'subtitle', position: [0.5, 0.48], color: '#ffd700' },

  // t63: Jay — Middle Passage
  { turnId: 't63', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e6/middle-passage-ship.jpg' },
  { turnId: 't63', offset: 1.0, kind: 'smarttext', text: 'THE MIDDLE PASSAGE', level: 'title', position: [0.5, 0.2], color: '#ff6b6b' },
  { turnId: 't63', offset: 5.0, kind: 'smarttext', text: '1 IN 8 DIED CROSSING', level: 'subtitle', position: [0.5, 0.42] },
  { turnId: 't63', offset: 9.0, kind: 'smarttext', text: 'THE DYING WAS PRICED IN', level: 'body', position: [0.5, 0.58] },

  // t65: Jay — Las Casas 1516
  { turnId: 't65', offset: 1.0, kind: 'smarttext', text: '1516: HE PROPOSED IT', level: 'subtitle', position: [0.5, 0.3] },
  { turnId: 't65', offset: 4.0, kind: 'smarttext', text: 'DIDN\u2019T START IT · LENT IT RESPECTABILITY', level: 'body', position: [0.5, 0.5] },

  // t68: Jay — casta
  { turnId: 't68', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e6/casta-painting.jpg' },
  { turnId: 't68', offset: 1.0, kind: 'smarttext', text: 'THE CASTA LADDER', level: 'title', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't68', offset: 5.0, kind: 'smarttext', text: 'PENINSULARES · CRIOLLOS · MESTIZOS', level: 'subtitle', position: [0.5, 0.48] },

  // t69-t70: Maya/Jay peninsulares correction
  { turnId: 't69', offset: 0.3, kind: 'bubble', text: 'And peninsulares were the American-born ones, right?', position: [0.5, 0.3], width: 440 },
  { turnId: 't70', offset: 0.3, kind: 'bubble', text: 'Spain! Peninsulares = born in Spain. You did the thing.', position: [0.5, 0.3], width: 440 },
  { turnId: 't70', offset: 1.0, kind: 'smarttext', text: 'PENINSULARES: BORN IN SPAIN', level: 'subtitle', position: [0.5, 0.6], color: '#51cf66' },

  // t71: Maya — hacienda
  { turnId: 't71', offset: 1.0, kind: 'smarttext', text: 'HACIENDA: FREE ON PAPER', level: 'subtitle', position: [0.5, 0.3] },
  { turnId: 't71', offset: 4.0, kind: 'smarttext', text: 'BOUND BY DEBT', level: 'title', position: [0.5, 0.5], color: '#ff6b6b' },

  // === Q7: VALLADOLID (t74-t83) ===

  // t74: Maya Q7 setup
  { turnId: 't74', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e7/valladolid-1550.jpg' },
  { turnId: 't74', offset: 1.0, kind: 'smarttext', text: 'QUESTION 7', level: 'hero', position: [0.5, 0.18], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't74', offset: 3.0, kind: 'smarttext', text: 'LAS CASAS vs SEP\u00daLVEDA', level: 'title', position: [0.5, 0.4] },

  // t76: Jay — the disagreement
  { turnId: 't76', offset: 1.0, kind: 'smarttext', text: 'FULLY HUMAN? OR NATURAL SLAVES?', level: 'title', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't76', offset: 5.0, kind: 'smarttext', text: 'LAS CASAS: GAVE IT BACK, 1514', level: 'subtitle', position: [0.5, 0.48], color: '#51cf66' },

  // t78: Jay — four causes
  { turnId: 't78', offset: 1.0, kind: 'smarttext', text: 'FOUR JUST CAUSES', level: 'subtitle', position: [0.5, 0.2] },
  { turnId: 't78', offset: 4.0, kind: 'smarttext', text: 'ALL FROM HIS LIBRARY · NEVER CROSSED', level: 'body', position: [0.5, 0.4] },

  // t80: Jay — no verdict
  { turnId: 't80', offset: 1.0, kind: 'smarttext', text: 'NO VERDICT', level: 'hero', position: [0.5, 0.25], entrance: 'stamp', color: '#ff6b6b' },
  { turnId: 't80', offset: 2.0, kind: 'smarttext', text: 'BOTH SIDES CLAIMED VICTORY', level: 'subtitle', position: [0.5, 0.5] },

  // t82: Jay — Black Legend
  { turnId: 't82', offset: 1.0, kind: 'smarttext', text: 'SHORT ACCOUNT \u2192 BLACK LEGEND', level: 'subtitle', position: [0.5, 0.3] },
  { turnId: 't82', offset: 4.0, kind: 'smarttext', text: 'DUTCH 1578 · ENGLISH 1583', level: 'body', position: [0.5, 0.5] },

  // === Q8: PUEBLO REVOLT (t84-t96) ===

  // t84: Maya Q8 setup
  { turnId: 't84', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e8/pueblo-village.jpg' },
  { turnId: 't84', offset: 1.0, kind: 'smarttext', text: 'QUESTION 8', level: 'hero', position: [0.5, 0.18], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't84', offset: 3.0, kind: 'smarttext', text: 'THE PUEBLO REVOLT', level: 'title', position: [0.5, 0.4] },

  // t86: Jay — causes
  { turnId: 't86', offset: 1.0, kind: 'smarttext', text: '80 YEARS OF MISSIONS', level: 'subtitle', position: [0.5, 0.2] },
  { turnId: 't86', offset: 5.0, kind: 'smarttext', text: '1675: 47 MEDICINE MEN ARRESTED', level: 'body', position: [0.5, 0.4], color: '#ff6b6b' },

  // t88: Jay — Pop\u00e9, knotted cords
  { turnId: 't88', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e8/knotted-cord.jpg' },
  { turnId: 't88', offset: 1.0, kind: 'smarttext', text: 'POP\u00c9: HOLY MAN, NOT KING', level: 'title', position: [0.5, 0.25], color: '#ffd700' },
  { turnId: 't88', offset: 5.0, kind: 'smarttext', text: 'KNOTTED CORDS · AUGUST 10, 1680', level: 'subtitle', position: [0.5, 0.48], entrance: 'stamp' },

  // t89: Jay — the rising
  { turnId: 't89', offset: 1.0, kind: 'smarttext', text: '~400 DEAD · 21 PRIESTS', level: 'subtitle', position: [0.5, 0.25], color: '#ff6b6b' },
  { turnId: 't89', offset: 5.0, kind: 'smarttext', text: 'OTERM\u00cdN RETREATS AUGUST 21', level: 'body', position: [0.5, 0.45] },

  // t91: Jay — why it didn't hold
  { turnId: 't91', offset: 1.0, kind: 'smarttext', text: 'TWELVE YEARS FREE', level: 'title', position: [0.5, 0.25], color: '#51cf66' },
  { turnId: 't91', offset: 5.0, kind: 'smarttext', text: 'DROUGHT · RIVALRIES · POP\u00c9 DEPOSED', level: 'subtitle', position: [0.5, 0.48] },

  // t92: Maya prediction — fight or talk?
  { turnId: 't92', offset: 1.0, kind: 'smarttext', text: '1692: FIGHT OR TALK?', level: 'hero', position: [0.5, 0.3], entrance: 'stamp', color: '#ffd700' },

  // t94: Maya — he talked
  { turnId: 't94', offset: 1.0, kind: 'smarttext', text: 'HE TALKED', level: 'hero', position: [0.5, 0.2], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't94', offset: 5.0, kind: 'smarttext', text: 'BLOODLESS IN \u201992 · FORCE IN \u201993', level: 'subtitle', position: [0.5, 0.45] },
  { turnId: 't94', offset: 9.0, kind: 'smarttext', text: 'DON\u2019T WRITE: FOUGHT IN \u201992', level: 'body', position: [0.5, 0.62], color: '#ff6b6b' },

  // t95: Jay — Spain came back scared
  { turnId: 't95', offset: 1.0, kind: 'smarttext', text: 'FEAR REWROTE THE RULES', level: 'subtitle', position: [0.5, 0.35], color: '#ffd700' },

  // === Q9: PUSHBACK (t97-t102) ===

  // t97: Maya Q9 setup
  { turnId: 't97', offset: 1.0, kind: 'smarttext', text: 'QUESTION 9', level: 'hero', position: [0.5, 0.18], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't97', offset: 3.0, kind: 'smarttext', text: 'WHY DID SO LITTLE CHANGE?', level: 'title', position: [0.5, 0.4] },

  // t99: Jay — machine needed workers
  { turnId: 't99', offset: 1.0, kind: 'smarttext', text: 'THE MACHINE NEEDED WORKERS', level: 'title', position: [0.5, 0.3], color: '#ff6b6b' },
  { turnId: 't99', offset: 2.5, kind: 'smarttext', text: 'EVERY FIX THREATENED SUPPLY', level: 'subtitle', position: [0.5, 0.52] },

  // t100: Maya — money came first
  { turnId: 't100', offset: 1.0, kind: 'smarttext', text: 'LAS CASAS WON THE ARGUMENT', level: 'subtitle', position: [0.5, 0.3] },
  { turnId: 't100', offset: 4.0, kind: 'smarttext', text: 'CHANGED NOTHING ON THE GROUND', level: 'body', position: [0.5, 0.5], color: '#ff6b6b' },

  // === Q10: PERIOD THESIS (t103-t106) ===

  // t103: Maya Q10 setup
  { turnId: 't103', offset: 1.0, kind: 'smarttext', text: 'QUESTION 10', level: 'hero', position: [0.5, 0.18], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't103', offset: 3.0, kind: 'smarttext', text: 'WHY DOES 1491\u20131607 SHAPE EVERYTHING?', level: 'title', position: [0.5, 0.4] },

  // t105: Jay — thesis
  { turnId: 't105', offset: 1.0, kind: 'smarttext', text: 'CONTACT CREATED A NEW WORLD', level: 'title', position: [0.5, 0.25], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't105', offset: 5.0, kind: 'smarttext', text: 'BIOLOGY · ECONOMY · LABOR: DECIDED HERE', level: 'subtitle', position: [0.5, 0.48] },

  // === BOX CHECK RECAP (t107-t123) ===

  // t107: Box 1
  { turnId: 't107', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/cahokia-monks-mound.jpg' },
  { turnId: 't107', offset: 1.0, kind: 'smarttext', text: 'BOX 1 \u2713', level: 'hero', position: [0.5, 0.2], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't107', offset: 4.0, kind: 'smarttext', text: 'LAND DECIDED FOOD · FOOD DECIDED THE MOVE', level: 'subtitle', position: [0.5, 0.45] },

  // t109: Box 2
  { turnId: 't109', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e2/caravel-replicas.jpg' },
  { turnId: 't109', offset: 1.0, kind: 'smarttext', text: 'BOX 2 \u2713', level: 'hero', position: [0.5, 0.2], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't109', offset: 4.0, kind: 'smarttext', text: 'GOLD LED · TORDESILLAS: TWO CROWNS', level: 'subtitle', position: [0.5, 0.45] },

  // t111: Box 3
  { turnId: 't111', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e2/cantino-planisphere.jpg' },
  { turnId: 't111', offset: 1.0, kind: 'smarttext', text: 'BOX 3 \u2713', level: 'hero', position: [0.5, 0.2], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't111', offset: 4.0, kind: 'smarttext', text: 'CROPS BOTH WAYS · GERMS ONE WAY', level: 'subtitle', position: [0.5, 0.45] },

  // t113: Box 4
  { turnId: 't113', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e4/three-ships.jpg' },
  { turnId: 't113', offset: 1.0, kind: 'smarttext', text: 'BOX 4 \u2713', level: 'hero', position: [0.5, 0.2], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't113', offset: 4.0, kind: 'smarttext', text: 'COMPANY MONEY · TOBACCO · 1619', level: 'subtitle', position: [0.5, 0.45] },

  // t115: Box 5
  { turnId: 't115', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e5/potosi-cerro-rico.jpg' },
  { turnId: 't115', offset: 1.0, kind: 'smarttext', text: 'BOX 5 \u2713', level: 'hero', position: [0.5, 0.2], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't115', offset: 4.0, kind: 'smarttext', text: '1545 · THE QUINTO · THE MITA', level: 'subtitle', position: [0.5, 0.45] },

  // t117: Box 6
  { turnId: 't117', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e6/middle-passage-ship.jpg' },
  { turnId: 't117', offset: 1.0, kind: 'smarttext', text: 'BOX 6 \u2713', level: 'hero', position: [0.5, 0.2], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't117', offset: 0.8, kind: 'smarttext', text: 'THE GRANT · THE DRAFTS · THE LADDER', level: 'subtitle', position: [0.5, 0.45] },

  // t119: Box 7
  { turnId: 't119', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e7/valladolid-1550.jpg' },
  { turnId: 't119', offset: 1.0, kind: 'smarttext', text: 'BOX 7 \u2713', level: 'hero', position: [0.5, 0.2], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't119', offset: 1.2, kind: 'smarttext', text: 'FOUR CAUSES · NO VERDICT', level: 'subtitle', position: [0.5, 0.45] },

  // t121: Box 8
  { turnId: 't121', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e8/knotted-cord.jpg' },
  { turnId: 't121', offset: 1.0, kind: 'smarttext', text: 'BOX 8 \u2713', level: 'hero', position: [0.5, 0.2], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't121', offset: 1.5, kind: 'smarttext', text: '1680 · TWELVE YEARS · \u201992 TALK, \u201993 FIGHT', level: 'subtitle', position: [0.5, 0.45] },

  // t123: (Box eight, checked - already covered, brief)
  // t124: Maya — three AP questions intro
  { turnId: 't124', offset: 1.0, kind: 'smarttext', text: 'THREE AP QUESTIONS', level: 'hero', position: [0.5, 0.25], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't124', offset: 4.0, kind: 'smarttext', text: 'SAY YOUR ANSWER FIRST', level: 'subtitle', position: [0.5, 0.5] },

  // === AP Q1 (t125-t126) ===

  // t125: Q1 — planter, 20 and odd
  { turnId: 't125', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e4/tobacco-plant.jpg' },
  { turnId: 't125', offset: 1.0, kind: 'smarttext', text: 'AP Q1: "20 AND ODD"', level: 'title', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't125', offset: 4.0, kind: 'smarttext', text: 'WHY PAIR THEM?', level: 'subtitle', position: [0.5, 0.42] },
  { turnId: 't125', offset: 7.0, kind: 'smarttext', text: '20 SECONDS — THINK', level: 'body', position: [0.5, 0.6] },

  // t126: Answer — Burgesses + White Lion
  { turnId: 't127', offset: 1.0, kind: 'smarttext', text: 'SELF-GOVERNMENT + FORCED LABOR', level: 'title', position: [0.5, 0.25], color: '#51cf66', entrance: 'stamp' },
  { turnId: 't127', offset: 6.0, kind: 'smarttext', text: 'BURGESSES AND WHITE LION · 1619', level: 'subtitle', position: [0.5, 0.5] },
  { turnId: 't127', offset: 11.0, kind: 'smarttext', text: 'SAME TOBACCO ECONOMY', level: 'body', position: [0.5, 0.65] },

  // === AP Q2 (t127-t129) ===

  // t127: Q2 — Tordesillas mistake
  { turnId: 't128', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e2/tordesillas-map.jpg' },
  { turnId: 't128', offset: 1.0, kind: 'smarttext', text: 'AP Q2: TORDESILLAS', level: 'title', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't128', offset: 4.0, kind: 'smarttext', text: '"DIVIDED THE WORLD" — THE MISTAKE?', level: 'subtitle', position: [0.5, 0.42] },
  { turnId: 't128', offset: 5.0, kind: 'smarttext', text: '15 SECONDS — THINK', level: 'body', position: [0.5, 0.6] },

  // t129: Answer — bound two crowns
  { turnId: 't130', offset: 1.0, kind: 'smarttext', text: 'IT BOUND TWO CROWNS', level: 'title', position: [0.5, 0.25], color: '#51cf66', entrance: 'stamp' },
  { turnId: 't130', offset: 6.0, kind: 'smarttext', text: 'FRANCE + ENGLAND: NEVER SIGNED', level: 'subtitle', position: [0.5, 0.5] },

  // === AP Q3 (t130-t132) ===

  // t130: Q3 — Native peoples shape period?
  { turnId: 't131', offset: 1.0, kind: 'smarttext', text: 'AP Q3: SHAPED OR SHAPED BY?', level: 'title', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't131', offset: 4.0, kind: 'smarttext', text: 'DID NATIVES SHAPE THIS PERIOD?', level: 'subtitle', position: [0.5, 0.42] },
  { turnId: 't131', offset: 4.5, kind: 'smarttext', text: '20 SECONDS — THINK', level: 'body', position: [0.5, 0.6] },

  // t132: Answer — they shaped it
  { turnId: 't133', offset: 1.0, kind: 'smarttext', text: 'THEY SHAPED IT', level: 'hero', position: [0.5, 0.2], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't133', offset: 5.0, kind: 'smarttext', text: 'MAIZE \u2192 CAHOKIA · HORSE \u2192 PLAINS', level: 'subtitle', position: [0.5, 0.45] },
  { turnId: 't133', offset: 10.0, kind: 'smarttext', text: 'PUEBLOS HELD 12 YEARS', level: 'body', position: [0.5, 0.62] },

  // === BONUS (t133-t135) ===

  // t133: Bonus — mita or repartimiento?
  { turnId: 't134', offset: 1.0, kind: 'smarttext', text: 'BONUS: MITA OR REPARTIMIENTO?', level: 'title', position: [0.5, 0.3], color: '#ffd700' },
  { turnId: 't134', offset: 4.0, kind: 'smarttext', text: '5 SECONDS — FAST', level: 'body', position: [0.5, 0.55] },

  // t135: Answer — mita
  { turnId: 't136', offset: 1.0, kind: 'smarttext', text: 'MITA. PERU\u2019S.', level: 'hero', position: [0.5, 0.3], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't136', offset: 3.0, kind: 'smarttext', text: 'REPARTIMIENTO = NEW SPAIN', level: 'subtitle', position: [0.5, 0.55] },

  // === CLOSING (t136-t139) ===

  // t137: Maya closing line
  { turnId: 't137', offset: 1.0, kind: 'smarttext', text: 'TEN QUESTIONS · EIGHT EPISODES · ONE UNIT', level: 'title', position: [0.5, 0.3], color: '#ffd700' },

  // t138: Jay landing
  { turnId: 't138', offset: 0.3, kind: 'bubble', text: 'no mercy, and all of them landed.', position: [0.5, 0.3], width: 380 },
  { turnId: 't138', offset: 1.0, kind: 'smarttext', text: 'ALL OF THEM LANDED', level: 'hero', position: [0.5, 0.55], entrance: 'stamp', color: '#51cf66' },

  // t139: Maya outro
  { turnId: 't139', offset: 1.0, kind: 'smarttext', text: 'CHECK YOUR EIGHT BOXES', level: 'title', position: [0.5, 0.3] },
  { turnId: 't139', offset: 6.0, kind: 'smarttext', text: 'NEXT: FOUR EMPIRES, FOUR WAYS', level: 'subtitle', position: [0.5, 0.52], color: '#ffd700' },
];

/* ------------------------------------------------------------------ */
/* Background per turn (fallback when no bg-swap beat is active)        */
/* ------------------------------------------------------------------ */
const getBackgroundForTurn = (turnId: string | null): string => {
  if (!turnId) return 'historic/cahokia-monks-mound.jpg';
  const n = parseInt(turnId.slice(1), 10);
  // Intro
  if (n <= 1) return 'historic/cahokia-monks-mound.jpg';
  // Q1: Native societies
  if (n <= 9) return 'historic/cahokia-monks-mound.jpg';
  // Q2: Why Europe sailed
  if (n <= 22) return 'historic/u1e2/caravel-replicas.jpg';
  // Q3: Exchange
  if (n <= 31) return 'historic/u1e2/cantino-planisphere.jpg';
  // Q4: Jamestown
  if (n <= 42) return 'historic/u1e4/three-ships.jpg';
  // Q5: Potos\u00ed
  if (n <= 56) return 'historic/u1e5/potosi-cerro-rico.jpg';
  // Q6: Labor
  if (n <= 73) return 'historic/u1e6/middle-passage-ship.jpg';
  // Q7: Valladolid
  if (n <= 83) return 'historic/u1e7/valladolid-1550.jpg';
  // Q8: Pueblo
  if (n <= 96) return 'historic/u1e8/knotted-cord.jpg';
  // Q9-Q10
  if (n <= 106) return 'historic/cahokia-monks-mound.jpg';
  // Box check recap — cycle through
  if (n <= 123) return 'historic/u1e2/cantino-planisphere.jpg';
  // AP questions
  if (n <= 135) return 'historic/u1e4/tobacco-plant.jpg';
  // Closing
  return 'historic/cahokia-monks-mound.jpg';
};

/* ------------------------------------------------------------------ */
/* Main episode                                                         */
/* ------------------------------------------------------------------ */
export const U1E9Episode: React.FC = () => {
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
  const bgSrc = subBeatBg || getBackgroundForTurn(activeTurn?.id || null);

  // Ken Burns drift
  const kbT = (frame % (fps * 20)) / (fps * 20);
  const kbScale = 1.08 + 0.04 * Math.sin(kbT * Math.PI * 2);
  const kbX = 20 * Math.sin(kbT * Math.PI * 2);
  const kbY = 12 * Math.cos(kbT * Math.PI * 2);

  // Talking head: show for maya/jay, not for pause turns
  const showHead = activeTurn && (activeTurn.speaker === 'maya' || activeTurn.speaker === 'jay') && turnElapsed > 0.2;
  const isJay = activeTurn?.speaker === 'jay';
  const headConfig = isJay
    ? { name: 'Jay', color: '#2c5aa0', realistic: staticFile('marcus-real.webp') }
    : { name: 'Maya', color: '#c9a227', realistic: staticFile('maya-real.webp') };

  return (
    <ToneProvider tone="playful">
      <AutoLayoutProvider debug={false}>
        <AbsoluteFill style={{ backgroundColor: '#141210' }}>
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
          <EpisodeMusic episode="E9" />

          {/* Talking head */}
          {showHead && (
            <TalkingHead
              key={`head-${activeTurn!.id}`}
              speakerName={headConfig.name}
              speakerColor={headConfig.color}
              position="bottom-right"
              size={0.26}
              speaking={true}
              showName={true}
              assetPair={{
                realistic: headConfig.realistic,
                stylized: staticFile('maya-toon.webp'),
              }}
              frameStyle="rounded"
            />
          )}

          {/* Title card */}
          {activeTurn?.id === 't00' && turnElapsed < 3 && (
            <TitleCard kicker="UNIT 1 \u00b7 EPISODE 9:"
              title="CRAM SESSION" subline="TEN QUESTIONS \u00b7 EIGHT EPISODES \u00b7 ONE UNIT" at={activeStartFrame} />
          )}

          {/* Sub-beats */}
          {activeSubBeats.map((beat, idx) => {
            const beatFrame = activeStartFrame + Math.floor(beat.offset * fps);
            const key = `${beat.turnId}-${beat.offset}-${idx}`;

            if (beat.kind === 'smarttext' && beat.text) {
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

            // bg-swap is handled via subBeatBg
            // versus not used in E9

            return null;
          })}

          {/* Debug */}
          <div style={{
            position: 'absolute', top: 10, left: 10,
            fontFamily: 'monospace', fontSize: 13,
            color: 'rgba(255,255,255,0.5)', zIndex: 100,
          }}>
            {activeTurn ? `${activeTurn.id} [${activeTurn.speaker}] ${timeSec.toFixed(1)}s` : '\u2014'}
          </div>
        </AbsoluteFill>
      </AutoLayoutProvider>
    </ToneProvider>
  );
};
