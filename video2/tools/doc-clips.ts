/**
 * LTX hero clips for a documentary shot plan (the pipeline's `clips` stage), on the GPU machine.
 *
 *   npx tsx tools/doc-clips.ts --episode u3e1 [--plan data/u3e1/shots.sample.json] [--draft] [--dry-run] [--force]
 *
 * Backend: LTX Desktop by default (start the app), or LTX_BACKEND=diffusers. Clips are keyed by content and reused.
 */
import {resolve} from 'node:path';
import {arg, flag} from './lib';
import {docResolve, generateClips, shotsPathFor} from './pipeline/stages/doc';

const episode = arg('episode') ?? (() => { throw new Error('--episode is required'); })();
const {resolved} = docResolve(episode, flag('draft'), true, arg('plan') ? resolve(arg('plan')!) : shotsPathFor(episode));
generateClips(episode, resolved, {force: flag('force'), dryRun: flag('dry-run')});
