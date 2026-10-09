/**
 * Visual check for DirectedEpisode in the kit frame: renders stills of a fixture episode that uses every directed
 * component, the Episode Sheet (box intro/NOW/check cues), per-item reveals, captions, heads, and crossfades, then
 * tiles them into out/verify/contact.png.
 *
 *   npx tsx tools/verify-render.ts        (set REMOTION_BROWSER to a local headless Chrome if the download fails)
 *
 * Writes out/verify/contact.png (labelled in contact.txt) and out/verify/layout.json (layout-guard findings).
 */
import {execFileSync} from 'node:child_process';
import {mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {ROOT} from './lib';

const outDir = join(ROOT, 'out', 'verify');
const episode = 'verify';
const sec = 4;
const lines = [
  'Three boxes on your sheet: salutary neglect, the Proclamation Line, and Pontiac.',
  'Ships carried the empire across the Atlantic.',
  'Colonists shouted no taxation without representation.',
  'Britain claimed virtual representation; colonists wanted consent.',
  'War debt led to new taxes, then protest, then repeal.',
  'Box one, done. Salutary neglect ended after 1763.',
  'The Proclamation of 1763 forbade settlement past the mountains.',
  'British debt nearly doubled between 1756 and 1763.',
  'Loyalty ran from neutral to the Sons of Liberty.',
  'Checked. Three boxes: neglect, the line, and Pontiac.',
];
const scenes = [
  {component: 'title', props: {title: 'The Road to Revolution', kicker: 'Unit 3 · Episode 1', subline: '1763–1776'}},
  {component: 'ken_burns', props: {image: 'tallship-real.webp', title: 'Atlantic trade', caption: 'Ships carried the empire.'}},
  {component: 'quote', props: {quote: 'No taxation without representation.', byline: 'Colonial slogan, 1760s'}},
  {component: 'compare', props: {title: 'Two views of Parliament', left: {head: 'Britain', sections: [{sub: 'Claim', points: ['Virtual representation', 'Colonies must pay']}]}, right: {head: 'Colonists', sections: [{sub: 'Claim', points: ['Actual representation', 'Consent to taxes']}]}}, reveals: 2},
  {component: 'causal_chain', props: {title: 'Why taxes rose', nodes: ['War debt', 'New taxes', 'Protest', 'Repeal']}, reveals: 4},
  {component: 'highlight', props: {title: 'Key idea', body: 'Salutary neglect ended after 1763 when Britain tightened control.', highlights: [{text: 'Salutary neglect', note: 'hands-off rule'}]}, reveals: 1},
  {component: 'primary_source', props: {documentTitle: 'Proclamation of 1763', authorAndDate: 'George III, 1763', excerptText: 'We do strictly forbid all our loving subjects from making any purchases or settlements whatever.', highlightedPhrase: 'strictly forbid', hippType: 'Purpose', hippExplanation: 'Keep settlers west of the Appalachians to avoid war.'}, reveals: 2},
  {component: 'chart', props: {type: 'bar', title: 'British debt (millions of pounds)', data: [{label: '1756', value: 75}, {label: '1763', value: 133}]}, reveals: 2},
  {component: 'spectrum', props: {title: 'Loyalty in 1776', axis: ['Loyalist', 'Patriot'], markers: [{label: 'Neutral', at: 0.5, color: 'gray'}, {label: 'Sons of Liberty', at: 0.9, color: 'red'}]}, reveals: 2},
  {component: 'stagger', props: {title: 'Three boxes', panels: [{image: 'tallship-real.webp', label: 'Salutary neglect'}, {image: 'textures/parchment.jpg', label: 'Proclamation Line'}, {image: 'maya-real.webp', label: "Pontiac's Rebellion"}]}, reveals: 3},
].map(({reveals, ...scene}, i) => ({
  id: `s${i}`, transition: i % 2 ? 'crossfade' : 'cut', startSec: i * sec, endSec: (i + 1) * sec, ...scene,
  // Items appear one per second through the scene, as spoken cues would place them.
  ...(reveals ? {revealSec: Array.from({length: reveals}, (_, k) => i * sec + 0.5 + k * (2.8 / reveals))} : {}),
}));
const boxes = [
  {label: 'Salutary neglect', introSec: 1.2, checkSec: 20.6, startSec: 4, endSec: 24},
  {label: 'Proclamation Line', introSec: 1.8, checkSec: 36.3, startSec: 24, endSec: 32},
  {label: "Pontiac's Rebellion", introSec: 2.6, checkSec: 36.3, startSec: 32, endSec: 40},
];
const turns = lines.map((text, i) => ({id: `t${String(i).padStart(2, '0')}`, kind: 'speech' as const, speaker: i % 2 ? 'marcus' : 'maya', text}));
const timing = {starts: lines.map((_, i) => i * sec + 0.2), durations: lines.map(() => 3.4), totalSec: scenes.length * sec};
const words = Object.fromEntries(turns.map(turn => {
  const toks = turn.text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  return [turn.id, toks.map((w, k) => ({w, s: k * (3.2 / toks.length), e: (k + 0.8) * (3.2 / toks.length)}))];
}));
const levels = Object.fromEntries(turns.map(turn => [turn.id, Array.from({length: Math.ceil(3.4 * 30)}, (_, f) => Math.round((0.5 + 0.4 * Math.sin(f / 2)) * 100) / 100)]));
const plan = {version: 1, episode, title: 'Render check', boxes, scenes};
const inputProps = {episode, plan, turns, timing, words, levels};

rmSync(outDir, {recursive: true, force: true});
mkdirSync(join(outDir, 'stills'), {recursive: true});
// Short tones so <Audio> has real files to load (public/audio is gitignored).
const audioDir = join(ROOT, 'public', 'audio', episode);
mkdirSync(audioDir, {recursive: true});
for (const turn of turns) execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=220:duration=3.4', '-c:a', 'libmp3lame', join(audioDir, `${turn.id}.mp3`)]);

const browserExecutable = process.env.REMOTION_BROWSER ?? null;
console.log('[verify] bundling…');
const serveUrl = await bundle({entryPoint: join(ROOT, 'src/directed-index.tsx')});
const composition = await selectComposition({serveUrl, id: 'DirectedEpisode', inputProps, browserExecutable, logLevel: 'error'});
const f = (t: number) => Math.round(t * composition.fps);
const samples = [
  {label: 'sheet arrives as boxes are named', frame: f(2.0)},
  ...scenes.map(scene => ({label: `${scene.id} ${scene.component} mid`, frame: f(scene.startSec + sec / 2)})),
  {label: 's3 compare: left column only (before right cue)', frame: f(3 * sec + 1.2)},
  {label: 's4 chain: 2 of 4 nodes (cue-driven)', frame: f(4 * sec + 1.5)},
  {label: 'crossfade mid-blend s4 -> s5', frame: f(5 * sec) - 6},
  {label: 'box 1 check pop', frame: f(20.6) + 8},
  {label: 'boxes 2+3 checked: finale', frame: f(36.3) + 20},
];
const logs: {label: string; frame: number; text: string}[] = [];
for (const [i, sample] of samples.entries()) {
  await renderStill({
    composition, serveUrl, inputProps, browserExecutable, logLevel: 'error', scale: 0.5, frame: sample.frame,
    output: join(outDir, 'stills', `${String(i).padStart(4, '0')}.png`),
    onBrowserLog: log => { if (/kit-layout|layout-guard/.test(log.text)) logs.push({...sample, text: log.text}); },
  });
  console.log(`[verify] ${sample.label} (frame ${sample.frame})`);
}
execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', join(outDir, 'stills', '%04d.png'), '-vf', `tile=4x${Math.ceil(samples.length / 4)}:padding=6:color=black`, '-frames:v', '1', join(outDir, 'contact.png')]);
writeFileSync(join(outDir, 'contact.txt'), samples.map((s, i) => `${String(i).padStart(4, '0')} ${s.label} frame=${s.frame}`).join('\n') + '\n');
writeFileSync(join(outDir, 'layout.json'), `${JSON.stringify(logs, null, 2)}\n`);
console.log(`[verify] ${samples.length} stills -> ${join(outDir, 'contact.png')} (${logs.length} layout-guard reports -> layout.json)`);
