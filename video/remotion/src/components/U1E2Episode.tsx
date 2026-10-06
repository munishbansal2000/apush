/**
 * U1E2Episode — Unit 1 Episode 2: The Collision — Europe Sails West.
 *
 * E1 STYLE: fast-paced, kids-friendly, Heimler-competitive.
 * - Visual change every 5-8 seconds MAX
 * - Talking heads (Maya/Marcus) on screen, switching on speaker
 * - Cartoon period leaders (user-built): Columbus, Cortés, Las Casas
 * - Real historic images with Ken Burns drift
 * - Measured TTS + Vosk word timing, never estimated
 * - SmartText: declarative (text + level + timing), tool sizes/places
 *
 * 58 turns, ~448 seconds, 30fps.
 */
import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  staticFile,
  useCurrentFrame,
  interpolate,
} from 'remotion';
import { TalkingHead } from './TalkingHead';
import { TitleCard } from './TitleCard';
import { SpeechBubble } from './SpeechBubble';
import { GravityText } from './GravityDrop';
import { SmartText } from './SmartText';
import { ToneProvider } from '../validation/ToneContext';
import { AutoLayoutProvider } from '../validation/AutoLayout';

import turnsData from '../data/u1e2/turns.json';
import timingData from '../data/u1e2/timing_map.json';

interface Turn {
  id: string;
  speaker: string;
  text: string;
  duration_sec: number;
}

const turns = turnsData as Turn[];
const starts = (timingData as { starts: number[] }).starts;
const durations = (timingData as { durations: number[] }).durations;

const FPS = 30;
const EP = 'u1e2';

/* ------------------------------------------------------------------ */
/* Sub-beats: timed visual events. offset = seconds into the turn.      */
/* All offsets from Vosk word_times.json (measured, never estimated).  */
/* ------------------------------------------------------------------ */
interface SubBeat {
  turnId: string;
  offset: number;
  kind: 'smarttext' | 'bubble' | 'gravity' | 'bg-swap' | 'leader';
  text?: string;
  position?: [number, number];
  level?: 'hero' | 'title' | 'subtitle' | 'body';
  color?: string;
  entrance?: 'stamp' | 'fade' | 'typewriter';
  bgImage?: string;
  art?: string;
  width?: number;
  /** leader asset filename in public/leaders/ */
  leader?: string;
  leaderName?: string;
}

const SUB_BEATS: SubBeat[] = [
  // t00: intro — collision thesis + three boxes (boxes via ThreeBoxesE2)
  { turnId: 't00', offset: 5.31, kind: 'smarttext', text: 'TWO WORLDS COLLIDE', level: 'hero', position: [0.5, 0.15], entrance: 'stamp' },

  // t01: gold, god, glory trio — three-block scene (fills as words are spoken)
  // (individual GOLD/GOD/GLORY popups replaced by MotiveBlocks below)

  // t02: her question echoes the trio
  { turnId: 't02', offset: 0, kind: 'smarttext', text: 'GOD + GLORY?', level: 'subtitle', position: [0.5, 0.2] },

  // t03: reconquista
  { turnId: 't03', offset: 0.99, kind: 'smarttext', text: 'RECONQUISTA', level: 'title', position: [0.5, 0.15], entrance: 'stamp' },
  { turnId: 't03', offset: 0.99, kind: 'bg-swap', bgImage: 'historic/u1e2/isabella-ferdinand.jpg' },
  { turnId: 't03', offset: 3.57, kind: 'smarttext', text: 'CENTURIES OF HOLY WAR', level: 'subtitle', position: [0.5, 0.3] },

  // t04: arms race joke
  { turnId: 't04', offset: 0, kind: 'bubble', text: 'Arms race — with sails ⛵', position: [0.5, 0.25], width: 420 },

  // t05: pope draws a line (foreshadow)
  { turnId: 't05', offset: 1.65, kind: 'smarttext', text: 'THE POPE DRAWS A LINE', level: 'subtitle', position: [0.5, 0.2] },
  { turnId: 't05', offset: 1.65, kind: 'bg-swap', bgImage: 'historic/u1e2/tordesillas-map.jpg' },

  // t06: 1453
  { turnId: 't06', offset: 2.67, kind: 'smarttext', text: '1453', level: 'hero', position: [0.5, 0.2], color: '#ff6b6b', entrance: 'stamp' },
  { turnId: 't06', offset: 2.67, kind: 'smarttext', text: 'CONSTANTINOPLE FALLS', level: 'subtitle', position: [0.5, 0.35] },

  // t07: tariffs + find own route
  { turnId: 't07', offset: 1.32, kind: 'smarttext', text: 'TARIFFS GO UP', level: 'title', position: [0.5, 0.15], color: '#ffd700', entrance: 'stamp' },
  { turnId: 't07', offset: 5.01, kind: 'smarttext', text: 'FIND YOUR OWN ROUTE', level: 'subtitle', position: [0.5, 0.3] },

  // t08: henry joke
  { turnId: 't08', offset: 0, kind: 'bubble', text: 'The guy who never sailed anywhere', position: [0.5, 0.25], width: 420 },
  { turnId: 't08', offset: 0, kind: 'bg-swap', bgImage: 'historic/u1e2/henry-navigator.jpg' },

  // t09: navigation tools trio
  { turnId: 't09', offset: 5.37, kind: 'smarttext', text: 'CARAVEL', level: 'title', position: [0.3, 0.2], entrance: 'stamp' },
  { turnId: 't09', offset: 5.37, kind: 'bg-swap', bgImage: 'historic/u1e2/astrolabe.jpg' },
  { turnId: 't09', offset: 6.69, kind: 'smarttext', text: 'LATEEN SAIL', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't09', offset: 8.0, kind: 'smarttext', text: 'ASTROLABE', level: 'title', position: [0.7, 0.2], entrance: 'stamp' },

  // t10: ferry joke
  { turnId: 't10', offset: 0, kind: 'bubble', text: 'Compass and a prayer 🧭🙏', position: [0.5, 0.25], width: 400 },
  { turnId: 't10', offset: 0, kind: 'bg-swap', bgImage: 'historic/u1e2/caravel-replicas.jpg' },

  // t11: 1492
  { turnId: 't11', offset: 0, kind: 'smarttext', text: '1492', level: 'hero', position: [0.5, 0.2], color: '#ffd700', entrance: 'stamp' },
  { turnId: 't11', offset: 0, kind: 'bg-swap', bgImage: 'historic/u1e2/debry-columbus-departs.jpg' },
  { turnId: 't11', offset: 4.0, kind: 'smarttext', text: 'GRANADA FALLS → CROWN HAS CASH', level: 'subtitle', position: [0.5, 0.35] },

  // t12: columbus enters (leader via component)
  { turnId: 't12', offset: 0, kind: 'leader', leader: 'unit1_columbus_confident.webp', leaderName: 'Columbus', position: [0.28, 0.52] },

  // t13: wrong about asia
  { turnId: 't13', offset: 2.1, kind: 'smarttext', text: 'WRONG ABOUT ASIA', level: 'title', position: [0.5, 0.15], color: '#ff6b6b', entrance: 'stamp' },
  { turnId: 't13', offset: 2.1, kind: 'bg-swap', bgImage: 'historic/u1e2/behaim-erdapfel-1492.jpg' },

  // t14: flat earth myth
  { turnId: 't14', offset: 0, kind: 'bubble', text: 'Nobody educated thought the earth was flat', position: [0.5, 0.2], width: 480 },

  // t15: wrong about distance
  { turnId: 't15', offset: 8.0, kind: 'smarttext', text: 'WRONG ABOUT DISTANCE, NOT SHAPE', level: 'subtitle', position: [0.5, 0.3] },

  // t16: never saw north america
  { turnId: 't16', offset: 0, kind: 'smarttext', text: 'NEVER SAW NORTH AMERICA', level: 'subtitle', position: [0.5, 0.2] },
  { turnId: 't16', offset: 0, kind: 'bg-swap', bgImage: 'historic/u1e2/debry-columbus-landing.jpg' },

  // t17: four voyages, portugal furious
  { turnId: 't17', offset: 0.39, kind: 'smarttext', text: '4 VOYAGES', level: 'title', position: [0.5, 0.15], entrance: 'stamp' },
  { turnId: 't17', offset: 0.39, kind: 'bg-swap', bgImage: 'historic/u1e2/tordesillas-map.jpg' },
  { turnId: 't17', offset: 4.02, kind: 'smarttext', text: 'PORTUGAL IS FURIOUS', level: 'subtitle', position: [0.5, 0.3], color: '#ff6b6b' },

  // t18: pope divides planet?
  { turnId: 't18', offset: 0, kind: 'bubble', text: 'Just... divides up the planet? 🌍', position: [0.5, 0.2], width: 440 },

  // t19: tordesillas 1494
  { turnId: 't19', offset: 3.48, kind: 'smarttext', text: '1494', level: 'hero', position: [0.5, 0.15], color: '#ffd700', entrance: 'stamp' },
  { turnId: 't19', offset: 3.48, kind: 'smarttext', text: 'TREATY OF TORDESILLAS', level: 'title', position: [0.5, 0.3], entrance: 'stamp' },

  // t20: france/england ignored
  { turnId: 't20', offset: 0, kind: 'bubble', text: 'France and England: ignored it completely', position: [0.5, 0.2], width: 440 },

  // t21: brazil payoff
  { turnId: 't21', offset: 4.68, kind: 'smarttext', text: 'WHY BRAZIL SPEAKS PORTUGUESE', level: 'subtitle', position: [0.5, 0.2], entrance: 'stamp' },

  // t23: exchange categories + reveal
  { turnId: 't23', offset: 1.68, kind: 'smarttext', text: 'PLANTS · ANIMALS · PEOPLE · DISEASE', level: 'body', position: [0.5, 0.2] },
  { turnId: 't23', offset: 9.81, kind: 'smarttext', text: 'THE COLUMBIAN EXCHANGE', level: 'hero', position: [0.5, 0.15], entrance: 'stamp' },
  { turnId: 't23', offset: 9.81, kind: 'bg-swap', bgImage: 'historic/u1e2/fuchs-maize-1542.jpg' },

  // t24: preview both directions
  { turnId: 't24', offset: 0, kind: 'smarttext', text: '🥔 → EAST  🐴 → WEST', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },

  // t25: potatoes east
  { turnId: 't25', offset: 0.78, kind: 'smarttext', text: '🥔 POTATOES → EAST', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't25', offset: 0.78, kind: 'bg-swap', bgImage: 'historic/u1e2/potatoes.jpg' },

  // t26: groceries joke
  { turnId: 't26', offset: 0, kind: 'bubble', text: 'A lot of groceries 🛒🌊', position: [0.5, 0.25], width: 380 },
  { turnId: 't26', offset: 0, kind: 'bg-swap', bgImage: 'historic/u1e2/sugarcane-harvest.jpg' },

  // t27: horses west
  { turnId: 't27', offset: 1.53, kind: 'smarttext', text: '🐴 HORSES → WEST', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't27', offset: 1.53, kind: 'bg-swap', bgImage: 'historic/u1e2/comanche-horses.jpg' },

  // t28: personality lie joke
  { turnId: 't28', offset: 0, kind: 'bubble', text: 'My whole personality is a lie', position: [0.5, 0.25], width: 380 },
  { turnId: 't28', offset: 0, kind: 'bg-swap', bgImage: 'historic/u1e2/durer-large-horse-1505.jpg' },

  // t29: smallpox dark side
  { turnId: 't29', offset: 4.26, kind: 'smarttext', text: 'SMALLPOX', level: 'hero', position: [0.5, 0.2], color: '#ff6b6b', entrance: 'stamp' },
  { turnId: 't29', offset: 4.26, kind: 'smarttext', text: 'THE DARK SIDE', level: 'subtitle', position: [0.5, 0.35] },
  { turnId: 't29', offset: 4.26, kind: 'bg-swap', bgImage: 'historic/u1e2/smallpox-florentine-codex.jpg' },

  // t30: cause-effect exam frame
  { turnId: 't30', offset: 1.11, kind: 'smarttext', text: 'CAUSE → EFFECT', level: 'subtitle', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't30', offset: 4.0, kind: 'gravity', text: 'WHAT CLEARED THE GROUND?', position: [0.5, 0.35] },

  // t31: disease did the work
  { turnId: 't31', offset: 2.64, kind: 'smarttext', text: 'DISEASE DID THE WORK', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },

  // t32: anything go east?
  { turnId: 't32', offset: 0, kind: 'bubble', text: 'Did anything go EAST? 🤔', position: [0.5, 0.25], width: 360 },

  // t33: syphilis debate
  { turnId: 't33', offset: 1.05, kind: 'smarttext', text: 'SYPHILIS? — DEBATED', level: 'subtitle', position: [0.5, 0.2] },

  // t35: cortes enters
  { turnId: 't35', offset: 3.84, kind: 'leader', leader: 'unit1_cortes.webp', leaderName: 'Cortés', position: [0.28, 0.52] },
  { turnId: 't35', offset: 3.84, kind: 'bg-swap', bgImage: 'historic/u1e2/lienzo-tlaxcala.jpg' },

  // t36: few hundred vs empire
  { turnId: 't36', offset: 0, kind: 'smarttext', text: 'A FEW HUNDRED vs AN EMPIRE', level: 'title', position: [0.5, 0.15], entrance: 'stamp' },
  { turnId: 't36', offset: 0, kind: 'bg-swap', bgImage: 'historic/u1e2/cannon.jpg' },

  // t37: native allies (the skipped part)
  { turnId: 't37', offset: 4.92, kind: 'smarttext', text: 'TENS OF THOUSANDS OF NATIVE ALLIES', level: 'subtitle', position: [0.5, 0.3] },
  { turnId: 't37', offset: 4.92, kind: 'bg-swap', bgImage: 'historic/u1e2/pirotechnia-cannons-1540.jpg' },

  // t38: owns everyone?
  { turnId: 't38', offset: 0, kind: 'bubble', text: 'Just... owns everyone? 👑', position: [0.5, 0.25], width: 360 },

  // t39: encomienda system
  { turnId: 't39', offset: 0, kind: 'smarttext', text: 'ENCOMIENDA SYSTEM', level: 'hero', position: [0.5, 0.15], entrance: 'stamp' },
  { turnId: 't39', offset: 0, kind: 'bg-swap', bgImage: 'historic/u1e2/debry-hispaniola-mines.jpg' },
  { turnId: 't39', offset: 3.6, kind: 'smarttext', text: 'GRANT = LABOR + TRIBUTE', level: 'subtitle', position: [0.5, 0.3] },

  // t40: supposed to (deadpan)
  { turnId: 't40', offset: 0, kind: 'bubble', text: 'Supposed to. 🙄', position: [0.5, 0.3], width: 280 },

  // t41: las casas speaks up
  { turnId: 't41', offset: 7.92, kind: 'leader', leader: 'unit1_las_casas.webp', leaderName: 'Las Casas', position: [0.28, 0.52] },
  { turnId: 't41', offset: 7.92, kind: 'bubble', text: 'One of them spoke up', position: [0.65, 0.25], width: 320 },

  // t42: did it work?
  { turnId: 't42', offset: 0, kind: 'smarttext', text: 'DID IT WORK?', level: 'subtitle', position: [0.5, 0.2], entrance: 'stamp' },

  // t43: colonists revolted
  { turnId: 't43', offset: 1.77, kind: 'smarttext', text: 'COLONISTS NEARLY REVOLTED', level: 'subtitle', position: [0.5, 0.2], color: '#ff6b6b' },

  // t45: recap 1
  { turnId: 't45', offset: 4.8, kind: 'smarttext', text: '① TORDESILLAS: 1494', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },

  // t46: 1494 detail
  { turnId: 't46', offset: 3.54, kind: 'smarttext', text: '370 LEAGUES WEST OF CAPE VERDE', level: 'subtitle', position: [0.5, 0.2] },
  { turnId: 't46', offset: 3.54, kind: 'bg-swap', bgImage: 'historic/u1e2/tordesillas-map.jpg' },
  { turnId: 't46', offset: 4.26, kind: 'smarttext', text: 'WEST → SPAIN · EAST → PORTUGAL', level: 'subtitle', position: [0.5, 0.32] },

  // t47: recap 2
  { turnId: 't47', offset: 1.5, kind: 'smarttext', text: '② EXCHANGE: BOTH WAYS', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },

  // t48: disease west, crops both
  { turnId: 't48', offset: 1.95, kind: 'smarttext', text: '☠️ → WEST (one way)', level: 'subtitle', position: [0.5, 0.2], color: '#ff6b6b' },
  { turnId: 't48', offset: 4.32, kind: 'smarttext', text: '🥔🌽 ↔ BOTH WAYS', level: 'subtitle', position: [0.5, 0.32] },
  { turnId: 't48', offset: 4.32, kind: 'bg-swap', bgImage: 'historic/u1e2/fuchs-maize-1542.jpg' },

  // t49: recap 3
  { turnId: 't49', offset: 0, kind: 'smarttext', text: '③ ENCOMIENDA', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },

  // t50: encomienda expanded
  { turnId: 't50', offset: 0, kind: 'smarttext', text: 'LABOR + TRIBUTE', level: 'title', position: [0.5, 0.15], entrance: 'stamp' },
  { turnId: 't50', offset: 0, kind: 'bg-swap', bgImage: 'historic/u1e2/debry-hispaniola-mines.jpg' },
  { turnId: 't50', offset: 4.11, kind: 'smarttext', text: '"FOR CHRISTIANITY"', level: 'subtitle', position: [0.5, 0.3] },

  // t51: quiz intro
  { turnId: 't51', offset: 0, kind: 'gravity', text: 'QUIZ TIME', position: [0.5, 0.2] },
  { turnId: 't51', offset: 3.21, kind: 'smarttext', text: 'SAY YOUR ANSWER FIRST', level: 'subtitle', position: [0.5, 0.35] },

  // t52: quiz Q1
  { turnId: 't52', offset: 0, kind: 'smarttext', text: 'EUROPE GOT: 🥔🌽🍅', level: 'subtitle', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't52', offset: 5.25, kind: 'smarttext', text: 'AMERICAS GOT: 🐴🌾', level: 'subtitle', position: [0.5, 0.35], entrance: 'stamp' },

  // t53: quiz Q2
  { turnId: 't53', offset: 0, kind: 'gravity', text: 'Q2: ENCOMIENDA IN ONE SENTENCE?', position: [0.5, 0.2] },

  // t54: quiz A2
  { turnId: 't54', offset: 0, kind: 'smarttext', text: 'ENCOMIENDA = LABOR GRANT', level: 'subtitle', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't54', offset: 4.02, kind: 'bubble', text: 'Supposedly for Christianity', position: [0.5, 0.4], width: 400 },

  // t55: outro
  { turnId: 't55', offset: 0, kind: 'smarttext', text: 'EPISODE 2 ✓', level: 'hero', position: [0.5, 0.3], color: '#7CFC00', entrance: 'stamp' },
  { turnId: 't55', offset: 0, kind: 'bg-swap', bgImage: 'historic/u1e2/debry-columbus-departs.jpg' },

  // t56+t57: final punch (shared visual moment)
  { turnId: 't56', offset: 0, kind: 'smarttext', text: 'TWO WORLDS, ONE OCEAN', level: 'hero', position: [0.5, 0.3] },
  { turnId: 't57', offset: 0, kind: 'smarttext', text: 'NO GOING BACK.', level: 'hero', position: [0.5, 0.4], entrance: 'stamp' },
];


/* ------------------------------------------------------------------ */
/* E2 three boxes: Columbian Exchange | Encomienda | Tordesillas        */
/* ------------------------------------------------------------------ */
const E2_BOXES = [
  { id: 'exchange', label: 'COLUMBIAN EXCHANGE', image: 'historic/u1e2/fuchs-maize-1542.jpg' },
  { id: 'encomienda', label: 'ENCOMIENDA', image: 'historic/u1e2/debry-hispaniola-mines.jpg' },
  { id: 'tordesillas', label: 'TORDESILLAS', image: 'historic/u1e2/tordesillas-map.jpg' },
];

/* Motive blocks: GOLD | GOD | GLORY — fills in as each word is spoken   */
/* ------------------------------------------------------------------ */
const MOTIVE_BOXES = [
  { id: 'gold', label: 'GOLD', detail: 'SPICES & SILK', image: 'historic/u1e2/gold-coins.jpg', color: '#ffd700' },
  { id: 'god', label: 'GOD', detail: 'RECONQUISTA ZEAL', image: 'historic/u1e2/virgen-reyes-catolicos.jpg', color: '#87ceeb' },
  { id: 'glory', label: 'GLORY', detail: 'BEAT PORTUGAL', image: 'historic/u1e2/debry-columbus-landing.jpg', color: '#ff6b6b' },
];

const MotiveBlocks: React.FC<{
  at: number;
  appearOffsets: number[];
  detailOffsets?: number[];
  questionIds?: string[];
  dimIds?: string[];
  position?: [number, number];
}> = ({ at, appearOffsets, detailOffsets = [], questionIds = [], dimIds = [], position = [0.5, 0.42] }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const elapsed = (frame - at) / FPS;

  return (
    <div style={{
      position: 'absolute',
      left: `${position[0] * 100}%`,
      top: `${position[1] * 100}%`,
      transform: 'translate(-50%, -50%)',
      display: 'flex',
      gap: 24,
      zIndex: 20,
    }}>
      {MOTIVE_BOXES.map((box, i) => {
        const appearAt = appearOffsets[i] ?? 0;
        const isActive = elapsed >= appearAt;
        const detailAt = detailOffsets[i] ?? 999;
        const showDetail = elapsed >= detailAt;
        const isQuestion = questionIds.includes(box.id);
        const isDimmed = dimIds.includes(box.id);
        // Pulsing scale for questioned blocks (Maya's "what about...?")
        const pulse = isQuestion ? 1 + 0.04 * Math.sin(elapsed * 6) : 1;
        const scale = (isActive
          ? interpolate(Math.min(1, (elapsed - appearAt) / 0.4), [0, 1], [0.7, 1], { extrapolateRight: 'clamp' })
          : 0.9) * pulse;
        const opacity = isDimmed ? 0.35 : isActive
          ? interpolate(Math.min(1, (elapsed - appearAt) / 0.3), [0, 1], [0, 1])
          : 0.4;
        return (
          <div key={box.id} style={{
            width: 280,
            background: isActive ? 'rgba(20,16,12,0.92)' : 'rgba(20,16,12,0.45)',
            border: `3px solid ${isQuestion ? '#fff' : isActive ? box.color : '#555'}`,
            borderRadius: 12,
            overflow: 'hidden',
            transform: `scale(${scale})`,
            opacity,
          }}>
            <div style={{ height: 150, overflow: 'hidden', position: 'relative' }}>
              {isActive ? (
                <Img src={staticFile(box.image)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 64, color: isQuestion ? '#fff' : '#333',
                }}>{isQuestion ? '?' : '?'}</div>
              )}
              {isQuestion && (
                <div style={{
                  position: 'absolute', top: 8, right: 8,
                  width: 44, height: 44, borderRadius: '50%',
                  background: '#fff', color: '#000',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, fontWeight: 900,
                }}>?</div>
              )}
            </div>
            <div style={{
              padding: '12px 8px 6px',
              textAlign: 'center',
              fontFamily: 'Georgia, serif',
              fontWeight: 800,
              fontSize: 28,
              color: isActive ? box.color : '#666',
              letterSpacing: 2,
            }}>
              {isActive ? box.label : '···'}
            </div>
            {showDetail && (
              <div style={{
                padding: '0 8px 12px',
                textAlign: 'center',
                fontFamily: 'Arial, sans-serif',
                fontWeight: 700,
                fontSize: 16,
                color: '#f5e6c8',
                letterSpacing: 1,
              }}>
                {box.detail}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const ThreeBoxesE2: React.FC<{
  at: number;
  appearOffsets: number[];
  checked?: string[];
  position?: [number, number];
}> = ({ at, appearOffsets, checked = [], position = [0.5, 0.5] }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const elapsed = (frame - at) / FPS;

  return (
    <div style={{
      position: 'absolute',
      left: `${position[0] * 100}%`,
      top: `${position[1] * 100}%`,
      transform: 'translate(-50%, -50%)',
      display: 'flex',
      gap: 24,
      zIndex: 20,
    }}>
      {E2_BOXES.map((box, i) => {
        const appearAt = appearOffsets[i] ?? i;
        if (elapsed < appearAt) return null;
        const isChecked = checked.includes(box.id);
        const scale = interpolate(
          Math.min(1, (elapsed - appearAt) / 0.4),
          [0, 1], [0.6, 1], { extrapolateRight: 'clamp' }
        );
        return (
          <div key={box.id} style={{
            width: 280,
            background: 'rgba(20,16,12,0.88)',
            border: isChecked ? '3px solid #7CFC00' : '3px solid #c9a227',
            borderRadius: 12,
            overflow: 'hidden',
            transform: `scale(${scale})`,
            opacity: interpolate(Math.min(1, (elapsed - appearAt) / 0.3), [0, 1], [0, 1]),
          }}>
            <div style={{ height: 150, overflow: 'hidden' }}>
              <Img src={staticFile(box.image)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{
              padding: '12px 8px',
              textAlign: 'center',
              fontFamily: 'Georgia, serif',
              fontWeight: 800,
              fontSize: 22,
              color: isChecked ? '#7CFC00' : '#f5e6c8',
              letterSpacing: 1,
            }}>
              {isChecked ? '✓ ' : ''}{box.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Cartoon leader sticker (user-built assets, transparent WebP)         */
/* ------------------------------------------------------------------ */
const LeaderSticker: React.FC<{
  at: number;
  leader: string;
  name: string;
  position: [number, number];
  size?: number;
}> = ({ at, leader, name, position, size = 320 }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const elapsed = (frame - at) / FPS;
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
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Background per turn                                                  */
/* ------------------------------------------------------------------ */
const getBackgroundForTurn = (turnId: string | null, subBeatBg: string | null): string => {
  if (subBeatBg) return subBeatBg;
  if (!turnId) return 'historic/u1e2/debry-columbus-departs.jpg';
  const n = parseInt(turnId.slice(1), 10);
  if (n === 0) return 'historic/u1e2/tordesillas-map.jpg';
  if (n <= 2) return 'historic/u1e2/gold-coins.jpg';
  if (n === 3 || n === 4) return 'historic/u1e2/isabella-ferdinand.jpg';
  if (n === 5) return 'historic/u1e2/tordesillas-map.jpg';
  if (n <= 7) return 'historic/u1e2/portolan-chart.jpg';
  if (n === 8) return 'historic/u1e2/henry-navigator.jpg';
  if (n === 9) return 'historic/u1e2/astrolabe.jpg';
  if (n === 10) return 'historic/u1e2/caravel-replicas.jpg';
  if (n === 11) return 'historic/u1e2/debry-columbus-departs.jpg';
  if (n <= 14) return 'historic/u1e2/behaim-erdapfel-1492.jpg';
  if (n <= 16) return 'historic/u1e2/debry-columbus-landing.jpg';
  if (n <= 21) return 'historic/u1e2/tordesillas-map.jpg';
  if (n === 22) return 'historic/u1e2/bruegel-harvesters-1565.jpg';
  if (n <= 24) return 'historic/u1e2/fuchs-maize-1542.jpg';
  if (n === 25) return 'historic/u1e2/potatoes.jpg';
  if (n === 26) return 'historic/u1e2/sugarcane-harvest.jpg';
  if (n === 27) return 'historic/u1e2/comanche-horses.jpg';
  if (n === 28) return 'historic/u1e2/durer-large-horse-1505.jpg';
  if (n <= 34) return 'historic/u1e2/smallpox-florentine-codex.jpg';
  if (n === 35) return 'historic/u1e2/lienzo-tlaxcala.jpg';
  if (n === 36) return 'historic/u1e2/cannon.jpg';
  if (n === 37) return 'historic/u1e2/pirotechnia-cannons-1540.jpg';
  if (n <= 44) return 'historic/u1e2/debry-hispaniola-mines.jpg';
  if (n <= 49) return 'historic/u1e2/caravel-replicas.jpg';
  if (n === 50) return 'historic/u1e2/debry-hispaniola-mines.jpg';
  return 'historic/u1e2/debry-columbus-departs.jpg';
};


/* ------------------------------------------------------------------ */
/* Main episode                                                         */
/* ------------------------------------------------------------------ */
export const U1E2Episode: React.FC = () => {
  const frame = useCurrentFrame();
  const timeSec = frame / FPS;

  let activeIndex = -1;
  for (let i = 0; i < turns.length; i++) {
    if (timeSec >= starts[i] && timeSec < starts[i] + durations[i]) {
      activeIndex = i;
      break;
    }
  }

  const activeTurn = activeIndex >= 0 ? turns[activeIndex] : null;
  const activeStartFrame = activeIndex >= 0 ? Math.floor(starts[activeIndex] * FPS) : 0;
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

  // Leaders stay visible while their section plays
  // Positioned left-of-center to avoid overlapping the talking head (bottom-right)
  const showColumbus = activeTurn && ['t12','t13','t14','t15','t16'].includes(activeTurn.id);
  const showCortes = activeTurn && ['t35','t36','t37'].includes(activeTurn.id);
  const showLasCasas = activeTurn && ['t41','t42','t43'].includes(activeTurn.id);

  const showHead = activeTurn &&
    (activeTurn.speaker === 'maya' || activeTurn.speaker === 'marcus') &&
    !(activeTurn.id === 't00' && turnElapsed < 3);

  return (
    <ToneProvider tone="serious">
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
              from={Math.floor(starts[i] * FPS)}
              durationInFrames={Math.max(1, Math.floor(durations[i] * FPS))}>
              <Audio src={staticFile(`audio/${EP}/${turn.id}.mp3`)} />
            </Sequence>
          ))}

          {/* Talking head */}
          {showHead && (
            <TalkingHead
              key={`head-${activeTurn!.id}`}
              speakerName={activeTurn!.speaker === 'maya' ? 'Maya' : 'Marcus'}
              speakerColor={activeTurn!.speaker === 'maya' ? '#c9a227' : '#2c5aa0'}
              position="bottom-right"
              size={0.26}
              speaking={true}
              showName={true}
              assetPair={{
                realistic: staticFile(activeTurn!.speaker === 'maya' ? 'maya-real.webp' : 'marcus-real.webp'),
                stylized: staticFile(activeTurn!.speaker === 'maya' ? 'maya-toon.webp' : 'maya-toon.webp'),
              }}
              frameStyle="rounded"
            />
          )}

          {/* Title card */}
          {activeTurn?.id === 't00' && turnElapsed < 3 && (
            <TitleCard kicker="UNIT 1 · EPISODE 2:"
              title="THE COLLISION" subline="EUROPE SAILS WEST" at={activeStartFrame} />
          )}

          {/* E2 three boxes — word-anchored: colombian@14.19, encomienda@15.96, tordesillas@18.54 */}
          {activeTurn?.id === 't00' && turnElapsed >= 3 && (
            <ThreeBoxesE2 at={activeStartFrame}
              appearOffsets={[14.19, 15.96, 18.54]} position={[0.5, 0.55]} />
          )}
          {/* Motive blocks: GOLD | GOD | GLORY — each turn has its own beat */}
          {/* t01: trio introduced, only GOLD explained (detail at ~8s) */}
          {activeTurn?.id === 't01' && (
            <MotiveBlocks at={activeStartFrame}
              appearOffsets={[3.66, 4.05, 4.47]}
              detailOffsets={[8.0, 999, 999]} position={[0.5, 0.42]} />
          )}
          {/* t02: Maya asks "what about God and glory?" — those two pulse with ? */}
          {activeTurn?.id === 't02' && (
            <MotiveBlocks at={activeStartFrame}
              appearOffsets={[0, 0, 0]}
              detailOffsets={[0, 999, 999]}
              questionIds={['god', 'glory']}
              dimIds={['gold']} position={[0.5, 0.42]} />
          )}
          {/* t03: God explained (0-12.15s), then glory (12.15s+) — two distinct visuals */}
          {activeTurn?.id === 't03' && turnElapsed < 12.15 && (
            <MotiveBlocks at={activeStartFrame}
              appearOffsets={[0, 0, 0]}
              detailOffsets={[0, 1.5, 999]} position={[0.5, 0.62]} />
          )}
          {activeTurn?.id === 't03' && turnElapsed >= 12.15 && (
            <MotiveBlocks at={activeStartFrame}
              appearOffsets={[0, 0, 0]}
              detailOffsets={[0, 0, 0]}
              dimIds={['gold', 'god']} position={[0.5, 0.62]} />
          )}
          {/* Recap checks */}
          {activeTurn?.id === 't45' && (
            <ThreeBoxesE2 at={activeStartFrame} appearOffsets={[0, 0, 0]}
              checked={['tordesillas']} position={[0.5, 0.55]} />
          )}
          {activeTurn?.id === 't47' && (
            <ThreeBoxesE2 at={activeStartFrame} appearOffsets={[0, 0, 0]}
              checked={['tordesillas', 'exchange']} position={[0.5, 0.55]} />
          )}
          {activeTurn?.id === 't49' && (
            <ThreeBoxesE2 at={activeStartFrame} appearOffsets={[0, 0, 0]}
              checked={['tordesillas', 'exchange', 'encomienda']} position={[0.5, 0.55]} />
          )}
          {/* Progress trackers: "one down" / "two down" / "all three" */}
          {activeTurn?.id === 't22' && (
            <ThreeBoxesE2 at={activeStartFrame} appearOffsets={[0, 0, 0]}
              checked={['tordesillas']} position={[0.5, 0.55]} />
          )}
          {activeTurn?.id === 't34' && (
            <ThreeBoxesE2 at={activeStartFrame} appearOffsets={[0, 0, 0]}
              checked={['tordesillas', 'exchange']} position={[0.5, 0.55]} />
          )}
          {activeTurn?.id === 't44' && (
            <ThreeBoxesE2 at={activeStartFrame} appearOffsets={[0, 0, 0]}
              checked={['tordesillas', 'exchange', 'encomienda']} position={[0.5, 0.55]} />
          )}

          {/* Cartoon leaders */}
          {showColumbus && (
            <LeaderSticker at={Math.floor(starts[12] * FPS)}
              leader="unit1_columbus_confident.webp" name="Columbus" position={[0.28, 0.52]} />
          )}
          {showCortes && (
            <LeaderSticker at={Math.floor(starts[35] * FPS) + Math.floor(3.84 * FPS)}
              leader="unit1_cortes.webp" name="Cortés" position={[0.28, 0.52]} />
          )}
          {showLasCasas && (
            <LeaderSticker at={Math.floor(starts[41] * FPS) + Math.floor(7.92 * FPS)}
              leader="unit1_las_casas.webp" name="Las Casas" position={[0.28, 0.52]} />
          )}

          {/* Sub-beats */}
          {activeSubBeats.map((beat, idx) => {
            const beatFrame = activeStartFrame + Math.floor(beat.offset * FPS);
            const key = `${beat.turnId}-${beat.offset}-${idx}`;
            if (beat.kind === 'smarttext' && beat.text) {
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
            if (beat.kind === 'leader' && beat.leader) {
              return <LeaderSticker key={key} at={beatFrame}
                leader={beat.leader} name={beat.leaderName || ''}
                position={beat.position || [0.72, 0.55]} />;
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
