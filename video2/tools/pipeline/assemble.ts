/**
 * Final assembly: one continuous audio track (rendered once for the whole episode) muxed under the concatenated
 * silent video segments. Rendering audio once avoids per-segment AAC priming gaps at every cut.
 */
import {execFileSync} from 'node:child_process';
import {existsSync, renameSync, unlinkSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const ffmpeg = (args: string[]) => execFileSync('ffmpeg', ['-y', '-v', 'error', ...args], {stdio: ['ignore', 'inherit', 'inherit']});

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
