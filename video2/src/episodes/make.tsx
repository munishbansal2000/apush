/**
 * One helper to wire an episode: compile it (refusing to render with errors) and produce the
 * full-length component plus a Short component. Episode modules stay a few lines long.
 */
import React from 'react';
import facts from '../../data/fact-registry.json';
import manifest from '../../data/images.json';
import imageLock from '../../data/images.lock.json';
import places from '../../data/places.json';
import config from '../../data/render-config.json';
import terms from '../../data/terms.json';
import type { TermsFile } from '../kit/derive';
import { assertRenderable, compileEpisode } from '../kit/episode';
import { EpisodeShell, type EpisodeShellProps } from '../kit/EpisodeShell';
import type { RenderConfig } from '../kit/layout';
import type { FactRegistry } from '../kit/lint-script';
import { ShortFrame } from '../kit/Shorts';
import type { EpisodeSpec, ResolvedChapter, TimingFile, TurnsFile, WordTimesFile } from '../kit/types';
import type { Manifest } from '../kit/validate';

export const renderConfig = config as unknown as RenderConfig;

export interface EpisodeData { turns: unknown; timing: unknown; wordTimes: unknown; levels: unknown }

export function buildEpisode(spec: EpisodeSpec, data: EpisodeData, seriesLabel: string) {
  const compiled = assertRenderable(
    compileEpisode(spec, {
      turns: data.turns as TurnsFile,
      timing: data.timing as TimingFile,
      wordTimes: data.wordTimes as WordTimesFile,
      config: renderConfig,
      terms: terms as TermsFile,
      facts: facts as unknown as FactRegistry,
    }),
  );
  const props: EpisodeShellProps = {
    episode: compiled,
    config: renderConfig,
    manifest: manifest as unknown as Manifest,
    wordTimes: data.wordTimes as WordTimesFile,
    places: places.places as unknown as Record<string, [number, number]>,
    levels: data.levels as Record<string, number[]>,
    imageSizes: imageLock as Record<string, { width: number; height: number }>,
  };
  const Full: React.FC = () => <EpisodeShell {...props} />;
  const Short: React.FC<{ chapter: ResolvedChapter }> = ({ chapter }) => <ShortFrame {...props} chapter={chapter} seriesLabel={seriesLabel} />;
  /** chapters rendered as vertical Shorts: every box chapter, plus any marked `short` */
  const shorts = compiled.chapters.filter(c => c.spec.box || c.spec.short);
  return { compiled, Full, Short, shorts };
}
