/**
 * DEV PLACEHOLDERS for the motion sound layer (src/motion/sound.tsx): synthesizes the extra
 * cue sounds with ffmpeg (same approach as make-sfx.ts) into public/sfx/. Replace with
 * licensed audio for production — keep the file names (SFX table in src/motion/sound.tsx).
 *   --force   overwrite existing files (default: skip files that already exist)
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ffprobeDuration, flag, PUBLIC } from './lib';

/** Render one sound: either a single lavfi source chain, or a filter_complex graph ending in [out]. */
const make = (rel: string, dur: number, src: { lavfi: string } | { graph: string }) => {
  const out = join(PUBLIC, rel);
  if (existsSync(out) && !flag('force')) {
    console.log(`  ${rel}  (exists, ${ffprobeDuration(out).toFixed(2)}s)`);
    return;
  }
  mkdirSync(dirname(out), { recursive: true });
  const args = 'lavfi' in src
    ? ['-f', 'lavfi', '-i', src.lavfi]
    : ['-filter_complex', src.graph, '-map', '[out]'];
  execFileSync('ffmpeg', ['-y', '-v', 'error', ...args, '-t', String(dur), '-ac', '2', '-ar', '44100', out]);
  console.log(`  ${rel}  ${ffprobeDuration(out).toFixed(2)}s`);
};

const fadeOut = (dur: number, len = 0.15) => `afade=t=in:d=0.01,afade=t=out:st=${(dur - len).toFixed(3)}:d=${len}`;

// wood creak: a pulse train whose rate wanders (stick-slip), band-passed like a hull plank
make('sfx/creak.wav', 1.1, {
  lavfi: "aevalsrc='0.8*lt(mod(t*(70+45*sin(2*PI*1.3*t)+20*sin(2*PI*3.1*t)),1),0.18)*sin(PI*t/1.1)':s=44100," +
    `bandpass=f=520:width_type=h:w=260,bandpass=f=700:width_type=h:w=500,volume=4,${fadeOut(1.1, 0.2)}`,
});
// low boom: falling sine + a short low-passed noise transient
make('sfx/thud.wav', 1.3, {
  graph: "aevalsrc='0.9*sin(2*PI*(42+70*exp(-10*t))*t)*exp(-4*t)':s=44100:d=1.3[a];" +
    'anoisesrc=color=brown:amplitude=0.8:d=1.3,lowpass=f=180,volume=\'exp(-12*t)\':eval=frame[b];' +
    `[a][b]amix=inputs=2:normalize=0,lowpass=f=320,alimiter=limit=0.9,${fadeOut(1.3, 0.3)}[out]`,
});
// pen on paper: band-passed noise in short strokes
make('sfx/pen.wav', 1.0, {
  lavfi: 'anoisesrc=color=white:amplitude=0.5,bandpass=f=4200:width_type=h:w=3000,highpass=f=1800,' +
    "volume='0.15+0.85*pow(abs(sin(2*PI*3.2*t)),3)':eval=frame," + fadeOut(1.0, 0.2),
});
// march snare: crack of filtered noise + a short 190 Hz body
make('sfx/drum.wav', 0.4, {
  graph: 'anoisesrc=color=white:amplitude=0.8:d=0.4,highpass=f=1400,volume=\'exp(-16*t)\':eval=frame[n];' +
    "aevalsrc='0.7*sin(2*PI*190*t)*exp(-28*t)':s=44100:d=0.4[b];" +
    `[n][b]amix=inputs=2:normalize=0,alimiter=limit=0.9,${fadeOut(0.4, 0.08)}[out]`,
});
// ship's bell: inharmonic partials, long decay
make('sfx/bell.wav', 2.6, {
  lavfi: "aevalsrc='0.35*sin(2*PI*660*t)*exp(-1.6*t)+0.25*sin(2*PI*1320*t)*exp(-2.4*t)+0.18*sin(2*PI*1822*t)*exp(-3*t)+0.1*sin(2*PI*3564*t)*exp(-5*t)':s=44100," +
    fadeOut(2.6, 0.4),
});
// crowd murmur: low band-passed noise with slow, uneven swells
make('sfx/crowd.wav', 4.0, {
  lavfi: 'anoisesrc=color=pink:amplitude=0.7,bandpass=f=600:width_type=h:w=700,lowpass=f=1600,' +
    "volume='0.55+0.25*sin(2*PI*0.7*t)+0.2*sin(2*PI*2.3*t+1)':eval=frame,volume=3,afade=t=in:d=0.6,afade=t=out:st=3.2:d=0.8",
});
// quill: brighter, scratchier, quicker strokes than the pen
make('sfx/quill.wav', 0.8, {
  lavfi: 'anoisesrc=color=white:amplitude=0.45,bandpass=f=6000:width_type=h:w=3500,highpass=f=2500,' +
    "volume='0.1+0.9*gt(sin(2*PI*6.5*t),0.2)*pow(abs(sin(2*PI*13*t)),2)':eval=frame," + fadeOut(0.8, 0.15),
});
// soft whoosh (camera moves): longer, darker, quieter than the episode whoosh
make('sfx/whoosh-soft.wav', 1.2, {
  lavfi: 'anoisesrc=color=pink:amplitude=0.5,lowpass=f=1200,highpass=f=150,' +
    "volume='sin(PI*t/1.2)^2':eval=frame," + fadeOut(1.2, 0.1),
});
