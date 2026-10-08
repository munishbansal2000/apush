/**
 * Audio durations (ffprobe) → data/<ep>/timing_map.json. Timing is derived, never typed.
 * Records the TTS hash each clip was generated from (from tts/<ep>/index.json at the time
 * the audio was made), so the validator can tell when the script changed after audio.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { layoutStarts } from '../src/kit/timeline';
import type { TimingFile } from '../src/kit/types';
import { execFileSync } from 'node:child_process';
import { audioPath, ffprobeDuration, loadEpisode, ROOT, writeJson } from './lib';

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

/**
 * Per-frame loudness (0..1) for each speech clip, so the speaking head can bounce without
 * decoding audio in the browser. RMS per frame-sized chunk, mapped from [-50, -10] dBFS.
 */
const levels: Record<string, number[]> = {};
for (const t of turns) {
  if (t.kind !== 'speech') continue;
  const f = audioPath(ep.spec.id, t.id);
  const sr = Number(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=sample_rate', '-of', 'csv=p=0', f], { encoding: 'utf8' }).trim());
  const n = Math.round(sr / ep.config.fps);
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-af', `asetnsamples=n=${n}:p=0,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-`, '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  levels[t.id] = [...raw.matchAll(/RMS_level=(-?[\d.]+|-inf)/g)].map(m => {
    const db = m[1] === '-inf' ? -90 : Number(m[1]);
    return Math.round(Math.min(1, Math.max(0, (db + 50) / 40)) * 100) / 100;
  });
}
writeJson(`${ep.dataDir}/levels.json`, levels);
console.log(`timing_map.json: ${turns.length} turns, ${totalSec.toFixed(1)}s (${(totalSec / 60).toFixed(1)} min); levels.json: ${Object.keys(levels).length} clips`);
