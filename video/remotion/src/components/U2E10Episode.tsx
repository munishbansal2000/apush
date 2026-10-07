import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { TalkingHead } from './TalkingHead';
import { TitleCard } from './TitleCard';
import { SpeechBubble } from './SpeechBubble';
import { SmartText } from './SmartText';
import { PrimarySourceSpotlight } from './PrimarySourceSpotlight';
import { VersusPolarization } from './VersusPolarization';
import { VersusEntity } from './motionStudioTypes';
import { ToneProvider } from '../validation/ToneContext';
import { AutoLayoutProvider } from '../validation/AutoLayout';

import turnsData from '../data/u2e10/turns.json';
import timingData from '../data/u2e10/timing_map.json';

interface Turn {
  id: string;
  speaker: string;
  text: string;
  pause_after?: number;
}

const turns = turnsData as Turn[];
const starts = (timingData as { starts: number[] }).starts;
const durations = (timingData as { durations: number[] }).durations;

const EP = 'u2e10';

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
  textColor?: string;
  leader?: string;
  leaderName?: string;
  documentTitle?: string;
  authorAndDate?: string;
  excerptText?: string;
  highlightedPhrase?: string;
  hippType?: 'Historical Context' | 'Intended Audience' | 'Purpose' | 'Point of View';
  hippExplanation?: string;
  clashTitle?: string;
  periodLabel?: string;
  entityA?: VersusEntity;
  entityB?: VersusEntity;
  verdictSummary?: string;
  versusDuration?: number;
}

const SUB_BEATS: SubBeat[] = [
  // t00 (29.0s): cold open — four boxes
  { turnId: 't00', offset: 3.5, kind: 'smarttext', text: 'FOUR BOXES', level: 'hero', position: [0.5, 0.22] },
  { turnId: 't00', offset: 8.0, kind: 'smarttext', text: 'BOX 1: THE KILLING GROUND', level: 'body', position: [0.5, 0.42] },
  { turnId: 't00', offset: 13.0, kind: 'smarttext', text: 'BOX 2: RIVERS, NOT TOWNS', level: 'body', position: [0.5, 0.52] },
  { turnId: 't00', offset: 18.0, kind: 'smarttext', text: 'BOX 3: THE PLANTER CLASS', level: 'body', position: [0.5, 0.62] },
  { turnId: 't00', offset: 23.0, kind: 'smarttext', text: 'BOX 4: THE LEGEND', level: 'body', position: [0.5, 0.72] },

  // t01 (18.6s): bridge — founding already known
  { turnId: 't01', offset: 2.0, kind: 'smarttext', text: 'JAMESTOWN 1607', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't01', offset: 7.0, kind: 'smarttext', text: 'company money · starving time · Smith · Rolfe\'s tobacco', level: 'body', position: [0.5, 0.5] },
  { turnId: 't01', offset: 12.0, kind: 'smarttext', text: 'Burgesses · 1619 · 1622 — you know this story', level: 'body', position: [0.5, 0.62] },

  // t02 (3.8s): box one lands
  { turnId: 't02', offset: 1.0, kind: 'smarttext', text: 'BOX 1: THE KILLING GROUND', level: 'title', position: [0.5, 0.25] },

  // t03 (13.0s): the fevers
  { turnId: 't03', offset: 2.0, kind: 'smarttext', text: 'MALARIA · DYSENTERY · TYPHOID', level: 'title', position: [0.5, 0.2] },
  { turnId: 't03', offset: 8.0, kind: 'smarttext', text: '−10 YEARS OFF A NEWCOMER\'S LIFE', level: 'subtitle', position: [0.5, 0.5], color: '#ff8a8a' },

  // t04 (3.0s)
  { turnId: 't04', offset: 0.5, kind: 'bubble', text: 'Ten years off your life — just for landing there?', position: [0.5, 0.5], width: 360 },

  // t05 (17.6s): seasoning
  { turnId: 't05', offset: 3.0, kind: 'smarttext', text: 'SEASONING', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't05', offset: 9.0, kind: 'bubble', text: 'the first year was the worst of it', position: [0.5, 0.55], width: 360 },
  { turnId: 't05', offset: 13.0, kind: 'smarttext', text: 'survivors built resistance', level: 'body', position: [0.5, 0.7] },

  // t06 (6.5s)
  { turnId: 't06', offset: 1.5, kind: 'smarttext', text: 'A MACHINE FOR IMPORTING PEOPLE AND BURYING THEM', level: 'subtitle', position: [0.5, 0.3] },

  // t07 (9.9s): young men, servants
  { turnId: 't07', offset: 2.0, kind: 'smarttext', text: '3 OF 4 CAME AS SERVANTS', level: 'title', position: [0.5, 0.25] },
  { turnId: 't07', offset: 5.5, kind: 'smarttext', text: 'nearly HALF didn\'t survive their term', level: 'body', position: [0.5, 0.55] },

  // t08 (2.4s)
  { turnId: 't08', offset: 0.5, kind: 'bubble', text: 'So families barely existed.', position: [0.5, 0.5], width: 340 },

  // t09 (28.7s): the demography
  { turnId: 't09', offset: 2.0, kind: 'smarttext', text: '1650: ~6 MEN TO EVERY WOMAN', level: 'title', position: [0.5, 0.2] },
  { turnId: 't09', offset: 9.0, kind: 'smarttext', text: 'by 1700: narrowed toward 3 to 2', level: 'body', position: [0.5, 0.45] },
  { turnId: 't09', offset: 15.0, kind: 'smarttext', text: 'many marriages broken by death within 7 years', level: 'body', position: [0.5, 0.55] },
  { turnId: 't09', offset: 21.0, kind: 'smarttext', text: 'roughly half the children gone before 20', level: 'body', position: [0.5, 0.65] },

  // t10 (2.0s)
  { turnId: 't10', offset: 0.3, kind: 'bubble', text: 'Why did anyone keep coming?', position: [0.5, 0.5], width: 340 },

  // t11 (13.8s): England was worse
  { turnId: 't11', offset: 2.0, kind: 'smarttext', text: 'NO LAND · NO WORK · NO FUTURE', level: 'subtitle', position: [0.5, 0.3] },
  { turnId: 't11', offset: 8.0, kind: 'smarttext', text: 'grew by BOATS, not by BIRTHS', level: 'title', position: [0.5, 0.6] },

  // t12 (10.7s): prediction 1
  { turnId: 't12', offset: 1.0, kind: 'smarttext', text: '⚡ PREDICTION', level: 'title', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't12', offset: 3.5, kind: 'bubble', text: 'You\'re free in Virginia, 1660. What stands between you and a farm?', position: [0.5, 0.55], width: 420 },

  // t13 (10.0s): real silence
  { turnId: 't13', offset: 1.0, kind: 'smarttext', text: 'YOUR TURN…', level: 'subtitle', position: [0.5, 0.3] },

  // t14 (15.9s): the answer — headright
  { turnId: 't14', offset: 2.0, kind: 'smarttext', text: 'THE HEADRIGHT STACKED THE RIVERFRONT', level: 'title', position: [0.5, 0.22] },
  { turnId: 't14', offset: 8.0, kind: 'smarttext', text: 'importers got the land · wives still ~6 to 1', level: 'body', position: [0.5, 0.55] },

  // t15 (5.1s)
  { turnId: 't15', offset: 1.0, kind: 'bubble', text: 'that frustration doesn\'t stay quiet…', position: [0.5, 0.5], width: 360 },

  // t16 (12.3s): exam warning
  { turnId: 't16', offset: 2.0, kind: 'smarttext', text: '⚠ EXAM WARNING', level: 'title', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't16', offset: 5.5, kind: 'smarttext', text: 'slow growth before 1700? THE ANSWER IS DEATH.', level: 'body', position: [0.5, 0.5] },

  // t17 (8.5s): common mistake
  { turnId: 't17', offset: 1.5, kind: 'smarttext', text: '❌ DON\'T WRITE: NEW ENGLAND-STYLE GROWTH', level: 'subtitle', position: [0.5, 0.25], color: '#ff8a8a' },
  { turnId: 't17', offset: 5.0, kind: 'smarttext', text: 'natural increase came LATE to the Chesapeake', level: 'body', position: [0.5, 0.55] },

  // t18 (16.8s): it did turn
  { turnId: 't18', offset: 2.0, kind: 'smarttext', text: 'IT DID TURN', level: 'title', position: [0.5, 0.2] },
  { turnId: 't18', offset: 6.0, kind: 'smarttext', text: 'native-born resistance · more women · families held', level: 'body', position: [0.5, 0.5] },
  { turnId: 't18', offset: 11.0, kind: 'smarttext', text: '1700: ~60,000 PEOPLE — MOST POPULOUS', level: 'subtitle', position: [0.5, 0.68], entrance: 'stamp' },

  // t19 (10.7s): NOW THE MAP — Smith's 1612 map
  { turnId: 't19', offset: 1.0, kind: 'bg-swap', bgImage: 'historic/u2e10/smith-virginia-map-1612.webp' },
  { turnId: 't19', offset: 2.5, kind: 'smarttext', text: 'JAMES · YORK · RAPPAHANNOCK', level: 'title', position: [0.5, 0.18] },
  { turnId: 't19', offset: 6.5, kind: 'smarttext', text: 'plantations strung along rivers — each with its own wharf', level: 'body', position: [0.5, 0.55] },

  // t21 (13.0s): forget Boston
  { turnId: 't21', offset: 2.0, kind: 'smarttext', text: 'FORGET BOSTON', level: 'title', position: [0.5, 0.25] },
  { turnId: 't21', offset: 7.0, kind: 'smarttext', text: 'no town meetings · no village green — the rivers were the roads', level: 'body', position: [0.5, 0.55] },

  // t22 (8.9s): cousin on the Delta
  { turnId: 't22', offset: 2.0, kind: 'bubble', text: 'river out front, boat where the driveway should be', position: [0.5, 0.35], width: 400 },

  // t23 (21.4s): the regional comparison — VERSUS
  { turnId: 't23', offset: 2.0, kind: 'versus',
    clashTitle: 'SAME EMPIRE, TWO SOCIETIES', periodLabel: '1600s',
    entityA: { name: 'THE CHESAPEAKE', subtitle: 'rivers, plantations', points: ['scattered along rivers', 'wharves for roads', 'tobacco + headright'], color: '#c9a227' },
    entityB: { name: 'NEW ENGLAND', subtitle: 'towns, meetinghouse', points: ['clustered covenant towns', 'meetinghouse at the center', 'families + faith'], color: '#2c5aa0' },
    verdictSummary: 'the crop and the land system built two different maps', versusDuration: 12 },

  // t24 (14.2s): exam tip
  { turnId: 't24', offset: 2.0, kind: 'smarttext', text: '⚡ EXAM TIP', level: 'title', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't24', offset: 6.0, kind: 'smarttext', text: 'stimulus shows riverside plantations, no towns → READ THE RIVERS', level: 'body', position: [0.5, 0.55] },

  // t25 (6.5s)
  { turnId: 't25', offset: 1.5, kind: 'smarttext', text: '❌ NOT a town-building colony — no Boston', level: 'body', position: [0.5, 0.35] },

  // t26 (5.4s): checkoff
  { turnId: 't26', offset: 1.0, kind: 'smarttext', text: '✅ BOX 2: RIVERS, NOT TOWNS — CHECKED', level: 'subtitle', position: [0.5, 0.8], color: '#7dd87d' },

  // t27 (13.9s): box three
  { turnId: 't27', offset: 1.5, kind: 'smarttext', text: 'BOX 3: THE PLANTER CLASS', level: 'title', position: [0.5, 0.2] },
  { turnId: 't27', offset: 6.0, kind: 'smarttext', text: 'HEADRIGHT: 50 ACRES A HEAD — to whoever paid the passage', level: 'body', position: [0.5, 0.5] },
  { turnId: 't27', offset: 10.0, kind: 'bubble', text: 'import a dozen servants → thousands of riverfront acres', position: [0.5, 0.65], width: 400 },

  // t28 (3.1s)
  { turnId: 't28', offset: 1.0, kind: 'smarttext', text: 'a system that manufactured its own aristocracy', level: 'body', position: [0.5, 0.5] },

  // t29 (14.7s): planter power
  { turnId: 't29', offset: 2.0, kind: 'smarttext', text: 'owned the riverfront · grew the tobacco · ran the Burgesses', level: 'body', position: [0.5, 0.3] },
  { turnId: 't29', offset: 8.0, kind: 'smarttext', text: 'TOBACCO ATE THE SOIL', level: 'title', position: [0.5, 0.55], color: '#ff8a8a' },
  { turnId: 't29', offset: 11.5, kind: 'smarttext', text: '→ endless hunger for fresh land', level: 'body', position: [0.5, 0.72] },

  // t30 (4.8s)
  { turnId: 't30', offset: 1.0, kind: 'bubble', text: 'Maryland: Catholic refuge, same crop?', position: [0.5, 0.5], width: 340 },

  // t31 (25.1s): Calvert / Maryland
  { turnId: 't31', offset: 2.0, kind: 'smarttext', text: '1632: CHARTER TO LORD BALTIMORE', level: 'title', position: [0.5, 0.2] },
  { turnId: 't31', offset: 7.0, kind: 'smarttext', text: 'first PROPRIETARY colony — one owner, not a company', level: 'body', position: [0.5, 0.5] },
  { turnId: 't31', offset: 13.0, kind: 'smarttext', text: '1634: first settlers land', level: 'body', position: [0.5, 0.62] },
  { turnId: 't31', offset: 18.0, kind: 'bubble', text: 'wanted a Catholic refuge AND tobacco profit — got the tobacco', position: [0.5, 0.72], width: 420 },

  // t32 (6.0s)
  { turnId: 't32', offset: 1.0, kind: 'bubble', text: 'So Maryland stays Catholic?', position: [0.5, 0.5], width: 300 },

  // t33 (15.6s): not quite
  { turnId: 't33', offset: 2.0, kind: 'smarttext', text: 'PROTESTANTS OUTNUMBERED CATHOLICS', level: 'title', position: [0.5, 0.25] },
  { turnId: 't33', offset: 7.0, kind: 'smarttext', text: '1649: ACT OF TOLERATION', level: 'title', position: [0.5, 0.5], entrance: 'stamp' },
  { turnId: 't33', offset: 11.5, kind: 'bubble', text: 'the Catholics needed the law in their own colony', position: [0.5, 0.65], width: 380 },

  // t34 (11.4s): headright trap
  { turnId: 't34', offset: 1.5, kind: 'smarttext', text: '⚠ THE HEADRIGHT TRAP', level: 'title', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't34', offset: 5.0, kind: 'smarttext', text: 'the 50 acres followed the PAYER, never the servant', level: 'body', position: [0.5, 0.55] },

  // t35 (9.6s)
  { turnId: 't35', offset: 1.5, kind: 'smarttext', text: '❌ Maryland did NOT stay Catholic — outgrown in a generation', level: 'body', position: [0.5, 0.4] },

  // t36 (9.0s): last box — the legend
  { turnId: 't36', offset: 1.0, kind: 'smarttext', text: 'BOX 4: THE LEGEND', level: 'title', position: [0.5, 0.2] },
  { turnId: 't36', offset: 4.0, kind: 'leader', leader: 'unit2_john_smith.webp', leaderName: 'John Smith', position: [0.7, 0.5] },

  // t37 (4.0s): Disney
  { turnId: 't37', offset: 1.0, kind: 'bubble', text: 'I\'ve seen the Disney movie approximately forty times.', position: [0.5, 0.3], width: 380 },

  // t38 (14.1s): Generall Historie 1624
  { turnId: 't38', offset: 2.0, kind: 'smarttext', text: 'GENERALL HISTORIE, 1624', level: 'title', position: [0.5, 0.2] },
  { turnId: 't38', offset: 6.0, kind: 'smarttext', text: 'the rescue appears ~17 YEARS later — in none of the earlier accounts', level: 'body', position: [0.5, 0.55] },
  { turnId: 't38', offset: 11.0, kind: 'primarysource',
    documentTitle: 'The Generall Historie of Virginia',
    authorAndDate: 'John Smith, 1624',
    excerptText: 'The famous rescue scene — Pocahontas throwing herself across Smith\'s body.',
    highlightedPhrase: 'written by Smith, about Smith',
    hippType: 'Point of View',
    hippExplanation: 'A founder selling a book in 1624, years after the events and after Pocahontas died. Read the author before the story.' },

  // t39 (8.3s): prediction 2
  { turnId: 't39', offset: 1.0, kind: 'smarttext', text: '⚡ PREDICTION', level: 'title', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't39', offset: 3.5, kind: 'bubble', text: 'You\'re Smith in 1624, selling a book. What goes in the new chapter?', position: [0.5, 0.55], width: 420 },

  // t40 (8.0s): real silence
  { turnId: 't40', offset: 1.0, kind: 'smarttext', text: 'YOUR TURN…', level: 'subtitle', position: [0.5, 0.3] },

  // t41 (3.9s)
  { turnId: 't41', offset: 1.0, kind: 'smarttext', text: 'The rescue — the hero of his own book', level: 'body', position: [0.5, 0.5] },

  // t42 (14.3s): historians split
  { turnId: 't42', offset: 2.0, kind: 'smarttext', text: 'HISTORIANS SPLIT', level: 'title', position: [0.5, 0.2] },
  { turnId: 't42', offset: 6.0, kind: 'smarttext', text: 'theory 1: he INVENTED it', level: 'body', position: [0.5, 0.45] },
  { turnId: 't42', offset: 10.0, kind: 'smarttext', text: 'theory 2: he MISREAD an adoption ritual', level: 'body', position: [0.5, 0.6] },

  // t43 (6.0s)
  { turnId: 't43', offset: 1.0, kind: 'bubble', text: 'So the Disney version = Smith\'s PR department?', position: [0.5, 0.4], width: 360 },

  // t44 (11.3s): the real Pocahontas
  { turnId: 't44', offset: 2.0, kind: 'smarttext', text: 'captured · married Rolfe · shown at court in London', level: 'body', position: [0.5, 0.4] },

  // t45 (4.4s)
  { turnId: 't45', offset: 1.0, kind: 'smarttext', text: '…and died there, 1617 — about twenty', level: 'body', position: [0.5, 0.55] },

  // t46 (30.8s): the real ending
  { turnId: 't46', offset: 2.0, kind: 'smarttext', text: '1644: OPECHANCANOUGH TRIED AGAIN', level: 'title', position: [0.5, 0.2] },
  { turnId: 't46', offset: 8.0, kind: 'smarttext', text: 'crushed · captured 1646 · killed as a prisoner', level: 'body', position: [0.5, 0.5] },
  { turnId: 't46', offset: 14.0, kind: 'smarttext', text: '1646 TREATY', level: 'title', position: [0.5, 0.6], entrance: 'stamp' },
  { turnId: 't46', offset: 18.0, kind: 'smarttext', text: 'boundary · reservation land · tribute — Powhatan power broken', level: 'body', position: [0.5, 0.72] },
  { turnId: 't46', offset: 24.0, kind: 'bg-swap', bgImage: 'historic/u2e2/jamestown-burning.jpg' },

  // t47 (5.8s)
  { turnId: 't47', offset: 1.0, kind: 'bubble', text: 'the legend gets told in London while the people get pushed off the map', position: [0.5, 0.35], width: 420 },

  // t48 (10.5s)
  { turnId: 't48', offset: 1.5, kind: 'smarttext', text: 'BOTH STORIES', level: 'title', position: [0.5, 0.25] },
  { turnId: 't48', offset: 5.0, kind: 'smarttext', text: 'the rescue made Smith a hero · the wars made the Chesapeake English', level: 'body', position: [0.5, 0.55] },

  // t49 (12.0s): exam tip
  { turnId: 't49', offset: 2.0, kind: 'smarttext', text: '⚡ EXAM TIP: READ THE AUTHOR FIRST', level: 'title', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't49', offset: 6.5, kind: 'smarttext', text: 'Smith writing about Smith = source-criticism stimulus', level: 'body', position: [0.5, 0.55] },

  // t50 (13.4s)
  { turnId: 't50', offset: 2.0, kind: 'smarttext', text: '❌ DON\'T END THE POWHATAN STORY IN 1622', level: 'subtitle', position: [0.5, 0.25], color: '#ff8a8a' },
  { turnId: 't50', offset: 7.0, kind: 'smarttext', text: 'the exam\'s later dates: 1644, 1646', level: 'body', position: [0.5, 0.55] },

  // t51 (22.7s): recap — box one
  { turnId: 't51', offset: 2.0, kind: 'smarttext', text: '✅ BOX 1: THE KILLING GROUND', level: 'title', position: [0.5, 0.2], color: '#7dd87d' },
  { turnId: 't51', offset: 7.0, kind: 'smarttext', text: 'malaria · dysentery · typhoid — ~10 years off a newcomer\'s life', level: 'body', position: [0.5, 0.5] },
  { turnId: 't51', offset: 13.0, kind: 'smarttext', text: '1650: ~6 to 1 … by 1700 down to — three to one?', level: 'body', position: [0.5, 0.65] },

  // t53 (58.1s): recap — boxes two through four (cumulative stack, sibling pattern)
  { turnId: 't53', offset: 3.0, kind: 'smarttext', text: '✅ BOX 1: THE KILLING GROUND — three to two ✓', level: 'subtitle', position: [0.5, 0.30], color: '#7dd87d' },
  { turnId: 't53', offset: 12.0, kind: 'smarttext', text: '✅ BOX 2: RIVERS, NOT TOWNS — James · York · Rappahannock', level: 'subtitle', position: [0.5, 0.44], color: '#7dd87d' },
  { turnId: 't53', offset: 24.0, kind: 'smarttext', text: '✅ BOX 3: THE PLANTER CLASS — headright stacked the riverfront', level: 'subtitle', position: [0.5, 0.58], color: '#7dd87d' },
  { turnId: 't53', offset: 36.0, kind: 'smarttext', text: '✅ BOX 4: LEGEND & LOSS — 1624 rescue · 1644/1646 ending', level: 'subtitle', position: [0.5, 0.72], color: '#7dd87d' },
  { turnId: 't53', offset: 48.0, kind: 'smarttext', text: 'FOUR BOXES, ALL CHECKED', level: 'hero', position: [0.5, 0.12], entrance: 'stamp' },

  // t54 (23.1s): LEQ tie-in
  { turnId: 't54', offset: 2.0, kind: 'smarttext', text: 'LEQ: YOUR REGIONAL-COMPARISON PARAGRAPH', level: 'title', position: [0.5, 0.2] },
  { turnId: 't54', offset: 8.0, kind: 'smarttext', text: 'name the CROP, the LABOR, the MAP — for each region', level: 'body', position: [0.5, 0.5] },
  { turnId: 't54', offset: 14.0, kind: 'smarttext', text: 'graders reward the WHY, not just the what', level: 'body', position: [0.5, 0.62] },

  // t55 (7.6s): Q1
  { turnId: 't55', offset: 1.5, kind: 'smarttext', text: 'Q1: GROWTH BY IMMIGRATION, NOT BIRTHS — WHY?', level: 'title', position: [0.5, 0.25] },
  { turnId: 't55', offset: 4.5, kind: 'smarttext', text: 'say your answer before Maya gives it', level: 'body', position: [0.5, 0.6] },

  // t56 (15.0s): think
  { turnId: 't56', offset: 1.0, kind: 'smarttext', text: 'THINK: what outran what?', level: 'subtitle', position: [0.5, 0.3] },

  // t57 (18.3s): A1
  { turnId: 't57', offset: 2.0, kind: 'smarttext', text: 'DEATH OUTRAN BIRTH', level: 'title', position: [0.5, 0.25] },
  { turnId: 't57', offset: 6.5, kind: 'smarttext', text: 'fevers cut ~10 years · mostly young men (~6 to 1) → few families', level: 'body', position: [0.5, 0.5] },
  { turnId: 't57', offset: 12.0, kind: 'smarttext', text: 'so the population grew by fresh boats', level: 'body', position: [0.5, 0.65] },

  // t58 (15.5s): Q2
  { turnId: 't58', offset: 1.5, kind: 'smarttext', text: 'Q2: THE 1624 STIMULUS — WHAT\'S THE PROBLEM?', level: 'title', position: [0.5, 0.25] },
  { turnId: 't58', offset: 6.0, kind: 'smarttext', text: 'a historian wants to use it as evidence of 1607', level: 'body', position: [0.5, 0.6] },

  // t59 (20.0s): think
  { turnId: 't59', offset: 1.0, kind: 'smarttext', text: 'THINK: whose pen? whose motive?', level: 'subtitle', position: [0.5, 0.3] },

  // t60 (19.2s): A2
  { turnId: 't60', offset: 2.0, kind: 'smarttext', text: 'READ THE AUTHOR BEFORE THE STORY', level: 'title', position: [0.5, 0.2] },
  { turnId: 't60', offset: 7.0, kind: 'smarttext', text: 'Smith\'s own late telling — none of the earlier accounts', level: 'body', position: [0.5, 0.5] },
  { turnId: 't60', offset: 13.0, kind: 'smarttext', text: 'published 1624, ~17 years later, when he needed a book to sell', level: 'body', position: [0.5, 0.65] },

  // t61 (10.4s): Q3
  { turnId: 't61', offset: 1.5, kind: 'smarttext', text: 'Q3: ONE MOVE EACH — CHESAPEAKE vs NEW ENGLAND', level: 'title', position: [0.5, 0.25] },
  { turnId: 't61', offset: 6.0, kind: 'smarttext', text: 'why scatter along rivers vs cluster in towns?', level: 'body', position: [0.5, 0.6] },

  // t62 (15.0s): think
  { turnId: 't62', offset: 1.0, kind: 'smarttext', text: 'THINK: what built each map?', level: 'subtitle', position: [0.5, 0.3] },

  // t63 (18.4s): A3
  { turnId: 't63', offset: 2.0, kind: 'smarttext', text: 'THE CROP BUILT THE MAP', level: 'title', position: [0.5, 0.2] },
  { turnId: 't63', offset: 7.0, kind: 'smarttext', text: 'tobacco needed fresh soil + river frontage · headright stacked land on importers', level: 'body', position: [0.5, 0.5] },
  { turnId: 't63', offset: 13.0, kind: 'smarttext', text: 'New England: covenant towns around the meetinghouse', level: 'body', position: [0.5, 0.65] },

  // t64 (5.0s): fast bonus
  { turnId: 't64', offset: 1.0, kind: 'smarttext', text: '⚡ FAST BONUS', level: 'title', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't64', offset: 2.5, kind: 'smarttext', text: 'Maryland, 1649: what law, and who was it really for?', level: 'body', position: [0.5, 0.55] },

  // t65 (5.0s): think
  { turnId: 't65', offset: 1.0, kind: 'smarttext', text: 'THINK…', level: 'subtitle', position: [0.5, 0.4] },

  // t66 (8.8s): the answer
  { turnId: 't66', offset: 1.5, kind: 'smarttext', text: 'THE ACT OF TOLERATION', level: 'title', position: [0.5, 0.25] },
  { turnId: 't66', offset: 4.5, kind: 'smarttext', text: 'worship protected for Christians — really for the Catholics, outnumbered in their own refuge', level: 'body', position: [0.5, 0.6] },

  // t68 (6.4s): next time
  { turnId: 't68', offset: 1.5, kind: 'smarttext', text: 'next time: the regions stop arguing with each other — and start arguing with London', level: 'body', position: [0.5, 0.4] },

  // t69 (3.5s): closing line
  { turnId: 't69', offset: 0.5, kind: 'smarttext', text: 'THE CHESAPEAKE ATE ITS PEOPLE AND FED ITS PLANTERS —', level: 'subtitle', position: [0.5, 0.3] },

  // t70 (1.9s): landing
  { turnId: 't70', offset: 0.3, kind: 'smarttext', text: 'AND THE LEGEND OUTLIVED THEM ALL', level: 'title', position: [0.5, 0.5] },
];

/* ------------------------------------------------------------------ */
/* Background selector                                                  */
/* ------------------------------------------------------------------ */
function getBackgroundForTurn(turnId: string | null, subBeatBg: string | null): string {
  if (subBeatBg) return subBeatBg;
  if (!turnId) return 'historic/u2e1/jamestown.jpg';
  const n = parseInt(turnId.slice(1), 10);
  // Cold open + founding bridge
  if (n <= 1) return 'historic/u2e1/jamestown.jpg';
  // Box 1: the killing ground
  if (n <= 18) return 'historic/u2e1/jamestown.jpg';
  // Box 2: rivers, not towns
  if (n <= 26) return 'historic/u2e10/smith-virginia-map-1612.webp';
  // Box 3: the planter class + Maryland
  if (n <= 35) return 'historic/u2e2/virginia-plantation.jpg';
  // Box 4: the legend and the loss
  if (n <= 50) return 'historic/u2e2/jamestown-burning.jpg';
  // Recap + questions
  if (n <= 66) return 'historic/u2e1/colonial-map.jpg';
  // Close
  return 'historic/u2e1/jamestown.jpg';
}

/* ------------------------------------------------------------------ */
/* Cartoon leader sticker (user-built assets, transparent WebP)         */
/* ------------------------------------------------------------------ */
const LeaderSticker: React.FC<{
  at: number;
  leader: string;
  name: string;
  role?: string;
  position: [number, number];
  size?: number;
}> = ({ at, leader, name, role, position, size = 320 }) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (frame < at) return null;
  const elapsed = (frame - at) / fps;
  // Pop-in with slight bounce
  const scale = interpolate(
    Math.min(1, elapsed / 0.5),
    [0, 0.7, 1], [0.3, 1.08, 1], { extrapolateRight: 'clamp' }
  );
  // Gentle idle bob
  const bob = Math.sin(elapsed * 2.2) * 8;

  return (
    <div style={{
      position: 'absolute',
      left: `${position[0] * 100}%`,
      top: `${position[1] * 100}%`,
      transform: `translate(-50%, -50%) scale(${scale}) translateY(${bob}px)`,
      zIndex: 25,
      textAlign: 'center',
    }}>
      <Img
        src={staticFile(`leaders/${leader}`)}
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.6))',
        }}
      />
      <div style={{
        marginTop: 6,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 800,
        fontSize: 26,
        color: '#f5e6c8',
        textShadow: '0 2px 8px rgba(0,0,0,0.8)',
      }}>
        {name}
      </div>
      {role && (
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 18,
          color: 'rgba(245,230,200,0.75)',
        }}>
          {role}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Main episode                                                         */
/* ------------------------------------------------------------------ */
export const U2E10Episode: React.FC = () => {
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

  // Tone: serious for the killing ground (disease/demography) and the Powhatan wars;
  // playful for the legend jokes, questions, and box-checkoffs.
  const turnNum = activeTurn ? parseInt(activeTurn.id.slice(1), 10) : -1;
  const isSeriousSection = turnNum >= 2 && turnNum <= 18;

  const showHead = activeTurn &&
    (activeTurn.speaker === 'maya' || activeTurn.speaker === 'marcus') &&
    !(activeTurn.id === 't00' && turnElapsed < 3);

  const speakerAssets = (speaker: string) => {
    if (speaker === 'maya') {
      return {
        realistic: staticFile('maya-real.webp'),
        stylized: staticFile('maya-toon.webp'),
      };
    }
    // No Marcus toon asset exists — always realistic
    return {
      realistic: staticFile('marcus-real.webp'),
      stylized: staticFile('marcus-real.webp'),
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
            <TitleCard kicker="UNIT 2 · EPISODE 10:"
              title="JAMESTOWN & THE CHESAPEAKE" at={activeStartFrame} />
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
                textColor={beat.textColor} at={beatFrame} />;
            }

            if (beat.kind === 'leader' && beat.leader) {
              return <LeaderSticker key={key} at={beatFrame}
                leader={beat.leader} name={beat.leaderName || ''}
                position={beat.position || [0.72, 0.5]} />;
            }

            if (beat.kind === 'versus' && beat.entityA && beat.entityB) {
              return (
                <Sequence key={key} from={beatFrame}
                  durationInFrames={Math.floor((beat.versusDuration || 10) * fps)}>
                  <VersusPolarization
                    clashTitle={beat.clashTitle || ''}
                    periodLabel={beat.periodLabel || ''}
                    entityA={beat.entityA}
                    entityB={beat.entityB}
                    verdictSummary={beat.verdictSummary || ''}
                  />
                </Sequence>
              );
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
