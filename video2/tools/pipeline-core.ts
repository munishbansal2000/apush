import {createHash} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync, readdirSync, renameSync} from 'node:fs';
import {basename, dirname, join, resolve} from 'node:path';

export type PipelineMode = 'dev' | 'prod';
export type PipelineStage = 'turns' | 'pronounce' | 'audio' | 'timing' | 'words' | 'images' | 'direct' | 'clips' | 'contact' | 'render';
export const PIPELINE_STAGES: PipelineStage[] = ['turns', 'pronounce', 'audio', 'timing', 'words', 'images', 'direct', 'clips', 'contact', 'render'];

export interface PipelineTurn {
  id: string;
  idx: number;
  kind: 'speech' | 'pause';
  speaker?: string;
  text?: string;
  pauseSec?: number;
  holdAfterSec?: number;
}

export interface DirectedScene {
  id: string;
  component: 'title' | 'ken_burns' | 'quote' | 'compare' | 'causal_chain' | 'highlight' | 'primary_source' | 'creative_clip' | 'chart' | 'spectrum' | 'stagger';
  turnIds: string[];
  props: Record<string, unknown>;
  transition?: 'cut' | 'crossfade' | 'dip';
  startSec?: number;
  endSec?: number;
}

export interface DirectedPlan {
  version: 1;
  episode: string;
  title: string;
  scenes: DirectedScene[];
}

export interface WordTiming {w: string; s: number; e: number}

export const sha256 = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

export function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), {recursive: true});
  const temp = join(dirname(path), `.${basename(path)}.${process.pid}.${Date.now()}.tmp`);
  try {
    writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, {encoding: 'utf8', flush: true});
    // The temp lives beside the destination, so rename is a same-filesystem
    // replacement: readers see either the old complete JSON or the new one.
    renameSync(temp, path);
  } catch (error) {
    if (existsSync(temp)) unlinkSync(temp);
    throw error;
  }
}

/** Reject missing, empty, malformed, unordered, or out-of-audio Vosk results. */
export function wordTimingIssues(
  turns: PipelineTurn[],
  durations: number[],
  words: Record<string, WordTiming[]>,
): string[] {
  const issues: string[] = [];
  for (const [index, turn] of turns.entries()) {
    if (turn.kind !== 'speech') continue;
    const rows = words[turn.id];
    if (!Array.isArray(rows)) { issues.push(`${turn.id}: missing Vosk result`); continue; }
    if (!rows.length) { issues.push(`${turn.id}: Vosk recognized no words`); continue; }
    let previousEnd = -1;
    for (const [wordIndex, row] of rows.entries()) {
      if (!row || typeof row.w !== 'string' || !row.w.trim() || !Number.isFinite(row.s) || !Number.isFinite(row.e) || row.s < 0 || row.e <= row.s) {
        issues.push(`${turn.id}[${wordIndex}]: invalid word timing`);
        continue;
      }
      if (row.s + 0.02 < previousEnd) issues.push(`${turn.id}[${wordIndex}]: word timings are out of order`);
      const duration = durations[index];
      if (Number.isFinite(duration) && row.e > duration + 0.25) issues.push(`${turn.id}[${wordIndex}]: word ends after audio (${row.e.toFixed(3)}s > ${duration.toFixed(3)}s)`);
      previousEnd = Math.max(previousEnd, row.e);
    }
  }
  return issues;
}

const norm = (s: string) => s.trim().toLowerCase();

/** Parse a transcript with `Speaker: text` lines and `[pause N]` markers. */
export function parseTranscript(source: string): PipelineTurn[] {
  const turns: PipelineTurn[] = [];
  for (const [lineNo, raw] of source.replace(/\r/g, '').split('\n').entries()) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    // Canonical audio_scripts files put a Markdown rule before the production
    // sources/footer. Nothing after it is spoken or sent to TTS.
    if (/^---+$/.test(line) && turns.some(t => t.kind === 'speech')) break;
    const pause = /^(?:\[(?:pause|silence)\s+([\d.]+)(?:s|\s*seconds?)?\]|\[([\d.]+)[- ]second pause\])$/i.exec(line);
    if (pause) {
      turns.push({id: `t${String(turns.length).padStart(2, '0')}`, idx: turns.length, kind: 'pause', pauseSec: Number(pause[1] ?? pause[2])});
      continue;
    }
    const speech = /^([^:]{1,40}):\s*(.+)$/.exec(line);
    if (!speech) throw new Error(`transcript line ${lineNo + 1} is not "Speaker: text" or [pause N]: ${line}`);
    turns.push({
      id: `t${String(turns.length).padStart(2, '0')}`,
      idx: turns.length,
      kind: 'speech',
      speaker: norm(speech[1]),
      text: speech[2].trim(),
    });
  }
  if (!turns.some(t => t.kind === 'speech')) throw new Error('transcript contains no speech turns');
  return turns;
}

export function normalizeTurns(value: unknown): PipelineTurn[] {
  const raw = Array.isArray(value) ? value : (value as {turns?: unknown[]})?.turns;
  if (!Array.isArray(raw)) throw new Error('turns JSON must be an array or {turns: [...]}');
  return raw.map((item, idx) => {
    const row = item as Record<string, unknown>;
    const pause = row.kind === 'pause' || norm(String(row.speaker ?? '')) === 'pause';
    return pause
      ? {id: String(row.id ?? `t${String(idx).padStart(2, '0')}`), idx, kind: 'pause', pauseSec: Number(row.pauseSec ?? row.duration ?? 3)}
      : {
          id: String(row.id ?? `t${String(idx).padStart(2, '0')}`), idx, kind: 'speech',
          speaker: norm(String(row.speaker ?? 'narrator')), text: String(row.text ?? '').trim(),
          holdAfterSec: row.holdAfterSec == null ? undefined : Number(row.holdAfterSec),
        };
  });
}

/** Resolve u3e1/u3-e1/u7l3/u7-l3/u1-cram to the canonical audio_scripts lesson. */
export function resolveAudioScript(audioRoot: string, episode: string): string | null {
  const compact = episode.toLowerCase().replace(/_/g, '-');
  const lesson = /^u(\d+)-?([el])(\d+)$/.exec(compact);
  const cram = /^u(\d+)-?cram$/.exec(compact);
  if (!lesson && !cram) return null;
  const unit = lesson?.[1] ?? cram![1];
  const token = lesson ? `u${unit}-${lesson[2]}${Number(lesson[3])}` : `u${unit}-cram`;
  const dir = join(resolve(audioRoot), `unit${unit}`);
  if (!existsSync(dir)) return null;
  const candidates = readdirSync(dir)
    .filter(name => name.toLowerCase().startsWith(`apush-audio-${token}-script-`) && name.toLowerCase().endsWith('.md'))
    .map(name => ({
      name,
      locked: /-locked\.md$/i.test(name),
      version: Number(/-v(\d+)-/i.exec(name)?.[1] ?? 0),
    }))
    .sort((a, b) => Number(b.locked) - Number(a.locked) || b.version - a.version || b.name.localeCompare(a.name));
  return candidates[0] ? join(dir, candidates[0].name) : null;
}

export interface NormalizePlanOpts {
  imageKeys?: Set<string> | string[];
  episode?: string;
  allowCreativeClip?: boolean;
}

function assertSafeImagePath(sceneId: string, label: string, image: unknown): void {
  if (typeof image !== 'string' || !image.trim()) throw new Error(`${sceneId}: ${label} must be a non-empty string`);
  if (/^(?:https?:|data:|blob:|\/)/i.test(image) || image.includes('..')) {
    throw new Error(`${sceneId}: ${label} must be a safe public/ relative path`);
  }
}

function collectImageRefs(scene: DirectedScene): string[] {
  const p = scene.props;
  const refs: string[] = [];
  const one = (v: unknown) => { if (typeof v === 'string' && v) refs.push(v); };
  switch (scene.component) {
    case 'ken_burns':
    case 'creative_clip':
      one(p.image);
      break;
    case 'stagger':
      if (Array.isArray(p.panels)) for (const panel of p.panels) {
        const r = panel as Record<string, unknown>;
        if (r && typeof r === 'object') one(r.image);
      }
      break;
  }
  return refs;
}

export function normalizePlan(plan: DirectedPlan, turns: PipelineTurn[], starts: number[], durations: number[], totalSec?: number, opts: NormalizePlanOpts = {}): DirectedPlan {
  if (plan.version !== 1 || !Array.isArray(plan.scenes) || !plan.scenes.length) throw new Error('director plan must be version 1 with scenes');
  if (!plan.title || !String(plan.title).trim()) throw new Error('director plan requires a non-empty title');
  if (opts.episode !== undefined && plan.episode !== opts.episode) {
    throw new Error(`director plan episode "${plan.episode}" does not match expected "${opts.episode}"`);
  }
  const index = new Map(turns.map((turn, i) => [turn.id, i]));
  const imageKeys = opts.imageKeys ? (opts.imageKeys instanceof Set ? opts.imageKeys : new Set(opts.imageKeys)) : null;
  let last = -1;
  const seenIds = new Set<string>();
  const allowed = new Set(['title', 'ken_burns', 'quote', 'compare', 'causal_chain', 'highlight', 'primary_source', 'creative_clip', 'chart', 'spectrum', 'stagger']);
  const scenes = plan.scenes.map((scene, sceneIndex) => {
    const sid = scene.id && String(scene.id).trim() ? String(scene.id) : `scene-${sceneIndex + 1}`;
    if (seenIds.has(sid)) throw new Error(`duplicate scene id "${sid}"`);
    seenIds.add(sid);
    if (!allowed.has(scene.component)) throw new Error(`${sid}: unsupported component ${scene.component}`);
    if (scene.transition !== undefined && scene.transition !== 'cut' && scene.transition !== 'crossfade' && scene.transition !== 'dip') {
      throw new Error(`${sid}: invalid transition "${scene.transition}"; must be cut, crossfade, or dip`);
    }
    if (scene.component === 'creative_clip' && opts.allowCreativeClip === false) {
      throw new Error(`${sid}: creative_clip is not allowed for this run (video-gen is off)`);
    }
    validateSceneProps({...scene, id: sid});
    if (imageKeys) {
      for (const ref of collectImageRefs({...scene, id: sid})) {
        if (!imageKeys.has(ref)) throw new Error(`${sid}: image "${ref}" is not in the images registry`);
      }
    }
    if (!Array.isArray(scene.turnIds) || !scene.turnIds.length) throw new Error(`${scene.id}: turnIds is empty`);
    const ids = scene.turnIds.map(id => {
      const i = index.get(id);
      if (i == null) throw new Error(`${scene.id}: unknown turn ${id}`);
      return i;
    });
    const lo = Math.min(...ids);
    const hi = Math.max(...ids);
    if (lo !== last + 1) throw new Error(`${scene.id}: scenes must cover turns contiguously; expected turn index ${last + 1}, got ${lo}`);
    if (ids.length !== hi - lo + 1) throw new Error(`${scene.id}: turnIds must be a contiguous range`);
    last = hi;
    const startSec = starts[lo];
    // Visuals meet on the next turn boundary. The final scene owns the audio
    // tail, so transitions cannot expose blank frames between spoken turns.
    const endSec = hi + 1 < turns.length ? starts[hi + 1] : (totalSec ?? starts[hi] + durations[hi] + (turns[hi].holdAfterSec ?? 0));
    if (!Number.isFinite(startSec) || !Number.isFinite(endSec) || endSec <= startSec) throw new Error(`${scene.id}: invalid measured timing`);
    return {...scene, id: sid, startSec, endSec};
  });
  if (last !== turns.length - 1) throw new Error(`director plan stops at turn ${last}; expected ${turns.length - 1}`);
  return {...plan, scenes};
}

function validateSceneProps(scene: DirectedScene): void {
  const p = scene.props;
  const text = (key: string) => typeof p[key] === 'string' && (p[key] as string).trim().length > 0;
  const object = (key: string) => !!p[key] && typeof p[key] === 'object' && !Array.isArray(p[key]);
  switch (scene.component) {
    case 'title':
      if (!text('title')) throw new Error(`${scene.id}: title component requires props.title`);
      break;
    case 'ken_burns': {
      if (!text('image')) throw new Error(`${scene.id}: ken_burns requires props.image`);
      const image = p.image as string;
      if (/^(?:https?:|data:|blob:|\/)/i.test(image) || image.includes('..')) throw new Error(`${scene.id}: image must be a safe public/ relative path`);
      break;
    }
    case 'quote':
      if (!text('quote')) throw new Error(`${scene.id}: quote requires props.quote`);
      break;
    case 'compare':
      if (!object('left') || !object('right')) throw new Error(`${scene.id}: compare requires left and right objects`);
      break;
    case 'causal_chain':
      if (!Array.isArray(p.nodes) || p.nodes.length < 2 || p.nodes.length > 5) throw new Error(`${scene.id}: causal_chain requires 2-5 nodes`);
      break;
    case 'highlight':
      if (!text('body') || !Array.isArray(p.highlights) || !p.highlights.length) throw new Error(`${scene.id}: highlight requires body and highlights`);
      break;
    case 'primary_source':
      for (const key of ['documentTitle', 'authorAndDate', 'excerptText', 'highlightedPhrase', 'hippType', 'hippExplanation']) {
        if (!text(key)) throw new Error(`${scene.id}: primary_source requires props.${key}`);
      }
      if (!(p.excerptText as string).includes(p.highlightedPhrase as string)) {
        throw new Error(`${scene.id}: highlightedPhrase must appear verbatim in excerptText`);
      }
      break;
    case 'chart':
      if (p.type !== 'bar' && p.type !== 'line') throw new Error(`${scene.id}: chart requires type bar|line`);
      if (!Array.isArray(p.data) || !p.data.length) throw new Error(`${scene.id}: chart requires data array`);
      break;
    case 'spectrum':
      if (!Array.isArray(p.axis) || p.axis.length !== 2) throw new Error(`${scene.id}: spectrum requires axis [left, right]`);
      if (!Array.isArray(p.markers) || !p.markers.length) throw new Error(`${scene.id}: spectrum requires markers`);
      break;
    case 'stagger':
      if (!Array.isArray(p.panels) || p.panels.length < 2) throw new Error(`${scene.id}: stagger requires 2+ panels`);
      break;
    case 'creative_clip': {
      if (!text('image') || !text('prompt')) throw new Error(`${scene.id}: creative_clip requires image and prompt`);
      if (/^(?:https?:|data:|blob:|\/)/i.test(p.image as string) || (p.image as string).includes('..')) throw new Error(`${scene.id}: creative image must be a safe public/ relative path`);
      const prompt = (p.prompt as string).trim();
      if (prompt.length < 20) throw new Error(`${scene.id}: creative prompt is too short`);
      if (/\b(camera|zoom|pan|tilt|dolly|tracking|crane|aerial|flyover)\b/i.test(prompt)) throw new Error(`${scene.id}: creative_clip prompt contains banned camera-move phrase; the factory does its own camera work`);
      break;
    }
      break;
  }
}

export function syncIssues(plan: DirectedPlan, turns: PipelineTurn[], starts: number[], durations: number[], totalSec: number, fps = 30): string[] {
  const issues: string[] = [];
  const tolerance = 0.5 / fps;
  if (turns.length !== starts.length || turns.length !== durations.length) issues.push(`turn/timing length mismatch: ${turns.length}/${starts.length}/${durations.length}`);
  for (let i = 0; i < Math.min(turns.length, starts.length, durations.length); i++) {
    if (!Number.isFinite(starts[i]) || !Number.isFinite(durations[i]) || durations[i] <= 0) issues.push(`${turns[i].id}: invalid audio timing`);
    if (i && starts[i] < starts[i - 1] + durations[i - 1] - tolerance) issues.push(`${turns[i].id}: audio overlaps previous turn`);
  }
  let cursor = 0;
  for (const scene of plan.scenes) {
    if (scene.startSec == null || scene.endSec == null) { issues.push(`${scene.id}: unresolved scene timing`); continue; }
    if (Math.abs(scene.startSec - cursor) > tolerance && cursor !== 0) issues.push(`${scene.id}: visual gap/overlap ${(scene.startSec - cursor).toFixed(3)}s`);
    cursor = scene.endSec;
  }
  if (plan.scenes.length && Math.abs(cursor - totalSec) > tolerance) issues.push(`final scene ends at ${cursor.toFixed(3)}s, audio timeline ends at ${totalSec.toFixed(3)}s`);
  return issues;
}


/** Check transcript text against fact-registry forbid patterns and hedge requirements. */
/** Canvas-level warnings: text overflow, scene duration, visual monotony. Returns warnings (not errors). */
export function validateCanvas(plan: DirectedPlan): string[] {
  const warnings: string[] = [];
  let run = 1;
  for (let i = 0; i < plan.scenes.length; i++) {
    const scene = plan.scenes[i];
    const p = scene.props as Record<string, any>;
    const dur = (scene.endSec ?? 0) - (scene.startSec ?? 0);
    // Text overflow
    if (typeof p.title === 'string' && p.title.length > 80) {
      warnings.push(`${scene.id}: title is ${p.title.length} chars (may overflow at 1280x720)`);
    }
    if (typeof p.body === 'string' && p.body.length > 500) {
      warnings.push(`${scene.id}: body is ${p.body.length} chars (may overflow)`);
    }
    // Scene duration
    if (dur > 0 && dur < 2) {
      warnings.push(`${scene.id}: scene is ${dur.toFixed(1)}s (too fast to read)`);
    }
    if (dur > 60) {
      warnings.push(`${scene.id}: scene is ${dur.toFixed(1)}s (viewer fatigue risk)`);
    }
    // Visual monotony: >3 consecutive same component
    if (i > 0 && plan.scenes[i - 1].component === scene.component) {
      run++;
      if (run > 3) warnings.push(`${scene.id}: ${run} consecutive ${scene.component} scenes (visual monotony)`);
    } else run = 1;
  }
  return warnings;
}

export function checkFacts(turns: PipelineTurn[], factsPath: string): string[] {
  const issues: string[] = [];
  if (!existsSync(factsPath)) return issues;
  try {
    const registry = JSON.parse(readFileSync(factsPath, 'utf8')) as { facts?: any[] };
    for (const fact of registry.facts ?? []) {
      for (const f of fact.forbid ?? []) {
        const pattern = new RegExp(f.pattern, 'i');
        for (const turn of turns) {
          if (turn.kind !== 'speech' || !turn.text) continue;
          if (pattern.test(turn.text)) {
            issues.push(`${turn.id}: forbidden claim (${fact.id}): ${f.why}`);
          }
        }
      }
      if (fact.hedge) {
        const trigger = new RegExp(fact.hedge.trigger, 'i');
        for (const turn of turns) {
          if (turn.kind !== 'speech' || !turn.text) continue;
          if (trigger.test(turn.text)) {
            const hasHedge = fact.hedge.words.some((w: string) => turn.text!.toLowerCase().includes(w.toLowerCase()));
            if (!hasHedge) {
              issues.push(`${turn.id}: missing hedge for "${fact.hedge.trigger}" (${fact.id}): needs one of [${fact.hedge.words.join(', ')}]`);
            }
          }
        }
      }
    }
  } catch (e) {
    issues.push(`fact-registry parse error: ${e}`);
  }
  return issues;
}

export function selectedStages(only?: string, from?: string, full = false): PipelineStage[] {
  const normal = full ? PIPELINE_STAGES : PIPELINE_STAGES.filter(s => s !== 'render');
  if (only) {
    if (!PIPELINE_STAGES.includes(only as PipelineStage)) throw new Error(`unknown stage ${only}`);
    return [only as PipelineStage];
  }
  if (!from) return normal;
  const i = PIPELINE_STAGES.indexOf(from as PipelineStage);
  if (i < 0) throw new Error(`unknown stage ${from}`);
  return PIPELINE_STAGES.slice(i).filter(s => full || s !== 'render');
}
