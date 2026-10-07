import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
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

import turnsData from '../data/u2e6/turns.json';
import timingData from '../data/u2e6/timing_map.json';

interface Turn {
  id: string;
  speaker: string;
  text: string;
  pause_after?: number;
}

const turns = turnsData as Turn[];
const starts = (timingData as { starts: number[] }).starts;
const durations = (timingData as { durations: number[] }).durations;

const EP = 'u2e6';

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
  // leader
  leader?: string;
  leaderName?: string;
  role?: string;
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
  // t00: Cold open — four boxes
  { turnId: 't00', offset: 3.5, kind: 'smarttext', text: 'FOUR BOXES THIS TIME', level: 'title', position: [0.5, 0.22] },
  { turnId: 't00', offset: 8.5, kind: 'smarttext', text: '1. WHITEFIELD: THE VOICE', level: 'body', position: [0.5, 0.42] },
  { turnId: 't00', offset: 11.5, kind: 'smarttext', text: '2. EDWARDS: THE ARGUMENT', level: 'body', position: [0.5, 0.52] },
  { turnId: 't00', offset: 14.5, kind: 'smarttext', text: '3. FRANKLIN: THE COUNTERWEIGHT', level: 'body', position: [0.5, 0.62] },
  { turnId: 't00', offset: 17.5, kind: 'smarttext', text: '4. THE SPLITS: WHOSE CHURCH?', level: 'body', position: [0.5, 0.72] },
  { turnId: 't00', offset: 26.0, kind: 'bubble', text: 'circle the ones you couldn\'t explain right now', position: [0.5, 0.85], width: 420 },

  // t01: Before the fire — cold churches
  { turnId: 't01', offset: 2.0, kind: 'smarttext', text: 'BEFORE THE FIRE: THE TINDER', level: 'title', position: [0.5, 0.2] },
  { turnId: 't01', offset: 7.0, kind: 'bubble', text: 'formal, established... and the pews emptying', position: [0.5, 0.5], width: 400 },

  // t02: Empty pews?
  { turnId: 't02', offset: 0.5, kind: 'smarttext', text: 'EMPTY PEWS?', level: 'hero', position: [0.5, 0.35] },

  // t03: Half-Way Covenant 1662
  { turnId: 't03', offset: 2.0, kind: 'smarttext', text: '1662: THE HALF-WAY COVENANT', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't03', offset: 7.0, kind: 'smarttext', text: 'partial members: pews yes, vote + communion no', level: 'body', position: [0.5, 0.5] },

  // t04: Full pews, thinner commitment
  { turnId: 't04', offset: 0.5, kind: 'smarttext', text: 'FULL PEWS, THINNER COMMITMENT', level: 'subtitle', position: [0.5, 0.4] },

  // t05: The spark — outdoor preachers
  { turnId: 't05', offset: 2.0, kind: 'smarttext', text: 'THE SPARK: OUTDOOR PREACHERS', level: 'title', position: [0.5, 0.2] },
  { turnId: 't05', offset: 6.0, kind: 'bubble', text: 'no building could hold the crowds', position: [0.5, 0.5], width: 380 },

  // t06: Phoenix concert (fun beat)
  { turnId: 't06', offset: 2.0, kind: 'bubble', text: 'twenty thousand people, no shade, melting by song two', position: [0.5, 0.3], width: 420 },
  { turnId: 't06', offset: 7.0, kind: 'smarttext', text: 'A TWO-HOUR SERMON, STANDING? RESPECT.', level: 'body', position: [0.5, 0.55] },

  // t07: Whitefield 1739
  { turnId: 't07', offset: 2.0, kind: 'bg-swap', bgImage: 'historic/u2e6/whitefield-preaching.jpg' },
  { turnId: 't07', offset: 3.0, kind: 'smarttext', text: '1739: GEORGE WHITEFIELD', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't07', offset: 8.0, kind: 'smarttext', text: '25,000 IN A FIELD', level: 'subtitle', position: [0.5, 0.5], color: '#ffd700' },

  // t08: How did the back rows hear him?
  { turnId: 't08', offset: 0.5, kind: 'bubble', text: 'no speakers — how did the back rows hear him?', position: [0.5, 0.35], width: 360 },

  // t09: Franklin's sound check
  { turnId: 't09', offset: 2.0, kind: 'smarttext', text: 'FRANKLIN\'S SOUND CHECK', level: 'title', position: [0.5, 0.2] },
  { turnId: 't09', offset: 6.0, kind: 'bubble', text: 'a semicircle of listeners, two square feet each', position: [0.5, 0.45], width: 400 },
  { turnId: 't09', offset: 10.0, kind: 'smarttext', text: '30,000 COULD HEAR HIM', level: 'subtitle', position: [0.5, 0.7], color: '#ffd700' },

  // t10: In the 1740s.
  { turnId: 't10', offset: 0.5, kind: 'bubble', text: 'a sound check. in the 1740s.', position: [0.5, 0.35], width: 320 },

  // t11: The press spread the name
  { turnId: 't11', offset: 2.0, kind: 'smarttext', text: 'THE PRESS SPREAD THE NAME', level: 'title', position: [0.5, 0.2] },
  { turnId: 't11', offset: 7.0, kind: 'smarttext', text: 'AMERICA\'S FIRST CELEBRITY', level: 'subtitle', position: [0.5, 0.5], entrance: 'stamp', color: '#ffd700' },

  // t12: Really the first?
  { turnId: 't12', offset: 0.5, kind: 'bubble', text: 'nobody was famous before him?', position: [0.5, 0.4], width: 320 },

  // t13: Fame on paper
  { turnId: 't13', offset: 1.5, kind: 'smarttext', text: 'FAME CROSSED THE OCEAN ON PAPER', level: 'body', position: [0.5, 0.4] },

  // t14: Exam tip — emotional preaching
  { turnId: 't14', offset: 2.0, kind: 'smarttext', text: 'EXAM TIP', level: 'title', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't14', offset: 5.0, kind: 'smarttext', text: 'open-air crowds + weeping = emotion vs. the old establishment', level: 'body', position: [0.5, 0.5] },

  // t15: The collection dish (Franklin empties his pocket)
  { turnId: 't15', offset: 2.0, kind: 'smarttext', text: 'THE COLLECTION DISH', level: 'title', position: [0.38, 0.2] },
  { turnId: 't15', offset: 4.0, kind: 'leader', leader: 'apush_franklin_sly.webp', leaderName: 'Benjamin Franklin', role: 'the skeptic', position: [0.8, 0.42] },
  { turnId: 't15', offset: 7.0, kind: 'bubble', text: 'meaning to give nothing... emptied his whole pocket, gold and all', position: [0.38, 0.55], width: 340 },

  // t16: The skeptic never converted
  { turnId: 't16', offset: 0.5, kind: 'smarttext', text: 'THE SKEPTIC NEVER CONVERTED', level: 'subtitle', position: [0.5, 0.35] },

  // t17: Common mistake — Whitefield didn't start it
  { turnId: 't17', offset: 2.0, kind: 'smarttext', text: 'COMMON MISTAKE', level: 'title', position: [0.5, 0.2], color: '#ff8a8a' },
  { turnId: 't17', offset: 5.5, kind: 'smarttext', text: 'he didn\'t START it — he poured the gasoline', level: 'body', position: [0.5, 0.5] },

  // t18: Prediction beat — church elder 1662
  { turnId: 't18', offset: 1.0, kind: 'smarttext', text: 'YOUR TURN', level: 'title', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't18', offset: 4.0, kind: 'bubble', text: 'you\'re a church elder in 1662 — what are you risking?', position: [0.5, 0.5], width: 400 },

  // t19: 10s pause
  { turnId: 't19', offset: 1.0, kind: 'smarttext', text: '⏳ THINK', level: 'subtitle', position: [0.5, 0.35] },

  // t20: Box one check
  { turnId: 't20', offset: 0.5, kind: 'smarttext', text: '✅ BOX 1: WHITEFIELD — THE VOICE', level: 'subtitle', position: [0.5, 0.8], color: '#7dd87d' },

  // t21: The other preacher
  { turnId: 't21', offset: 0.4, kind: 'smarttext', text: 'THE OTHER PREACHER', level: 'title', position: [0.5, 0.3] },

  // t22: Edwards the loud one?
  { turnId: 't22', offset: 0.5, kind: 'bubble', text: 'Edwards is the loud one? the weeper?', position: [0.5, 0.4], width: 340 },

  // t23: Backwards.
  { turnId: 't23', offset: 2.0, kind: 'smarttext', text: 'BACKWARDS.', level: 'hero', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't23', offset: 5.0, kind: 'smarttext', text: 'EDWARDS\' WEAPON: THE ARGUMENT', level: 'subtitle', position: [0.5, 0.55] },

  // t24: The easy flip
  { turnId: 't24', offset: 0.5, kind: 'smarttext', text: 'EDWARDS ARGUED. WHITEFIELD ACTED.', level: 'subtitle', position: [0.5, 0.4] },

  // t25: Edwards, Enfield 1741
  { turnId: 't25', offset: 2.0, kind: 'bg-swap', bgImage: 'historic/u2e6/edwards-portrait.jpg' },
  { turnId: 't25', offset: 3.0, kind: 'smarttext', text: 'JONATHAN EDWARDS', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't25', offset: 7.0, kind: 'smarttext', text: 'ENFIELD, JULY 8, 1741', level: 'subtitle', position: [0.5, 0.5], color: '#ffd700' },
  { turnId: 't25', offset: 10.5, kind: 'bubble', text: '"Sinners in the Hands of an Angry God"', position: [0.5, 0.75], width: 400 },

  // t26: The spider line (actual words) — primary source
  { turnId: 't26', offset: 2.0, kind: 'primarysource',
    documentTitle: 'Sinners in the Hands of an Angry God',
    authorAndDate: 'Jonathan Edwards, preached at Enfield, July 8, 1741 — printed Boston, 1741',
    excerptText: 'The God that holds you over the pit of hell, much as one holds a spider, or some loathsome insect, over the fire.',
    highlightedPhrase: 'much as one holds a spider',
    hippType: 'Point of View',
    hippExplanation: 'His actual words, read nearly flat — the calm delivery is the point. Feeling was the message, not theology.' },

  // t27: Read nearly flat
  { turnId: 't27', offset: 2.0, kind: 'smarttext', text: 'READ NEARLY FLAT', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't27', offset: 5.0, kind: 'bubble', text: 'barely looking up, while the congregation came apart', position: [0.5, 0.5], width: 400 },

  // t28: The calm ones are scarier
  { turnId: 't28', offset: 0.5, kind: 'bubble', text: 'the calm ones are always scarier', position: [0.5, 0.35], width: 340 },

  // t29: Different weapons, same break
  { turnId: 't29', offset: 2.0, kind: 'smarttext', text: 'DIFFERENT WEAPONS, SAME BREAK', level: 'title', position: [0.5, 0.2] },
  { turnId: 't29', offset: 6.0, kind: 'smarttext', text: 'CONVERSION: ON THE INDIVIDUAL', level: 'subtitle', position: [0.5, 0.5], color: '#ffd700' },

  // t30: Enfield ASMR (fun beat)
  { turnId: 't30', offset: 2.0, kind: 'bubble', text: 'the Enfield sermon as ASMR. two million likes.', position: [0.5, 0.35], width: 380 },

  // t31: Anyone could be saved
  { turnId: 't31', offset: 2.0, kind: 'smarttext', text: 'ANYONE COULD BE SAVED', level: 'title', position: [0.5, 0.25], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't31', offset: 6.0, kind: 'bubble', text: 'a choice away from the old ideas of predestination', position: [0.5, 0.55], width: 400 },

  // t32: Exam tip — style, not theology
  { turnId: 't32', offset: 2.0, kind: 'smarttext', text: 'EXAM TIP', level: 'title', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't32', offset: 5.0, kind: 'smarttext', text: 'the spider line tests STYLE, not theology', level: 'body', position: [0.5, 0.5] },

  // t33: 1750 — voted out at Northampton
  { turnId: 't33', offset: 2.0, kind: 'smarttext', text: '1750: VOTED OUT', level: 'title', position: [0.5, 0.2], entrance: 'stamp', color: '#ff8a8a' },
  { turnId: 't33', offset: 6.0, kind: 'bubble', text: 'his own congregation at Northampton fired him', position: [0.5, 0.5], width: 400 },

  // t34: All argument, no theater
  { turnId: 't34', offset: 1.5, kind: 'smarttext', text: 'ALL ARGUMENT, NO THEATER', level: 'subtitle', position: [0.5, 0.35] },

  // t35: Easy mix-up — don't picture him shouting
  { turnId: 't35', offset: 2.0, kind: 'smarttext', text: 'EASY MIX-UP', level: 'title', position: [0.5, 0.2], color: '#ff8a8a' },
  { turnId: 't35', offset: 5.5, kind: 'smarttext', text: 'DON\'T PICTURE HIM SHOUTING', level: 'subtitle', position: [0.5, 0.5] },

  // t36: Box three — the counterweight
  { turnId: 't36', offset: 1.0, kind: 'bg-swap', bgImage: 'historic/u2e6/franklin-1767.jpg' },
  { turnId: 't36', offset: 2.0, kind: 'smarttext', text: 'BOX 3: THE COUNTERWEIGHT', level: 'title', position: [0.5, 0.25] },

  // t37: Early to bed
  { turnId: 't37', offset: 0.5, kind: 'bubble', text: '"early to bed, early to rise"', position: [0.5, 0.35], width: 320 },

  // t38: Poor Richard's Almanack
  { turnId: 't38', offset: 2.0, kind: 'bg-swap', bgImage: 'historic/u2e6/almanack.jpg' },
  { turnId: 't38', offset: 3.0, kind: 'smarttext', text: 'POOR RICHARD\'S ALMANACK, 1732', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't38', offset: 8.0, kind: 'bubble', text: '"a penny saved is a penny earned"', position: [0.5, 0.5], width: 360 },
  { turnId: 't38', offset: 12.0, kind: 'smarttext', text: 'REASON OVER REVELATION', level: 'subtitle', position: [0.5, 0.75], color: '#ffd700' },

  // t40: The Junto 1727
  { turnId: 't40', offset: 2.0, kind: 'smarttext', text: '1727: THE JUNTO', level: 'title', position: [0.38, 0.2], entrance: 'stamp' },
  { turnId: 't40', offset: 6.0, kind: 'leader', leader: 'apush_franklin.webp', leaderName: 'Benjamin Franklin', role: 'the counterweight', position: [0.8, 0.42] },
  { turnId: 't40', offset: 9.0, kind: 'bubble', text: 'the Enlightenment as a social club', position: [0.38, 0.5], width: 340 },
  { turnId: 't40', offset: 13.0, kind: 'smarttext', text: 'THE LIGHTNING ROD', level: 'subtitle', position: [0.45, 0.78], color: '#ffd700' },

  // t41: The kite?
  { turnId: 't41', offset: 0.5, kind: 'bubble', text: 'the kite — did he actually fly it?', position: [0.5, 0.35], width: 340 },

  // t42: The kite story is shakier than the textbooks
  { turnId: 't42', offset: 2.0, kind: 'smarttext', text: 'THE KITE STORY: SHAKIER THAN THE TEXTBOOKS', level: 'title', position: [0.5, 0.2] },
  { turnId: 't42', offset: 7.0, kind: 'smarttext', text: 'THE EXPERIMENTS WERE REAL', level: 'subtitle', position: [0.5, 0.5], color: '#ffd700' },

  // t43: Feeling vs. reason
  { turnId: 't43', offset: 1.5, kind: 'smarttext', text: 'FEELING vs. REASON', level: 'title', position: [0.5, 0.3], entrance: 'stamp' },

  // t44: Versus — Awakening vs Enlightenment
  { turnId: 't44', offset: 1.0, kind: 'versus', versusDuration: 11,
    clashTitle: 'FEELING AGAINST REASON',
    periodLabel: 'THE AWAKENING MEETS THE ENLIGHTENMENT',
    entityA: { name: 'The Awakening', subtitle: 'through the heart', points: ['emotional preaching in open fields', 'conversion as a personal choice', 'anyone could be saved'], color: '#c9a227' },
    entityB: { name: 'The Enlightenment', subtitle: 'through the head', points: ['deism: the clockmaker God', 'reason over revelation', 'the self-made man as a project'], color: '#2c5aa0' },
    verdictSummary: 'Both challenged authority — one with feeling, one with reason.' },

  // t45: Common mistake — Franklin is not the Awakening
  { turnId: 't45', offset: 1.5, kind: 'smarttext', text: 'COMMON MISTAKE', level: 'title', position: [0.5, 0.2], color: '#ff8a8a' },
  { turnId: 't45', offset: 5.0, kind: 'smarttext', text: 'FRANKLIN: NOT THE AWAKENING', level: 'subtitle', position: [0.5, 0.5] },

  // t46: Exam tip — Franklin = Enlightenment
  { turnId: 't46', offset: 1.5, kind: 'smarttext', text: 'EXAM TIP', level: 'title', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't46', offset: 4.0, kind: 'smarttext', text: 'FRANKLIN ON THE TEST = ENLIGHTENMENT', level: 'body', position: [0.5, 0.5] },

  // t47: Weeping fields vs. reasoning rooms
  { turnId: 't47', offset: 1.0, kind: 'smarttext', text: 'WEEPING FIELDS vs. REASONING ROOMS', level: 'subtitle', position: [0.5, 0.4] },

  // t48: The aftershock — New Lights / Old Lights
  { turnId: 't48', offset: 1.5, kind: 'smarttext', text: 'THE AFTERSHOCK', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't48', offset: 2.5, kind: 'smarttext', text: 'NEW LIGHTS = THE REVIVAL FANS', level: 'body', position: [0.5, 0.45], color: '#ffd700' },
  { turnId: 't48', offset: 3.0, kind: 'smarttext', text: 'OLD LIGHTS = THE OLD GUARD', level: 'body', position: [0.5, 0.6] },

  // t49: Prediction beat — the split church
  { turnId: 't49', offset: 1.0, kind: 'smarttext', text: 'YOUR TURN', level: 'title', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't49', offset: 4.0, kind: 'bubble', text: 'half the members walk out — what do they learn, fast?', position: [0.5, 0.5], width: 400 },

  // t50: 10s pause
  { turnId: 't50', offset: 1.0, kind: 'smarttext', text: '⏳ THINK', level: 'subtitle', position: [0.5, 0.35] },

  // t51: How to organize
  { turnId: 't51', offset: 1.0, kind: 'smarttext', text: 'HOW TO ORGANIZE', level: 'title', position: [0.5, 0.25] },
  { turnId: 't51', offset: 3.5, kind: 'smarttext', text: 'raise money · pick leaders · argue in public · defy', level: 'body', position: [0.5, 0.55] },

  // t52: Baptists, Methodists, Princeton 1746
  { turnId: 't52', offset: 3.0, kind: 'bg-swap', bgImage: 'historic/u2e6/nassau-hall.jpg' },
  { turnId: 't52', offset: 4.0, kind: 'smarttext', text: 'ORGANIZING: THE REAL AFTERSHOCK', level: 'title', position: [0.5, 0.2] },
  { turnId: 't52', offset: 9.0, kind: 'smarttext', text: 'BAPTISTS + METHODISTS GREW OUT OF THE FIRE', level: 'body', position: [0.5, 0.5] },
  { turnId: 't52', offset: 13.0, kind: 'smarttext', text: 'PRINCETON, 1746 — NEW LIGHT PRESBYTERIANS', level: 'subtitle', position: [0.5, 0.75], color: '#ffd700' },

  // t53: Exam tip — authority
  { turnId: 't53', offset: 1.5, kind: 'smarttext', text: 'EXAM TIP', level: 'title', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't53', offset: 4.0, kind: 'smarttext', text: 'NEW vs OLD LIGHT = WHO DECIDES?', level: 'body', position: [0.5, 0.5] },

  // t54: The big debate
  { turnId: 't54', offset: 2.0, kind: 'smarttext', text: 'THE BIG DEBATE', level: 'title', position: [0.5, 0.2] },
  { turnId: 't54', offset: 5.0, kind: 'bubble', text: 'the first thing ALL the colonies experienced together?', position: [0.5, 0.5], width: 400 },

  // t56: Oversold?
  { turnId: 't56', offset: 1.5, kind: 'smarttext', text: 'OVERSOLD?', level: 'title', position: [0.5, 0.25] },
  { turnId: 't56', offset: 4.5, kind: 'smarttext', text: 'DID THE AWAKENING CAUSE THE REVOLUTION?', level: 'subtitle', position: [0.5, 0.5], color: '#ffd700' },

  // t58: The case for / against
  { turnId: 't58', offset: 2.0, kind: 'smarttext', text: 'THE CASE FOR', level: 'title', position: [0.5, 0.2], color: '#7dd87d' },
  { turnId: 't58', offset: 5.0, kind: 'smarttext', text: 'defied authority · a rehearsal for 1776', level: 'body', position: [0.5, 0.4] },
  { turnId: 't58', offset: 11.0, kind: 'smarttext', text: 'THE CASE AGAINST', level: 'title', position: [0.5, 0.6], color: '#ff8a8a' },
  { turnId: 't58', offset: 14.0, kind: 'smarttext', text: 'fires died out · patriot leaders unawakened', level: 'body', position: [0.5, 0.8] },

  // t59: Argue both sides
  { turnId: 't59', offset: 0.5, kind: 'smarttext', text: 'ARGUE BOTH SIDES', level: 'subtitle', position: [0.5, 0.4], color: '#ffd700' },

  // t61: Common mistake — the trap answer
  { turnId: 't61', offset: 1.5, kind: 'smarttext', text: 'COMMON MISTAKE', level: 'title', position: [0.5, 0.2], color: '#ff8a8a' },
  { turnId: 't61', offset: 4.5, kind: 'bubble', text: 'the trap: "the Awakening caused the Revolution" — a debate, not a fact', position: [0.5, 0.5], width: 420 },

  // t63: Four-box recap
  { turnId: 't63', offset: 2.0, kind: 'smarttext', text: 'FOUR BOXES — LANDING THEM', level: 'title', position: [0.5, 0.2] },
  { turnId: 't63', offset: 6.0, kind: 'smarttext', text: '1. WHITEFIELD: fields, 1739 — 30,000 heard', level: 'body', position: [0.5, 0.42] },
  { turnId: 't63', offset: 12.0, kind: 'smarttext', text: '2. EDWARDS: Enfield 1741 — the spider, read flat', level: 'body', position: [0.5, 0.52] },
  { turnId: 't63', offset: 18.0, kind: 'smarttext', text: '3. FRANKLIN: Almanack, Junto — the clockmaker God', level: 'body', position: [0.5, 0.62] },
  { turnId: 't63', offset: 24.0, kind: 'smarttext', text: '4. THE SPLITS — the lights... careful', level: 'body', position: [0.5, 0.72] },
  { turnId: 't63', offset: 38.0, kind: 'bubble', text: 'wait — did I flip the lights?', position: [0.5, 0.86], width: 300 },

  // t66: The lights correction
  { turnId: 't66', offset: 0.5, kind: 'smarttext', text: 'NEW LIGHTS = REVIVAL FANS', level: 'subtitle', position: [0.5, 0.4], color: '#7dd87d' },
  { turnId: 't66', offset: 2.5, kind: 'smarttext', text: 'OLD LIGHTS = THE OLD GUARD', level: 'subtitle', position: [0.5, 0.6] },

  // t67: All four landed
  { turnId: 't67', offset: 1.0, kind: 'smarttext', text: '✅ ALL FOUR LANDED', level: 'subtitle', position: [0.5, 0.8], color: '#7dd87d' },

  // t68: Three questions
  { turnId: 't68', offset: 0.5, kind: 'smarttext', text: 'THREE QUESTIONS, AP-SHAPED', level: 'title', position: [0.5, 0.3] },

  // t69: Q1 — the spider stimulus
  { turnId: 't69', offset: 2.0, kind: 'smarttext', text: 'Q1: THE SPIDER LINE, 1741', level: 'title', position: [0.5, 0.2] },
  { turnId: 't69', offset: 6.0, kind: 'bubble', text: '"The God that holds you over the pit of hell..."', position: [0.5, 0.5], width: 400 },
  { turnId: 't69', offset: 10.0, kind: 'primarysource',
    documentTitle: 'Sinners in the Hands of an Angry God',
    authorAndDate: 'Jonathan Edwards, Enfield, July 8, 1741',
    excerptText: 'The God that holds you over the pit of hell, much as one holds a spider, or some loathsome insect, over the fire.',
    highlightedPhrase: 'much as one holds a spider',
    hippType: 'Point of View',
    hippExplanation: 'His actual words — the famous account says he read them nearly flat.' },

  // t70: 15s pause
  { turnId: 't70', offset: 1.0, kind: 'smarttext', text: '⏳ SAY YOUR ANSWER', level: 'subtitle', position: [0.5, 0.4] },

  // t71: A1 — Edwards at Enfield
  { turnId: 't71', offset: 2.0, kind: 'smarttext', text: 'A1: EDWARDS AT ENFIELD', level: 'title', position: [0.5, 0.2], color: '#7dd87d' },
  { turnId: 't71', offset: 6.0, kind: 'smarttext', text: 'the point: METHOD, not theology', level: 'body', position: [0.5, 0.5] },
  { turnId: 't71', offset: 11.0, kind: 'smarttext', text: 'terror as conversion — what cold churches couldn\'t do', level: 'body', position: [0.5, 0.65] },

  // t72: Q2 — why the split?
  { turnId: 't72', offset: 0.5, kind: 'smarttext', text: 'Q2: WHY THE SPLIT?', level: 'title', position: [0.5, 0.3] },

  // t73: 15s pause
  { turnId: 't73', offset: 1.0, kind: 'smarttext', text: '⏳ SAY YOUR ANSWER', level: 'subtitle', position: [0.5, 0.4] },

  // t74: A2 — a fight over authority
  { turnId: 't74', offset: 2.0, kind: 'smarttext', text: 'A2: A FIGHT OVER AUTHORITY', level: 'title', position: [0.5, 0.2], color: '#7dd87d' },
  { turnId: 't74', offset: 7.0, kind: 'smarttext', text: 'once feeling counts as proof, the old rules stop working', level: 'body', position: [0.5, 0.5] },

  // t75: Q3 — Awakening to Revolution?
  { turnId: 't75', offset: 0.5, kind: 'smarttext', text: 'Q3: AWAKENING → REVOLUTION?', level: 'title', position: [0.5, 0.3] },

  // t76: 20s pause
  { turnId: 't76', offset: 1.0, kind: 'smarttext', text: '⏳ ARGUE BOTH SIDES', level: 'subtitle', position: [0.5, 0.4] },

  // t77: A3 — weigh, don't verdict
  { turnId: 't77', offset: 2.0, kind: 'smarttext', text: 'A3: WEIGH, DON\'T VERDICT', level: 'title', position: [0.5, 0.2], color: '#7dd87d' },
  { turnId: 't77', offset: 7.0, kind: 'smarttext', text: 'for: organized + defied authority, shared experience', level: 'body', position: [0.5, 0.45] },
  { turnId: 't77', offset: 12.0, kind: 'smarttext', text: 'against: fires died out, leaders unawakened', level: 'body', position: [0.5, 0.65] },

  // t78: Fast bonus — heart or head?
  { turnId: 't78', offset: 0.5, kind: 'smarttext', text: '⚡ FAST BONUS', level: 'title', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't78', offset: 2.5, kind: 'bubble', text: 'heart or head — which was which?', position: [0.5, 0.5], width: 340 },

  // t80: Heart and head
  { turnId: 't80', offset: 0.5, kind: 'smarttext', text: 'AWAKENING = HEART · ENLIGHTENMENT = HEAD', level: 'subtitle', position: [0.5, 0.4], color: '#ffd700' },

  // t81: Check your four boxes
  { turnId: 't81', offset: 0.5, kind: 'smarttext', text: '✅ CHECK YOUR FOUR BOXES', level: 'subtitle', position: [0.5, 0.35], color: '#7dd87d' },

  // t82: With the heart, and with the head
  { turnId: 't82', offset: 0.3, kind: 'smarttext', text: 'WITH THE HEART, AND WITH THE HEAD', level: 'body', position: [0.5, 0.5] },

  // t83: Next time — self-government, Zenger
  { turnId: 't83', offset: 1.0, kind: 'smarttext', text: 'NEXT TIME: SELF-GOVERNMENT', level: 'title', position: [0.5, 0.25] },
  { turnId: 't83', offset: 5.0, kind: 'bubble', text: 'a printer named Zenger puts press freedom on trial', position: [0.5, 0.5], width: 380 },
];

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
        marginTop: -10,
        display: 'inline-block',
        background: 'rgba(20,16,12,0.9)',
        color: '#c9a227',
        fontFamily: 'Georgia, serif',
        fontWeight: 800,
        fontSize: 24,
        padding: '6px 20px',
        borderRadius: 20,
        border: '2px solid #c9a227',
        letterSpacing: 1,
      }}>
        {name}
      </div>
      {role && (
        <div style={{
          marginTop: 6,
          display: 'inline-block',
          background: 'rgba(20,16,12,0.85)',
          color: '#f5e6c8',
          fontFamily: 'Arial, sans-serif',
          fontWeight: 700,
          fontSize: 16,
          padding: '4px 16px',
          borderRadius: 12,
          letterSpacing: 0.5,
        }}>
          {role}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Background selector                                                  */
/* ------------------------------------------------------------------ */
function getBackgroundForTurn(turnId: string | null, subBeatBg: string | null): string {
  if (subBeatBg) return subBeatBg;
  if (!turnId) return 'historic/u2e1/colonial-map.jpg';
  const n = parseInt(turnId.slice(1), 10);
  // Cold churches / the tinder
  if (n <= 6) return 'historic/u2e6/meetinghouse.jpg';
  // Box 1: Whitefield
  if (n <= 20) return 'historic/u2e6/whitefield-preaching.jpg';
  // Box 2: Edwards
  if (n <= 35) return 'historic/u2e6/edwards-portrait.jpg';
  // Box 3: Franklin's counterweight
  if (n <= 47) return 'historic/u2e6/franklin-1767.jpg';
  // Box 4: the splits + aftershock
  if (n <= 61) return 'historic/u2e6/meetinghouse.jpg';
  // Recap + questions
  return 'historic/u2e1/colonial-map.jpg';
}

/* ------------------------------------------------------------------ */
/* Main episode                                                         */
/* ------------------------------------------------------------------ */
export const U2E6Episode: React.FC = () => {
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

  // Tone: playful throughout, serious for the Sinners sermon core (t25-t27)
  const isSeriousSection = activeTurn && ['t25', 't26', 't27'].includes(activeTurn.id);

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
            <TitleCard kicker="UNIT 2 · EPISODE 6:"
              title="THE GREAT AWAKENING" subline="WHITEFIELD · EDWARDS · FRANKLIN · THE SPLITS" at={activeStartFrame} />
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

            if (beat.kind === 'leader' && beat.leader) {
              return <LeaderSticker key={key} at={beatFrame}
                leader={beat.leader} name={beat.leaderName || ''}
                role={beat.role}
                position={beat.position || [0.72, 0.55]} />;
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
