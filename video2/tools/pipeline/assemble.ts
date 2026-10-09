/**
 * Final assembly: one continuous narration track (each turn placed at its measured start) muxed under the
 * concatenated silent video segments. Rendering audio once avoids per-segment AAC priming gaps at every cut.
 */
import {execFileSync} from 'node:child_process';
import {existsSync, renameSync, unlinkSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import type {PipelineTurn} from '../pipeline-core';

export interface TrackTiming {starts: number[]; totalSec: number}

const ffmpeg = (args: string[]) => execFileSync('ffmpeg', ['-y', '-v', 'error', ...args], {stdio: ['ignore', 'inherit', 'inherit']});

/** Mix every speech turn's mp3 at its start time into one 48 kHz stereo AAC track of exactly totalSec. */
export function buildNarrationTrack(turns: PipelineTurn[], timing: TrackTiming, audioDir: string, output: string): void {
  const speech = turns.map((turn, index) => ({turn, index})).filter(({turn}) => turn.kind === 'speech');
  const inputs = speech.flatMap(({turn}) => {
    const file = join(audioDir, `${turn.id}.mp3`);
    if (!existsSync(file)) throw new Error(`narration track: missing audio ${file}`);
    return ['-i', file];
  });
  const total = timing.totalSec.toFixed(6);
  // Input N (after the turn mp3s) is a silent bed that fixes the track length even when the last turn ends early.
  const bed = speech.length;
  const filters = [`[${bed}:a]atrim=0:${total}[bed]`];
  speech.forEach(({index}, i) => {
    const delayMs = Math.round(timing.starts[index] * 1000);
    filters.push(`[${i}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,adelay=${delayMs}:all=1[a${i}]`);
  });
  const mixInputs = ['[bed]', ...speech.map((_, i) => `[a${i}]`)].join('');
  filters.push(`${mixInputs}amix=inputs=${speech.length + 1}:normalize=0:duration=first[out]`);
  ffmpeg([...inputs, '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-filter_complex', filters.join(';'),
    '-map', '[out]', '-c:a', 'aac', '-b:a', '192k', output]);
}

/** Concatenate silent segments, mux the narration track, and verify one video + one audio stream of the right length. */
export function assembleEpisode(segmentFiles: string[], narrationTrack: string, output: string, workDir: string, totalSec: number, fps: number): void {
  const concat = join(workDir, 'segments.concat.txt');
  writeFileSync(concat, segmentFiles.map(file => `file '${file.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n') + '\n');
  const temp = `${output}.assembling.mp4`;
  ffmpeg(['-f', 'concat', '-safe', '0', '-i', concat, '-i', narrationTrack, '-map', '0:v:0', '-map', '1:a:0',
    '-c:v', 'copy', '-c:a', 'copy', '-t', totalSec.toFixed(6), '-movflags', '+faststart', temp]);
  const streams = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', temp], {encoding: 'utf8'})
    .split(/\s+/).filter(Boolean).sort();
  if (streams.join(',') !== 'audio,video') {
    unlinkSync(temp);
    throw new Error(`assembled video must have exactly one video and one audio stream, got: ${streams.join(', ')}`);
  }
  // Check each stream: the container length is the longest stream, which would hide a short video.
  for (const kind of ['v', 'a'] as const) {
    const actual = streamDuration(temp, kind);
    if (Math.abs(actual - totalSec) > 2 / fps) {
      unlinkSync(temp);
      throw new Error(`assembled ${kind === 'v' ? 'video' : 'audio'} stream is ${actual.toFixed(3)}s; expected ${totalSec.toFixed(3)}s`);
    }
  }
  if (existsSync(output)) unlinkSync(output);
  renameSync(temp, output);
}

function streamDuration(file: string, kind: 'v' | 'a'): number {
  const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', `${kind}:0`, '-show_entries', 'stream=duration', '-of', 'csv=p=0', file], {encoding: 'utf8'});
  return Number(out.trim());
}
