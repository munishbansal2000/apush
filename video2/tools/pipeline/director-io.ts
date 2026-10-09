/** Director setup shared by the pipeline's direct stage and tools/doc-direct.ts: catalog, map data, and LLM I/O. */
import {existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {join, relative} from 'node:path';
import {ROOT} from '../lib';
import {readJson, sha256} from '../pipeline-core';
import {buildCatalog, selfCheckFor, type CatalogEntry, type DirectorIO, type MapData} from './doc-director';
import type {DocInputs} from './doc-inputs';

/** Approved library assets + this lesson's downloaded images (descriptions from data/<ep>/images.json). */
export function directorCatalog(inputs: DocInputs): CatalogEntry[] {
  const registryPath = join(ROOT, 'data', inputs.episode, 'images.json');
  const registry = existsSync(registryPath) ? readJson<Record<string, {description?: string}>>(registryPath) : {};
  const lessonImages = Object.fromEntries(Object.entries(inputs.options.imageSizes).filter(([path]) => path in registry));
  const indexPath = join(ROOT, 'src', 'data', 'library-index.json');
  const library = existsSync(indexPath)
    ? readJson<{entries: {kind: string; path: string; description: string; width?: number; height?: number; focus: string[]; retrospective?: boolean; date?: string}[]}>(indexPath).entries.filter(e => e.kind !== 'geo')
    : [];
  return buildCatalog(lessonImages, Object.fromEntries(Object.entries(registry).map(([k, v]) => [k, v.description ?? ''])), library);
}

/** Library geography (approved only, unless drafting), places and map views the director may reference. */
export function directorMaps(inputs: DocInputs, draft: boolean): MapData {
  return {
    geo: Object.values(inputs.options.geo ?? {}).filter(g => draft || g.properties.review.status === 'approved')
      .map(g => ({id: g.properties.id, name: (g.properties as unknown as {name?: string}).name ?? g.properties.id, type: g.geometry.type, precision: g.properties.precision})),
    places: Object.entries(inputs.options.places ?? {}).map(([id, p]) => ({id, name: p.name})),
    views: Object.values(inputs.options.mapViews ?? {}).map(v => ({id: v.id, name: v.name, focus: Object.keys(v.focus ?? {})})),
  };
}

/**
 * Agent mode: each prompt becomes <dir>/<name>.<hash>.prompt.md; an external agent answers with JSON only in the
 * matching .answer.json. The hash ties an answer to its exact prompt, so an edited script never reuses a stale answer.
 */
export function agentIO(dir: string): DirectorIO {
  mkdirSync(dir, {recursive: true});
  return {
    meta: (name, prompt, _attachments, followupPrompt) => {
      // Single-pass agents get the review step as a final self-check (full answer: there is no draft to patch).
      const text = followupPrompt ? `${prompt}\n\n---\nBEFORE YOU ANSWER: ${selfCheckFor(followupPrompt)}` : prompt;
      const stem = join(dir, `${name}.${sha256(text).slice(0, 10)}`);
      if (!existsSync(`${stem}.prompt.md`)) writeFileSync(`${stem}.prompt.md`, `${text}\n`);
      const answer = `${stem}.answer.json`;
      if (!existsSync(answer)) return null;
      try {
        JSON.parse(readFileSync(answer, 'utf8'));
      } catch (error) {
        throw new Error(`${relative(ROOT, answer)} is not valid JSON (${error instanceof Error ? error.message : String(error)}); fix or delete it`);
      }
      return answer;
    },
  };
}

/** Newest prompt file written for a pending prompt name (agent mode). */
export function pendingPromptFile(dir: string, name: string): string | null {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter(f => f.startsWith(`${name}.`) && f.endsWith('.prompt.md'));
  if (!files.length) return null;
  return join(dir, files.map(f => ({f, t: statSync(join(dir, f)).mtimeMs})).sort((a, b) => b.t - a.t)[0].f);
}

/** Thrown when agent-mode answers are still missing; the pipeline stops cleanly and tells the user what to answer. */
export class PendingAnswers extends Error {
  constructor(public files: string[], public rerun: string) {
    super(`waiting for ${files.length} agent answer(s)`);
  }
}
