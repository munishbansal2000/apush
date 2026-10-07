/**
 * U1E1Episode — Unit 1 Episode 1: Native American Societies before Columbus.
 *
 * FAST-PACED, KIDS-FRIENDLY, HEIMLER-COMPETITIVE.
 *
 * Design principles:
 * - Visual change every 5-8 seconds MAX (no static frame lasts longer)
 * - Every turn has at least one visual beat; long turns (>10s) have sub-beats
 * - Real historical images (de Bry engravings, site photos, artifacts)
 * - Talking heads (Maya/Marcus) switch on speaker
 * - Measured TTS timing, never estimated
 * - Kids friendly: brighter, more color, playful bubbles for funny lines
 *
 * 58 turns, ~416 seconds, 30fps.
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
import { TextCallout } from './TextCallout';
import { SpeechBubble } from './SpeechBubble';
import { GravityText } from './GravityDrop';
import { ThreeBoxes } from './ThreeBoxes';
import { RegionMap } from './RegionMap';
import { TradeRoutes } from './TradeRoutes';
import { SmartText } from './SmartText';
import { ToneProvider } from '../validation/ToneContext';
import { AutoLayoutProvider } from '../validation/AutoLayout';

import turnsData from '../data/turns.json';
import timingData from '../data/timing_map.json';

interface Turn {
  id: string;
  speaker: string;
  text: string;
  duration_sec: number;
}

const turns = turnsData as Turn[];
const starts = (timingData as { starts: number[] }).starts;
const durations = (timingData as { durations: number[] }).durations;


/**
 * SUB-BEATS: timed visual events within turns.
 * offset = seconds into the turn when this visual appears.
 * This is what keeps the pace fast — no frame sits static for >8s.
 */
interface SubBeat {
  turnId: string;
  offset: number;
  kind: 'callout' | 'bubble' | 'gravity' | 'bg-swap' | 'smarttext';
  text?: string;
  position?: [number, number];
  fontSize?: number;
  /** SmartText hierarchy level (replaces manual fontSize) */
  level?: 'hero' | 'title' | 'subtitle' | 'body';
  color?: string;
  entrance?: 'stamp' | 'fade' | 'typewriter';
  bgImage?: string;
  art?: string;
  width?: number;
}

const SUB_BEATS: SubBeat[] = [
  // t00 (20.1s): Three boxes intro — uses ThreeBoxes component
  // (ThreeBoxes rendered separately, not as sub-beat)
  { turnId: 't00', offset: 11, kind: 'gravity', text: 'A CITY THAT RIVALED LONDON', position: [0.5, 0.28], fontSize: 60, color: '#c9a227' },
  { turnId: 't00', offset: 15, kind: 'bg-swap', bgImage: 'historic/cahokia_aerial_roe.jpg' },

  // t02 (7.9s): Environment intro — title over map
  { turnId: 't02', offset: 0, kind: 'smarttext', text: 'ENVIRONMENT WRITES THE RULES', position: [0.5, 0.15], level: 'hero', color: '#f5e6c8', entrance: 'stamp' },
  { turnId: 't02', offset: 4, kind: 'smarttext', text: 'Same land. Totally different lives.', position: [0.5, 0.28], level: 'body', color: '#e8d5a8', entrance: 'fade' },

  // t01 (7.6s): Marcus intro — keep ThreeBoxes visible (he references them)
  { turnId: 't01', offset: 0, kind: 'smarttext', text: 'FOUR TOPICS · THREE BOXES', position: [0.5, 0.12], level: 'title', color: '#f5e6c8', entrance: 'stamp' },

  // t04/t06/t08: RegionMap handles labels (see component render)
  // t10 (12.6s): Never one culture
  { turnId: 't10', offset: 0, kind: 'gravity', text: 'NEVER ONE CULTURE', position: [0.5, 0.2], fontSize: 60, color: '#ff6b6b' },
  { turnId: 't10', offset: 6, kind: 'smarttext', text: 'The #1 mistake → picturing just one thing', position: [0.5, 0.32], level: 'body', color: '#f5e6c8', entrance: 'fade' },

  // t12 (10.2s): Trade — TradeRoutes handles the visual
  { turnId: 't12', offset: 0, kind: 'smarttext', text: 'TRADE NETWORKS', position: [0.5, 0.12], level: 'hero', color: '#c9a227', entrance: 'stamp' },

  // t16 (7.5s): Cahokia population
  { turnId: 't16', offset: 0, kind: 'smarttext', text: '10,000+ PEOPLE', position: [0.5, 0.15], level: 'hero', color: '#c9a227', entrance: 'stamp' },
  { turnId: 't16', offset: 4, kind: 'smarttext', text: 'Around 1100 CE', position: [0.5, 0.28], level: 'body', color: '#f5e6c8', entrance: 'fade' },

  // t17 (3.5s): Maya's St. Louis joke
  { turnId: 't17', offset: 0, kind: 'bubble', text: 'Lost in St. Louis once 😅', position: [0.3, 0.3], art: 'oval-hatched', width: 300, fontSize: 26 },

  // t18 (8.8s): Monk's Mound
  { turnId: 't18', offset: 0, kind: 'gravity', text: "MONK'S MOUND", position: [0.5, 0.18], fontSize: 56, color: '#f5e6c8' },
  { turnId: 't18', offset: 4, kind: 'smarttext', text: '100 ft tall · basketful by basketful', position: [0.5, 0.3], level: 'body', color: '#e8d5a8', entrance: 'fade' },

  // t19 (4s): Rivaled London — Maya's disbelief
  { turnId: 't19', offset: 0, kind: 'bubble', text: 'Rivaled London?! In 1100?!', position: [0.3, 0.3], art: 'oval-hatched', width: 320, fontSize: 28 },

  // t20 (13.7s): No wheels, no horses, no writing
  { turnId: 't20', offset: 0, kind: 'smarttext', text: 'RIVALED LONDON', position: [0.5, 0.15], level: 'title', color: '#c9a227', entrance: 'stamp' },
  { turnId: 't20', offset: 5, kind: 'smarttext', text: '✗ wheels  ✗ horses  ✗ written language', position: [0.5, 0.28], level: 'body', color: '#ff6b6b', entrance: 'fade' },
  { turnId: 't20', offset: 9, kind: 'smarttext', text: '...and still built this', position: [0.5, 0.38], level: 'body', color: '#7fbf7f', entrance: 'fade' },

  // t21 (3.2s): They invented corn?
  { turnId: 't21', offset: 0, kind: 'bubble', text: 'They invented corn?? From scratch?', position: [0.3, 0.3], art: 'oval-hatched', width: 340, fontSize: 28 },

  // t22 (9.9s): Maize from grass
  { turnId: 't22', offset: 0, kind: 'smarttext', text: 'FROM A GRASS', position: [0.5, 0.15], level: 'hero', color: '#7fbf7f', entrance: 'stamp' },
  { turnId: 't22', offset: 5, kind: 'smarttext', text: 'Thousands of years of breeding', position: [0.5, 0.28], level: 'body', color: '#f5e6c8', entrance: 'fade' },

  // t24 (7.2s): Why Cahokia fell
  { turnId: 't24', offset: 0, kind: 'smarttext', text: 'WHY DID IT FALL?', position: [0.5, 0.15], level: 'hero', color: '#999', entrance: 'fade' },
  { turnId: 't24', offset: 4, kind: 'smarttext', text: 'A real mystery', position: [0.5, 0.28], level: 'body', color: '#e8d5a8', entrance: 'fade' },

  // t23 (3.2s): Emptied out?
  { turnId: 't23', offset: 0, kind: 'smarttext', text: 'THEN IT EMPTIED OUT', position: [0.5, 0.2], level: 'hero', color: '#999', entrance: 'fade' },

  // t26 (14.1s): Archaeology — HERO text, use the space
  { turnId: 't26', offset: 0, kind: 'smarttext', text: 'THE MOUNDS ARE STILL THERE', position: [0.5, 0.2], level: 'hero', color: '#f5e6c8', entrance: 'stamp' },
  { turnId: 't26', offset: 6, kind: 'smarttext', text: 'Burials · trade goods · city layout', position: [0.5, 0.35], level: 'subtitle', color: '#c9a227', entrance: 'fade' },
  { turnId: 't26', offset: 10, kind: 'bg-swap', bgImage: 'historic/birdman_tablet.jpg' },

  // t27 (9.4s): Iroquois intro — title card
  { turnId: 't27', offset: 0, kind: 'smarttext', text: 'IROQUOIS CONFEDERACY', position: [0.5, 0.12], level: 'title', color: '#f5e6c8', entrance: 'stamp' },
  { turnId: 't27', offset: 5, kind: 'smarttext', text: 'Grand Council · consensus', position: [0.5, 0.25], level: 'body', color: '#c9a227', entrance: 'fade' },

  // t28 (13.1s): Five nations
  { turnId: 't28', offset: 0, kind: 'smarttext', text: 'FIVE NATIONS', position: [0.5, 0.15], level: 'title', color: '#f5e6c8', entrance: 'stamp' },
  { turnId: 't28', offset: 5, kind: 'smarttext', text: 'One Great Law of Peace', position: [0.5, 0.28], level: 'body', color: '#c9a227', entrance: 'fade' },
  { turnId: 't28', offset: 9, kind: 'bg-swap', bgImage: 'historic/six_nations_wampum_1871.jpg' },

  // t30 (21.2s): The longest turn — needs 3 beats
  { turnId: 't30', offset: 0, kind: 'bubble', text: 'Slowly. But it held for centuries.', position: [0.65, 0.25], art: 'oval-hatched', width: 340, fontSize: 26 },
  { turnId: 't30', offset: 7, kind: 'smarttext', text: 'IROQUOIS: confederacy', position: [0.3, 0.15], level: 'subtitle', color: '#f5e6c8', entrance: 'fade' },
  { turnId: 't30', offset: 7, kind: 'smarttext', text: 'PUEBLO: independent villages', position: [0.7, 0.15], level: 'subtitle', color: '#e8d5a8', entrance: 'fade' },
  { turnId: 't30', offset: 14, kind: 'smarttext', text: 'Same continent. Totally different governments.', position: [0.5, 0.3], level: 'body', color: '#c9a227', entrance: 'stamp' },

  // t32 (9.3s): Historians debate
  { turnId: 't32', offset: 0, kind: 'smarttext', text: 'DID IT INSPIRE THE U.S.?', position: [0.5, 0.15], level: 'title', color: '#f5e6c8', entrance: 'fade' },
  { turnId: 't32', offset: 5, kind: 'smarttext', text: 'Historians disagree', position: [0.5, 0.28], level: 'body', color: '#c9a227', entrance: 'fade' },

  // t31 (4.7s): Federalism debate
  { turnId: 't31', offset: 0, kind: 'bubble', text: 'Did the Iroquois inspire US federalism?', position: [0.5, 0.2], art: 'oval-hatched', width: 380, fontSize: 26 },

  // t33 (14.2s): Pristine wilderness myth
  { turnId: 't33', offset: 0, kind: 'smarttext', text: 'PRISTINE WILDERNESS?', position: [0.5, 0.15], level: 'title', color: '#e8d5a8', entrance: 'fade' },
  { turnId: 't33', offset: 7, kind: 'bubble', text: "I'm SURE about this one 😤", position: [0.3, 0.35], art: 'oval-hatched', width: 280, fontSize: 26 },

  // t34 (6.5s): Half holds — farming is where it starts
  { turnId: 't34', offset: 0, kind: 'smarttext', text: 'The "no trace" part falls apart', position: [0.5, 0.2], level: 'subtitle', color: '#ff9a3c', entrance: 'fade' },
  { turnId: 't34', offset: 3.5, kind: 'smarttext', text: 'Farming is where it STARTS', position: [0.5, 0.32], level: 'body', color: '#7fbf7f', entrance: 'stamp' },

  // t35 (4.8s): Planting corn vs clear-cutting
  { turnId: 't35', offset: 0, kind: 'bubble', text: 'Corn ≠ clear-cutting, right?', position: [0.3, 0.3], art: 'oval-hatched', width: 320, fontSize: 26 },

  // t36 (7.6s): Controlled burns
  { turnId: 't36', offset: 0, kind: 'smarttext', text: 'CONTROLLED BURNS 🔥', position: [0.5, 0.18], level: 'title', color: '#ff9a3c', entrance: 'stamp' },
  { turnId: 't36', offset: 4, kind: 'smarttext', text: 'Clear brush · flush game · make fields', position: [0.5, 0.3], level: 'body', color: '#f5e6c8', entrance: 'fade' },

  // t37 (3.1s): Landscaping!
  { turnId: 't37', offset: 0, kind: 'bubble', text: "That's not harmony. That's LANDSCAPING.", position: [0.3, 0.3], art: 'oval-hatched', width: 380, fontSize: 28 },

  // t38 (14.2s): Cronon
  { turnId: 't38', offset: 0, kind: 'smarttext', text: 'Changes in the Land', position: [0.5, 0.15], level: 'title', color: '#f5e6c8', entrance: 'fade' },
  { turnId: 't38', offset: 3, kind: 'smarttext', text: 'William Cronon · 1983', position: [0.5, 0.25], level: 'body', color: '#c9a227', entrance: 'fade' },
  { turnId: 't38', offset: 8, kind: 'smarttext', text: '"Wilderness" was already shaped by Native hands', position: [0.5, 0.35], level: 'body', color: '#e8d5a8', entrance: 'fade' },

  // t39 (7.3s): Europeans arrive to a shaped land
  { turnId: 't39', offset: 0, kind: 'smarttext', text: 'NOT EMPTY', position: [0.5, 0.15], level: 'title', color: '#7fbf7f', entrance: 'stamp' },
  { turnId: 't39', offset: 4, kind: 'smarttext', text: 'Shaped by Native hands for centuries', position: [0.5, 0.28], level: 'body', color: '#f5e6c8', entrance: 'fade' },

  // t40 (7s): The debate
  { turnId: 't40', offset: 0, kind: 'smarttext', text: 'PRISTINE?', position: [0.3, 0.2], level: 'title', color: '#888', entrance: 'fade' },
  { turnId: 't40', offset: 2, kind: 'smarttext', text: 'ENGINEERED.', position: [0.7, 0.2], level: 'title', color: '#c9a227', entrance: 'stamp' },

  // t41/t44/t47: ThreeBoxes handles the recap (see component render above)

  // t45 (7s): Villages tied by trade
  { turnId: 't45', offset: 0, kind: 'smarttext', text: 'LOOSELY TIED', position: [0.5, 0.15], level: 'title', color: '#e8d5a8', entrance: 'fade' },
  { turnId: 't45', offset: 3.5, kind: 'smarttext', text: 'Trade + ceremony, not government', position: [0.5, 0.28], level: 'body', color: '#f5e6c8', entrance: 'fade' },

  // t50 (10.3s): Quiz Q1
  { turnId: 't50', offset: 0, kind: 'smarttext', text: '✏️ Q1: Iroquois vs Pueblo — one big difference?', position: [0.5, 0.15], level: 'subtitle', color: '#f5e6c8', entrance: 'typewriter' },
  { turnId: 't50', offset: 5, kind: 'smarttext', text: '⏸️ Pause — say it out loud!', position: [0.5, 0.3], level: 'body', color: '#c9a227', entrance: 'fade' },

  // t52 (8.4s): Quiz A1
  { turnId: 't52', offset: 0, kind: 'smarttext', text: '✅ A1: Confederacy vs villages', position: [0.5, 0.15], level: 'subtitle', color: '#7fbf7f', entrance: 'stamp' },
  { turnId: 't52', offset: 4, kind: 'smarttext', text: 'Consensus council vs loose trade ties', position: [0.5, 0.28], level: 'body', color: '#f5e6c8', entrance: 'fade' },

  // t53 (3.1s): Quiz Q2
  { turnId: 't53', offset: 0, kind: 'smarttext', text: '✏️ Q2: What made Cahokia possible?', position: [0.5, 0.15], level: 'subtitle', color: '#f5e6c8', entrance: 'typewriter' },

  // t55 (5.7s): Quiz A2
  { turnId: 't55', offset: 0, kind: 'smarttext', text: '✅ A2: MAIZE', position: [0.5, 0.15], level: 'title', color: '#7fbf7f', entrance: 'stamp' },
  { turnId: 't55', offset: 3, kind: 'smarttext', text: 'Bred from teosinte · carried north', position: [0.5, 0.28], level: 'body', color: '#f5e6c8', entrance: 'fade' },

  // t56 (8.4s): Final check
  { turnId: 't56', offset: 0, kind: 'smarttext', text: 'CHECK YOUR THREE BOXES ✅', position: [0.5, 0.15], level: 'title', color: '#7fbf7f', entrance: 'stamp' },
  { turnId: 't56', offset: 4, kind: 'smarttext', text: 'Next: why Europe sailed west', position: [0.5, 0.28], level: 'body', color: '#c9a227', entrance: 'fade' },
];

/** Background image per turn — REAL historical images.
 * Act 2 (t02-t10) uses RegionMap overlay, so background is dimmed. */
const getBackgroundForTurn = (turnId: string | null, subBeatBg: string | null): string => {
  if (subBeatBg) return subBeatBg;
  if (!turnId) return 'historic/debry_secoton_1590.jpg';
  if (['t00'].includes(turnId)) return 'historic/stradanus_america_1600.jpg';
  // Act 2: RegionMap provides the visual, background is just a dim base
  if (['t01','t02','t03','t04','t05','t06','t07','t08','t09','t10'].includes(turnId)) return 'historic/stradanus_america_1600.jpg';
  if (['t11','t12','t13','t14'].includes(turnId)) return 'historic/ortelius_america_1570.jpg';
  if (['t15','t16','t17','t18','t19','t20'].includes(turnId)) return 'historic/cahokia_aerial_roe.jpg';
  if (['t21','t22'].includes(turnId)) return 'historic/fuchs_maize_1542.jpg';
  if (['t23','t24','t25'].includes(turnId)) return 'historic/cahokia_decline_aerial.jpg';
  if (['t26'].includes(turnId)) return 'historic/cahokia_aerial_roe.jpg';
  if (['t27','t28','t29'].includes(turnId)) return 'historic/debry_pomeiooc_1590.jpg';
  if (['t30','t31','t32'].includes(turnId)) return 'historic/six_nations_wampum_1871.jpg';
  if (['t33','t34','t35'].includes(turnId)) return 'historic/stradanus_wilderness_crop.jpg';
  if (['t36','t37'].includes(turnId)) return 'historic/debry_deer_hunting_1591.jpg';
  if (['t38','t39','t40'].includes(turnId)) return 'historic/debry_secoton_1590.jpg';
  return 'historic/debry_secoton_1590.jpg';
};

export const U1E1Episode: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const timeSec = frame / fps;

  // Find active turn
  let activeIndex = -1;
  for (let i = 0; i < turns.length; i++) {
    const start = starts[i];
    const end = start + durations[i];
    if (timeSec >= start && timeSec < end) {
      activeIndex = i;
      break;
    }
  }

  const activeTurn = activeIndex >= 0 ? turns[activeIndex] : null;
  const activeStartFrame = activeIndex >= 0 ? Math.floor(starts[activeIndex] * fps) : 0;
  const turnElapsed = activeTurn ? timeSec - starts[activeIndex] : 0;

  // Find active sub-beats (those whose offset has passed)
  const activeSubBeats = activeTurn
    ? SUB_BEATS.filter(b => b.turnId === activeTurn.id && turnElapsed >= b.offset)
    : [];

  // Background swap from sub-beats takes priority
  const subBeatBg = activeSubBeats.find(b => b.kind === 'bg-swap')?.bgImage || null;
  const bgSrc = getBackgroundForTurn(activeTurn?.id || null, subBeatBg);

  // Ken Burns drift — background never static, continuous (no modulo jump)
  const kbProgress = frame / 1800;  // 60-second cycle, no discontinuity
  const kbScale = 1.05 + Math.sin(kbProgress * Math.PI * 2) * 0.03;
  const kbX = Math.sin(kbProgress * Math.PI * 2) * 20;
  const kbY = Math.cos(kbProgress * Math.PI * 2) * 12;

  // Talking head visible unless title card is showing (first 3s of t00)
  const showHead = activeTurn &&
    (activeTurn.speaker === 'maya' || activeTurn.speaker === 'marcus') &&
    !(activeTurn.id === 't00' && turnElapsed < 3);

  return (
    <ToneProvider tone="serious">
      <AutoLayoutProvider debug={false}>
        <AbsoluteFill style={{ backgroundColor: '#1a1512' }}>
          {/* Background: real historic image with Ken Burns drift */}
          <div style={{
            position: 'absolute',
            inset: -60,
            transform: `scale(${kbScale}) translate(${kbX}px, ${kbY}px)`,
          }}>
            <Img
              src={staticFile(bgSrc)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
            />
          </div>
          {/* Readability gradient — lighter for kids-friendly */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 40%, rgba(0,0,0,0.2) 100%)',
          }} />

          {/* Audio per turn — Sequence guarantees proper audio mixing */}
          {turns.map((turn, i) => {
            const startFrame = Math.floor(starts[i] * fps);
            const durationFrames = Math.max(1, Math.floor(durations[i] * fps));
            return (
              <Sequence key={`audio-${turn.id}`} from={startFrame} durationInFrames={durationFrames}>
                <Audio src={staticFile(`audio/u1e1/${turn.id}.mp3`)} />
              </Sequence>
            );
          })}

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

          {/* Title card for t00 */}
          {activeTurn?.id === 't00' && turnElapsed < 3 && (
            <TitleCard
              kicker="UNIT 1:"
              title="NATIVE AMERICAN SOCIETIES"
              subline="BEFORE COLUMBUS"
              at={activeStartFrame}
            />
          )}

          {/* ThreeBoxes for t00 — word-synced, fades out when pivoting to Cahokia */}
          {activeTurn?.id === 't00' && turnElapsed >= 3 && (
            <ThreeBoxes
              at={activeStartFrame}
              appearOffsets={[3.69, 4.74, 6.09]}
              fadeOutAt={10}
              position={[0.5, 0.5]}
            />
          )}
          {/* ThreeBoxes persist into t01 (Marcus references them) */}
          {activeTurn?.id === 't01' && (
            <ThreeBoxes
              at={activeStartFrame}
              appearOffsets={[0, 0, 0]}
              position={[0.5, 0.5]}
            />
          )}
          {activeTurn?.id === 't41' && (
            <ThreeBoxes at={activeStartFrame} checked={['maize']} position={[0.5, 0.5]} />
          )}
          {activeTurn?.id === 't44' && (
            <ThreeBoxes at={activeStartFrame} checked={['maize', 'iroquois']} position={[0.5, 0.5]} />
          )}
          {activeTurn?.id === 't47' && (
            <ThreeBoxes at={activeStartFrame} checked={['maize', 'iroquois']} crossed={['wilderness']} position={[0.5, 0.5]} />
          )}

          {/* RegionMap for Act 2 — word-anchored: southwest@0.66s (t04), plains@0.33s (t06) */}
          {['t02', 't03', 't04', 't05', 't06', 't07', 't08', 't09', 't10'].includes(activeTurn?.id || '') && (
            <RegionMap
              at={Math.floor(starts[2] * fps)}
              activeRegions={
                ['t02', 't03'].includes(activeTurn?.id || '') ? [] :
                ['t04', 't05'].includes(activeTurn?.id || '') ? ['southwest'] :
                ['t06', 't07'].includes(activeTurn?.id || '') ? ['southwest', 'plains'] :
                ['southwest', 'plains', 'northeast']
              }
              regionAppearFrames={{
                southwest: Math.floor(starts[4] * fps) + Math.floor(0.66 * fps),
                plains: Math.floor(starts[6] * fps) + Math.floor(0.33 * fps),
                northeast: Math.floor(starts[8] * fps),
              }}
            />
          )}

          {/* TradeRoutes for Act 3 — word-anchored: turquoise@3.45s, copper@7.53s (t12), shell@1.62s (t14) */}
          {['t12'].includes(activeTurn?.id || '') && (
            <TradeRoutes
              at={activeStartFrame}
              active={[]}
              routeTimings={{
                turquoise: activeStartFrame + Math.floor(3.45 * fps),
                copper: activeStartFrame + Math.floor(7.53 * fps),
              }}
            />
          )}
          {['t13', 't14'].includes(activeTurn?.id || '') && (
            <TradeRoutes
              at={activeStartFrame}
              active={['turquoise', 'copper']}
              routeTimings={{
                shell: activeStartFrame + Math.floor(1.62 * fps),
              }}
            />
          )}

          {/* Sub-beats */}
          {activeSubBeats.map((beat, idx) => {
            const beatFrame = activeStartFrame + Math.floor(beat.offset * fps);
            const key = `${beat.turnId}-${beat.offset}-${idx}`;

            if (beat.kind === 'smarttext' && beat.text) {
              return (
                <SmartText
                  key={key}
                  text={beat.text}
                  level={beat.level || 'title'}
                  position={beat.position || [0.5, 0.2]}
                  color={beat.color || '#f5e6c8'}
                  entrance={beat.entrance || 'fade'}
                  at={beatFrame}
                />
              );
            }
            if (beat.kind === 'callout' && beat.text) {
              return (
                <TextCallout
                  key={key}
                  text={beat.text}
                  position={beat.position || [0.5, 0.2]}
                  fontSize={beat.fontSize || 36}
                  color={beat.color || '#f5e6c8'}
                  entrance={beat.entrance || 'fade'}
                  at={beatFrame}
                />
              );
            }
            if (beat.kind === 'bubble' && beat.text) {
              return (
                <SpeechBubble
                  key={key}
                  text={beat.text}
                  position={beat.position || [0.5, 0.3]}
                  art={(beat.art as any) || 'oval-hatched'}
                  width={beat.width || 300}
                  fontSize={beat.fontSize || 28}
                  at={beatFrame}
                />
              );
            }
            if (beat.kind === 'gravity' && beat.text) {
              return (
                <GravityText
                  key={key}
                  text={beat.text}
                  landAt={beat.position || [0.5, 0.2]}
                  fontSize={beat.fontSize || 48}
                  color={beat.color || '#f5e6c8'}
                  at={beatFrame}
                  dropHeight={350}
                />
              );
            }
            return null;
          })}

          {/* Debug indicator */}
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
