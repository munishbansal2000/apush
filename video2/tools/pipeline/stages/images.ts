import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT} from '../../lib';
import {atomicJson, readJson, sha256, type PipelineTurn} from '../../pipeline-core';
import type {PipelineContext} from '../context';

/** Meta UI archival image research → data/<episode>/images.json, then download each file. */
export function imagesStage(ctx: PipelineContext, turns: PipelineTurn[]): void {
  const {episode} = ctx;
  const imagesPlanPath = join(ctx.work, 'images.manifest-patch.json');
  const imagesHash = sha256(JSON.stringify({turns, episode}));
  if (!ctx.stages.includes('images')) return;
  if (ctx.current('images', imagesHash) && existsSync(imagesPlanPath)) console.log('[images] checkpoint current');
  else {
    const prompt = `Act as an APUSH archival image researcher. Read the complete lesson transcript below. Select only images that materially teach the lesson. Prefer public-domain/CC0 Wikimedia Commons, Library of Congress, National Archives, museums, or other authoritative collections. Provide 1 primary source_url plus 1-3 exact-work alternative download URLs to survive throttling. Do not invent URLs or licenses. Return JSON only: {"images":[{"path":"historic/${episode}/slug.jpg","description":"...","license":"Public domain|CC0|CC BY...","source_url":"https://...","download_urls":["https://..."],"used_in":["${episode}:t00"]}]}. used_in must reference relevant turn IDs.\n\nTRANSCRIPT:\n${turns.map(t => `${t.id} ${t.speaker ?? 'PAUSE'}: ${t.text ?? `[pause ${t.pauseSec}s]`}`).join('\n')}`;
    const out = ctx.meta('images', prompt);
    if (!ctx.dryRun) {
      const planned = readJson<{images?: Record<string, unknown>[] }>(out);
      if (!Array.isArray(planned.images) || !planned.images.length) throw new Error('Meta UI image plan must contain a non-empty images array');
      // Per-lesson registry: data/<episode>/images.json. Reviewed entries are
      // creative source-of-truth and must not be replaced by a later Meta run.
      const manifestPath = join(ROOT, 'data', episode, 'images.json');
      const manifest = existsSync(manifestPath) ? readJson<Record<string, Record<string, unknown>>>(manifestPath) : {};
      const patch: Record<string, unknown> = {};
      for (const row of planned.images) {
        const path = String(row.path ?? '');
        if (!path.startsWith(`historic/${episode}/`) || !/\.(?:jpg|jpeg|png|webp)$/i.test(path)) throw new Error(`invalid planned image path: ${path}`);
        const reviewed = manifest[path]?.verified ? manifest[path] : null;
        patch[path] = reviewed
          ? {...reviewed, used_in: [...new Set([...(reviewed.used_in as string[] ?? []), ...(row.used_in as string[] ?? [])])]}
          : {description: row.description, license: row.license, source_url: row.source_url, download_urls: row.download_urls, used_in: row.used_in};
      }
      atomicJson(imagesPlanPath, patch);
      atomicJson(manifestPath, {...manifest, ...patch});
      const tsx = join(ROOT, 'node_modules/tsx/dist/cli.mjs');
      // `fetch-images --only` does not require a compiled episode registry entry,
      // which keeps transcript-driven/ad-hoc lessons supported.
      for (const path of Object.keys(patch)) ctx.run(process.execPath, [tsx, 'tools/fetch-images.ts', '--only', path]);
      ctx.mark('images', imagesHash);
    }
  }
}
