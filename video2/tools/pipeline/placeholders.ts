/**
 * Placeholder images (--images placeholder): every image a lesson lists but this machine lacks becomes a copy of a
 * large local image (cycling), locked with source_url "placeholder:<source>". For previews on a laptop; the real
 * downloaders treat placeholder entries as missing and replace them on any later download run.
 */
import {copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, join} from 'node:path';

type Lock = Record<string, {source_url?: string; sha256?: string; width?: number; height?: number}>;

export const isPlaceholder = (entry: {source_url?: string} | undefined) => String(entry?.source_url ?? '').startsWith('placeholder:');

/** Fills `wanted` image paths from large real images in the lesson folder; returns how many were made. */
export function fillPlaceholders(episode: string, wanted: string[], publicDir: string, lockPath: string): {made: number; sources: number} {
  const lock: Lock = existsSync(lockPath) ? JSON.parse(readFileSync(lockPath, 'utf8')) as Lock : {};
  const real = (p: string) => existsSync(join(publicDir, p)) && !!lock[p]?.width && !isPlaceholder(lock[p]);
  // Only images big enough for a full-frame shot, so placeholders never fail the upscale check.
  const big = (p: string) => Number(lock[p]?.width) >= 1600 && Number(lock[p]?.height) >= 1000;
  const dir = join(publicDir, 'historic', episode);
  const sources = (existsSync(dir) ? readdirSync(dir) : []).map(f => `historic/${episode}/${f}`).filter(p => /\.(jpe?g|png|webp)$/i.test(p) && real(p) && big(p));
  if (!sources.length) throw new Error(`--images placeholder: no real image of at least 1600x1000 in public/historic/${episode} to copy from`);
  let made = 0;
  for (const p of [...new Set(wanted)].sort()) {
    if (real(p)) continue;
    const src = sources[made % sources.length];
    const out = join(publicDir, p);
    mkdirSync(dirname(out), {recursive: true});
    copyFileSync(join(publicDir, src), out); // browsers detect the format from the bytes, whatever the extension
    lock[p] = {source_url: `placeholder:${src}`, sha256: createHash('sha256').update(readFileSync(out)).digest('hex'), width: lock[src].width, height: lock[src].height};
    made++;
  }
  writeFileSync(lockPath, `${JSON.stringify(Object.fromEntries(Object.entries(lock).sort(([a], [b]) => a.localeCompare(b))), null, 2)}\n`);
  return {made, sources: sources.length};
}
