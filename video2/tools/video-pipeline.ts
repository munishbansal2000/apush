/** Resumable transcript -> TTS -> timing -> images -> direction -> QA -> render pipeline. */
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT} from './lib';
import {checkFacts, sha256} from './pipeline-core';
import {createContext, treeHash} from './pipeline/context';
import {loadPronunciations} from './pipeline/speech';
import {turnsStage} from './pipeline/stages/turns';
import {pronounceStage} from './pipeline/stages/pronounce';
import {audioInputHash, audioStage} from './pipeline/stages/audio';
import {timingInputHash, timingStage} from './pipeline/stages/timing';
import {wordsStage} from './pipeline/stages/words';
import {imagesStage} from './pipeline/stages/images';
import {directStage, planPathFor} from './pipeline/stages/direct';
import {clipsStage} from './pipeline/stages/clips';
import {ensureSync, remotion} from './pipeline/stages/render';

const ctx = createContext();
const {episode, stages, dryRun} = ctx;

const turns = turnsStage(ctx);

// Fact-registry check (non-blocking warnings)
const factIssues = checkFacts(turns, join(ROOT, 'src', 'data', 'fact-registry.json'));
for (const issue of factIssues) console.log(`  ⚠ FACT: ${issue}`);

const PRONUNCIATIONS = loadPronunciations();
pronounceStage(ctx, turns);

const audioHash = audioInputHash(ctx, turns, PRONUNCIATIONS);
audioStage(ctx, turns, PRONUNCIATIONS);

const timingHash = timingInputHash(ctx, audioHash);
const timing = timingStage(ctx, turns, audioHash);

wordsStage(ctx, turns, timing, timingHash);
imagesStage(ctx, turns);
directStage(ctx, turns, timing);
clipsStage(ctx, timing);

const planPath = planPathFor(ctx);
if (stages.includes('contact')) {
  if (dryRun) console.log('[contact] dry-run');
  else {
    ensureSync(ctx, turns, timing);
    const h = sha256(`${readFileSync(planPath)}:${treeHash(join(ROOT, 'src'))}`);
    if (ctx.current('contact', h) && existsSync(join(ROOT, 'out', `${episode}-contact.png`))) console.log('[contact] checkpoint current');
    else { await remotion(ctx, turns, timing, 'contact'); ctx.mark('contact', h); }
  }
}
if (stages.includes('render')) {
  if (dryRun) console.log('[render] dry-run');
  else {
    ensureSync(ctx, turns, timing);
    const h = sha256(`${readFileSync(planPath)}:${audioHash}:${treeHash(join(ROOT, 'src'))}`);
    if (ctx.current('render', h) && existsSync(join(ROOT, 'out', `${episode}.mp4`))) console.log('[render] checkpoint current');
    else { await remotion(ctx, turns, timing, 'render'); ctx.mark('render', h); }
  }
}
console.log(`pipeline complete through: ${stages.join(', ')}${ctx.full ? '' : ' (use --full for the final video)'}`);
