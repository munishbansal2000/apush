/**
 * Act patches: the director's review and repair rounds return only the shots they change, not the whole act again
 * (about half of all director output was unchanged shots copied back). A patch is
 *   {"ok": true}                                   nothing to fix
 *   {"replace": [{"index": 3, "anchor": <shot 3's "at">, "shot": {...}}],
 *    "remove":  [{"index": 5, "anchor": <shot 5's "at">}],
 *    "insert":  [{"index": 7, "anchor": <shot 7's "at">, "shot": {...}}],   new shot after index 7 (-1 = first, no anchor)
 *    "years":   [...]}                              the complete new year list, only when it changes
 * Indexes are 0-based positions in the act's shots before any change. Every edit names its shot twice (index and
 * anchor): an off-by-one index is corrected when the anchor identifies exactly one shot, and rejected otherwise.
 * Only arrays of objects are used: Meta UI can mangle bare numeric arrays.
 */
import type {ActOutput} from './doc-director';

type Anchor = {turn?: unknown; phrase?: unknown};
interface Edit {index?: unknown; anchor?: Anchor; shot?: unknown}
export interface ActPatch {ok?: boolean; replace?: Edit[]; remove?: Edit[]; insert?: Edit[]; years?: unknown[]}

const PATCH_KEYS = new Set(['ok', 'replace', 'remove', 'insert', 'years']);

export const PATCH_FORMAT = [
  'Return ONLY one JSON object: {"ok": true} if nothing needs fixing, otherwise a patch holding ONLY the shots you change:',
  '{"replace": [{"index": 3, "anchor": <shot 3\'s current "at">, "shot": {<the complete new shot>}}],',
  ' "remove": [{"index": 5, "anchor": <shot 5\'s current "at">}],',
  ' "insert": [{"index": 7, "anchor": <shot 7\'s current "at">, "shot": {<new shot placed after shot 7>}}],',
  ' "years": [<the complete new year list; only if years change>]}',
  'Indexes are 0-based positions in the shots array BEFORE any change (index -1 inserts before the first shot, with no anchor). Never repeat a shot you do not change. Omit empty keys.',
].join('\n');

/** A full act answer ({"shots": [...]}) as opposed to a patch. */
export const isFullAct = (raw: unknown): boolean => !!raw && typeof raw === 'object' && Array.isArray((raw as {shots?: unknown}).shots);

export function isPatch(raw: unknown): raw is ActPatch {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || isFullAct(raw)) return false;
  const keys = Object.keys(raw);
  return keys.length > 0 && keys.every(k => PATCH_KEYS.has(k));
}

const norm = (v: unknown) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const sameAnchor = (a: Anchor | undefined, b: Anchor | undefined) => !!a && !!b && a.turn === b.turn && norm(a.phrase) === norm(b.phrase);

/** The act with the patch applied, or the problems (as repair-prompt lines). */
export function applyActPatch(base: ActOutput, patch: ActPatch): {act?: ActOutput; issues: string[]} {
  const issues: string[] = [];
  const shots = base.shots;
  for (const key of Object.keys(patch)) if (!PATCH_KEYS.has(key)) issues.push(`patch: unknown key "${key}" (use replace, remove, insert, years)`);
  /** Resolves an edit to a base index: the index when its anchor agrees, else the one shot the anchor names. */
  const locate = (kind: string, n: number, e: Edit, allowStart = false): number | null => {
    const where = `patch ${kind} ${n + 1}`;
    if (allowStart && e.index === -1) return -1;
    const index = Number.isInteger(e.index) ? (e.index as number) : NaN;
    const at = (i: number) => (shots[i] as {at?: Anchor} | undefined)?.at;
    if (!e.anchor) {
      if (index >= 0 && index < shots.length) return index;
      issues.push(`${where}: index ${String(e.index)} is not a shot (0-${shots.length - 1})`);
      return null;
    }
    if (index >= 0 && index < shots.length && sameAnchor(at(index), e.anchor)) return index;
    const matches = shots.map((_, i) => i).filter(i => sameAnchor(at(i), e.anchor));
    if (matches.length === 1) return matches[0];
    issues.push(`${where}: index ${String(e.index)} and anchor ${JSON.stringify(e.anchor)} do not identify one shot`);
    return null;
  };
  const replaced = new Map<number, unknown>();
  const removed = new Set<number>();
  const inserted = new Map<number, unknown[]>();
  (patch.replace ?? []).forEach((e, n) => {
    const i = locate('replace', n, e);
    if (i === null) return;
    if (!e.shot || typeof e.shot !== 'object') issues.push(`patch replace ${n + 1}: needs the complete new "shot"`);
    else if (replaced.has(i)) issues.push(`patch replace ${n + 1}: shot index ${i} is replaced twice`);
    else replaced.set(i, e.shot);
  });
  (patch.remove ?? []).forEach((e, n) => {
    const i = locate('remove', n, e);
    if (i === null) return;
    if (replaced.has(i)) issues.push(`patch remove ${n + 1}: shot index ${i} is both replaced and removed`);
    else removed.add(i);
  });
  (patch.insert ?? []).forEach((e, n) => {
    const i = locate('insert', n, e, true);
    if (i === null) return;
    if (!e.shot || typeof e.shot !== 'object') issues.push(`patch insert ${n + 1}: needs the new "shot"`);
    else inserted.set(i, [...(inserted.get(i) ?? []), e.shot]);
  });
  if (patch.years !== undefined && !Array.isArray(patch.years)) issues.push('patch: "years" must be the complete list');
  if (issues.length) return {issues};
  const out: unknown[] = [...(inserted.get(-1) ?? [])];
  shots.forEach((shot, i) => {
    if (!removed.has(i)) out.push(replaced.has(i) ? replaced.get(i) : shot);
    out.push(...(inserted.get(i) ?? []));
  });
  return {act: {shots: out as ActOutput['shots'], years: (patch.years as ActOutput['years']) ?? base.years}, issues};
}

/** Shots listed one per line with their index, for repair prompts (so the model never counts). */
export const indexedAct = (act: ActOutput) =>
  [...act.shots.map((shot, i) => `${i}: ${JSON.stringify(shot)}`), `years: ${JSON.stringify(act.years ?? [])}`].join('\n');
