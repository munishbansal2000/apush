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
  useVideoConfig,
  interpolate,
} from 'remotion';
import { TalkingHead } from './TalkingHead';
import { TitleCard } from './TitleCard';
import { SpeechBubble } from './SpeechBubble';
import { GravityText } from './GravityDrop';
import { SmartText } from './SmartText';
import { MapJourney, JourneyItem } from './MapJourney';
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

  // t02: her question echoes the trio — blocks show ? badges, no redundant text

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

  // t09: navigation tools — 3-way compare (caravel @5.37, astrolabe @9.36, compass @12.09)
  // (replaces flat CARAVEL/LATEEN/ASTROLABE text — lateen is part of caravel, compass was missing)

  // t10: ferry joke
  { turnId: 't10', offset: 0, kind: 'bubble', text: 'Compass and a prayer 🧭🙏', position: [0.5, 0.25], width: 400 },
  { turnId: 't10', offset: 0, kind: 'bg-swap', bgImage: 'historic/u1e2/caravel-replicas.jpg' },

  // t11: 1492
  { turnId: 't11', offset: 0, kind: 'smarttext', text: '1492', level: 'hero', position: [0.5, 0.2], color: '#ffd700', entrance: 'stamp' },
  { turnId: 't11', offset: 0, kind: 'bg-swap', bgImage: 'historic/u1e2/debry-columbus-departs.jpg' },
  { turnId: 't11', offset: 4.0, kind: 'smarttext', text: 'GRANADA FALLS → CROWN HAS CASH', level: 'subtitle', position: [0.5, 0.35] },

  // t12: columbus enters (leader via component)

  // t13: wrong about asia
  { turnId: 't13', offset: 2.1, kind: 'smarttext', text: 'WRONG ABOUT ASIA', level: 'title', position: [0.5, 0.15], color: '#ff6b6b', entrance: 'stamp' },
  { turnId: 't13', offset: 2.1, kind: 'bg-swap', bgImage: 'historic/u1e2/behaim-erdapfel-1492.jpg' },

  // t14: flat earth myth
  { turnId: 't14', offset: 0, kind: 'bubble', text: 'Nobody educated thought the earth was flat', position: [0.5, 0.2], width: 480 },

  // t15: wrong about distance — word-anchored beats
  { turnId: 't15', offset: 5.67, kind: 'smarttext', text: 'WRONG ABOUT DISTANCE, NOT SHAPE', level: 'subtitle', position: [0.5, 0.62] },
  { turnId: 't15', offset: 8.04, kind: 'smarttext', text: 'OCTOBER 12, 1492', level: 'title', position: [0.5, 0.15], entrance: 'stamp' },
  { turnId: 't15', offset: 10.14, kind: 'smarttext', text: 'THE BAHAMAS', level: 'subtitle', position: [0.5, 0.3] },
  { turnId: 't15', offset: 12.39, kind: 'smarttext', text: 'CALLED THEM "INDIANS"', level: 'subtitle', position: [0.5, 0.42] },
  { turnId: 't15', offset: 13.41, kind: 'smarttext', text: 'DIED INSISTING: ASIA', level: 'subtitle', position: [0.5, 0.54], color: '#ff6b6b' },

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

  // t21: brazil payoff — word-anchored
  { turnId: 't21', offset: 4.68, kind: 'smarttext', text: 'WHY BRAZIL SPEAKS PORTUGUESE', level: 'subtitle', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't21', offset: 7.08, kind: 'smarttext', text: 'BULGED EAST OF THE LINE', level: 'subtitle', position: [0.5, 0.35] },

  // t23: exchange categories + reveal
  { turnId: 't23', offset: 1.68, kind: 'smarttext', text: 'PLANTS · ANIMALS · PEOPLE · DISEASE', level: 'body', position: [0.5, 0.35] },
  { turnId: 't23', offset: 9.81, kind: 'smarttext', text: 'THE COLUMBIAN EXCHANGE', level: 'hero', position: [0.5, 0.15], entrance: 'stamp' },
  { turnId: 't23', offset: 9.81, kind: 'bg-swap', bgImage: 'historic/u1e2/fuchs-maize-1542.jpg' },

  // t24: preview both directions — big, high-contrast, horizontal layout

  // t25: potatoes east — ExchangeArrows with east highlight (no redundant text)

  // t26: groceries joke
  { turnId: 't26', offset: 0, kind: 'bubble', text: 'A lot of groceries 🛒🌊', position: [0.5, 0.25], width: 380 },
  { turnId: 't26', offset: 0, kind: 'bg-swap', bgImage: 'historic/u1e2/sugarcane-harvest.jpg' },

  // t27: horses west — ExchangeArrows with west highlight (no redundant text)

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
  { turnId: 't41', offset: 7.92, kind: 'bubble', text: 'One of them spoke up', position: [0.65, 0.25], width: 320 },

  // t42: did it work?
  { turnId: 't42', offset: 0, kind: 'smarttext', text: 'DID IT WORK?', level: 'subtitle', position: [0.5, 0.2], entrance: 'stamp' },

  // t43: colonists revolted — word-anchored
  { turnId: 't43', offset: 1.77, kind: 'smarttext', text: 'COLONISTS NEARLY REVOLTED', level: 'subtitle', position: [0.5, 0.2], color: '#ff6b6b' },
  { turnId: 't43', offset: 2.82, kind: 'smarttext', text: 'CROWN WATERED THE LAWS DOWN', level: 'subtitle', position: [0.5, 0.32] },
  { turnId: 't43', offset: 9.01, kind: 'smarttext', text: 'SUBJECTS TO CONVERT?', level: 'title', position: [0.5, 0.45], entrance: 'stamp' },
  { turnId: 't43', offset: 10.62, kind: 'smarttext', text: 'OR LABOR TO USE?', level: 'title', position: [0.5, 0.6], entrance: 'stamp', color: '#ff6b6b' },

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
  { turnId: 't50', offset: 4.11, kind: 'smarttext', text: '"FOR CHRISTIANITY"', level: 'subtitle', position: [0.5, 0.45] },

  // t51: quiz intro
  { turnId: 't51', offset: 0, kind: 'gravity', text: 'QUIZ TIME', position: [0.5, 0.2] },
  { turnId: 't51', offset: 3.21, kind: 'smarttext', text: 'SAY YOUR ANSWER FIRST', level: 'subtitle', position: [0.5, 0.35] },

  // t52: quiz Q1
  { turnId: 't52', offset: 0, kind: 'smarttext', text: 'EUROPE GOT: 🥔🌽🍅', level: 'subtitle', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't52', offset: 5.25, kind: 'smarttext', text: 'AMERICAS GOT: 🐴🌾', level: 'subtitle', position: [0.5, 0.5], entrance: 'stamp' },

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
  const {fps} = useVideoConfig();
  if (frame < at) return null;
  const elapsed = (frame - at) / fps;

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
        // STAMP entrance: slams in from above with impact
        const stampProgress = isActive
          ? Math.min(1, (elapsed - appearAt) / 0.35)
          : 0;
        // Overshoot: scale 1.3 -> 0.95 -> 1.0 (stamp thud)
        const stampScale = stampProgress === 0 ? 0.5 :
          stampProgress < 0.6 ? 1.3 - (stampProgress / 0.6) * 0.35 :
          0.95 + ((stampProgress - 0.6) / 0.4) * 0.05;
        // Shockwave ring expanding on stamp
        const shockwave = stampProgress > 0 && stampProgress < 1
          ? (stampProgress * 120)
          : 0;
        const shockOpacity = stampProgress > 0 && stampProgress < 1
          ? 1 - stampProgress
          : 0;
        // Pulsing glow for questioned blocks
        const pulse = isQuestion ? 1 + 0.05 * Math.sin(elapsed * 7) : 1;
        // Golden glow when just stamped (first 1s)
        const glowAge = isActive ? (elapsed - appearAt) : 999;
        const glow = glowAge < 1.2 ? (1 - glowAge / 1.2) : 0;
        const scale = stampScale * pulse;
        const opacity = isDimmed ? 0.3 : isActive ? 1 : 0;
        if (!isActive && opacity === 0) return null;
        return (
          <div key={box.id} style={{ position: 'relative' }}>
            {/* Shockwave ring */}
            {shockOpacity > 0 && (
              <div style={{
                position: 'absolute',
                left: '50%', top: '40%',
                width: shockwave, height: shockwave,
                transform: 'translate(-50%, -50%)',
                border: `4px solid ${box.color}`,
                borderRadius: '50%',
                opacity: shockOpacity,
                pointerEvents: 'none',
              }} />
            )}
            <div style={{
              width: 280,
              background: isActive ? 'rgba(20,16,12,0.95)' : 'rgba(20,16,12,0.45)',
              border: `3px solid ${isQuestion ? '#fff' : box.color}`,
              borderRadius: 12,
              overflow: 'hidden',
              transform: `scale(${scale})`,
              opacity,
              boxShadow: glow > 0
                ? `0 0 ${40 * glow}px ${box.color}, 0 8px 24px rgba(0,0,0,0.6)`
                : isQuestion
                  ? `0 0 20px rgba(255,255,255,0.4)`
                  : '0 8px 24px rgba(0,0,0,0.6)',
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
              fontSize: 36,
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
                fontSize: 22,
                color: '#f5e6c8',
                letterSpacing: 1,
              }}>
                {box.detail}
              </div>
            )}
            </div>
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
  const {fps} = useVideoConfig();
  if (frame < at) return null;
  const elapsed = (frame - at) / fps;

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
/* Three-way compare: for "3 things" beats — image + title + desc per column */
/* Ported from slideforge CompareSlide (2-col) extended to 3 columns.        */
/* ------------------------------------------------------------------ */
const COMPARE_ITEMS_T09 = [
  { id: 'caravel', title: 'CARAVEL', desc: 'Light & fast, lateen sails claw the wind',
    image: 'historic/u1e2/caravel-replicas.jpg' },
  { id: 'astrolabe', title: 'ASTROLABE', desc: 'Find latitude from the stars',
    image: 'historic/u1e2/astrolabe.jpg' },
  { id: 'compass', title: 'COMPASS', desc: 'Hold a course across open ocean',
    image: 'historic/u1e2/portolan-chart.jpg' },
];

const ThreeWayCompare: React.FC<{
  at: number;
  items: typeof COMPARE_ITEMS_T09;
  appearOffsets: number[];
  position?: [number, number];
}> = ({ at, items, appearOffsets, position = [0.5, 0.45] }) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (frame < at) return null;
  const elapsed = (frame - at) / fps;

  return (
    <div style={{
      position: 'absolute',
      left: `${position[0] * 100}%`,
      top: `${position[1] * 100}%`,
      transform: 'translate(-50%, -50%)',
      display: 'flex',
      gap: 20,
      zIndex: 20,
    }}>
      {items.map((item, i) => {
        const appearAt = appearOffsets[i] ?? 0;
        if (elapsed < appearAt) return null;
        const progress = Math.min(1, (elapsed - appearAt) / 0.5);
        const scale = interpolate(progress, [0, 1], [0.6, 1], { extrapolateRight: 'clamp' });
        const opacity = interpolate(progress, [0, 1], [0, 1]);
        return (
          <div key={item.id} style={{
            width: 300,
            background: 'rgba(20,16,12,0.92)',
            border: '3px solid #c9a227',
            borderRadius: 12,
            overflow: 'hidden',
            transform: `scale(${scale})`,
            opacity,
          }}>
            <div style={{ height: 170, overflow: 'hidden' }}>
              <Img src={staticFile(item.image)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{
              padding: '12px 10px 4px',
              textAlign: 'center',
              fontFamily: 'Georgia, serif',
              fontWeight: 800,
              fontSize: 32,
              color: '#ffd700',
              letterSpacing: 2,
            }}>
              {item.title}
            </div>
            <div style={{
              padding: '0 10px 14px',
              textAlign: 'center',
              fontFamily: 'Arial, sans-serif',
              fontSize: 20,
              color: '#f5e6c8',
              lineHeight: 1.4,
            }}>
              {item.desc}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* MapJourney: generalized animated movement on maps.                  */
/* Declare WHAT moves, WHERE, HOW FAST, with WHAT PERSONALITY.         */
/*                                                                      */
/* items: [{                                                            */
/*   id: string,              // unique key                             */
/*   content: string,         // emoji or image path (staticFile)       */
/*   isImage?: boolean,      // true if content is an image path       */
/*   from: [number, number],  // start [x, y] in 0-1000 space           */
/*   to: [number, number],    // end [x, y] in 0-1000 space             */
/*   duration: number,        // seconds for the journey                */
/*   delay?: number,          // seconds before starting                */
/*   arcHeight?: number,      // arc lift (default 0)                   */
/*   style?: 'fly' | 'gallop' | 'ooze' | 'spin' | 'float',              */
/*   size?: number,           // emoji font size (default 56)           */
/*   trail?: boolean,         // motion trail (default false)           */
/*   glow?: string,           // glow color (e.g. '#00ff00')            */
/* }]                                                                   */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* MapRoute: animated SVG route/line over a map image.                  */
/* For Columbus voyage, Tordesillas line, etc.                         */
/* ------------------------------------------------------------------ */
const MapRoute: React.FC<{
  at: number;
  mapImage: string;
  // SVG path data (in 0-1000 coordinate space)
  path: string;
  // Duration of the draw animation in seconds
  drawDuration?: number;
  // Optional markers: [{x, y, label}] in 0-1000 space
  markers?: { x: number; y: number; label: string }[];
  color?: string;
  // For Tordesillas-style: tint the two sides after line completes
  tintSides?: { leftColor: string; rightColor: string; lineX: number };
  // Papal seal stamp at top when line starts
  papalSeal?: boolean;
}> = ({ at, mapImage, path, drawDuration = 2, markers = [], color = '#ff4444',
        tintSides, papalSeal = false }) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (frame < at) return null;
  const elapsed = (frame - at) / fps;

  // Animate stroke-dashoffset for draw effect
  const progress = Math.min(1, elapsed / drawDuration);
  const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

  // Side tints fade in after line completes
  const tintProgress = tintSides
    ? Math.min(1, Math.max(0, (elapsed - drawDuration) / 1.5))
    : 0;

  // Papal seal stamps in at start
  const sealProgress = papalSeal ? Math.min(1, elapsed / 0.4) : 0;
  const sealScale = sealProgress < 0.7
    ? 1.4 - (sealProgress / 0.7) * 0.45
    : 0.95 + ((sealProgress - 0.7) / 0.3) * 0.05;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ position: 'relative', width: '90%', height: '90%' }}>
        <Img src={staticFile(mapImage)}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        {/* Side tints for divided world */}
        {tintSides && tintProgress > 0 && (
          <svg viewBox="0 0 1000 1000" preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <rect x="0" y="0" width={tintSides.lineX} height="1000"
              fill={tintSides.leftColor} opacity={0.25 * tintProgress} />
            <rect x={tintSides.lineX} y="0" width={1000 - tintSides.lineX} height="1000"
              fill={tintSides.rightColor} opacity={0.25 * tintProgress} />
          </svg>
        )}
        {/* Papal seal */}
        {papalSeal && sealProgress > 0 && (
          <div style={{
            position: 'absolute',
            left: '62%', top: '2%',
            transform: `translate(-50%, -50%) scale(${sealScale})`,
            opacity: sealProgress,
            zIndex: 15,
          }}>
            <div style={{
              width: 90, height: 90, borderRadius: '50%',
              background: 'radial-gradient(circle, #ffd700 30%, #b8860b 70%)',
              border: '4px solid #8b0000',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36, fontWeight: 900, color: '#8b0000',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}>
              ✠
            </div>
          </div>
        )}
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <path d={path} fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="2000"
            strokeDashoffset={2000 * (1 - eased)}
            style={{ filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.8))' }} />
          {markers.map((m, i) => {
            const showAt = (i + 1) * (drawDuration / (markers.length + 1));
            if (elapsed < showAt) return null;
            return (
              <g key={i}>
                <circle cx={m.x} cy={m.y} r="14" fill={color}
                  stroke="#fff" strokeWidth="3" />
                <text x={m.x} y={m.y - 24} textAnchor="middle"
                  fill="#fff" fontSize="28" fontWeight="bold"
                  style={{ textShadow: '2px 2px 4px #000' }}>
                  {m.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* ExchangeArrows: two-way Columbian Exchange flow visualization.       */
/* Americas ↔ Europe with labeled arrows.                              */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* ExchangeArrows: THE GREAT GROCERY RUN — built on MapJourney.        */
/* Declare items, not animation code.                                  */
/* ------------------------------------------------------------------ */
const ExchangeArrows: React.FC<{
  at: number;
  position?: [number, number];
  highlight?: 'east' | 'west' | 'both';
  variant?: 'overview' | 'detail' | 'dark';
}> = ({ at, highlight = 'both', variant = 'overview' }) => {
  const showEast = highlight !== 'west';
  const showWest = highlight !== 'east';

  const items: JourneyItem[] = [
    ...(showEast ? [
      { id: 'potato', content: '🥔', from: [150, 450] as [number, number], to: [750, 320] as [number, number],
        duration: 2.5, delay: 0, arcHeight: 120, style: 'spin' as const, trail: true },
      { id: 'maize', content: '🌽', from: [150, 510] as [number, number], to: [750, 380] as [number, number],
        duration: 2.5, delay: 0.7, arcHeight: 100, style: 'spin' as const, trail: true },
      { id: 'tomato', content: '🍅', from: [150, 570] as [number, number], to: [750, 440] as [number, number],
        duration: 2.5, delay: 1.4, arcHeight: 80, style: 'fly' as const, trail: true },
    ] : []),
    ...(showWest ? [
      { id: 'horse', content: '🐴', from: [750, 320] as [number, number], to: [150, 450] as [number, number],
        duration: 2.5, delay: 0.4, arcHeight: 60, style: 'gallop' as const, trail: true },
      { id: 'wheat', content: '🌾', from: [750, 380] as [number, number], to: [150, 510] as [number, number],
        duration: 2.5, delay: 1.1, arcHeight: 80, style: 'float' as const, trail: true },
      { id: 'disease', content: '☠️', from: [750, 440] as [number, number], to: [150, 570] as [number, number],
        duration: 2.5, delay: 1.8, arcHeight: 40, style: 'ooze' as const, trail: true, glow: '#00ff00' },
    ] : []),
  ];

  const guides = [
    ...(showEast ? [{ from: [150, 500] as [number, number], to: [750, 370] as [number, number], color: '#7CFC00' }] : []),
    ...(showWest ? [{ from: [750, 370] as [number, number], to: [150, 500] as [number, number], color: '#ff6b6b' }] : []),
  ];

  const caption = highlight === 'east'
    ? '🥔 → Potatoes, maize, tomatoes sail EAST'
    : highlight === 'west'
      ? '🐴 → Horses, wheat (and disease) sail WEST'
      : 'The Great Grocery Run: food EAST, livestock WEST';

  return (
    <MapJourney
      at={at}
      mapImage="historic/u1e2/tordesillas-map.jpg"
      items={items}
      guides={guides}
      labels={[
        { x: 120, y: 100, text: 'AMERICAS' },
        { x: 880, y: 100, text: 'EUROPE' },
      ]}
      caption={caption}
      variant={variant}
    />
  );
};

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
              from={Math.floor(starts[i] * fps)}
              durationInFrames={Math.max(1, Math.floor(durations[i] * fps))}>
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
          {/* t03: God explained (0-12.15s), then glory (12.15s+) — clean Reconquista visual, no blocks */}
          {/* (MotiveBlocks removed — they overstayed and cluttered the Reconquista scene) */}
          {/* t09: 3-way compare — caravel, astrolabe, compass */}
          {activeTurn?.id === 't09' && (
            <ThreeWayCompare at={activeStartFrame}
              items={COMPARE_ITEMS_T09}
              appearOffsets={[5.37, 9.36, 12.09]} position={[0.5, 0.45]} />
          )}
          {/* t24: Exchange overview — establishing shot, both directions */}
          {activeTurn?.id === 't24' && (
            <ExchangeArrows at={activeStartFrame} variant="overview" />
          )}
          {/* t25: crops east — detail shot, zoomed on eastbound */}
          {activeTurn?.id === 't25' && (
            <ExchangeArrows at={activeStartFrame}
              highlight="east" variant="detail" />
          )}
          {/* t27: livestock west — detail shot, zoomed on westbound */}
          {activeTurn?.id === 't27' && (
            <ExchangeArrows at={activeStartFrame}
              highlight="west" variant="detail" />
          )}
          {/* t29: disease west — dark ominous shot, tone shift */}
          {activeTurn?.id === 't29' && (
            <ExchangeArrows at={activeStartFrame}
              highlight="west" variant="dark" />
          )}
          {/* t19: Tordesillas line draws on the map when he says "line" @5.31s */}
          {activeTurn?.id === 't19' && turnElapsed >= 5.31 && (
            <MapRoute at={activeStartFrame + Math.floor(5.31 * fps)}
              mapImage="historic/u1e2/tordesillas-map.jpg"
              path="M 620 100 L 620 900"
              drawDuration={2}
              markers={[
                { x: 620, y: 100, label: 'N' },
                { x: 450, y: 500, label: '← SPAIN' },
                { x: 790, y: 500, label: 'PORTUGAL →' },
              ]}
              color="#ff4444"
              tintSides={{ leftColor: '#ff0000', rightColor: '#00aa00', lineX: 620 }}
              papalSeal={true} />
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

          {/* Cartoon leaders — dramatic entrances with contextual roles */}
          {showColumbus && (
            <LeaderSticker at={Math.floor(starts[12] * fps)}
              leader="unit1_columbus_confident.webp" name="Columbus"
              role="WRONG ABOUT EVERYTHING" position={[0.28, 0.52]} />
          )}
          {showCortes && (
            <LeaderSticker at={Math.floor(starts[35] * fps) + Math.floor(3.84 * fps)}
              leader="unit1_cortes.webp" name="Cortés"
              role="TENOCHTITLAN 1521" position={[0.28, 0.52]} />
          )}
          {showLasCasas && (
            <LeaderSticker at={Math.floor(starts[41] * fps) + Math.floor(7.92 * fps)}
              leader="unit1_las_casas.webp" name="Las Casas"
              role="SUBJECTS OR LABOR?" position={[0.28, 0.52]} />
          )}

          {/* Sub-beats — smarttext: beats at the same position replace each other */}
          {activeSubBeats.map((beat, idx) => {
            const beatFrame = activeStartFrame + Math.floor(beat.offset * fps);
            const key = `${beat.turnId}-${beat.offset}-${idx}`;
            if (beat.kind === 'smarttext' && beat.text) {
              // A beat is superseded if a later beat at nearly the same position
              // is also active (prevents text pile-up). The later beat wins the
              // position regardless of level. Beats at different positions coexist.
              const pos = beat.position || [0.5, 0.2];
              const isSuperseded = activeSubBeats.some(b => {
                if (b.kind !== 'smarttext') return false;
                if (b.offset <= beat.offset || turnElapsed < b.offset) return false;
                const bp = b.position || [0.5, 0.2];
                const dist = Math.hypot(bp[0] - pos[0], bp[1] - pos[1]);
                return dist < 0.15; // same zone
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
