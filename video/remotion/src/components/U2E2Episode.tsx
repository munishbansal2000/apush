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
import { VersusPolarization } from './VersusPolarization';
import { VersusEntity } from './motionStudioTypes';
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


const EP = 'u2e2';

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
  textColor?: string;
  entrance?: 'stamp' | 'fade' | 'typewriter';
  bgImage?: string;
  width?: number;
  // versus
  clashTitle?: string;
  periodLabel?: string;
  entityA?: VersusEntity;
  entityB?: VersusEntity;
  verdictSummary?: string;
  versusDuration?: number;
  // primarysource
  documentTitle?: string;
  authorAndDate?: string;
  excerptText?: string;
  highlightedPhrase?: string;
  hippType?: 'Historical Context' | 'Intended Audience' | 'Purpose' | 'Point of View';
  hippExplanation?: string;
}

const SUB_BEATS: SubBeat[] = [
  // t00: Opening — three boxes
  { turnId: 't00', offset: 4.0, kind: 'smarttext', text: 'THREE BOXES', level: 'hero', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't00', offset: 10.0, kind: 'smarttext', text: '1. INDENTURED SERVITUDE', level: 'subtitle', position: [0.5, 0.45] },
  { turnId: 't00', offset: 14.0, kind: 'smarttext', text: "2. BACON'S REBELLION", level: 'subtitle', position: [0.5, 0.55] },
  { turnId: 't00', offset: 18.0, kind: 'smarttext', text: '3. THE SLAVE CODES OF 1705', level: 'subtitle', position: [0.5, 0.65] },
  { turnId: 't00', offset: 24.0, kind: 'bubble', text: "Circle the ones you couldn't explain right now", position: [0.5, 0.82], width: 420 },

  // t01: The deal
  { turnId: 't01', offset: 1.0, kind: 'bg-swap', bgImage: 'historic/u2e2/indenture-contract.jpg' },
  { turnId: 't01', offset: 2.0, kind: 'smarttext', text: 'THE DEAL: 4-7 YEARS FOR A BOAT TICKET', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't01', offset: 8.0, kind: 'bubble', text: 'paid up front with the passage', position: [0.5, 0.6], width: 360 },

  // t02: Freedom dues
  { turnId: 't02', offset: 1.0, kind: 'smarttext', text: 'FREEDOM DUES', level: 'title', position: [0.5, 0.3], entrance: 'stamp' },

  // t03: The payoff
  { turnId: 't03', offset: 2.0, kind: 'bubble', text: 'corn, clothes, maybe land', position: [0.5, 0.55], width: 320 },
  { turnId: 't03', offset: 5.0, kind: 'smarttext', text: 'then start over as a freeholder', level: 'body', position: [0.5, 0.32] },

  // t04: What did it feel like?
  // t05: The paper lied
  { turnId: 't05', offset: 2.0, kind: 'smarttext', text: 'THE CONTRACT BOUGHT AND SOLD', level: 'title', position: [0.5, 0.2] },
  { turnId: 't05', offset: 8.0, kind: 'bubble', text: 'run away = years tacked on', position: [0.5, 0.55], width: 340 },

  // t06: Detasseling (fun human beat)
  { turnId: 't06', offset: 2.0, kind: 'bubble', text: 'I detasseled corn one summer in Iowa. Lasted a week.', position: [0.5, 0.35], width: 400 },

  // t07: The deal worked too well + Berkeley's report (primary source)
  { turnId: 't07', offset: 2.0, kind: 'smarttext', text: 'THE DEAL WORKED TOO WELL', level: 'title', position: [0.5, 0.2] },
  { turnId: 't07', offset: 7.0, kind: 'smarttext', text: 'seasoning fevers eased - more servants survived', level: 'body', position: [0.5, 0.45] },
  { turnId: 't07', offset: 12.0, kind: 'smarttext', text: 'all wanted land. None was left.', level: 'body', position: [0.5, 0.6] },
  { turnId: 't07', offset: 16.0, kind: 'primarysource',
    documentTitle: "Governor Berkeley's Report to London",
    authorAndDate: 'Sir William Berkeley, 1676',
    excerptText: 'a people where six parts of seven at least are poor, indebted, discontented and armed',
    highlightedPhrase: 'six parts of seven',
    hippType: 'Historical Context',
    hippExplanation: 'Berkeley counted this as a threat, not a tragedy - his fear was the armed poor, not their poverty.' },

  // t08: Six of seven
  { turnId: 't08', offset: 0.5, kind: 'smarttext', text: 'SIX OF SEVEN. HE COUNTED THEM.', level: 'subtitle', position: [0.5, 0.4] },

  // t09: Past the fall line
  { turnId: 't09', offset: 2.0, kind: 'smarttext', text: 'PAST THE FALL LINE', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't09', offset: 6.0, kind: 'bubble', text: 'where ships stop - the hilly piedmont west of the rivers', position: [0.5, 0.55], width: 400 },

  // t11: Push west anyway (prediction answer)
  { turnId: 't11', offset: 1.0, kind: 'smarttext', text: 'YOU PUSH WEST ANYWAY', level: 'subtitle', position: [0.5, 0.3] },

  // t12: Exam trap — headright
  { turnId: 't12', offset: 2.0, kind: 'smarttext', text: 'EXAM TRAP: THE HEADRIGHT', level: 'title', position: [0.5, 0.2], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't12', offset: 8.0, kind: 'bubble', text: 'the land went to the planter who PAID - never the servant who sailed', position: [0.5, 0.55], width: 420 },

  // t13: Two systems — versus
  { turnId: 't13', offset: 3.0, kind: 'versus', versusDuration: 10,
    clashTitle: 'TWO SYSTEMS, NOT ONE',
    periodLabel: 'VIRGINIA, EARLY 1600s',
    entityA: {
      name: 'Indentured Servitude', subtitle: 'term labor',
      points: ['4-7 years, then freedom dues', 'contract could be bought and sold', 'overlapped with slavery for decades'],
      color: '#c9a227',
    },
    entityB: {
      name: 'Enslaved Labor', subtitle: 'lifetime slavery',
      points: ['for life, then hereditary', 'children belong to the planter', 'people as property'],
      color: '#ff8a8a',
    },
    verdictSummary: "Don't merge them. Different systems - that's the exam's trap." },

  // t14: Box one checked
  { turnId: 't14', offset: 1.0, kind: 'smarttext', text: 'BOX 1: INDENTURED SERVITUDE', level: 'subtitle', position: [0.5, 0.8], color: '#7dd87d' },

  // t15: Box two opens
  { turnId: 't15', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u2e2/jamestown-burning.jpg' },
  { turnId: 't15', offset: 1.0, kind: 'smarttext', text: "BOX 2: BACON'S REBELLION, 1676", level: 'title', position: [0.5, 0.25], entrance: 'stamp' },

  // t16: Frontier raids
  { turnId: 't16', offset: 2.0, kind: 'smarttext', text: 'RAIDS ON THE FRONTIER FARMS', level: 'title', position: [0.5, 0.2] },
  { turnId: 't16', offset: 7.0, kind: 'smarttext', text: 'the Doegs - the Susquehannocks dragged in', level: 'body', position: [0.5, 0.45] },
  { turnId: 't16', offset: 11.0, kind: 'bubble', text: 'Berkeley said no to war. Forts instead - cheaper.', position: [0.5, 0.64], width: 400 },

  // t17: Human shields
  { turnId: 't17', offset: 1.0, kind: 'bubble', text: 'farmers hear "forts," think "human shields"', position: [0.5, 0.4], width: 360 },

  // t18: Bacon enters
  { turnId: 't18', offset: 2.0, kind: 'smarttext', text: 'NATHANIEL BACON, 29', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't18', offset: 7.0, kind: 'bubble', text: 'demanded a militia commission - Berkeley refused', position: [0.5, 0.55], width: 380 },

  // t20: The army
  { turnId: 't20', offset: 2.0, kind: 'smarttext', text: '400-500 MEN', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't20', offset: 7.0, kind: 'bubble', text: 'attacked the Pamunkeys too - ENGLISH ALLIES', position: [0.5, 0.55], width: 380 },

  // t22: Declaration of the People (primary source)
  { turnId: 't22', offset: 4.0, kind: 'primarysource',
    documentTitle: 'The Declaration of the People',
    authorAndDate: 'Nathaniel Bacon, July 1676',
    excerptText: 'Unjust taxes, favorites in high office, the fur-trade monopoly, a government that would not protect the frontier.',
    highlightedPhrase: 'a government that would not protect the frontier',
    hippType: 'Purpose',
    hippExplanation: 'A manifesto written to recruit - a public list of grievances, not a legal document.' },

  // t23: Manifesto
  { turnId: 't23', offset: 1.0, kind: 'smarttext', text: 'A MANIFESTO', level: 'title', position: [0.5, 0.3], entrance: 'stamp' },

  // t24: Jamestown burns
  { turnId: 't24', offset: 2.0, kind: 'smarttext', text: 'SEPTEMBER 1676: JAMESTOWN BURNS', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't24', offset: 10.0, kind: 'bubble', text: 'a month later, dysentery killed Bacon', position: [0.5, 0.55], width: 360 },
  { turnId: 't24', offset: 15.0, kind: 'bubble', text: 'Berkeley hanged 23 of the leaders', position: [0.5, 0.32], width: 340 },

  // t25: Attributed
  // t26: Story, not transcript
  { turnId: 't26', offset: 1.0, kind: 'smarttext', text: 'treat it as the story, not the transcript', level: 'body', position: [0.5, 0.5] },

  // t27: Exam warning
  { turnId: 't27', offset: 2.0, kind: 'smarttext', text: 'NOT A SLAVE REVOLT', level: 'title', position: [0.5, 0.25], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't27', offset: 6.0, kind: 'bubble', text: 'the sides were class, not color. That IS the point.', position: [0.5, 0.55], width: 400 },

  // t28: Prediction beat
  { turnId: 't28', offset: 2.0, kind: 'smarttext', text: "1677: YOU'RE THE PLANTER", level: 'title', position: [0.5, 0.25] },
  { turnId: 't28', offset: 7.0, kind: 'bubble', text: 'your labor system just tried to kill you - what do you build?', position: [0.5, 0.55], width: 400 },

  // t30: The pivot
  { turnId: 't30', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u2e2/slave-ship.jpg' },
  { turnId: 't30', offset: 1.0, kind: 'smarttext', text: "A WORKFORCE THAT CAN'T UNITE", level: 'title', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't30', offset: 3.0, kind: 'smarttext', text: 'divided by race, for life', level: 'subtitle', position: [0.5, 0.5] },

  // t31: Lifetime + hereditary + 1682 supply shift
  { turnId: 't31', offset: 2.0, kind: 'smarttext', text: 'LIFETIME + HEREDITARY', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't31', offset: 7.0, kind: 'bubble', text: 'visibly distinct - no poor white man would mistake himself for one of them', position: [0.5, 0.55], width: 440 },
  { turnId: 't31', offset: 13.0, kind: 'smarttext', text: '1682: DUTCH MONOPOLY BREAKS', level: 'title', position: [0.5, 0.78] },
  { turnId: 't31', offset: 17.0, kind: 'smarttext', text: 'enslaved Africans got cheaper; English servants got scarcer', level: 'body', position: [0.5, 0.45] },

  // t32: In pieces
  { turnId: 't32', offset: 1.0, kind: 'smarttext', text: 'the code arrived in pieces', level: 'body', position: [0.5, 0.3] },

  // t33: John Punch 1640
  { turnId: 't33', offset: 1.0, kind: 'bg-swap', bgImage: 'historic/u2e2/brookes-diagram.jpg' },
  { turnId: 't33', offset: 2.0, kind: 'smarttext', text: '1640: JOHN PUNCH', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't33', offset: 7.0, kind: 'bubble', text: 'two white partners: +4 years. Punch: slavery for LIFE.', position: [0.5, 0.55], width: 420 },

  // t34: Same crime, different sentence
  // t35: 1662 mother rule + 1667 baptism
  { turnId: 't35', offset: 1.0, kind: 'bg-swap', bgImage: 'historic/u2e2/slave-ship.jpg' },
  { turnId: 't35', offset: 2.0, kind: 'smarttext', text: '1662: STATUS FOLLOWED THE MOTHER', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't35', offset: 8.0, kind: 'bubble', text: 'English law said the father. Virginia flipped it - slavery became hereditary.', position: [0.5, 0.55], width: 440 },
  { turnId: 't35', offset: 12.0, kind: 'bubble', text: "1667: baptism didn't free anybody", position: [0.5, 0.3], width: 340 },

  // t36: Copied from Barbados?
  { turnId: 't36', offset: 1.0, kind: 'smarttext', text: '1705: COPIED FROM BARBADOS?', level: 'title', position: [0.5, 0.3] },

  // t37: Not copied - consolidated; Barbados 1661 template
  { turnId: 't37', offset: 1.0, kind: 'bg-swap', bgImage: 'historic/u2e2/plantation.jpg' },
  { turnId: 't37', offset: 2.0, kind: 'smarttext', text: 'NOT COPIED - CONSOLIDATED', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't37', offset: 8.0, kind: 'smarttext', text: 'BARBADOS 1661', level: 'title', position: [0.5, 0.75], entrance: 'stamp' },
  { turnId: 't37', offset: 13.0, kind: 'bubble', text: 'people defined as property; punishments written as law', position: [0.5, 0.5], width: 400 },
  { turnId: 't37', offset: 18.0, kind: 'bubble', text: 'the code traveled with the planters', position: [0.5, 0.36], width: 340 },

  // t38: Carolina
  { turnId: 't38', offset: 1.0, kind: 'bubble', text: 'the Carolina planters came from Barbados', position: [0.5, 0.4], width: 360 },

  // t39: Carolina's south
  { turnId: 't39', offset: 1.0, kind: 'bg-swap', bgImage: 'historic/u2e2/slave-ship.jpg' },
  { turnId: 't39', offset: 2.0, kind: 'smarttext', text: "Carolina's south built to resemble the sugar islands", level: 'body', position: [0.5, 0.3] },

  // t40: What did 1705 say?
  { turnId: 't40', offset: 1.0, kind: 'smarttext', text: '1705: WHAT DID IT SAY?', level: 'title', position: [0.5, 0.25] },

  // t41: Real estate
  { turnId: 't41', offset: 2.0, kind: 'smarttext', text: 'PEOPLE AS REAL ESTATE', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't41', offset: 8.0, kind: 'bubble', text: '"any servant imported who wasn\'t Christian in their native country"', position: [0.5, 0.55], width: 440 },
  { turnId: 't41', offset: 13.0, kind: 'bubble', text: 'kill during punishment = no prosecution', position: [0.5, 0.3], width: 380, textColor: '#ff8a8a' },

  // t44: Exam tip — real estate
  { turnId: 't44', offset: 1.5, kind: 'smarttext', text: '"REAL ESTATE" = THE CODE TALKING', level: 'title', position: [0.5, 0.25], entrance: 'stamp', color: '#ffd700' },

  // t45: 1705 didn't start slavery
  { turnId: 't45', offset: 2.0, kind: 'smarttext', text: "1705 DIDN'T START SLAVERY", level: 'title', position: [0.5, 0.25], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't45', offset: 7.0, kind: 'smarttext', text: '1640 > 1662 > 1667 > 1705: decades gathered into one book', level: 'body', position: [0.5, 0.5] },

  // t46: The historian's fight — versus
  { turnId: 't46', offset: 3.0, kind: 'versus', versusDuration: 14,
    clashTitle: "THE HISTORIAN'S FIGHT",
    periodLabel: 'RACE AND SLAVERY - WHAT CAUSED WHAT?',
    entityA: {
      name: 'Edmund Morgan', subtitle: 'the cold calculation',
      points: ['planters engineered a workforce divided by race', 'racism as the tool, slavery as the machine', 'never again a united poor'],
      color: '#c9a227',
    },
    entityB: {
      name: 'Other Historians', subtitle: 'prejudice came first',
      points: ['racism was already there', 'prejudice made enslavement possible', 'not the other way around'],
      color: '#7db3d8',
    },
    verdictSummary: 'The codes are the fact. The motive is the argument - give both sides.' },

  // t48: Graders reward both sides
  { turnId: 't48', offset: 2.0, kind: 'bubble', text: 'give both sides - the graders reward that', position: [0.5, 0.4], width: 380 },

  // t49: Three boxes hold?
  { turnId: 't49', offset: 1.0, kind: 'smarttext', text: "THREE BOXES - LET'S SEE IF THEY HOLD", level: 'subtitle', position: [0.5, 0.5] },

  // t50: Recap box one
  { turnId: 't50', offset: 1.5, kind: 'smarttext', text: 'ONE: INDENTURED SERVITUDE', level: 'subtitle', position: [0.5, 0.3], color: '#7dd87d' },
  { turnId: 't50', offset: 6.0, kind: 'bubble', text: '4-7 years for a boat ticket; the headright paid the planter', position: [0.5, 0.55], width: 420 },
  { turnId: 't50', offset: 10.0, kind: 'smarttext', text: 'the system broke when the servants LIVED', level: 'subtitle', position: [0.5, 0.74] },

  // t51: Recap box two
  { turnId: 't51', offset: 1.5, kind: 'smarttext', text: "TWO: BACON'S REBELLION, 1676", level: 'subtitle', position: [0.5, 0.3], color: '#7dd87d' },
  { turnId: 't51', offset: 6.0, kind: 'smarttext', text: 'Declaration in July > Jamestown burned in September > dysentery in October', level: 'body', position: [0.5, 0.5] },
  { turnId: 't51', offset: 11.0, kind: 'bubble', text: 'the lesson: never again a united poor', position: [0.5, 0.7], width: 360 },

  // t52: Dysentery confirm
  { turnId: 't52', offset: 0.5, kind: 'bubble', text: 'Dysentery. About a month after the burning.', position: [0.5, 0.4], width: 360 },

  // t53: Recap box three + the flip setup
  { turnId: 't53', offset: 2.0, kind: 'smarttext', text: 'THREE: THE SLAVE CODES', level: 'subtitle', position: [0.5, 0.2], color: '#7dd87d' },
  { turnId: 't53', offset: 7.0, kind: 'smarttext', text: "1640's warning > 1662's mother rule > Barbados 1661 > Virginia's 1705", level: 'body', position: [0.5, 0.45] },
  { turnId: 't53', offset: 13.0, kind: 'smarttext', text: 'FOR LIFE. HEREDITARY. PROPERTY.', level: 'title', position: [0.5, 0.68], entrance: 'stamp' },
  { turnId: 't53', offset: 19.0, kind: 'smarttext', text: 'SO RACE CAUSED THE CODES -', level: 'title', position: [0.5, 0.88], entrance: 'stamp', color: '#ffd700' },

  // t54: Flip it
  { turnId: 't54', offset: 1.0, kind: 'smarttext', text: 'FLIP IT: THE CODES HELPED MAKE RACE', level: 'title', position: [0.5, 0.35], entrance: 'stamp', color: '#ffd700' },

  // t55: Three for three
  { turnId: 't55', offset: 1.5, kind: 'smarttext', text: 'THREE FOR THREE', level: 'subtitle', position: [0.5, 0.5], color: '#7dd87d' },

  // t56: AP questions
  { turnId: 't56', offset: 1.0, kind: 'smarttext', text: 'THREE QUESTIONS, AP-SHAPED', level: 'title', position: [0.5, 0.25] },

  // t57: Q1
  { turnId: 't57', offset: 2.0, kind: 'smarttext', text: "Q1: BERKELEY'S REPORT, 1676", level: 'title', position: [0.5, 0.2] },
  { turnId: 't57', offset: 7.0, kind: 'bubble', text: 'say your answer before I give it', position: [0.5, 0.48], width: 340 },
  { turnId: 't57', offset: 10.0, kind: 'smarttext', text: 'the giveaway: fear of class unity, not race', level: 'body', position: [0.5, 0.7] },

  // t59: A1
  { turnId: 't59', offset: 2.0, kind: 'smarttext', text: 'A1: HE FEARED THE ARMED POOR', level: 'title', position: [0.5, 0.2] },
  { turnId: 't59', offset: 8.0, kind: 'smarttext', text: 'servants + freedmen + enslaved Black people fought together', level: 'body', position: [0.5, 0.45] },
  { turnId: 't59', offset: 13.0, kind: 'smarttext', text: 'the planters spent 30 years engineering it away', level: 'body', position: [0.5, 0.62] },

  // t60: Q2
  { turnId: 't60', offset: 1.5, kind: 'smarttext', text: 'Q2: TWO REASONS FOR THE PIVOT', level: 'title', position: [0.5, 0.25] },

  // t62: A2
  { turnId: 't62', offset: 2.0, kind: 'smarttext', text: 'A2: POLITICS AND PRICE', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't62', offset: 7.0, kind: 'smarttext', text: 'politics: landless young white men were dangerous', level: 'body', position: [0.5, 0.45] },
  { turnId: 't62', offset: 11.0, kind: 'smarttext', text: 'price: 1682 - Dutch monopoly broke, enslaved Africans got cheaper', level: 'body', position: [0.5, 0.62] },

  // t63: Q3 — 1705 code primary source
  { turnId: 't63', offset: 2.0, kind: 'primarysource',
    documentTitle: 'The Virginia Slave Code of 1705',
    authorAndDate: 'Virginia General Assembly, 1705',
    excerptText: 'All Negro, mulatto and Indian slaves within this dominion... shall be held to be real estate.',
    highlightedPhrase: 'held to be real estate',
    hippType: 'Historical Context',
    hippExplanation: 'By 1705, custom had hardened into law - one-off punishments became a system.' },

  // t65: A3
  { turnId: 't65', offset: 2.0, kind: 'smarttext', text: 'A3: CUSTOM HARDENED INTO LAW', level: 'title', position: [0.5, 0.2] },
  { turnId: 't65', offset: 8.0, kind: 'smarttext', text: '1640: John Punch - one court, one life sentence', level: 'body', position: [0.5, 0.45] },
  { turnId: 't65', offset: 13.0, kind: 'smarttext', text: '1705: written down for everyone - for life, hereditary', level: 'body', position: [0.5, 0.62] },

  // t66: Fast bonus
  { turnId: 't66', offset: 1.0, kind: 'smarttext', text: 'FAST BONUS', level: 'title', position: [0.5, 0.25], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't66', offset: 2.5, kind: 'bubble', text: 'the slave code Virginia copied: which island, which year?', position: [0.5, 0.55], width: 380 },

  // t68: Barbados, 1661
  { turnId: 't68', offset: 0.5, kind: 'smarttext', text: 'BARBADOS, 1661', level: 'hero', position: [0.5, 0.4], entrance: 'stamp' },

  // t69: LEQ tie-in
  { turnId: 't69', offset: 1.0, kind: 'bg-swap', bgImage: 'historic/u2e2/virginia-plantation.jpg' },
  { turnId: 't69', offset: 2.0, kind: 'smarttext', text: 'LEQ: CHANGE OVER TIME', level: 'title', position: [0.5, 0.2] },
  { turnId: 't69', offset: 7.0, kind: 'smarttext', text: 'changed: servants > enslaved Africans', level: 'body', position: [0.5, 0.45] },
  { turnId: 't69', offset: 12.0, kind: 'smarttext', text: "stayed: tobacco's hunger for land and labor", level: 'body', position: [0.5, 0.6] },
  { turnId: 't69', offset: 17.0, kind: 'smarttext', text: 'NEXT: THE COLONIES SORT INTO REGIONS', level: 'subtitle', position: [0.5, 0.3], color: '#7db3d8' },

  // t70: Closing line part one
  { turnId: 't70', offset: 0.5, kind: 'smarttext', text: 'One rebellion showed the planters the poor could fight together -', level: 'body', position: [0.5, 0.5] },

  // t71: Closing line part two (held beat landing)
  { turnId: 't71', offset: 0.5, kind: 'smarttext', text: "SO THE CODES MADE SURE THEY'D NEVER FIGHT TOGETHER AGAIN", level: 'title', position: [0.5, 0.4], entrance: 'stamp' },
];

/* ------------------------------------------------------------------ */
/* Background selector                                                  */
/* ------------------------------------------------------------------ */
function getBackgroundForTurn(turnId: string | null, subBeatBg: string | null): string {
  if (subBeatBg) return subBeatBg;
  if (!turnId) return 'historic/u2e1/colonial-map.jpg';
  const n = parseInt(turnId.slice(1), 10);
  // Opening
  if (n === 0) return 'historic/u2e1/colonial-map.jpg';
  // Box 1: indentured servitude — an actual indenture contract
  if (n <= 14) return 'historic/u2e2/indenture-contract.jpg';
  // Box 2: Bacon's Rebellion — Jamestown burning engraving
  if (n <= 28) return 'historic/u2e2/jamestown-burning.jpg';
  // Box 3: slave codes — the Middle Passage
  if (n <= 55) return 'historic/u2e2/slave-ship.jpg';
  // Exam questions — Barbados plantation labor
  if (n <= 68) return 'historic/u2e2/plantation.jpg';
  // Closing
  return 'historic/u2e2/virginia-plantation.jpg';
}

/* ------------------------------------------------------------------ */
/* Main episode                                                         */
/* ------------------------------------------------------------------ */
export const U2E2Episode: React.FC<{ episodeData?: EpisodeData }> = ({ episodeData }) => {
  const data = episodeData ?? loadEpisodeData('u2e2');
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

  // Tone: serious once the episode pivots to race and the slave codes (box 3 onward)
  const turnNum = activeTurn ? parseInt(activeTurn.id.slice(1), 10) : -1;
  const isSeriousSection = turnNum >= 30;

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
            <TitleCard kicker="UNIT 2 · EPISODE 2:"
              title="FROM SERVITUDE TO SLAVERY" subline="INDENTURED SERVITUDE · BACON'S REBELLION · THE SLAVE CODES" at={activeStartFrame} />
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
