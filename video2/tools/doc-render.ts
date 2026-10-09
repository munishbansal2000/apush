/**
 * Render a documentary shot plan (docs/LOOK.md) for an episode that already has turns, audio, and timing.
 *
 *   npx tsx tools/doc-render.ts --episode u3e1 --plan data/u3e1/shots.sample.json --check   # validate only
 *   npx tsx tools/doc-render.ts --episode u3e1 --plan data/u3e1/shots.sample.json           # stills + MP4
 *   add --draft to allow library geography that is not approved yet (samples only)
 *   add --seconds 90 to render only the first 90 seconds
 *
 * Uses Vosk word timing (data/<ep>/word_times.json) when present; otherwise estimates phrase times inside each turn
 * (fine for a sample, refused by the production pipeline). Outputs out/<ep>-doc.mp4, out/<ep>-doc-contact.png.
 */
import {execFileSync} from 'node:child_process';
import {mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT, arg, flag} from './lib';
import {loadDocInputs, resolveDocPlan} from './pipeline/doc-inputs';
import {guardHeartbeat, layoutIssuesFromLog} from './pipeline/stages/render';

const episode = arg('episode') ?? (() => { throw new Error('--episode is required'); })();
const draft = flag('draft');
const inputs = loadDocInputs(episode, arg('plan') ?? join(ROOT, 'data', episode, 'shots.json'), draft);
const {turns, timing, estimated} = inputs;
const resolved = resolveDocPlan(inputs);
if (draft) console.log('[doc] DRAFT: unapproved library geography allowed (not for publishing)');
for (const s of resolved.shots) if (s.type === 'clip' && !s.clip) console.log(`[doc] ${s.id}: no LTX clip yet (run tools/doc-clips.ts on the GPU machine); showing the still`);
const lengths = resolved.shots.map(s => s.endSec - s.startSec);
console.log(`[doc] ${resolved.shots.length} shots over ${resolved.endSec.toFixed(1)}s; median shot ${[...lengths].sort((a, b) => a - b)[Math.floor(lengths.length / 2)].toFixed(1)}s, longest ${Math.max(...lengths).toFixed(1)}s${estimated ? ' (phrase times ESTIMATED: no Vosk word_times.json)' : ''}`);
for (const s of resolved.shots) {
  const tags = [('depth' in s && s.depth) ? 'parallax' : '', s.type === 'clip' && s.clip ? 'LTX clip' : '', ...(s.atmosphere ?? [])].filter(Boolean);
  console.log(`  ${s.id} ${s.startSec.toFixed(2)}-${s.endSec.toFixed(2)}s ${s.type}${'image' in s ? ` ${s.image}` : ''}${tags.length ? ` [${tags.join(', ')}]` : ''}`);
}
if (flag('check')) process.exit(0);

const {bundle} = await import('@remotion/bundler');
const {renderMedia, renderStill, selectComposition} = await import('@remotion/renderer');
const inputProps = {episode, shots: resolved.shots, years: resolved.years, boxes: resolved.boxes, turns, timing};
const browserExecutable = process.env.REMOTION_BROWSER ?? null;
console.log('[doc] bundling…');
const serveUrl = await bundle({entryPoint: join(ROOT, 'src/documentary-index.tsx')});
const composition = await selectComposition({serveUrl, id: 'DocEpisode', inputProps, browserExecutable, logLevel: 'error'});
const fps = composition.fps;
// --seconds N renders only the first N seconds (quick looks at a full-lesson plan).
const limitSec = arg('seconds') ? Number(arg('seconds')) : Infinity;
if (!(limitSec > 0)) throw new Error(`--seconds must be a positive number, got "${arg('seconds')}"`);
const endFrame = Math.min(composition.durationInFrames - 1, Math.round(Math.min(resolved.endSec, limitSec) * fps) - 1);

// Contact sheet: each shot just after its cut and near its end, plus every box event.
const stillsDir = join(ROOT, 'out', `${episode}-doc-stills`);
rmSync(stillsDir, {recursive: true, force: true}); mkdirSync(stillsDir, {recursive: true});
const samples = resolved.shots.flatMap(s => [
  {label: `${s.id} ${s.type} start`, frame: Math.round((s.startSec + 0.7) * fps)},
  {label: `${s.id} ${s.type} end`, frame: Math.round((s.endSec - 0.4) * fps)},
]).filter(s => s.frame <= endFrame);
const issues: string[] = [];
let measured = 0;
for (const [i, sample] of samples.entries()) {
  await renderStill({composition, serveUrl, inputProps, browserExecutable, logLevel: 'error', scale: 0.35, frame: sample.frame,
    output: join(stillsDir, `${String(i).padStart(4, '0')}.png`),
    onBrowserLog: log => {
      if (guardHeartbeat(log.text) !== null) measured++;
      else for (const issue of layoutIssuesFromLog(log.text)) issues.push(`${sample.label}: ${issue.kind} ${issue.id}${issue.other ? ` x ${issue.other}` : ''} ${issue.detail ?? ''}`);
    }});
}
const sheet = join(ROOT, 'out', `${episode}-doc-contact.png`);
execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', join(stillsDir, '%04d.png'), '-vf', `tile=4x${Math.ceil(samples.length / 4)}:padding=6:color=black`, '-frames:v', '1', sheet]);
writeFileSync(sheet.replace(/\.png$/, '.txt'), samples.map((s, i) => `${String(i).padStart(4, '0')} ${s.label} frame=${s.frame}`).join('\n') + '\n');
console.log(`[doc] contact sheet -> ${sheet}; layout guard measured ${measured}/${samples.length} stills, ${issues.length} issue(s)`);
for (const issue of issues.slice(0, 20)) console.log(`  ! ${issue}`);

const output = join(ROOT, 'out', `${episode}-doc.mp4`);
console.log(`[doc] rendering frames 0-${endFrame} -> ${output}`);
await renderMedia({composition, serveUrl, codec: 'h264', outputLocation: output, inputProps, browserExecutable, logLevel: 'error', frameRange: [0, endFrame]});
console.log(`[doc] done: ${output}`);
