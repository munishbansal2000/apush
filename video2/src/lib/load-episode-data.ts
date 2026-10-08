/**
 * Episode data loader: turns + timing for an episode.
 *
 * The pipeline (stage_tts.py / stage_timing.py) writes generated data to
 * out/data/{episode}/ (canonical). During the transition period, episodes
 * whose pipeline hasn't rerun yet still have data under src/data/.
 *
 * The dynamic require() lets the bundler tolerate missing files: webpack
 * builds a context module for each static prefix, and a file missing at
 * build time throws at *runtime* instead — where we catch it and fall back.
 * (Verified empirically: no build error when out/data is absent.)
 */

export interface Turn {
  id: string;
  speaker: string;
  text: string;
  duration_sec?: number;
  pause_after?: number;
}

export interface EpisodeData {
  turns: Turn[];
  starts: number[];
  durations: number[];
}

/**
 * Canonical episode key → data directories.
 * `out` is the pipeline's data_id (out/data/{out}/).
 * `src` is the legacy src/data subdir ('' = src/data root, used by E1).
 */
const DATA_DIRS: Record<string, { out: string; src: string }> = {
  e1: { out: 'e1', src: '' },
  e2: { out: 'e2', src: 'u1e2' },
  e3: { out: 'e3', src: 'e3' },
  e4: { out: 'e4', src: 'e4' },
  e5: { out: 'e5', src: 'e5' },
  e6: { out: 'e6', src: 'e6' },
  e7: { out: 'e7', src: 'e7' },
  e8: { out: 'e8', src: 'e8' },
  e9: { out: 'e9', src: 'e9' },
  u2e1: { out: 'u2e1', src: 'u2e1' },
  u2e2: { out: 'u2e2', src: 'u2e2' },
  u2e3: { out: 'u2e3', src: 'u2e3' },
  u2e4: { out: 'u2e4', src: 'u2e4' },
  u2e5: { out: 'u2e5', src: 'u2e5' },
  u2e6: { out: 'u2e6', src: 'u2e6' },
  u2e7: { out: 'u2e7', src: 'u2e7' },
  u2e8: { out: 'u2e8', src: 'u2e8' },
  u2e9: { out: 'u2e9', src: 'u2e9' },
  u2e10: { out: 'u2e10', src: 'u2e10' },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tryRequire(path: string): any | null {
  try {
    return require(path);
  } catch {
    return null;
  }
}

/**
 * Repair mojibake: UTF-8 text that was decoded as Windows-1252 somewhere in the pipeline
 * ("â€”" for "—", "Ã©" for "é"). Safety net only — fix the reader in the pipeline (open the
 * script with encoding='utf-8').
 */
const MOJIBAKE: [RegExp, string][] = [
  [/â€”/g, '—'], [/â€“/g, '–'], [/â€™/g, '’'], [/â€˜/g, '‘'], [/â€œ/g, '“'], [/â€\u009d|â€/g, '”'],
  [/â€¦/g, '…'], [/Ã©/g, 'é'], [/Ã¨/g, 'è'], [/Ã£/g, 'ã'], [/Ã¡/g, 'á'], [/Ãº/g, 'ú'], [/Ã³/g, 'ó'], [/Ã±/g, 'ñ'], [/Ã­/g, 'í'],
];
export const repairMojibake = (s: string): string => (/â€|Ã/.test(s) ? MOJIBAKE.reduce((acc, [re, to]) => acc.replace(re, to), s) : s);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asTurns(mod: any): Turn[] {
  if (!mod) return [];
  const raw = Array.isArray(mod) ? mod : mod.turns ?? [];
  const list = (Array.isArray(raw) ? raw : []) as Turn[];
  return list.map((t) => (typeof t.text === 'string' && /â€|Ã/.test(t.text) ? { ...t, text: repairMojibake(t.text) } : t));
}

export function loadEpisodeData(key: string): EpisodeData {
  const dirs = DATA_DIRS[key];
  if (!dirs) throw new Error(`loadEpisodeData: unknown episode key "${key}"`);

  // 1. Canonical location: out/data/{key}/
  let turnsMod = tryRequire(`../../out/data/${dirs.out}/turns.json`);
  let timingMod = tryRequire(`../../out/data/${dirs.out}/timing_map.json`);

  // 2. Transition fallback: src/data/...
  if (!turnsMod || !timingMod) {
    const srcBase = dirs.src ? `../data/${dirs.src}` : '../data';
    turnsMod = turnsMod ?? tryRequire(`${srcBase}/turns.json`);
    timingMod = timingMod ?? tryRequire(`${srcBase}/timing_map.json`);
  }

  if (!turnsMod || !timingMod) {
    // Return empty data instead of throwing — the episode component
    // will show a helpful error. This lets Root.tsx bundle even when
    // only some episodes have pipeline data.
    console.warn(
      `loadEpisodeData("${key}"): no data in out/data/${dirs.out}/ or src/data/${dirs.src || '(root)'}/. ` +
        `Run: python stage_tts.py --episode ${key.toUpperCase()} --provider edge`
    );
    return { turns: [], starts: [], durations: [] };
  }

  const timing = timingMod as { starts?: number[]; durations?: number[] };
  return {
    turns: asTurns(turnsMod),
    starts: timing.starts ?? [],
    durations: timing.durations ?? [],
  };
}
