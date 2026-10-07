/**
 * U1E3Episode — Unit 1 Episode 3: The Exchange.
 *
 * The Columbian Exchange: food went both ways, dying went one way.
 * Four boxes: inventory, disease, who won/paid, labor crisis.
 *
 * Tone arc: FUN (groceries, tomatoes, cowboy movies) → SERIOUS
 * (disease, 8/10 dead, Nahua account) → SOBERING (Middle Passage).
 *
 * 76 turns, ~716 seconds, 30fps.
 * Script: audio_scripts/unit1/apush-audio-u1-e3-script-v9-DRAFT.md (canonical)
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
import { MapJourney, JourneyItem } from './MapJourney';
import { PrimarySourceSpotlight } from './PrimarySourceSpotlight';
import { VersusPolarization } from './VersusPolarization';
import { ToneProvider } from '../validation/ToneContext';
import { AutoLayoutProvider } from '../validation/AutoLayout';

import turnsData from '../data/e3/turns.json';
import timingData from '../data/e3/timing_map.json';

interface Turn {
  id: string;
  speaker: string;
  text: string;
  duration_sec: number;
}

const turns = turnsData as Turn[];
const starts = (timingData as { starts: number[] }).starts;
const durations = (timingData as { durations: number[] }).durations;

const EP = 'u1e3';

/* ------------------------------------------------------------------ */
/* Sub-beats: timed visual events. offset = seconds into the turn.      */
/* All offsets from Vosk word_times.json (measured, never estimated).  */
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
  // MapJourney props
  mapImage?: string;
  items?: JourneyItem[];
  caption?: string;
  variant?: 'overview' | 'detail' | 'dark';
  // PrimarySource props
  documentTitle?: string;
  authorAndDate?: string;
  excerptText?: string;
  highlightedPhrase?: string;
  hippType?: 'Historical Context' | 'Intended Audience' | 'Purpose' | 'Point of View';
  hippExplanation?: string;
}

const SUB_BEATS: SubBeat[] = [
  // t00: Opening — "Last time: three Gs..." → THE EXCHANGE title (via TitleCard)
  { turnId: 't00', offset: 2.5, kind: 'smarttext', text: 'FOOD WENT BOTH WAYS', level: 'subtitle', position: [0.5, 0.65] },

  // t01: Westbound — wheat, sugarcane, animals
  // MapJourney: Europe → Americas (right to left on Atlantic map)
  { turnId: 't01', offset: 0, kind: 'mapjourney', mapImage: 'historic/u1e3/cantino-planisphere.jpg',
    items: [
      { id: 'wheat', content: '🌾', from: [750, 300], to: [250, 350], duration: 3, style: 'fly', size: 48 },
      { id: 'horse', content: '🐴', from: [750, 400], to: [250, 450], duration: 3.5, delay: 0.5, style: 'gallop', size: 56 },
      { id: 'pig', content: '🐷', from: [750, 500], to: [250, 550], duration: 4, delay: 1, style: 'fly', size: 48 },
    ],
    caption: 'WESTBOUND: Europe → Americas', variant: 'overview' },
  { turnId: 't01', offset: 1.0, kind: 'smarttext', text: 'WESTBOUND', level: 'title', position: [0.5, 0.15], entrance: 'stamp', color: '#ffd700' },

  // t02: "Wait. No horses? Cowboy movies are lying to me?" — fun, over wheat field (westbound)
  { turnId: 't02', offset: 0, kind: 'bg-swap', bgImage: 'historic/u1e3/wheat-field.jpg' },
  { turnId: 't02', offset: 0, kind: 'bubble', text: 'Cowboy movies lied to me?! 🤠', position: [0.5, 0.3], width: 380 },

  // t03: Native herds died out 10k years ago
  { turnId: 't03', offset: 0, kind: 'smarttext', text: '10,000 YEARS', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't03', offset: 2.0, kind: 'smarttext', text: 'NO HORSES', level: 'subtitle', position: [0.5, 0.35], color: '#ff6b6b' },

  // t04: Eastbound — maize, potatoes, tomatoes, tobacco
  { turnId: 't05', offset: 0, kind: 'mapjourney', mapImage: 'historic/u1e3/cantino-planisphere.jpg',
    items: [
      { id: 'maize', content: '🌽', from: [250, 350], to: [750, 300], duration: 3, style: 'fly', size: 48 },
      { id: 'potato', content: '🥔', from: [250, 450], to: [750, 400], duration: 3.5, delay: 0.5, style: 'fly', size: 56 },
      { id: 'tomato', content: '🍅', from: [250, 550], to: [750, 500], duration: 4, delay: 1, style: 'float', size: 48 },
    ],
    caption: 'EASTBOUND: Americas → Europe', variant: 'overview' },
  { turnId: 't05', offset: 1.0, kind: 'smarttext', text: 'EASTBOUND', level: 'title', position: [0.5, 0.15], entrance: 'stamp', color: '#90ee90' },

  // t06: Potato hero and time bomb — over Clusius 1583 botanical
  { turnId: 't06', offset: 0, kind: 'bg-swap', bgImage: 'historic/u1e3/potato-plant.jpg' },
  { turnId: 't06', offset: 0, kind: 'smarttext', text: '🥔 HERO', level: 'title', position: [0.5, 0.15], entrance: 'stamp' },
  { turnId: 't06', offset: 2.0, kind: 'smarttext', text: '💣 TIME BOMB', level: 'title', position: [0.5, 0.45], entrance: 'stamp', color: '#ff6b6b' },

  // t08: Tomato — "marinara sauce is an American import" — over botanical
  { turnId: 't08', offset: 0, kind: 'bg-swap', bgImage: 'historic/u1e3/tomato-plant.jpg' },
  { turnId: 't08', offset: 0, kind: 'bubble', text: 'My Sunday dinner is a lie 🍝', position: [0.5, 0.3], width: 380 },
  { turnId: 't08', offset: 3.0, kind: 'smarttext', text: 'NO TOMATOES IN ROME BEFORE 1492', level: 'body', position: [0.5, 0.5] },

  // t07: Europeans thought tomatoes were poisonous
  { turnId: 't12', offset: 0, kind: 'smarttext', text: '☠️ POISON?', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't12', offset: 2.5, kind: 'smarttext', text: 'NIGHTSHADE FAMILY', level: 'subtitle', position: [0.5, 0.35] },

  // t08: Comanche took the horse
  { turnId: 't15', offset: 0, kind: 'smarttext', text: 'THE COMANCHE', level: 'title', position: [0.5, 0.15], entrance: 'stamp' },
  { turnId: 't15', offset: 2.0, kind: 'smarttext', text: 'REBUILT THEIR WORLD AROUND THE HORSE', level: 'subtitle', position: [0.5, 0.3] },
  { turnId: 't15', offset: 4.0, kind: 'bg-swap', bgImage: 'historic/u1e2/comanche-horses.jpg' },

  // t09: "Tradition with a start date"
  { turnId: 't17', offset: 0, kind: 'smarttext', text: 'TRADITION WITH A START DATE', level: 'subtitle', position: [0.5, 0.25], entrance: 'fade' },

  // t18: Pigs went feral — over wild boar engraving
  { turnId: 't18', offset: 0, kind: 'bg-swap', bgImage: 'historic/u1e3/feral-pigs.jpg' },
  { turnId: 't18', offset: 0, kind: 'smarttext', text: '🐷 FERAL PIGS', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't18', offset: 2.0, kind: 'smarttext', text: 'OVERRAN THE SOUTHEAST', level: 'subtitle', position: [0.5, 0.35] },

  // t19: Maize to Africa and Asia — botanical behind the journey map
  { turnId: 't19', offset: 0, kind: 'bg-swap', bgImage: 'historic/u1e3/maize-botanical.jpg' },
  { turnId: 't19', offset: 0, kind: 'mapjourney', mapImage: 'historic/u1e3/cantino-planisphere.jpg',
    items: [
      { id: 'maize-africa', content: '🌽', from: [750, 400], to: [650, 600], duration: 3, style: 'fly', size: 48 },
      { id: 'maize-asia', content: '🌽', from: [750, 400], to: [900, 350], duration: 4, delay: 0.5, style: 'fly', size: 48 },
    ],
    caption: 'MAIZE: Europe → Africa → Asia', variant: 'overview' },

  // t12: Crosby 1972 names it
  { turnId: 't20', offset: 0, kind: 'smarttext', text: '1972', level: 'hero', position: [0.5, 0.2], entrance: 'stamp', color: '#ffd700' },
  { turnId: 't20', offset: 2.0, kind: 'smarttext', text: 'ALFRED CROSBY NAMES IT', level: 'subtitle', position: [0.5, 0.35] },
  { turnId: 't20', offset: 4.0, kind: 'smarttext', text: 'THE COLUMBIAN EXCHANGE', level: 'title', position: [0.5, 0.5], entrance: 'stamp' },

  // t13-t15: Box 1 — exam tip
  { turnId: 't23', offset: 0, kind: 'smarttext', text: '📦 BOX 1: THE INVENTORY', level: 'title', position: [0.5, 0.15], entrance: 'stamp' },
  { turnId: 't23', offset: 0, kind: 'smarttext', text: 'LIVESTOCK → WEST', level: 'subtitle', position: [0.5, 0.25], color: '#ffd700' },
  { turnId: 't23', offset: 1.5, kind: 'smarttext', text: 'CROPS → BOTH WAYS', level: 'subtitle', position: [0.5, 0.4], color: '#90ee90' },
  { turnId: 't25', offset: 0, kind: 'smarttext', text: '✓ CHECKING THAT ONE', level: 'subtitle', position: [0.5, 0.5], color: '#90ee90', entrance: 'stamp' },

  // === TONE SHIFT: DISEASE (SERIOUS) ===

  // t16: "The side that got the germs empties out"
  { turnId: 't28', offset: 0, kind: 'bg-swap', bgImage: 'historic/u1e3/disease-dark.jpg' },
  { turnId: 't28', offset: 0, kind: 'smarttext', text: 'THE GERMS SAILED WEST', level: 'title', position: [0.5, 0.2], entrance: 'stamp', color: '#ff6b6b' },

  // t17: Smallpox, measles, influenza — dark MapJourney (one way)
  { turnId: 't29', offset: 0, kind: 'mapjourney', mapImage: 'historic/u1e3/cantino-planisphere.jpg',
    items: [
      { id: 'smallpox', content: '🦠', from: [750, 300], to: [250, 350], duration: 4, style: 'ooze', size: 64, glow: '#ff0000' },
      { id: 'measles', content: '🦠', from: [750, 400], to: [250, 450], duration: 5, delay: 1, style: 'ooze', size: 56, glow: '#ff0000' },
    ],
    caption: 'DISEASE: One way only', variant: 'dark' },

  // t18: "Eight or nine out of ten"
  { turnId: 't30', offset: 0, kind: 'bg-swap', bgImage: 'historic/u1e3/smallpox-victims.jpg' },
  { turnId: 't30', offset: 0, kind: 'smarttext', text: '8 OR 9 OUT OF 10', level: 'hero', position: [0.5, 0.22], entrance: 'stamp', color: '#ff0000' },
  { turnId: 't30', offset: 2.5, kind: 'smarttext', text: 'NOT A WAR. AN ERASURE.', level: 'title', position: [0.5, 0.62], color: '#ff6b6b' },

  // t19: "Not a war. An erasure."


  // t20-t21: Virgin soil explanation — over Tenochtitlan (the emptied city)
  { turnId: 't33', offset: 0, kind: 'bg-swap', bgImage: 'historic/u1e3/tenochtitlan.jpg' },
  { turnId: 't33', offset: 0, kind: 'smarttext', text: 'VIRGIN SOIL', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't33', offset: 0, kind: 'bubble', text: 'That phrase bugs me...', position: [0.5, 0.3], width: 340 },

  // t22: Pushback — disease had help
  { turnId: 't34', offset: 0, kind: 'smarttext', text: 'DISEASE LED', level: 'subtitle', position: [0.5, 0.25] },
  { turnId: 't34', offset: 2.0, kind: 'smarttext', text: 'BUT DIDN\'T WORK ALONE', level: 'subtitle', position: [0.5, 0.4], color: '#ff6b6b' },

  // t23: "Disease was the real conquistador"
  { turnId: 't35', offset: 0, kind: 'smarttext', text: 'DISEASE WAS THE REAL CONQUISTADOR', level: 'title', position: [0.5, 0.25], entrance: 'stamp', color: '#ffd700' },

  // t24-t26: Florentine Codex — PrimarySourceSpotlight (HIPP)
  { turnId: 't37', offset: 0, kind: 'bg-swap', bgImage: 'historic/u1e3/florentine-codex-page.jpg' },
  { turnId: 't37', offset: 0, kind: 'primarysource',
    documentTitle: 'Florentine Codex',
    authorAndDate: 'Nahua accounts, 16th century',
    excerptText: 'The sick lay in their houses and sleeping places, no longer able to move or stir, while the healthy could not bury the dead fast enough.',
    highlightedPhrase: 'no longer able to move or stir',
    hippType: 'Point of View',
    hippExplanation: 'Nahua perspective — the conquered, not the conquerors. This is the view from inside the epidemic.' },

  // t27: Syphilis debate
  { turnId: 't40', offset: 0, kind: 'smarttext', text: 'SYPHILIS?', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't40', offset: 2.0, kind: 'smarttext', text: 'MAYBE SAILED EAST. DEBATED.', level: 'subtitle', position: [0.5, 0.35] },

  // Box 2 check
  { turnId: 't62', offset: 0, kind: 'smarttext', text: '📦 BOX 2: DISEASE', level: 'title', position: [0.5, 0.15], entrance: 'stamp' },
  { turnId: 't62', offset: 2.0, kind: 'smarttext', text: '✓ CHECKED', level: 'subtitle', position: [0.5, 0.3], color: '#90ee90' },

  // === LABOR CRISIS → MIDDLE PASSAGE ===

  // t29: Who won, who paid — VersusPolarization
  { turnId: 't45', offset: 0, kind: 'versus', text: 'EUROPE vs AMERICAS' },

  // t30: Europe vs Americas details
  { turnId: 't44', offset: 0, kind: 'smarttext', text: 'EUROPE: CALORIES + WEALTH', level: 'subtitle', position: [0.5, 0.25], color: '#90ee90' },
  { turnId: 't46', offset: 1.5, kind: 'smarttext', text: 'AMERICAS: PAID IN PEOPLE', level: 'subtitle', position: [0.5, 0.4], color: '#ff6b6b' },

  // t31: "Germs, then silver, then chains"
  { turnId: 't63', offset: 0, kind: 'smarttext', text: 'GERMS → SILVER → CHAINS', level: 'title', position: [0.5, 0.25], entrance: 'stamp', color: '#ffd700' },

  // t32: Middle Passage
  { turnId: 't54', offset: 0, kind: 'mapjourney', mapImage: 'historic/u1e3/cantino-planisphere.jpg',
    items: [
      { id: 'middle-passage', content: '⛓️', from: [650, 550], to: [250, 450], duration: 5, style: 'fly', size: 56, glow: '#ff0000' },
    ],
    caption: 'THE MIDDLE PASSAGE: Africa → Americas', variant: 'dark' },
  { turnId: 't55', offset: 0, kind: 'bg-swap', bgImage: 'historic/u1e3/brookes-slave-ship.jpg' },
  { turnId: 't57', offset: 0, kind: 'bg-swap', bgImage: 'historic/u1e3/sugarcane-plantation.jpg' },
  { turnId: 't57', offset: 0, kind: 'smarttext', text: 'STARTED WITH SUGAR', level: 'subtitle', position: [0.5, 0.2] },
  { turnId: 't57', offset: 2.0, kind: 'smarttext', text: '1500s', level: 'title', position: [0.5, 0.35], entrance: 'stamp' },

  // Box 3 & 4
  { turnId: 't64', offset: 0, kind: 'smarttext', text: '📦 BOX 3: WHO WON/PAID', level: 'title', position: [0.5, 0.15], entrance: 'stamp' },
  { turnId: 't65', offset: 0, kind: 'smarttext', text: '📦 BOX 4: LABOR CRISIS', level: 'title', position: [0.5, 0.15], entrance: 'stamp' },
  { turnId: 't65', offset: 2.0, kind: 'smarttext', text: '✓✓ CHECKED', level: 'subtitle', position: [0.5, 0.3], color: '#90ee90' },

  // === RECAP & EXAM ===

  // t36: Four boxes recap
  { turnId: 't58', offset: 0, kind: 'smarttext', text: 'FOUR BOXES', level: 'hero', position: [0.5, 0.2], entrance: 'stamp' },

  // Closing line
  { turnId: 't81', offset: 0, kind: 'smarttext', text: 'THE FOOD WENT BOTH WAYS', level: 'subtitle', position: [0.5, 0.3] },
  { turnId: 't81', offset: 2.0, kind: 'smarttext', text: 'AND THE DYING ONLY WENT ONE', level: 'title', position: [0.5, 0.45], entrance: 'stamp', color: '#ff6b6b' },
];

/* ------------------------------------------------------------------ */
/* Versus props for t29: who won, who paid                              */
/* ------------------------------------------------------------------ */
const VERSUS_E3 = {
  clashTitle: 'WHO WON? WHO PAID?',
  periodLabel: 'The Columbian Exchange',
  entityA: {
    name: 'EUROPE',
    subtitle: 'The winners',
    points: ['Calories: potatoes, maize', 'Wealth: silver, sugar', 'Population boom'],
    color: '#90ee90',
  },
  entityB: {
    name: 'THE AMERICAS',
    subtitle: 'The price',
    points: ['Paid in people', '8-9 out of 10 died', 'Labor crisis → Middle Passage'],
    color: '#ff6b6b',
  },
  verdictSummary: 'The food went both ways. The dying went one.',
};

/* ------------------------------------------------------------------ */
/* Background per turn                                                  */
/* ------------------------------------------------------------------ */
const getBackgroundForTurn = (turnId: string | null, subBeatBg: string | null): string => {
  if (subBeatBg) return subBeatBg;
  if (!turnId) return 'historic/u1e3/cantino-planisphere.jpg';
  const n = parseInt(turnId.slice(1), 10);
  if (n === 0) return 'historic/u1e3/cantino-planisphere.jpg';
  // Exchange inventory (fun)
  if (n <= 4) return 'historic/u1e3/cantino-planisphere.jpg';
  if (n <= 6) return 'historic/u1e2/potatoes.jpg';
  if (n <= 12) return 'historic/u1e3/cantino-planisphere.jpg';
  if (n <= 17) return 'historic/u1e2/comanche-horses.jpg';
  if (n === 19) return 'historic/u1e2/fuchs-maize-1542.jpg';
  if (n <= 26) return 'historic/u1e3/cantino-planisphere.jpg';
  // Disease section (serious)
  if (n <= 42) return 'historic/u1e3/disease-dark.jpg';
  // Who won / labor crisis
  if (n <= 51) return 'historic/u1e3/disease-dark.jpg';
  if (n === 52) return 'historic/u1e3/cantino-planisphere.jpg';
  if (n === 53) return 'historic/u1e3/brookes-slave-ship.jpg';
  if (n <= 55) return 'historic/u1e3/sugarcane-plantation.jpg';
  // Recap
  return 'historic/u1e3/cantino-planisphere.jpg';
};

/* ------------------------------------------------------------------ */
/* Main episode                                                         */
/* ------------------------------------------------------------------ */
export const U1E3Episode: React.FC = () => {
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

  // Tone: serious for disease section (t16+), playful before
  const isSeriousSection = activeTurn && parseInt(activeTurn.id.slice(1), 10) >= 16;

  const showHead = activeTurn &&
    (activeTurn.speaker === 'maya' || activeTurn.speaker === 'marcus') &&
    !(activeTurn.id === 't00' && turnElapsed < 3);

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
            <TitleCard kicker="UNIT 1 · EPISODE 3:"
              title="THE EXCHANGE" subline="FOOD WENT BOTH WAYS" at={activeStartFrame} />
          )}

          {/* Versus: who won, who paid (t29) */}
          {activeTurn?.id === 't29' && (
            <VersusPolarization
              clashTitle={VERSUS_E3.clashTitle}
              periodLabel={VERSUS_E3.periodLabel}
              entityA={VERSUS_E3.entityA}
              entityB={VERSUS_E3.entityB}
              verdictSummary={VERSUS_E3.verdictSummary}
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

            if (beat.kind === 'mapjourney' && beat.items) {
              return <MapJourney key={key}
                at={beatFrame}
                mapImage={beat.mapImage || 'historic/u1e2/tordesillas-map.jpg'}
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
