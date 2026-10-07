/**
 * U1E8Episode — Unit 1 Episode 8: The Pueblo Revolt.
 *
 * Story Mode: Marcus leads, Maya interjects. August 1680: knotted cords
 * count down across the New Mexico desert. When the last knot comes loose,
 * every pueblo rises at once. The most successful Native uprising — and the
 * one that forced an empire to change how it ruled.
 *
 * Three boxes: the mission system (kivas banned, labor extracted), Popé's
 * Rebellion (the cord, August 10th, twelve years free), the reconquest
 * bargain (Vargas 1692/1693, land + courts + tolerated ceremonies).
 *
 * Tone arc: SERIOUS throughout — this is a story of oppression and
 * resistance. Light touches: Maya's shoelace joke, the "Pueblo king"
 * correction. The exam spine: "resistance worked."
 *
 * 71 turns (36 Maya + 29 Marcus + 6 pauses), ~769 seconds, 30fps.
 * Script: audio_scripts/unit1/apush-audio-u1-e8-script-v6-DRAFT.md (canonical)
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
import { PrimarySourceSpotlight } from './PrimarySourceSpotlight';
import { ToneProvider } from '../validation/ToneContext';
import { EpisodeMusic } from './EpisodeMusic';
import { AutoLayoutProvider } from '../validation/AutoLayout';

import turnsData from '../data/e8/turns.json';
import timingData from '../data/e8/timing_map.json';

interface Turn {
  id: string;
  speaker: string;
  text: string;
  pause_after?: number;
}

const turns = turnsData as Turn[];
const starts = (timingData as { starts: number[] }).starts;
const durations = (timingData as { durations: number[] }).durations;

const EP = 'u1e8';

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
  // === ACT 1: THE MISSION SYSTEM (t00-t19) ===

  // t00: Opening — Valladolid callback, three boxes, knotted cords
  { turnId: 't00', offset: 8.0, kind: 'smarttext', text: 'THREE BOXES', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't00', offset: 14.0, kind: 'smarttext', text: 'THE MISSION SYSTEM · POPÉ\u2019S REBELLION', level: 'body', position: [0.5, 0.4] },
  { turnId: 't00', offset: 19.0, kind: 'smarttext', text: 'THE RECONQUEST BARGAIN', level: 'body', position: [0.5, 0.52] },
  { turnId: 't00', offset: 26.0, kind: 'smarttext', text: 'ONE KNOT FOR EVERY DAY', level: 'subtitle', position: [0.5, 0.66], color: '#ffd700' },
  { turnId: 't00', offset: 34.0, kind: 'smarttext', text: 'SANTA FE HAS NO IDEA', level: 'body', position: [0.5, 0.78], color: '#ff6b6b' },

  // t01: Franciscans, missions, kivas banned
  { turnId: 't01', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e8/franciscan-mission.jpg' },
  { turnId: 't01', offset: 1.0, kind: 'smarttext', text: 'SINCE THE 1590s', level: 'subtitle', position: [0.5, 0.18] },
  { turnId: 't01', offset: 6.0, kind: 'smarttext', text: 'THE KIVAS WERE BANNED', level: 'title', position: [0.5, 0.36], color: '#ff6b6b' },
  { turnId: 't01', offset: 11.0, kind: 'smarttext', text: 'MASKS AND SACRED OBJECTS BURNED', level: 'body', position: [0.5, 0.56] },

  // t02: Maya — missions weren't just churches
  { turnId: 't02', offset: 0.3, kind: 'bubble', text: 'The missions weren\u2019t just churches, right?', position: [0.5, 0.3], width: 400 },

  // t03: Economy through missions, Pueblo labor, encomienda
  { turnId: 't03', offset: 1.0, kind: 'smarttext', text: 'PUEBLO LABOR BUILT THE FARMS', level: 'title', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't03', offset: 7.0, kind: 'smarttext', text: 'ENCOMIENDA PULLED MEN INTO LABOR', level: 'subtitle', position: [0.5, 0.4] },
  { turnId: 't03', offset: 12.0, kind: 'smarttext', text: 'RELIGION AND WORK: ONE MACHINE', level: 'body', position: [0.5, 0.58] },

  // t04: Maya — give me the extremes
  { turnId: 't04', offset: 0.3, kind: 'bubble', text: 'Give me the extremes. What did it look like?', position: [0.5, 0.3], width: 420 },

  // t05: The crackdown — ceremonies banned, kivas filled, medicine men rounded up
  { turnId: 't05', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e8/kiva-interior.jpg' },
  { turnId: 't05', offset: 1.0, kind: 'smarttext', text: 'CEREMONIES BANNED', level: 'title', position: [0.5, 0.18], entrance: 'stamp', color: '#ff6b6b' },
  { turnId: 't05', offset: 5.0, kind: 'smarttext', text: 'KIVAS FILLED IN', level: 'subtitle', position: [0.5, 0.4] },
  { turnId: 't05', offset: 9.0, kind: 'smarttext', text: 'MEDICINE MEN ROUNDED UP AS SORCERERS', level: 'body', position: [0.5, 0.58] },
  { turnId: 't05', offset: 11.0, kind: 'smarttext', text: 'IT WENT UNDERGROUND', level: 'subtitle', position: [0.5, 0.72], color: '#ffd700' },

  // t06: Common mistake — not 1680
  { turnId: 't06', offset: 0.5, kind: 'smarttext', text: 'NOT 1680', level: 'hero', position: [0.5, 0.2], entrance: 'stamp', color: '#ff6b6b' },
  { turnId: 't06', offset: 4.0, kind: 'smarttext', text: 'THE BAN BUILT OVER DECADES', level: 'subtitle', position: [0.5, 0.45] },

  // t07: Exam warning — kivas AND fields
  { turnId: 't07', offset: 1.0, kind: 'smarttext', text: '"RELIGION" ALONE = HALF ANSWER', level: 'title', position: [0.5, 0.25], color: '#ffd700' },
  { turnId: 't07', offset: 5.0, kind: 'smarttext', text: 'THE KIVAS AND THE FIELDS', level: 'subtitle', position: [0.5, 0.45] },

  // t08: 1670s brutal — drought, Apache raids
  { turnId: 't08', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e8/desert-runners.jpg' },
  { turnId: 't08', offset: 1.0, kind: 'smarttext', text: 'THE 1670s TURNED BRUTAL', level: 'title', position: [0.5, 0.2], color: '#ff6b6b' },
  { turnId: 't08', offset: 6.0, kind: 'smarttext', text: 'DROUGHT YEAR AFTER YEAR', level: 'subtitle', position: [0.5, 0.4] },
  { turnId: 't08', offset: 8.5, kind: 'smarttext', text: 'APACHE RAIDS · SPAIN COULDN\u2019T STOP THEM', level: 'body', position: [0.5, 0.58] },

  // t09: Maya — couldn't protect, could punish
  { turnId: 't09', offset: 0.5, kind: 'smarttext', text: 'COULDN\u2019T PROTECT · COULD PUNISH', level: 'subtitle', position: [0.5, 0.3], color: '#ffd700' },

  // t10: The bargain of empire
  { turnId: 't10', offset: 1.0, kind: 'smarttext', text: 'PROTECTION FOR OBEDIENCE', level: 'title', position: [0.5, 0.25] },
  { turnId: 't10', offset: 5.0, kind: 'smarttext', text: 'SPAIN WAS DEFAULTING', level: 'subtitle', position: [0.5, 0.45], color: '#ff6b6b' },

  // t11: 1675 — Treviño arrests 47 medicine men
  { turnId: 't11', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e8/trevino-governor.jpg' },
  { turnId: 't11', offset: 1.0, kind: 'smarttext', text: '1675', level: 'hero', position: [0.5, 0.15], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't11', offset: 3.0, kind: 'smarttext', text: '47 MEDICINE MEN ARRESTED', level: 'title', position: [0.5, 0.38], color: '#ff6b6b' },
  { turnId: 't11', offset: 7.0, kind: 'smarttext', text: 'FOR PRAYING WRONG', level: 'subtitle', position: [0.5, 0.56] },

  // t12: Maya — and the sentences?
  { turnId: 't12', offset: 0.3, kind: 'bubble', text: 'And the sentences?', position: [0.5, 0.3], width: 280 },

  // t13: Three hanged, one suicide, rest whipped
  { turnId: 't13', offset: 1.0, kind: 'smarttext', text: 'THREE HANGED', level: 'title', position: [0.5, 0.2], entrance: 'stamp', color: '#ff6b6b' },
  { turnId: 't13', offset: 4.0, kind: 'smarttext', text: 'ONE KILLED HIMSELF · REST WHIPPED', level: 'subtitle', position: [0.5, 0.42] },

  // t14: Maya — recruitment poster
  { turnId: 't14', offset: 0.5, kind: 'smarttext', text: 'A RECRUITMENT POSTER', level: 'subtitle', position: [0.5, 0.3], color: '#ffd700' },

  // t15: March on Santa Fe, prisoners freed
  { turnId: 't15', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e8/santa-fe-1680.jpg' },
  { turnId: 't15', offset: 1.0, kind: 'smarttext', text: 'THE PUEBLOS MARCHED', level: 'title', position: [0.5, 0.2], color: '#51cf66' },
  { turnId: 't15', offset: 6.0, kind: 'smarttext', text: 'THE GOVERNOR FOLDED', level: 'subtitle', position: [0.5, 0.4] },
  { turnId: 't15', offset: 8.0, kind: 'smarttext', text: 'EVERY PRISONER WALKED FREE', level: 'body', position: [0.5, 0.58], color: '#51cf66' },

  // t16: Maya — Popé, the statue
  { turnId: 't16', offset: 1.0, kind: 'smarttext', text: 'POPÉ', level: 'hero', position: [0.5, 0.18], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't16', offset: 4.0, kind: 'smarttext', text: 'U.S. CAPITOL STATUE · 2005', level: 'subtitle', position: [0.5, 0.42] },

  // t17: Popé — Tewa holy man from Ohkay Owingeh
  { turnId: 't17', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e8/pope-statue.jpg' },
  { turnId: 't17', offset: 1.0, kind: 'smarttext', text: 'TEWA RELIGIOUS LEADER', level: 'title', position: [0.5, 0.2] },
  { turnId: 't17', offset: 6.0, kind: 'smarttext', text: 'OHKAY OWINGEH', level: 'subtitle', position: [0.5, 0.4], color: '#ffd700' },

  // t18: Maya — "the Pueblo king"
  { turnId: 't18', offset: 0.3, kind: 'bubble', text: 'I was about to say "the Pueblo king."', position: [0.5, 0.3], width: 380 },

  // t19: Not a king — a holy man, Taos, five years planning
  { turnId: 't19', offset: 1.0, kind: 'smarttext', text: 'NOT A KING', level: 'title', position: [0.5, 0.18], entrance: 'stamp', color: '#ff6b6b' },
  { turnId: 't19', offset: 5.0, kind: 'smarttext', text: 'A HOLY MAN', level: 'subtitle', position: [0.5, 0.38], color: '#51cf66' },
  { turnId: 't19', offset: 9.0, kind: 'smarttext', text: 'FIVE YEARS PLANNING · TAOS', level: 'body', position: [0.5, 0.56] },

  // === ACT 2: POPÉ'S REBELLION (t20-t32) ===

  // t20: Maya — five years holding a secret
  { turnId: 't20', offset: 0.5, kind: 'smarttext', text: 'FIVE YEARS · SIX LANGUAGES · HUNDREDS OF MILES', level: 'subtitle', position: [0.5, 0.25], color: '#ffd700' },

  // t21: Marcus — you're Popé, how do you set one date?
  { turnId: 't21', offset: 1.0, kind: 'smarttext', text: 'HOW DO YOU SET ONE DATE?', level: 'title', position: [0.5, 0.25], color: '#ffd700' },
  { turnId: 't21', offset: 5.0, kind: 'smarttext', text: 'ANYTHING WRITTEN, THE SPANISH CAN READ', level: 'body', position: [0.5, 0.45] },

  // t22: 9-second pause — the cord builds (no head, silence is the visual)
  { turnId: 't22', offset: 1.0, kind: 'bg-swap', bgImage: 'historic/u1e8/knotted-cord.jpg' },
  { turnId: 't22', offset: 2.0, kind: 'smarttext', text: '???', level: 'hero', position: [0.5, 0.3], color: '#ffd700' },

  // t23: A calendar made of knots
  { turnId: 't23', offset: 0.5, kind: 'smarttext', text: 'A CALENDAR MADE OF KNOTS', level: 'hero', position: [0.5, 0.15], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't23', offset: 4.0, kind: 'smarttext', text: 'MAGUEY FIBER · ONE KNOT PER DAY', level: 'subtitle', position: [0.5, 0.42] },
  { turnId: 't23', offset: 8.0, kind: 'smarttext', text: 'RUNNERS TO EVERY PUEBLO', level: 'body', position: [0.5, 0.6] },

  // t24: Maya's shoelace joke
  { turnId: 't24', offset: 0.3, kind: 'bubble', text: 'I did that with my shoelace on a road trip. It did not start a revolution.', position: [0.5, 0.3], width: 460 },

  // t25: Runners caught, date moved up — August 10th, 1680
  { turnId: 't25', offset: 1.0, kind: 'smarttext', text: 'TWO RUNNERS CAUGHT', level: 'subtitle', position: [0.5, 0.2], color: '#ff6b6b' },
  { turnId: 't25', offset: 5.0, kind: 'smarttext', text: 'AUGUST 10TH, 1680', level: 'hero', position: [0.5, 0.38], entrance: 'stamp', color: '#ffd700' },

  // t26: Maya — how do we know? Did Popé leave notes?
  { turnId: 't26', offset: 0.3, kind: 'bubble', text: 'How do we know? Did Popé leave notes?', position: [0.5, 0.3], width: 380 },

  // t27: Pedro Naranjo — Spanish interrogator wrote it down
  { turnId: 't27', offset: 0.5, kind: 'primarysource',
    documentTitle: 'Interrogation of Pedro Naranjo',
    authorAndDate: 'Spanish officials · December 1681',
    excerptText: 'Popé was told to "make a cord of maguey fiber and tie some knots in it which would signify the number of days that they must wait before the rebellion."',
    highlightedPhrase: 'a cord of maguey fiber',
    hippType: 'Point of View',
    hippExplanation: 'Naranjo spoke to Spanish interrogators who wanted him hanged. We hear the plan through Spanish pens — and they still recorded the coordination.' },

  // t28: Three spirits at Taos — fire shooting from their bodies
  { turnId: 't28', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e8/kiva-interior.jpg' },
  { turnId: 't28', offset: 1.0, kind: 'smarttext', text: 'THREE SPIRITS', level: 'title', position: [0.5, 0.18], color: '#ffd700' },
  { turnId: 't28', offset: 5.0, kind: 'smarttext', text: 'FIRE SHOOTING FROM THEIR BODIES', level: 'subtitle', position: [0.5, 0.38], color: '#ff6b6b' },
  { turnId: 't28', offset: 8.0, kind: 'smarttext', text: 'PURGE THE SPANISH · THE WORLD MADE WHOLE', level: 'body', position: [0.5, 0.58] },

  // t29: Maya — and we believe the fire part?
  { turnId: 't29', offset: 0.3, kind: 'bubble', text: 'And we believe the fire part?', position: [0.5, 0.3], width: 320 },

  // t30: The honest version — Popé's claim, Spanish pens
  { turnId: 't30', offset: 1.0, kind: 'smarttext', text: 'POPÉ\u2019S CLAIM · SPANISH PENS', level: 'subtitle', position: [0.5, 0.25] },
  { turnId: 't30', offset: 5.0, kind: 'smarttext', text: 'THE GODS ARE DONE WAITING', level: 'title', position: [0.5, 0.45], color: '#ffd700' },

  // t31: And it worked — the rising, the siege, Otermín abandons Santa Fe
  { turnId: 't31', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e8/santa-fe-1680.jpg' },
  { turnId: 't31', offset: 1.0, kind: 'smarttext', text: 'AND IT WORKED', level: 'hero', position: [0.5, 0.12], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't31', offset: 5.0, kind: 'smarttext', text: '~400 SPANIARDS KILLED · 21 PRIESTS', level: 'title', position: [0.5, 0.34], color: '#ff6b6b' },
  { turnId: 't31', offset: 10.0, kind: 'smarttext', text: 'SANTA FE BESIEGED · WATER CUT', level: 'subtitle', position: [0.5, 0.52] },
  { turnId: 't31', offset: 15.0, kind: 'smarttext', text: 'AUGUST 21ST: OTERMÍN ABANDONS THE CITY', level: 'body', position: [0.5, 0.68], color: '#ffd700' },
  { turnId: 't31', offset: 20.0, kind: 'smarttext', text: 'THE WHOLE PRESENCE — GONE ON FOOT', level: 'body', position: [0.5, 0.8] },

  // t32: Maya — second box checked
  { turnId: 't32', offset: 0.5, kind: 'smarttext', text: 'BOX 2 \u2713', level: 'hero', position: [0.5, 0.3], entrance: 'stamp', color: '#51cf66' },

  // === ACT 3: TWELVE YEARS FREE (t33-t40) ===

  // t33: Timing trap — 1680 vs 1692
  { turnId: 't33', offset: 1.0, kind: 'smarttext', text: '1680 = THE RISING', level: 'title', position: [0.5, 0.25], color: '#51cf66' },
  { turnId: 't33', offset: 3.5, kind: 'smarttext', text: '1692 = THE RETURN', level: 'title', position: [0.5, 0.45], color: '#ffd700' },
  { turnId: 't33', offset: 5.5, kind: 'smarttext', text: 'EXAM WRITERS LOVE SWAPPING THEM', level: 'body', position: [0.5, 0.65], color: '#ff6b6b' },

  // t34: Pueblo land again — twelve years
  { turnId: 't34', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e8/pueblo-village.jpg' },
  { turnId: 't34', offset: 1.0, kind: 'smarttext', text: 'PUEBLO LAND AGAIN', level: 'title', position: [0.5, 0.2], color: '#51cf66' },
  { turnId: 't34', offset: 6.0, kind: 'smarttext', text: 'TWELVE YEARS', level: 'hero', position: [0.5, 0.4], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't34', offset: 11.0, kind: 'smarttext', text: 'MISSIONS EMPTY · DANCES BACK IN THE OPEN', level: 'body', position: [0.5, 0.62] },

  // t35: Maya — a permanent win?
  { turnId: 't35', offset: 0.3, kind: 'bubble', text: 'So that\u2019s a permanent win?', position: [0.5, 0.3], width: 300 },

  // t36: Twelve-year win — the purge, "rotten wood," yucca
  { turnId: 't36', offset: 1.0, kind: 'smarttext', text: 'A TWELVE-YEAR WIN', level: 'title', position: [0.5, 0.15], color: '#ffd700' },
  { turnId: 't36', offset: 5.0, kind: 'smarttext', text: 'EVERYTHING SPANISH DESTROYED', level: 'subtitle', position: [0.5, 0.34], color: '#ff6b6b' },
  { turnId: 't36', offset: 9.0, kind: 'smarttext', text: '"MADE OF ROTTEN WOOD"', level: 'body', position: [0.5, 0.52] },
  { turnId: 't36', offset: 13.0, kind: 'smarttext', text: 'YUCCA TO WASH OFF BAPTISM', level: 'body', position: [0.5, 0.66] },
  { turnId: 't36', offset: 16.0, kind: 'bg-swap', bgImage: 'historic/u1e8/yucca-plant.jpg' },

  // t37: Maya — what cracks first?
  { turnId: 't37', offset: 0.3, kind: 'bubble', text: 'What cracks first — the drought or Popé?', position: [0.5, 0.3], width: 380 },

  // t38: The revolution ate its leader
  { turnId: 't38', offset: 1.0, kind: 'smarttext', text: 'THE REVOLUTION ATE ITS LEADER', level: 'title', position: [0.5, 0.2], color: '#ff6b6b' },
  { turnId: 't38', offset: 6.0, kind: 'smarttext', text: 'DROUGHT · OLD FEUDS · TOO MUCH CONTROL', level: 'subtitle', position: [0.5, 0.42] },
  { turnId: 't38', offset: 11.0, kind: 'smarttext', text: 'DEPOSED — THEN RE-ELECTED 1688', level: 'body', position: [0.5, 0.6], color: '#ffd700' },

  // t39: Maya — what went wrong with "died a tyrant in 1688"?
  { turnId: 't39', offset: 0.5, kind: 'smarttext', text: '"DIED A TYRANT IN 1688"?', level: 'subtitle', position: [0.5, 0.25], color: '#ff6b6b' },

  // t40: Nearly everything — the trap
  { turnId: 't40', offset: 1.0, kind: 'smarttext', text: 'NEARLY EVERYTHING', level: 'title', position: [0.5, 0.2], color: '#ff6b6b' },
  { turnId: 't40', offset: 5.0, kind: 'smarttext', text: 'DEPOSED · RE-ELECTED · DIED ~1692', level: 'subtitle', position: [0.5, 0.4] },
  { turnId: 't40', offset: 9.0, kind: 'smarttext', text: 'DON\u2019T WRITE: "POPÉ LED FOR 12 YEARS"', level: 'body', position: [0.5, 0.58], color: '#ffd700' },
  { turnId: 't40', offset: 13.0, kind: 'smarttext', text: 'THE PUEBLOS HELD IT — NOT POPÉ', level: 'body', position: [0.5, 0.72] },

  // === ACT 4: THE RECONQUEST BARGAIN (t41-t51) ===

  // t41: Third box — Vargas 1692, fight or talk? (prediction setup)
  { turnId: 't41', offset: 0.5, kind: 'bg-swap', bgImage: 'historic/u1e8/vargas-reconquest.jpg' },
  { turnId: 't41', offset: 1.0, kind: 'smarttext', text: '1692 · VARGAS WALKS IN', level: 'title', position: [0.5, 0.18], color: '#ffd700' },
  { turnId: 't41', offset: 5.0, kind: 'smarttext', text: 'FIGHT HIS WAY IN — OR TALK?', level: 'hero', position: [0.5, 0.36], entrance: 'stamp' },
  { turnId: 't41', offset: 9.0, kind: 'smarttext', text: 'TWELVE YEARS THEY\u2019VE HELD IT', level: 'body', position: [0.5, 0.6] },

  // t42: 9-second pause — the answer hangs
  { turnId: 't42', offset: 2.0, kind: 'smarttext', text: '???', level: 'hero', position: [0.5, 0.3], color: '#ffd700' },

  // t43: He talked — pardons, respect, bloodless
  { turnId: 't43', offset: 1.0, kind: 'smarttext', text: 'HE TALKED', level: 'hero', position: [0.5, 0.15], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't43', offset: 4.0, kind: 'smarttext', text: 'PARDONS · RESPECT FOR PUEBLO LANDS', level: 'subtitle', position: [0.5, 0.4] },
  { turnId: 't43', offset: 8.0, kind: 'smarttext', text: 'BLOODLESS — BY SPANISH ACCOUNTS', level: 'body', position: [0.5, 0.58] },

  // t44: Maya — too clean
  { turnId: 't44', offset: 0.3, kind: 'bubble', text: 'That sounds too clean.', position: [0.5, 0.3], width: 280 },

  // t45: 1693 — force, dozens executed
  { turnId: 't45', offset: 1.0, kind: 'smarttext', text: '1693: BACK WITH SOLDIERS', level: 'title', position: [0.5, 0.2], color: '#ff6b6b' },
  { turnId: 't45', offset: 5.0, kind: 'smarttext', text: 'SANTA FE FELL BY FORCE', level: 'subtitle', position: [0.5, 0.4] },
  { turnId: 't45', offset: 9.0, kind: 'smarttext', text: 'DOZENS OF PUEBLO MEN EXECUTED', level: 'body', position: [0.5, 0.58] },

  // t46: Common mistake — 1692 was talk, not force
  { turnId: 't46', offset: 1.0, kind: 'smarttext', text: '1692 = TALK', level: 'title', position: [0.5, 0.25], color: '#51cf66' },
  { turnId: 't46', offset: 4.0, kind: 'smarttext', text: '1693 = FORCE', level: 'title', position: [0.5, 0.45], color: '#ff6b6b' },

  // t47: Maya — why isn't the lesson "resistance fails"?
  { turnId: 't47', offset: 0.5, kind: 'smarttext', text: 'WHY NOT "RESISTANCE FAILS"?', level: 'subtitle', position: [0.5, 0.3], color: '#ffd700' },

  // t48: What Spain did differently — chastened by fear
  { turnId: 't48', offset: 1.0, kind: 'smarttext', text: 'A CHASTENED EMPIRE', level: 'title', position: [0.5, 0.15], color: '#ffd700' },
  { turnId: 't48', offset: 5.0, kind: 'smarttext', text: 'LAND FOR EVERY PUEBLO FAMILY', level: 'subtitle', position: [0.5, 0.34], color: '#51cf66' },
  { turnId: 't48', offset: 10.0, kind: 'smarttext', text: 'A PUBLIC DEFENDER IN SPANISH COURTS', level: 'body', position: [0.5, 0.52] },
  { turnId: 't48', offset: 15.0, kind: 'smarttext', text: 'KIVAS TOLERATED — NEVER BEFORE', level: 'body', position: [0.5, 0.66] },
  { turnId: 't48', offset: 19.0, kind: 'bg-swap', bgImage: 'historic/u1e8/kiva-interior.jpg' },

  // t49: Maya — not nicer, then
  { turnId: 't49', offset: 0.3, kind: 'bubble', text: 'Not nicer, then.', position: [0.5, 0.3], width: 240 },

  // t50: Scared is the word — the exam spine
  { turnId: 't50', offset: 1.0, kind: 'smarttext', text: 'SCARED IS THE WORD', level: 'hero', position: [0.5, 0.15], entrance: 'stamp', color: '#ff6b6b' },
  { turnId: 't50', offset: 5.0, kind: 'smarttext', text: 'RESISTANCE WORKED', level: 'title', position: [0.5, 0.38], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't50', offset: 10.0, kind: 'smarttext', text: 'BEFORE: MASKS BURNED · KIVAS BANNED', level: 'body', position: [0.5, 0.56] },
  { turnId: 't50', offset: 14.0, kind: 'smarttext', text: 'AFTER: THE CEREMONIES SURVIVE — STILL PRACTICED TODAY', level: 'body', position: [0.5, 0.7], color: '#ffd700' },

  // t51: Maya — the reconquest bargain
  { turnId: 't51', offset: 1.0, kind: 'smarttext', text: 'THE RECONQUEST BARGAIN', level: 'title', position: [0.5, 0.25], color: '#ffd700' },
  { turnId: 't51', offset: 5.0, kind: 'smarttext', text: 'LAND · COURTS · TOLERATED CEREMONIES', level: 'subtitle', position: [0.5, 0.45] },
  { turnId: 't51', offset: 6.0, kind: 'smarttext', text: 'BOUGHT WITH TWELVE YEARS OF FREEDOM', level: 'body', position: [0.5, 0.62] },

  // === ACT 5: RECAP + EXAM (t52-t70) ===

  // t52: Box one recap
  { turnId: 't52', offset: 1.0, kind: 'smarttext', text: 'BOX 1 \u2713', level: 'title', position: [0.5, 0.15], color: '#51cf66' },
  { turnId: 't52', offset: 4.0, kind: 'smarttext', text: 'KIVAS BANNED · MASKS BURNED · LABOR EXTRACTED', level: 'subtitle', position: [0.5, 0.36] },
  { turnId: 't52', offset: 9.0, kind: 'smarttext', text: '1675: 47 ARRESTED — POPÉ WALKED OUT WITH A PLAN', level: 'body', position: [0.5, 0.56] },

  // t53: Box two recap
  { turnId: 't53', offset: 1.0, kind: 'smarttext', text: 'BOX 2 \u2713', level: 'title', position: [0.5, 0.15], color: '#51cf66' },
  { turnId: 't53', offset: 4.0, kind: 'smarttext', text: 'THE KNOTTED CORD · ONE KNOT PER DAY', level: 'subtitle', position: [0.5, 0.36] },
  { turnId: 't53', offset: 8.0, kind: 'smarttext', text: 'AUGUST 10TH, 1680 · ~400 DEAD · 21 PRIESTS', level: 'body', position: [0.5, 0.56] },

  // t54: Box three recap — Santa Fe emptied Aug 21st
  { turnId: 't54', offset: 1.0, kind: 'smarttext', text: 'SANTA FE EMPTIED BY AUGUST 21ST', level: 'subtitle', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't54', offset: 5.0, kind: 'smarttext', text: 'BOX 3 \u2713', level: 'title', position: [0.5, 0.4], color: '#51cf66' },
  { turnId: 't54', offset: 8.0, kind: 'smarttext', text: '12 YEARS FREE · VARGAS 1692/1693', level: 'body', position: [0.5, 0.58] },

  // t55: Marcus — 1693 (correction)
  { turnId: 't55', offset: 0.5, kind: 'smarttext', text: '1693', level: 'hero', position: [0.5, 0.3], entrance: 'stamp', color: '#ffd700' },

  // t56: Maya — bloodless then bloody, chastened empire
  { turnId: 't56', offset: 1.0, kind: 'smarttext', text: 'BLOODLESS, THEN BLOODY', level: 'subtitle', position: [0.5, 0.25] },
  { turnId: 't56', offset: 5.0, kind: 'smarttext', text: 'A CHASTENED EMPIRE', level: 'title', position: [0.5, 0.45], color: '#51cf66' },

  // t57: Three questions, AP-shaped — the LEQ spine
  { turnId: 't57', offset: 1.0, kind: 'smarttext', text: '3 AP QUESTIONS', level: 'title', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't57', offset: 5.0, kind: 'smarttext', text: 'YOUR "RESISTANCE WORKED" PARAGRAPH', level: 'subtitle', position: [0.5, 0.4] },

  // t58: Q1 — religious war?
  { turnId: 't58', offset: 1.0, kind: 'smarttext', text: 'Q1: JUST A RELIGIOUS WAR?', level: 'title', position: [0.5, 0.25], color: '#ffd700' },
  { turnId: 't58', offset: 5.0, kind: 'smarttext', text: 'FRIARS vs KIVAS — OR MORE?', level: 'subtitle', position: [0.5, 0.45] },

  // t59: 17-second pause — self-test (no head)
  { turnId: 't59', offset: 2.0, kind: 'smarttext', text: 'THINK', level: 'hero', position: [0.5, 0.3], color: '#ffd700' },

  // t60: Q1 answer — labor and land
  { turnId: 't60', offset: 1.0, kind: 'smarttext', text: 'LABOR AND LAND TOO', level: 'title', position: [0.5, 0.2], color: '#51cf66' },
  { turnId: 't60', offset: 5.0, kind: 'smarttext', text: 'MISSION FARMS · ENCOMIENDA · DROUGHT', level: 'subtitle', position: [0.5, 0.4] },
  { turnId: 't60', offset: 10.0, kind: 'smarttext', text: 'THE WHOLE MACHINE — NOT JUST THE FRIARS', level: 'body', position: [0.5, 0.58] },

  // t61: Q2 — the Naranjo source
  { turnId: 't61', offset: 0.5, kind: 'primarysource',
    documentTitle: 'Interrogation of Pedro Naranjo',
    authorAndDate: 'Spanish officials · December 1681',
    excerptText: 'Popé was told to "make a cord of maguey fiber and tie some knots in it which would signify the number of days that they must wait before the rebellion."',
    highlightedPhrase: 'signify the number of days',
    hippType: 'Purpose',
    hippExplanation: 'The exam asks what the source TELLS you: central planning, readable without a shared language — proof this was organized, not spontaneous.' },

  // t62: 20-second pause — self-test (no head)
  { turnId: 't62', offset: 2.0, kind: 'smarttext', text: 'THINK', level: 'hero', position: [0.5, 0.3], color: '#ffd700' },

  // t63: Q2 answer — centrally planned
  { turnId: 't63', offset: 1.0, kind: 'smarttext', text: 'CENTRALLY PLANNED', level: 'title', position: [0.5, 0.2], color: '#51cf66' },
  { turnId: 't63', offset: 5.0, kind: 'smarttext', text: 'A COUNTDOWN EVERY PUEBLO COULD READ', level: 'subtitle', position: [0.5, 0.4] },
  { turnId: 't63', offset: 10.0, kind: 'smarttext', text: 'RECORDED BY THE SPANISH THEMSELVES', level: 'body', position: [0.5, 0.58] },

  // t64: Q3 — "the revolt failed"?
  { turnId: 't64', offset: 1.0, kind: 'smarttext', text: 'Q3: "IT FAILED — SPAIN RETURNED"?', level: 'title', position: [0.5, 0.25], color: '#ff6b6b' },

  // t65: 17-second pause — self-test (no head)
  { turnId: 't65', offset: 2.0, kind: 'smarttext', text: 'THINK', level: 'hero', position: [0.5, 0.3], color: '#ffd700' },

  // t66: Q3 answer — the deeper aim succeeded
  { turnId: 't66', offset: 1.0, kind: 'smarttext', text: '"FAILED" MEASURES THE WRONG THING', level: 'title', position: [0.5, 0.2], color: '#51cf66' },
  { turnId: 't66', offset: 6.0, kind: 'smarttext', text: '12 YEARS FREE · LAND · COURTS · KIVAS TOLERATED', level: 'subtitle', position: [0.5, 0.42] },
  { turnId: 't66', offset: 11.0, kind: 'smarttext', text: 'THE EMPIRE BENT', level: 'body', position: [0.5, 0.6], color: '#ffd700' },

  // t67: Bonus — how long?
  { turnId: 't67', offset: 0.5, kind: 'smarttext', text: 'HOW LONG?', level: 'title', position: [0.5, 0.3], color: '#ffd700' },

  // t68: 5-second pause — fast bonus (no head)
  { turnId: 't68', offset: 1.0, kind: 'smarttext', text: '???', level: 'hero', position: [0.5, 0.3], color: '#ffd700' },

  // t69: Twelve years, 1680 to 1692
  { turnId: 't69', offset: 0.5, kind: 'smarttext', text: 'TWELVE YEARS', level: 'hero', position: [0.5, 0.25], entrance: 'stamp', color: '#51cf66' },
  { turnId: 't69', offset: 2.5, kind: 'smarttext', text: '1680 → 1692', level: 'subtitle', position: [0.5, 0.5], color: '#ffd700' },

  // t70: Closing — the story isn't only defeat
  { turnId: 't70', offset: 1.0, kind: 'smarttext', text: 'NOT ONLY DEFEAT', level: 'title', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't70', offset: 6.0, kind: 'smarttext', text: 'SOMETIMES THE CONQUERED COUNTED THE DAYS —', level: 'subtitle', position: [0.5, 0.4] },
  { turnId: 't70', offset: 12.0, kind: 'smarttext', text: 'AND TOOK A WHOLE PROVINCE BACK', level: 'subtitle', position: [0.5, 0.56], color: '#51cf66' },
  { turnId: 't70', offset: 17.0, kind: 'bg-swap', bgImage: 'historic/u1e8/pueblo-village.jpg' },
];

/* ------------------------------------------------------------------ */
/* Versus: not used in E8 (no formal debate structure)                  */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Background per turn                                                  */
/* ------------------------------------------------------------------ */
const getBackgroundForTurn = (turnId: string | null, subBeatBg: string | null): string => {
  if (subBeatBg) return subBeatBg;
  if (!turnId) return 'historic/u1e8/santa-fe-1680.jpg';
  const n = parseInt(turnId.slice(1), 10);
  // Act 1: the mission system (t00-t19)
  if (n === 0) return 'historic/u1e8/knotted-cord.jpg';
  if (n <= 3) return 'historic/u1e8/franciscan-mission.jpg';
  if (n <= 7) return 'historic/u1e8/kiva-interior.jpg';
  if (n <= 10) return 'historic/u1e8/desert-runners.jpg';
  if (n <= 15) return 'historic/u1e8/trevino-governor.jpg';
  if (n <= 19) return 'historic/u1e8/pope-statue.jpg';
  // Act 2: Popé's Rebellion (t20-t32)
  if (n <= 22) return 'historic/u1e8/knotted-cord.jpg';
  if (n <= 25) return 'historic/u1e8/maguey-plant.jpg';
  if (n <= 27) return 'historic/u1e8/spanish-soldier-1600s.jpg';
  if (n <= 30) return 'historic/u1e8/kiva-interior.jpg';
  if (n <= 32) return 'historic/u1e8/santa-fe-1680.jpg';
  // Act 3: twelve years free (t33-t40)
  if (n <= 36) return 'historic/u1e8/pueblo-village.jpg';
  if (n <= 40) return 'historic/u1e8/yucca-plant.jpg';
  // Act 4: the reconquest bargain (t41-t51)
  if (n <= 46) return 'historic/u1e8/vargas-reconquest.jpg';
  if (n <= 51) return 'historic/u1e8/santa-fe-1680.jpg';
  // Act 5: recap + exam (t52-t70)
  if (n <= 56) return 'historic/u1e8/pueblo-village.jpg';
  if (n <= 63) return 'historic/u1e8/knotted-cord.jpg';
  if (n <= 66) return 'historic/u1e8/santa-fe-1680.jpg';
  if (n <= 70) return 'historic/u1e8/pueblo-village.jpg';
  return 'historic/u1e8/santa-fe-1680.jpg';
};

/* ------------------------------------------------------------------ */
/* Main episode                                                         */
/* ------------------------------------------------------------------ */
export const U1E8Episode: React.FC = () => {
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
  const isMarcus = activeTurn?.speaker === 'marcus';

  // Heads: Maya (gold), Marcus (blue). No head during pause turns — silence is the visual.
  const showHead = activeTurn && !isPause &&
    (activeTurn.speaker === 'maya' || isMarcus) &&
    !(activeTurn.id === 't00' && turnElapsed < 3);

  const headConfig = isMarcus
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

          {/* Branded music */}
          <EpisodeMusic episode="E8" />

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
            <TitleCard kicker="UNIT 1 · EPISODE 8:"
              title="THE PUEBLO REVOLT" subline="1680: THE CONQUERED ANSWER BACK" at={activeStartFrame} />
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
