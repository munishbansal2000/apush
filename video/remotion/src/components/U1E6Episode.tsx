/**
 * U1E6Episode — Unit 1 Episode 6: Labor Systems.
 *
 * The encomienda, the repartimiento, the Middle Passage, the casta
 * system with the hacienda hiding behind it. Four systems, one hunger —
 * and the workers paid for all of them.
 *
 * Four boxes: the encomienda (grant of labor/tribute, killed by its own
 * contradictions), the repartimiento (the crown's rotating draft),
 * the Middle Passage (1 in 8 died, priced in), the casta ladder and
 * the hacienda (debt did what chains used to do).
 *
 * Tone arc: SERIOUS throughout with human moments — Jay's "slavery with
 * homework," the closet analogy, the Warcraft peon joke, Maya's on-air
 * peninsulares/criollos mix-up and correction. Gravity where it's due.
 *
 * 91 turns (57 Maya + 34 Jay), ~750 seconds, 30fps.
 * Script: audio_scripts/unit1/apush-audio-u1-e6-script-v6-DRAFT.md (canonical)
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
import { ToneProvider } from '../validation/ToneContext';
import { AutoLayoutProvider } from '../validation/AutoLayout';

import { loadEpisodeData, type EpisodeData } from '../lib/load-episode-data';

interface Turn {
  id: string;
  speaker: string;
  text: string;
  duration_sec: number;
  pause_after?: number;
}


const EP = 'u1e6';

/* ------------------------------------------------------------------ */
/* Sub-beats: timed visual events. offset = seconds into the turn.      */
/* Offsets are heuristic within-turn placements (word_times.json is    */
/* empty for this episode); every offset is < its turn's duration.     */
/* Within a turn, SmartText boxes never overlap (validator-enforced).   */
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
}

const SUB_BEATS: SubBeat[] = [
  // === ACT 1: THE ENCOMIENDA (t00-t19) ===

  // t00: Opening — Potosí callback, four boxes
  { turnId: 't00', offset: 10.0, kind: 'smarttext', text: 'FOUR BOXES', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't00', offset: 16.0, kind: 'smarttext', text: 'THE ENCOMIENDA · THE REPARTIMIENTO', level: 'body', position: [0.5, 0.4] },
  { turnId: 't00', offset: 20.0, kind: 'smarttext', text: 'THE MIDDLE PASSAGE · CASTA + HACIENDA', level: 'body', position: [0.5, 0.52] },

  // t01: Warm-up
  { turnId: 't01', offset: 0.5, kind: 'smarttext', text: 'WARM-UP', level: 'subtitle', position: [0.5, 0.25], color: '#ffd700' },

  // t02: Jay's guess
  { turnId: 't02', offset: 1.0, kind: 'bubble', text: 'Uh. Encomienda. Slavery. The... mita?', position: [0.5, 0.3], width: 420 },

  // t03: Four minimum + mita callback
  { turnId: 't03', offset: 0.5, kind: 'smarttext', text: 'FOUR, MINIMUM', level: 'subtitle', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't03', offset: 5.0, kind: 'smarttext', text: 'THE MITA = PERU (LAST TIME)', level: 'body', position: [0.5, 0.42] },

  // t04: Jay's question
  { turnId: 't04', offset: 0.3, kind: 'bubble', text: 'The crown gives a colonist a bunch of Native people?', position: [0.5, 0.3], width: 460 },

  // t05: The definition — labor and tribute, NOT the land
  { turnId: 't05', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e6/encomienda-workers.jpg' },
  { turnId: 't05', offset: 1.0, kind: 'smarttext', text: 'THE LABOR AND TRIBUTE', level: 'hero', position: [0.5, 0.18], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't05', offset: 5.0, kind: 'smarttext', text: 'NOT THE LAND — THE PEOPLE', level: 'title', position: [0.5, 0.4], entrance: 'stamp' },
  { turnId: 't05', offset: 9.0, kind: 'smarttext', text: 'IN RETURN: PROTECTION + TEACHING', level: 'body', position: [0.5, 0.58] },

  // t06: Jay's line
  { turnId: 't06', offset: 0.3, kind: 'bubble', text: "So it's slavery with homework.", position: [0.5, 0.3], width: 380 },

  // t07: Slavery with paperwork — the legal fiction
  { turnId: 't07', offset: 0.5, kind: 'smarttext', text: 'SLAVERY WITH PAPERWORK', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't07', offset: 5.0, kind: 'smarttext', text: '"FREE SUBJECTS OF THE KING"', level: 'subtitle', position: [0.5, 0.38], color: '#ffd700' },
  { turnId: 't07', offset: 10.0, kind: 'smarttext', text: 'THE PROTECTION WAS MOSTLY THEORETICAL', level: 'body', position: [0.5, 0.56] },

  // t08: Jay's question
  { turnId: 't08', offset: 0.3, kind: 'bubble', text: 'How does a system eat itself?', position: [0.5, 0.3], width: 380 },

  // t09: Disease empties the towns
  { turnId: 't09', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e6/silver-mine-workers.jpg' },
  { turnId: 't09', offset: 1.0, kind: 'smarttext', text: '50–90% DIED', level: 'hero', position: [0.5, 0.15], entrance: 'stamp', color: '#ff6b6b' },
  { turnId: 't09', offset: 5.0, kind: 'smarttext', text: '1500–1650', level: 'subtitle', position: [0.5, 0.55] },
  { turnId: 't09', offset: 9.0, kind: 'smarttext', text: 'A MACHINE WITH NO PARTS LEFT', level: 'body', position: [0.5, 0.68] },

  // t10: Las Casas
  { turnId: 't10', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e6/las-casas.jpg' },
  { turnId: 't10', offset: 1.0, kind: 'smarttext', text: 'BARTOLOMÉ DE LAS CASAS', level: 'title', position: [0.5, 0.18], entrance: 'stamp' },
  { turnId: 't10', offset: 5.0, kind: 'smarttext', text: "HE'D HELD AN ENCOMIENDA HIMSELF", level: 'body', position: [0.5, 0.36] },
  { turnId: 't10', offset: 9.0, kind: 'smarttext', text: 'GAVE IT BACK IN 1514', level: 'subtitle', position: [0.5, 0.52], color: '#ffd700' },
  { turnId: 't10', offset: 12.0, kind: 'smarttext', text: 'THE NEW LAWS, 1542', level: 'subtitle', position: [0.5, 0.66], entrance: 'stamp' },

  // t11: Jay's question
  { turnId: 't11', offset: 0.3, kind: 'bubble', text: 'What did the new laws say?', position: [0.5, 0.3], width: 340 },

  // t12: The two things that matter
  { turnId: 't12', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e6/new-laws.jpg' },
  { turnId: 't12', offset: 1.0, kind: 'smarttext', text: 'DIES WITH ITS HOLDER', level: 'title', position: [0.5, 0.2], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't12', offset: 5.0, kind: 'smarttext', text: 'NO INHERITANCE — BACK TO THE CROWN', level: 'body', position: [0.5, 0.38] },
  { turnId: 't12', offset: 9.0, kind: 'smarttext', text: 'NO MORE FORCED PERSONAL SERVICE', level: 'subtitle', position: [0.5, 0.54], entrance: 'stamp' },

  // t13: Prediction beat — you're an encomendero, 1544
  { turnId: 't13', offset: 0.5, kind: 'smarttext', text: "YOU'RE AN ENCOMENDERO, 1544", level: 'subtitle', position: [0.5, 0.22], color: '#ffd700' },
  { turnId: 't13', offset: 4.0, kind: 'smarttext', text: 'YOUR FORTUNE DIES WITH YOU', level: 'title', position: [0.5, 0.4], entrance: 'stamp' },
  { turnId: 't13', offset: 8.0, kind: 'smarttext', text: 'YOUR KIDS GET NOTHING', level: 'subtitle', position: [0.5, 0.58], color: '#ff6b6b' },

  // t14: Pizarro's rebellion
  { turnId: 't15', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e6/anaquito-battle.jpg' },
  { turnId: 't15', offset: 1.0, kind: 'smarttext', text: 'GONZALO PIZARRO', level: 'title', position: [0.5, 0.18], entrance: 'stamp' },
  { turnId: 't15', offset: 5.0, kind: 'smarttext', text: 'RAISED AN ARMY OF ENCOMENDEROS', level: 'body', position: [0.5, 0.36] },
  { turnId: 't15', offset: 9.0, kind: 'smarttext', text: 'BLASCO NÚÑEZ VELA', level: 'subtitle', position: [0.5, 0.52] },
  { turnId: 't15', offset: 13.0, kind: 'smarttext', text: 'KILLED AT AÑAQUITO, 1546', level: 'title', position: [0.5, 0.68], entrance: 'stamp', color: '#ff6b6b' },

  // t15: Jay's reaction
  { turnId: 't16', offset: 0.3, kind: 'bubble', text: "They killed the viceroy. The king's guy.", position: [0.5, 0.3], width: 420 },

  // t16: The crown blinked
  { turnId: 't17', offset: 1.0, kind: 'smarttext', text: "THE KING'S GUY, DEAD", level: 'title', position: [0.5, 0.25], entrance: 'stamp', color: '#ff6b6b' },
  { turnId: 't17', offset: 6.0, kind: 'smarttext', text: 'THE CROWN BLINKED', level: 'subtitle', position: [0.5, 0.45] },
  { turnId: 't17', offset: 10.0, kind: 'smarttext', text: 'DROPPED THE INHERITANCE BAN', level: 'body', position: [0.5, 0.6] },

  // t17: Jay
  { turnId: 't18', offset: 0.3, kind: 'bubble', text: 'So the whole fix failed.', position: [0.5, 0.3], width: 320 },

  // t18: The trap
  { turnId: 't19', offset: 1.0, kind: 'smarttext', text: 'EXAM TRAP: BOX 1', level: 'subtitle', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't19', offset: 4.0, kind: 'smarttext', text: '"THE NEW LAWS KILLED THE ENCOMIENDA"', level: 'body', position: [0.5, 0.38] },
  { turnId: 't19', offset: 8.0, kind: 'smarttext', text: 'THE ENCOMENDEROS KILLED THE REFORM', level: 'title', position: [0.5, 0.56], entrance: 'stamp', color: '#ff6b6b' },

  // t19: Box 1 checked
  { turnId: 't20', offset: 0.5, kind: 'smarttext', text: 'BOX 1 ✓', level: 'hero', position: [0.5, 0.3], entrance: 'stamp', color: '#51cf66' },

  // === ACT 2: THE REPARTIMIENTO (t20-t28) ===

  // t20: Box two
  { turnId: 't21', offset: 0.5, kind: 'smarttext', text: 'BOX 2: THE REPARTIMIENTO', level: 'title', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't21', offset: 3.0, kind: 'smarttext', text: "THE CROWN'S ANSWER TO THE DEAD-VICEROY PROBLEM", level: 'body', position: [0.5, 0.45] },

  // t21: Jay
  { turnId: 't22', offset: 0.3, kind: 'bubble', text: 'The answer was what, exactly?', position: [0.5, 0.3], width: 360 },

  // t22: The crown does the dividing
  { turnId: 't23', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e6/repartimiento-draft.jpg' },
  { turnId: 't23', offset: 1.0, kind: 'smarttext', text: 'THE CROWN DOES THE DIVIDING', level: 'title', position: [0.5, 0.2], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't23', offset: 6.0, kind: 'smarttext', text: 'ROTATING SHARE OF WORKERS', level: 'subtitle', position: [0.5, 0.4] },
  { turnId: 't23', offset: 11.0, kind: 'smarttext', text: 'YOUR TURN ENDS, YOU GO HOME', level: 'body', position: [0.5, 0.58] },

  // t23: Jay's analogy
  { turnId: 't24', offset: 0.3, kind: 'bubble', text: 'A draft. Like names out of a hat.', position: [0.5, 0.3], width: 400 },

  // t24: Repartir = to divide up
  { turnId: 't25', offset: 1.0, kind: 'smarttext', text: 'REPARTIR = TO DIVIDE UP', level: 'title', position: [0.5, 0.22], entrance: 'stamp' },
  { turnId: 't25', offset: 6.0, kind: 'smarttext', text: '1549: THE REFORMS REPLACE THE ENCOMIENDA', level: 'body', position: [0.5, 0.4] },
  { turnId: 't25', offset: 12.0, kind: 'smarttext', text: '1550: THE OLD SYSTEM IS DONE', level: 'subtitle', position: [0.5, 0.56], color: '#ffd700' },

  // t25: Jay
  { turnId: 't26', offset: 0.3, kind: 'bubble', text: 'Was the draft actually better?', position: [0.5, 0.3], width: 340 },

  // t26: On paper vs in practice
  { turnId: 't27', offset: 1.0, kind: 'smarttext', text: 'ON PAPER: WAGES', level: 'subtitle', position: [0.5, 0.25], color: '#51cf66' },
  { turnId: 't27', offset: 5.0, kind: 'smarttext', text: 'IN PRACTICE: BRUTAL ANYWAY', level: 'subtitle', position: [0.5, 0.42], color: '#ff6b6b' },
  { turnId: 't27', offset: 8.5, kind: 'smarttext', text: 'THE CROWN JUST RAN IT MORE DIRECTLY', level: 'body', position: [0.5, 0.6] },

  // t27: Don't mix up the drafts
  { turnId: 't28', offset: 0.5, kind: 'smarttext', text: "DON'T MIX UP THE DRAFTS", level: 'subtitle', position: [0.5, 0.22], color: '#ffd700' },
  { turnId: 't28', offset: 3.5, kind: 'smarttext', text: 'REPARTIMIENTO = NEW SPAIN', level: 'title', position: [0.5, 0.4], entrance: 'stamp' },
  { turnId: 't28', offset: 6.5, kind: 'smarttext', text: 'MITA = PERU', level: 'title', position: [0.5, 0.58], entrance: 'stamp' },

  // t28: Jay
  { turnId: 't29', offset: 0.3, kind: 'bubble', text: 'Repartimiento here, mita there. Got it.', position: [0.5, 0.3], width: 420 },

  // === ACT 3: THE MIDDLE PASSAGE (t29-t43) ===

  // t29: Box three
  { turnId: 't30', offset: 0.5, kind: 'smarttext', text: 'BOX 3: THE MIDDLE PASSAGE', level: 'title', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't30', offset: 2.5, kind: 'smarttext', text: 'IT STARTS WITH A MATH PROBLEM', level: 'body', position: [0.5, 0.45] },

  // t30: Jay
  { turnId: 't31', offset: 0.3, kind: 'bubble', text: 'The towns just keep emptying.', position: [0.5, 0.3], width: 380 },

  // t31: The collapse, the demand
  { turnId: 't32', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e6/silver-mine-workers.jpg' },
  { turnId: 't32', offset: 1.0, kind: 'smarttext', text: '50–90% DIED, 1500–1650', level: 'subtitle', position: [0.5, 0.2], color: '#ff6b6b' },
  { turnId: 't32', offset: 5.0, kind: 'smarttext', text: 'THE SILVER STILL HAD TO COME OUT', level: 'body', position: [0.5, 0.38] },
  { turnId: 't32', offset: 9.0, kind: 'smarttext', text: 'THE SUGAR STILL HAD TO GET CUT', level: 'body', position: [0.5, 0.54] },

  // t32: Prediction beat
  { turnId: 't33', offset: 0.5, kind: 'smarttext', text: 'THE WORKERS KEEP DYING', level: 'subtitle', position: [0.5, 0.25] },
  { turnId: 't33', offset: 3.0, kind: 'smarttext', text: 'WHERE DO YOU LOOK?', level: 'title', position: [0.5, 0.45], entrance: 'stamp', color: '#ffd700' },

  // t33: Across the ocean
  { turnId: 't35', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e6/sao-tome-sugar.jpg' },
  { turnId: 't35', offset: 1.0, kind: 'smarttext', text: 'ACROSS THE OCEAN', level: 'hero', position: [0.5, 0.2], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't35', offset: 5.0, kind: 'smarttext', text: 'SÃO TOMÉ: THE MODEL', level: 'subtitle', position: [0.5, 0.42] },
  { turnId: 't35', offset: 8.5, kind: 'smarttext', text: 'SPAIN SCALED IT UP', level: 'body', position: [0.5, 0.58] },

  // t34: Jay
  { turnId: 't36', offset: 0.3, kind: 'bubble', text: '"No matter how many died." Say the number.', position: [0.5, 0.3], width: 440 },

  // t35: 1 in 8
  { turnId: 't37', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e6/middle-passage-ship.jpg' },
  { turnId: 't37', offset: 1.0, kind: 'smarttext', text: '1 IN 8 DIED CROSSING', level: 'hero', position: [0.5, 0.18], entrance: 'stamp', color: '#ff6b6b' },
  { turnId: 't37', offset: 5.0, kind: 'smarttext', text: '13 OUT OF EVERY 100', level: 'subtitle', position: [0.5, 0.4] },
  { turnId: 't37', offset: 9.0, kind: 'smarttext', text: 'THE DYING WAS PRICED IN', level: 'title', position: [0.5, 0.58], entrance: 'stamp' },

  // t36: Jay
  { turnId: 't38', offset: 0.3, kind: 'bubble', text: 'They priced the dying in. Cold.', position: [0.5, 0.3], width: 360 },

  // t37: The closet analogy
  { turnId: 't39', offset: 1.0, kind: 'bubble', text: 'Dark, coats everywhere, couldn\'t move. That was a game.', position: [0.5, 0.28], width: 440 },
  { turnId: 't39', offset: 8.0, kind: 'smarttext', text: 'NOW MAKE IT WEEKS. IN CHAINS.', level: 'title', position: [0.5, 0.55], entrance: 'stamp', color: '#ff6b6b' },

  // t38: Jay
  { turnId: 't40', offset: 0.3, kind: 'bubble', text: "Okay. That's going to stick.", position: [0.5, 0.3], width: 320 },

  // t39: Las Casas again — 1516
  { turnId: 't41', offset: 0.5, kind: 'smarttext', text: 'LAS CASAS, 1516', level: 'subtitle', position: [0.5, 0.25], color: '#ffd700' },
  { turnId: 't41', offset: 3.5, kind: 'smarttext', text: 'SUGGESTED ENSLAVED AFRICAN LABOR', level: 'title', position: [0.5, 0.45], entrance: 'stamp' },

  // t40: Jay
  { turnId: 't42', offset: 0.3, kind: 'bubble', text: 'So the great defender helped start the slave trade.', position: [0.5, 0.3], width: 440 },

  // t41: He didn't start it — he blessed it, then took it back
  { turnId: 't43', offset: 1.0, kind: 'smarttext', text: "HE DIDN'T START IT", level: 'subtitle', position: [0.5, 0.22], color: '#51cf66' },
  { turnId: 't43', offset: 5.0, kind: 'smarttext', text: 'HE BLESSED IT', level: 'title', position: [0.5, 0.4], entrance: 'stamp' },
  { turnId: 't43', offset: 10.0, kind: 'smarttext', text: 'THEN SPENT DECADES TRYING TO UN-BLESS IT', level: 'body', position: [0.5, 0.6] },

  // t42: Jay
  { turnId: 't44', offset: 0.3, kind: 'bubble', text: 'An apology in a book nobody read for a century.', position: [0.5, 0.3], width: 440 },

  // t43: The common mistake
  { turnId: 't45', offset: 1.0, kind: 'smarttext', text: "DON'T WRITE: LAS CASAS INVENTED THE SLAVE TRADE", level: 'subtitle', position: [0.5, 0.3], color: '#ff6b6b' },
  { turnId: 't45', offset: 6.0, kind: 'smarttext', text: 'BOX 3 ✓', level: 'hero', position: [0.5, 0.55], entrance: 'stamp', color: '#51cf66' },

  // === ACT 4: CASTA + HACIENDA (t44-t58) ===

  // t44: Last box
  { turnId: 't46', offset: 0.5, kind: 'smarttext', text: 'LAST BOX: THE CASTA SYSTEM', level: 'title', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't46', offset: 3.0, kind: 'smarttext', text: "IT'S NOT A LABOR SYSTEM", level: 'subtitle', position: [0.5, 0.45], color: '#ffd700' },

  // t45: Jay
  { turnId: 't47', offset: 0.3, kind: 'bubble', text: 'A ladder, not a system?', position: [0.5, 0.3], width: 320 },

  // t46: The ladder (Maya says it wrong — peninsulares/criollos swapped)
  { turnId: 't48', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e6/casta-painting.jpg' },
  { turnId: 't48', offset: 1.0, kind: 'smarttext', text: 'A LADDER WITH LEGAL TEETH', level: 'title', position: [0.5, 0.18], entrance: 'stamp' },
  { turnId: 't48', offset: 5.0, kind: 'smarttext', text: 'PENINSULARES → CRIOLLOS → MESTIZOS → MULATOS', level: 'body', position: [0.5, 0.38] },
  { turnId: 't48', offset: 10.0, kind: 'smarttext', text: '⚠️ WAIT FOR IT...', level: 'body', position: [0.5, 0.58], color: '#ffd700' },

  // t47: Jay catches it
  { turnId: 't49', offset: 0.3, kind: 'bubble', text: 'Wait — you just said peninsulares were born in the Americas.', position: [0.5, 0.3], width: 460 },

  // t48: The correction
  { turnId: 't50', offset: 1.0, kind: 'smarttext', text: 'PENINSULARES: BORN IN SPAIN', level: 'title', position: [0.5, 0.3], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't50', offset: 6.0, kind: 'smarttext', text: 'CRIOLLOS: BORN IN THE AMERICAS', level: 'title', position: [0.5, 0.5], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't50', offset: 11.0, kind: 'smarttext', text: 'NAIL IT NOW', level: 'body', position: [0.5, 0.68], color: '#ffd700' },

  // t49: Jay
  { turnId: 't51', offset: 0.3, kind: 'bubble', text: 'Peninsulares Spain, criollos Americas. Got it.', position: [0.5, 0.3], width: 420 },

  // t50: Part custom, part law
  { turnId: 't52', offset: 1.0, kind: 'smarttext', text: 'PART CUSTOM, PART LAW', level: 'subtitle', position: [0.5, 0.25] },
  { turnId: 't52', offset: 5.0, kind: 'smarttext', text: 'YOUR LABEL DECIDED WHO PAID TRIBUTE', level: 'body', position: [0.5, 0.42] },
  { turnId: 't52', offset: 10.0, kind: 'smarttext', text: 'AN EMPIRE TERRIFIED OF MIXTURE', level: 'body', position: [0.5, 0.6] },

  // t51: Jay
  { turnId: 't53', offset: 0.3, kind: 'bubble', text: "So where do the workers live in all this?", position: [0.5, 0.3], width: 400 },

  // t52: The hacienda
  { turnId: 't54', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e6/hacienda.jpg' },
  { turnId: 't54', offset: 1.0, kind: 'smarttext', text: 'THE HACIENDA', level: 'hero', position: [0.5, 0.2], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't54', offset: 4.5, kind: 'smarttext', text: 'THE POWER WAS THE LAND ITSELF', level: 'subtitle', position: [0.5, 0.42] },

  // t53: Jay
  { turnId: 't55', offset: 0.3, kind: 'bubble', text: 'So who actually works it?', position: [0.5, 0.3], width: 300 },

  // t54: Peons — the debt was the chain
  { turnId: 't56', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e6/debt-peonage.jpg' },
  { turnId: 't56', offset: 1.0, kind: 'smarttext', text: 'PEONS', level: 'hero', position: [0.5, 0.18], entrance: 'stamp' },
  { turnId: 't56', offset: 4.0, kind: 'smarttext', text: 'TECHNICALLY FREE — EXAM TRAP', level: 'subtitle', position: [0.5, 0.36], color: '#ffd700' },
  { turnId: 't56', offset: 9.0, kind: 'smarttext', text: 'THE DEBT WAS THE CHAIN', level: 'title', position: [0.5, 0.54], entrance: 'stamp', color: '#ff6b6b' },
  { turnId: 't56', offset: 14.0, kind: 'smarttext', text: 'DEBT PEONAGE ≈ SERFDOM', level: 'body', position: [0.5, 0.7] },

  // t55: Jay's Warcraft joke
  { turnId: 't57', offset: 0.3, kind: 'bubble', text: 'Peon. Like the little worker guys in Warcraft?', position: [0.5, 0.3], width: 440 },

  // t56: Maya
  { turnId: 't58', offset: 0.3, kind: 'bubble', text: 'Same word. Work work.', position: [0.5, 0.3], width: 300 },

  // t57: Jay
  { turnId: 't59', offset: 0.3, kind: 'bubble', text: 'Noted. Forever.', position: [0.5, 0.3], width: 280 },

  // t58: Last trap
  { turnId: 't60', offset: 1.0, kind: 'smarttext', text: "DON'T WRITE: PEONS WERE SLAVES", level: 'subtitle', position: [0.5, 0.3], color: '#ff6b6b' },
  { turnId: 't60', offset: 5.0, kind: 'smarttext', text: 'FREE ON PAPER, BOUND BY THE LEDGER', level: 'title', position: [0.5, 0.5], entrance: 'stamp' },

  // === ACT 5: LIGHTNING ROUND + RECAP (t59-t90) ===

  // t59: Lightning round intro
  { turnId: 't61', offset: 0.5, kind: 'smarttext', text: 'LIGHTNING ROUND', level: 'title', position: [0.5, 0.25], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't61', offset: 2.5, kind: 'smarttext', text: 'FOUR SYSTEMS, ONE HUNGER', level: 'subtitle', position: [0.5, 0.45] },

  // t60-t67: Lightning round (triggers + answers)
  { turnId: 't62', offset: 0.3, kind: 'smarttext', text: "THE CROWN GRANTS A COLONIST A TOWN'S LABOR", level: 'body', position: [0.5, 0.3] },
  { turnId: 't64', offset: 0.3, kind: 'smarttext', text: 'ENCOMIENDA. THE GRANT.', level: 'title', position: [0.5, 0.35], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't65', offset: 0.3, kind: 'smarttext', text: 'THE CROWN TAKES THE ASSIGNING POWER BACK', level: 'body', position: [0.5, 0.3] },
  { turnId: 't67', offset: 0.3, kind: 'smarttext', text: 'REPARTIMIENTO. THE DRAFT.', level: 'title', position: [0.5, 0.35], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't68', offset: 0.3, kind: 'smarttext', text: 'THE TOWNS KEEP EMPTYING — SPAIN LOOKS ACROSS THE OCEAN', level: 'body', position: [0.5, 0.3] },
  { turnId: 't70', offset: 0.3, kind: 'smarttext', text: 'ENSLAVED AFRICAN LABOR. THE MIDDLE PASSAGE.', level: 'title', position: [0.5, 0.35], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't71', offset: 0.3, kind: 'smarttext', text: 'THE LEGAL LADDER, AND THE ESTATES WHERE THE DEBT NEVER CLEARS', level: 'body', position: [0.5, 0.3] },
  { turnId: 't73', offset: 0.3, kind: 'smarttext', text: 'THE CASTA SYSTEM. AND THE HACIENDA.', level: 'title', position: [0.5, 0.35], entrance: 'stamp', color: '#51cf66' },

  // t68: All four covered
  { turnId: 't74', offset: 0.5, kind: 'smarttext', text: 'ALL FOUR COVERED', level: 'subtitle', position: [0.5, 0.3], color: '#ffd700' },

  // t69: Box 1 recap
  { turnId: 't75', offset: 1.0, kind: 'smarttext', text: 'ONE: THE ENCOMIENDA', level: 'subtitle', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't75', offset: 4.0, kind: 'smarttext', text: 'LABOR AND TRIBUTE — NOT THE LAND', level: 'body', position: [0.5, 0.36] },
  { turnId: 't75', offset: 8.0, kind: 'smarttext', text: '1542: NEW LAWS → 1546: VICEROY DEAD', level: 'body', position: [0.5, 0.52] },
  { turnId: 't75', offset: 13.0, kind: 'smarttext', text: 'THE CROWN BACKED DOWN', level: 'subtitle', position: [0.5, 0.68], color: '#ff6b6b' },

  // t70: Jay
  { turnId: 't76', offset: 0.3, kind: 'bubble', text: 'The grant, then the fight. Checked and filed.', position: [0.5, 0.3], width: 420 },

  // t71: Box 2 recap
  { turnId: 't77', offset: 1.0, kind: 'smarttext', text: 'TWO: THE REPARTIMIENTO', level: 'subtitle', position: [0.5, 0.25], color: '#ffd700' },
  { turnId: 't77', offset: 4.5, kind: 'smarttext', text: 'THE CROWN RUNS THE DRAFT', level: 'body', position: [0.5, 0.42] },
  { turnId: 't77', offset: 8.0, kind: 'smarttext', text: '1549', level: 'hero', position: [0.5, 0.58], entrance: 'stamp' },

  // t72-t74: Jay + Maya confirm
  { turnId: 't78', offset: 0.3, kind: 'bubble', text: '1549. The crown does the dividing itself now.', position: [0.5, 0.3], width: 440 },
  { turnId: 't80', offset: 0.3, kind: 'bubble', text: 'The draft, not the grant. Checked.', position: [0.5, 0.3], width: 380 },

  // t75: Box 3 recap
  { turnId: 't81', offset: 1.0, kind: 'smarttext', text: 'THREE: THE MIDDLE PASSAGE', level: 'subtitle', position: [0.5, 0.22], color: '#ffd700' },
  { turnId: 't81', offset: 4.0, kind: 'smarttext', text: '1 IN 8 DIED CROSSING', level: 'body', position: [0.5, 0.4], color: '#ff6b6b' },
  { turnId: 't81', offset: 8.0, kind: 'smarttext', text: 'LAS CASAS: BLESSED IT, THEN UN-BLESSED IT', level: 'body', position: [0.5, 0.58] },

  // t76: Jay
  { turnId: 't82', offset: 0.3, kind: 'bubble', text: 'The crossing and the apology. Banked.', position: [0.5, 0.3], width: 380 },

  // t77: Box 4 recap
  { turnId: 't83', offset: 1.0, kind: 'smarttext', text: 'FOUR: CASTA + HACIENDA', level: 'subtitle', position: [0.5, 0.22], color: '#ffd700' },
  { turnId: 't83', offset: 4.0, kind: 'smarttext', text: 'THE LADDER AND THE LEDGER', level: 'title', position: [0.5, 0.42], entrance: 'stamp' },
  { turnId: 't83', offset: 8.0, kind: 'smarttext', text: 'DEBT DID WHAT CHAINS USED TO DO', level: 'body', position: [0.5, 0.6] },

  // t78: Jay
  { turnId: 't84', offset: 0.3, kind: 'bubble', text: 'The ladder and the ledger. All four checked.', position: [0.5, 0.3], width: 420 },

  // t79: AP questions intro
  { turnId: 't85', offset: 0.5, kind: 'smarttext', text: 'THREE QUESTIONS, AP-SHAPED', level: 'subtitle', position: [0.5, 0.3], color: '#ffd700' },

  // t80: Q1 — ship's log
  { turnId: 't86', offset: 1.0, kind: 'smarttext', text: '400 BOARDED → 348 LANDED', level: 'title', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't86', offset: 6.0, kind: 'smarttext', text: "WHAT'S THE HISTORIAN'S POINT?", level: 'subtitle', position: [0.5, 0.45], color: '#ffd700' },

  // t81: A1
  { turnId: 't88', offset: 1.0, kind: 'smarttext', text: 'THE DYING WAS BUILT INTO THE BUSINESS', level: 'title', position: [0.5, 0.3], entrance: 'stamp' },
  { turnId: 't88', offset: 7.0, kind: 'smarttext', text: '52 OF 400 = 13% — RIGHT ON AVERAGE', level: 'body', position: [0.5, 0.5] },
  { turnId: 't88', offset: 11.0, kind: 'smarttext', text: 'THE SHIPS KEPT SAILING ANYWAY', level: 'body', position: [0.5, 0.64] },

  // t82: Q2 — New Laws
  { turnId: 't89', offset: 1.0, kind: 'smarttext', text: '1542: THE NEW LAWS', level: 'subtitle', position: [0.5, 0.25], color: '#ffd700' },
  { turnId: 't89', offset: 4.0, kind: 'smarttext', text: 'WHY DID THE CROWN BACK DOWN?', level: 'title', position: [0.5, 0.45], entrance: 'stamp' },

  // t83: A2
  { turnId: 't91', offset: 1.0, kind: 'smarttext', text: 'THE ENCOMENDEROS REBELLED', level: 'title', position: [0.5, 0.22], entrance: 'stamp' },
  { turnId: 't91', offset: 6.0, kind: 'smarttext', text: 'PIZARRO KILLED THE VICEROY AT AÑAQUITO, 1546', level: 'body', position: [0.5, 0.42], color: '#ff6b6b' },
  { turnId: 't91', offset: 11.0, kind: 'smarttext', text: 'THE CROWN CHOSE PERU OVER THE REFORM', level: 'body', position: [0.5, 0.6] },

  // t84: Q3 — 1560s record
  { turnId: 't92', offset: 1.0, kind: 'smarttext', text: '1560s: CROWN OFFICIAL ASSIGNS WORKERS, ONE MONTH, THEN HOME', level: 'body', position: [0.5, 0.28] },
  { turnId: 't92', offset: 7.0, kind: 'smarttext', text: 'ENCOMIENDA OR REPARTIMIENTO?', level: 'title', position: [0.5, 0.5], entrance: 'stamp', color: '#ffd700' },

  // t85: A3
  { turnId: 't94', offset: 1.0, kind: 'smarttext', text: 'REPARTIMIENTO', level: 'hero', position: [0.5, 0.25], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't94', offset: 5.0, kind: 'smarttext', text: 'THE CROWN DOES THE ASSIGNING — THE DRAFT, NOT THE GRANT', level: 'body', position: [0.5, 0.5] },

  // t86: Bonus — peon
  { turnId: 't95', offset: 0.5, kind: 'smarttext', text: 'BONUS, FAST', level: 'subtitle', position: [0.5, 0.25], color: '#ffd700' },
  { turnId: 't95', offset: 2.5, kind: 'smarttext', text: 'A PEON OWES A DEBT HE CAN NEVER REPAY. SLAVE OR FREE?', level: 'body', position: [0.5, 0.45] },

  // t87: Answer
  { turnId: 't97', offset: 0.5, kind: 'smarttext', text: "FREE, TECHNICALLY. THE DEBT'S THE CHAIN.", level: 'title', position: [0.5, 0.35], entrance: 'stamp' },

  // t88: Next time teaser
  { turnId: 't98', offset: 1.0, kind: 'smarttext', text: 'NEXT TIME: 1550', level: 'subtitle', position: [0.5, 0.25], color: '#ffd700' },
  { turnId: 't98', offset: 4.0, kind: 'smarttext', text: 'TWO SCHOLARS. ONE QUESTION.', level: 'body', position: [0.5, 0.42] },
  { turnId: 't98', offset: 8.0, kind: 'smarttext', text: 'THE VALLADOLID DEBATE', level: 'title', position: [0.5, 0.6], entrance: 'stamp' },

  // t89-t90: Closing tagline (held beat across the em dash)
  { turnId: 't99', offset: 0.5, kind: 'smarttext', text: 'FOUR SYSTEMS, ONE HUNGER —', level: 'title', position: [0.5, 0.3], entrance: 'fade' },
  { turnId: 't100', offset: 0.3, kind: 'smarttext', text: 'AND THE WORKERS PAID FOR ALL OF THEM.', level: 'title', position: [0.5, 0.5], entrance: 'stamp', color: '#ffd700' },
];

/* ------------------------------------------------------------------ */
/* Versus: repartimiento vs mita (t27) — don't mix up the drafts        */
/* ------------------------------------------------------------------ */
const VERSUS_DRAFTS = {
  clashTitle: "DON'T MIX UP THE DRAFTS",
  periodLabel: 'SAME IDEA, TWO NAMES',
  entityA: {
    name: 'REPARTIMIENTO',
    subtitle: 'New Spain',
    points: ['Crown assigns workers', 'Rotating, short stints', 'From 1549'],
    color: '#2c5aa0',
    accentColor: '#2c5aa0',
    faction: 'NEW SPAIN',
    portraitDesc: '🇲🇽',
    coreIdeology: 'The crown does the dividing itself.',
  },
  entityB: {
    name: 'THE MITA',
    subtitle: "Peru's version",
    points: ['Same draft idea', 'One in seven men', 'Potosí silver'],
    color: '#ffd700',
    accentColor: '#ffd700',
    faction: 'PERU',
    portraitDesc: '⛏️',
    coreIdeology: 'If the question hands you Potosí, the answer is the mita.',
  },
  verdictSummary: "Same idea, two names. Potosí means mita — that's the exam move.",
};

/* ------------------------------------------------------------------ */
/* Background per turn                                                  */
/* ------------------------------------------------------------------ */
const getBackgroundForTurn = (turnId: string | null, subBeatBg: string | null): string => {
  if (subBeatBg) return subBeatBg;
  if (!turnId) return 'historic/u1e6/encomienda-workers.jpg';
  const n = parseInt(turnId.slice(1), 10);
  if (n === 0) return 'historic/u1e6/encomienda-workers.jpg';
  // Act 1: the encomienda
  if (n <= 7) return 'historic/u1e6/encomienda-workers.jpg';
  if (n === 8) return 'historic/u1e6/encomienda-workers.jpg';
  if (n === 9) return 'historic/u1e6/silver-mine-workers.jpg';
  if (n <= 12) return 'historic/u1e6/las-casas.jpg';
  if (n <= 16) return 'historic/u1e6/anaquito-battle.jpg';
  if (n <= 19) return 'historic/u1e6/encomienda-workers.jpg';
  // Act 2: the repartimiento
  if (n <= 28) return 'historic/u1e6/repartimiento-draft.jpg';
  // Act 3: the Middle Passage
  if (n <= 32) return 'historic/u1e6/silver-mine-workers.jpg';
  if (n === 33) return 'historic/u1e6/sao-tome-sugar.jpg';
  if (n <= 38) return 'historic/u1e6/middle-passage-ship.jpg';
  if (n <= 43) return 'historic/u1e6/las-casas.jpg';
  // Act 4: casta + hacienda
  if (n <= 50) return 'historic/u1e6/casta-painting.jpg';
  if (n <= 53) return 'historic/u1e6/hacienda.jpg';
  if (n <= 58) return 'historic/u1e6/debt-peonage.jpg';
  // Act 5: recap
  if (n <= 70) return 'historic/u1e6/encomienda-workers.jpg';
  if (n <= 74) return 'historic/u1e6/repartimiento-draft.jpg';
  if (n <= 76) return 'historic/u1e6/middle-passage-ship.jpg';
  if (n <= 78) return 'historic/u1e6/hacienda.jpg';
  return 'historic/u1e6/encomienda-workers.jpg';
};

/* ------------------------------------------------------------------ */
/* Main episode                                                         */
/* ------------------------------------------------------------------ */
export const U1E6Episode: React.FC<{ episodeData?: EpisodeData }> = ({ episodeData }) => {
  const data = episodeData ?? loadEpisodeData('e6');
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

  // Tone: serious throughout — labor systems demand gravity.
  // Lighter beats (Jay's jokes, the Warcraft moment) breathe inside it.
  const turnNum = activeTurn ? parseInt(activeTurn.id.slice(1), 10) : 0;
  const isLightSection = (turnNum >= 55 && turnNum <= 57) || (turnNum >= 59 && turnNum <= 68);

  const showHead = activeTurn &&
    (activeTurn.speaker === 'maya' || activeTurn.speaker === 'jay') &&
    !(activeTurn.id === 't00' && turnElapsed < 3);

  // Jay has no dedicated asset yet — uses Marcus's realistic head, labeled Jay.
  const isJay = activeTurn?.speaker === 'jay';

  return (
    <ToneProvider tone={isLightSection ? 'playful' : 'serious'}>
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
              speakerName={isJay ? 'Jay' : 'Maya'}
              speakerColor={isJay ? '#2c5aa0' : '#c9a227'}
              position="bottom-right"
              size={0.26}
              speaking={true}
              showName={true}
              assetPair={{
                realistic: staticFile(isJay ? 'marcus-real.webp' : 'maya-real.webp'),
                stylized: staticFile('maya-toon.webp'),
              }}
              frameStyle="rounded"
            />
          )}

          {/* Title card */}
          {activeTurn?.id === 't00' && turnElapsed < 3 && (
            <TitleCard kicker="UNIT 1 · EPISODE 6:"
              title="LABOR SYSTEMS" subline="FOUR SYSTEMS, ONE HUNGER" at={activeStartFrame} />
          )}

          {/* Versus: repartimiento vs mita (t27) */}
          {activeTurn?.id === 't27' && turnElapsed >= 3 && (
            <VersusPolarization
              clashTitle={VERSUS_DRAFTS.clashTitle}
              periodLabel={VERSUS_DRAFTS.periodLabel}
              entityA={VERSUS_DRAFTS.entityA}
              entityB={VERSUS_DRAFTS.entityB}
              verdictSummary={VERSUS_DRAFTS.verdictSummary}
            />
          )}

          {/* Sub-beats */}
          {activeSubBeats.map((beat, idx) => {
            const beatFrame = activeStartFrame + Math.floor(beat.offset * fps);
            const key = `${beat.turnId}-${beat.offset}-${idx}`;

            if (beat.kind === 'smarttext' && beat.text) {
              // Supersede logic: later beats at same position replace earlier ones
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
