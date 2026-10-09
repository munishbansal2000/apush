/** Stage orchestration for the resumable episode pipeline. */
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT} from '../lib';
import {checkFacts, sha256, type PipelineStage} from '../pipeline-core';
import {treeHash, type PipelineContext} from './context';
import {loadPronunciations} from './speech';
import {turnsStage} from './stages/turns';
import {pronounceStage} from './stages/pronounce';
import {audioInputHash, audioStage} from './stages/audio';
import {timingInputHash, timingStage} from './stages/timing';
import {wordsPathFor, wordsStage} from './stages/words';
import {imagesStage} from './stages/images';
import {directStage, planPathFor} from './stages/direct';
import {clipsStage} from './stages/clips';
import {ensureSync, remotion} from './stages/render';

const TIMED_STAGES = new Set<PipelineStage>(['timing', 'words', 'direct', 'clips', 'contact', 'render']);

/** Run the selected stages in order. */
export async function runPipeline(ctx: PipelineContext): Promise<void> {
  const {episode, stages, dryRun} = ctx;

  const turns = turnsStage(ctx);

  // Fact-registry check (non-blocking warnings)
  const factIssues = checkFacts(turns, join(ROOT, 'src', 'data', 'fact-registry.json'));
  for (const issue of factIssues) console.log(`  ⚠ FACT: ${issue}`);

  // Load after the pronounce stage so terms it adds apply to this run's audio.
  pronounceStage(ctx, turns);
  const PRONUNCIATIONS = loadPronunciations(ctx.pronunciationsPath);

  const audioHash = audioInputHash(ctx, turns, PRONUNCIATIONS);
  audioStage(ctx, turns, PRONUNCIATIONS);

  // Image research only needs turns; every other later stage needs measured timing.
  // Without one of those selected, skip loading timing so --only audio/images works on a fresh episode.
  if (!stages.some(stage => TIMED_STAGES.has(stage))) {
    imagesStage(ctx, turns);
    console.log(`pipeline complete through: ${stages.join(', ')}`);
    return;
  }
  const timingHash = timingInputHash(ctx, audioHash);
  const timing = timingStage(ctx, turns, audioHash);

  wordsStage(ctx, turns, timing, timingHash);
  imagesStage(ctx, turns);
  directStage(ctx, turns, timing);
  clipsStage(ctx, timing);

  const planPath = planPathFor(ctx);
  // Captions come from Vosk words, so a words-stage rerun must invalidate the contact/render checkpoints too.
  const wordsPath = wordsPathFor(ctx);
  const wordsSha = existsSync(wordsPath) ? sha256(readFileSync(wordsPath)) : '';
  if (stages.includes('contact')) {
    if (dryRun) console.log('[contact] dry-run');
    else {
      ensureSync(ctx, turns, timing);
      const h = sha256(`${readFileSync(planPath)}:${wordsSha}:${treeHash(join(ROOT, 'src'))}`);
      if (ctx.current('contact', h) && existsSync(join(ctx.outDir, `${episode}-contact.png`))) console.log('[contact] checkpoint current');
      else { await remotion(ctx, turns, timing, 'contact'); ctx.mark('contact', h); }
    }
  }
  if (stages.includes('render')) {
    if (dryRun) console.log('[render] dry-run');
    else {
      ensureSync(ctx, turns, timing);
      const h = sha256(`${readFileSync(planPath)}:${audioHash}:${wordsSha}:${treeHash(join(ROOT, 'src'))}`);
      if (ctx.current('render', h) && existsSync(join(ctx.outDir, `${episode}.mp4`))) console.log('[render] checkpoint current');
      else { await remotion(ctx, turns, timing, 'render'); ctx.mark('render', h); }
    }
  }
  console.log(`pipeline complete through: ${stages.join(', ')}${ctx.full ? '' : ' (use --full for the final video)'}`);
}
