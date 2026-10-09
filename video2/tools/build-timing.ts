/**
 * Audio durations (ffprobe) → data/<ep>/timing_map.json. Timing is derived, never typed.
 * Records the TTS hash each clip was generated from (from tts/<ep>/index.json at the time
 * the audio was made), so the validator can tell when the script changed after audio.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { layoutStarts } from '../src/kit/timeline';
import type { TimingFile } from '../src/kit/types';
import { audioLevels, audioPath, ffprobeDuration, loadEpisode, ROOT, writeJson } from './lib';

const ep = loadEpisode();
const turns = ep.turns().turns;
const indexPath = join(ROOT, 'tts', ep.spec.id, 'index.json');
const ttsIndex: Record<string, { hash: string }> = existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, 'utf8')) : {};
const missing: string[] = [];
const { starts, durations, totalSec } = layoutStarts(
  turns,
  t => {
    if (t.kind === 'pause') return t.pauseSec;
    const f = audioPath(ep.spec.id, t.id);
    if (!existsSync(f)) {
      missing.push(t.id);
      return 0;
    }
    return ffprobeDuration(f);
  },
  ep.config.timing,
);
if (missing.length) {
  console.error(`missing audio for ${missing.length} turns: ${missing.join(', ')}`);
  process.exit(1);
}
const ttsHash: Record<string, string> = {};
for (const t of turns) if (t.kind === 'speech' && ttsIndex[t.id]) ttsHash[t.id] = ttsIndex[t.id].hash;
const out: TimingFile = { _generated: 'tools/build-timing.ts — do not edit', fps: ep.config.fps, starts, durations, ttsHash, totalSec };
writeJson(`${ep.dataDir}/timing_map.json`, out);

/** Per-frame loudness for each speech clip (see audioLevels). */
const levels: Record<string, number[]> = {};
for (const t of turns) if (t.kind === 'speech') levels[t.id] = audioLevels(audioPath(ep.spec.id, t.id), ep.config.fps);
writeJson(`${ep.dataDir}/levels.json`, levels);
console.log(`timing_map.json: ${turns.length} turns, ${totalSec.toFixed(1)}s (${(totalSec / 60).toFixed(1)} min); levels.json: ${Object.keys(levels).length} clips`);
