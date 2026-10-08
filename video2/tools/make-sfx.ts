/**
 * DEV PLACEHOLDERS: synthesize the sound-effect set and a music bed with ffmpeg so the
 * sound layer renders before real assets exist. Replace with licensed audio for production
 * (same file names, see render-config.json sfx/music).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { loadEpisode, PUBLIC } from './lib';

const { config: cfg } = loadEpisode();
const make = (rel: string, filter: string, dur: number) => {
  const out = join(PUBLIC, rel);
  mkdirSync(dirname(out), { recursive: true });
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', filter, '-t', String(dur), '-ac', '2', '-ar', '44100', out]);
  console.log(`  ${rel}`);
};
make(cfg.sfx.hit, "aevalsrc='0.9*sin(2*PI*(70+80*exp(-18*t))*t)*exp(-9*t)':s=44100", 0.45);
make(cfg.sfx.check, "aevalsrc='0.5*sin(2*PI*880*t)*exp(-25*t)+0.5*sin(2*PI*1320*(t-0.08))*exp(-25*(t-0.08))*gte(t,0.08)':s=44100", 0.4);
make(cfg.sfx.whoosh, "anoisesrc=color=pink:amplitude=0.6,afade=t=in:d=0.18,afade=t=out:st=0.2:d=0.35,lowpass=f=2400,highpass=f=300", 0.6);
make(cfg.sfx.tick, "aevalsrc='0.6*sin(2*PI*1600*t)*exp(-60*t)':s=44100", 0.12);
if (cfg.music) {
  // soft A-minor pad with slow tremolo; 60s, looped by the shell
  make(cfg.music.file, "aevalsrc='0.12*(sin(2*PI*110*t)+0.7*sin(2*PI*130.81*t)+0.6*sin(2*PI*164.81*t)+0.3*sin(2*PI*220*t))*(0.75+0.25*sin(2*PI*0.1*t))':s=44100,lowpass=f=900", 60);
}
