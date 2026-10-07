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
import { SmartText } from './SmartText';
import { PrimarySourceSpotlight } from './PrimarySourceSpotlight';
import { ToneProvider } from '../validation/ToneContext';
import { AutoLayoutProvider } from '../validation/AutoLayout';

import turnsData from '../data/u2e4/turns.json';
import timingData from '../data/u2e4/timing_map.json';

interface Turn {
  id: string;
  speaker: string;
  text: string;
  pause_after?: number;
}

const turns = turnsData as Turn[];
const starts = (timingData as { starts: number[] }).starts;
const durations = (timingData as { durations: number[] }).durations;

const EP = 'u2e4';

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
  items?: any[];
  caption?: string;
  variant?: 'overview' | 'detail' | 'dark';
  documentTitle?: string;
  authorAndDate?: string;
  excerptText?: string;
  highlightedPhrase?: string;
  hippType?: 'Historical Context' | 'Intended Audience' | 'Purpose' | 'Point of View';
  hippExplanation?: string;
  leaderName?: string;
  leaderAsset?: string;
  versusLeft?: string;
  versusRight?: string;
}

const SUB_BEATS: SubBeat[] = [
  // t00: Opening — three boxes
  { turnId: 't00', offset: 3.5, kind: 'smarttext', text: 'THREE BOXES', level: 'hero', position: [0.5, 0.2] },
  { turnId: 't00', offset: 12.0, kind: 'smarttext', text: 'THE HOLY EXPERIMENT', level: 'subtitle', position: [0.5, 0.42] },
  { turnId: 't00', offset: 18.0, kind: 'smarttext', text: 'THE PENNSYLVANIA DUTCH', level: 'subtitle', position: [0.5, 0.55] },
  { turnId: 't00', offset: 24.0, kind: 'smarttext', text: 'THE LIMITS OF TOLERANCE', level: 'subtitle', position: [0.5, 0.68] },
  { turnId: 't00', offset: 31.0, kind: 'bubble', text: 'Circle the ones you couldn\'t explain right now', position: [0.5, 0.82], width: 400 },

  // t01: William Penn intro
  { turnId: 't01', offset: 2.0, kind: 'bg-swap', bgImage: 'historic/u2e4/penn-portrait.jpg' },
  { turnId: 't01', offset: 3.0, kind: 'smarttext', text: 'WILLIAM PENN', level: 'hero', position: [0.5, 0.18] },
  { turnId: 't01', offset: 8.0, kind: 'bubble', text: 'the admiral\'s son — jailed in the Tower for his faith', position: [0.5, 0.72], width: 420 },
  { turnId: 't01', offset: 12.0, kind: 'smarttext', text: '1681: 25,000 SQUARE MILES', level: 'title', position: [0.5, 0.55] },

  // t02: a colony for a debt
  { turnId: 't02', offset: 1.0, kind: 'smarttext', text: 'A COLONY FOR A DEBT', level: 'subtitle', position: [0.5, 0.3] },

  // t03: Holy Experiment
  { turnId: 't03', offset: 2.0, kind: 'smarttext', text: 'THE HOLY EXPERIMENT', level: 'hero', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't03', offset: 9.0, kind: 'bubble', text: 'Quaker peace and equality — nobody jailed for their religion', position: [0.5, 0.55], width: 420 },

  // t04: Quaker manners
  { turnId: 't04', offset: 1.0, kind: 'bubble', text: 'no bows, no hat-doffs, no oaths', position: [0.5, 0.35], width: 360 },

  // t05: radical manners + Frame of Government
  { turnId: 't05', offset: 2.0, kind: 'bg-swap', bgImage: 'historic/u2e4/quaker-meeting.jpg' },
  { turnId: 't05', offset: 3.0, kind: 'smarttext', text: 'NO BOWS. NO OATHS.', level: 'title', position: [0.5, 0.18] },
  { turnId: 't05', offset: 10.0, kind: 'smarttext', text: 'FRAME OF GOVERNMENT 1682', level: 'title', position: [0.5, 0.62] },
  { turnId: 't05', offset: 13.0, kind: 'bubble', text: 'elected assembly · trial by jury · liberty of conscience', position: [0.5, 0.8], width: 460 },

  // t06: one God fine print
  { turnId: 't06', offset: 0.8, kind: 'smarttext', text: 'ONE GOD GETS YOU IN', level: 'subtitle', position: [0.5, 0.3] },

  // t07: liberty = business plan
  { turnId: 't07', offset: 2.0, kind: 'smarttext', text: 'LIBERTY = BUSINESS PLAN', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't07', offset: 7.0, kind: 'bubble', text: 'Empty land pays nothing — Penn needed tens of thousands of buyers', position: [0.5, 0.55], width: 440 },

  // t08: the sales pitch
  { turnId: 't08', offset: 0.8, kind: 'smarttext', text: 'THE SALES PITCH', level: 'subtitle', position: [0.5, 0.3] },

  // t09: 1681 pamphlet
  { turnId: 't09', offset: 2.0, kind: 'smarttext', text: '1681: THE PAMPHLET', level: 'title', position: [0.5, 0.18] },
  { turnId: 't09', offset: 6.0, kind: 'bubble', text: 'advertised across Europe — in German as well as English', position: [0.5, 0.45], width: 420 },
  { turnId: 't09', offset: 11.0, kind: 'smarttext', text: 'ONE OF THE FASTEST-GROWING COLONIES', level: 'subtitle', position: [0.5, 0.7] },

  // t10: founded by advertising
  { turnId: 't10', offset: 1.0, kind: 'smarttext', text: 'A COLONY FOUNDED BY ADVERTISING', level: 'subtitle', position: [0.5, 0.18] },
  { turnId: 't10', offset: 4.0, kind: 'bubble', text: 'I once drove 40 minutes to a garage sale. Same energy.', position: [0.5, 0.5], width: 420 },

  // t11: the four middle colonies
  { turnId: 't11', offset: 2.0, kind: 'bg-swap', bgImage: 'historic/u2e4/middle-colonies-map.jpg' },
  { turnId: 't11', offset: 3.0, kind: 'smarttext', text: 'THE MIDDLE COLONIES: FOUR', level: 'title', position: [0.5, 0.16] },
  { turnId: 't11', offset: 7.0, kind: 'smarttext', text: 'NEW YORK · NEW JERSEY', level: 'subtitle', position: [0.5, 0.45] },
  { turnId: 't11', offset: 12.0, kind: 'smarttext', text: 'PENNSYLVANIA · DELAWARE', level: 'subtitle', position: [0.5, 0.56] },
  { turnId: 't11', offset: 17.0, kind: 'bubble', text: '1664: New Amsterdam → New York', position: [0.5, 0.72], width: 380 },
  { turnId: 't11', offset: 21.0, kind: 'bubble', text: 'Delaware: own assembly in 1704', position: [0.5, 0.72], width: 340 },

  // t12: Shackamaxon
  { turnId: 't12', offset: 2.0, kind: 'bg-swap', bgImage: 'historic/u2e4/penn-treaty.jpg' },
  { turnId: 't12', offset: 4.0, kind: 'smarttext', text: 'SHACKAMAXON', level: 'hero', position: [0.5, 0.18], entrance: 'stamp' },
  { turnId: 't12', offset: 9.0, kind: 'bubble', text: 'the paintings came 90 years later — tradition, not proof', position: [0.5, 0.6], width: 420 },

  // t13: Lenni Lenape
  { turnId: 't13', offset: 1.0, kind: 'smarttext', text: 'LENNI LENAPE', level: 'hero', position: [0.5, 0.2] },
  { turnId: 't13', offset: 2.5, kind: 'bubble', text: 'the name means something like "original people"', position: [0.5, 0.5], width: 360 },

  // t14: exam tip — dates
  { turnId: 't14', offset: 2.0, kind: 'smarttext', text: 'EXAM TIP: WATCH THE DATES', level: 'title', position: [0.5, 0.18] },
  { turnId: 't14', offset: 6.0, kind: 'smarttext', text: '1681 CHARTER', level: 'subtitle', position: [0.5, 0.45] },
  { turnId: 't14', offset: 9.0, kind: 'smarttext', text: '1682 FRAME · 1682 PHILADELPHIA', level: 'subtitle', position: [0.5, 0.56] },
  { turnId: 't14', offset: 11.0, kind: 'bg-swap', bgImage: 'historic/u2e4/philadelphia-1683.jpg' },

  // t15: not charity
  { turnId: 't15', offset: 2.0, kind: 'smarttext', text: 'NOT CHARITY — BUSINESS', level: 'title', position: [0.5, 0.2], color: '#ff8a8a' },
  { turnId: 't15', offset: 7.0, kind: 'bubble', text: 'a debt settlement and a land business — liberty was the pitch', position: [0.5, 0.55], width: 440 },

  // t16: box one checked
  { turnId: 't16', offset: 2.0, kind: 'smarttext', text: '✅ BOX 1: HOLY EXPERIMENT', level: 'subtitle', position: [0.5, 0.8], color: '#7dd87d' },

  // t17: prediction beat 1
  { turnId: 't17', offset: 1.0, kind: 'smarttext', text: 'PREDICT:', level: 'title', position: [0.5, 0.25] },
  { turnId: 't17', offset: 3.0, kind: 'bubble', text: 'Who can afford the crossing — and what does that decide?', position: [0.5, 0.5], width: 420 },

  // t18: think pause
  { turnId: 't18', offset: 2.0, kind: 'smarttext', text: '⏳ THINK IT THROUGH', level: 'subtitle', position: [0.5, 0.5] },

  // t19: the rich come free
  { turnId: 't19', offset: 1.0, kind: 'smarttext', text: 'THE RICH COME FREE', level: 'subtitle', position: [0.5, 0.3] },

  // t20: Pennsylvania Dutch — Deutsch not Dutch
  { turnId: 't20', offset: 2.0, kind: 'smarttext', text: 'PENNSYLVANIA DUTCH', level: 'hero', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't20', offset: 4.0, kind: 'smarttext', text: 'DEUTSCH, NOT DUTCH', level: 'title', position: [0.5, 0.55] },

  // t21: Palatines
  { turnId: 't21', offset: 2.0, kind: 'smarttext', text: 'PALATINES FROM THE RHINELAND', level: 'subtitle', position: [0.5, 0.18] },
  { turnId: 't21', offset: 6.0, kind: 'smarttext', text: '⅓ OF PENNSYLVANIA: GERMAN', level: 'subtitle', position: [0.5, 0.5] },
  { turnId: 't21', offset: 8.5, kind: 'smarttext', text: '½ ARRIVED AS REDEMPTIONERS', level: 'subtitle', position: [0.5, 0.62] },

  // t22: redemptioners
  { turnId: 't22', offset: 0.7, kind: 'smarttext', text: 'REDEMPTIONERS', level: 'hero', position: [0.5, 0.25], entrance: 'stamp' },

  // t23: the mechanism
  { turnId: 't23', offset: 2.0, kind: 'smarttext', text: 'THE MECHANISM', level: 'title', position: [0.5, 0.16] },
  { turnId: 't23', offset: 5.0, kind: 'bubble', text: 'a captain carries you across — you promise to pay on landing', position: [0.5, 0.42], width: 440 },
  { turnId: 't23', offset: 10.0, kind: 'smarttext', text: 'DOCK DEAL ≠ EUROPE DEAL', level: 'subtitle', position: [0.5, 0.65] },
  { turnId: 't23', offset: 14.0, kind: 'bubble', text: 'sick and broke, with the ship behind them — worse deal', position: [0.5, 0.82], width: 440 },

  // t24: Franklin 1751 primary source
  { turnId: 't24', offset: 2.0, kind: 'primarysource',
    documentTitle: 'Observations Concerning the Increase of Mankind',
    authorAndDate: 'Benjamin Franklin, 1751',
    excerptText: 'Why should Pennsylvania, founded by the English, become a Colony of Aliens, who will shortly be so numerous as to Germanize us instead of our Anglifying them?',
    highlightedPhrase: 'Germanize us instead of our Anglifying them',
    hippType: 'Point of View',
    hippExplanation: 'Written by a worried Pennsylvanian, not a neutral observer — and his fear of the numbers proves the scale: Germans were roughly a third of the colony.' },

  // t25: buggy joke
  { turnId: 't25', offset: 1.5, kind: 'bubble', text: 'saw a buggy once and thought I\'d time-traveled', position: [0.5, 0.35], width: 400 },

  // t26: Saur press + Scots-Irish
  { turnId: 't26', offset: 2.0, kind: 'bg-swap', bgImage: 'historic/u2e4/printing-press.jpg' },
  { turnId: 't26', offset: 3.0, kind: 'smarttext', text: '1739: GERMAN PRESS', level: 'title', position: [0.5, 0.16] },
  { turnId: 't26', offset: 8.0, kind: 'bubble', text: 'Christopher Saur\'s German-language paper out of Germantown', position: [0.5, 0.45], width: 440 },
  { turnId: 't26', offset: 14.0, kind: 'smarttext', text: 'SCOTS-IRISH → THE FRONTIER', level: 'title', position: [0.5, 0.62] },
  { turnId: 't26', offset: 20.0, kind: 'smarttext', text: '6,000 IN ONE YEAR · ¼ OF THE COLONY', level: 'subtitle', position: [0.5, 0.78] },
  { turnId: 't26', offset: 28.0, kind: 'smarttext', text: 'THE FRONTIER NEEDED BODIES', level: 'subtitle', position: [0.5, 0.35] },

  // t27: pacifists putting fighters on the border?
  { turnId: 't27', offset: 1.0, kind: 'bubble', text: 'Pacifists putting fighters on the border?', position: [0.5, 0.35], width: 400 },

  // t28: Logan encouraged it
  { turnId: 't28', offset: 2.0, kind: 'smarttext', text: 'DUTCH · SWEDES · WELSH QUAKERS', level: 'subtitle', position: [0.5, 0.25] },
  { turnId: 't28', offset: 5.0, kind: 'bubble', text: 'the frontier needed bodies — the Scots-Irish knew how to fight', position: [0.5, 0.55], width: 440 },

  // t29: what did they grow?
  { turnId: 't29', offset: 0.6, kind: 'bubble', text: 'So what did all these people grow?', position: [0.5, 0.35], width: 340 },

  // t30: the breadbasket
  { turnId: 't30', offset: 2.0, kind: 'bg-swap', bgImage: 'historic/u2e4/harvest-wagon.jpg' },
  { turnId: 't30', offset: 3.0, kind: 'smarttext', text: 'THE BREADBASKET', level: 'hero', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't30', offset: 8.0, kind: 'smarttext', text: 'WHEAT + CORN, NOT TOBACCO', level: 'title', position: [0.5, 0.55] },
  { turnId: 't30', offset: 13.0, kind: 'smarttext', text: 'SMALL FARMS, FAMILY LABOR', level: 'subtitle', position: [0.5, 0.72] },
  { turnId: 't30', offset: 18.0, kind: 'bubble', text: '\'the best poor man\'s country\'', position: [0.5, 0.38], width: 380 },

  // t31: if you survived the crossing
  { turnId: 't31', offset: 1.0, kind: 'bubble', text: '— if you survived the crossing', position: [0.5, 0.4], width: 320 },

  // t32: exam tip — Dutch/Deutsch
  { turnId: 't32', offset: 2.0, kind: 'smarttext', text: 'EXAM TIP: DUTCH ≠ DEUTSCH', level: 'title', position: [0.5, 0.2] },
  { turnId: 't32', offset: 6.0, kind: 'bubble', text: 'the exam will hand you "Dutch" and wait', position: [0.5, 0.5], width: 400 },

  // t33: common mistake — redemptioners vs indentured
  { turnId: 't33', offset: 2.0, kind: 'smarttext', text: 'REDEMPTIONERS ≠ INDENTURED', level: 'title', position: [0.5, 0.2] },
  { turnId: 't33', offset: 6.0, kind: 'bubble', text: 'Europe negotiation vs. dock negotiation — the exam knows', position: [0.5, 0.55], width: 440 },

  // t34: box two checked
  { turnId: 't34', offset: 2.0, kind: 'smarttext', text: '✅ BOX 2: PENNSYLVANIA DUTCH', level: 'subtitle', position: [0.5, 0.8], color: '#7dd87d' },
  { turnId: 't34', offset: 5.0, kind: 'smarttext', text: '⅓ OF THE COLONY · WHEAT, NOT TOBACCO', level: 'subtitle', position: [0.5, 0.62] },

  // t35: prediction beat 2 — the unsigned deed
  { turnId: 't35', offset: 2.0, kind: 'smarttext', text: 'THE UNSIGNED DEED', level: 'title', position: [0.5, 0.2] },
  { turnId: 't35', offset: 8.0, kind: 'bubble', text: 'as much land as a man can walk in a day and a half', position: [0.5, 0.5], width: 440 },
  { turnId: 't35', offset: 14.0, kind: 'bubble', text: 'the Lenape expect 40 miles — the colony is hungry for land', position: [0.5, 0.7], width: 420 },

  // t36: think pause
  { turnId: 't36', offset: 2.0, kind: 'smarttext', text: '⏳ THINK IT THROUGH', level: 'subtitle', position: [0.5, 0.5] },

  // t37: they ran it
  { turnId: 't37', offset: 0.5, kind: 'smarttext', text: 'THEY RAN IT.', level: 'hero', position: [0.5, 0.3], color: '#ff8a8a' },

  // t38: the Walking Purchase
  { turnId: 't38', offset: 2.0, kind: 'bg-swap', bgImage: 'historic/u2e4/walking-purchase-map.png' },
  { turnId: 't38', offset: 3.0, kind: 'smarttext', text: 'THE WALKING PURCHASE 1737', level: 'title', position: [0.5, 0.16], entrance: 'stamp' },
  { turnId: 't38', offset: 8.0, kind: 'smarttext', text: '60-ODD MILES · ~1 MILLION ACRES', level: 'subtitle', position: [0.5, 0.5] },
  { turnId: 't38', offset: 13.0, kind: 'smarttext', text: '≈ THE SIZE OF RHODE ISLAND', level: 'subtitle', position: [0.5, 0.62] },
  { turnId: 't38', offset: 17.0, kind: 'bubble', text: 'the Lenape were pushed west', position: [0.5, 0.78], width: 340 },

  // t39: the peace died with Penn
  { turnId: 't39', offset: 1.5, kind: 'smarttext', text: 'THE PEACE DIED WITH PENN', level: 'subtitle', position: [0.5, 0.3] },

  // t40: the harder correction
  { turnId: 't40', offset: 2.0, kind: 'smarttext', text: 'THE HARDER CORRECTION', level: 'title', position: [0.5, 0.2] },
  { turnId: 't40', offset: 4.0, kind: 'bubble', text: 'the Quakers weren\'t the anti-slavery people — not yet', position: [0.5, 0.5], width: 420 },

  // t41: wait, the whole brand?
  { turnId: 't41', offset: 1.0, kind: 'bubble', text: 'Wait — I thought that was the whole brand', position: [0.5, 0.35], width: 380 },

  // t42: Penn held enslaved people + 1688 protest
  { turnId: 't42', offset: 2.0, kind: 'smarttext', text: 'PENN HELD ENSLAVED PEOPLE', level: 'title', position: [0.5, 0.16], color: '#ff8a8a' },
  { turnId: 't42', offset: 7.0, kind: 'primarysource',
    documentTitle: 'The Germantown Protest Against Slavery',
    authorAndDate: 'Four German Quakers, Germantown, 1688',
    excerptText: 'The first protest against slavery in the English colonies, signed by four German Quakers and sent up through the Quaker meetings.',
    highlightedPhrase: 'first protest against slavery',
    hippType: 'Historical Context',
    hippExplanation: 'The Yearly Meeting declined to take a stand, and the paper sat in the archives for a century and a half.' },

  // t43: filed away
  { turnId: 't43', offset: 1.2, kind: 'bubble', text: 'the first anti-slavery protest in English America', position: [0.5, 0.3], width: 400 },

  // t44: slavery ran through the whole region
  { turnId: 't44', offset: 2.0, kind: 'smarttext', text: 'SLAVERY RAN THROUGH THE WHOLE REGION', level: 'subtitle', position: [0.5, 0.2] },
  { turnId: 't44', offset: 7.0, kind: 'bubble', text: 'in New York, central to the economy — even under the Dutch', position: [0.5, 0.5], width: 440 },
  { turnId: 't44', offset: 11.0, kind: 'smarttext', text: '6,000 ENSLAVED IN PENNSYLVANIA', level: 'subtitle', position: [0.5, 0.7] },

  // t45: tolerant or just crowded?
  { turnId: 't45', offset: 0.8, kind: 'smarttext', text: 'TOLERANT — OR JUST CROWDED?', level: 'subtitle', position: [0.5, 0.3] },

  // t46: pluralist ≠ tolerant
  { turnId: 't46', offset: 2.0, kind: 'smarttext', text: 'PLURALIST ≠ TOLERANT', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't46', offset: 7.0, kind: 'bubble', text: 'lots of groups side by side — each one suspicious of the others', position: [0.5, 0.55], width: 440 },

  // t47: the middle column
  { turnId: 't47', offset: 2.0, kind: 'smarttext', text: 'THE MIDDLE COLUMN', level: 'title', position: [0.5, 0.2] },
  { turnId: 't47', offset: 4.5, kind: 'smarttext', text: 'NEW ENGLAND · MIDDLE · CHESAPEAKE', level: 'subtitle', position: [0.5, 0.5] },

  // t48: exam tip box three
  { turnId: 't48', offset: 2.0, kind: 'smarttext', text: 'EXAM TIP: READ HIS FEAR', level: 'title', position: [0.5, 0.2] },
  { turnId: 't48', offset: 6.0, kind: 'bubble', text: '\'Germanize us\' = anxiety over NUMBERS, not language', position: [0.5, 0.55], width: 420 },

  // t49: box-three trap
  { turnId: 't49', offset: 2.0, kind: 'smarttext', text: 'THE BOX-THREE TRAP', level: 'title', position: [0.5, 0.2] },
  { turnId: 't49', offset: 5.0, kind: 'bubble', text: 'don\'t write that Pennsylvania had no slavery', position: [0.5, 0.55], width: 400 },

  // t50: box three checked
  { turnId: 't50', offset: 2.0, kind: 'smarttext', text: '✅ BOX 3: LIMITS OF TOLERANCE', level: 'subtitle', position: [0.5, 0.8], color: '#7dd87d' },
  { turnId: 't50', offset: 6.0, kind: 'smarttext', text: '1737 · 1688 · PLURALIST, NOT TOLERANT', level: 'subtitle', position: [0.5, 0.62] },
  { turnId: 't50', offset: 11.0, kind: 'bubble', text: 'the Walk, the enslaved, the protest that went nowhere', position: [0.5, 0.4], width: 420 },

  // t51: three-box recap
  { turnId: 't51', offset: 2.0, kind: 'bg-swap', bgImage: 'historic/u2e4/middle-colonies-map.jpg' },
  { turnId: 't51', offset: 3.0, kind: 'smarttext', text: 'THREE BOXES — LAND THEM', level: 'title', position: [0.5, 0.14] },
  { turnId: 't51', offset: 8.0, kind: 'smarttext', text: '1. HOLY EXPERIMENT: 1681 · 1682', level: 'subtitle', position: [0.5, 0.42] },
  { turnId: 't51', offset: 14.0, kind: 'smarttext', text: '2. PA DUTCH: DEUTSCH · ⅓ OF THE COLONY', level: 'subtitle', position: [0.5, 0.55] },
  { turnId: 't51', offset: 20.0, kind: 'smarttext', text: '3. LIMITS: 1718 · 1737 · PLURALIST', level: 'subtitle', position: [0.5, 0.68] },
  { turnId: 't51', offset: 28.0, kind: 'bubble', text: 'Nineteen years between the peace and the Walk', position: [0.5, 0.82], width: 400 },
  { turnId: 't51', offset: 34.0, kind: 'smarttext', text: 'ALL THREE LANDED', level: 'subtitle', position: [0.5, 0.3] },

  // t52: 1718 → 1737
  { turnId: 't52', offset: 1.0, kind: 'smarttext', text: '1718 → 1737', level: 'title', position: [0.5, 0.3] },

  // t53: all three landed
  { turnId: 't53', offset: 1.0, kind: 'smarttext', text: '✅ ALL THREE LANDED', level: 'subtitle', position: [0.5, 0.5], color: '#7dd87d' },

  // t54: three questions
  { turnId: 't54', offset: 1.0, kind: 'smarttext', text: 'THREE QUESTIONS, AP-SHAPED', level: 'title', position: [0.5, 0.25] },

  // t55: Q1 — Franklin 1751
  { turnId: 't55', offset: 2.0, kind: 'smarttext', text: 'Q1: THE 1751 ESSAY', level: 'title', position: [0.5, 0.18] },
  { turnId: 't55', offset: 5.0, kind: 'bubble', text: '\'Germanize us instead of our Anglifying them\'', position: [0.5, 0.5], width: 440 },

  // t56: think pause
  { turnId: 't56', offset: 2.0, kind: 'smarttext', text: '⏳ ANSWER IT YOURSELF', level: 'subtitle', position: [0.5, 0.5] },

  // t57: A1
  { turnId: 't57', offset: 2.0, kind: 'smarttext', text: 'A1: THE NUMBERS SCARED HIM', level: 'title', position: [0.5, 0.2] },
  { turnId: 't57', offset: 8.0, kind: 'bubble', text: 'fear of the numbers proves the scale — a third of the colony', position: [0.5, 0.55], width: 440 },
  { turnId: 't57', offset: 13.0, kind: 'smarttext', text: 'FEAR = EVIDENCE OF SCALE', level: 'subtitle', position: [0.5, 0.72] },

  // t58: Q2 — point or pitch?
  { turnId: 't58', offset: 2.0, kind: 'smarttext', text: 'Q2: POINT OR PITCH?', level: 'title', position: [0.5, 0.2] },

  // t59: think pause
  { turnId: 't59', offset: 2.0, kind: 'smarttext', text: '⏳ ANSWER IT YOURSELF', level: 'subtitle', position: [0.5, 0.5] },

  // t60: A2
  { turnId: 't60', offset: 2.0, kind: 'smarttext', text: 'A2: THE PITCH PAID FOR THE POINT', level: 'subtitle', position: [0.5, 0.25] },
  { turnId: 't60', offset: 7.0, kind: 'bubble', text: 'pamphlet in German → land sold → fastest-growing colony', position: [0.5, 0.55], width: 440 },

  // t61: Q3 — pluralist or tolerant?
  { turnId: 't61', offset: 2.0, kind: 'smarttext', text: 'Q3: PLURALIST OR TOLERANT?', level: 'title', position: [0.5, 0.2] },

  // t62: think pause
  { turnId: 't62', offset: 2.0, kind: 'smarttext', text: '⏳ ANSWER IT YOURSELF', level: 'subtitle', position: [0.5, 0.5] },

  // t63: A3
  { turnId: 't63', offset: 2.0, kind: 'smarttext', text: 'MANY PEOPLES, ONE HIERARCHY', level: 'subtitle', position: [0.5, 0.18] },
  { turnId: 't63', offset: 7.0, kind: 'bubble', text: 'pick your evidence: the Walk, the 1688 protest, Penn\'s enslaved people', position: [0.5, 0.5], width: 460 },
  { turnId: 't63', offset: 13.0, kind: 'smarttext', text: 'PRESENT ≠ EQUAL', level: 'title', position: [0.5, 0.72] },

  // t64: fast bonus
  { turnId: 't64', offset: 1.0, kind: 'smarttext', text: '⚡ FAST BONUS', level: 'title', position: [0.5, 0.2], color: '#ffd700' },

  // t65: think pause
  { turnId: 't65', offset: 1.0, kind: 'smarttext', text: '⏳ ONE PHRASE', level: 'subtitle', position: [0.5, 0.5] },

  // t66: bonus answer
  { turnId: 't66', offset: 2.0, kind: 'bubble', text: 'a debt repayment — paper promises don\'t sell themselves', position: [0.5, 0.35], width: 440 },

  // t67: LEQ tie-in
  { turnId: 't67', offset: 2.0, kind: 'smarttext', text: 'LEQ: COMPARISON PARAGRAPH', level: 'title', position: [0.5, 0.16] },
  { turnId: 't67', offset: 7.0, kind: 'smarttext', text: 'NEW ENGLAND\'S COVENANT', level: 'subtitle', position: [0.5, 0.42] },
  { turnId: 't67', offset: 9.0, kind: 'smarttext', text: 'PENNSYLVANIA\'S MARKETPLACE', level: 'subtitle', position: [0.5, 0.55] },
  { turnId: 't67', offset: 11.0, kind: 'smarttext', text: 'CHESAPEAKE\'S SLAVE CODES', level: 'subtitle', position: [0.5, 0.68] },

  // t68: next time — mercantilism
  { turnId: 't68', offset: 2.0, kind: 'smarttext', text: 'NEXT: MERCANTILISM', level: 'title', position: [0.5, 0.2] },
  { turnId: 't68', offset: 5.0, kind: 'smarttext', text: 'NAVIGATION ACTS + THE COLONIAL DODGE', level: 'subtitle', position: [0.5, 0.5] },

  // t69: the tagline, part one
  { turnId: 't69', offset: 0.8, kind: 'smarttext', text: 'A COLONY COULD HOLD EVERY FAITH', level: 'subtitle', position: [0.5, 0.3] },

  // t70: the tagline, part two
  { turnId: 't70', offset: 0.6, kind: 'smarttext', text: '— AND STILL NOT HOLD THEM EQUALLY', level: 'subtitle', position: [0.5, 0.55] },
];

/* ------------------------------------------------------------------ */
/* Background selector                                                  */
/* ------------------------------------------------------------------ */
function getBackgroundForTurn(turnId: string | null, subBeatBg: string | null): string {
  if (subBeatBg) return subBeatBg;
  if (!turnId) return 'historic/u2e4/middle-colonies-map.jpg';
  const n = parseInt(turnId.slice(1), 10);
  // Box 1: the Holy Experiment
  if (n <= 18) return 'historic/u2e4/quaker-meeting.jpg';
  // Box 2: the Pennsylvania Dutch / breadbasket
  if (n <= 36) return 'historic/u2e4/harvest-wagon.jpg';
  // Box 3: the limits of tolerance
  if (n <= 50) return 'historic/u2e4/walking-purchase-map.png';
  // Recap + questions
  return 'historic/u2e4/middle-colonies-map.jpg';
}

/* ------------------------------------------------------------------ */
/* Main episode                                                         */
/* ------------------------------------------------------------------ */
export const U2E4Episode: React.FC = () => {
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

  // Tone: playful throughout, serious for box 3 (Walking Purchase, slavery, limits of tolerance)
  const turnNum = activeTurn ? parseInt(activeTurn.id.slice(1), 10) : -1;
  const isSeriousSection = turnNum >= 37 && turnNum <= 50;

  const showHead = activeTurn &&
    (activeTurn.speaker === 'maya' || activeTurn.speaker === 'marcus') &&
    !(activeTurn.id === 't00' && turnElapsed < 3);

  // TODO: marcus-toon.webp doesn't exist — using maya-toon.webp as placeholder
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
            <TitleCard kicker="UNIT 2 · EPISODE 4:"
              title="MIDDLE COLONIES & DIVERSITY" subline="HOLY EXPERIMENT · PA DUTCH · LIMITS OF TOLERANCE" at={activeStartFrame} />
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
