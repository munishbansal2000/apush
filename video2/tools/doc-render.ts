/**
 * Render a documentary shot plan (the pipeline's `contact` + `render` stages) for an episode with turns, audio and timing.
 *
 *   npx tsx tools/doc-render.ts --episode u3e1 [--plan data/u3e1/shots.sample.json] --check    validate only
 *   npx tsx tools/doc-render.ts --episode u3e1 [--plan …] [--draft] [--seconds 90]             contact sheet + video
 *
 * Outputs out/<ep>-contact.png and out/<ep>.mp4 (out/<ep>-preview.mp4 with --seconds). Segments are cached, so a re-run
 * after a plan edit re-renders only the segments that changed. Without Vosk words, phrase times are estimated.
 */
import {join, resolve} from 'node:path';
import {ROOT, arg, flag} from './lib';
import {docContactStage, docRenderStage, docResolve, shotsPathFor} from './pipeline/stages/doc';

const episode = arg('episode') ?? (() => { throw new Error('--episode is required'); })();
const draft = flag('draft');
const {inputs, resolved} = docResolve(episode, draft, true, arg('plan') ? resolve(arg('plan')!) : shotsPathFor(episode));
if (draft) console.log('[doc] DRAFT: unapproved library geography allowed (not for publishing)');
const lengths = resolved.shots.map(s => s.endSec - s.startSec);
console.log(`[doc] ${resolved.shots.length} shots over ${resolved.endSec.toFixed(1)}s; median shot ${[...lengths].sort((a, b) => a - b)[Math.floor(lengths.length / 2)].toFixed(1)}s, longest ${Math.max(...lengths).toFixed(1)}s${inputs.estimated ? ' (phrase times ESTIMATED: no Vosk words)' : ''}`);
for (const s of resolved.shots) {
  const tags = [('depth' in s && s.depth) ? 'parallax' : '', s.type === 'clip' ? (s.clip ? 'LTX clip' : 'clip pending: still') : '', ...(s.atmosphere ?? [])].filter(Boolean);
  console.log(`  ${s.id} ${s.startSec.toFixed(2)}-${s.endSec.toFixed(2)}s ${s.type}${'image' in s ? ` ${s.image}` : ''}${tags.length ? ` [${tags.join(', ')}]` : ''}`);
}
if (flag('check')) process.exit(0);
const limitSec = arg('seconds') ? Number(arg('seconds')) : Math.min(resolved.endSec, inputs.timing.totalSec);
if (!(limitSec > 0)) throw new Error(`--seconds must be a positive number, got "${arg('seconds')}"`);
const ctx = {episode, work: join(ROOT, 'out', 'pipeline', episode), outDir: join(ROOT, 'out'), publicDir: join(ROOT, 'public'), force: flag('force'), preview: flag('preview')};
await docContactStage(ctx, inputs, resolved, limitSec);
await docRenderStage(ctx, inputs, resolved, arg('seconds') || resolved.endSec < inputs.timing.totalSec ? limitSec : Infinity);
