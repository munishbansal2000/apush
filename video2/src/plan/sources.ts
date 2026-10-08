/**
 * Where plans get their data, narration and the plan files themselves.
 *
 * - In the Remotion bundle (webpack): `bundledSources()` collects every JSON file under
 *   src/data/motion (datasets), src/data/narration + src/data/prototype (narration timing) and
 *   src/plan/plans (plans) with webpack's require.context — adding a file is enough.
 * - In node (tools, tests, server-render checks) there is no webpack: tools/plan-lib.ts builds
 *   the same Sources object from the file system and passes it in explicitly.
 *
 * Data references: "statehood" → the whole dataset; "statehood#enslaved1860.states" → a path
 * (dot-separated keys, numeric indices for arrays; "#lines.0.coords").
 */
import type { NarrSentence } from './timing';

export interface NarrationFile { id?: string; sentences: NarrSentence[]; totalSec: number }

export interface Sources {
  /** dataset name (file name without .json) → JSON */
  data: Record<string, unknown>;
  /** project-relative path ("src/data/narration/x.json") → narration file */
  narration: Record<string, NarrationFile>;
  /** plan files (plan JSON, unvalidated) by file name */
  plans: Record<string, unknown>;
}

type Ctx = { keys(): string[]; (k: string): unknown };
type ReqWithContext = { context: (dir: string, deep: boolean, re: RegExp) => Ctx };

const fromCtx = (ctx: Ctx | null, key: (k: string) => string): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  if (!ctx) return out;
  for (const k of ctx.keys()) {
    const m = ctx(k) as { default?: unknown };
    out[key(k)] = m && typeof m === 'object' && 'default' in m && Object.keys(m).length === 1 ? m.default : m;
  }
  return out;
};

let cached: Sources | null = null;

/** All sources bundled by webpack (empty maps outside webpack). */
export function bundledSources(): Sources {
  if (cached) return cached;
  let data: Ctx | null = null;
  let narr: Ctx | null = null;
  let plans: Ctx | null = null;
  try {
    // literal require.context calls: webpack resolves them at build time
    data = (require as unknown as ReqWithContext).context('../data/motion', false, /\.json$/);
    narr = (require as unknown as ReqWithContext).context('../data', true, /^\.\/(narration|prototype)\/[^/]+\.json$/);
    plans = (require as unknown as ReqWithContext).context('./plans', false, /\.json$/);
  } catch {
    // node / tsx: no webpack — callers pass Sources explicitly (tools/plan-lib.ts)
  }
  cached = {
    data: fromCtx(data, k => k.replace(/^\.\//, '').replace(/\.json$/, '')),
    narration: fromCtx(narr, k => `src/data/${k.replace(/^\.\//, '')}`) as Record<string, NarrationFile>,
    plans: fromCtx(plans, k => k.replace(/^\.\//, '')),
  };
  return cached;
}

/** Split "name#a.b.0" → { name, path: ['a','b','0'] }. */
export const parseRef = (ref: string) => {
  const [name, path = ''] = ref.split('#');
  return { name, path: path ? path.split('.') : [] };
};

/**
 * Resolve a data reference. Returns the value plus every object on the way (for source
 * checks: an entry is sourced if it, or an ancestor on its path, has a `source`).
 */
export function resolveRef(ref: string, sources: Sources): { value?: unknown; chain: unknown[]; error?: string } {
  const { name, path } = parseRef(ref);
  if (!(name in sources.data)) return { chain: [], error: `no dataset "${name}" (src/data/motion/${name}.json; have: ${Object.keys(sources.data).join(', ') || 'none'})` };
  let cur: unknown = sources.data[name];
  const chain: unknown[] = [cur];
  for (const k of path) {
    if (cur && typeof cur === 'object' && k in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[k];
      chain.push(cur);
    } else {
      return { chain, error: `"${ref}": no "${k}" in ${name}${path.slice(0, path.indexOf(k)).map(p => `.${p}`).join('')}` };
    }
  }
  return { value: cur, chain };
}

/** "{a.b}" templates against a data root ("Sort by vote: {kansasNebraska.yea}–{kansasNebraska.nay}"). */
export function fillTemplate(s: string, root: unknown): string {
  return s.replace(/\{([\w.]+)\}/g, (m, p: string) => {
    let cur: unknown = root;
    for (const k of p.split('.')) cur = cur && typeof cur === 'object' ? (cur as Record<string, unknown>)[k] : undefined;
    if (typeof cur === 'number') return String(cur).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return cur === undefined ? m : String(cur);
  });
}
