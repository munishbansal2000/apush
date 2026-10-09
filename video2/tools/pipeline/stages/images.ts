/**
 * Images stage: use what this machine has, get the rest.
 *  1. lessons with neither a catalog nor an image list: Meta UI archival research -> data/<lesson>/images.json
 *  2. --images placeholder: copies of large local images for every missing one (previews), else
 *  3. the lesson catalog (data/u<N>-catalogs/<lesson>-images.json) through tools/download-images.py (polite, registers
 *     each image in the lesson list and the lock), then any list entry still without a file through fetch-images
 *  4. depth maps (2.5D parallax) for images without one, when DEPTH_PYTHON or LTX_PYTHON names a Python with torch
 * The storyboard only ever offers images that are on disk, sized and not turned down in review.
 */
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT} from '../../lib';
import {atomicJson, isSafePublicPath, readJson, sha256, type PipelineTurn} from '../../pipeline-core';
import type {PipelineContext} from '../context';
import {fillPlaceholders, isPlaceholder} from '../placeholders';
import {pipelinePython} from '../tools';

const catalogPath = (episode: string) => join(ROOT, 'data', `u${/^u(\d+)/.exec(episode)?.[1] ?? ''}-catalogs`, `${episode}-images.json`);
const lockPath = join(ROOT, 'data', 'images.lock.json');

export function imagesStage(ctx: PipelineContext, turns: PipelineTurn[]): void {
  if (!ctx.stages.includes('images')) return;
  const {episode} = ctx;
  const registryPath = join(ctx.dataDir, 'images.json');
  const catalog = catalogPath(episode);
  if (ctx.dryRun) { console.log(`[images] dry-run: ${existsSync(catalog) ? 'catalog downloads' : 'image list'}${ctx.images === 'placeholder' ? ' (placeholders)' : ''}`); return; }
  const registry = () => (existsSync(registryPath) ? readJson<Record<string, Record<string, unknown>>>(registryPath) : {});
  if (!existsSync(catalog) && !Object.keys(registry()).length) research(ctx, turns, registryPath);

  if (ctx.images === 'placeholder') {
    const fromCatalog = existsSync(catalog)
      ? readJson<{images?: {id: string; title?: string; primary_url?: string; alt_url?: string}[]}>(catalog).images ?? []
      : [];
    // Catalog images enter the lesson list under the downloader's names, marked as placeholders until downloaded.
    const list = registry();
    for (const img of fromCatalog) {
      const path = `historic/${episode}/${img.id.replace(/\./g, '-')}.jpg`;
      list[path] ??= {description: img.title ?? '', source_url: img.primary_url ?? img.alt_url, catalog_id: img.id, placeholder: true};
    }
    atomicJson(registryPath, list);
    const r = fillPlaceholders(episode, Object.keys(list), ctx.publicDir, lockPath);
    console.log(`[images] --images placeholder: ${r.made} placeholder(s) from ${r.sources} large local image(s); ${Object.keys(list).length} listed`);
    return;
  }

  if (existsSync(catalog)) ctx.run(pipelinePython(), [join(ROOT, 'tools', 'download-images.py'), '--lesson', episode]);
  const lock = existsSync(lockPath) ? readJson<Record<string, {source_url?: string}>>(lockPath) : {};
  const missing = Object.keys(registry()).filter(p => !existsSync(join(ctx.publicDir, p)) || !lock[p] || isPlaceholder(lock[p]));
  const tsx = join(ROOT, 'node_modules/tsx/dist/cli.mjs');
  for (const p of missing) {
    if (registry()[p]?.catalog_id) continue; // the catalog downloader owns these (its failures are in its log)
    try { ctx.run(process.execPath, [tsx, 'tools/fetch-images.ts', '--only', p]); } catch (e) { console.log(`  ~ ${p}: ${e instanceof Error ? e.message : String(e)}`); }
  }
  const after = existsSync(lockPath) ? readJson<Record<string, {source_url?: string}>>(lockPath) : {};
  const have = Object.keys(registry()).filter(p => existsSync(join(ctx.publicDir, p)) && after[p] && !isPlaceholder(after[p])).length;
  console.log(`[images] ${have}/${Object.keys(registry()).length} listed images on disk`);
  depthMaps(ctx, Object.keys(registry()));
}

/** tools/depth-maps.py for listed images without a depth map (it skips existing ones); optional: needs torch. */
function depthMaps(ctx: PipelineContext, paths: string[]): void {
  const python = process.env.DEPTH_PYTHON ?? process.env.LTX_PYTHON;
  const todo = paths.filter(p => existsSync(join(ctx.publicDir, p)) && !existsSync(join(ctx.publicDir, 'depth', `${p.replace(/\.[^.]+$/, '')}.png`)));
  if (!todo.length) return;
  if (!python) { console.log(`[images] ${todo.length} image(s) without depth maps: set DEPTH_PYTHON (a Python with torch) for parallax; shots stay flat`); return; }
  try { ctx.run(python, [join(ROOT, 'tools', 'depth-maps.py'), ...todo.map(p => join(ctx.publicDir, p))]); } catch (e) { console.log(`[images] depth maps failed (${e instanceof Error ? e.message : String(e)}); shots stay flat`); }
}

/** Meta UI archival image research for a lesson without a catalog or list (reviewed entries are never replaced). */
function research(ctx: PipelineContext, turns: PipelineTurn[], registryPath: string): void {
  const {episode} = ctx;
  const hash = sha256(JSON.stringify({turns, episode}));
  if (ctx.current('images', hash) && existsSync(registryPath)) return;
  const prompt = `Act as an APUSH archival image researcher. Read the complete lesson transcript below. Select only images that materially teach the lesson. Prefer public-domain/CC0 Wikimedia Commons, Library of Congress, National Archives, museums, or other authoritative collections. Provide 1 primary source_url plus 1-3 exact-work alternative download URLs to survive throttling. Do not invent URLs or licenses. Return JSON only: {"images":[{"path":"historic/${episode}/slug.jpg","description":"...","license":"Public domain|CC0|CC BY...","source_url":"https://...","download_urls":["https://..."],"used_in":["${episode}:t00"]}]}. used_in must reference relevant turn IDs.\n\nTRANSCRIPT:\n${turns.map(t => `${t.id} ${t.speaker ?? 'PAUSE'}: ${t.text ?? `[pause ${t.pauseSec}s]`}`).join('\n')}`;
  const planned = readJson<{images?: Record<string, unknown>[]}>(ctx.meta('images', prompt));
  if (!Array.isArray(planned.images) || !planned.images.length) throw new Error('Meta UI image plan must contain a non-empty images array');
  const manifest = existsSync(registryPath) ? readJson<Record<string, Record<string, unknown>>>(registryPath) : {};
  for (const row of planned.images) {
    const path = String(row.path ?? '');
    if (!path.startsWith(`historic/${episode}/`) || !isSafePublicPath(path) || !/\.(?:jpg|jpeg|png|webp)$/i.test(path)) throw new Error(`invalid planned image path: ${path}`);
    if (manifest[path]?.verified) continue;
    manifest[path] = {description: row.description, license: row.license, source_url: row.source_url, download_urls: row.download_urls, used_in: row.used_in};
  }
  atomicJson(registryPath, manifest);
  ctx.mark('images', hash);
}
