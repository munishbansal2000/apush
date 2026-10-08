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
import { MapJourney, JourneyItem } from '../legacy/MapJourney';
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


const EP = 'u2e1';

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
  mapImage?: string;
  items?: JourneyItem[];
  caption?: string;
  variant?: 'overview' | 'detail' | 'dark';
  documentTitle?: string;
  authorAndDate?: string;
  excerptText?: string;
  highlightedPhrase?: string;
  hippType?: 'Historical Context' | 'Intended Audience' | 'Purpose' | 'Point of View';
  hippExplanation?: string;
}

const SUB_BEATS: SubBeat[] = [
  // t00: Opening — four boxes
  { turnId: 't00', offset: 2.0, kind: 'smarttext', text: 'FOUR WAYS TO WANT A CONTINENT', level: 'hero', position: [0.5, 0.25] },
  { turnId: 't00', offset: 12.0, kind: 'smarttext', text: '🇪🇸 SPAIN: extraction machine', level: 'subtitle', position: [0.5, 0.45] },
  { turnId: 't00', offset: 16.0, kind: 'smarttext', text: '🇫🇷 FRANCE: fur empire', level: 'subtitle', position: [0.5, 0.55] },
  { turnId: 't00', offset: 20.0, kind: 'smarttext', text: '🇳🇱 HOLLAND: company colony', level: 'subtitle', position: [0.5, 0.65] },
  { turnId: 't00', offset: 24.0, kind: 'smarttext', text: '🇬🇧 ENGLAND: settler play', level: 'subtitle', position: [0.5, 0.75] },

  // t02: Spain — quinto, encomienda
  { turnId: 't02', offset: 8.0, kind: 'smarttext', text: 'QUINTO: 20% OFF THE TOP', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't02', offset: 14.0, kind: 'smarttext', text: 'ENCOMIENDA', level: 'hero', position: [0.5, 0.45], entrance: 'stamp' },
  { turnId: 't02', offset: 18.0, kind: 'bubble', text: 'a whole town\'s labor for "protection"', position: [0.5, 0.6], width: 420 },

  // t04: Casta system
  { turnId: 't04', offset: 6.0, kind: 'smarttext', text: 'CASTA: GOVERNMENT BY GRANDPARENTS', level: 'title', position: [0.5, 0.2] },
  { turnId: 't04', offset: 12.0, kind: 'smarttext', text: 'peninsulares → criollos → mestizos → indios', level: 'body', position: [0.5, 0.5] },
  { turnId: 't04', offset: 22.0, kind: 'bg-swap', bgImage: 'historic/u2e1/casta-painting.jpg' },

  // t07: New Laws 1542
  { turnId: 't07', offset: 4.0, kind: 'smarttext', text: 'NEW LAWS OF 1542', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't07', offset: 10.0, kind: 'bubble', text: 'encomenderos rebelled, killed the viceroy', position: [0.5, 0.6], width: 400 },

  // t09: Box one check
  { turnId: 't09', offset: 16.0, kind: 'smarttext', text: '✅ BOX 1: SPAIN EXTRACTED', level: 'subtitle', position: [0.5, 0.8], color: '#7dd87d' },
  { turnId: 't09', offset: 4.0, kind: 'bg-swap', bgImage: 'historic/u2e1/potosi-mine.jpg' },

  // t11: France — beaver
  { turnId: 't11', offset: 1.0, kind: 'smarttext', text: 'BEAVER', level: 'hero', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't11', offset: 5.0, kind: 'bubble', text: 'felted into expensive status-symbol hats', position: [0.5, 0.6], width: 380 },
  { turnId: 't11', offset: 7.0, kind: 'bg-swap', bgImage: 'historic/u2e1/beaver-hat.jpg' },

  // t13: Champlain/Quebec 1608
  { turnId: 't13', offset: 2.0, kind: 'smarttext', text: 'QUEBEC 1608', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't13', offset: 6.0, kind: 'smarttext', text: 'trading post, NOT a colony of farms', level: 'body', position: [0.5, 0.5] },
  { turnId: 't13', offset: 10.0, kind: 'bg-swap', bgImage: 'historic/u2e1/champlain-quebec.jpg' },

  // t15: Coureurs de bois
  { turnId: 't15', offset: 2.0, kind: 'smarttext', text: 'COUREURS DE BOIS', level: 'title', position: [0.5, 0.2] },
  { turnId: 't15', offset: 6.0, kind: 'bubble', text: '"runners of the woods"', position: [0.5, 0.5], width: 320 },

  // t17: Fedora confession (fun beat)
  { turnId: 't17', offset: 6.0, kind: 'bubble', text: 'I own a beaver-felt fedora. Twelve bucks.', position: [0.5, 0.35], width: 400 },

  // t21: Wendat alliance
  { turnId: 't21', offset: 6.0, kind: 'smarttext', text: 'ALLIANCES OF CONVENIENCE', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't21', offset: 10.0, kind: 'smarttext', text: 'guns to the Wendat vs. the Iroquois', level: 'body', position: [0.5, 0.5] },

  // t23: Beaver Wars
  { turnId: 't23', offset: 2.0, kind: 'smarttext', text: 'BEAVER WARS 1640–1701', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },

  // t27: Four reasons France stayed thin
  { turnId: 't27', offset: 4.0, kind: 'smarttext', text: 'WHY SO EMPTY?', level: 'title', position: [0.5, 0.2] },
  { turnId: 't27', offset: 8.0, kind: 'smarttext', text: '1. Huguenots barred', level: 'body', position: [0.5, 0.4] },
  { turnId: 't27', offset: 12.0, kind: 'smarttext', text: '2. Seigneurs broke promises', level: 'body', position: [0.5, 0.5] },
  { turnId: 't27', offset: 16.0, kind: 'smarttext', text: '3. No assembly', level: 'body', position: [0.5, 0.6] },
  { turnId: 't27', offset: 20.0, kind: 'smarttext', text: '4. Fur needs no farmers', level: 'body', position: [0.5, 0.7] },

  // t31: Jesuit Relations correction
  { turnId: 't31', offset: 8.0, kind: 'primarysource',
    documentTitle: 'The Jesuit Relations',
    authorAndDate: 'French Jesuits, 1630s–1670s',
    excerptText: 'Detailed accounts of Wendat village life, written by missionaries living among them for years.',
    highlightedPhrase: 'most detailed European writing about Native life',
    hippType: 'Point of View',
    hippExplanation: 'Written by French allies, not neutral observers — but proves how close the French lived to their partners.' },
  { turnId: 't31', offset: 8.0, kind: 'bg-swap', bgImage: 'historic/u2e1/jesuit-mission.jpg' },

  // t33: Box two check
  { turnId: 't33', offset: 10.0, kind: 'smarttext', text: '✅ BOX 2: FRANCE — FUR, THIN, ALLIED', level: 'subtitle', position: [0.5, 0.8], color: '#7dd87d' },

  // t35: Dutch patroons 1629
  { turnId: 't35', offset: 4.0, kind: 'smarttext', text: '1629: SHIP 50, GET 16 MILES', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't35', offset: 10.0, kind: 'smarttext', text: 'PATROON = lord of the manor', level: 'body', position: [0.5, 0.5] },

  // t37: New Amsterdam
  { turnId: 't37', offset: 8.0, kind: 'bg-swap', bgImage: 'historic/u2e1/new-amsterdam-1660.jpg' },
  { turnId: 't37', offset: 10.0, kind: 'bubble', text: 'a jumble of languages on the docks', position: [0.5, 0.3], width: 380 },

  // t39: Flushing Remonstrance 1657
  { turnId: 't39', offset: 4.0, kind: 'primarysource',
    documentTitle: 'The Flushing Remonstrance',
    authorAndDate: 'English settlers, New Netherland, 1657',
    excerptText: 'Petition to Stuyvesant demanding Quaker worship be allowed.',
    highlightedPhrase: 'earliest demand for religious tolerance',
    hippType: 'Historical Context',
    hippExplanation: 'A company town needed customers more than conformity — diversity served the trade.' },

  // t41: 1664 surrender
  { turnId: 't41', offset: 2.0, kind: 'smarttext', text: '1664: SURRENDERED WITHOUT A SHOT', level: 'title', position: [0.5, 0.25], entrance: 'stamp' },
  { turnId: 't41', offset: 8.0, kind: 'smarttext', text: 'New Amsterdam → New York', level: 'subtitle', position: [0.5, 0.5] },

  // t45: Box three check
  { turnId: 't45', offset: 12.0, kind: 'smarttext', text: '✅ BOX 3: HOLLAND — COMPANY, PATROONS, SOLD', level: 'subtitle', position: [0.5, 0.8], color: '#7dd87d' },

  // t47: England — families
  { turnId: 't47', offset: 2.0, kind: 'smarttext', text: 'FAMILIES, NOT JUST FORTUNES', level: 'title', position: [0.5, 0.25] },
  { turnId: 't47', offset: 8.0, kind: 'bg-swap', bgImage: 'historic/u2e1/jamestown.jpg' },

  // t51: Headright
  { turnId: 't51', offset: 2.0, kind: 'smarttext', text: 'HEADRIGHT: 50 ACRES A HEAD', level: 'title', position: [0.5, 0.2], entrance: 'stamp' },
  { turnId: 't51', offset: 6.0, kind: 'bubble', text: 'Who gets the land: worker or boss?', position: [0.5, 0.55], width: 360 },

  // t53: The boss
  { turnId: 't53', offset: 2.0, kind: 'smarttext', text: 'THE BOSS. NOT THE WORKER.', level: 'title', position: [0.5, 0.3], color: '#ff8a8a' },

  // t55: Collision line
  { turnId: 't55', offset: 4.0, kind: 'versus', text: 'Spain folded Natives IN vs England pushed them OFF' },
  { turnId: 't55', offset: 4.0, kind: 'smarttext', text: 'COLLIDE, DON\'T LIST', level: 'hero', position: [0.5, 0.2], entrance: 'stamp' },

  // t57: Box four check
  { turnId: 't57', offset: 8.0, kind: 'smarttext', text: '✅ BOX 4: ENGLAND — COMPANIES, FAMILIES, FARMS', level: 'subtitle', position: [0.5, 0.8], color: '#7dd87d' },

  // t59: Four boxes recap
  { turnId: 't59', offset: 2.0, kind: 'bg-swap', bgImage: 'historic/u2e1/colonial-map.jpg' },
  { turnId: 't59', offset: 4.0, kind: 'smarttext', text: '🇪🇸 souls + silver → 🇫🇷 fur + allies → 🇳🇱 company + patroons → 🇬🇧 families + farms', level: 'body', position: [0.5, 0.5] },

  // t62: Q1 Flushing
  { turnId: 't62', offset: 2.0, kind: 'smarttext', text: 'Q1: 1657 FLUSHING PETITION', level: 'title', position: [0.5, 0.2] },

  // t65: Q2 New France
  { turnId: 't65', offset: 2.0, kind: 'smarttext', text: 'Q2: WHY SO THIN?', level: 'title', position: [0.5, 0.2] },

  // t68: Q3 comparison
  { turnId: 't68', offset: 2.0, kind: 'smarttext', text: 'Q3: COLLIDE, DON\'T LIST', level: 'title', position: [0.5, 0.2] },

  // t71: Fast bonus
  { turnId: 't71', offset: 1.0, kind: 'smarttext', text: '⚡ FAST BONUS', level: 'title', position: [0.5, 0.2], color: '#ffd700' },
  { turnId: 't71', offset: 3.0, kind: 'bubble', text: '1629 charter, feudal estates, 50 settlers — which empire?', position: [0.5, 0.5], width: 400 },
];

/* ------------------------------------------------------------------ */
/* Background selector                                                  */
/* ------------------------------------------------------------------ */
function getBackgroundForTurn(turnId: string | null, subBeatBg: string | null): string {
  if (subBeatBg) return subBeatBg;
  if (!turnId) return 'historic/u2e1/colonial-map.jpg';
  const n = parseInt(turnId.slice(1), 10);
  // Spain section
  if (n <= 9) return 'historic/u2e1/potosi-mine.jpg';
  // France section
  if (n <= 33) return 'historic/u2e1/champlain-quebec.jpg';
  // Holland section
  if (n <= 45) return 'historic/u2e1/new-amsterdam-1660.jpg';
  // England section
  if (n <= 57) return 'historic/u2e1/jamestown.jpg';
  // Recap/questions
  return 'historic/u2e1/colonial-map.jpg';
}

/* ------------------------------------------------------------------ */
/* Main episode                                                         */
/* ------------------------------------------------------------------ */
export const U2E1Episode: React.FC<{ episodeData?: EpisodeData }> = ({ episodeData }) => {
  const data = React.useMemo(() => episodeData ?? loadEpisodeData('u2e1'), [episodeData]);
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

  // Tone: playful throughout (quiz-style), serious for casta/slavery mentions
  const isSeriousSection = activeTurn && (activeTurn.id === 't04' || activeTurn.id === 't55');

  const showHead = activeTurn &&
    (activeTurn.speaker === 'maya' || activeTurn.speaker === 'jay') &&
    !(activeTurn.id === 't00' && turnElapsed < 3);

  // TODO: Jay assets don't exist yet — using Marcus as placeholder
  const speakerAssets = (speaker: string) => {
    if (speaker === 'maya') {
      return {
        realistic: staticFile('maya-real.webp'),
        stylized: staticFile('maya-toon.webp'),
      };
    }
    // jay -> marcus placeholder
    return {
      realistic: staticFile('marcus-real.webp'),
      stylized: staticFile('maya-toon.webp'),
    };
  };

  const speakerName = (speaker: string) => {
    if (speaker === 'maya') return 'Maya';
    if (speaker === 'jay') return 'Jay';
    return speaker;
  };

  const speakerColor = (speaker: string) => {
    if (speaker === 'maya') return '#c9a227';
    if (speaker === 'jay') return '#2c8a5a';  // green for Jay
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
            <TitleCard kicker="UNIT 2 · EPISODE 1:"
              title="FOUR WAYS TO WANT A CONTINENT" subline="SPAIN · FRANCE · HOLLAND · ENGLAND" at={activeStartFrame} />
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

            if (beat.kind === 'mapjourney' && beat.items) {
              return <MapJourney key={key}
                at={beatFrame}
                mapImage={beat.mapImage || 'historic/u2e1/colonial-map.jpg'}
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
