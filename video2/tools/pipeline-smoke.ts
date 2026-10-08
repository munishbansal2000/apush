/**
 * Smoke test wrapper over the REAL pipeline code.
 * Imports directly from pipeline-core.ts and exercises the actual functions.
 * No reimplementation, no parallel system.
 *
 * Usage: npx tsx tools/pipeline-smoke.ts
 */
import {readFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
import {
  parseTranscript,
  normalizeTurns,
  normalizePlan,
  validateCanvas,
  syncIssues,
  type DirectedPlan,
} from './pipeline-core';

const ROOT = join(__dirname, '..');
let failures = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failures++;
    console.log(`  ✗ ${name}: ${e instanceof Error ? e.message : e}`);
  }
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

// --- turns phase: real parseTranscript + normalizeTurns ---
console.log('[turns]');
const script = readFileSync(join(ROOT, '..', 'audio_scripts', 'unit3', 'apush-audio-u3-e1-script-v2-DRAFT.md'), 'utf8');
const turns = normalizeTurns(parseTranscript(script));
check('parses turns', () => {
  assert(turns.length > 60, `expected 60+ turns, got ${turns.length}`);
  assert(turns[0].id === 't00', 'first turn should be t00');
});
check('speech turns have speakers', () => {
  const speech = turns.filter(t => t.kind === 'speech');
  assert(speech.every(t => t.speaker === 'maya' || t.speaker === 'marcus'), 'all speech needs maya/marcus');
});

// --- direct phase: real normalizePlan with imageKeys + camera-term validation ---
console.log('[direct]');
const images = JSON.parse(readFileSync(join(ROOT, 'data', 'u3e1', 'images.json'), 'utf8'));
const imageKeys = Object.keys(images);

const goodPlan: DirectedPlan = {
  version: 1, episode: 'u3e1', title: 'Test',
  scenes: [
    {id: 's01', component: 'title', turnIds: ['t00'], props: {title: 'Hello'}, transition: 'cut'},
    {id: 's02', component: 'ken_burns', turnIds: ['t01'], props: {image: imageKeys[0]}, transition: 'cut'},
  ],
};
const starts = turns.map((_, i) => i * 10);
const durations = turns.map(() => 9);

check('accepts valid plan', () => {
  const plan = normalizePlan(goodPlan, turns.slice(0, 2), [0, 10], [9, 9], 20, {imageKeys, episode: 'u3e1'});
  assert(plan.scenes.length === 2, 'should have 2 scenes');
  assert(plan.scenes[0].startSec === 0, 'first scene starts at 0');
});

check('rejects invented image path', () => {
  const bad = JSON.parse(JSON.stringify(goodPlan));
  bad.scenes[1].props.image = 'historic/u3e1/invented-filename.jpg';
  try {
    normalizePlan(bad, turns.slice(0, 2), [0, 10], [9, 9], 20, {imageKeys});
    throw new Error('should have thrown');
  } catch (e) {
    assert((e as Error).message.includes('not in the images registry'), `wrong error: ${(e as Error).message}`);
  }
});

check('rejects duplicate scene ids', () => {
  const bad = JSON.parse(JSON.stringify(goodPlan));
  bad.scenes[1].id = 's01';
  try {
    normalizePlan(bad, turns.slice(0, 2), [0, 10], [9, 9], 20, {});
    throw new Error('should have thrown');
  } catch (e) {
    assert((e as Error).message.includes('duplicate scene id'), `wrong error: ${(e as Error).message}`);
  }
});

check('rejects bad transition', () => {
  const bad = JSON.parse(JSON.stringify(goodPlan));
  bad.scenes[0].transition = 'fade';
  try {
    normalizePlan(bad, turns.slice(0, 2), [0, 10], [9, 9], 20, {});
    throw new Error('should have thrown');
  } catch (e) {
    assert((e as Error).message.includes('invalid transition'), `wrong error: ${(e as Error).message}`);
  }
});

check('rejects camera term in creative_clip', () => {
  const plan: DirectedPlan = {
    version: 1, episode: 'u3e1', title: 'Test',
    scenes: [{id: 's01', component: 'creative_clip', turnIds: ['t00'], props: {image: imageKeys[0], prompt: 'A slow camera pan across the battlefield with subtle motion'}, transition: 'cut'}],
  };
  try {
    normalizePlan(plan, turns.slice(0, 1), [0], [9], 10, {allowCreativeClip: true});
    throw new Error('should have thrown');
  } catch (e) {
    assert((e as Error).message.includes('banned camera-move'), `wrong error: ${(e as Error).message}`);
  }
});

check('rejects highlightedPhrase not in excerptText', () => {
  const plan: DirectedPlan = {
    version: 1, episode: 'u3e1', title: 'Test',
    scenes: [{id: 's01', component: 'primary_source', turnIds: ['t00'], props: {
      documentTitle: 'Doc', authorAndDate: '1763', excerptText: 'some text here',
      highlightedPhrase: 'not in the text', hippType: 'H', hippExplanation: 'why',
    }, transition: 'cut'}],
  };
  try {
    normalizePlan(plan, turns.slice(0, 1), [0], [9], 10, {});
    throw new Error('should have thrown');
  } catch (e) {
    assert((e as Error).message.includes('highlightedPhrase'), `wrong error: ${(e as Error).message}`);
  }
});

// --- canvas validation ---
console.log('[canvas]');
check('validateCanvas warns on long title', () => {
  const plan: DirectedPlan = {
    version: 1, episode: 'u3e1', title: 'Test',
    scenes: [{id: 's01', component: 'title', turnIds: ['t00'], props: {title: 'X'.repeat(100)}, transition: 'cut', startSec: 0, endSec: 5}],
  };
  const warnings = validateCanvas(plan);
  assert(warnings.length > 0 && warnings[0].includes('overflow'), 'should warn on overflow');
});

// --- sync ---
console.log('[sync]');
check('syncIssues catches visual gap', () => {
  const plan = normalizePlan(goodPlan, turns.slice(0, 2), [0, 10], [9, 9], 20, {});
  plan.scenes[1].startSec! += 5; // create a gap
  const issues = syncIssues(plan, turns.slice(0, 2), [0, 10], [9, 9], 20);
  assert(issues.some(i => i.includes('gap') || i.includes('overlap')), 'should catch gap');
});

console.log(failures === 0 ? '\nAll smoke tests passed.' : `\n${failures} failures.`);
process.exit(failures === 0 ? 0 : 1);
