/**
 * Prototype: "The Columbian Exchange crossing" (~40 s). Motion-first: one world map, one
 * camera, and processes you can SEE — a ship crossing ON its cargo flow, the flow thickening
 * as cargo is named, disease riding along unseen and then spreading town to town, food
 * flowing back east.
 *
 * Narration + timing: tools/build-prototype.ts → src/data/prototype/exchange.json.
 * Ends on asymmetric flows (food both ways, death one way) — deliberately no "who won" scale.
 *
 * Layout zones (screen, inside the 5% safe area): top-left = date chip; right-middle = term
 * list; top-right = closing summary; bottom = caption. Every zone is a guard <Track>, and every
 * map label / ship / flow label is a [data-guard-item], so the runtime guard reports any
 * collision, cut or spill on any frame (tools/render.ts prints them).
 *
 * Sound (src/motion/sound.tsx): every cue is derived from the constant its visual uses —
 * creak on each sailing, whoosh as each flow draws, a tick per term, a thud per struck town,
 * a soft whoosh per camera move, a quiet whoosh per overlay <Slide>, and a music bed ducked
 * under the narration. Storyboard: src/data/storyboards/exchange-crossing.json.
 */
import React from 'react';
import { Audio, interpolate, Sequence, staticFile, useVideoConfig } from 'remotion';
import narration from '../data/prototype/exchange.json';
import { Track } from '../kit/guard';
import { MotionScene } from '../motion/MotionScene';
import { Clouds, FlowArc, Parallax, PlaceLabel, Ship, Slide, Spread, Stowaways, Swell, type Town } from '../motion/primitives';
import { cues, MusicBed, SoundTrack, useCues } from '../motion/sound';
import { World, useWorld, type CameraKey, type LonLat, type WorldSpec } from '../motion/world';
import { COLOR, FONT, MOTION, RADIUS, SAFE, SURFACE, TYPE } from '../theme/tokens';

/** Word times (seconds from the sentence's clip start), from tools/build-prototype.ts --word-times. */
interface Sentence { text: string; file: string; start: number; dur: number; words?: { w: string; s: number; e: number }[] }
const SENTENCES: Sentence[] = narration.sentences;
const S = SENTENCES.map(s => s.start);
const END = narration.totalSec;
export const EXCHANGE_FPS = 30;
export const EXCHANGE_FRAMES = Math.ceil(END * EXCHANGE_FPS);

const CADIZ: LonLat = [-6.29, 36.53];
const SANTO_DOMINGO: LonLat = [-69.9, 18.47];
const SEVILLE: LonLat = [-5.98, 37.39];

/** The three routes. Ships and flows on the same route share these exactly. */
const WEST = { from: CADIZ, to: SANTO_DOMINGO, bend: 0.3 };       // bows north
const EAST = { from: SANTO_DOMINGO, to: SEVILLE, bend: 0.3 };     // bows south
const DISEASE = { from: CADIZ, to: SANTO_DOMINGO, bend: 0 };      // straight, between the two

const FLOW = { west: COLOR.brown, east: COLOR.green, disease: COLOR.red };

const SPEC: WorldSpec = { extent: [[-125, -45], [35, 62]] };

const WEST_SAIL = { start: S[0] + 1.7, end: S[2] + 2.1 };
const EAST_SAIL = { start: S[4] + 0.6, end: S[5] + 1.5 };

const CAMERA: CameraKey[] = [
  { t: 0, center: [-6.5, 37.5], zoom: 3.4 },
  { t: S[0] + 2.7, center: [-14, 36], zoom: 2.6, ease: 3 },       // follow the departure
  { t: S[1], center: [-38, 29], zoom: 1.45, ease: 1.8 },            // whole crossing: cargo flow
  { t: S[2] - 0.2, center: [-64, 21], zoom: 2.6, ease: 1.8 },       // close on the ship: "invisible"
  { t: S[3] + 0.3, center: [-80, 10], zoom: 2.0, ease: 1.8 },       // Caribbean → Mexico → Andes
  { t: S[4], center: [-40, 26], zoom: 1.35, ease: 1.8 },            // food flows east
  { t: S[5], center: [-42, 24], zoom: 1.1, ease: 2.5 },             // pull back: the asymmetry
];

const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, '').replace(/^'+|'+$/g, '');

/**
 * When `word` (first occurrence) starts in sentence i, in scene seconds: measured word times
 * when the narration JSON has them, else an evenly-spaced estimate.
 */
const wordAt = (i: number, word: string): number => {
  const s = SENTENCES[i];
  const hit = s.words?.find(w => w.w === word);
  if (hit) return s.start + hit.s;
  const words = s.text.split(/\s+/);
  const k = words.findIndex(w => norm(w) === word);
  return s.start + (Math.max(0, k) / words.length) * s.dur;
};

const terms = (sentence: number, words: string[]) => words.map(w => ({ text: w.toUpperCase(), at: wordAt(sentence, w) }));
const WEST_TERMS = terms(1, ['wheat', 'sugarcane', 'horses', 'pigs', 'cattle']);
const DISEASE_TERMS = terms(3, ['smallpox', 'measles', 'influenza']);
const EAST_TERMS = terms(4, ['maize', 'potatoes', 'tomatoes', 'cacao', 'silver']);

/* Towns struck in the decades after contact. Label offsets are screen px, set per town so no two collide. */
const TOWNS: Town[] = [
  { name: 'Taíno villages', at: [-71.2, 19.4], label: { dx: -12, dy: -14, anchor: 'end' } },
  { name: 'San Juan', at: [-66.1, 18.47], label: { dx: 12, dy: 0, anchor: 'start' } },
  { name: 'Havana', at: [-82.38, 23.13], label: { dx: 0, dy: -17, anchor: 'middle' } },
  { name: 'Cartagena', at: [-75.5, 10.4], label: { dx: 12, dy: 0, anchor: 'start' } },
  { name: 'Panama', at: [-79.52, 8.98], label: { dx: -12, dy: 0, anchor: 'end' } },
  { name: 'Maya towns', at: [-89.6, 20.9], label: { dx: 0, dy: -17, anchor: 'middle' } },
  { name: 'Tenochtitlan', at: [-99.13, 19.43], label: { dx: 0, dy: 18, anchor: 'middle' } },
  { name: 'Quito', at: [-78.5, -0.2], label: { dx: 12, dy: 0, anchor: 'start' } },
];

/* Timed blocks: one constant each, shared by the visual and its sound cue. */
const WEST_FLOW = { start: S[1] - 0.2 };
const EAST_FLOW = { start: S[4] - 0.2 };
const DISEASE_FLOW = { start: S[5] + 1.6 };
const SPREAD = { origin: SANTO_DOMINGO, towns: TOWNS, start: S[3] + 1.8, perTown: 0.7 };

/* Screen overlays: entrance (`at`) and exit start (`out`) of each <Slide>. */
const SLIDE = MOTION.enter;
const CHIPS = [
  { text: 'AUTUMN 1493 · THE SECOND VOYAGE', at: 0.4, out: S[1] - 0.2 - SLIDE },
  { text: '1500s · THE CARIBBEAN AND BEYOND', at: S[3] + 0.4, out: S[4] - 0.2 - SLIDE },
];
const LISTS = [
  { heading: 'TO THE AMERICAS', items: WEST_TERMS, until: S[2] - 0.1, color: FLOW.west },
  { heading: 'UNSEEN CARGO', items: DISEASE_TERMS, until: S[4] - 0.2, color: FLOW.disease },
  { heading: 'TO EUROPE', items: EAST_TERMS, until: S[5] - 0.1, color: FLOW.east },
].map(l => ({ ...l, at: l.items[0].at - 0.15, out: l.until - SLIDE }));
const SUMMARY_AT = S[5] + 0.2;
const CAPTION_SLIDE = 0.4;
const CAPTIONS = SENTENCES.map(s => ({ text: s.text, at: s.start - 0.1, out: s.start + s.dur + 0.3 - CAPTION_SLIDE }));

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/* ------------------------------ screen-space overlays ------------------------------ */

/** Top-left date chip: slides in from the left, leaves left. */
const Chip: React.FC<{ text: string; at: number; out: number }> = ({ text, at, out }) => (
  <Slide at={at} from="left" out={out} dur={SLIDE}>
    <div style={{ position: 'absolute', left: SAFE.x, top: SAFE.y,
      background: COLOR.ink, color: COLOR.onNight, padding: '9px 18px', borderRadius: RADIUS.sm,
      fontFamily: FONT.display, fontSize: TYPE.chip, fontWeight: 700, letterSpacing: 3 }}>
      {text}
    </div>
  </Slide>
);

/**
 * Right-middle term list: one heading + items that land on their spoken word. One style for
 * every list. It opens with its first item (never empty) and sizes to its longest item
 * (hidden items still take their space, so the panel never resizes or spills).
 */
const TermList: React.FC<{ heading: string; items: { text: string; at: number }[]; at: number; out: number; color: string }> = ({ heading, items, at, out, color }) => (
  <Slide at={at} from="right" out={out} dur={SLIDE}>
    <TermPanel heading={heading} items={items} color={color} />
  </Slide>
);

const TermPanel: React.FC<{ heading: string; items: { text: string; at: number }[]; color: string }> = ({ heading, items, color }) => {
  const { t, fps } = useWorld();
  return (
    <div style={{ position: 'absolute', right: SAFE.x, top: 270, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 6,
      background: SURFACE.parchment.bg, border: `3px solid ${color}`, borderRadius: RADIUS.md, padding: '12px 20px', boxSizing: 'border-box' }}>
      <div style={{ fontFamily: FONT.text, fontSize: TYPE.small, fontWeight: 700, letterSpacing: 3, color, whiteSpace: 'nowrap' }}>{heading}</div>
      {items.map(w => {
        const p = interpolate(t, [w.at, w.at + 7 / fps], [0, 1], clamp);
        return (
          <div key={w.text} style={{ opacity: p, transform: `translateX(${(1 - p) * 18}px)`, display: 'flex', alignItems: 'center', gap: 10,
            fontFamily: FONT.text, fontWeight: 800, fontSize: TYPE.term, color: COLOR.ink, letterSpacing: 1, whiteSpace: 'nowrap' }}>
            <span style={{ width: 10, height: 10, borderRadius: RADIUS.pill, background: color, flex: 'none' }} />
            {w.text}
          </div>
        );
      })}
    </div>
  );
};

/** Bottom caption: the current sentence (accessibility + sound-off viewing); rises a little from below. */
const Caption: React.FC<{ text: string; at: number; out: number }> = ({ text, at, out }) => (
  <Slide at={at} from="down" out={out} dur={CAPTION_SLIDE} distance={80}>
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: SAFE.y, display: 'flex', justifyContent: 'center' }}>
      <div style={{ maxWidth: 980, background: SURFACE.night.bg, color: SURFACE.night.fg, padding: '11px 24px', borderRadius: RADIUS.md,
        fontFamily: FONT.ui, fontSize: TYPE.caption, lineHeight: 1.3, textAlign: 'center' }}>
        {text}
      </div>
    </div>
  </Slide>
);

/** Top-right closing summary, in the same colors as the flows it describes. */
const Asymmetry: React.FC = () => (
  <Slide at={SUMMARY_AT} from="up" dur={SLIDE}>
    <AsymmetryPanel />
  </Slide>
);

const AsymmetryPanel: React.FC = () => {
  const { t } = useWorld();
  const b = interpolate(t, [S[5] + 1.9, S[5] + 2.5], [0, 1], clamp);
  const row = (o: number, color: string, left: string, arrow: string, right: string) => (
    <div style={{ opacity: o, transform: `translateY(${(1 - o) * 12}px)`, display: 'flex', alignItems: 'center', gap: 12,
      fontFamily: FONT.text, fontWeight: 800, fontSize: TYPE.chip, color: COLOR.ink, letterSpacing: 1 }}>
      <span style={{ width: 120, textAlign: 'right' }}>{left}</span>
      <span style={{ color, fontSize: TYPE.chip * 1.4, width: 40, textAlign: 'center' }}>{arrow}</span>
      <span style={{ width: 120 }}>{right}</span>
    </div>
  );
  return (
    <div style={{ position: 'absolute', right: SAFE.x, top: SAFE.y, background: COLOR.halo, border: `3px solid ${COLOR.ink}`,
      borderRadius: RADIUS.md, padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {row(1, FLOW.east, 'FOOD', '⇄', 'FOOD')}
      {row(b, FLOW.disease, 'DISEASE', '→', 'AMERICAS')}
    </div>
  );
};

/* ------------------------------------- scene ------------------------------------- */

export const ExchangeCrossing: React.FC = () => {
  const { fps } = useVideoConfig();
  const summary: [number, number][] = [[S[5] + 0.4, END]];
  const sound = useCues(
    cues.ship(WEST_SAIL), cues.ship(EAST_SAIL),
    cues.flow(WEST_FLOW), cues.flow(EAST_FLOW), cues.flow(DISEASE_FLOW, 0.45),
    cues.list(WEST_TERMS), cues.list(DISEASE_TERMS), cues.list(EAST_TERMS),
    cues.spread(SPREAD),
    cues.camera(CAMERA),
    ...CHIPS.map(c => cues.slide(c)), ...LISTS.map(l => cues.slide(l)), cues.slide({ at: SUMMARY_AT }),
    ...CAPTIONS.map(c => cues.slide(c, { volume: 0.15 })),
  );
  return (
    <MotionScene>
      <MusicBed src="music/bed.mp3" duck={SENTENCES} />
      <SoundTrack cues={sound} />
      {SENTENCES.map(s => (
        <Sequence key={s.file} from={Math.floor(s.start * fps)} durationInFrames={Math.ceil((s.dur + 0.1) * fps)}>
          <Audio src={staticFile(s.file)} />
        </Sequence>
      ))}

      <Track id="world" role="cover">
      <World spec={SPEC} camera={CAMERA}>
        <Parallax depth={0.92}><Swell /></Parallax>

        {/* flows (under ships) — labels only in the closing summary */}
        <FlowArc {...WEST} color={FLOW.west} {...WEST_FLOW} growAt={WEST_TERMS.map(w => w.at)} label="CROPS & LIVESTOCK" labelWindows={summary} />
        <FlowArc {...EAST} color={FLOW.east} {...EAST_FLOW} growAt={EAST_TERMS.map(w => w.at)} label="CROPS & SILVER" labelWindows={summary} />
        <FlowArc {...DISEASE} color={FLOW.disease} {...DISEASE_FLOW} growAt={[]} maxWidth={30} label="DISEASE" labelU={0.42} labelWindows={[[S[5] + 2.0, END]]} />

        <Spread {...SPREAD} labelsUntil={S[4] - 0.6} />

        <PlaceLabel at={[-2.8, 41.6]} text="SPAIN" from={0.3} to={S[2]} dy={0} dot={false} />
        <PlaceLabel at={SANTO_DOMINGO} text="HISPANIOLA" from={S[1] + 1.6} to={S[3] - 0.3} dy={30} />

        <Ship {...WEST} {...WEST_SAIL} facesRight />
        <Stowaways {...WEST} {...WEST_SAIL} reveal={wordAt(2, 'invisible') - 0.3} />
        <Ship {...EAST} {...EAST_SAIL} facesRight />

        <Parallax depth={1.12}><Clouds /></Parallax>

        <Track id="date" role="chrome">
          {CHIPS.map(c => <Chip key={c.text} {...c} />)}
        </Track>
        <Track id="terms" role="overlay">
          {LISTS.map(l => <TermList key={l.heading} {...l} />)}
        </Track>
        <Track id="summary" role="overlay"><Asymmetry /></Track>
        <Track id="caption" role="text">{CAPTIONS.map(c => <Caption key={c.at} {...c} />)}</Track>
      </World>
      </Track>

    </MotionScene>
  );
};
