import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, it} from 'node:test';
import {ffprobeDuration} from '../tools/lib';
import {assembleEpisode} from '../tools/pipeline/assemble';

/** Mean volume (dB) of a window of an audio file; silence reports about -91 dB. */
function meanVolume(file: string, start: number, seconds: number): number {
  const result = spawnSync('ffmpeg', ['-v', 'info', '-ss', String(start), '-t', String(seconds), '-i', file, '-af', 'volumedetect', '-f', 'null', '-'], {encoding: 'utf8'});
  const match = /mean_volume:\s*(-?[\d.]+|-inf) dB/.exec(result.stderr);
  assert.ok(match, `no volumedetect output: ${result.stderr.slice(-300)}`);
  return match[1] === '-inf' ? -Infinity : Number(match[1]);
}

function silentSegment(path: string, seconds: number): void {
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', `color=c=navy:s=320x180:r=30:d=${seconds}`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', path]);
}

describe('P8: final assembly', () => {
  const dir = mkdtempSync(join(tmpdir(), 'v2-assemble-'));
  const track = join(dir, 'narration.m4a');

  it('test audio track: a 4s tone between silences', () => {
    // Stand-in for the episode's rendered audio mix: silence, a tone, silence.
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=0.8', '-af', 'adelay=2410:all=1,apad', '-t', '4', '-ac', '2', '-ar', '48000', '-c:a', 'aac', track]);
    assert.ok(Math.abs(ffprobeDuration(track) - 4) < 0.05);
    assert.ok(meanVolume(track, 2.5, 0.5) > -30 && meanVolume(track, 0.5, 1) < -60);
  });

  it('muxes silent segments with the track: exactly one video and one audio stream, correct length', () => {
    const segments = [join(dir, '0000-a.mp4'), join(dir, '0001-b.mp4')];
    silentSegment(segments[0], 2);
    silentSegment(segments[1], 2);
    const output = join(dir, 'episode.mp4');
    assembleEpisode(segments, track, output, dir, 4, 30);
    const streams = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', output], {encoding: 'utf8'}).split(/\s+/).filter(Boolean).sort();
    assert.deepEqual(streams, ['audio', 'video']);
    assert.ok(Math.abs(ffprobeDuration(output) - 4) < 2 / 30);
    assert.ok(meanVolume(output, 2.5, 0.5) > -30, 'narration survives the mux');
  });

  it('rejects an assembly whose video is shorter than the timeline', () => {
    const short = join(dir, 'short.mp4');
    silentSegment(short, 2);
    assert.throws(() => assembleEpisode([short], track, join(dir, 'bad.mp4'), dir, 4, 30), /expected 4\.000s/);
  });
});
