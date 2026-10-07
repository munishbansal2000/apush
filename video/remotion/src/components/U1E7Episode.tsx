/**
 * U1E7Episode — Unit 1 Episode 7: The Valladolid Debate.
 *
 * Spain puts its own conquests on trial. Maya moderates; Marcus argues
 * Las Casas's case as a modern advocate; Sepúlveda argues his own case
 * in his own voice — measured, scholarly, never a caricature.
 *
 * Four boxes: Sepúlveda's case (natural slavery + four just causes),
 * Las Casas's answer (rational souls, the Short Account, owned blind
 * spots), the New Laws and the verdict that wasn't, the afterlife
 * (Black Legend + the question that outlived the empire).
 *
 * Tone arc: SERIOUS throughout — this is a philosophical trial, not a
 * romp. Light touches: the Fullmetal Alchemist joke, Maya's mock-trial
 * callback, Marcus's "permission slip with Latin on it."
 *
 * 70 turns (42 Maya + 16 Marcus + 6 Sepúlveda + 6 pauses), ~864 seconds, 30fps.
 * Script: audio_scripts/unit1/apush-audio-u1-e7-script-v4-DRAFT.md (canonical)
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
import { VersusPolarization } from './VersusPolarization';
import { PrimarySourceSpotlight } from './PrimarySourceSpotlight';
import { ToneProvider } from '../validation/ToneContext';
import { AutoLayoutProvider } from '../validation/AutoLayout';

import turnsData from '../data/e7/turns.json';
import timingData from '../data/e7/timing_map.json';

interface Turn {
  id: string;
  speaker: string;
  text: string;
  pause_after?: number;
}

const turns = turnsData as Turn[];
const starts = (timingData as { starts: number[] }).starts;
const durations = (timingData as { durations: number[] }).durations;

const EP = 'u1e7';

/* ------------------------------------------------------------------ */
/* Sub-beats: timed visual events. offset = seconds into the turn.      */
/* Offsets are heuristic within-turn placements; every offset is < its */
/* turn's duration. Within a turn, SmartText boxes never overlap.       */
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
  // PrimarySource props
  documentTitle?: string;
  authorAndDate?: string;
  excerptText?: string;
  highlightedPhrase?: string;
  hippType?: 'Historical Context' | 'Intended Audience' | 'Purpose' | 'Point of View';
  hippExplanation?: string;
}

const SUB_BEATS: SubBeat[] = [
  // === ACT 1: THE TRIAL BEGINS (t00-t17) ===

  // t00: Opening — labor chain callback, four boxes, mock-trial joke
  { turnId: 't00', offset: 8.0, kind: 'smarttext', text: 'FOUR BOXES', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't00', offset: 16.0, kind: 'smarttext', text: "SEPÚLVEDA'S CASE · LAS CASAS'S ANSWER", level: 'body', position: [0.5, 0.4] },
  { turnId: 't00', offset: 22.0, kind: 'smarttext', text: 'THE NEW LAWS · THE AFTERLIFE', level: 'body', position: [0.5, 0.52] },
  { turnId: 't00', offset: 32.0, kind: 'smarttext', text: 'A HUNG JURY MEANS NOBODY WINS', level: 'subtitle', position: [0.5, 0.66], color: '#ffd700' },
  { turnId: 't00', offset: 42.0, kind: 'bubble', text: 'I did mock trial in eighth grade', position: [0.5, 0.3], width: 360 },

  // t01: The quoted lines are real
  { turnId: 't01', offset: 0.5, kind: 'smarttext', text: 'HIS WORDS. OUR DRAMA.', level: 'subtitle', position: [0.5, 0.25] },

  // t02: Valladolid 1550 — both advocates introduced
  { turnId: 't02', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e7/valladolid-1550.jpg' },
  { turnId: 't02', offset: 1.0, kind: 'smarttext', text: 'VALLADOLID, 1550', level: 'hero', position: [0.5, 0.18], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't02', offset: 7.0, kind: 'smarttext', text: 'CHARLES V PAUSES THE CONQUESTS', level: 'title', position: [0.5, 0.38] },
  { turnId: 't02', offset: 14.0, kind: 'versus' },

  // t03: Sepúlveda opens — Aristotle, homunculi
  { turnId: 't03', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e7/aristotle-bust.jpg' },
  { turnId: 't03', offset: 1.0, kind: 'smarttext', text: 'ARISTOTLE', level: 'hero', position: [0.5, 0.18], entrance: 'stamp' },
  { turnId: 't03', offset: 7.0, kind: 'smarttext', text: 'SLAVES BY NATURE', level: 'title', position: [0.5, 0.38], color: '#ff6b6b' },
  { turnId: 't03', offset: 14.0, kind: 'smarttext', text: 'HOMUNCULI', level: 'hero', position: [0.5, 0.56], entrance: 'stamp', color: '#ff6b6b' },
  { turnId: 't03', offset: 20.0, kind: 'smarttext', text: '"LITTLE MEN"', level: 'subtitle', position: [0.5, 0.7] },
  { turnId: 't03', offset: 25.0, kind: 'smarttext', text: 'ORDER, NOT CRUELTY', level: 'body', position: [0.5, 0.82] },

  // t04: Fullmetal Alchemist joke
  { turnId: 't04', offset: 0.3, kind: 'bubble', text: 'Homunculi — like the Fullmetal Alchemist villains?', position: [0.5, 0.3], width: 440 },

  // t05: Sepúlveda — don't know your alchemists
  { turnId: 't05', offset: 0.3, kind: 'bubble', text: '"Little men" — in my Latin.', position: [0.5, 0.3], width: 320 },

  // t06: Marcus — cartoon word, natural history
  { turnId: 't06', offset: 0.5, kind: 'smarttext', text: 'A CARTOON WORD', level: 'subtitle', position: [0.5, 0.25], color: '#ffd700' },
  { turnId: 't06', offset: 2.5, kind: 'smarttext', text: 'MEANT AS NATURAL HISTORY', level: 'body', position: [0.5, 0.42] },

  // t07: "Marcus, your answer." — head switch is the visual

  // t08: Marcus answers — rational souls, Aquinas
  { turnId: 't08', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e7/las-casas-portrait.jpg' },
  { turnId: 't08', offset: 1.0, kind: 'smarttext', text: 'RATIONAL SOULS', level: 'hero', position: [0.5, 0.18], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't08', offset: 7.0, kind: 'smarttext', text: "TOWNS AND LAWS BEFORE 'SPANIARD'", level: 'title', position: [0.5, 0.36] },
  { turnId: 't08', offset: 14.0, kind: 'smarttext', text: 'AQUINAS: DOMINION FROM NATURAL LAW', level: 'subtitle', position: [0.5, 0.52] },
  { turnId: 't08', offset: 20.0, kind: 'bg-swap', bgImage: 'historic/u1e7/aquinas-portrait.jpg' },
  { turnId: 't08', offset: 21.0, kind: 'smarttext', text: 'EVEN UNBELIEVERS HOLD TRUE TITLE', level: 'body', position: [0.5, 0.66] },
  { turnId: 't08', offset: 26.0, kind: 'smarttext', text: 'GAVE IT BACK — 1514', level: 'subtitle', position: [0.5, 0.78], color: '#ffd700', entrance: 'stamp' },

  // t09: Round one — the four causes
  { turnId: 't09', offset: 0.5, kind: 'smarttext', text: 'ROUND ONE', level: 'subtitle', position: [0.5, 0.25], color: '#ffd700' },
  { turnId: 't09', offset: 2.5, kind: 'smarttext', text: 'THE FOUR CAUSES', level: 'title', position: [0.5, 0.42], entrance: 'stamp' },

  // t10: Sepúlveda — four just causes
  { turnId: 't10', offset: 1.0, kind: 'smarttext', text: 'FOUR JUST CAUSES', level: 'title', position: [0.5, 0.15], entrance: 'stamp' },
  { turnId: 't10', offset: 6.0, kind: 'smarttext', text: '1 · NATURAL SLAVERY', level: 'subtitle', position: [0.5, 0.32] },
  { turnId: 't10', offset: 11.0, kind: 'smarttext', text: '2 · IDOLATRY OFFENDS NATURAL LAW', level: 'subtitle', position: [0.5, 0.44] },
  { turnId: 't10', offset: 16.0, kind: 'smarttext', text: '3 · RESCUE THE INNOCENTS', level: 'subtitle', position: [0.5, 0.56] },
  { turnId: 't10', offset: 21.0, kind: 'smarttext', text: '4 · CARRY THE FAITH', level: 'subtitle', position: [0.5, 0.68] },
  { turnId: 't10', offset: 27.0, kind: 'smarttext', text: 'WAR AS MERCY', level: 'hero', position: [0.5, 0.84], entrance: 'stamp', color: '#ff6b6b' },

  // t11: Box one on the table — scoring move
  { turnId: 't11', offset: 1.0, kind: 'smarttext', text: 'ARISTOTLE → SEPÚLVEDA', level: 'title', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't11', offset: 7.0, kind: 'smarttext', text: 'THE COURT SCHOLAR, NOT A CONQUISTADOR', level: 'subtitle', position: [0.5, 0.42] },
  { turnId: 't11', offset: 13.0, kind: 'smarttext', text: 'EXAM PAIRS THEORY WITH THEORIST', level: 'body', position: [0.5, 0.58], color: '#ffd700' },

  // t12: So you sailed over?
  { turnId: 't12', offset: 0.3, kind: 'bubble', text: 'So you saw it yourself?', position: [0.5, 0.3], width: 300 },

  // t13: Sepúlveda — never crossed the Atlantic
  { turnId: 't13', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e7/oviedo-chronicle.jpg' },
  { turnId: 't13', offset: 1.0, kind: 'smarttext', text: 'NEVER CROSSED THE ATLANTIC', level: 'hero', position: [0.5, 0.2], entrance: 'stamp', color: '#ff6b6b' },
  { turnId: 't13', offset: 8.0, kind: 'smarttext', text: "ARISTOTLE + OVIEDO'S CHRONICLES", level: 'title', position: [0.5, 0.42] },
  { turnId: 't13', offset: 15.0, kind: 'smarttext', text: 'THE PRINCIPLE HOLDS REGARDLESS', level: 'subtitle', position: [0.5, 0.58] },

  // t14: Books, not voyages — the trap
  { turnId: 't14', offset: 1.0, kind: 'smarttext', text: 'BOOKS, NOT VOYAGES', level: 'hero', position: [0.5, 0.25], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't14', offset: 5.5, kind: 'smarttext', text: 'THE EXAM TRAP', level: 'subtitle', position: [0.5, 0.45] },

  // t15: Prediction — books or eyewitness?
  { turnId: 't15', offset: 1.0, kind: 'smarttext', text: "YOU'RE ON THE JUNTA", level: 'subtitle', position: [0.5, 0.22] },
  { turnId: 't15', offset: 5.0, kind: 'smarttext', text: 'BOOKS OR EYEWITNESS?', level: 'hero', position: [0.5, 0.42], entrance: 'stamp' },
  { turnId: 't15', offset: 11.0, kind: 'smarttext', text: 'CHOOSE.', level: 'body', position: [0.5, 0.6] },

  // t16: [8s pause] — think
  { turnId: 't16', offset: 0.5, kind: 'smarttext', text: 'THINK', level: 'subtitle', position: [0.5, 0.4], color: '#ffd700' },

  // t17: Box one checked
  { turnId: 't17', offset: 1.0, kind: 'smarttext', text: 'BOX 1 ✓', level: 'hero', position: [0.5, 0.3], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't17', offset: 4.0, kind: 'smarttext', text: "SEPÚLVEDA'S CASE", level: 'subtitle', position: [0.5, 0.5] },

  // === ACT 2: LAS CASAS'S ANSWER (t18-t29) ===

  // t18: Marcus — permission slip with Latin
  { turnId: 't18', offset: 1.0, kind: 'gravity', text: 'A PERMISSION SLIP', position: [0.5, 0.25] },
  { turnId: 't18', offset: 4.0, kind: 'gravity', text: 'WITH LATIN ON IT', position: [0.5, 0.45], color: '#ff6b6b' },

  // t19: Round two — the book
  { turnId: 't19', offset: 0.5, kind: 'smarttext', text: 'ROUND TWO', level: 'subtitle', position: [0.5, 0.25], color: '#ffd700' },

  // t20: The Short Account
  { turnId: 't20', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e7/short-account-title.jpg' },
  { turnId: 't20', offset: 1.0, kind: 'smarttext', text: 'A SHORT ACCOUNT', level: 'title', position: [0.5, 0.18], entrance: 'stamp' },
  { turnId: 't20', offset: 5.0, kind: 'smarttext', text: 'FINISHED 1542 · PRINTED 1552', level: 'subtitle', position: [0.5, 0.36] },
  { turnId: 't20', offset: 8.0, kind: 'primarysource',
    documentTitle: 'Brevísima relación de la destrucción de las Indias',
    authorAndDate: 'Bartolomé de las Casas, written 1542, printed 1552',
    excerptText: 'Village by village: the mines, the forced labor. Testimony from a man who watched it happen — not a scholar who read about it.',
    highlightedPhrase: 'a man who watched it happen',
    hippType: 'Point of View',
    hippExplanation: 'An eyewitness testifies from inside the events. Against Sepúlveda\u2019s library-built case, Las Casas answers with lived experience.' },

  // t21: Three million to two hundred?
  { turnId: 't21', offset: 0.5, kind: 'smarttext', text: '3 MILLION → 200?', level: 'hero', position: [0.5, 0.3], entrance: 'stamp', color: '#ff6b6b' },

  // t22: The warning label
  { turnId: 't22', offset: 1.0, kind: 'smarttext', text: 'THE WARNING LABEL', level: 'subtitle', position: [0.5, 0.25] },
  { turnId: 't22', offset: 5.0, kind: 'smarttext', text: 'THE CRUELTY WAS REAL', level: 'title', position: [0.5, 0.42], color: '#51cf66' },
  { turnId: 't22', offset: 9.0, kind: 'smarttext', text: 'THE MILLIONS WERE NOT', level: 'title', position: [0.5, 0.58], color: '#ff6b6b', entrance: 'stamp' },

  // t23: Watch the trap
  { turnId: 't23', offset: 1.0, kind: 'smarttext', text: "NOT WHETHER HE'S LYING", level: 'subtitle', position: [0.5, 0.28] },
  { turnId: 't23', offset: 6.0, kind: 'smarttext', text: 'WHAT THE EXAGGERATION WAS FOR', level: 'title', position: [0.5, 0.44], entrance: 'stamp' },
  { turnId: 't23', offset: 10.0, kind: 'smarttext', text: 'TO MOVE A KING, NOT FILE A CENSUS', level: 'body', position: [0.5, 0.6] },

  // t24: Quotable — and wrong
  { turnId: 't24', offset: 1.0, kind: 'smarttext', text: 'QUOTABLE — AND WRONG', level: 'hero', position: [0.5, 0.3], entrance: 'stamp', color: '#ff6b6b' },
  { turnId: 't24', offset: 4.5, kind: 'smarttext', text: "CRUELTY HOLDS · ARITHMETIC DOESN'T", level: 'body', position: [0.5, 0.5] },

  // t25: The blind spot
  { turnId: 't25', offset: 1.0, kind: 'smarttext', text: 'THE BLIND SPOT', level: 'subtitle', position: [0.5, 0.25], color: '#ffd700' },
  { turnId: 't25', offset: 4.0, kind: 'smarttext', text: 'HIS OWN PLAN', level: 'title', position: [0.5, 0.42], entrance: 'stamp' },

  // t26: The worst page he ever wrote
  { turnId: 't26', offset: 1.0, kind: 'smarttext', text: 'THE WORST PAGE HE EVER WROTE', level: 'title', position: [0.5, 0.22], entrance: 'stamp', color: '#ff6b6b' },
  { turnId: 't26', offset: 6.0, kind: 'smarttext', text: '1516: SHIP ENSLAVED AFRICANS', level: 'subtitle', position: [0.5, 0.4] },
  { turnId: 't26', offset: 11.0, kind: 'smarttext', text: 'THEN TOOK IT BACK', level: 'subtitle', position: [0.5, 0.54], color: '#51cf66' },
  { turnId: 't26', offset: 15.0, kind: 'smarttext', text: 'IF NO ONE IS A NATURAL SLAVE — NO ONE IS', level: 'body', position: [0.5, 0.68] },

  // t27: Las Casas's answer so far
  { turnId: 't27', offset: 1.0, kind: 'smarttext', text: 'RATIONAL SOULS · ORDERED STATES', level: 'subtitle', position: [0.5, 0.28] },
  { turnId: 't27', offset: 4.5, kind: 'smarttext', text: 'THE EYEWITNESS BOOK · BLIND SPOTS OWNED', level: 'body', position: [0.5, 0.46] },

  // t28: Did he paint them gentler?
  { turnId: 't28', offset: 1.0, kind: 'bubble', text: 'Did he romanticize them?', position: [0.5, 0.3], width: 340 },

  // t29: Humanity enough
  { turnId: 't29', offset: 1.0, kind: 'smarttext', text: 'NEVER WHETHER THEY WERE PERFECT', level: 'body', position: [0.5, 0.35] },
  { turnId: 't29', offset: 4.0, kind: 'smarttext', text: 'WHETHER THEY WERE PEOPLE', level: 'hero', position: [0.5, 0.55], entrance: 'stamp', color: '#51cf66' },

  // === ACT 3: THE VERDICT THAT WASN'T (t30-t40) ===

  // t30: The New Laws
  { turnId: 't30', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e7/new-laws-document.jpg' },
  { turnId: 't30', offset: 1.0, kind: 'smarttext', text: 'THE NEW LAWS · 1542', level: 'title', position: [0.5, 0.25], entrance: 'stamp' },

  // t31: Wind down the encomienda
  { turnId: 't31', offset: 1.0, kind: 'smarttext', text: 'NO NEW GRANTS', level: 'subtitle', position: [0.5, 0.3] },
  { turnId: 't31', offset: 5.0, kind: 'smarttext', text: 'DIES WITH ITS HOLDER', level: 'title', position: [0.5, 0.46], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't31', offset: 9.0, kind: 'smarttext', text: 'BACK TO THE CROWN', level: 'subtitle', position: [0.5, 0.62] },

  // t32: Sepúlveda — Pizarro's revolt
  { turnId: 't32', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e7/spanish-court-1550.jpg' },
  { turnId: 't32', offset: 1.0, kind: 'smarttext', text: 'GONZALO PIZARRO', level: 'title', position: [0.5, 0.22], entrance: 'stamp' },
  { turnId: 't32', offset: 6.0, kind: 'smarttext', text: 'AN ARMY OF ENCOMENDEROS', level: 'subtitle', position: [0.5, 0.4] },
  { turnId: 't32', offset: 10.0, kind: 'smarttext', text: "CAN'T GOVERN AGAINST THE HOLDERS", level: 'body', position: [0.5, 0.58] },

  // t33: Charles blinked
  { turnId: 't33', offset: 1.0, kind: 'smarttext', text: '1545: THE CROWN BLINKS', level: 'hero', position: [0.5, 0.25], entrance: 'stamp', color: '#ff6b6b' },
  { turnId: 't33', offset: 6.0, kind: 'smarttext', text: 'INHERITANCE BAN REVOKED', level: 'subtitle', position: [0.5, 0.45] },
  { turnId: 't33', offset: 8.5, kind: 'smarttext', text: 'AÑAQUITO, JANUARY 1546', level: 'body', position: [0.5, 0.6] },

  // t34: Timing trap
  { turnId: 't34', offset: 1.0, kind: 'smarttext', text: '1542 → 1550', level: 'hero', position: [0.5, 0.25], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't34', offset: 6.0, kind: 'smarttext', text: 'THE FAILURE CAME FIRST', level: 'subtitle', position: [0.5, 0.45] },
  { turnId: 't34', offset: 9.0, kind: 'smarttext', text: 'THE DEBATE WAS THE SECOND TRY', level: 'body', position: [0.5, 0.6] },

  // t35: Not with laws — with a debate
  { turnId: 't35', offset: 1.0, kind: 'smarttext', text: 'NOT WITH LAWS — WITH A DEBATE', level: 'subtitle', position: [0.5, 0.3] },

  // t36: The junta meets
  { turnId: 't36', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e7/valladolid-1550.jpg' },
  { turnId: 't36', offset: 1.0, kind: 'smarttext', text: 'AUGUST 1550', level: 'hero', position: [0.5, 0.2], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't36', offset: 6.0, kind: 'smarttext', text: "THEOLOGIANS · JURISTS · THE EMPIRE'S BEST", level: 'body', position: [0.5, 0.42] },
  { turnId: 't36', offset: 10.0, kind: 'smarttext', text: 'APRIL 1551: THEY MEET AGAIN', level: 'subtitle', position: [0.5, 0.58] },

  // t37: Prediction — the third option
  { turnId: 't37', offset: 1.0, kind: 'smarttext', text: "CONDEMN IT: SPAIN'S TITLE UNWINDS", level: 'subtitle', position: [0.5, 0.3] },
  { turnId: 't37', offset: 5.0, kind: 'smarttext', text: 'BLESS IT: EVERY CONQUISTADOR LICENSED', level: 'subtitle', position: [0.5, 0.46] },
  { turnId: 't37', offset: 9.0, kind: 'smarttext', text: 'A THIRD OPTION?', level: 'hero', position: [0.5, 0.64], entrance: 'stamp' },

  // t38: [10s pause] — think
  { turnId: 't38', offset: 0.5, kind: 'smarttext', text: 'THINK', level: 'subtitle', position: [0.5, 0.4], color: '#ffd700' },

  // t39: The verdict that wasn't
  { turnId: 't39', offset: 1.0, kind: 'smarttext', text: "THE VERDICT THAT WASN'T", level: 'hero', position: [0.5, 0.3], entrance: 'stamp', color: '#ff6b6b' },
  { turnId: 't39', offset: 4.5, kind: 'smarttext', text: 'BOTH SIDES CLAIMED VICTORY', level: 'subtitle', position: [0.5, 0.5] },

  // t40: Two-for-one mistake + box 3
  { turnId: 't40', offset: 1.0, kind: 'smarttext', text: 'NEW LAWS ≠ END OF ENCOMIENDA', level: 'title', position: [0.5, 0.28], entrance: 'stamp' },
  { turnId: 't40', offset: 6.0, kind: 'smarttext', text: 'NO VERDICT ≠ SOMEONE WON', level: 'title', position: [0.5, 0.46], entrance: 'stamp' },
  { turnId: 't40', offset: 11.0, kind: 'smarttext', text: 'BOX 3 ✓', level: 'hero', position: [0.5, 0.66], entrance: 'stamp', color: '#51cf66' },

  // === ACT 4: THE AFTERLIFE (t41-t47) ===

  // t41: Last box
  { turnId: 't41', offset: 0.5, kind: 'smarttext', text: 'THE AFTERLIFE', level: 'subtitle', position: [0.5, 0.3], color: '#ffd700' },

  // t42: The Black Legend
  { turnId: 't42', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e7/black-legend-press.jpg' },
  { turnId: 't42', offset: 1.0, kind: 'smarttext', text: 'IT MOVED HIS ENEMIES INSTEAD', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't42', offset: 7.0, kind: 'smarttext', text: 'DUTCH PRINTERS, 1578', level: 'subtitle', position: [0.5, 0.38] },
  { turnId: 't42', offset: 12.0, kind: 'smarttext', text: 'LONDON, 1583', level: 'subtitle', position: [0.5, 0.5] },
  { turnId: 't42', offset: 17.0, kind: 'smarttext', text: 'THE BLACK LEGEND', level: 'hero', position: [0.5, 0.66], entrance: 'stamp', color: '#ff6b6b' },
  { turnId: 't42', offset: 22.0, kind: 'smarttext', text: 'HIS PAGES · THEIR WEAPON', level: 'body', position: [0.5, 0.8] },

  // t43: Reform book → propaganda?
  { turnId: 't43', offset: 0.5, kind: 'bubble', text: 'Reform book → Protestant propaganda?', position: [0.5, 0.3], width: 400 },

  // t44: Aimed at his own country
  { turnId: 't44', offset: 0.5, kind: 'smarttext', text: 'AIMED AT HIS OWN COUNTRY', level: 'subtitle', position: [0.5, 0.3], color: '#ff6b6b' },

  // t45: Who built it + box 4
  { turnId: 't45', offset: 1.0, kind: 'smarttext', text: "LAS CASAS DIDN'T INVENT IT", level: 'title', position: [0.5, 0.28], entrance: 'stamp' },
  { turnId: 't45', offset: 6.0, kind: 'smarttext', text: 'ENGLISH + DUTCH PRINTERS BUILT IT', level: 'subtitle', position: [0.5, 0.46] },
  { turnId: 't45', offset: 9.0, kind: 'smarttext', text: 'BOX 4 ✓', level: 'hero', position: [0.5, 0.64], entrance: 'stamp', color: '#51cf66' },

  // t46: The question outlived
  { turnId: 't46', offset: 1.0, kind: 'smarttext', text: 'THE QUESTION OUTLIVED THE MISUSE', level: 'subtitle', position: [0.5, 0.3] },

  // t47: The only time
  { turnId: 't47', offset: 1.0, kind: 'smarttext', text: 'THE ONLY TIME', level: 'hero', position: [0.5, 0.22], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't47', offset: 6.0, kind: 'smarttext', text: 'AN EMPEROR HALTED HIS CONQUESTS', level: 'title', position: [0.5, 0.4] },
  { turnId: 't47', offset: 11.0, kind: 'smarttext', text: 'TO ASK IF THEY WERE JUST', level: 'subtitle', position: [0.5, 0.56] },
  { turnId: 't47', offset: 15.0, kind: 'smarttext', text: 'A SEED OF NATURAL RIGHTS', level: 'body', position: [0.5, 0.7] },

  // === ACT 5: RECAP + EXAM (t48-t69) ===

  // t48: Box one recap
  { turnId: 't48', offset: 1.0, kind: 'smarttext', text: "BOX 1: SEPÚLVEDA'S CASE", level: 'title', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't48', offset: 6.0, kind: 'smarttext', text: "ARISTOTLE'S NATURAL SLAVES + FOUR CAUSES", level: 'body', position: [0.5, 0.44] },
  { turnId: 't48', offset: 10.0, kind: 'smarttext', text: 'BOX 1 ✓', level: 'subtitle', position: [0.5, 0.6], color: '#51cf66' },

  // t49: Sepúlveda — conquest as mercy
  { turnId: 't49', offset: 0.5, kind: 'bubble', text: '"Conquest as mercy."', position: [0.5, 0.3], width: 300 },

  // t50: Box two recap
  { turnId: 't50', offset: 1.0, kind: 'smarttext', text: "BOX 2: LAS CASAS'S ANSWER", level: 'title', position: [0.5, 0.22], entrance: 'stamp' },
  { turnId: 't50', offset: 6.0, kind: 'smarttext', text: 'RATIONAL SOULS · SHORT ACCOUNT (1542/1552)', level: 'body', position: [0.5, 0.4] },
  { turnId: 't50', offset: 11.0, kind: 'smarttext', text: 'NUMBERS EXAGGERATED · BLIND SPOTS OWNED', level: 'body', position: [0.5, 0.54] },
  { turnId: 't50', offset: 16.0, kind: 'smarttext', text: 'BOX 2 ✓', level: 'subtitle', position: [0.5, 0.68], color: '#51cf66' },

  // t51: 1514
  { turnId: 't51', offset: 0.5, kind: 'smarttext', text: '1514.', level: 'subtitle', position: [0.5, 0.3], color: '#ffd700' },

  // t52: Box three recap
  { turnId: 't52', offset: 1.0, kind: 'smarttext', text: 'BOX 3: NEW LAWS → NO VERDICT', level: 'title', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't52', offset: 6.0, kind: 'smarttext', text: '1542 LAWS · 1545 REVOKED · 1550/51 NO RULING', level: 'body', position: [0.5, 0.44] },
  { turnId: 't52', offset: 9.5, kind: 'smarttext', text: 'BOX 3 ✓', level: 'subtitle', position: [0.5, 0.6], color: '#51cf66' },

  // t53: Dates
  { turnId: 't53', offset: 1.0, kind: 'smarttext', text: 'JANUARY 1546', level: 'subtitle', position: [0.5, 0.3], color: '#ffd700' },
  { turnId: 't53', offset: 4.5, kind: 'smarttext', text: 'AUGUST 1550 · APRIL 1551 · NO VERDICT', level: 'body', position: [0.5, 0.48] },

  // t54: Box four recap
  { turnId: 't54', offset: 1.0, kind: 'smarttext', text: 'BOX 4: THE AFTERLIFE', level: 'title', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't54', offset: 6.0, kind: 'smarttext', text: 'HIS PAGES → THEIR PROPAGANDA', level: 'subtitle', position: [0.5, 0.44] },
  { turnId: 't54', offset: 10.0, kind: 'smarttext', text: 'BOX 4 ✓', level: 'subtitle', position: [0.5, 0.6], color: '#51cf66' },

  // t55: Won the afterlife
  { turnId: 't55', offset: 0.3, kind: 'smarttext', text: 'WON THE AFTERLIFE', level: 'subtitle', position: [0.5, 0.3], color: '#51cf66' },

  // t56: AP questions intro
  { turnId: 't56', offset: 1.0, kind: 'smarttext', text: 'THREE QUESTIONS, AP-SHAPED', level: 'title', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't56', offset: 6.0, kind: 'smarttext', text: 'SAY IT BEFORE I DO', level: 'subtitle', position: [0.5, 0.42] },
  { turnId: 't56', offset: 11.0, kind: 'smarttext', text: 'LEQ: THIS DEBATE = YOUR COUNTERARGUMENT', level: 'body', position: [0.5, 0.58], color: '#ffd700' },

  // t57: Q1 with source
  { turnId: 't57', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e7/short-account-title.jpg' },
  { turnId: 't57', offset: 1.0, kind: 'primarysource',
    documentTitle: 'In Defense of the Indians',
    authorAndDate: 'Bartolomé de las Casas, Valladolid, 1550',
    excerptText: 'They are not ignorant, inhuman, or bestial. Rather, long before they had heard the word Spaniard they had properly organized states, wisely ordered by excellent laws, religion, and custom.',
    highlightedPhrase: 'properly organized states, wisely ordered by excellent laws',
    hippType: 'Purpose',
    hippExplanation: 'Las Casas writes to persuade the junta: if these peoples govern themselves by excellent laws, they cannot be natural slaves. The source is an argument, not a census.' },

  // t58: [20s pause] — think
  { turnId: 't58', offset: 0.5, kind: 'smarttext', text: 'THINK', level: 'subtitle', position: [0.5, 0.4], color: '#ffd700' },

  // t59: Q1 answer
  { turnId: 't59', offset: 1.0, kind: 'smarttext', text: 'CLAIM: RATIONAL + SELF-GOVERNING', level: 'subtitle', position: [0.5, 0.28] },
  { turnId: 't59', offset: 6.0, kind: 'smarttext', text: 'EVIDENCE: ORDERED STATES, EXCELLENT LAWS', level: 'body', position: [0.5, 0.44] },
  { turnId: 't59', offset: 11.0, kind: 'smarttext', text: 'ANSWERING SEPÚLVEDA', level: 'title', position: [0.5, 0.6], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't59', offset: 15.0, kind: 'smarttext', text: 'Q1 ✓', level: 'hero', position: [0.5, 0.76], entrance: 'stamp', color: '#51cf66' },

  // t60: Q2
  { turnId: 't60', offset: 1.0, kind: 'smarttext', text: '"SEPÚLVEDA SAW IT HIMSELF"', level: 'subtitle', position: [0.5, 0.3] },
  { turnId: 't60', offset: 4.5, kind: 'smarttext', text: "WHAT'S THE MISTAKE?", level: 'title', position: [0.5, 0.48], entrance: 'stamp' },

  // t61: [15s pause] — think
  { turnId: 't61', offset: 0.5, kind: 'smarttext', text: 'THINK', level: 'subtitle', position: [0.5, 0.4], color: '#ffd700' },

  // t62: Q2 answer
  { turnId: 't62', offset: 1.0, kind: 'smarttext', text: 'HE NEVER WENT', level: 'hero', position: [0.5, 0.25], entrance: 'stamp', color: '#ff6b6b' },
  { turnId: 't62', offset: 6.0, kind: 'smarttext', text: 'ARISTOTLE + OVIEDO — NEVER LEFT THE LIBRARY', level: 'body', position: [0.5, 0.45] },
  { turnId: 't62', offset: 11.0, kind: 'smarttext', text: 'Q2 ✓', level: 'hero', position: [0.5, 0.62], entrance: 'stamp', color: '#51cf66' },

  // t63: Q3
  { turnId: 't63', offset: 1.0, kind: 'smarttext', text: 'NO VERDICT — WHY DANGEROUS?', level: 'subtitle', position: [0.5, 0.3] },
  { turnId: 't63', offset: 5.0, kind: 'smarttext', text: 'EITHER WAY BROKE SOMETHING', level: 'title', position: [0.5, 0.48], entrance: 'stamp' },

  // t64: [15s pause] — think
  { turnId: 't64', offset: 0.5, kind: 'smarttext', text: 'THINK', level: 'subtitle', position: [0.5, 0.4], color: '#ffd700' },

  // t65: Q3 answer
  { turnId: 't65', offset: 1.0, kind: 'smarttext', text: 'CONDEMN: TITLE UNWINDS', level: 'subtitle', position: [0.5, 0.3] },
  { turnId: 't65', offset: 5.0, kind: 'smarttext', text: 'BLESS: CONQUISTADORS LICENSED', level: 'subtitle', position: [0.5, 0.44] },
  { turnId: 't65', offset: 10.0, kind: 'smarttext', text: 'Q3 ✓', level: 'hero', position: [0.5, 0.62], entrance: 'stamp', color: '#51cf66' },

  // t66: Bonus — fast
  { turnId: 't66', offset: 0.5, kind: 'smarttext', text: 'FAST ONE:', level: 'subtitle', position: [0.5, 0.28], color: '#ffd700' },
  { turnId: 't66', offset: 2.0, kind: 'smarttext', text: 'WHOSE PAGES? WHOSE PRESSES?', level: 'title', position: [0.5, 0.46], entrance: 'stamp' },

  // t67: [5s pause] — think
  { turnId: 't67', offset: 0.5, kind: 'smarttext', text: 'THINK', level: 'subtitle', position: [0.5, 0.4], color: '#ffd700' },

  // t68: Bonus answer
  { turnId: 't68', offset: 0.5, kind: 'smarttext', text: "LAS CASAS'S PAGES · ENGLISH + DUTCH PRESSES", level: 'subtitle', position: [0.5, 0.35], color: '#51cf66' },

  // t69: Closing
  { turnId: 't69', offset: 1.0, kind: 'smarttext', text: 'THE EMPIRE PUT ITS CONQUESTS ON TRIAL', level: 'title', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't69', offset: 7.0, kind: 'smarttext', text: 'AND THE TRIAL OUTLIVED THE EMPIRE', level: 'hero', position: [0.5, 0.45], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't69', offset: 13.0, kind: 'smarttext', text: 'NEXT: 1680 · THE PUEBLO REVOLT', level: 'body', position: [0.5, 0.68] },
];

/* ------------------------------------------------------------------ */
/* Versus: Sepúlveda vs Las Casas (t02)                                  */
/* ------------------------------------------------------------------ */
const VERSUS_DEBATE = {
  clashTitle: 'THE VALLADOLID DEBATE',
  periodLabel: '1550–1551 · SPAIN PUTS CONQUEST ON TRIAL',
  entityA: {
    name: 'SEPÚLVEDA',
    subtitle: "The court's scholar",
    points: ["Aristotle's natural slaves", 'Four just causes', 'Never left the library'],
    color: '#ff6b6b',
    accentColor: '#ff6b6b',
    faction: 'FOR CONQUEST',
    portraitDesc: '📜',
    coreIdeology: 'Conquest as mercy.',
  },
  entityB: {
    name: 'LAS CASAS',
    subtitle: 'The eyewitness friar (via Marcus)',
    points: ['Rational souls', 'The Short Account', 'Gave back his encomienda'],
    color: '#51cf66',
    accentColor: '#51cf66',
    faction: 'AGAINST CONQUEST',
    portraitDesc: '✝️',
    coreIdeology: 'Offer the faith. Never force it.',
  },
  verdictSummary: 'No verdict. Both sides claimed victory — and the question outlived the empire.',
};

/* ------------------------------------------------------------------ */
/* Background per turn                                                  */
/* ------------------------------------------------------------------ */
const getBackgroundForTurn = (turnId: string | null, subBeatBg: string | null): string => {
  if (subBeatBg) return subBeatBg;
  if (!turnId) return 'historic/u1e7/valladolid-1550.jpg';
  const n = parseInt(turnId.slice(1), 10);
  // Act 1: the trial begins (t00-t17)
  if (n <= 2) return 'historic/u1e7/valladolid-1550.jpg';
  if (n === 3) return 'historic/u1e7/aristotle-bust.jpg';
  if (n <= 7) return 'historic/u1e7/valladolid-1550.jpg';
  if (n === 8) return 'historic/u1e7/las-casas-portrait.jpg';
  if (n <= 11) return 'historic/u1e7/aristotle-bust.jpg';
  if (n === 12) return 'historic/u1e7/valladolid-1550.jpg';
  if (n === 13) return 'historic/u1e7/oviedo-chronicle.jpg';
  if (n <= 17) return 'historic/u1e7/valladolid-1550.jpg';
  // Act 2: Las Casas's answer (t18-t29)
  if (n <= 20) return 'historic/u1e7/short-account-title.jpg';
  if (n <= 26) return 'historic/u1e7/las-casas-portrait.jpg';
  if (n <= 29) return 'historic/u1e7/dominican-friar.jpg';
  // Act 3: the verdict that wasn't (t30-t40)
  if (n === 30) return 'historic/u1e7/new-laws-document.jpg';
  if (n === 31) return 'historic/u1e7/new-laws-document.jpg';
  if (n === 32) return 'historic/u1e7/spanish-court-1550.jpg';
  if (n <= 35) return 'historic/u1e7/charles-v-titian.jpg';
  if (n <= 40) return 'historic/u1e7/valladolid-1550.jpg';
  // Act 4: the afterlife (t41-t47)
  if (n <= 45) return 'historic/u1e7/black-legend-press.jpg';
  if (n <= 47) return 'historic/u1e7/valladolid-1550.jpg';
  // Act 5: recap + exam (t48-t69)
  if (n === 48) return 'historic/u1e7/sepulveda-portrait.jpg';
  if (n === 49) return 'historic/u1e7/sepulveda-portrait.jpg';
  if (n === 50) return 'historic/u1e7/las-casas-portrait.jpg';
  if (n === 51) return 'historic/u1e7/las-casas-portrait.jpg';
  if (n === 52) return 'historic/u1e7/new-laws-document.jpg';
  if (n === 53) return 'historic/u1e7/valladolid-1550.jpg';
  if (n === 54) return 'historic/u1e7/black-legend-press.jpg';
  if (n === 55) return 'historic/u1e7/black-legend-press.jpg';
  if (n <= 59) return 'historic/u1e7/short-account-title.jpg';
  if (n <= 62) return 'historic/u1e7/sepulveda-portrait.jpg';
  if (n <= 65) return 'historic/u1e7/valladolid-1550.jpg';
  if (n <= 68) return 'historic/u1e7/black-legend-press.jpg';
  return 'historic/u1e7/valladolid-1550.jpg';
};

/* ------------------------------------------------------------------ */
/* Main episode                                                         */
/* ------------------------------------------------------------------ */
export const U1E7Episode: React.FC = () => {
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

  const isPause = activeTurn?.speaker === 'pause';
  const isSepulveda = activeTurn?.speaker === 'sepúlveda';
  const isMarcus = activeTurn?.speaker === 'marcus';

  // Heads: Maya (gold), Marcus (blue), Sepúlveda (crimson, his portrait).
  // No head during pause turns — the silence is the visual.
  const showHead = activeTurn && !isPause &&
    (activeTurn.speaker === 'maya' || isMarcus || isSepulveda) &&
    !(activeTurn.id === 't00' && turnElapsed < 3);

  const headConfig = isSepulveda
    ? { name: 'Sepúlveda', color: '#dc2626', realistic: staticFile('historic/u1e7/sepulveda-portrait.jpg') }
    : isMarcus
      ? { name: 'Marcus', color: '#3b82f6', realistic: staticFile('marcus-real.webp') }
      : { name: 'Maya', color: '#c9a227', realistic: staticFile('maya-real.webp') };

  return (
    <ToneProvider tone="serious">
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
            <TitleCard kicker="UNIT 1 · EPISODE 7:"
              title="THE VALLADOLID DEBATE" subline="SPAIN PUTS CONQUEST ON TRIAL" at={activeStartFrame} />
          )}

          {/* Versus: Sepúlveda vs Las Casas (t02) */}
          {activeTurn?.id === 't02' && turnElapsed >= 14 && (
            <VersusPolarization
              clashTitle={VERSUS_DEBATE.clashTitle}
              periodLabel={VERSUS_DEBATE.periodLabel}
              entityA={VERSUS_DEBATE.entityA}
              entityB={VERSUS_DEBATE.entityB}
              verdictSummary={VERSUS_DEBATE.verdictSummary}
            />
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

            // versus is handled above (full-turn component)
            // bg-swap is handled via subBeatBg

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
