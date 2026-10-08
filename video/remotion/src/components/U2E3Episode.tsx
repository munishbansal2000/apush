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


const EP = 'u2e3';

/* ------------------------------------------------------------------ */
/* Sub-beats: timed visual events. offset = seconds into the turn.      */
/* ------------------------------------------------------------------ */
interface SubBeat {
  turnId: string;
  offset: number;
  kind: 'smarttext' | 'bubble' | 'gravity' | 'bg-swap' | 'leader' | 'mapjourney' | 'primarysource' | 'versus' | 'timeline';
  text?: string;
  textColor?: string;
  position?: [number, number];
  level?: 'hero' | 'title' | 'subtitle' | 'body';
  color?: string;
  entrance?: 'stamp' | 'fade' | 'typewriter';
  bgImage?: string;
  width?: number;
  // Versus props
  versusDuration?: number;
  clashTitle?: string;
  periodLabel?: string;
  entityA?: VersusEntity;
  entityB?: VersusEntity;
  verdictSummary?: string;
  // PrimarySource props
  documentTitle?: string;
  authorAndDate?: string;
  excerptText?: string;
  highlightedPhrase?: string;
  hippType?: 'Historical Context' | 'Intended Audience' | 'Purpose' | 'Point of View';
  hippExplanation?: string;
}

const SUB_BEATS: SubBeat[] = [
  // t00: Cold open — one cascade chain: sermon, dissenters, war, three boxes
  { turnId: 't00', offset: 3.0, kind: 'smarttext', text: 'A CITY UPON A HILL', level: 'hero', position: [0.5, 0.22] },
  { turnId: 't00', offset: 11.0, kind: 'smarttext', text: 'TWO DISSENTERS BOSTON COULDN\'T SILENCE', level: 'subtitle', position: [0.5, 0.40] },
  { turnId: 't00', offset: 15.0, kind: 'smarttext', text: 'A WAR THAT NEARLY ERASED NEW ENGLAND', level: 'subtitle', position: [0.5, 0.52] },
  { turnId: 't00', offset: 20.0, kind: 'smarttext', text: 'BOX 1: THE GREAT MIGRATION', level: 'subtitle', position: [0.5, 0.64] },
  { turnId: 't00', offset: 24.0, kind: 'smarttext', text: 'BOX 2: THE BANISHED DISSENTERS', level: 'subtitle', position: [0.5, 0.76] },
  { turnId: 't00', offset: 28.0, kind: 'smarttext', text: 'BOX 3: KING PHILIP\'S WAR', level: 'subtitle', position: [0.5, 0.88] },
  { turnId: 't00', offset: 33.0, kind: 'bubble', text: 'Circle the ones you couldn\'t explain right now', position: [0.5, 0.50], width: 400 },

  // t01: Laud's squeeze, the 1629 charter
  { turnId: 't01', offset: 1.0, kind: 'smarttext', text: 'CHARLES I + ARCHBISHOP LAUD: THE SQUEEZE', level: 'subtitle', position: [0.5, 0.25] },
  { turnId: 't01', offset: 8.0, kind: 'smarttext', text: '1629: MASSACHUSETTS BAY COMPANY CHARTER', level: 'title', position: [0.5, 0.36], entrance: 'stamp' },
  { turnId: 't01', offset: 13.0, kind: 'bubble', text: 'the charter never pinned the headquarters in England', position: [0.5, 0.55], width: 400 },

  // t03: Winthrop's sermon aboard the Arbella
  { turnId: 't03', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u2e3/winthrop.jpg' },
  { turnId: 't03', offset: 6.0, kind: 'smarttext', text: '"A MODEL OF CHRISTIAN CHARITY"', level: 'title', position: [0.5, 0.2] },
  { turnId: 't03', offset: 9.0, kind: 'primarysource',
    documentTitle: 'A Model of Christian Charity',
    authorAndDate: 'John Winthrop, aboard the Arbella, 1630',
    excerptText: 'The colony would be as a city upon a hill, and "the eyes of all people are upon us."',
    highlightedPhrase: 'as a city upon a hill',
    hippType: 'Purpose',
    hippExplanation: 'Preached before landing - the colony as a watched example: succeed and the world sees, fail and the world sees.' },

  // t04: Pilgrims, 1620?
  { turnId: 't04', offset: 1.0, kind: 'bubble', text: 'The Pilgrims, 1620: same people, right?', position: [0.5, 0.35], width: 380 },

  // t05: Separatists vs Puritans
  { turnId: 't05', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u2e3/mayflower-harbor.jpg' },
  { turnId: 't05', offset: 2.0, kind: 'smarttext', text: '1620 PLYMOUTH: SEPARATISTS, OUT OF THE CHURCH', level: 'body', position: [0.5, 0.42] },
  { turnId: 't05', offset: 6.0, kind: 'smarttext', text: '1630 BAY: PURITANS, PURIFY FROM INSIDE', level: 'body', position: [0.5, 0.52] },

  // t06: funny-hat line
  { turnId: 't06', offset: 1.0, kind: 'bubble', text: 'funny-hat people are not city-on-a-hill people', position: [0.5, 0.35], width: 380 },

  // t07: thrown a book
  { turnId: 't07', offset: 0.5, kind: 'bubble', text: '"would have thrown a book at the hats"', position: [0.5, 0.35], width: 360 },

  // t08: sermon, and kind of a threat
  { turnId: 't08', offset: 1.0, kind: 'smarttext', text: '"CITY UPON A HILL" - A SERMON, AND A THREAT', level: 'subtitle', position: [0.5, 0.3] },

  // t09: the threat + presidential borrowers
  { turnId: 't09', offset: 1.0, kind: 'smarttext', text: 'THE WORLD WATCHES - EITHER WAY', level: 'subtitle', position: [0.5, 0.25] },
  { turnId: 't09', offset: 7.0, kind: 'bubble', text: 'Kennedy borrowed it. Reagan borrowed it.', position: [0.5, 0.5], width: 380 },
  { turnId: 't09', offset: 11.0, kind: 'bubble', text: '"means whatever the speaker needs"', position: [0.5, 0.65], width: 340 },

  // t11: the Great Migration
  { turnId: 't11', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u2e3/new-england-1634.jpg' },
  { turnId: 't11', offset: 2.0, kind: 'smarttext', text: '20,000+ CROSSED BY 1640', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't11', offset: 7.0, kind: 'smarttext', text: 'NOT fortune-hunters: farmers, carpenters, textile workers', level: 'body', position: [0.5, 0.5] },
  { turnId: 't11', offset: 11.0, kind: 'smarttext', text: 'CAME AS FAMILIES', level: 'subtitle', position: [0.5, 0.62] },
  { turnId: 't11', offset: 15.0, kind: 'bubble', text: '10 new towns in a decade, then 130+ by 1700', position: [0.5, 0.8], width: 400 },

  // t12: what made a Puritan town
  { turnId: 't12', offset: 1.0, kind: 'smarttext', text: 'WHAT MADE A PURITAN TOWN A PURITAN TOWN?', level: 'subtitle', position: [0.5, 0.3] },

  // t13: the covenant
  { turnId: 't13', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u2e3/meetinghouse.png' },
  { turnId: 't13', offset: 2.0, kind: 'smarttext', text: 'THE COVENANT: A CONTRACT WITH GOD', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't13', offset: 9.0, kind: 'smarttext', text: 'DEDHAM, 1636: THE WHOLE TOWN SIGNED', level: 'subtitle', position: [0.5, 0.55] },
  { turnId: 't13', offset: 14.0, kind: 'bubble', text: 'live, settle disputes, tax themselves - all by covenant', position: [0.5, 0.72], width: 420 },
  { turnId: 't13', offset: 17.0, kind: 'smarttext', text: 'CHURCH ON SUNDAY, TOWN MEETING ON MONDAY', level: 'body', position: [0.5, 0.38] },

  // t14: sixth-grade meetinghouse
  { turnId: 't14', offset: 2.0, kind: 'bubble', text: '"I toured a meetinghouse in sixth grade and thought it was a barn"', position: [0.5, 0.35], width: 420 },

  // t15: exam tip — the Pilgrim-Puritan swap
  { turnId: 't15', offset: 1.0, kind: 'smarttext', text: 'EXAM TIP: THE PILGRIM-PURITAN SWAP', level: 'title', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't15', offset: 5.0, kind: 'smarttext', text: '1620 PLYMOUTH: SEPARATISTS, OUT', level: 'body', position: [0.5, 0.42] },
  { turnId: 't15', offset: 9.0, kind: 'smarttext', text: '1630 BAY: PURITANS, PURIFY FROM INSIDE', level: 'body', position: [0.5, 0.58] },
  { turnId: 't15', offset: 12.5, kind: 'smarttext', text: 'READ THE YEAR BEFORE YOU PICK', level: 'subtitle', position: [0.5, 0.74] },

  // t16: common mistake — not religious freedom for everyone
  { turnId: 't16', offset: 1.0, kind: 'smarttext', text: 'COMMON MISTAKE: NOT "RELIGIOUS FREEDOM FOR ALL"', level: 'subtitle', position: [0.5, 0.3], color: '#ff8a8a' },
  { turnId: 't16', offset: 5.0, kind: 'bubble', text: '"They came for their own. Ask the dissenters."', position: [0.5, 0.55], width: 400 },

  // t17: box one checked + prediction beat
  { turnId: 't17', offset: 1.0, kind: 'smarttext', text: 'BOX 1: THE GREAT MIGRATION - CHECKED', level: 'subtitle', position: [0.5, 0.8], color: '#7dd87d' },
  { turnId: 't17', offset: 6.0, kind: 'bubble', text: 'A minister preaches what Boston hates. What happens?', position: [0.5, 0.35], width: 420 },

  // t18: prediction pause
  { turnId: 't18', offset: 0.5, kind: 'smarttext', text: 'YOUR TURN: WHAT HAPPENS TO HIM?', level: 'subtitle', position: [0.5, 0.45] },

  // t19: he gets banished
  { turnId: 't19', offset: 0.5, kind: 'smarttext', text: 'HE GETS BANISHED', level: 'hero', position: [0.5, 0.3], entrance: 'stamp' },
  { turnId: 't19', offset: 3.0, kind: 'smarttext', text: 'BOX 2: THE BANISHED DISSENTERS', level: 'title', position: [0.5, 0.55] },

  // t20: Roger Williams
  { turnId: 't20', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u2e3/williams-statue.jpg' },
  { turnId: 't20', offset: 2.0, kind: 'smarttext', text: 'ROGER WILLIAMS, MINISTER AT SALEM', level: 'title', position: [0.5, 0.2] },
  { turnId: 't20', offset: 7.0, kind: 'bubble', text: '"sharp, brilliant, impossible"', position: [0.5, 0.45], width: 320 },
  { turnId: 't20', offset: 10.0, kind: 'smarttext', text: 'TWO THINGS BOSTON COULDN\'T STAND', level: 'subtitle', position: [0.5, 0.6] },
  { turnId: 't20', offset: 13.0, kind: 'smarttext', text: '1. NO RIGHT TO NATIVE LAND · 2. SOUL LIBERTY', level: 'body', position: [0.5, 0.72] },

  // t22: banished 1635, Providence spring 1636
  { turnId: 't22', offset: 1.0, kind: 'smarttext', text: '1635: BANISHED', level: 'title', position: [0.5, 0.25], entrance: 'stamp', color: '#ff8a8a' },
  { turnId: 't22', offset: 6.0, kind: 'bubble', text: 'fled south in winter - meant for England, ran for the woods', position: [0.5, 0.5], width: 420 },
  { turnId: 't22', offset: 10.0, kind: 'smarttext', text: 'SPRING 1636: PROVIDENCE - LAND BOUGHT, NOT TAKEN', level: 'body', position: [0.5, 0.72] },

  // t23: the deed question
  { turnId: 't23', offset: 1.0, kind: 'bubble', text: 'Did the sachems mean "selling" the way he meant "buying"?', position: [0.5, 0.4], width: 440 },

  // t24: one deed, two meanings
  { turnId: 't24', offset: 1.0, kind: 'smarttext', text: 'ONE DEED, TWO MEANINGS', level: 'subtitle', position: [0.5, 0.35] },

  // t25: Anne Hutchinson
  { turnId: 't25', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u2e3/hutchinson-trial.jpg' },
  { turnId: 't25', offset: 2.0, kind: 'smarttext', text: 'ANNE HUTCHINSON', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't25', offset: 5.0, kind: 'bubble', text: 'Bible meetings at home - women, then men, then the magistrates', position: [0.5, 0.5], width: 420 },
  { turnId: 't25', offset: 10.0, kind: 'smarttext', text: 'SHE ACCUSED THE MINISTERS: WORKS, NOT GRACE', level: 'subtitle', position: [0.5, 0.68] },

  // t26: works vs grace
  { turnId: 't26', offset: 0.5, kind: 'smarttext', text: 'WORKS vs GRACE', level: 'title', position: [0.5, 0.3] },

  // t27: versus — works vs grace
  { turnId: 't27', offset: 0.5, kind: 'versus', versusDuration: 9,
    clashTitle: 'WORKS vs GRACE',
    periodLabel: 'HUTCHINSON\'S ACCUSATION, 1637',
    entityA: {
      name: 'Covenant of Works', subtitle: 'Boston\'s ministers preach it',
      points: ['earn salvation by behaving', 'follow the moral law', 'do right, get saved'],
      color: '#c9a227',
    },
    entityB: {
      name: 'Covenant of Grace', subtitle: 'Hutchinson\'s line',
      points: ['God decides - you can\'t earn it', 'faith, not good deeds', 'she said it out loud, in front of them'],
      color: '#7db3d8',
    },
    verdictSummary: 'Boston took the works side. Know which side the ministers stood on.' },

  // t29: the trial
  { turnId: 't29', offset: 2.0, kind: 'smarttext', text: 'NOV 1637: TRIED WHILE PREGNANT - SCRIPTURE HER DEFENSE', level: 'body', position: [0.5, 0.75] },
  { turnId: 't29', offset: 8.0, kind: 'smarttext', text: 'CONVICTED', level: 'title', position: [0.5, 0.3], entrance: 'stamp', color: '#ff8a8a' },
  { turnId: 't29', offset: 12.0, kind: 'smarttext', text: 'EXCOMMUNICATED, EARLY 1638', level: 'body', position: [0.5, 0.52] },
  { turnId: 't29', offset: 16.0, kind: 'bubble', text: 'March 1638: Portsmouth, on Aquidneck - at Williams\'s suggestion', position: [0.5, 0.68], width: 420 },

  // t30: Boston still wasn't done
  { turnId: 't30', offset: 0.5, kind: 'bubble', text: '"Exiled while pregnant - and Boston still wasn\'t done?"', position: [0.5, 0.35], width: 360 },

  // t31: God's judgment
  { turnId: 't31', offset: 1.0, kind: 'smarttext', text: 'WINTHROP: "GOD\'S JUDGMENT"', level: 'subtitle', position: [0.5, 0.35], color: '#ff8a8a' },

  // t33: 1643
  { turnId: 't33', offset: 1.0, kind: 'smarttext', text: '1643: KILLED IN A NATIVE RAID', level: 'subtitle', position: [0.5, 0.35], color: '#ff8a8a' },

  // t34: heretic or feminist?
  { turnId: 't34', offset: 0.5, kind: 'smarttext', text: 'HERETIC OR FEMINIST?', level: 'title', position: [0.5, 0.3] },

  // t35: versus — heretic or feminist
  { turnId: 't35', offset: 0.5, kind: 'versus', versusDuration: 12,
    clashTitle: 'HERETIC OR FEMINIST?',
    periodLabel: 'ANNE HUTCHINSON, THEN AND NOW',
    entityA: {
      name: 'Winthrop\'s Heretic', subtitle: 'Boston\'s verdict',
      points: ['threatening the whole covenant', 'traducing the ministers', 'banished in 1638'],
      color: '#ff8a8a',
    },
    entityB: {
      name: 'Later Readers\' Feminist', subtitle: 'the modern verdict',
      points: ['first American feminist', 'claimed the right to read Scripture herself', 'a woman who would not be silenced'],
      color: '#7dd87d',
    },
    verdictSummary: 'Don\'t flatten her to one label. Hold both - that\'s the move.' },

  // t36: exam move on Williams
  { turnId: 't36', offset: 1.0, kind: 'smarttext', text: 'EXAM MOVE: WILLIAMS = THE SAME TWO THINGS', level: 'title', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't36', offset: 5.0, kind: 'smarttext', text: '1. FAIR PURCHASE OF NATIVE LAND · 2. CHURCH OUT OF GOVERNMENT', level: 'body', position: [0.5, 0.5] },

  // t37: don't flatten Hutchinson
  { turnId: 't37', offset: 1.0, kind: 'smarttext', text: 'COMMON MISTAKE: DON\'T FLATTEN HUTCHINSON', level: 'subtitle', position: [0.5, 0.3], color: '#ff8a8a' },
  { turnId: 't37', offset: 4.5, kind: 'bubble', text: '"Boston\'s heretic is later readers\' feminist. Hold both."', position: [0.5, 0.55], width: 420 },

  // t38: last box
  { turnId: 't38', offset: 0.5, kind: 'smarttext', text: 'BOX 3: KING PHILIP\'S WAR', level: 'title', position: [0.5, 0.3] },

  // t39: King Philip's War
  { turnId: 't39', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u2e3/king-philip.jpg' },
  { turnId: 't39', offset: 1.0, kind: 'smarttext', text: 'KING PHILIP\'S WAR, 1675-76', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't39', offset: 5.0, kind: 'smarttext', text: 'METACOM - SON OF MASSASOIT (PEACE, 1621)', level: 'body', position: [0.5, 0.42] },
  { turnId: 't39', offset: 10.0, kind: 'smarttext', text: 'GRIEVANCES, PILED UP FOR DECADES', level: 'subtitle', position: [0.5, 0.56] },
  { turnId: 't39', offset: 14.0, kind: 'smarttext', text: 'LAND · LIVESTOCK · MISSIONARIES', level: 'body', position: [0.5, 0.70] },

  // t41: Sassamon
  { turnId: 't41', offset: 1.0, kind: 'smarttext', text: 'JOHN SASSAMON', level: 'title', position: [0.5, 0.2] },
  { turnId: 't41', offset: 5.0, kind: 'bubble', text: '"Harvard-educated praying Indian" - Metacom\'s interpreter, then the English\'s warning', position: [0.5, 0.5], width: 440 },
  { turnId: 't41', offset: 12.0, kind: 'smarttext', text: 'JUNE 1675: THREE WAMPANOAGS HANGED', level: 'subtitle', position: [0.5, 0.72], color: '#ff8a8a' },

  // t42: prediction beat
  { turnId: 't42', offset: 1.0, kind: 'bubble', text: '"Three men hanged. Fifty years of pressure. Why does THIS light the fuse?"', position: [0.5, 0.35], width: 440 },

  // t43: prediction pause
  { turnId: 't43', offset: 0.5, kind: 'smarttext', text: 'WHY DOES *THIS* LIGHT THE FUSE?', level: 'subtitle', position: [0.5, 0.5] },

  // t44: not land anymore — law
  { turnId: 't44', offset: 0.5, kind: 'smarttext', text: 'NOT LAND ANYMORE - LAW', level: 'subtitle', position: [0.5, 0.3] },
  { turnId: 't44', offset: 3.0, kind: 'smarttext', text: 'A PLYMOUTH COURT CLAIMING HIS MEN', level: 'body', position: [0.5, 0.48] },

  // t45: Great Swamp, frontier burns, Providence burns
  { turnId: 't45', offset: 6.0, kind: 'smarttext', text: 'DEC 1675: THE GREAT SWAMP - WINTER FORT BURNED', level: 'subtitle', position: [0.5, 0.25] },
  { turnId: 't45', offset: 11.0, kind: 'bg-swap', bgImage: 'historic/u2e2/jamestown-burning.jpg' },
  { turnId: 't45', offset: 12.0, kind: 'smarttext', text: 'SPRING 1676: THE FRONTIER BURNED BACK', level: 'subtitle', position: [0.5, 0.5] },
  { turnId: 't45', offset: 16.0, kind: 'bubble', text: '"Williams walked out to meet the war party himself - and they burned Providence anyway"', position: [0.5, 0.72], width: 440 },

  // t47: Metacom killed
  { turnId: 't47', offset: 1.0, kind: 'smarttext', text: 'AUGUST 1676: METACOM KILLED', level: 'title', position: [0.5, 0.3], color: '#ff8a8a' },

  // t49: Britannica's count
  { turnId: 't49', offset: 1.0, kind: 'smarttext', text: '17 DESTROYED · 50 DAMAGED', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't49', offset: 6.0, kind: 'smarttext', text: 'CAPTIVES SOLD INTO SLAVERY, SHIPPED WEST INDIES', level: 'body', position: [0.5, 0.48], color: '#ff8a8a' },
  { turnId: 't49', offset: 10.0, kind: 'smarttext', text: '40%+ OF THE WAMPANOAGS DEAD', level: 'subtitle', position: [0.5, 0.66] },

  // t50: real or dramatic?
  { turnId: 't50', offset: 0.5, kind: 'bubble', text: '"Deadliest war per capita in American history - real or dramatic?"', position: [0.5, 0.35], width: 420 },

  // t51: real, with the per-capita part
  { turnId: 't51', offset: 1.0, kind: 'smarttext', text: 'REAL - WITH THE PER-CAPITA PART ATTACHED', level: 'subtitle', position: [0.5, 0.3] },
  { turnId: 't51', offset: 8.0, kind: 'smarttext', text: 'BRITANNICA: ONE OF THE BLOODIEST CONFLICTS PER CAPITA', level: 'body', position: [0.5, 0.52] },
  { turnId: 't51', offset: 12.0, kind: 'smarttext', text: 'SAY "PER CAPITA" OR IT\'S WRONG', level: 'subtitle', position: [0.5, 0.68], color: '#ffd700' },

  // t52: the captive's book
  { turnId: 't52', offset: 1.0, kind: 'bubble', text: '"The book everyone read afterward was written by a captive"', position: [0.5, 0.35], width: 400 },

  // t53: Mary Rowlandson
  { turnId: 't53', offset: 2.0, kind: 'smarttext', text: 'MARY ROWLANDSON: TAKEN AT LANCASTER, FEB 1676', level: 'body', position: [0.5, 0.3] },
  { turnId: 't53', offset: 11.0, kind: 'primarysource',
    documentTitle: 'A Narrative of the Captivity and Restoration of Mrs. Mary Rowlandson',
    authorAndDate: 'Mary Rowlandson, published 1682',
    excerptText: 'Taken at Lancaster in February 1676, captive three months, ransomed in May - then the book went through more than thirty printings.',
    highlightedPhrase: 'more than thirty printings',
    hippType: 'Point of View',
    hippExplanation: 'A Puritan captive\'s telling - the war as the English felt it. Ask whose view is missing.' },

  // t54: bestseller on a forced march
  { turnId: 't54', offset: 1.0, kind: 'bubble', text: '"A bestseller written on a forced march"', position: [0.5, 0.4], width: 380 },

  // t56: Native power broken
  { turnId: 't56', offset: 1.0, kind: 'smarttext', text: 'NATIVE POWER IN NEW ENGLAND: BROKEN', level: 'subtitle', position: [0.5, 0.35] },

  // t57: exam trap — order
  { turnId: 't57', offset: 1.0, kind: 'smarttext', text: 'EXAM TRAP: GET THE ORDER RIGHT', level: 'title', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't57', offset: 5.0, kind: 'smarttext', text: 'BACKGROUND: DECADES OF LAND PRESSURE', level: 'body', position: [0.5, 0.44] },
  { turnId: 't57', offset: 8.0, kind: 'smarttext', text: 'SPARK: THE SASSAMON TRIAL', level: 'subtitle', position: [0.5, 0.60] },

  // t59: box one recap
  { turnId: 't59', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u2e3/new-england-1634.jpg' },
  { turnId: 't59', offset: 1.0, kind: 'smarttext', text: 'ONE: THE GREAT MIGRATION - 20,000 BY 1640', level: 'subtitle', position: [0.5, 0.25] },
  { turnId: 't59', offset: 8.0, kind: 'smarttext', text: 'COVENANT EVERYTHING - DEDHAM SIGNS A DEAL WITH GOD', level: 'body', position: [0.5, 0.48] },
  { turnId: 't59', offset: 13.0, kind: 'smarttext', text: 'BOX ONE, CHECKED', level: 'subtitle', position: [0.5, 0.72], color: '#7dd87d' },

  // t60: box two recap opens
  { turnId: 't60', offset: 1.0, kind: 'smarttext', text: 'TWO: THE BANISHED DISSENTERS', level: 'subtitle', position: [0.5, 0.25] },
  { turnId: 't60', offset: 5.0, kind: 'bubble', text: '"Williams was banished in 1635, founded Providence in... 1635?"', position: [0.5, 0.5], width: 400 },

  // t61: the correction
  { turnId: 't61', offset: 1.0, kind: 'smarttext', text: 'BANISHED \'35 - PROVIDENCE SPRING \'36', level: 'subtitle', position: [0.5, 0.35] },

  // t62: box two recap
  { turnId: 't62', offset: 1.0, kind: 'smarttext', text: 'SOUL LIBERTY - AND HE ACTUALLY BOUGHT THE LAND', level: 'body', position: [0.5, 0.3] },
  { turnId: 't62', offset: 6.0, kind: 'smarttext', text: '\'37 TRIAL · \'38 EXCOMMUNICATED + GONE', level: 'body', position: [0.5, 0.48] },
  { turnId: 't62', offset: 11.0, kind: 'smarttext', text: 'BOX TWO, CHECKED', level: 'subtitle', position: [0.5, 0.72], color: '#7dd87d' },

  // t63: box three recap
  { turnId: 't63', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u2e3/king-philip.jpg' },
  { turnId: 't63', offset: 1.0, kind: 'smarttext', text: 'THREE: KING PHILIP\'S WAR, 1675-76', level: 'subtitle', position: [0.5, 0.25] },
  { turnId: 't63', offset: 7.0, kind: 'smarttext', text: 'LAND + LIVESTOCK + MISSIONARIES - THEN THE TRIAL', level: 'body', position: [0.5, 0.45] },
  { turnId: 't63', offset: 13.0, kind: 'smarttext', text: '17 DESTROYED · 50 DAMAGED · PER-CAPITA DEATH TOLL', level: 'body', position: [0.5, 0.62] },
  { turnId: 't63', offset: 18.0, kind: 'smarttext', text: 'BOX THREE, CHECKED', level: 'subtitle', position: [0.5, 0.82], color: '#7dd87d' },

  // t64: three questions
  { turnId: 't64', offset: 1.0, kind: 'smarttext', text: 'THREE QUESTIONS, AP-SHAPED', level: 'title', position: [0.5, 0.3] },

  // t65: Q1
  { turnId: 't65', offset: 1.0, kind: 'smarttext', text: 'Q1: WINTHROP\'S SERMON - WHAT\'S ITS POINT?', level: 'title', position: [0.5, 0.2] },
  { turnId: 't65', offset: 8.0, kind: 'bubble', text: '"What does Hutchinson\'s trial, seven years later, do to it?"', position: [0.5, 0.5], width: 400 },

  // t66: Q1 pause
  { turnId: 't66', offset: 0.5, kind: 'smarttext', text: 'SAY YOUR ANSWER BEFORE I GIVE IT', level: 'subtitle', position: [0.5, 0.45] },
  { turnId: 't66', offset: 9.0, kind: 'bg-swap', bgImage: 'historic/u2e3/hutchinson-trial.jpg' },

  // t67: Q1 answer — aspiration vs reality
  { turnId: 't67', offset: 1.0, kind: 'smarttext', text: 'POINT: THE COLONY AS A PUBLIC EXAMPLE', level: 'subtitle', position: [0.5, 0.25] },
  { turnId: 't67', offset: 10.0, kind: 'smarttext', text: '1637 TRIAL COLLIDES WITH 1630 SERMON', level: 'subtitle', position: [0.5, 0.45] },
  { turnId: 't67', offset: 16.0, kind: 'smarttext', text: 'ASPIRATION vs REALITY', level: 'hero', position: [0.5, 0.68], entrance: 'stamp' },

  // t68: Q2
  { turnId: 't68', offset: 1.0, kind: 'smarttext', text: 'Q2: NEW ENGLAND vs THE CHESAPEAKE', level: 'title', position: [0.5, 0.25] },

  // t69: Q2 pause
  { turnId: 't69', offset: 0.5, kind: 'smarttext', text: 'ONE DIFFERENCE, ONE SIMILARITY', level: 'subtitle', position: [0.5, 0.5] },
  { turnId: 't69', offset: 8.0, kind: 'bg-swap', bgImage: 'historic/u2e3/new-england-1634.jpg' },

  // t70: versus — New England vs Chesapeake
  { turnId: 't70', offset: 1.0, kind: 'versus', versusDuration: 15,
    clashTitle: 'DIFFERENT MIGRATIONS, SAME LAND HUNGER',
    periodLabel: 'NEW ENGLAND vs THE CHESAPEAKE',
    entityA: {
      name: 'New England', subtitle: 'families bound by covenant',
      points: ['20,000+ crossed by 1640', 'middling sorts, as families', 'covenant towns took Native land'],
      color: '#c9a227',
    },
    entityB: {
      name: 'The Chesapeake', subtitle: 'young men chasing tobacco',
      points: ['fortune-hunters, not families', 'tobacco economy', 'took Native land by force too'],
      color: '#ff8a8a',
    },
    verdictSummary: 'Different people, same hunger: both took Native land by force.' },

  // t71: Q3
  { turnId: 't71', offset: 1.0, kind: 'smarttext', text: 'Q3: 17 DESTROYED, 50 DAMAGED - WHY "PER CAPITA"?', level: 'title', position: [0.5, 0.2] },
  { turnId: 't71', offset: 8.0, kind: 'bubble', text: '"What connects the numbers to the label?"', position: [0.5, 0.5], width: 380 },

  // t72: Q3 pause
  { turnId: 't72', offset: 0.5, kind: 'smarttext', text: 'CONNECT THE NUMBERS TO THE LABEL', level: 'subtitle', position: [0.5, 0.5] },
  { turnId: 't72', offset: 8.0, kind: 'bg-swap', bgImage: 'historic/u2e2/jamestown-burning.jpg' },

  // t73: Q3 answer
  { turnId: 't73', offset: 1.0, kind: 'smarttext', text: 'SMALL COLONIES - BIG NUMBERS HIT HARD', level: 'subtitle', position: [0.5, 0.25] },
  { turnId: 't73', offset: 8.0, kind: 'smarttext', text: '17 + 50 OUT OF TENS OF THOUSANDS OF COLONISTS', level: 'body', position: [0.5, 0.48] },
  { turnId: 't73', offset: 13.0, kind: 'smarttext', text: 'THAT\'S WHAT PER CAPITA MEANS', level: 'subtitle', position: [0.5, 0.68] },

  // t74: fast bonus
  { turnId: 't74', offset: 0.5, kind: 'smarttext', text: 'FAST BONUS', level: 'title', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't74', offset: 2.5, kind: 'bubble', text: 'Civil trial \'37 · church trial \'38 · killed in a raid \'43 - whose timeline?', position: [0.5, 0.5], width: 420 },

  // t75: fast bonus pause
  { turnId: 't75', offset: 0.5, kind: 'smarttext', text: '5 SECONDS - WHOSE TIMELINE?', level: 'subtitle', position: [0.5, 0.5] },

  // t77: check boxes + Pennsylvania tease
  { turnId: 't77', offset: 1.0, kind: 'smarttext', text: 'CHECK YOUR THREE BOXES', level: 'subtitle', position: [0.5, 0.3] },
  { turnId: 't77', offset: 3.5, kind: 'bubble', text: '"Next time: Pennsylvania - the opposite experiment, advertised in German"', position: [0.5, 0.55], width: 440 },

  // t78-t79: closing tagline
  { turnId: 't78', offset: 0.5, kind: 'smarttext', text: 'THEY CAME TO BUILD A CITY ON A HILL -', level: 'title', position: [0.5, 0.3] },
  { turnId: 't79', offset: 0.5, kind: 'smarttext', text: '...AND DECIDED WHO GETS TO LIVE IN IT', level: 'title', position: [0.5, 0.45] },
];

/* ------------------------------------------------------------------ */
/* Background selector                                                  */
/* ------------------------------------------------------------------ */
function getBackgroundForTurn(turnId: string | null, subBeatBg: string | null): string {
  if (subBeatBg) return subBeatBg;
  if (!turnId) return 'historic/u2e3/new-england-1634.jpg';
  const n = parseInt(turnId.slice(1), 10);
  // Box 1: migration, sermon, covenant towns
  if (n <= 18) return 'historic/u2e3/new-england-1634.jpg';
  // Box 2: the banished dissenters
  if (n <= 37) return 'historic/u2e3/meetinghouse.png';
  // Box 3: King Philip's War
  if (n <= 56) return 'historic/u2e3/king-philip.jpg';
  // Recap + AP questions
  return 'historic/u2e3/new-england-1634.jpg';
}

/* ------------------------------------------------------------------ */
/* Main episode                                                         */
/* ------------------------------------------------------------------ */
export const U2E3Episode: React.FC<{ episodeData?: EpisodeData }> = ({ episodeData }) => {
  const data = episodeData ?? loadEpisodeData('u2e3');
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

  // Tone: serious for King Philip's War and its recap; quiz beats stay playful;
  // the closing tagline lands serious.
  const turnNum = activeTurn ? parseInt(activeTurn.id.slice(1), 10) : -1;
  const isSeriousSection = (turnNum >= 38 && turnNum <= 63) || turnNum >= 78;

  const showHead = activeTurn &&
    (activeTurn.speaker === 'maya' || activeTurn.speaker === 'marcus') &&
    !(activeTurn.id === 't00' && turnElapsed < 3);

  // No Marcus toon asset exists — always realistic for Marcus
  const speakerAssets = (speaker: string) => {
    if (speaker === 'maya') {
      return {
        realistic: staticFile('maya-real.webp'),
        stylized: staticFile('maya-toon.webp'),
      };
    }
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

  // Debug overlay — studio only, never burns into export
  const isStudio = typeof window !== 'undefined' && (window as any).__REMOTION_STUDIO__;

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

          {/* Audio — ceil so the last frame isn't clipped */}
          {turns.map((turn, i) => (
            <Sequence key={`audio-${turn.id}`}
              from={Math.floor(starts[i] * fps)}
              durationInFrames={Math.max(1, Math.ceil(durations[i] * fps))}>
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
            <TitleCard kicker="UNIT 2 · EPISODE 3:"
              title="NEW ENGLAND PURITANS" subline="COVENANT TOWNS · BANISHED DISSENTERS · KING PHILIP'S WAR" at={activeStartFrame} />
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

          {/* Debug — studio only */}
          {isStudio && (
            <div style={{
              position: 'absolute', top: 10, left: 10,
              fontFamily: 'monospace', fontSize: 13,
              color: 'rgba(255,255,255,0.5)', zIndex: 100,
            }}>
              {activeTurn ? `${activeTurn.id} [${activeTurn.speaker}] ${timeSec.toFixed(1)}s` : '—'}
            </div>
          )}
        </AbsoluteFill>
      </AutoLayoutProvider>
    </ToneProvider>
  );
};
