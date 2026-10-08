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
import { ToneProvider } from '../validation/ToneContext';
import { AutoLayoutProvider } from '../validation/AutoLayout';

import { loadEpisodeData, type EpisodeData } from '../lib/load-episode-data';

interface Turn {
  id: string;
  speaker: string;
  text: string;
  pause_after?: number;
}


const EP = 'u2e7';

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
  // t00: Cold open + three boxes
  { turnId: 't00', offset: 3.0, kind: 'smarttext', text: 'HOW THE COLONIES TIED THE KING\'S HANDS', level: 'hero', position: [0.5, 0.25] },
  { turnId: 't00', offset: 8.0, kind: 'smarttext', text: '1. THE POWER OF THE PURSE', level: 'subtitle', position: [0.5, 0.45] },
  { turnId: 't00', offset: 13.0, kind: 'smarttext', text: '2. THE ZENGER TRIAL', level: 'subtitle', position: [0.5, 0.55] },
  { turnId: 't00', offset: 18.0, kind: 'smarttext', text: '3. ANGLICIZATION', level: 'subtitle', position: [0.5, 0.65] },
  { turnId: 't00', offset: 23.0, kind: 'bubble', text: 'circle the ones you couldn\'t explain right now', position: [0.5, 0.8], width: 400 },

  // t01: The strangest power flip
  { turnId: 't01', offset: 2.0, kind: 'smarttext', text: 'THE STRANGEST POWER FLIP', level: 'title', position: [0.5, 0.2] },
  { turnId: 't01', offset: 6.0, kind: 'bubble', text: 'the governor steps off the boat — and begs for his paycheck', position: [0.5, 0.5], width: 420 },

  // t02: Money.
  // t03: They vote the taxes
  { turnId: 't03', offset: 2.0, kind: 'smarttext', text: 'THEY VOTE THE TAXES. THE BUDGET.', level: 'subtitle', position: [0.5, 0.25] },
  { turnId: 't03', offset: 5.5, kind: 'smarttext', text: '…AND THE GOVERNOR\'S OWN SALARY', level: 'title', position: [0.5, 0.5], color: '#ffd700' },

  // t04: Bake-sale money hostage (fun beat)
  { turnId: 't04', offset: 1.5, kind: 'bubble', text: 'student council held the bake-sale money hostage for spirit week', position: [0.5, 0.35], width: 420 },
  { turnId: 't04', offset: 5.5, kind: 'smarttext', text: 'SAME ENERGY, BIGGER WIGS.', level: 'subtitle', position: [0.5, 0.65] },

  // t05: Salutary neglect
  { turnId: 't05', offset: 2.0, kind: 'bubble', text: 'Walpole in London, a wide ocean, England\'s other wars', position: [0.5, 0.3], width: 420 },
  { turnId: 't05', offset: 8.0, kind: 'smarttext', text: 'NOBODY VOTED FOR NEGLECT. IT JUST SETTLED IN.', level: 'subtitle', position: [0.5, 0.2] },
  { turnId: 't05', offset: 14.0, kind: 'smarttext', text: 'THE ASSEMBLIES PRACTICED THE SAME MOVE', level: 'body', position: [0.5, 0.5] },
  { turnId: 't05', offset: 19.0, kind: 'smarttext', text: 'WE HOLD THE PURSE → WE HOLD THE POWER', level: 'title', position: [0.5, 0.75], color: '#7dd87d' },

  // t06: One fight where the purse won
  { turnId: 't06', offset: 0.8, kind: 'smarttext', text: 'ONE FIGHT WHERE THE PURSE WON', level: 'body', position: [0.5, 0.4] },

  // t07: Shute and Burnet
  { turnId: 't07', offset: 2.0, kind: 'smarttext', text: 'MASSACHUSETTS 1720s: SHUTE vs THE HOUSE', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't07', offset: 6.0, kind: 'smarttext', text: 'SHUTE: VOTE MY SALARY ONCE, PERMANENTLY', level: 'body', position: [0.5, 0.45] },
  { turnId: 't07', offset: 10.0, kind: 'smarttext', text: 'THE HOUSE: NO. YEAR BY YEAR.', level: 'subtitle', position: [0.5, 0.6], color: '#7dd87d' },
  { turnId: 't07', offset: 14.0, kind: 'smarttext', text: '1728: BURNET GETS £1,700 — STILL NO FIXED SALARY', level: 'body', position: [0.5, 0.75] },

  // t08: Was it just random town meetings?
  { turnId: 't08', offset: 0.8, kind: 'smarttext', text: 'JUST RANDOM TOWN MEETINGS?', level: 'body', position: [0.5, 0.4] },

  // t09: A little parliament of its own
  { turnId: 't09', offset: 2.0, kind: 'smarttext', text: 'EVERY COLONY RAN A LITTLE PARLIAMENT', level: 'title', position: [0.5, 0.2] },
  { turnId: 't09', offset: 6.0, kind: 'smarttext', text: 'elected lower house · appointed council · royal governor', level: 'body', position: [0.5, 0.5] },
  { turnId: 't09', offset: 10.0, kind: 'bubble', text: 'the English constitution, living in America', position: [0.5, 0.7], width: 400 },

  // t10: Not just taxes — their constitution
  { turnId: 't10', offset: 1.5, kind: 'smarttext', text: 'NOT JUST TAXES — THEIR CONSTITUTION', level: 'subtitle', position: [0.5, 0.35] },

  // t11: Impressment riot
  { turnId: 't11', offset: 2.0, kind: 'smarttext', text: 'LONDON COULD STILL BITE', level: 'title', position: [0.5, 0.2], entrance: 'stamp', color: '#ff8a8a' },
  { turnId: 't11', offset: 6.0, kind: 'smarttext', text: 'PRESS GANGS: MEN SEIZED OFF THE DOCKS', level: 'body', position: [0.5, 0.45] },
  { turnId: 't11', offset: 11.0, kind: 'smarttext', text: 'BOSTON 1747: 3 DAYS OF RIOT', level: 'subtitle', position: [0.5, 0.6] },
  { turnId: 't11', offset: 15.0, kind: 'bubble', text: 'hundreds rampaged — the biggest impressment riot ever', position: [0.5, 0.8], width: 440 },

  // t12: Loyal subjects who riot
  { turnId: 't12', offset: 1.5, kind: 'bubble', text: 'loyal British subjects… who\'ll riot for three days?', position: [0.5, 0.4], width: 400 },

  // t13: Loyal, not cuddly
  // t14: Prediction beat — 1728
  { turnId: 't14', offset: 2.0, kind: 'smarttext', text: 'YOUR TURN: IT\'S 1728', level: 'title', position: [0.5, 0.2] },
  { turnId: 't14', offset: 6.0, kind: 'bubble', text: 'the governor wants his salary voted once, permanently', position: [0.5, 0.5], width: 400 },
  { turnId: 't14', offset: 11.0, kind: 'smarttext', text: 'WHAT DO YOU DO?', level: 'subtitle', position: [0.5, 0.7] },

  // t16: Keep voting it year by year
  { turnId: 't16', offset: 1.0, kind: 'smarttext', text: 'KEEP VOTING IT YEAR BY YEAR', level: 'subtitle', position: [0.5, 0.4], color: '#7dd87d' },

  // t17: Exam chain
  { turnId: 't17', offset: 2.0, kind: 'smarttext', text: 'EXAM CHAIN: TRACE IT BACKWARD', level: 'title', position: [0.5, 0.2] },
  { turnId: 't17', offset: 6.0, kind: 'smarttext', text: '50 YEARS VOTING THE GOVERNOR\'S SALARY →', level: 'body', position: [0.5, 0.5] },
  { turnId: 't17', offset: 9.5, kind: 'smarttext', text: 'MONEY NEEDS THEIR CONSENT', level: 'subtitle', position: [0.5, 0.65] },

  // t18: The trap
  { turnId: 't18', offset: 2.0, kind: 'smarttext', text: 'THE TRAP', level: 'title', position: [0.5, 0.2], color: '#ff8a8a' },
  { turnId: 't18', offset: 5.0, kind: 'bubble', text: 'the king still appointed the governor and the council', position: [0.5, 0.5], width: 420 },
  { turnId: 't18', offset: 9.0, kind: 'smarttext', text: 'LEVERAGE INSIDE THE EMPIRE, NOT A FLAG OF ITS OWN', level: 'subtitle', position: [0.5, 0.75] },

  // t19: Box one check
  { turnId: 't19', offset: 0.8, kind: 'smarttext', text: '✅ BOX 1: THE PURSE', level: 'subtitle', position: [0.5, 0.8], color: '#7dd87d' },

  // t20: Box two — a courtroom
  { turnId: 't20', offset: 1.0, kind: 'smarttext', text: 'NEW YORK, 1735', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't20', offset: 4.0, kind: 'smarttext', text: 'JOHN PETER ZENGER — GERMAN IMMIGRANT PRINTER', level: 'body', position: [0.5, 0.45] },
  { turnId: 't20', offset: 8.0, kind: 'bubble', text: 'a year of roasting Governor Cosby in print', position: [0.5, 0.65], width: 400 },

  // t21: Roasting. In 1734.
  { turnId: 't21', offset: 0.8, kind: 'smarttext', text: 'ROASTING. IN 1734.', level: 'hero', position: [0.5, 0.4] },

  // t22: Cosby, Morris, the arrest
  { turnId: 't22', offset: 2.0, kind: 'smarttext', text: 'COSBY FIRES JUDGE LEWIS MORRIS', level: 'body', position: [0.5, 0.3] },
  { turnId: 't22', offset: 6.0, kind: 'smarttext', text: 'NOV 1734: ZENGER ARRESTED — SEDITIOUS LIBEL', level: 'subtitle', position: [0.5, 0.5], entrance: 'stamp' },
  { turnId: 't22', offset: 11.0, kind: 'bubble', text: 'his wife Anna keeps the paper printing without him', position: [0.5, 0.68], width: 400 },
  { turnId: 't22', offset: 16.0, kind: 'smarttext', text: 'NEARLY A YEAR IN A JAIL CELL', level: 'body', position: [0.5, 0.82] },

  // t23: Hamilton? Like the musical?
  { turnId: 't23', offset: 0.8, kind: 'bubble', text: 'Hamilton? Like the musical?', position: [0.5, 0.4], width: 340 },

  // t24: Andrew Hamilton — truth is the defense
  { turnId: 't24', offset: 1.5, kind: 'smarttext', text: 'ANDREW HAMILTON, PHILADELPHIA', level: 'title', position: [0.5, 0.2] },
  { turnId: 't24', offset: 5.0, kind: 'smarttext', text: 'TRUTH IS THE DEFENSE', level: 'hero', position: [0.5, 0.5], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't24', offset: 8.5, kind: 'bubble', text: 'the dangerous argument', position: [0.5, 0.75], width: 320 },

  // t25: The school paper (fun beat)
  { turnId: 't25', offset: 1.5, kind: 'bubble', text: 'my school\'s paper needs the principal\'s approval first', position: [0.5, 0.35], width: 420 },
  { turnId: 't25', offset: 6.0, kind: 'smarttext', text: 'ZENGER\'S JURY HAD THE OPPOSITE PROBLEM', level: 'subtitle', position: [0.5, 0.65] },

  // t26: De Lancey's courtroom
  { turnId: 't26', offset: 2.0, kind: 'smarttext', text: 'THE JUDGE: COSBY\'S OWN CHIEF JUSTICE', level: 'body', position: [0.5, 0.25] },
  { turnId: 't26', offset: 6.0, kind: 'smarttext', text: 'JAMES DE LANCEY: THE WORDS ARE THE CRIME', level: 'subtitle', position: [0.5, 0.45] },
  { turnId: 't26', offset: 10.0, kind: 'bubble', text: 'a true attack was WORSE than a false one — truth made the scandal bigger', position: [0.5, 0.65], width: 460 },
  { turnId: 't26', offset: 17.0, kind: 'smarttext', text: 'PUNISHMENT AFTER, NOT APPROVAL BEFORE', level: 'body', position: [0.5, 0.85] },

  // t27: What did the jury do?
  { turnId: 't27', offset: 0.8, kind: 'smarttext', text: 'SO WHAT DID THE JURY DO?', level: 'subtitle', position: [0.5, 0.4] },

  // t28: Prediction beat — the jury
  { turnId: 't28', offset: 2.0, kind: 'smarttext', text: 'YOUR TURN: YOU\'RE ON THE JURY', level: 'title', position: [0.5, 0.2] },
  { turnId: 't28', offset: 5.5, kind: 'bubble', text: 'the judge says the words are the crime — Hamilton says the words were true', position: [0.5, 0.55], width: 440 },

  // t30: The letter or the liberty
  { turnId: 't30', offset: 1.0, kind: 'smarttext', text: 'THE LETTER OF THE LAW, OR THE LIBERTY BEHIND IT', level: 'body', position: [0.5, 0.4] },

  // t31: They chose liberty
  { turnId: 't31', offset: 1.5, kind: 'smarttext', text: 'THEY CHOSE LIBERTY. ACQUITTED.', level: 'hero', position: [0.5, 0.3], entrance: 'stamp', color: '#7dd87d' },
  { turnId: 't31', offset: 6.0, kind: 'smarttext', text: 'THE JUDGE NEVER LET HAMILTON PROVE THE TRUTH', level: 'body', position: [0.5, 0.55] },
  { turnId: 't31', offset: 11.0, kind: 'smarttext', text: 'NO NEW LAW WAS WRITTEN THAT DAY', level: 'subtitle', position: [0.5, 0.7] },
  { turnId: 't31', offset: 16.0, kind: 'bubble', text: 'a colonial jury said a printer could criticize a governor and live', position: [0.5, 0.85], width: 440 },

  // t32: The warning
  { turnId: 't32', offset: 1.0, kind: 'smarttext', text: 'DON\'T WRITE: THE TRIAL MADE TRUTH A DEFENSE', level: 'subtitle', position: [0.5, 0.35], color: '#ff8a8a' },
  { turnId: 't32', offset: 4.5, kind: 'smarttext', text: 'THE LAW STAYED UGLY. THE JURY JUST REFUSED IT.', level: 'body', position: [0.5, 0.65] },

  // t33: Exam tip — who decides?
  { turnId: 't33', offset: 1.5, kind: 'smarttext', text: 'EXAM TIP: WHO DECIDES?', level: 'title', position: [0.5, 0.2] },
  { turnId: 't33', offset: 4.5, kind: 'bubble', text: 'libel stimulus → ask: jury or judge? That question echoes for a century', position: [0.5, 0.55], width: 440 },
  { turnId: 't33', offset: 8.0, kind: 'smarttext', text: '✅ BOX 2: THE ZENGER TRIAL', level: 'subtitle', position: [0.5, 0.8], color: '#7dd87d' },

  // t34: Box three — Anglicization
  { turnId: 't34', offset: 1.0, kind: 'smarttext', text: 'ANGLICIZATION', level: 'hero', position: [0.5, 0.35], entrance: 'stamp' },
  { turnId: 't34', offset: 3.5, kind: 'smarttext', text: 'colonists copying English life, ON PURPOSE', level: 'body', position: [0.5, 0.6] },

  // t35: Wait — less British?
  { turnId: 't35', offset: 1.0, kind: 'smarttext', text: 'WAIT. ANGLICIZATION = LESS BRITISH?', level: 'subtitle', position: [0.5, 0.35] },
  { turnId: 't35', offset: 4.5, kind: 'bubble', text: 'the colonies becoming… American?', position: [0.5, 0.65], width: 380 },

  // t36: Opposite — more British
  { turnId: 't36', offset: 2.0, kind: 'smarttext', text: 'OPPOSITE. MORE BRITISH.', level: 'title', position: [0.5, 0.2], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't36', offset: 5.0, kind: 'smarttext', text: 'English papers · tea · houses · clocks · wigs · china', level: 'body', position: [0.5, 0.45] },
  { turnId: 't36', offset: 9.0, kind: 'bubble', text: 'didn\'t want to look like provincial bumpkins', position: [0.5, 0.7], width: 400 },

  // t37: Trying really hard to be British
  // t38: The paradox
  { turnId: 't38', offset: 2.0, kind: 'smarttext', text: 'THE HARDER THEY TRIED…', level: 'body', position: [0.5, 0.25] },
  { turnId: 't38', offset: 6.0, kind: 'smarttext', text: '…THE SHARPER THE INSULT', level: 'subtitle', position: [0.5, 0.4] },
  { turnId: 't38', offset: 10.0, kind: 'bubble', text: 'reads the same papers as a London merchant — then gets vetoed by men who\'ve never seen Virginia', position: [0.5, 0.65], width: 460 },

  // t39: Having it both ways
  { turnId: 't39', offset: 1.0, kind: 'bubble', text: 'loyal when it helps, oppressed when it helps?', position: [0.5, 0.4], width: 400 },

  // t40: We're Englishmen
  { turnId: 't40', offset: 2.0, kind: 'smarttext', text: 'WE\'RE ENGLISHMEN.', level: 'hero', position: [0.5, 0.3], entrance: 'stamp' },
  { turnId: 't40', offset: 6.0, kind: 'smarttext', text: 'Englishmen get assemblies, trials, and presses', level: 'body', position: [0.5, 0.5] },
  { turnId: 't40', offset: 10.0, kind: 'smarttext', text: 'ENGLISHMEN DON\'T GET PUSHED AROUND', level: 'subtitle', position: [0.5, 0.65] },
  { turnId: 't40', offset: 14.0, kind: 'bubble', text: 'their Britishness was the weapon', position: [0.5, 0.8], width: 380 },

  // t41: The historians' fight
  { turnId: 't41', offset: 1.0, kind: 'bubble', text: 'were the colonies already independent by the 1760s?', position: [0.5, 0.4], width: 420 },

  // t42: Both halves have evidence
  { turnId: 't42', offset: 2.0, kind: 'smarttext', text: 'THE HISTORIANS\' FIGHT', level: 'title', position: [0.5, 0.2] },
  { turnId: 't42', offset: 5.5, kind: 'smarttext', text: 'already independent by the 1760s?', level: 'body', position: [0.5, 0.45] },
  { turnId: 't42', offset: 9.0, kind: 'bubble', text: 'self-governing in everything but name — or loyal subjects, petitioning the king like they meant it', position: [0.5, 0.68], width: 460 },

  // t43: Exam tip — which way does the arrow point?
  { turnId: 't43', offset: 1.5, kind: 'smarttext', text: 'EXAM TIP: WHICH WAY DOES THE ARROW POINT?', level: 'title', position: [0.5, 0.2] },
  { turnId: 't43', offset: 6.0, kind: 'smarttext', text: 'MORE BRITISH, NOT MORE AMERICAN', level: 'subtitle', position: [0.5, 0.5], color: '#ffd700' },
  { turnId: 't43', offset: 10.0, kind: 'bubble', text: 'English goods + English law in the source → Anglicization', position: [0.5, 0.72], width: 420 },

  // t44: Common mistake
  { turnId: 't44', offset: 1.0, kind: 'smarttext', text: 'COMMON MISTAKE', level: 'title', position: [0.5, 0.2], color: '#ff8a8a' },
  { turnId: 't44', offset: 4.0, kind: 'smarttext', text: 'DON\'T FILE ANGLICIZATION UNDER "BECOMING AMERICAN"', level: 'body', position: [0.5, 0.5] },
  { turnId: 't44', offset: 8.0, kind: 'smarttext', text: 'THE ARROW POINTS AT LONDON', level: 'subtitle', position: [0.5, 0.7] },

  // t45: Bridge to 1763
  { turnId: 't45', offset: 2.0, kind: 'smarttext', text: 'THE BRIDGE TO 1763', level: 'title', position: [0.5, 0.2] },
  { turnId: 't45', offset: 6.0, kind: 'smarttext', text: 'A CENTURY OF SELF-RULE, LEARNED WHILE LONDON LOOKED AWAY', level: 'subtitle', position: [0.5, 0.45] },
  { turnId: 't45', offset: 11.0, kind: 'smarttext', text: 'THEN LONDON WANTED ITS EMPIRE BACK', level: 'body', position: [0.5, 0.65], color: '#ff8a8a' },
  { turnId: 't45', offset: 15.0, kind: 'bubble', text: 'it didn\'t land like policy. It landed like a promise broken.', position: [0.5, 0.85], width: 440 },

  // t46: Are all three landed?
  { turnId: 't46', offset: 0.8, kind: 'smarttext', text: 'BEFORE THE TEST: ARE ALL THREE LANDED?', level: 'body', position: [0.5, 0.4] },

  // t47: Recap — box one
  { turnId: 't47', offset: 1.5, kind: 'smarttext', text: 'THREE BOXES, LET\'S LAND THEM', level: 'title', position: [0.5, 0.2] },
  { turnId: 't47', offset: 5.0, kind: 'smarttext', text: 'ONE: THE POWER OF THE PURSE', level: 'subtitle', position: [0.5, 0.4], color: '#7dd87d' },
  { turnId: 't47', offset: 9.0, kind: 'smarttext', text: 'assemblies voted taxes, budgets, the governor\'s salary', level: 'body', position: [0.5, 0.58] },
  { turnId: 't47', offset: 13.0, kind: 'smarttext', text: 'SHUTE AND BURNET, MASSACHUSETTS, 1720s', level: 'body', position: [0.5, 0.72] },
  { turnId: 't47', offset: 17.0, kind: 'bubble', text: 'the crown couldn\'t pass a budget without the people it taxed', position: [0.5, 0.88], width: 440 },

  // t48: Leverage, not sovereignty
  { turnId: 't48', offset: 1.0, kind: 'smarttext', text: 'LEVERAGE, NOT SOVEREIGNTY', level: 'subtitle', position: [0.5, 0.4] },

  // t49: Recap — box two
  { turnId: 't49', offset: 1.5, kind: 'smarttext', text: 'TWO: THE ZENGER TRIAL, 1735', level: 'subtitle', position: [0.5, 0.25], color: '#7dd87d' },
  { turnId: 't49', offset: 5.0, kind: 'smarttext', text: 'Cosby jails printer Zenger for criticizing him', level: 'body', position: [0.5, 0.5] },
  { turnId: 't49', offset: 9.0, kind: 'smarttext', text: 'HAMILTON ARGUES TRUTH — JURY ACQUITS', level: 'body', position: [0.5, 0.68] },

  // t50: Careful — Hamilton never got to prove it
  { turnId: 't50', offset: 1.0, kind: 'smarttext', text: 'CAREFUL: HAMILTON NEVER GOT TO PROVE IT', level: 'subtitle', position: [0.5, 0.3], color: '#ff8a8a' },
  { turnId: 't50', offset: 4.5, kind: 'bubble', text: 'the judge barred the evidence; the jury acquitted anyway', position: [0.5, 0.6], width: 420 },

  // t51: Recap — box three
  { turnId: 't51', offset: 1.5, kind: 'smarttext', text: 'THREE: ANGLICIZATION', level: 'subtitle', position: [0.5, 0.25], color: '#7dd87d' },
  { turnId: 't51', offset: 5.0, kind: 'smarttext', text: 'THE MORE BRITISH THEY FELT…', level: 'body', position: [0.5, 0.5] },
  { turnId: 't51', offset: 9.0, kind: 'smarttext', text: '…THE HARDER THEY DEMANDED FULL BRITISH RIGHTS', level: 'subtitle', position: [0.5, 0.65] },
  { turnId: 't51', offset: 13.0, kind: 'bubble', text: 'assemblies and presses and all', position: [0.5, 0.82], width: 360 },

  // t52: The debate rides with it
  { turnId: 't52', offset: 1.0, kind: 'smarttext', text: 'SELF-GOVERNING BY THE 1760s, OR LOYAL SUBJECTS?', level: 'body', position: [0.5, 0.35] },
  { turnId: 't52', offset: 5.0, kind: 'bubble', text: 'both halves have evidence', position: [0.5, 0.6], width: 320 },

  // t53: All three landed
  // t54: Self-test intro
  { turnId: 't54', offset: 1.5, kind: 'smarttext', text: 'THREE QUESTIONS, AP-SHAPED', level: 'title', position: [0.5, 0.2] },
  { turnId: 't54', offset: 5.0, kind: 'bubble', text: 'say your answer before I give it', position: [0.5, 0.45], width: 360 },
  { turnId: 't54', offset: 9.0, kind: 'smarttext', text: 'LONG ESSAY: THIS IS YOUR "EVALUATE THE EXTENT" PARAGRAPH', level: 'body', position: [0.5, 0.62] },
  { turnId: 't54', offset: 14.0, kind: 'smarttext', text: 'PURSE + ZENGER vs GOVERNORS + VETOES', level: 'subtitle', position: [0.5, 0.8] },

  // t55: Q1 — 1728 stimulus
  { turnId: 't55', offset: 1.5, kind: 'smarttext', text: 'Q1: MASSACHUSETTS HOUSE, SEPTEMBER 1728', level: 'title', position: [0.5, 0.2] },
  { turnId: 't55', offset: 6.0, kind: 'smarttext', text: '£1,700 GRANTED — NO FIXED SALARY', level: 'subtitle', position: [0.5, 0.5], color: '#ffd700' },
  { turnId: 't55', offset: 11.0, kind: 'bubble', text: 'what\'s the assembly\'s move, and why does it matter?', position: [0.5, 0.72], width: 420 },

  // t57: A1 — buys obedience one year at a time
  { turnId: 't57', offset: 1.5, kind: 'smarttext', text: 'BUYS OBEDIENCE ONE YEAR AT A TIME', level: 'subtitle', position: [0.5, 0.3], color: '#7dd87d' },
  { turnId: 't57', offset: 6.0, kind: 'smarttext', text: 'THE PURSE IS THE POWER', level: 'body', position: [0.5, 0.55] },
  { turnId: 't57', offset: 10.0, kind: 'bubble', text: 'a governor who comes back for his pay can\'t ignore the people who vote it', position: [0.5, 0.78], width: 440 },

  // t58: Q2 — Hamilton's actual words
  { turnId: 't58', offset: 1.5, kind: 'smarttext', text: 'Q2: HAMILTON\'S ACTUAL WORDS, 1735', level: 'title', position: [0.5, 0.2] },
  { turnId: 't58', offset: 5.0, kind: 'primarysource',
    documentTitle: 'Andrew Hamilton\'s Summation',
    authorAndDate: 'Zenger trial, New York, 1735',
    excerptText: 'it is not the cause of one poor printer, nor of New-York alone, which you are now trying... It is the best cause. It is the cause of liberty.',
    highlightedPhrase: 'the cause of liberty',
    hippType: 'Point of View',
    hippExplanation: 'Hamilton scales one printer\'s case to every colony — press freedom as every colonist\'s shared right.' },
  { turnId: 't58', offset: 13.0, kind: 'bubble', text: 'what\'s the bigger claim he\'s selling?', position: [0.5, 0.85], width: 380 },

  // t60: A2 — not one printer, every colony
  { turnId: 't60', offset: 1.5, kind: 'smarttext', text: 'NOT ONE PRINTER. EVERY COLONY.', level: 'subtitle', position: [0.5, 0.3], color: '#7dd87d' },
  { turnId: 't60', offset: 6.0, kind: 'smarttext', text: 'THE REVOLUTION\'S PAMPHLET WARS, 40 YEARS EARLY', level: 'body', position: [0.5, 0.55] },
  { turnId: 't60', offset: 11.0, kind: 'bubble', text: 'a jury that defends one printer defends every colonist', position: [0.5, 0.78], width: 440 },

  // t61: Q3 — the paradox
  { turnId: 't61', offset: 1.0, kind: 'smarttext', text: 'Q3: THE PARADOX', level: 'title', position: [0.5, 0.25] },
  { turnId: 't61', offset: 3.5, kind: 'bubble', text: 'more British AND more ready to revolt — can both be true?', position: [0.5, 0.55], width: 440 },

  // t63: A3 — yes, that's the paradox
  { turnId: 't63', offset: 1.5, kind: 'smarttext', text: 'YES. THAT\'S THE PARADOX.', level: 'subtitle', position: [0.5, 0.3], color: '#ffd700' },
  { turnId: 't63', offset: 6.0, kind: 'smarttext', text: 'drank the tea, read the English papers —', level: 'body', position: [0.5, 0.5] },
  { turnId: 't63', offset: 9.5, kind: 'smarttext', text: 'THEN DEMANDED THE RIGHTS OF ENGLISHMEN', level: 'subtitle', position: [0.5, 0.62] },
  { turnId: 't63', offset: 13.5, kind: 'bubble', text: 'identity loaded the spring', position: [0.5, 0.8], width: 340 },

  // t64: Check your three boxes
  // t65: Forward tease — French and Indian War
  { turnId: 't65', offset: 1.0, kind: 'smarttext', text: 'NEXT TIME: THE FRENCH AND INDIAN WAR', level: 'title', position: [0.5, 0.25] },
  { turnId: 't65', offset: 4.5, kind: 'bubble', text: 'a 22-year-old named Washington fires a shot in the Ohio country, 1754', position: [0.5, 0.55], width: 460 },

  // t66: Closing line — Marcus
  { turnId: 't66', offset: 0.8, kind: 'smarttext', text: 'A CENTURY OF SELF-RULE, LEARNED WHILE LONDON LOOKED AWAY —', level: 'subtitle', position: [0.5, 0.4] },

  // t67: Closing line — Maya
  ];

/* ------------------------------------------------------------------ */
/* Background selector                                                  */
/* ------------------------------------------------------------------ */
function getBackgroundForTurn(turnId: string | null, subBeatBg: string | null): string {
  if (subBeatBg) return subBeatBg;
  if (!turnId) return 'historic/u2e7/burgesses.jpg';
  const n = parseInt(turnId.slice(1), 10);
  // Box 1: power of the purse — House of Burgesses
  if (n <= 10) return 'historic/u2e7/burgesses.jpg';
  // Impressment riot — Boston harbor with warships
  if (n <= 13) return 'historic/u2e7/boston-1774.jpg';
  // Box 1 coda: prediction + exam tip + trap
  if (n <= 19) return 'historic/u2e7/burgesses.jpg';
  // Box 2: Zenger — the printing press
  if (n <= 33) return 'historic/u2e7/printing-press.jpg';
  // Box 3: Anglicization — the tea party
  if (n <= 45) return 'historic/u2e7/tea-party-1720.jpg';
  // Recap, self-test, closing — Boston with warships in the harbor
  return 'historic/u2e7/boston-1774.jpg';
}

/* ------------------------------------------------------------------ */
/* Main episode                                                         */
/* ------------------------------------------------------------------ */
export const U2E7Episode: React.FC<{ episodeData?: EpisodeData }> = ({ episodeData }) => {
  const data = React.useMemo(() => episodeData ?? loadEpisodeData('u2e7'), [episodeData]);
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

  // Tone: playful throughout, serious for the impressment-riot section
  const isSeriousSection = activeTurn && ['t11', 't12', 't13'].includes(activeTurn.id);

  const showHead = activeTurn &&
    (activeTurn.speaker === 'maya' || activeTurn.speaker === 'marcus') &&
    !(activeTurn.id === 't00' && turnElapsed < 3);

  // TODO: marcus-toon.webp doesn't exist yet — using maya-toon.webp as placeholder
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
            <TitleCard kicker="UNIT 2 · EPISODE 7:"
              title="COLONIAL SELF-GOVERNMENT" subline="THE PURSE · THE PRESS · THE PARADOX" at={activeStartFrame} />
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
                mapImage={beat.mapImage || 'historic/u2e7/boston-1774.jpg'}
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
