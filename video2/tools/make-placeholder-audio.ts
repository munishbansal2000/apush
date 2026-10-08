/**
 * DEV ONLY: placeholder audio so the pipeline runs before Fish renders exist.
 * Uses macOS `say` (two system voices) when available, else silence sized by word count.
 * Writes the TTS text from tts/<ep>/ (run build:tts first), exactly like the real path.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { wordCount } from '../src/kit/text';
import { audioPath, loadEpisode, ROOT } from './lib';

const ep = loadEpisode();
const VOICES: Record<string, string> = { maya: 'Samantha', marcus: 'Daniel' };
const hasSay = (() => { try { execFileSync('which', ['say']); return true; } catch { return false; } })();
const outDir = join(audioPath(ep.spec.id, 'x'), '..');
mkdirSync(outDir, { recursive: true });
for (const t of ep.turns().turns) {
  if (t.kind !== 'speech') continue;
  const txtFile = join(ROOT, 'tts', ep.spec.id, `${t.id}.txt`);
  if (!existsSync(txtFile)) throw new Error(`run build:tts first (${txtFile} missing)`);
  const text = readFileSync(txtFile, 'utf8').trim();
  const mp3 = audioPath(ep.spec.id, t.id);
  if (hasSay) {
    const aiff = mp3.replace(/\.mp3$/, '.aiff');
    execFileSync('say', ['-v', VOICES[t.speaker] ?? 'Samantha', '-r', '185', '-o', aiff, text]);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', aiff, '-ar', '44100', '-ac', '1', '-b:a', '96k', mp3]);
    rmSync(aiff);
  } else {
    const sec = (wordCount(text) / 2.7 + 0.3).toFixed(2);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', sec, '-b:a', '64k', mp3]);
  }
}
console.log(`placeholder audio → ${outDir} (${hasSay ? 'macOS say' : 'silence'})`);
