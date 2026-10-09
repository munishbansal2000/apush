import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {mkdirSync, mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, it} from 'node:test';
import {ffprobeDuration} from '../tools/lib';
import {parseTranscript} from '../tools/pipeline-core';
import {assembleEpisode, buildNarrationTrack} from '../tools/pipeline/assemble';
import {writeTone} from './helpers/fake-pipeline';

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
  const audioDir = join(dir, 'audio');
  mkdirSync(audioDir);
  const turns = parseTranscript('Maya: One.\n[pause 1]\nMarcus: Two.');
  writeTone(join(audioDir, 't00.mp3'), 0.8);
  writeTone(join(audioDir, 't02.mp3'), 0.8);
  const timing = {starts: [0.25, 1.23, 2.41], totalSec: 4};
  const track = join(dir, 'narration.m4a');

  it('places each turn at its measured start in one continuous track', () => {
    buildNarrationTrack(turns, timing, audioDir, track);
    assert.ok(Math.abs(ffprobeDuration(track) - 4) < 0.05, `track is ${ffprobeDuration(track)}s`);
    assert.ok(meanVolume(track, 0, 0.2) < -60, 'lead-in should be silent');
    assert.ok(meanVolume(track, 0.35, 0.5) > -30, 'turn t00 should be audible');
    assert.ok(meanVolume(track, 1.3, 0.9) < -60, 'pause should be silent');
    assert.ok(meanVolume(track, 2.5, 0.5) > -30, 'turn t02 should be audible');
    assert.ok(meanVolume(track, 3.4, 0.5) < -60, 'tail should be silent');
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
