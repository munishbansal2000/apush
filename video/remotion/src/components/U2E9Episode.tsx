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

import { loadEpisodeData, type EpisodeData } from '../lib/load-episode-data';

interface Turn {
  id: string;
  speaker: string;
  text: string;
  pause_after?: number;
}


const EP = 'u2e9';

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
  // t00: Opening — the dare
  { turnId: 't00', offset: 4.0, kind: 'smarttext', text: 'THE DARE: SAY EVERY ANSWER BEFORE MAYA DOES', level: 'subtitle', position: [0.5, 0.2] },
  { turnId: 't00', offset: 10.0, kind: 'bubble', text: 'circle the ones you couldn\'t explain right now', position: [0.5, 0.5], width: 440 },

  // Q1: Four empires (t01-t09)
  { turnId: 't01', offset: 0.5, kind: 'smarttext', text: 'Q1: FOUR EMPIRES, ONE CONTINENT', level: 'title', position: [0.5, 0.18], entrance: 'stamp' },
  { turnId: 't01', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u2e1/colonial-map.jpg' },

  // Spain
  { turnId: 't03', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u2e1/potosi-mine.jpg' },
  { turnId: 't03', offset: 1.5, kind: 'smarttext', text: 'SPAIN: SOULS + SILVER', level: 'hero', position: [0.5, 0.22], entrance: 'stamp' },
  { turnId: 't03', offset: 6.0, kind: 'bubble', text: 'quinto: the crown\'s fifth, skimmed off the silver', position: [0.5, 0.55], width: 380 },
  { turnId: 't04', offset: 0.3, kind: 'bubble', text: 'Souls paid for by silver.', position: [0.5, 0.5], width: 320 },

  // France
  { turnId: 't05', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u2e1/champlain-quebec.jpg' },
  { turnId: 't05', offset: 1.0, kind: 'smarttext', text: 'FRANCE: FUR EMPIRE', level: 'hero', position: [0.5, 0.22], entrance: 'stamp' },
  { turnId: 't05', offset: 4.0, kind: 'smarttext', text: 'QUEBEC 1608', level: 'subtitle', position: [0.5, 0.35] },
  { turnId: 't05', offset: 9.0, kind: 'bubble', text: 'barred the Huguenots, so the settlers never came', position: [0.5, 0.6], width: 420 },

  // Holland
  { turnId: 't07', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u2e1/new-amsterdam-1660.jpg' },
  { turnId: 't07', offset: 1.0, kind: 'smarttext', text: 'HOLLAND: COMPANY COLONY', level: 'hero', position: [0.5, 0.22], entrance: 'stamp' },
  { turnId: 't07', offset: 6.0, kind: 'smarttext', text: '1629: SHIP 50, GET AN ESTATE', level: 'title', position: [0.5, 0.42] },
  { turnId: 't07', offset: 14.0, kind: 'bubble', text: 'patroon: sixteen miles one bank, eight both', position: [0.5, 0.64], width: 400 },
  { turnId: 't07', offset: 22.0, kind: 'bubble', text: 'a jumble of languages on the docks', position: [0.5, 0.8], width: 380 },
  { turnId: 't07', offset: 30.0, kind: 'smarttext', text: '1664: ENGLAND TAKES IT ALL', level: 'title', position: [0.5, 0.55] },

  // England
  { turnId: 't09', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u2e1/jamestown.jpg' },
  { turnId: 't09', offset: 1.0, kind: 'smarttext', text: 'ENGLAND: FAMILIES + FARMS', level: 'hero', position: [0.5, 0.22], entrance: 'stamp' },
  { turnId: 't09', offset: 6.0, kind: 'bubble', text: 'headright: 50 acres, paid to the PLANTER', position: [0.5, 0.5], width: 380 },
  { turnId: 't09', offset: 12.0, kind: 'bubble', text: 'Spain folded in, France allied, Holland traded, England pushed off', position: [0.5, 0.68], width: 460 },

  // Q2: Servants to slaves (t10-t18) — serious tone
  { turnId: 't10', offset: 0.5, kind: 'smarttext', text: 'Q2: SERVANTS TO SLAVES', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't12', offset: 1.0, kind: 'smarttext', text: '4-7 YEARS FOR A BOAT TICKET', level: 'hero', position: [0.5, 0.22], entrance: 'stamp' },
  { turnId: 't12', offset: 7.0, kind: 'bubble', text: 'freedom dues: corn, clothes, maybe land', position: [0.5, 0.55], width: 400 },
  { turnId: 't12', offset: 11.0, kind: 'bubble', text: 'then they LIVED, and wanted land', position: [0.5, 0.72], width: 360 },
  { turnId: 't13', offset: 0.5, kind: 'bubble', text: 'Berkeley won... and lost the job.', position: [0.5, 0.5], width: 340 },
  { turnId: 't14', offset: 1.0, kind: 'smarttext', text: 'BACON 1676', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't14', offset: 8.0, kind: 'bubble', text: 'burned Jamestown, died of dysentery', position: [0.5, 0.5], width: 400 },
  { turnId: 't14', offset: 15.0, kind: 'bubble', text: 'lesson: never let the poor unite', position: [0.5, 0.68], width: 400 },
  { turnId: 't14', offset: 20.0, kind: 'smarttext', text: '23 hanged, Berkeley recalled', level: 'body', position: [0.5, 0.85] },
  { turnId: 't16', offset: 1.0, kind: 'smarttext', text: 'THE CHAIN', level: 'hero', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't16', offset: 5.0, kind: 'smarttext', text: '1640: John Punch, sentenced to life', level: 'body', position: [0.5, 0.42] },
  { turnId: 't16', offset: 11.0, kind: 'smarttext', text: '1662: status follows the mother', level: 'body', position: [0.5, 0.5] },
  { turnId: 't16', offset: 17.0, kind: 'smarttext', text: 'Barbados 1661: the template', level: 'body', position: [0.5, 0.58] },
  { turnId: 't16', offset: 23.0, kind: 'smarttext', text: '1705: THE CODE GATHERED', level: 'title', position: [0.5, 0.72] },
  { turnId: 't16', offset: 30.0, kind: 'bubble', text: 'people held as real estate', position: [0.5, 0.88], width: 360 },
  { turnId: 't17', offset: 0.3, kind: 'bubble', text: 'Don\'t write that 1705 started it.', position: [0.5, 0.5], width: 360 },
  { turnId: 't18', offset: 3.0, kind: 'bubble', text: 'racism made slavery? or slavery made racism?', position: [0.5, 0.5], width: 420 },
  { turnId: 't18', offset: 9.0, kind: 'bubble', text: 'the codes are the fact; the motive is the argument', position: [0.5, 0.68], width: 420 },

  // Q3: New England (t19-t24)
  { turnId: 't19', offset: 0.5, kind: 'smarttext', text: 'Q3: WHY NEW ENGLAND?', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't19', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u2e1/colonial-map.jpg' },
  { turnId: 't21', offset: 0.5, kind: 'bubble', text: 'Pilgrims = Puritans?', position: [0.5, 0.5], width: 300 },
  { turnId: 't22', offset: 1.0, kind: 'smarttext', text: 'DIFFERENT GROUPS, DIFFERENT DECADES', level: 'hero', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't22', offset: 8.0, kind: 'bubble', text: 'Plymouth 1620: Separatists, broke away for good', position: [0.5, 0.5], width: 420 },
  { turnId: 't22', offset: 15.0, kind: 'bubble', text: 'Bay 1630: Puritans, purify from within', position: [0.5, 0.62], width: 420 },
  { turnId: 't22', offset: 22.0, kind: 'smarttext', text: 'KICKED OFF THE HILL', level: 'title', position: [0.5, 0.36] },
  { turnId: 't22', offset: 28.0, kind: 'bubble', text: 'Williams banished 1635, Hutchinson tried 1637', position: [0.5, 0.55], width: 440 },
  { turnId: 't24', offset: 1.0, kind: 'smarttext', text: 'KING PHILIP\'S WAR 1675-76', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't24', offset: 8.0, kind: 'bubble', text: 'Metacom, Massasoit\'s son', position: [0.5, 0.5], width: 320 },
  { turnId: 't24', offset: 15.0, kind: 'bubble', text: '17 settlements destroyed, 50 damaged', position: [0.5, 0.62], width: 400 },
  { turnId: 't24', offset: 22.0, kind: 'smarttext', text: 'say the per-capita part, or "deadliest" is wrong', level: 'body', position: [0.5, 0.78] },
  { turnId: 't24', offset: 29.0, kind: 'smarttext', text: 'Rowlandson 1682: America\'s first bestseller', level: 'body', position: [0.5, 0.86] },

  // Q4: Middle colonies (t25-t31)
  { turnId: 't25', offset: 0.5, kind: 'smarttext', text: 'Q4: THE DIVERSITY LAB', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't25', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u2e1/new-amsterdam-1660.jpg' },
  { turnId: 't27', offset: 1.0, kind: 'smarttext', text: 'PENN\'S HOLY EXPERIMENT 1681', level: 'hero', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't27', offset: 7.0, kind: 'bubble', text: 'paid for a debt, advertised in German', position: [0.5, 0.5], width: 400 },
  { turnId: 't27', offset: 13.0, kind: 'smarttext', text: 'DEUTSCH, NOT DUTCH', level: 'title', position: [0.5, 0.4], entrance: 'stamp' },
  { turnId: 't27', offset: 19.0, kind: 'bubble', text: 'Palatines: about a third of the colony', position: [0.5, 0.6], width: 360 },
  { turnId: 't27', offset: 23.0, kind: 'smarttext', text: 'redemptioners: negotiated servitude on the dock', level: 'body', position: [0.5, 0.78] },
  { turnId: 't29', offset: 1.0, kind: 'smarttext', text: 'THE BREADBASKET', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't29', offset: 6.0, kind: 'bubble', text: 'Ulster Presbyterians: about a fourth, pushed west', position: [0.5, 0.5], width: 400 },
  { turnId: 't29', offset: 12.0, kind: 'bubble', text: 'wheat and corn, flour to the sugar islands', position: [0.5, 0.65], width: 420 },
  { turnId: 't29', offset: 17.0, kind: 'bubble', text: 'Franklin 1751: "the Germans will Germanize us"', position: [0.5, 0.8], width: 420 },
  { turnId: 't30', offset: 0.3, kind: 'bubble', text: 'So Quakers, no slaves?', position: [0.5, 0.5], width: 300 },
  { turnId: 't31', offset: 1.0, kind: 'smarttext', text: 'THE BRAND, NOT THE BOOKS', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't31', offset: 6.0, kind: 'bubble', text: 'Penn held enslaved people', position: [0.5, 0.5], width: 340 },
  { turnId: 't31', offset: 12.0, kind: 'bubble', text: '1688: first anti-slavery protest, filed away', position: [0.5, 0.62], width: 420 },
  { turnId: 't31', offset: 19.0, kind: 'smarttext', text: 'WALKING PURCHASE 1737', level: 'title', position: [0.5, 0.36] },
  { turnId: 't31', offset: 24.0, kind: 'bubble', text: 'a day-and-a-half deed turned into a footrace', position: [0.5, 0.6], width: 400 },

  // Q5: Mercantilism (t32-t42)
  { turnId: 't32', offset: 0.5, kind: 'smarttext', text: 'Q5: MERCANTILISM', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't32', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u2e1/colonial-map.jpg' },
  { turnId: 't34', offset: 1.0, kind: 'smarttext', text: 'WEALTH IS A FIXED PILE', level: 'hero', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't34', offset: 6.0, kind: 'bubble', text: 'ship raw cheap, buy finished dear, never build the factory', position: [0.5, 0.55], width: 460 },
  { turnId: 't34', offset: 12.0, kind: 'bubble', text: 'good deal or cage? historians split', position: [0.5, 0.75], width: 360 },
  { turnId: 't36', offset: 1.0, kind: 'smarttext', text: 'THE ACTS: NAMES + DATES', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't36', offset: 6.0, kind: 'smarttext', text: '1651: trade on English ships', level: 'body', position: [0.5, 0.45] },
  { turnId: 't36', offset: 11.0, kind: 'smarttext', text: '1660: enumerated list, tobacco first', level: 'body', position: [0.5, 0.53] },
  { turnId: 't36', offset: 16.0, kind: 'smarttext', text: '1663: through an English port first', level: 'body', position: [0.5, 0.61] },
  { turnId: 't36', offset: 21.0, kind: 'smarttext', text: '1699 Wool, 1732 Hat, 1750 Iron', level: 'body', position: [0.5, 0.69] },
  { turnId: 't37', offset: 0.3, kind: 'bubble', text: 'Every ship sailed the triangle?', position: [0.5, 0.5], width: 340 },
  { turnId: 't38', offset: 1.0, kind: 'smarttext', text: 'PATTERN, NOT THE AVERAGE VOYAGE', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't38', offset: 6.0, kind: 'bubble', text: 'plenty of ships ran two legs, never closed the loop', position: [0.5, 0.55], width: 440 },
  { turnId: 't38', offset: 12.0, kind: 'bubble', text: 'the chain didn\'t lie: sugar, distilleries, plantations', position: [0.5, 0.72], width: 460 },
  { turnId: 't40', offset: 1.0, kind: 'smarttext', text: 'SALUTARY NEGLECT', level: 'hero', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't40', offset: 6.0, kind: 'bubble', text: '"let sleeping dogs lie" (probably never said)', position: [0.5, 0.5], width: 440 },
  { turnId: 't40', offset: 13.0, kind: 'smarttext', text: '1721-1742: the century of looking away', level: 'body', position: [0.5, 0.68] },
  { turnId: 't40', offset: 20.0, kind: 'smarttext', text: 'commerce grew about 12x since 1700', level: 'body', position: [0.5, 0.78] },
  { turnId: 't40', offset: 26.0, kind: 'smarttext', text: 'Liberty seized 1768: charged, never convicted', level: 'body', position: [0.5, 0.88] },
  { turnId: 't41', offset: 0.5, kind: 'bubble', text: '"put your John Hancock here"', position: [0.5, 0.5], width: 380 },
  { turnId: 't42', offset: 0.5, kind: 'bubble', text: 'she means the signature', position: [0.5, 0.5], width: 320 },

  // Q6: The Awakening (t43-t52)
  { turnId: 't43', offset: 0.5, kind: 'smarttext', text: 'Q6: HEART, HEAD, AND THE SPLIT', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't43', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u2e1/mission-church.jpg' },
  { turnId: 't45', offset: 0.5, kind: 'bubble', text: 'Whitefield started it all?', position: [0.5, 0.5], width: 320 },
  { turnId: 't46', offset: 1.0, kind: 'smarttext', text: 'THE TRAP ANSWER', level: 'title', position: [0.5, 0.2], entrance: 'stamp', color: '#ff8a8a' },
  { turnId: 't46', offset: 6.0, kind: 'bubble', text: 'the fire was smoldering in the 1730s', position: [0.5, 0.5], width: 400 },
  { turnId: 't46', offset: 13.0, kind: 'smarttext', text: 'WHITEFIELD 1739: POURED THE GASOLINE', level: 'title', position: [0.5, 0.42] },
  { turnId: 't46', offset: 20.0, kind: 'bubble', text: 'Franklin did the math: 30,000 could hear him', position: [0.5, 0.62], width: 420 },
  { turnId: 't48', offset: 1.0, kind: 'smarttext', text: 'EDWARDS: BACKWARDS', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't48', offset: 6.0, kind: 'bubble', text: 'read nearly flat, and the room came apart', position: [0.5, 0.5], width: 420 },
  { turnId: 't48', offset: 13.0, kind: 'smarttext', text: 'Enfield, July 1741: the spider over the fire', level: 'body', position: [0.5, 0.68] },
  { turnId: 't48', offset: 17.0, kind: 'smarttext', text: 'voted out by his own church, 1750', level: 'body', position: [0.5, 0.82] },
  { turnId: 't50', offset: 1.0, kind: 'smarttext', text: 'FRANKLIN: THE COUNTERWEIGHT', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't50', offset: 6.0, kind: 'bubble', text: 'Almanack 1732, Junto 1727', position: [0.5, 0.5], width: 380 },
  { turnId: 't50', offset: 12.0, kind: 'smarttext', text: 'deism: God wound the clock and stepped back', level: 'body', position: [0.5, 0.62] },
  { turnId: 't50', offset: 18.0, kind: 'bubble', text: 'the kite story is shakier than the textbooks say', position: [0.5, 0.76], width: 440 },
  { turnId: 't50', offset: 23.0, kind: 'smarttext', text: 'New Lights vs Old Lights: defy authority, survive it', level: 'body', position: [0.5, 0.9] },
  { turnId: 't51', offset: 0.3, kind: 'bubble', text: 'rehearsed the Revolution?', position: [0.5, 0.5], width: 320 },
  { turnId: 't52', offset: 0.5, kind: 'bubble', text: 'some say rehearsal; others say the fires burned out', position: [0.5, 0.5], width: 440 },
  { turnId: 't52', offset: 3.5, kind: 'bubble', text: 'Argue both sides.', position: [0.5, 0.72], width: 240 },

  // Q7: Assemblies (t53-t60)
  { turnId: 't53', offset: 0.5, kind: 'smarttext', text: 'Q7: THE ASSEMBLIES GET POWERFUL', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't53', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u2e1/colonial-map.jpg' },
  { turnId: 't56', offset: 1.0, kind: 'smarttext', text: 'THE PURSE', level: 'hero', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't56', offset: 6.0, kind: 'bubble', text: 'they voted the taxes, the budget, the governor\'s salary', position: [0.5, 0.55], width: 460 },
  { turnId: 't56', offset: 13.0, kind: 'smarttext', text: 'Shute 1720s: demanded a permanent salary, denied', level: 'body', position: [0.5, 0.74] },
  { turnId: 't56', offset: 18.0, kind: 'smarttext', text: 'Burnet 1728: 1700 pounds, still no fixed salary', level: 'body', position: [0.5, 0.82] },
  { turnId: 't57', offset: 0.3, kind: 'bubble', text: 'Zenger fixed press law for good?', position: [0.5, 0.5], width: 360 },
  { turnId: 't58', offset: 1.0, kind: 'smarttext', text: 'THE TRAP, NOT THE TRUTH', level: 'title', position: [0.5, 0.2], entrance: 'stamp', color: '#ff8a8a' },
  { turnId: 't58', offset: 7.0, kind: 'bubble', text: 'jailed 1734, wife Anna kept printing', position: [0.5, 0.5], width: 420 },
  { turnId: 't58', offset: 14.0, kind: 'smarttext', text: 'truth barred as defense, jury acquitted anyway', level: 'body', position: [0.5, 0.66] },
  { turnId: 't58', offset: 19.0, kind: 'bubble', text: 'the law stayed ugly; the idea changed', position: [0.5, 0.8], width: 400 },
  { turnId: 't60', offset: 1.0, kind: 'smarttext', text: 'ANGLICIZATION', level: 'hero', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't60', offset: 6.0, kind: 'smarttext', text: 'THE REVERSE', level: 'subtitle', position: [0.5, 0.38] },
  { turnId: 't60', offset: 11.0, kind: 'bubble', text: 'more British, not more American', position: [0.5, 0.55], width: 380 },
  { turnId: 't60', offset: 15.0, kind: 'smarttext', text: 'Britishness was the weapon', level: 'body', position: [0.5, 0.72] },

  // Q8: The war (t61-t69)
  { turnId: 't61', offset: 0.5, kind: 'smarttext', text: 'Q8: ONE SHOT, ONE PLAN, ONE GAMBLE', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't61', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u2e1/champlain-quebec.jpg' },
  { turnId: 't63', offset: 1.0, kind: 'smarttext', text: 'JUMONVILLE GLEN, MAY 1754', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't63', offset: 7.0, kind: 'bubble', text: 'Washington, 22, before dawn, in the rain', position: [0.5, 0.5], width: 400 },
  { turnId: 't63', offset: 14.0, kind: 'smarttext', text: 'France called it murder: an ensign, not a general', level: 'body', position: [0.5, 0.66] },
  { turnId: 't63', offset: 21.0, kind: 'smarttext', text: 'l\'assassinat', level: 'subtitle', position: [0.5, 0.8] },
  { turnId: 't64', offset: 0.3, kind: 'bubble', text: 'the shot heard \'round the world', position: [0.5, 0.5], width: 380 },
  { turnId: 't65', offset: 0.3, kind: 'bubble', text: 'Different shot. Emerson\'s poem.', position: [0.5, 0.5], width: 360 },
  { turnId: 't67', offset: 1.0, kind: 'smarttext', text: 'THE COLONIES SAID NO FIRST', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't67', offset: 7.0, kind: 'bubble', text: 'not disorganized, guarding their own power', position: [0.5, 0.5], width: 440 },
  { turnId: 't67', offset: 14.0, kind: 'smarttext', text: 'BRADDOCK, JULY 1755', level: 'title', position: [0.5, 0.42] },
  { turnId: 't67', offset: 21.0, kind: 'bubble', text: 'four bullets through his coat: his actual words', position: [0.5, 0.62], width: 440 },
  { turnId: 't69', offset: 1.0, kind: 'smarttext', text: 'PITT\'S GAMBLE 1757', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't69', offset: 6.0, kind: 'bubble', text: '"conquer America in Germany"', position: [0.5, 0.5], width: 380 },
  { turnId: 't69', offset: 12.0, kind: 'smarttext', text: 'Quebec, Sept 1759: under an hour, both generals dead', level: 'body', position: [0.5, 0.66] },
  { turnId: 't69', offset: 18.0, kind: 'smarttext', text: 'Paris, Feb 1763: Canada and all east of the Mississippi', level: 'body', position: [0.5, 0.76] },
  { turnId: 't69', offset: 22.0, kind: 'smarttext', text: 'France kept the sugar islands', level: 'body', position: [0.5, 0.86] },

  // Q9: 1763 (t70-t74)
  { turnId: 't70', offset: 0.5, kind: 'smarttext', text: 'Q9: WHY DID WINNING BREAK EVERYTHING?', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't70', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u2e1/colonial-map.jpg' },
  { turnId: 't72', offset: 1.0, kind: 'smarttext', text: 'THE BILL', level: 'hero', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't72', offset: 5.0, kind: 'bubble', text: 'enormous debt, and the books won\'t pin the number', position: [0.5, 0.55], width: 440 },
  { turnId: 't72', offset: 11.0, kind: 'smarttext', text: 'Pontiac\'s rising: gift diplomacy ended', level: 'body', position: [0.5, 0.74] },
  { turnId: 't72', offset: 15.0, kind: 'smarttext', text: 'Detroit besieged, forts fell, a year to break it', level: 'body', position: [0.5, 0.82] },
  { turnId: 't74', offset: 1.0, kind: 'smarttext', text: 'FOLLOW THE MONEY, NOT THE REVENGE', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't74', offset: 7.0, kind: 'smarttext', text: 'Oct 1763: no settlement west of the Appalachians', level: 'body', position: [0.5, 0.5] },
  { turnId: 't74', offset: 14.0, kind: 'bubble', text: 'Washington\'s bounty land froze under it', position: [0.5, 0.68], width: 420 },
  { turnId: 't74', offset: 20.0, kind: 'smarttext', text: 'THE CENTURY OF LOOKING AWAY: OVER', level: 'subtitle', position: [0.5, 0.86] },

  // Q10: the period thesis (t75-t78)
  { turnId: 't75', offset: 0.5, kind: 'smarttext', text: 'Q10: THE WHOLE UNIT, ONE SENTENCE', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't77', offset: 1.0, kind: 'smarttext', text: 'THE PERIOD THESIS', level: 'hero', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't77', offset: 5.0, kind: 'bubble', text: 'valuable, diverse, self-governing... and ungovernable', position: [0.5, 0.55], width: 460 },
  { turnId: 't78', offset: 1.0, kind: 'smarttext', text: 'LAND THEM IN ONE BREATH', level: 'subtitle', position: [0.5, 0.18], entrance: 'stamp' },
  { turnId: 't78', offset: 6.0, kind: 'smarttext', text: 'servants to slaves: divide by race', level: 'body', position: [0.5, 0.3] },
  { turnId: 't78', offset: 11.0, kind: 'smarttext', text: '1705: gathered, not invented', level: 'body', position: [0.5, 0.38] },
  { turnId: 't78', offset: 16.0, kind: 'smarttext', text: 'covenant towns to King Philip\'s War', level: 'body', position: [0.5, 0.46] },
  { turnId: 't78', offset: 21.0, kind: 'smarttext', text: 'Penn\'s experiment: many peoples, unequal footing', level: 'body', position: [0.5, 0.54] },
  { turnId: 't78', offset: 26.0, kind: 'smarttext', text: 'mercantilism\'s fixed pile, the dodge, the neglect', level: 'body', position: [0.5, 0.62] },
  { turnId: 't78', offset: 31.0, kind: 'smarttext', text: 'the Awakening\'s heart, Franklin\'s head', level: 'body', position: [0.5, 0.7] },
  { turnId: 't78', offset: 36.0, kind: 'smarttext', text: 'the purse, the press, the Britishness', level: 'body', position: [0.5, 0.78] },
  { turnId: 't78', offset: 41.0, kind: 'smarttext', text: 'one shot in the rain, Pitt\'s gamble, the bill', level: 'body', position: [0.5, 0.86] },

  // Predictions (t79-t84)
  { turnId: 't79', offset: 1.0, kind: 'smarttext', text: 'PREDICTION 1: SELF-GOVERNMENT BY 1754?', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't81', offset: 1.0, kind: 'smarttext', text: 'MODEL THESIS 1', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't81', offset: 6.0, kind: 'bubble', text: 'extensive self-government, thin distinct identity', position: [0.5, 0.5], width: 440 },
  { turnId: 't81', offset: 13.0, kind: 'smarttext', text: 'machinery American, loyalty British', level: 'body', position: [0.5, 0.68] },
  { turnId: 't81', offset: 20.0, kind: 'bubble', text: 'the war would test which one held', position: [0.5, 0.82], width: 380 },
  { turnId: 't82', offset: 1.0, kind: 'smarttext', text: 'PREDICTION 2: CHESAPEAKE LABOR 1660-1700?', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't84', offset: 1.0, kind: 'smarttext', text: 'MODEL THESIS 2', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't84', offset: 6.0, kind: 'bubble', text: 'the labor force transformed; the engine didn\'t', position: [0.5, 0.5], width: 440 },
  { turnId: 't84', offset: 13.0, kind: 'smarttext', text: 'legal and racial transformation, economy barely changed', level: 'body', position: [0.5, 0.68] },
  { turnId: 't84', offset: 18.0, kind: 'smarttext', text: 'John Punch 1640 to the 1705 code', level: 'body', position: [0.5, 0.78] },

  // Closing (t85-t87)
  { turnId: 't85', offset: 0.3, kind: 'bubble', text: 'Valuable, diverse, self-governing...', position: [0.5, 0.5], width: 380 },
  { turnId: 't86', offset: 0.3, kind: 'smarttext', text: 'UNGOVERNABLE', level: 'hero', position: [0.5, 0.35], entrance: 'stamp' },
  { turnId: 't87', offset: 0.5, kind: 'smarttext', text: 'NEXT: THE TAX BILLS COME DUE', level: 'subtitle', position: [0.5, 0.5], color: '#ffd700' },
];

/* ------------------------------------------------------------------ */
/* Background selector                                                  */
/* ------------------------------------------------------------------ */
function getBackgroundForTurn(turnId: string | null, subBeatBg: string | null): string {
  if (subBeatBg) return subBeatBg;
  if (!turnId) return 'historic/u2e1/colonial-map.jpg';
  const n = parseInt(turnId.slice(1), 10);
  // Q1: four empires (bg-swaps carry the empire sections)
  if (n <= 9) return 'historic/u2e1/colonial-map.jpg';
  // Q2: servants to slaves (Chesapeake)
  if (n <= 18) return 'historic/u2e1/jamestown.jpg';
  // Q3: New England
  if (n <= 24) return 'historic/u2e1/colonial-map.jpg';
  // Q4: middle colonies
  if (n <= 31) return 'historic/u2e1/new-amsterdam-1660.jpg';
  // Q5: mercantilism
  if (n <= 42) return 'historic/u2e1/colonial-map.jpg';
  // Q6: the Awakening
  if (n <= 52) return 'historic/u2e1/mission-church.jpg';
  // Q7: assemblies
  if (n <= 60) return 'historic/u2e1/colonial-map.jpg';
  // Q8: the war
  if (n <= 69) return 'historic/u2e1/champlain-quebec.jpg';
  // Q9, Q10, predictions, closing
  return 'historic/u2e1/colonial-map.jpg';
}

/* ------------------------------------------------------------------ */
/* Main episode                                                         */
/* ------------------------------------------------------------------ */
export const U2E9Episode: React.FC<{ episodeData?: EpisodeData }> = ({ episodeData }) => {
  const data = episodeData ?? loadEpisodeData('u2e9');
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

  // Tone: playful cram energy; serious for slavery, King Philip's War, Pontiac
  const activeTurnNum = activeTurn ? parseInt(activeTurn.id.slice(1), 10) : -1;
  const isSeriousSection = activeTurn && (
    (activeTurnNum >= 10 && activeTurnNum <= 18) ||
    activeTurnNum === 24 ||
    activeTurnNum === 72
  );

  const showHead = activeTurn &&
    (activeTurn.speaker === 'maya' || activeTurn.speaker === 'jay') &&
    !(activeTurn.id === 't00' && turnElapsed < 3);

  // TODO: Jay assets don't exist yet — using Marcus as placeholder
  const speakerAssets = (speaker: string) => {
    if (speaker === 'maya') {
      return {
        realistic: staticFile('maya-real.webp'),
        stylized: staticFile('maya-toon.webp'),
      };
    }
    // jay -> marcus placeholder
    return {
      realistic: staticFile('marcus-real.webp'),
      stylized: staticFile('maya-toon.webp'),
    };
  };

  const speakerName = (speaker: string) => {
    if (speaker === 'maya') return 'Maya';
    if (speaker === 'jay') return 'Jay';
    return speaker;
  };

  const speakerColor = (speaker: string) => {
    if (speaker === 'maya') return '#c9a227';
    if (speaker === 'jay') return '#2c8a5a';  // green for Jay
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
            <TitleCard kicker="UNIT 2 · CRAM SESSION:"
              title="1607 TO 1763 IN ONE EPISODE" subline="TEN QUESTIONS · EIGHT EPISODES · NO NEW MATERIAL" at={activeStartFrame} />
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
