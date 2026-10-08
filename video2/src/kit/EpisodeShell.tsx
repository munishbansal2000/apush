/**
 * EpisodeShell: owns everything an episode must not re-implement.
 *   - active turn resolution (holds through gaps; pause turns get a prompt card)
 *   - audio: speech (ceil, never clipped), sound effects, music bed ducked under speech
 *   - heads: pair mode (speaker enlarged, audio-reactive) or the library TalkingHead
 *   - backgrounds: crossfades, tone grade, focus push-ins
 *   - every element mounted in <Sequence> (local frame) inside <Track> (runtime layout guard)
 *     with an entrance from the component and a shell-level exit, so nothing pops off
 *   - derived overlays: trap cards, timeline ribbon, key terms, chapter banners, box tracker,
 *     captions, credits
 *   - debug overlay and guard outlines only in Remotion Studio
 * Episode files are data: an EpisodeSpec plus generated JSON.
 */
import React, { useRef } from 'react';
import { AbsoluteFill, Audio, getRemotionEnvironment, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { captionChunks, type CaptionChunk } from './captions';
import {
  BackgroundSegment,
  BoxTracker,
  CaptionLine,
  DebugOverlay,
  ExchangeLedger,
  ImageCredit,
  PauseCard,
  Pictogram,
  RevealCard,
  Vignette,
} from './components';
import { chainPartOffsets, wordRevealOffsets } from './derive';
import { GUARD_WRAPPER, LayoutGuard, Track } from './guard';
import type { RenderConfig } from './layout';
import { AutoLayoutProvider, MapJourney, PrimarySourceSpotlight, SmartText, SpeechBubble, TalkingHead, TitleCard, ToneProvider, VersusPolarization } from './library';
import { ChainText, ChapterBanner, HeadPair, MusicBed, QuestionCard, RangeBar, RecapBoard, RouteMap, SfxLayer, StackCard, TermChipView, TimelineRibbon, TrapCard } from './overlays';
import { activeTurnAt, backgroundAt, duckAt, framesFor, headAssets, headTurnAt, isSpeaking, sectionAt, toFrame, visualFrames } from './timeline';
import { DocumentView, FigureCard, FilmGrain, KineticText, Pop, SweepTransition, TourView } from './media';
import type { CompiledEpisode, ResolvedBeat, SpeakerId, WordTimesFile } from './types';
import type { Manifest } from './validate';

export interface EpisodeShellProps {
  episode: CompiledEpisode;
  config: RenderConfig;
  manifest: Manifest;
  wordTimes: WordTimesFile;
  places: Record<string, [number, number]>;
  /** Real pixel sizes of images (data/images.lock.json), so documents keep their aspect. */
  imageSizes?: Record<string, { width: number; height: number }>;
  /** Per-turn audio level per frame (0..1), from tools/build-timing.ts. */
  levels: Record<string, number[]>;
  captions?: boolean;
  /** Shorts embed the shell without its own chrome/guard. */
  embedded?: boolean;
}

const EXIT_FRAMES = 8;

/** Shell-level exit: every element fades and drifts out over its last frames. */
const Exit: React.FC<{ frames: number; children: React.ReactNode }> = ({ frames, children }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [frames - EXIT_FRAMES, frames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // fade + slight settle toward the centre: never moves anything past its own rect
  return <div {...GUARD_WRAPPER} style={{ position: 'absolute', inset: 0, opacity: o, transform: `scale(${0.985 + 0.015 * o})` }}>{children}</div>;
};

/** Mount an element for [start, end): local frame, tracked, with an exit. */
const Timed: React.FC<{ id: string; role: React.ComponentProps<typeof Track>['role']; start: number; end: number; fps: number; children: React.ReactNode; allowOverlap?: boolean }> = ({ id, role, start, end, fps, children, allowOverlap }) => {
  const frames = visualFrames(start, end, fps);
  return (
    <Sequence from={toFrame(start, fps)} durationInFrames={frames} layout="none" name={id}>
      <Track id={id} role={role} allowOverlap={allowOverlap}>
        <Exit frames={frames}>{children}</Exit>
      </Track>
    </Sequence>
  );
};

/** Exhaustive beat renderer: adding a Beat kind without handling it fails to compile. */
/** Library stage components (map, source, versus) fill their parent; the shell gives them the stage. */
const InStage: React.FC<{ cfg: RenderConfig; children: React.ReactNode }> = ({ cfg, children }) => (
  <div {...GUARD_WRAPPER} style={{ position: 'absolute', left: `${cfg.stage[0] * 100}%`, top: `${cfg.stage[1] * 100}%`, width: `${(cfg.stage[2] - cfg.stage[0]) * 100}%`, height: `${(cfg.stage[3] - cfg.stage[1]) * 100}%` }}>
    {children}
  </div>
);

const BeatView: React.FC<{ beat: ResolvedBeat; ep: CompiledEpisode; cfg: RenderConfig; accent: string; wordTimes: WordTimesFile; places: Record<string, [number, number]>; keywords: Set<string>; manifest: Manifest; imageSizes: Record<string, { width: number; height: number }> }> = ({ beat, ep, cfg, accent, wordTimes, places, keywords, manifest, imageSizes }) => {
  switch (beat.kind) {
    case 'text':
      if (beat.text.includes('→')) {
        return <ChainText parts={beat.text.split('→').map(p => p.trim())} partOffsets={chainPartOffsets(beat, ep.timeline, wordTimes)} position={beat.position} level={beat.level} color={beat.color ?? accent} cfg={cfg} />;
      }
      return <SmartText text={beat.text} level={beat.level} position={beat.position} color={beat.color ?? accent} entrance={beat.entrance ?? 'fade'} at={0} />;
    case 'bubble':
      return (
        <Pop origin={beat.position}>
          <SpeechBubble text={beat.text} position={beat.position} width={beat.width ?? 380} at={0} />
        </Pop>
      );
    case 'tour':
      return (
        <TourView
          beat={beat}
          regionRect={id => manifest[beat.image]?.focus?.find(x => x.id === id)?.rect}
          imageAspect={imageSizes[beat.image] ? imageSizes[beat.image].width / imageSizes[beat.image].height : 16 / 9}
          cfg={cfg}
        />
      );
    case 'document':
      return (
        <DocumentView
          beat={beat}
          wordOffsets={docWordOffsets(beat, ep, wordTimes)}
          imageAspect={beat.image && imageSizes[beat.image] ? imageSizes[beat.image].width / imageSizes[beat.image].height : 4 / 3}
          cfg={cfg}
        />
      );
    case 'figure':
      return <FigureCard beat={beat} cfg={cfg} />;
    case 'map':
      return (
        <InStage cfg={cfg}>
          <MapJourney at={0} mapImage={beat.mapImage} items={beat.items} caption={beat.caption} variant={beat.variant} />
        </InStage>
      );
    case 'route':
      return <RouteMap beat={beat} places={places} cfg={cfg} />;
    case 'stack':
      return (
        <StackCard
          beat={beat}
          accent={accent}
          renderLine={it => {
            const color = it.color ?? accent;
            if (it.chain) {
              const pseudo = { ...beat, kind: 'text', text: it.text, level: it.level, position: [it.x, it.y], start: beat.start + it.offset, end: beat.start + it.endOffset } as unknown as ResolvedBeat;
              return <ChainText parts={it.text.split('→').map(p => p.trim())} partOffsets={chainPartOffsets(pseudo, ep.timeline, wordTimes)} position={[it.x, it.y]} level={it.level} color={color} cfg={cfg} />;
            }
            return <KineticText text={it.text} level={it.level} position={[it.x, it.y]} color={color} wordOffsets={it.wordOffsets} entrance={it.entrance} keywords={keywords} cfg={cfg} />;
          }}
        />
      );
    case 'board':
      return (
        <RecapBoard
          beat={beat}
          boxes={ep.meta.boxes}
          beatStart={beat.start}
          checkedAt={box => ep.boxEvents.find(e => e.box === box)?.time ?? null}
          cfg={cfg}
        />
      );
    case 'question':
      return <QuestionCard beat={beat} cfg={cfg} />;
    case 'range':
      return <RangeBar beat={beat} cfg={cfg} />;
    case 'source':
      return (
        <InStage cfg={cfg}>
        <PrimarySourceSpotlight
          documentTitle={beat.documentTitle}
          authorAndDate={beat.quoteStatus === 'paraphrase' ? `${beat.attribution} · paraphrased` : beat.attribution}
          excerptText={beat.excerpt}
          highlightedPhrase={beat.highlightedPhrase}
          hippType={beat.hippType}
          hippExplanation={beat.hippExplanation}
        />
        </InStage>
      );
    case 'versus':
      return (
        <InStage cfg={cfg}>
          <VersusPolarization clashTitle={beat.clashTitle} periodLabel={beat.periodLabel} entityA={beat.entityA} entityB={beat.entityB} verdictSummary={beat.verdictSummary} />
        </InStage>
      );
    case 'pictogram':
      return <Pictogram beat={beat} cfg={cfg} />;
    case 'ledger':
      return <ExchangeLedger beat={beat} cfg={cfg} />;
    case 'bg':
      return null; // rendered by the background layer
    default: {
      const _exhaustive: never = beat;
      return _exhaustive;
    }
  }
};

/** Document excerpts build at reading pace: synced to speech where the words are spoken. */
const docWordOffsets = (beat: ResolvedBeat, ep: CompiledEpisode, wordTimes: WordTimesFile): number[] => {
  if (beat.kind !== 'document') return [];
  const words = beat.excerpt.split(/\s+/);
  const synced = wordRevealOffsets(beat.excerpt, beat.turnIdx, beat.start, beat.end + 999, ep.timeline, wordTimes);
  // never faster than ~4 words/s, and done with 2s to read
  const paced = synced.map((v, i) => Math.max(v, 0.8 + i * 0.12));
  const last = paced[paced.length - 1] ?? 0;
  const budget = Math.max(1, beat.end - beat.start - 2);
  return last > budget ? paced.map(v => (v / last) * budget) : paced.slice(0, words.length);
};

/** Background "camera kick" on stamp hits: a 2% bump that decays over 0.4s. */
const kickAt = (ep: CompiledEpisode, t: number) => {
  let k = 0;
  for (const c of ep.sfx) {
    if (c.name !== 'hit') continue;
    const d = t - c.time;
    if (d >= 0 && d < 0.4) k = Math.max(k, Math.pow(1 - d / 0.4, 2) * 0.02);
  }
  return k;
};

const captionAt = (chunks: CaptionChunk[], t: number) => chunks.find(c => t >= c.start && t < c.end) ?? null;

export const EpisodeShell: React.FC<EpisodeShellProps> = ({ episode: ep, config: cfg, manifest, wordTimes, places, levels, imageSizes = {}, captions = true, embedded = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const rootRef = useRef<HTMLDivElement>(null);

  const chunks = React.useMemo(() => captionChunks(ep.timeline, wordTimes, cfg.captions.maxChars), [ep, wordTimes, cfg]);
  const active = activeTurnAt(ep.timeline, t);
  const section = sectionAt(ep.sections, t);
  const tone = cfg.tones[section.tone];
  const head = headTurnAt(ep.timeline, t);
  const inTitle = t >= ep.titleStart && t < ep.titleStart + cfg.titleCardSec;
  const bg = backgroundAt(ep.backgrounds, t);
  const bgEntry = bg ? manifest[bg.image] : undefined;
  const focus = bg?.focus ? bgEntry?.focus?.find(x => x.id === bg.focus) : undefined;
  const credit = bgEntry?.credit ? (focus?.label ? `${focus.label} · ${bgEntry.credit}` : bgEntry.credit) : undefined;
  const boxChapter = ep.chapters.find(c => c.spec.box && t >= c.start && t < c.end);
  const tracker = {
    boxes: ep.meta.boxes,
    checkedAt: ep.meta.boxes.map((_, i) => ep.boxEvents.find(e => e.box === i + 1)?.time ?? null),
    introAt: ep.boxIntro,
    current: boxChapter ? { box: boxChapter.spec.box!, progress: (t - boxChapter.start) / (boxChapter.end - boxChapter.start), since: boxChapter.start } : null,
    t,
  };
  const caption = captions ? captionAt(chunks, t) : null;
  const speakers = cfg.speakers as Record<SpeakerId, { name: string; color: string; real: string; toon: string }>;
  const music = cfg.music;
  const keywords = React.useMemo(
    () => new Set([...Object.keys(places), ...ep.terms.map(x => x.term)].flatMap(n => n.toLowerCase().split(/\s+/)).filter(w => w.length > 3)),
    [places, ep.terms],
  );
  const kick = kickAt(ep, t);

  return (
    <ToneProvider tone={tone.library}>
      <AutoLayoutProvider debug={false}>
        <AbsoluteFill ref={rootRef} data-kit-root style={{ backgroundColor: '#1a1512' }}>
          {/* Background: each segment crossfades over the previous one; focus segments push in */}
          {ep.backgrounds.map((seg, i) => (
            <Sequence key={`bg-${i}`} from={toFrame(seg.start, fps)} durationInFrames={framesFor(seg.start, (ep.backgrounds[i + 1]?.start ?? seg.end) + 0.5, fps)} layout="none">
              <Track id={`bg:${seg.sourceId}`} role="bg">
                <BackgroundSegment
                  seg={seg}
                  cfg={cfg}
                  kick={kick}
                  focusRect={seg.focus ? manifest[seg.image]?.focus?.find(x => x.id === seg.focus)?.rect : undefined}
                  imageAspect={imageSizes[seg.image] ? imageSizes[seg.image].width / imageSizes[seg.image].height : undefined}
                />
              </Track>
            </Sequence>
          ))}
          <Vignette />
          <Track id="bg:grain" role="bg">
            <FilmGrain />
          </Track>

          {/* Audio: speech (pause turns are silent), sound effects, music ducked under speech */}
          {ep.timeline.map(tt =>
            tt.turn.kind === 'speech' ? (
              <Sequence key={`a-${tt.turn.id}`} from={toFrame(tt.start, fps)} durationInFrames={framesFor(tt.start, tt.start + tt.dur, fps)} layout="none">
                <Audio src={staticFile(`audio/${ep.spec.id}/${tt.turn.id}.mp3`)} />
              </Sequence>
            ) : null,
          )}
          <SfxLayer cues={ep.sfx} cfg={cfg} />
          {music && (
            <MusicBed
              src={staticFile(music.file)}
              volumeAt={f => {
                const time = f / fps;
                const s = sectionAt(ep.sections, time);
                const base = music.volume[s.tone] ?? 0;
                const fade = Math.min(1, time / music.fadeSec, Math.max(0, (ep.totalSec - time) / music.fadeSec));
                return base * fade * duckAt(ep.timeline, time, music.duckTo);
              }}
            />
          )}

          {/* Beats */}
          {ep.beats.map(b =>
            b.kind === 'bg' ? null : (
              <Timed key={b.id} id={`beat:${b.id}`} role={['text', 'bubble', 'stack'].includes(b.kind) ? 'text' : 'stage'} start={b.start} end={b.end} fps={fps}>
                <BeatView beat={b} ep={ep} cfg={cfg} accent={tone.accent} wordTimes={wordTimes} places={places} keywords={keywords} manifest={manifest} imageSizes={imageSizes} />
              </Timed>
            ),
          )}

          {/* Derived overlays */}
          {ep.traps.map(tr => (
            <Timed key={`trap-${tr.trapIdx}`} id={`trap:${ep.timeline[tr.trapIdx].turn.id}`} role="overlay" start={tr.start} end={tr.end} fps={fps}>
              <TrapCard trap={tr} cfg={cfg} />
            </Timed>
          ))}
          {ep.terms.map(c => (
            <Timed key={`term-${c.term}`} id={`term:${c.term}`} role="overlay" start={c.start} end={c.end} fps={fps}>
              <TermChipView chip={c} cfg={cfg} />
            </Timed>
          ))}
          {ep.chapters.filter(c => c.spec.box).map(c => (
            <Timed key={`ch-${c.spec.label}`} id={`chapter:${c.spec.label}`} role="overlay" start={c.start} end={c.bannerEnd} fps={fps}>
              <ChapterBanner chapter={c} cfg={cfg} />
            </Timed>
          ))}
          {ep.pauseCards.map(c => (
            <React.Fragment key={`pc-${c.pauseIdx}`}>
              <Timed id={`pause:${ep.timeline[c.pauseIdx].turn.id}`} role="overlay" start={c.start} end={c.end} fps={fps}>
                <PauseCard card={c} cfg={cfg} />
              </Timed>
              <Timed id={`reveal:${ep.timeline[c.pauseIdx].turn.id}`} role="overlay" start={c.revealStart} end={c.revealEnd} fps={fps}>
                <RevealCard text={c.spec.reveal} cfg={cfg} />
              </Timed>
            </React.Fragment>
          ))}

          {/* Transitions at tone changes and box chapters */}
          {ep.transitions.map(at => (
            <Sequence key={`sw-${at}`} from={toFrame(at - 0.35, fps)} durationInFrames={Math.round(0.8 * fps)} layout="none">
              <Track id={`cover:sweep-${at.toFixed(1)}`} role="cover">
                <SweepTransition accent={cfg.tones[sectionAt(ep.sections, at + 0.1).tone].accent} />
              </Track>
            </Sequence>
          ))}

          {/* Chrome */}
          {!inTitle && !embedded && ep.meta.boxes.length > 0 && (
            <Track id="chrome:box-tracker" role="chrome">
              <BoxTracker state={tracker} cfg={cfg} />
            </Track>
          )}
          {!inTitle && ep.years.length > 0 && t >= ep.years[0].time - 0.3 && (
            <Track id="chrome:ribbon" role="chrome">
              <TimelineRibbon years={ep.years} t={t} cfg={cfg} />
            </Track>
          )}
          {!inTitle && !embedded && (
            <Track id="chrome:head" role="chrome">
              {cfg.heads.mode === 'pair' ? (
                <HeadPair
                  heads={(['maya', 'marcus'] as SpeakerId[]).map(id => ({ id, name: speakers[id].name, color: speakers[id].color, src: staticFile(speakers[id].toon) }))}
                  speaker={head?.turn.speaker ?? null}
                  level={head && isSpeaking(active, t) ? levels[head.turn.id]?.[frame - toFrame(head.start, fps)] ?? 0 : 0}
                  cfg={cfg}
                />
              ) : (
                head && (
                  <TalkingHead
                    key={`head-${head.turn.speaker}`}
                    {...headProps(cfg, head.turn.speaker)}
                    position="bottom-right"
                    size={cfg.head.size}
                    speaking={isSpeaking(active, t)}
                    showName
                    frameStyle="rounded"
                  />
                )
              )}
            </Track>
          )}
          {caption && !inTitle && (
            <Track id="chrome:captions" role="chrome">
              <CaptionLine words={caption.words} t={t} color={cfg.speakers[caption.speaker]?.color ?? '#fff'} cfg={cfg} />
            </Track>
          )}
          {credit && !inTitle && (
            <Track id="chrome:credit" role="chrome">
              <ImageCredit credit={credit} cfg={cfg} />
            </Track>
          )}

          <Sequence from={toFrame(ep.titleStart, fps)} durationInFrames={toFrame(cfg.titleCardSec, fps)} layout="none">
            <Track id="cover:title" role="cover">
              <TitleCard kicker={ep.spec.title.kicker} title={ep.spec.title.title} subline={ep.spec.title.subline} at={0} />
            </Track>
          </Sequence>

          {!embedded && <LayoutGuard cfg={cfg} rootRef={rootRef} />}
          {getRemotionEnvironment().isStudio && !embedded && (
            <DebugOverlay label={active ? `${active.turn.id} ${active.turn.kind === 'speech' ? active.turn.speaker : 'pause'} · ${section.tone} · ${t.toFixed(1)}s` : '—'} />
          )}
        </AbsoluteFill>
      </AutoLayoutProvider>
    </ToneProvider>
  );
};

const headProps = (cfg: RenderConfig, speaker: SpeakerId) => {
  const h = headAssets(cfg.speakers as Record<SpeakerId, { name: string; color: string; real: string; toon: string }>, speaker);
  return {
    speakerName: h.name,
    speakerColor: h.color,
    assetPair: { realistic: staticFile(h.realistic), stylized: staticFile(h.stylized) },
  };
};
