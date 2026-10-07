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
import { ToneProvider } from '../validation/ToneContext';
import { AutoLayoutProvider } from '../validation/AutoLayout';

import turnsData from '../data/u2e8/turns.json';
import timingData from '../data/u2e8/timing_map.json';

interface Turn {
  id: string;
  speaker: string;
  text: string;
  pause_after?: number;
}

const turns = turnsData as Turn[];
const starts = (timingData as { starts: number[] }).starts;
const durations = (timingData as { durations: number[] }).durations;

const EP = 'u2e8';

/* ------------------------------------------------------------------ */
/* Sub-beats: timed visual events. offset = seconds into the turn.      */
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
  mapImage?: string;
  items?: JourneyItem[];
  caption?: string;
  variant?: 'overview' | 'detail' | 'dark';
  documentTitle?: string;
  authorAndDate?: string;
  excerptText?: string;
  highlightedPhrase?: string;
  hippType?: 'Historical Context' | 'Intended Audience' | 'Purpose' | 'Point of View';
  hippExplanation?: string;
}

const SUB_BEATS: SubBeat[] = [
  // t00: Opening — the stakes
  { turnId: 't00', offset: 4.0, kind: 'smarttext', text: 'ONE SHOT IN THE RAIN', level: 'hero', position: [0.5, 0.2] },
  { turnId: 't00', offset: 12.0, kind: 'smarttext', text: '4 BOXES: the shot · Albany + Braddock · Quebec · aftermath', level: 'body', position: [0.5, 0.45] },
  { turnId: 't00', offset: 20.0, kind: 'bubble', text: 'Circle the ones you couldn\'t explain right now', position: [0.5, 0.62], width: 400 },

  // t01: Jumonville Glen — the shot
  { turnId: 't01', offset: 2.0, kind: 'bg-swap', bgImage: 'historic/u2e8/washington-jumonville.jpg' },
  { turnId: 't01', offset: 2.0, kind: 'smarttext', text: 'JUMONVILLE GLEN — MAY 1754', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't01', offset: 8.0, kind: 'smarttext', text: '22 years old · ~40 men · before dawn, in the rain', level: 'body', position: [0.5, 0.45] },
  { turnId: 't01', offset: 14.0, kind: 'bubble', text: '~10 dead · ~20 captured · 1 slips away', position: [0.5, 0.62], width: 380 },

  // t02: France's version
  { turnId: 't02', offset: 2.0, kind: 'bubble', text: 'diplomatic message — not attack orders?', position: [0.5, 0.4], width: 360 },

  // t03: two stories of one death
  { turnId: 't03', offset: 3.0, kind: 'smarttext', text: 'ENVOY OR AMBUSH?', level: 'title', position: [0.5, 0.2] },
  { turnId: 't03', offset: 7.0, kind: 'smarttext', text: 'France: peaceful mission · Washington: soldiers in a ravine', level: 'body', position: [0.5, 0.5] },
  { turnId: 't03', offset: 11.0, kind: 'bubble', text: 'the same death, told two ways', position: [0.5, 0.68], width: 340 },

  // t04: exam lens
  { turnId: 't04', offset: 1.0, kind: 'smarttext', text: 'THE EXAM WANTS WHAT THE KILLING DID', level: 'subtitle', position: [0.5, 0.25] },

  // t05: Tanacharison
  { turnId: 't05', offset: 3.0, kind: 'smarttext', text: 'TANACHARISON — THE HALF-KING', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't05', offset: 10.0, kind: 'bubble', text: 'tomahawk — nine more scalped before Washington stops it', position: [0.5, 0.55], width: 400 },
  { turnId: 't05', offset: 17.0, kind: 'smarttext', text: 'France calls it MURDER — and uses it to justify war', level: 'body', position: [0.5, 0.75] },
  { turnId: 't05', offset: 24.0, kind: 'bubble', text: 'the brains detail is legend — reported, never proven', position: [0.5, 0.35], width: 400 },

  // t06: the correction
  { turnId: 't06', offset: 2.0, kind: 'bubble', text: 'ensign — not an ambassador', position: [0.5, 0.4], width: 320 },

  // t07: ensign, peacetime
  { turnId: 't07', offset: 3.0, kind: 'smarttext', text: 'ENSIGN, NOT AMBASSADOR', level: 'hero', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't07', offset: 8.0, kind: 'bubble', text: 'a massacre in Paris, a skirmish in London', position: [0.5, 0.55], width: 380 },

  // t08: peacetime
  { turnId: 't08', offset: 1.5, kind: 'smarttext', text: 'NOT EVEN AT WAR YET', level: 'subtitle', position: [0.5, 0.25] },

  // t09: Fort Necessity
  { turnId: 't09', offset: 2.0, kind: 'bg-swap', bgImage: 'historic/u2e8/fort-necessity.jpg' },
  { turnId: 't09', offset: 3.0, kind: 'smarttext', text: 'FORT NECESSITY — JULY 3, 1754', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't09', offset: 8.0, kind: 'smarttext', text: 'falls back, throws up a stockade, beaten in a day', level: 'body', position: [0.5, 0.5] },
  { turnId: 't09', offset: 12.0, kind: 'bubble', text: 'signs the surrender — in French, which he can\'t read', position: [0.5, 0.7], width: 400 },

  // t10: prediction beat
  { turnId: 't10', offset: 3.0, kind: 'smarttext', text: 'WHAT\'S THE DANGER OF SIGNING BLIND?', level: 'subtitle', position: [0.5, 0.3] },

  // t11: pause — 10s of silence
  { turnId: 't11', offset: 2.0, kind: 'smarttext', text: '✍️ sign blind — they can write whatever they want', level: 'body', position: [0.5, 0.4] },

  // t13: l'assassinat
  { turnId: 't13', offset: 2.0, kind: 'smarttext', text: 'L\'ASSASSINAT', level: 'hero', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't13', offset: 4.5, kind: 'bubble', text: 'assassination — buried in the surrender terms', position: [0.5, 0.55], width: 400 },

  // t14: the signed confession
  { turnId: 't14', offset: 1.5, kind: 'bubble', text: 'he signed a confession — he couldn\'t even read', position: [0.5, 0.4], width: 380 },

  // t15: fuse lit
  { turnId: 't15', offset: 2.0, kind: 'bubble', text: 'carried home like a confession — the fuse is lit', position: [0.5, 0.35], width: 400 },
  { turnId: 't15', offset: 5.0, kind: 'smarttext', text: 'Washington\'s ONLY surrender — in his whole career', level: 'body', position: [0.5, 0.6] },

  // t16: the document as stimulus
  { turnId: 't16', offset: 3.0, kind: 'primarysource',
    documentTitle: 'Articles of Capitulation, Fort Necessity',
    authorAndDate: 'Signed July 3, 1754 — written in French',
    excerptText: 'Buried in the French terms was a single word: l\'assassinat — "assassination." Washington signed a paper admitting he\'d assassinated Jumonville. He couldn\'t read French.',
    highlightedPhrase: 'l\'assassinat',
    hippType: 'Historical Context',
    hippExplanation: 'France carried this paper home like a confession and used it to demand war. The document mattered as propaganda — the casus belli, not proof of guilt.' },

  // t17: common mistake
  { turnId: 't17', offset: 3.0, kind: 'smarttext', text: 'COMMON MISTAKE: NOT A GENERAL', level: 'title', position: [0.5, 0.2], color: '#ff8a8a' },
  { turnId: 't17', offset: 7.0, kind: 'bubble', text: 'an ensign — the fury was about PEACETIME killing', position: [0.5, 0.5], width: 400 },

  // t18: Albany, next
  { turnId: 't18', offset: 1.0, kind: 'smarttext', text: 'ALBANY, NEXT', level: 'subtitle', position: [0.5, 0.25] },

  // t19: Albany Plan of Union
  { turnId: 't19', offset: 2.0, kind: 'bg-swap', bgImage: 'historic/u2e8/join-or-die.jpg' },
  { turnId: 't19', offset: 3.0, kind: 'smarttext', text: 'ALBANY PLAN OF UNION — 1754', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't19', offset: 8.0, kind: 'smarttext', text: '7 colonies · Franklin\'s plan: one united colonial government', level: 'body', position: [0.5, 0.5] },
  { turnId: 't19', offset: 11.0, kind: 'bubble', text: 'council + a president appointed by the king', position: [0.5, 0.7], width: 380 },

  // t20: dies twice
  { turnId: 't20', offset: 2.0, kind: 'smarttext', text: 'DIES TWICE', level: 'hero', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't20', offset: 4.5, kind: 'bubble', text: 'colonies say no · then London says no', position: [0.5, 0.55], width: 360 },

  // t21: the why-not
  { turnId: 't21', offset: 3.0, kind: 'smarttext', text: 'THE WHY-NOT: SOVEREIGNTY', level: 'title', position: [0.5, 0.2] },
  { turnId: 't21', offset: 7.0, kind: 'smarttext', text: 'NOT Parliament\'s veto — the colonies rejected it themselves', level: 'body', position: [0.5, 0.5] },
  { turnId: 't21', offset: 11.0, kind: 'bubble', text: 'answer: sovereignty, not incompetence', position: [0.5, 0.7], width: 360 },

  // t22: the trap
  { turnId: 't22', offset: 1.0, kind: 'bubble', text: 'incompetence is the trap', position: [0.5, 0.4], width: 320 },

  // t23: guarding power
  { turnId: 't23', offset: 2.0, kind: 'smarttext', text: 'guarding their own power — not disorganized', level: 'body', position: [0.5, 0.3] },

  // t24: date trap
  { turnId: 't24', offset: 3.0, kind: 'smarttext', text: '1754 — BEFORE BRADDOCK', level: 'title', position: [0.5, 0.25] },
  { turnId: 't24', offset: 6.0, kind: 'bubble', text: 'don\'t date the Albany Plan after the army arrives', position: [0.5, 0.55], width: 400 },

  // t25: Braddock
  { turnId: 't25', offset: 2.0, kind: 'bg-swap', bgImage: 'historic/u2e8/monongahela.jpg' },
  { turnId: 't25', offset: 3.0, kind: 'smarttext', text: 'BRADDOCK — JULY 9, 1755', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't25', offset: 8.0, kind: 'smarttext', text: '~1,500 British regulars march on Fort Duquesne', level: 'body', position: [0.5, 0.5] },
  { turnId: 't25', offset: 11.0, kind: 'bubble', text: 'a smaller French + Native force hits the column — in the woods', position: [0.5, 0.7], width: 420 },

  // t26: the map of Europe
  { turnId: 't26', offset: 2.0, kind: 'bubble', text: 'Braddock trusted the map of Europe in the woods of Pennsylvania', position: [0.5, 0.4], width: 420 },
  { turnId: 't26', offset: 6.0, kind: 'smarttext', text: 'trust your instincts instead of the map — you get lost', level: 'body', position: [0.5, 0.65] },

  // t27: the Monongahela
  { turnId: 't27', offset: 3.0, kind: 'smarttext', text: 'MONONGAHELA: ~1,000 LOST', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't27', offset: 8.0, kind: 'smarttext', text: 'lines + volleys vs fighters in the tree line', level: 'body', position: [0.5, 0.5] },
  { turnId: 't27', offset: 14.0, kind: 'bg-swap', bgImage: 'historic/u2e8/washington-monongahela.jpg' },
  { turnId: 't27', offset: 16.0, kind: 'bubble', text: '"four bullets through my coat, and two horses shot under me"', position: [0.5, 0.35], width: 420 },
  { turnId: 't27', offset: 22.0, kind: 'smarttext', text: 'HE RIDES HOME UNHURT', level: 'subtitle', position: [0.5, 0.6] },

  // t28: wrong war
  { turnId: 't28', offset: 1.5, kind: 'smarttext', text: 'NOT THE "SHOT HEARD ROUND THE WORLD"', level: 'subtitle', position: [0.5, 0.25] },

  // t29: Emerson
  { turnId: 't29', offset: 2.0, kind: 'bubble', text: 'Emerson\'s poem — Lexington and Concord, 1775', position: [0.5, 0.35], width: 400 },
  { turnId: 't29', offset: 5.0, kind: 'smarttext', text: 'THIS shot is the one nobody remembers — and it started the world war', level: 'body', position: [0.5, 0.6] },

  // t30: two boxes down
  { turnId: 't30', offset: 0.5, kind: 'smarttext', text: '✅ 2 BOXES DOWN — EARNED', level: 'subtitle', position: [0.5, 0.8], color: '#7dd87d' },

  // t31: Pitt takes charge
  { turnId: 't31', offset: 3.0, kind: 'smarttext', text: '1757: WILLIAM PITT TAKES CHARGE', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't31', offset: 7.0, kind: 'bubble', text: '"conquer America in Germany"', position: [0.5, 0.5], width: 360 },
  { turnId: 't31', offset: 10.0, kind: 'smarttext', text: 'wording\'s debated — the strategy isn\'t', level: 'body', position: [0.5, 0.72] },

  // t32: prediction beat
  { turnId: 't32', offset: 2.0, kind: 'smarttext', text: 'YOU\'RE PITT, 1757 — WHERE DO YOU SPEND?', level: 'subtitle', position: [0.5, 0.3] },

  // t33: pause — 8s of silence
  { turnId: 't33', offset: 2.0, kind: 'smarttext', text: 'tie France down in Europe · spend the real money in North America', level: 'body', position: [0.5, 0.4] },

  // t34: exactly
  { turnId: 't34', offset: 2.0, kind: 'bubble', text: 'exactly — spend where the war gets decided', position: [0.5, 0.4], width: 380 },

  // t35: 25,000 redcoats
  { turnId: 't35', offset: 1.5, kind: 'smarttext', text: '25,000 REDCOATS', level: 'hero', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't35', offset: 4.5, kind: 'bubble', text: 'London even paid the colonial militias\' expenses', position: [0.5, 0.55], width: 400 },

  // t36: Quebec
  { turnId: 't36', offset: 2.0, kind: 'bg-swap', bgImage: 'historic/u2e8/death-of-wolfe.jpg' },
  { turnId: 't36', offset: 3.0, kind: 'smarttext', text: 'QUEBEC — SEPTEMBER 13, 1759', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't36', offset: 9.0, kind: 'smarttext', text: 'cliffs scaled before dawn · lined up on the Plains of Abraham', level: 'body', position: [0.5, 0.5] },
  { turnId: 't36', offset: 14.0, kind: 'smarttext', text: 'BOTH GENERALS DIE — BRITAIN WINS ANYWAY', level: 'subtitle', position: [0.5, 0.72] },
  { turnId: 't36', offset: 18.0, kind: 'bubble', text: 'under an hour · Montreal goes the year after', position: [0.5, 0.35], width: 380 },

  // t37: only in APUSH
  { turnId: 't37', offset: 1.5, kind: 'bubble', text: 'Only in APUSH.', position: [0.5, 0.35], width: 200 },

  // t38: Treaty of Paris
  { turnId: 't38', offset: 2.0, kind: 'bg-swap', bgImage: 'historic/u2e8/north-america-1763.jpg' },
  { turnId: 't38', offset: 3.0, kind: 'smarttext', text: 'TREATY OF PARIS — FEB 10, 1763', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't38', offset: 8.0, kind: 'smarttext', text: 'Canada + everything east of the Mississippi → Britain', level: 'body', position: [0.5, 0.5] },
  { turnId: 't38', offset: 11.0, kind: 'smarttext', text: 'Louisiana → Spain · Florida → Britain', level: 'subtitle', position: [0.5, 0.72] },

  // t39: the sugar islands
  { turnId: 't39', offset: 0.5, kind: 'bubble', text: 'and France keeps the sugar islands?', position: [0.5, 0.4], width: 360 },

  // t40: a continent for sugar
  { turnId: 't40', offset: 2.0, kind: 'smarttext', text: 'A CONTINENT TRADED FOR SUGAR', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't40', offset: 5.0, kind: 'bubble', text: 'Guadeloupe + Martinique — sugar worth more than Canada', position: [0.5, 0.55], width: 420 },

  // t41: the trap
  { turnId: 't41', offset: 3.0, kind: 'smarttext', text: 'TRAP: WHY WALK AWAY FROM CANADA?', level: 'title', position: [0.5, 0.2] },
  { turnId: 't41', offset: 8.0, kind: 'smarttext', text: 'sugar profits outweighed Canadian land', level: 'body', position: [0.5, 0.5] },
  { turnId: 't41', offset: 12.0, kind: 'bubble', text: 'if the exam asks — the answer is the sugar islands', position: [0.5, 0.7], width: 400 },

  // t42: not "everything"
  { turnId: 't42', offset: 2.0, kind: 'smarttext', text: 'DIDN\'T "LOSE EVERYTHING"', level: 'title', position: [0.5, 0.25] },
  { turnId: 't42', offset: 4.5, kind: 'bubble', text: 'kept the Caribbean sugar colonies', position: [0.5, 0.55], width: 360 },

  // t43: the bill
  { turnId: 't43', offset: 1.0, kind: 'smarttext', text: 'THE WAR\'S WON. NOW THE BILL.', level: 'subtitle', position: [0.5, 0.25] },

  // t44: enormous debt
  { turnId: 't44', offset: 2.0, kind: 'smarttext', text: 'THE BILL: ENORMOUS DEBT', level: 'title', position: [0.5, 0.25], entrance: 'stamp' },

  // t45: who's left
  { turnId: 't45', offset: 1.0, kind: 'bubble', text: 'who\'s left to fight over it?', position: [0.5, 0.35], width: 320 },

  // t46: Pontiac's Rising
  { turnId: 't46', offset: 2.0, kind: 'bg-swap', bgImage: 'historic/u2e8/monongahela.jpg' },
  { turnId: 't46', offset: 3.0, kind: 'smarttext', text: 'PONTIAC\'S RISING — SPRING 1763', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't46', offset: 8.0, kind: 'smarttext', text: 'French gift diplomacy → British beat-enemy treatment', level: 'body', position: [0.5, 0.5] },
  { turnId: 't46', offset: 13.0, kind: 'bubble', text: 'Detroit besieged · forts fall across the Great Lakes + Ohio Valley', position: [0.5, 0.7], width: 440 },
  { turnId: 't46', offset: 18.0, kind: 'smarttext', text: 'TAKES BRITAIN A YEAR+ TO BREAK IT', level: 'subtitle', position: [0.5, 0.35] },

  // t47: the line
  { turnId: 't47', offset: 1.5, kind: 'smarttext', text: 'THE BILL I GET — WHAT\'S THE LINE?', level: 'subtitle', position: [0.5, 0.25] },

  // t48: Proclamation of 1763
  { turnId: 't48', offset: 2.0, kind: 'bg-swap', bgImage: 'historic/u2e8/north-america-1763.jpg' },
  { turnId: 't48', offset: 3.0, kind: 'smarttext', text: 'PROCLAMATION OF 1763 — OCT 7', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't48', offset: 8.0, kind: 'smarttext', text: 'NO settlement west of the Appalachians', level: 'body', position: [0.5, 0.5] },
  { turnId: 't48', offset: 11.0, kind: 'bubble', text: 'stop paying for frontier wars · keep the fur trade flowing', position: [0.5, 0.7], width: 420 },

  // t49: the speculators
  { turnId: 't49', offset: 0.5, kind: 'bubble', text: 'including the speculators', position: [0.5, 0.4], width: 300 },

  // t50: Washington's bounty land
  { turnId: 't50', offset: 2.0, kind: 'smarttext', text: 'Washington\'s 200,000 Ohio acres — grants FROZEN', level: 'body', position: [0.5, 0.3] },
  { turnId: 't50', offset: 6.0, kind: 'bubble', text: 'the kid who started the war couldn\'t cash in on winning it', position: [0.5, 0.6], width: 420 },

  // t51: the motive trap
  { turnId: 't51', offset: 3.0, kind: 'smarttext', text: 'MOTIVE: TREASURY, NOT REVENGE', level: 'title', position: [0.5, 0.2] },
  { turnId: 't51', offset: 7.0, kind: 'smarttext', text: 'don\'t write "to punish the colonists" — follow the money', level: 'body', position: [0.5, 0.5] },
  { turnId: 't51', offset: 10.0, kind: 'bubble', text: 'London wanted the frontier wars off its books', position: [0.5, 0.72], width: 400 },

  // t52: weight of the Proclamation
  { turnId: 't52', offset: 3.0, kind: 'smarttext', text: 'ONE GRIEVANCE AMONG MANY', level: 'title', position: [0.5, 0.2] },
  { turnId: 't52', offset: 6.0, kind: 'smarttext', text: 'the Proclamation didn\'t cause the Revolution', level: 'body', position: [0.5, 0.5] },
  { turnId: 't52', offset: 9.0, kind: 'bubble', text: 'the tax fight is a whole other episode', position: [0.5, 0.7], width: 380 },

  // t53: recap — box 1
  { turnId: 't53', offset: 2.0, kind: 'bg-swap', bgImage: 'historic/u2e8/jumonville-glen.png' },
  { turnId: 't53', offset: 3.0, kind: 'smarttext', text: 'BOX 1: JUMONVILLE GLEN, MAY 1754', level: 'title', position: [0.5, 0.2] },
  { turnId: 't53', offset: 8.0, kind: 'smarttext', text: 'France: murder · l\'assassinat · Washington\'s only surrender', level: 'body', position: [0.5, 0.5] },
  { turnId: 't53', offset: 13.0, kind: 'bubble', text: 'fifteen minutes in the rain', position: [0.5, 0.7], width: 300 },
  { turnId: 't53', offset: 17.0, kind: 'smarttext', text: '✅ BOX 1 — LANDED', level: 'subtitle', position: [0.5, 0.8], color: '#7dd87d' },

  // t54: l'assassinat
  { turnId: 't54', offset: 0.5, kind: 'smarttext', text: 'l\'assassinat — one word, one confession', level: 'body', position: [0.5, 0.3] },

  // t55: recap — box 2
  { turnId: 't55', offset: 2.0, kind: 'bg-swap', bgImage: 'historic/u2e8/monongahela.jpg' },
  { turnId: 't55', offset: 3.0, kind: 'smarttext', text: 'BOX 2: ALBANY DIES TWICE · BRADDOCK FALLS', level: 'title', position: [0.5, 0.2] },
  { turnId: 't55', offset: 8.0, kind: 'smarttext', text: 'nobody gives up power · European lines fail in the woods', level: 'body', position: [0.5, 0.5] },
  { turnId: 't55', offset: 13.0, kind: 'bubble', text: '"four bullets through my coat" — his actual words', position: [0.5, 0.7], width: 400 },

  // t56: his actual words
  { turnId: 't56', offset: 0.3, kind: 'smarttext', text: 'his actual words', level: 'body', position: [0.5, 0.3] },

  // t57: recap — box 3
  { turnId: 't57', offset: 2.0, kind: 'bg-swap', bgImage: 'historic/u2e8/death-of-wolfe.jpg' },
  { turnId: 't57', offset: 3.0, kind: 'smarttext', text: 'BOX 3: QUEBEC 1759 · PARIS 1763', level: 'title', position: [0.5, 0.2] },
  { turnId: 't57', offset: 8.0, kind: 'smarttext', text: 'under an hour, both generals dead — France trades a continent for sugar', level: 'body', position: [0.5, 0.55] },
  { turnId: 't57', offset: 12.0, kind: 'smarttext', text: '✅ BOX 3 — LANDED', level: 'subtitle', position: [0.5, 0.8], color: '#7dd87d' },

  // t59: recap — box 4
  { turnId: 't59', offset: 2.0, kind: 'bg-swap', bgImage: 'historic/u2e8/north-america-1763.jpg' },
  { turnId: 't59', offset: 3.0, kind: 'smarttext', text: 'BOX 4: PONTIAC + THE LINE', level: 'title', position: [0.5, 0.2] },
  { turnId: 't59', offset: 7.0, kind: 'smarttext', text: 'the Appalachians — NOT the Mississippi', level: 'body', position: [0.5, 0.5] },
  { turnId: 't59', offset: 10.0, kind: 'bubble', text: 'enormous debt · a century of looking the other way is over', position: [0.5, 0.7], width: 420 },

  // t60: the line, corrected
  { turnId: 't60', offset: 2.0, kind: 'smarttext', text: 'the Appalachians — the treaty drew the MISSISSIPPI line', level: 'body', position: [0.5, 0.35] },
  { turnId: 't60', offset: 5.0, kind: 'smarttext', text: '✅ FOUR BOXES — CHECK THEM', level: 'subtitle', position: [0.5, 0.7], color: '#7dd87d' },

  // t61: CER intro
  { turnId: 't61', offset: 2.0, kind: 'smarttext', text: '3 AP-STYLE QUESTIONS', level: 'title', position: [0.5, 0.2] },
  { turnId: 't61', offset: 6.0, kind: 'smarttext', text: 'this war is your LEQ turning-point paragraph: 1763 changes everything', level: 'body', position: [0.5, 0.5] },
  { turnId: 't61', offset: 10.0, kind: 'bubble', text: 'say your answer before I give it', position: [0.5, 0.7], width: 360 },

  // t62: Q1 stimulus
  { turnId: 't62', offset: 2.0, kind: 'smarttext', text: 'Q1: THE SURRENDER DOCUMENT', level: 'title', position: [0.5, 0.2] },
  { turnId: 't62', offset: 6.0, kind: 'smarttext', text: 'stimulus: French text containing "l\'assassinat"', level: 'body', position: [0.5, 0.5] },
  { turnId: 't62', offset: 9.0, kind: 'bubble', text: 'what does it prove about the war\'s start?', position: [0.5, 0.7], width: 380 },

  // t63: pause — 15s of silence
  { turnId: 't63', offset: 2.0, kind: 'smarttext', text: 'SAY YOUR ANSWER OUT LOUD', level: 'subtitle', position: [0.5, 0.4] },

  // t64: Q1 answer
  { turnId: 't64', offset: 3.0, kind: 'smarttext', text: 'Q1: PROPAGANDA, NOT PROOF', level: 'title', position: [0.5, 0.2] },
  { turnId: 't64', offset: 7.0, kind: 'smarttext', text: 'it became France\'s justification for war — not Washington\'s guilt', level: 'body', position: [0.5, 0.5] },
  { turnId: 't64', offset: 12.0, kind: 'bubble', text: 'a confession, real or not — carried home for revenge', position: [0.5, 0.7], width: 400 },

  // t65: Q2 stimulus
  { turnId: 't65', offset: 2.0, kind: 'smarttext', text: 'Q2: WHY DID BRADDOCK LOSE?', level: 'title', position: [0.5, 0.2] },
  { turnId: 't65', offset: 5.0, kind: 'bubble', text: 'his army OUTNUMBERED them', position: [0.5, 0.55], width: 340 },

  // t66: pause — 20s of silence
  { turnId: 't66', offset: 2.0, kind: 'smarttext', text: 'SAY YOUR ANSWER OUT LOUD', level: 'subtitle', position: [0.5, 0.4] },

  // t67: Q2 answer
  { turnId: 't67', offset: 3.0, kind: 'smarttext', text: 'Q2: THE WOODS BEAT THE LINES', level: 'title', position: [0.5, 0.2] },
  { turnId: 't67', offset: 7.0, kind: 'smarttext', text: 'European tactics failed in America: volleys vs tree-line fire', level: 'body', position: [0.5, 0.5] },
  { turnId: 't67', offset: 12.0, kind: 'bubble', text: '~1,000 British killed or wounded — the limits of an empire\'s way of fighting', position: [0.5, 0.7], width: 460 },

  // t68: Q3 stimulus
  { turnId: 't68', offset: 2.0, kind: 'smarttext', text: 'Q3: THE 1763 MAP', level: 'title', position: [0.5, 0.2] },
  { turnId: 't68', offset: 5.0, kind: 'bg-swap', bgImage: 'historic/u2e8/north-america-1763.jpg' },
  { turnId: 't68', offset: 6.0, kind: 'smarttext', text: 'east of the Mississippi: British · Louisiana: Spanish · Florida: British', level: 'body', position: [0.5, 0.55] },
  { turnId: 't68', offset: 10.0, kind: 'bubble', text: 'what does the map show about who won what?', position: [0.5, 0.75], width: 400 },

  // t69: pause — 15s of silence
  { turnId: 't69', offset: 2.0, kind: 'smarttext', text: 'TRACE THE NEW LINES', level: 'subtitle', position: [0.5, 0.4] },

  // t70: Q3 answer
  { turnId: 't70', offset: 3.0, kind: 'smarttext', text: 'Q3: SUGAR FOR FRANCE, LAND FOR BRITAIN', level: 'title', position: [0.5, 0.2] },
  { turnId: 't70', offset: 7.0, kind: 'smarttext', text: 'France chose sugar profits · Britain chose land it must now pay for', level: 'body', position: [0.5, 0.5] },
  { turnId: 't70', offset: 12.0, kind: 'bubble', text: 'Spain trades Florida for Louisiana', position: [0.5, 0.7], width: 340 },

  // t71: fast bonus
  { turnId: 't71', offset: 1.0, kind: 'smarttext', text: '⚡ FAST BONUS', level: 'title', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't71', offset: 3.0, kind: 'bubble', text: 'revenge — or the treasury?', position: [0.5, 0.5], width: 300 },

  // t72: pause — 5s
  { turnId: 't72', offset: 1.0, kind: 'smarttext', text: 'THE TREASURY', level: 'subtitle', position: [0.5, 0.4] },

  // t73: the treasury
  { turnId: 't73', offset: 1.0, kind: 'smarttext', text: 'THE TREASURY — FRONTIER WARS OFF THE BOOKS', level: 'subtitle', position: [0.5, 0.3] },

  // t74: boxes checked
  { turnId: 't74', offset: 0.3, kind: 'smarttext', text: '✅ FOUR BOXES — CHECKED', level: 'subtitle', position: [0.5, 0.5], color: '#7dd87d' },

  // t75: next time
  { turnId: 't75', offset: 1.0, kind: 'smarttext', text: 'NEXT: THE BILL LANDS', level: 'title', position: [0.5, 0.25] },
  { turnId: 't75', offset: 3.5, kind: 'bubble', text: 'Grenville does the math — the colonies learn what an empire costs', position: [0.5, 0.55], width: 420 },

  // t76/t77: closing tagline
  { turnId: 't76', offset: 0.3, kind: 'smarttext', text: 'A CONTINENT WON —', level: 'hero', position: [0.5, 0.3] },
  { turnId: 't77', offset: 0.3, kind: 'smarttext', text: 'AND LONDON SENDS THE BILL.', level: 'hero', position: [0.5, 0.3] },
];

/* ------------------------------------------------------------------ */
/* Background selector                                                  */
/* ------------------------------------------------------------------ */
function getBackgroundForTurn(turnId: string | null, subBeatBg: string | null): string {
  if (subBeatBg) return subBeatBg;
  if (!turnId) return 'historic/u2e8/ohio-country-map.jpg';
  const n = parseInt(turnId.slice(1), 10);
  // Box 1: the shot — Jumonville Glen
  if (n <= 8) return 'historic/u2e8/jumonville-glen.png';
  // Fort Necessity + the surrender document
  if (n <= 17) return 'historic/u2e8/fort-necessity.jpg';
  // Box 2: Albany + Braddock
  if (n <= 24) return 'historic/u2e8/join-or-die.jpg';
  if (n <= 30) return 'historic/u2e8/monongahela.jpg';
  // Box 3: Quebec
  if (n <= 37) return 'historic/u2e8/death-of-wolfe.jpg';
  // Treaty of Paris
  if (n <= 42) return 'historic/u2e8/north-america-1763.jpg';
  // Box 4: Pontiac's rising
  if (n <= 47) return 'historic/u2e8/monongahela.jpg';
  // Proclamation line
  if (n <= 52) return 'historic/u2e8/north-america-1763.jpg';
  // Recap + CER: travel by bg-swap
  return 'historic/u2e8/north-america-1763.jpg';
}

/* ------------------------------------------------------------------ */
/* Main episode                                                         */
/* ------------------------------------------------------------------ */
export const U2E8Episode: React.FC = () => {
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

  // Tone: serious for combat/death turns, playful for quiz/recap beats
  const SERIOUS_TURNS = new Set(['t01', 't05', 't07', 't09', 't13', 't27', 't36', 't46']);
  const isSeriousSection = activeTurn && SERIOUS_TURNS.has(activeTurn.id);

  const showHead = activeTurn &&
    (activeTurn.speaker === 'maya' || activeTurn.speaker === 'marcus') &&
    !(activeTurn.id === 't00' && turnElapsed < 3);

  // marcus-toon doesn't exist yet — placeholder like U2E1's jay handling
  const speakerAssets = (speaker: string) => {
    if (speaker === 'maya') {
      return {
        realistic: staticFile('maya-real.webp'),
        stylized: staticFile('maya-toon.webp'),
      };
    }
    return {
      realistic: staticFile('marcus-real.webp'),
      stylized: staticFile('maya-toon.webp'),
    };
  };

  const speakerName = (speaker: string) => {
    if (speaker === 'maya') return 'Maya';
    if (speaker === 'marcus') return 'Marcus';
    return speaker;
  };

  const speakerColor = (speaker: string) => {
    if (speaker === 'maya') return '#c9a227';
    if (speaker === 'marcus') return '#2c8a5a';
    return '#2c5aa0';
  };

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

          {/* Talking head */}
          {showHead && (
            <TalkingHead
              key={`head-${activeTurn!.id}`}
              speakerName={speakerName(activeTurn!.speaker)}
              speakerColor={speakerColor(activeTurn!.speaker)}
              position="bottom-right"
              size={0.26}
              speaking={true}
              showName={true}
              assetPair={speakerAssets(activeTurn!.speaker)}
              frameStyle="rounded"
            />
          )}

          {/* Title card */}
          {activeTurn?.id === 't00' && turnElapsed < 3 && (
            <TitleCard kicker="UNIT 2 · EPISODE 8:"
              title="ONE SHOT IN THE RAIN" subline="THE FRENCH & INDIAN WAR" at={activeStartFrame} />
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

            if (beat.kind === 'mapjourney' && beat.items) {
              return <MapJourney key={key}
                at={beatFrame}
                mapImage={beat.mapImage || 'historic/u2e8/ohio-country-map.jpg'}
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
