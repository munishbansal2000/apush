/**
 * Visual check for DirectedEpisode: renders stills of a fixture plan that uses every directed
 * component (plus the roadmap ribbon) and tiles them into out/verify/contact.png.
 *
 *   npx tsx tools/verify-render.ts
 *
 * Needs a working headless browser (Remotion downloads one on first run). Writes:
 *   out/verify/contact.png   tiled stills, labelled in contact.txt
 *   out/verify/layout.json   layout-guard findings captured from the browser log
 */
import {execFileSync} from 'node:child_process';
import {mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {ROOT} from './lib';

const outDir = join(ROOT, 'out', 'verify');
const sec = 4;
const scenes = [
  {component: 'title', props: {title: 'The Road to Revolution', kicker: 'Unit 3 · Episode 1', subline: '1763–1776'}},
  {component: 'ken_burns', props: {image: 'tallship-real.webp', title: 'Atlantic trade', caption: 'Ships carried the empire.'}},
  {component: 'quote', props: {quote: 'No taxation without representation.', byline: 'Colonial slogan, 1760s'}},
  {component: 'compare', props: {title: 'Two views of Parliament', left: {head: 'Britain', sections: [{sub: 'Claim', points: ['Virtual representation', 'Colonies must pay']}]}, right: {head: 'Colonists', sections: [{sub: 'Claim', points: ['Actual representation', 'Consent to taxes']}]}}},
  {component: 'causal_chain', props: {title: 'Why taxes rose', nodes: ['War debt', 'New taxes', 'Protest', 'Repeal']}},
  {component: 'highlight', props: {title: 'Key idea', body: 'Salutary neglect ended after 1763 when Britain tightened control.', highlights: [{text: 'Salutary neglect', note: 'hands-off rule'}]}},
  {component: 'primary_source', props: {documentTitle: 'Proclamation of 1763', authorAndDate: 'George III, 1763', excerptText: 'We do strictly forbid all our loving subjects from making any purchases or settlements whatever.', highlightedPhrase: 'strictly forbid', hippType: 'Purpose', hippExplanation: 'Keep settlers west of the Appalachians to avoid war.'}},
  {component: 'chart', props: {type: 'bar', title: 'British debt (millions of pounds)', data: [{label: '1756', value: 75}, {label: '1763', value: 133}]}},
  {component: 'spectrum', props: {title: 'Loyalty in 1776', axis: ['Loyalist', 'Patriot'], markers: [{label: 'Neutral', at: 0.5, color: 'gray'}, {label: 'Sons of Liberty', at: 0.9, color: 'red'}]}},
  {component: 'stagger', props: {title: 'Three boxes', panels: [{image: 'tallship-real.webp', label: 'Salutary neglect'}, {image: 'textures/parchment.jpg', label: 'Proclamation Line'}, {image: 'maya-real.webp', label: "Pontiac's Rebellion"}]}},
].map((scene, i) => ({id: `s${i}`, transition: i % 2 ? 'crossfade' : 'cut', roadmapIndex: Math.min(2, Math.floor(i / 4)), startSec: i * sec, endSec: (i + 1) * sec, turnIds: [], ...scene}));
const plan = {version: 1, episode: 'verify', title: 'Render check', roadmap: ['Salutary neglect', 'Proclamation Line', "Pontiac's Rebellion"], scenes};
const inputProps = {episode: 'verify', plan, turns: [], timing: {starts: [], durations: [], totalSec: scenes.length * sec}};

rmSync(outDir, {recursive: true, force: true});
mkdirSync(join(outDir, 'stills'), {recursive: true});
const browserExecutable = process.env.REMOTION_BROWSER ?? null;
console.log('[verify] bundling…');
const serveUrl = await bundle({entryPoint: join(ROOT, 'src/directed-index.tsx')});
const composition = await selectComposition({serveUrl, id: 'DirectedEpisode', inputProps, browserExecutable, logLevel: 'error'});
// Mid-scene for every component, plus frames just after each crossfade/cut boundary.
const samples = scenes.flatMap(scene => [
  {label: `${scene.id} ${scene.component} mid`, frame: Math.round((scene.startSec + sec / 2) * composition.fps)},
  {label: `${scene.id} ${scene.component} +6f`, frame: Math.round(scene.startSec * composition.fps) + 6},
]);
const logs: {label: string; frame: number; text: string}[] = [];
for (const [i, sample] of samples.entries()) {
  await renderStill({
    composition, serveUrl, inputProps, browserExecutable, logLevel: 'error', scale: 0.5, frame: sample.frame,
    output: join(outDir, 'stills', `${String(i).padStart(4, '0')}.png`),
    onBrowserLog: log => { if (/layout|guard|validation/i.test(log.text)) logs.push({...sample, text: log.text}); },
  });
  console.log(`[verify] ${sample.label} (frame ${sample.frame})`);
}
execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', join(outDir, 'stills', '%04d.png'), '-vf', `tile=4x${Math.ceil(samples.length / 4)}:padding=6:color=black`, '-frames:v', '1', join(outDir, 'contact.png')]);
writeFileSync(join(outDir, 'contact.txt'), samples.map((s, i) => `${String(i).padStart(4, '0')} ${s.label} frame=${s.frame}`).join('\n') + '\n');
writeFileSync(join(outDir, 'layout.json'), `${JSON.stringify(logs, null, 2)}\n`);
console.log(`[verify] ${samples.length} stills -> ${join(outDir, 'contact.png')} (${logs.length} layout log lines -> layout.json)`);
