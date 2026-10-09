/**
 * Images -> lines: which lines of the lesson each image illustrates, recorded as `used_in` in data/<lesson>/images.json.
 * Catalogs that carry a mapping ("turns") pass it on at download; for images without one, one LLM pass maps them.
 * The act split (allocateActs) offers each act the images mapped to its lines.
 */
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {atomicJson, readJson} from '../pipeline-core';
import type {DocInputs} from './doc-inputs';
import {readAnswer, type DirectorIO} from './doc-director';
import {cleanSpeech} from './speech';

const MAX_LINES_PER_IMAGE = 4;

export function imageMapPrompt(inputs: DocInputs, images: {path: string; description: string}[]): string {
  return [
    'You are the picture researcher for an APUSH history documentary. For each IMAGE below, list the LINES of the lesson where showing it fits what the words say (the person, place, document, object or event named, or a scene that shows it).',
    `Give each image 1-${MAX_LINES_PER_IMAGE} line ids, the best fits first, or [] if it fits no line. Never map to PAUSE lines. Do not invent line ids or image paths.`,
    'Answer with JSON only: {"images":[{"path":"<image path>","turns":["t03","t05"]}]}',
    '',
    'LINES (id | speaker | narration):',
    ...inputs.turns.map(t => `${t.id} | ${t.kind === 'pause' ? 'PAUSE' : t.speaker} | ${t.kind === 'pause' ? '' : cleanSpeech(t.text ?? '')}`),
    '',
    'IMAGES (path | description):',
    ...images.map(i => `${i.path} | ${i.description.replace(/\s+/g, ' ').slice(0, 200)}`),
  ].join('\n');
}

/**
 * Maps every usable image that has no `used_in` yet; returns how many were mapped, or null while an agent answer is
 * pending (agent mode). Images the answer leaves out get `used_in: []` (asked once; they fit no particular line).
 */
export function mapImages(episode: string, dataDir: string, inputs: DocInputs, io: DirectorIO): number | null {
  const registryPath = join(dataDir, 'images.json');
  if (!existsSync(registryPath)) return 0;
  const registry = readJson<Record<string, {description?: string; used_in?: string[]}>>(registryPath);
  const todo = Object.keys(inputs.options.imageSizes).filter(p => registry[p] && !Array.isArray(registry[p].used_in)).sort();
  if (!todo.length) return 0;
  console.log(`[storyboard] mapping ${todo.length} image(s) to lines`);
  const file = io.meta('image-map', imageMapPrompt(inputs, todo.map(path => ({path, description: registry[path].description ?? ''}))));
  if (!file) return null;
  const answer = readAnswer(file) as {images?: {path?: string; turns?: unknown}[]};
  if (!Array.isArray(answer?.images)) throw new Error('image-map: the answer must be {"images": [{"path": ..., "turns": [...]}]}');
  const speech = new Set(inputs.turns.filter(t => t.kind === 'speech').map(t => t.id));
  const got = new Map(answer.images.filter(r => typeof r?.path === 'string' && todo.includes(r.path))
    .map(r => [r.path!, (Array.isArray(r.turns) ? r.turns : []).filter((t): t is string => typeof t === 'string' && speech.has(t)).slice(0, MAX_LINES_PER_IMAGE)]));
  let mapped = 0;
  for (const path of todo) {
    const turns = got.get(path) ?? [];
    registry[path].used_in = turns.map(t => `${episode}:${t}`);
    if (turns.length) mapped++;
  }
  atomicJson(registryPath, registry);
  console.log(`[storyboard] ${mapped} of ${todo.length} image(s) mapped to lines`);
  return mapped;
}
