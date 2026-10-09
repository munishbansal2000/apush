/** Stage orchestration for the resumable episode pipeline. */
import {existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {loadLessonReview} from './review';
import {ROOT} from '../lib';
import {atomicJson, checkFacts, sha256, type PipelineStage} from '../pipeline-core';
import {treeHash, type PipelineContext} from './context';
import {loadPronunciations} from './speech';
import {turnsStage} from './stages/turns';
import {pronounceStage} from './stages/pronounce';
import {audioInputHash, audioStage} from './stages/audio';
import {timingInputHash, timingStage} from './stages/timing';
import {wordsStage} from './stages/words';
import {imagesStage} from './stages/images';
import {docContactStage, docRenderStage, docResolve, docSyncIssues, generateClips} from './stages/doc';
import {buildStage, storyboardStage} from './stages/storyboard';

const TIMED_STAGES = new Set<PipelineStage>(['timing', 'words', 'storyboard', 'build', 'clips', 'contact', 'render']);

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

  // Images only need the script; everything after needs measured timing. Without a timed stage selected, stop here so
  // --only audio / --only images work on a fresh lesson.
  if (!stages.some(stage => TIMED_STAGES.has(stage))) {
    imagesStage(ctx, turns);
    console.log(`pipeline complete through: ${stages.join(', ')}`);
    return;
  }
  const timingHash = timingInputHash(ctx, audioHash);
  const timing = timingStage(ctx, turns, audioHash);
  if (ctx.estimateWords) console.log('[words] --estimate-words: no Vosk; phrase times estimated (preview only)');
  else wordsStage(ctx, turns, timing, timingHash);
  imagesStage(ctx, turns);
  if (stages.includes('storyboard')) storyboardStage(ctx);
  if (stages.includes('build')) buildStage(ctx);
  if (!stages.some(stage => stage === 'clips' || stage === 'contact' || stage === 'render')) {
    console.log(`pipeline complete through: ${stages.join(', ')}`);
    return;
  }
  if (dryRun) {
    for (const stage of ['clips', 'contact', 'render'] as const) if (stages.includes(stage)) console.log(`[${stage}] dry-run`);
    console.log(`pipeline complete through: ${stages.join(', ')}`);
    return;
  }
  let {inputs, resolved} = docResolve(episode, ctx.draft, ctx.estimateWords);
  if (stages.includes('clips')) {
    if (ctx.videoGen === 'none') console.log('[clips] --video-gen none: clip shots show their still');
    else if (generateClips(episode, resolved, {force: ctx.force})) ({inputs, resolved} = docResolve(episode, ctx.draft, ctx.estimateWords));
  }
  const issues = docSyncIssues(episode, inputs);
  atomicJson(join(ctx.work, 'sync_report.json'), {episode, issues});
  if (issues.length) throw new Error(`audio/timing sync gate failed:\n${issues.map(i => `  - ${i}`).join('\n')}`);
  // Everything that changes pixels or sound: the plan as resolved (times, clips, depth), words, audio, and the renderer source.
  const visualHash = sha256(JSON.stringify({resolved, src: treeHash(join(ROOT, 'src'))}));
  const renderCtx = {episode, work: ctx.work, outDir: ctx.outDir, publicDir: ctx.publicDir, force: ctx.force};
  if (stages.includes('contact')) {
    if (ctx.current('contact', visualHash) && existsSync(join(ctx.outDir, `${episode}-contact.png`))) console.log('[contact] checkpoint current');
    else { await docContactStage(renderCtx, inputs, resolved); ctx.mark('contact', visualHash); }
  }
  if (stages.includes('render') && loadLessonReview(episode, dirname(ctx.dataDir)).render?.approved && existsSync(join(ctx.outDir, `${episode}.mp4`))) {
    console.log('[render] approved in review (frozen)');
  } else if (stages.includes('render')) {
    const renderHash = sha256(`${visualHash}:${audioHash}`);
    if (ctx.current('render', renderHash) && existsSync(join(ctx.outDir, `${episode}.mp4`))) console.log('[render] checkpoint current');
    else { await docRenderStage(renderCtx, inputs, resolved); ctx.mark('render', renderHash); }
  }
  console.log(`pipeline complete through: ${stages.join(', ')}${ctx.full ? '' : ' (use --full for the final video)'}`);
}
