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

import turnsData from '../data/u2e5/turns.json';
import timingData from '../data/u2e5/timing_map.json';

interface Turn {
  id: string;
  speaker: string;
  text: string;
  pause_after?: number;
}

const turns = turnsData as Turn[];
const starts = (timingData as { starts: number[] }).starts;
const durations = (timingData as { durations: number[] }).durations;

const EP = 'u2e5';

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
  // t00: Cold open — three boxes
  { turnId: 't00', offset: 4.0, kind: 'smarttext', text: 'THREE BOXES', level: 'hero', position: [0.5, 0.22] },
  { turnId: 't00', offset: 10.0, kind: 'smarttext', text: 'BOX 1 · MERCANTILISM', level: 'subtitle', position: [0.5, 0.42] },
  { turnId: 't00', offset: 17.0, kind: 'smarttext', text: 'BOX 2 · THE NAVIGATION ACTS', level: 'subtitle', position: [0.5, 0.59] },
  { turnId: 't00', offset: 24.0, kind: 'smarttext', text: 'BOX 3 · SALUTARY NEGLECT', level: 'subtitle', position: [0.5, 0.76] },

  // t01: Bullion, the fixed pile
  { turnId: 't01', offset: 2.0, kind: 'smarttext', text: 'BULLION', level: 'hero', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't01', offset: 6.0, kind: 'smarttext', text: 'THE WORLD PILE IS FIXED', level: 'title', position: [0.5, 0.45] },
  { turnId: 't01', offset: 10.0, kind: 'bubble', text: 'sell more than you buy', position: [0.5, 0.62], width: 380 },

  // t02: Piggy bank confession
  { turnId: 't02', offset: 1.0, kind: 'bubble', text: 'piggy bank shaped like a cannon', position: [0.5, 0.35], width: 420 },
  { turnId: 't02', offset: 5.0, kind: 'smarttext', text: 'TEN-YEAR-OLD MERCANTILIST', level: 'title', position: [0.5, 0.62] },

  // t03: The colonies' two jobs
  { turnId: 't03', offset: 2.0, kind: 'smarttext', text: 'JOB 1: SHIP RAW MATERIALS CHEAP', level: 'subtitle', position: [0.5, 0.3] },
  { turnId: 't03', offset: 5.5, kind: 'smarttext', text: 'JOB 2: BUY FINISHED GOODS DEAR', level: 'subtitle', position: [0.5, 0.47] },
  { turnId: 't03', offset: 9.0, kind: 'smarttext', text: 'NEVER BUILD THE FACTORY', level: 'subtitle', position: [0.5, 0.64], color: '#ff8a8a' },

  // t04: Exam tip
  { turnId: 't04', offset: 1.0, kind: 'smarttext', text: 'EXAM TIP', level: 'title', position: [0.5, 0.25], color: '#ffd700' },
  { turnId: 't04', offset: 3.0, kind: 'bubble', text: '"evaluate the extent" → two columns', position: [0.5, 0.52], width: 420 },

  // t05: Good deal vs cage
  { turnId: 't05', offset: 3.0, kind: 'smarttext', text: 'GOOD DEAL: protected markets, free Navy', level: 'body', position: [0.5, 0.32] },
  { turnId: 't05', offset: 7.0, kind: 'smarttext', text: 'CAGE: higher prices, profits drain to London', level: 'body', position: [0.5, 0.48] },
  { turnId: 't05', offset: 11.0, kind: 'bubble', text: 'hold both', position: [0.5, 0.68], width: 300 },

  // t06: Price data vs the Navy
  { turnId: 't06', offset: 1.0, kind: 'smarttext', text: 'PRICE DATA vs THE NAVY', level: 'subtitle', position: [0.5, 0.4] },

  // t07: Common mistake
  { turnId: 't07', offset: 1.0, kind: 'smarttext', text: 'COMMON MISTAKE', level: 'title', position: [0.5, 0.25], color: '#ff8a8a' },
  { turnId: 't07', offset: 4.0, kind: 'bubble', text: 'not gold hunters — they sat on the pile', position: [0.5, 0.55], width: 420 },

  // t08: Box one check
  { turnId: 't08', offset: 2.0, kind: 'smarttext', text: 'BOX 1: wealth = the pile, pie = fixed', level: 'subtitle', position: [0.5, 0.3], color: '#7dd87d' },
  { turnId: 't08', offset: 5.0, kind: 'smarttext', text: 'colonies: the farm AND the customer', level: 'subtitle', position: [0.5, 0.5], color: '#7dd87d' },

  // t09: Prediction beat 1 — treasurer of England
  { turnId: 't09', offset: 1.0, kind: 'smarttext', text: 'YOUR TURN: TREASURER OF ENGLAND', level: 'title', position: [0.5, 0.25] },
  { turnId: 't09', offset: 5.0, kind: 'bubble', text: 'colonies buying French cloth and Dutch tools — what rule do you write?', position: [0.5, 0.55], width: 440 },

  // t10: [10s pause] thinking room
  { turnId: 't10', offset: 0.0, kind: 'bubble', text: 'say it out loud — the rule has a name', position: [0.5, 0.5], width: 420 },

  // t11: The Navigation Acts named
  { turnId: 't11', offset: 1.0, kind: 'smarttext', text: 'THE NAVIGATION ACTS', level: 'hero', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't11', offset: 5.0, kind: 'bubble', text: 'buy from England, sell to England, sail English', position: [0.5, 0.62], width: 440 },

  // t12: 1651 → 1660 → 1663
  { turnId: 't12', offset: 2.0, kind: 'smarttext', text: '1651 → 1660 → 1663', level: 'title', position: [0.5, 0.22], entrance: 'stamp' },
  { turnId: 't12', offset: 7.0, kind: 'smarttext', text: 'ENUMERATED LIST', level: 'hero', position: [0.5, 0.45], entrance: 'stamp' },
  { turnId: 't12', offset: 12.0, kind: 'bubble', text: 'tobacco leads it — England only', position: [0.5, 0.68], width: 380 },
  { turnId: 't12', offset: 17.0, kind: 'smarttext', text: 'STAPLE ACT 1663: buy via London first', level: 'subtitle', position: [0.5, 0.85] },

  // t13: The Virginia planter
  { turnId: 't13', offset: 1.0, kind: 'bubble', text: 'Virginia planter: no Dutch buyers, even at better prices', position: [0.5, 0.4], width: 440 },
  { turnId: 't13', offset: 5.0, kind: 'smarttext', text: 'FRENCH CLOTH TAKES THE LONG WAY', level: 'subtitle', position: [0.5, 0.62] },

  // t14: London's cut, naval stores, factory fence-off
  { turnId: 't14', offset: 1.0, kind: 'smarttext', text: 'LONDON TAKES ITS CUT AT EVERY STOP', level: 'title', position: [0.5, 0.22] },
  { turnId: 't14', offset: 7.0, kind: 'bubble', text: 'naval stores: tar, pitch, turpentine, masts', position: [0.5, 0.42], width: 420 },
  { turnId: 't14', offset: 13.0, kind: 'smarttext', text: 'FACTORY FENCE-OFF', level: 'title', position: [0.5, 0.6] },
  { turnId: 't14', offset: 17.0, kind: 'smarttext', text: 'WOOL 1699 · HAT 1732 · IRON 1750', level: 'subtitle', position: [0.5, 0.78] },

  // t15: Exam tip — the enumerated list
  { turnId: 't15', offset: 1.0, kind: 'smarttext', text: 'EXAM TIP', level: 'title', position: [0.5, 0.25], color: '#ffd700' },
  { turnId: 't15', offset: 4.0, kind: 'smarttext', text: 'tobacco · rice · naval stores →', level: 'body', position: [0.5, 0.45] },
  { turnId: 't15', offset: 8.0, kind: 'smarttext', text: 'ENUMERATED LIST: ENGLAND ONLY', level: 'title', position: [0.5, 0.62] },
  { turnId: 't15', offset: 11.0, kind: 'bubble', text: 'other column: what colonies were forbidden to make', position: [0.5, 0.82], width: 440 },

  // t16: The classic flip
  { turnId: 't16', offset: 1.0, kind: 'smarttext', text: 'THE CLASSIC FLIP', level: 'title', position: [0.5, 0.3] },
  { turnId: 't16', offset: 4.0, kind: 'smarttext', text: '1660: WHAT TO SELL + WHOSE SHIPS', level: 'subtitle', position: [0.5, 0.5] },
  { turnId: 't16', offset: 7.0, kind: 'smarttext', text: '1663: WHERE TO BUY FROM', level: 'subtitle', position: [0.5, 0.7] },

  // t17: The mnemonic
  { turnId: 't17', offset: 1.0, kind: 'smarttext', text: 'SELL + SAIL 1660 · BUY THROUGH LONDON 1663', level: 'subtitle', position: [0.5, 0.5] },

  // t18: Molasses Act 1733
  { turnId: 't18', offset: 1.0, kind: 'smarttext', text: 'MOLASSES ACT 1733', level: 'title', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't18', offset: 5.0, kind: 'bubble', text: 'New England rum → cheap French molasses', position: [0.5, 0.5], width: 420 },
  { turnId: 't18', offset: 8.0, kind: 'smarttext', text: 'LONDON: BUY BRITISH INSTEAD', level: 'subtitle', position: [0.5, 0.72] },

  // t19: The molasses flood detour
  { turnId: 't19', offset: 1.0, kind: 'bg-swap', bgImage: 'historic/u2e5/molasses-flood.jpg' },
  { turnId: 't19', offset: 2.0, kind: 'smarttext', text: '1919: THE MOLASSES FLOOD', level: 'title', position: [0.5, 0.22] },
  { turnId: 't19', offset: 6.0, kind: 'bubble', text: '35 mph wave · 21 dead · Boston North End', position: [0.5, 0.42], width: 420 },
  { turnId: 't19', offset: 10.0, kind: 'bubble', text: 'same city, same word', position: [0.5, 0.62], width: 300 },

  // t20: 1733 version — they simply didn't pay
  { turnId: 't20', offset: 1.0, kind: 'smarttext', text: '1733 VERSION: THEY SIMPLY DID NOT PAY', level: 'title', position: [0.5, 0.25] },
  { turnId: 't20', offset: 6.0, kind: 'bubble', text: 'bribed officials · forged papers · midnight landings', position: [0.5, 0.55], width: 460 },

  // t21: Triangular trade diagram
  { turnId: 't21', offset: 1.0, kind: 'bg-swap', bgImage: 'historic/u2e5/triangle-trade.jpg' },
  { turnId: 't21', offset: 2.0, kind: 'smarttext', text: 'ONE SHIP · THREE LEGS', level: 'title', position: [0.5, 0.22] },
  { turnId: 't21', offset: 5.0, kind: 'bubble', text: 'English goods → Africa · enslaved people → Caribbean · sugar → England', position: [0.5, 0.55], width: 460 },

  // t22: The arrows lied
  { turnId: 't22', offset: 1.0, kind: 'smarttext', text: 'THE ARROWS LIED', level: 'title', position: [0.5, 0.3], entrance: 'stamp' },
  { turnId: 't22', offset: 5.0, kind: 'bubble', text: 'plenty ran two legs, never closed the triangle', position: [0.5, 0.55], width: 440 },
  { turnId: 't22', offset: 9.0, kind: 'smarttext', text: 'THE TRIANGLE NAMES A PATTERN', level: 'subtitle', position: [0.5, 0.75] },

  // t23: The chain didn't (serious)
  { turnId: 't23', offset: 2.0, kind: 'smarttext', text: 'THE CHAIN DID NOT', level: 'title', position: [0.5, 0.3] },
  { turnId: 't23', offset: 6.0, kind: 'bubble', text: 'rum needs Caribbean sugar · sugar needs enslaved labor', position: [0.5, 0.55], width: 460 },
  { turnId: 't23', offset: 10.0, kind: 'smarttext', text: 'DEMAND KEPT CLIMBING', level: 'subtitle', position: [0.5, 0.75] },

  // t24: Board of Trade 1696
  { turnId: 't24', offset: 1.0, kind: 'bg-swap', bgImage: 'historic/u2e5/boston-harbor.jpg' },
  { turnId: 't24', offset: 2.0, kind: 'smarttext', text: '1696: BOARD OF TRADE', level: 'title', position: [0.5, 0.25] },
  { turnId: 't24', offset: 6.0, kind: 'bubble', text: 'vice-admiralty courts back the customs men', position: [0.5, 0.5], width: 440 },
  { turnId: 't24', offset: 9.0, kind: 'smarttext', text: 'JUDGES, NOT JURIES', level: 'subtitle', position: [0.5, 0.7], color: '#ff8a8a' },

  // t25: Exam tip — the missing jury
  { turnId: 't25', offset: 1.0, kind: 'smarttext', text: 'EXAM TIP', level: 'title', position: [0.5, 0.25], color: '#ffd700' },
  { turnId: 't25', offset: 4.0, kind: 'bubble', text: 'a Boston jury of merchants would never convict a smuggling neighbor', position: [0.5, 0.55], width: 460 },

  // t26: Box two check
  { turnId: 't26', offset: 1.0, kind: 'smarttext', text: 'NAVIGATION ACTS: 1651 · 1660 · 1663', level: 'title', position: [0.5, 0.25] },
  { turnId: 't26', offset: 5.0, kind: 'smarttext', text: 'enumerated → England only · Europe via London', level: 'subtitle', position: [0.5, 0.45] },
  { turnId: 't26', offset: 10.0, kind: 'smarttext', text: 'BOX 2: THE RULEBOOK', level: 'subtitle', position: [0.5, 0.65], color: '#7dd87d' },
  { turnId: 't26', offset: 15.0, kind: 'bubble', text: '...and the whole coast dodging. Who was watching?', position: [0.5, 0.85], width: 440 },

  // t27: Prediction beat 2 — Walpole 1721
  { turnId: 't27', offset: 1.0, kind: 'smarttext', text: 'YOUR TURN: 1721, TREASURY', level: 'title', position: [0.5, 0.25] },
  { turnId: 't27', offset: 4.0, kind: 'bubble', text: 'customs beg for staff · trade taxes filling the coffers', position: [0.5, 0.5], width: 460 },
  { turnId: 't27', offset: 8.0, kind: 'smarttext', text: 'WHAT DO YOU DO?', level: 'hero', position: [0.5, 0.7] },

  // t28: [10s pause] thinking room
  { turnId: 't28', offset: 0.0, kind: 'bubble', text: 'say it out loud — then listen', position: [0.5, 0.5], width: 380 },

  // t29: Look the other way
  { turnId: 't29', offset: 0.5, kind: 'smarttext', text: 'LOOK THE OTHER WAY', level: 'title', position: [0.5, 0.3] },
  { turnId: 't29', offset: 1.5, kind: 'smarttext', text: 'FOR THE NEXT TWENTY YEARS', level: 'subtitle', position: [0.5, 0.55] },

  // t30: Box three named
  { turnId: 't30', offset: 1.0, kind: 'smarttext', text: 'BOX 3: SALUTARY NEGLECT', level: 'hero', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't30', offset: 3.5, kind: 'bubble', text: '"let sleeping dogs lie" — the supposed Walpole line', position: [0.5, 0.55], width: 440 },

  // t31: Secondhand caveat
  { turnId: 't31', offset: 0.5, kind: 'smarttext', text: 'SUPPOSED LINE · SECONDHAND', level: 'subtitle', position: [0.5, 0.4], color: '#ff8a8a' },

  // t32: Laws on the books, nobody enforcing
  { turnId: 't32', offset: 2.0, kind: 'smarttext', text: 'LAWS ON THE BOOKS · NOBODY ENFORCING', level: 'title', position: [0.5, 0.25] },
  { turnId: 't32', offset: 7.0, kind: 'bubble', text: 'customs left understaffed · governors look away', position: [0.5, 0.5], width: 440 },
  { turnId: 't32', offset: 11.0, kind: 'smarttext', text: 'MERCHANTS GOT RICH IN THE GAPS', level: 'subtitle', position: [0.5, 0.7] },

  // t33: Hancock idiom
  { turnId: 't33', offset: 1.0, kind: 'bubble', text: '"Put your John Hancock here."', position: [0.5, 0.35], width: 400 },
  { turnId: 't33', offset: 3.0, kind: 'smarttext', text: 'HIS MONEY CAME FIRST', level: 'subtitle', position: [0.5, 0.6] },

  // t34: The Liberty seized 1768
  { turnId: 't34', offset: 1.0, kind: 'bg-swap', bgImage: 'historic/u2e5/hancock.jpg' },
  { turnId: 't34', offset: 2.0, kind: 'smarttext', text: '1768: THE LIBERTY SEIZED', level: 'title', position: [0.5, 0.22] },
  { turnId: 't34', offset: 6.0, kind: 'bubble', text: 'accused of smuggling — charges dropped for lack of evidence', position: [0.5, 0.45], width: 480 },
  { turnId: 't34', offset: 11.0, kind: 'smarttext', text: 'ACCUSED, NEVER CONVICTED', level: 'subtitle', position: [0.5, 0.65] },
  { turnId: 't34', offset: 15.0, kind: 'bubble', text: 'historians still argue', position: [0.5, 0.85], width: 300 },

  // t35: A smuggler, maybe
  { turnId: 't35', offset: 1.0, kind: 'bubble', text: "the empire's most famous signature belonged to a smuggler. Maybe.", position: [0.5, 0.45], width: 480 },

  // t36: Burke coins the name
  { turnId: 't36', offset: 1.0, kind: 'bg-swap', bgImage: 'historic/u2e5/burke.jpg' },
  { turnId: 't36', offset: 2.0, kind: 'smarttext', text: 'THE NAME ARRIVED LATE', level: 'title', position: [0.5, 0.22] },
  { turnId: 't36', offset: 6.0, kind: 'smarttext', text: 'EDMUND BURKE · 1775', level: 'hero', position: [0.5, 0.45], entrance: 'stamp' },
  { turnId: 't36', offset: 11.0, kind: 'bubble', text: 'coined "salutary neglect" looking back — trade up twelvefold since 1700', position: [0.5, 0.68], width: 480 },
  { turnId: 't36', offset: 17.0, kind: 'smarttext', text: 'SUBORDINATE BY DESIGN · RICH BY NEGLECT', level: 'subtitle', position: [0.5, 0.88] },

  // t37: Exam tip — salutary = beneficial
  { turnId: 't37', offset: 1.0, kind: 'smarttext', text: 'EXAM TIP', level: 'title', position: [0.5, 0.25], color: '#ffd700' },
  { turnId: 't37', offset: 4.0, kind: 'smarttext', text: 'SALUTARY = BENEFICIAL', level: 'hero', position: [0.5, 0.5] },
  { turnId: 't37', offset: 9.0, kind: 'bubble', text: 'the neglect trained a generation to govern themselves', position: [0.5, 0.72], width: 460 },

  // t38: The favorite trap
  { turnId: 't38', offset: 1.0, kind: 'smarttext', text: 'THE FAVORITE TRAP', level: 'title', position: [0.5, 0.3] },
  { turnId: 't38', offset: 3.0, kind: 'smarttext', text: 'HANCOCK WALKED · CHARGES DROPPED', level: 'subtitle', position: [0.5, 0.55], color: '#ff8a8a' },

  // t39: Box three check
  { turnId: 't39', offset: 1.0, kind: 'smarttext', text: 'BOX 3: LAWS ON BOOKS, OBEDIENCE OPTIONAL', level: 'subtitle', position: [0.5, 0.4], color: '#7dd87d' },
  { turnId: 't39', offset: 5.0, kind: 'bubble', text: 'the rules were real — the obedience optional', position: [0.5, 0.65], width: 440 },

  // t40: Three boxes recap
  { turnId: 't40', offset: 2.0, kind: 'bg-swap', bgImage: 'historic/u2e1/colonial-map.jpg' },
  { turnId: 't40', offset: 3.0, kind: 'smarttext', text: 'THREE BOXES, LAND THEM', level: 'title', position: [0.5, 0.2] },
  { turnId: 't40', offset: 8.0, kind: 'smarttext', text: '1 · MERCANTILISM: pile, fixed pie, farm + customer', level: 'body', position: [0.5, 0.4] },
  { turnId: 't40', offset: 13.0, kind: 'smarttext', text: '2 · NAVIGATION ACTS: 1651 · 1660 · 1663', level: 'body', position: [0.5, 0.57] },
  { turnId: 't40', offset: 18.0, kind: 'smarttext', text: '3 · SALUTARY NEGLECT: books vs enforcement', level: 'body', position: [0.5, 0.74] },

  // t41: Cargo vs factories
  { turnId: 't41', offset: 1.0, kind: 'smarttext', text: 'WOOL · HAT · IRON', level: 'title', position: [0.5, 0.3] },
  { turnId: 't41', offset: 4.0, kind: 'bubble', text: 'manufacturing acts — what colonies were fenced off from making', position: [0.5, 0.55], width: 440 },
  { turnId: 't41', offset: 8.0, kind: 'smarttext', text: 'ENUMERATED = THE CARGO: tobacco · rice · naval stores', level: 'subtitle', position: [0.5, 0.8] },

  // t42: Land the recap
  { turnId: 't42', offset: 2.0, kind: 'smarttext', text: 'CARGO SAILED TO ENGLAND · FACTORIES FENCED OFF', level: 'subtitle', position: [0.5, 0.25] },
  { turnId: 't42', offset: 6.0, kind: 'bg-swap', bgImage: 'historic/u2e5/triangle-trade.jpg' },
  { turnId: 't42', offset: 7.0, kind: 'smarttext', text: 'NEAT DIAGRAM, MESSIER REALITY', level: 'subtitle', position: [0.5, 0.78] },
  { turnId: 't42', offset: 12.0, kind: 'smarttext', text: 'ALL THREE BOXES LANDED', level: 'hero', position: [0.5, 0.4] },
  { turnId: 't42', offset: 18.0, kind: 'smarttext', text: 'MERCANTILISM · ACTS · NEGLECT', level: 'body', position: [0.5, 0.88] },

  // t43: Three questions, AP-shaped
  { turnId: 't43', offset: 1.0, kind: 'smarttext', text: 'THREE QUESTIONS · AP-SHAPED', level: 'title', position: [0.5, 0.3] },

  // t44: Q1 — Adam Smith primary source
  { turnId: 't44', offset: 1.0, kind: 'bg-swap', bgImage: 'historic/u2e5/smith.jpg' },
  { turnId: 't44', offset: 2.0, kind: 'primarysource',
    documentTitle: 'The Wealth of Nations',
    authorAndDate: 'Adam Smith, 1776',
    excerptText: 'Nothing, however, can be more absurd than this whole doctrine of the balance of trade.',
    highlightedPhrase: 'the whole doctrine of the balance of trade',
    hippType: 'Historical Context',
    hippExplanation: 'The economic case against the empire lands the same year as the political one: the demolition and the Declaration share a birthday.' },

  // t45: [15s pause] the year is the argument
  { turnId: 't45', offset: 0.0, kind: 'bubble', text: 'the year is the argument', position: [0.5, 0.5], width: 380 },

  // t46: A1 — attacking mercantilism
  { turnId: 't46', offset: 1.0, kind: 'smarttext', text: 'A: ATTACKING MERCANTILISM', level: 'title', position: [0.5, 0.3] },
  { turnId: 't46', offset: 5.0, kind: 'bubble', text: '"the balance of trade" = the beating heart of the theory', position: [0.5, 0.55], width: 440 },
  { turnId: 't46', offset: 10.0, kind: 'smarttext', text: 'DEMOLITION + DECLARATION: SAME BIRTHDAY', level: 'subtitle', position: [0.5, 0.78] },

  // t47: Q2 — Boston ledger 1740
  { turnId: 't47', offset: 1.0, kind: 'bg-swap', bgImage: 'historic/u2e5/boston-harbor.jpg' },
  { turnId: 't47', offset: 2.0, kind: 'smarttext', text: 'Q2: BOSTON LEDGER, 1740', level: 'title', position: [0.5, 0.25] },
  { turnId: 't47', offset: 6.0, kind: 'bubble', text: 'French molasses lands — duty unpaid', position: [0.5, 0.5], width: 420 },
  { turnId: 't47', offset: 9.0, kind: 'smarttext', text: 'WHAT DOES ONE ENTRY TELL AN AP READER?', level: 'subtitle', position: [0.5, 0.72] },

  // t48: [15s pause] read like a historian
  { turnId: 't48', offset: 0.0, kind: 'bubble', text: 'read the entry like a historian', position: [0.5, 0.5], width: 400 },

  // t49: A2 — strict on paper, porous on the water
  { turnId: 't49', offset: 1.0, kind: 'smarttext', text: 'A: STRICT ON PAPER, POROUS ON THE WATER', level: 'title', position: [0.5, 0.3] },
  { turnId: 't49', offset: 5.0, kind: 'bubble', text: 'neglect was the operating system', position: [0.5, 0.55], width: 400 },
  { turnId: 't49', offset: 9.0, kind: 'smarttext', text: 'ENFORCEMENT > STATUTES', level: 'subtitle', position: [0.5, 0.78] },

  // t50: Q3 — paradox or the point
  { turnId: 't50', offset: 1.0, kind: 'smarttext', text: 'Q3: PARADOX OR THE POINT?', level: 'title', position: [0.5, 0.3] },

  // t51: [20s pause] weigh both
  { turnId: 't51', offset: 0.0, kind: 'bubble', text: 'weigh both sides — the exam wants the weighing', position: [0.5, 0.5], width: 440 },

  // t52: The paradox is the point
  { turnId: 't52', offset: 1.0, kind: 'smarttext', text: 'THE PARADOX IS THE POINT', level: 'hero', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't52', offset: 5.0, kind: 'bubble', text: 'protected markets + guarded lanes made them rich — unenforced Acts let them keep it', position: [0.5, 0.5], width: 480 },
  { turnId: 't52', offset: 10.0, kind: 'smarttext', text: 'CAGE → PARTNERSHIP → CRACKDOWN = BETRAYAL', level: 'subtitle', position: [0.5, 0.72] },

  // t53: Fast bonus
  { turnId: 't53', offset: 1.0, kind: 'smarttext', text: 'FAST BONUS', level: 'title', position: [0.5, 0.3], color: '#ffd700' },
  { turnId: 't53', offset: 3.0, kind: 'bubble', text: 'who coined "salutary neglect" — and when?', position: [0.5, 0.6], width: 420 },

  // t54: [5s pause]
  { turnId: 't54', offset: 0.0, kind: 'bubble', text: 'say the name, say the year', position: [0.5, 0.5], width: 380 },

  // t55: Burke 1775
  { turnId: 't55', offset: 1.0, kind: 'smarttext', text: 'EDMUND BURKE · 1775', level: 'title', position: [0.5, 0.3] },
  { turnId: 't55', offset: 3.5, kind: 'smarttext', text: 'NAME ARRIVED DECADES AFTER THE POLICY', level: 'subtitle', position: [0.5, 0.55] },

  // t56: Long essay tip
  { turnId: 't56', offset: 1.0, kind: 'smarttext', text: 'LONG ESSAY', level: 'title', position: [0.5, 0.25] },
  { turnId: 't56', offset: 4.0, kind: 'bubble', text: 'protected markets vs the cage — weigh both or tell half the story', position: [0.5, 0.55], width: 460 },

  // t57: Check your boxes, tease next
  { turnId: 't57', offset: 1.0, kind: 'smarttext', text: 'CHECK YOUR THREE BOXES', level: 'title', position: [0.5, 0.3] },
  { turnId: 't57', offset: 4.0, kind: 'bubble', text: 'next: the Great Awakening · Whitefield · open field · crowds that wept', position: [0.5, 0.6], width: 440 },

  // t58: Closing — London wrote the rules
  { turnId: 't58', offset: 0.3, kind: 'smarttext', text: 'LONDON WROTE THE RULES —', level: 'subtitle', position: [0.5, 0.4] },

  // t59: ...and America thrived on the exceptions
  { turnId: 't59', offset: 0.3, kind: 'smarttext', text: 'AND AMERICA THRIVED ON THE EXCEPTIONS', level: 'hero', position: [0.5, 0.4] },
];

/* ------------------------------------------------------------------ */
/* Background selector                                                  */
/* ------------------------------------------------------------------ */
function getBackgroundForTurn(turnId: string | null, subBeatBg: string | null): string {
  if (subBeatBg) return subBeatBg;
  if (!turnId) return 'historic/u2e1/colonial-map.jpg';
  const n = parseInt(turnId.slice(1), 10);
  // Box 1: mercantilism — bullion
  if (n <= 8) return 'historic/u2e5/merc-pile.jpg';
  // Prediction beat 1: the treasury question
  if (n <= 10) return 'historic/u2e5/merchant-ship.jpg';
  // Box 2: Navigation Acts — colonial trade
  if (n <= 18) return 'historic/u2e5/tobacco-trade.jpg';
  // Molasses flood detour
  if (n <= 20) return 'historic/u2e5/molasses-flood.jpg';
  // Triangular trade diagram
  if (n <= 23) return 'historic/u2e5/triangle-trade.jpg';
  // Board of Trade, customs, Boston
  if (n <= 26) return 'historic/u2e5/boston-harbor.jpg';
  // Prediction beat 2: Walpole 1721
  if (n <= 28) return 'historic/u2e5/merchant-ship.jpg';
  // Box 3: salutary neglect — Walpole
  if (n <= 32) return 'historic/u2e5/walpole.jpg';
  // Hancock's Liberty
  if (n <= 35) return 'historic/u2e5/hancock.jpg';
  // Burke names it
  if (n <= 37) return 'historic/u2e5/burke.jpg';
  // Neglect recap
  if (n <= 39) return 'historic/u2e5/walpole.jpg';
  // Three-box recap + self-test opener
  if (n <= 43) return 'historic/u2e1/colonial-map.jpg';
  // Q1: Adam Smith
  if (n <= 46) return 'historic/u2e5/smith.jpg';
  // Q2: Boston ledger
  if (n <= 49) return 'historic/u2e5/boston-harbor.jpg';
  // Q3 + closing
  return 'historic/u2e1/colonial-map.jpg';
}

/* ------------------------------------------------------------------ */
/* Main episode                                                         */
/* ------------------------------------------------------------------ */
export const U2E5Episode: React.FC = () => {
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

  // Tone: playful throughout, serious for the slavery/chain section (t22-t23)
  const isSeriousSection = activeTurn && (activeTurn.id === 't22' || activeTurn.id === 't23');

  const showHead = activeTurn &&
    (activeTurn.speaker === 'maya' || activeTurn.speaker === 'marcus') &&
    !(activeTurn.id === 't00' && turnElapsed < 3);

  // Marcus has no toon asset yet — using maya-toon as the stylized placeholder,
  // same pattern as the U2E1 Jay placeholder.
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
    if (speaker === 'marcus') return '#2c5aa0';
    return '#2c8a5a';
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
            <TitleCard kicker="UNIT 2 · EPISODE 5:"
              title="THE EMPIRE'S MONEY THEORY"
              subline="MERCANTILISM · THE NAVIGATION ACTS · SALUTARY NEGLECT"
              at={activeStartFrame} />
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
                mapImage={beat.mapImage || 'historic/u2e1/colonial-map.jpg'}
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
