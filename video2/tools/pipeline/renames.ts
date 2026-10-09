/** Renamed library ids (data/library/renames.json): applied to lesson files by `npm run maps -- migrate`. */
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT} from '../lib';

export function loadRenames(root = ROOT): Record<string, string> {
  const path = join(root, 'data', 'library', 'renames.json');
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as {ids: Record<string, string>}).ids : {};
}

/** A note for an unknown id that was renamed. */
export const renamedHint = (id: string, renames = loadRenames()) => (renames[id] ? `; it was renamed to "${renames[id]}": run npm run maps -- migrate` : '');

/** Replaces every old id that appears as a whole JSON string value. Returns the new text and how many were replaced. */
export function applyRenames(text: string, renames: Record<string, string>): {text: string; count: number} {
  let count = 0;
  let out = text;
  for (const [from, to] of Object.entries(renames)) {
    const quoted = JSON.stringify(from);
    const parts = out.split(quoted);
    count += parts.length - 1;
    out = parts.join(JSON.stringify(to));
  }
  return {text: out, count};
}
