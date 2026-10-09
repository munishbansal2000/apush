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

/** A spoken-line label: a plain name ("Maya", "MAYA", "Mr. Biddle"), never a bullet or markdown. */
const SPEAKER_LINE = /^(\p{L}[\p{L} .'-]{0,38}):\s*(.+)$/u;
/** Markdown headings that open the production-only footer ("## Sources (production only — never spoken)"). */
const FOOTER_HEADING = /^#{1,6}\s*(?:(?:sources?|references?|verification|production|notes?|changelog|fact[- ]check)\b|.*never spoken)/i;

/** Parse a transcript with `Speaker: text` lines and `[pause N]` markers. */
export function parseTranscript(source: string): PipelineTurn[] {
  const turns: PipelineTurn[] = [];
  for (const [lineNo, raw] of source.replace(/\r/g, '').split('\n').entries()) {
    const line = raw.trim();
    if (!line) continue;
    const started = turns.some(t => t.kind === 'speech');
    // Canonical audio_scripts files end the spoken part with a Markdown rule or a
    // "## Sources" heading. Nothing after it is spoken or sent to TTS.
    if (started && (/^---+$/.test(line) || FOOTER_HEADING.test(line))) break;
    if (line.startsWith('#')) continue;
    const pause = /^(?:\[(?:pause|silence)\s+(\d+(?:\.\d+)?)(?:s|\s*seconds?)?\]|\[(\d+(?:\.\d+)?)[- ]second pause\])$/i.exec(line);
    if (pause) {
      turns.push({id: `t${String(turns.length).padStart(2, '0')}`, idx: turns.length, kind: 'pause', pauseSec: Number(pause[1] ?? pause[2])});
      continue;
    }
    const speech = SPEAKER_LINE.exec(line);
    if (!speech) {
      // Header metadata (**Format:** …, rules, read notes) precedes the dialogue.
      if (!started) continue;
      throw new Error(`transcript line ${lineNo + 1} is not "Speaker: text" or [pause N]: ${line}`);
    }
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
  return raw.map((item, idx): PipelineTurn => {
    const row = item as Record<string, unknown>;
    const id = String(row.id ?? `t${String(idx).padStart(2, '0')}`);
    const pause = row.kind === 'pause' || norm(String(row.speaker ?? '')) === 'pause';
    if (pause) {
      const pauseSec = Number(row.pauseSec ?? row.duration ?? 3);
      if (!Number.isFinite(pauseSec) || pauseSec <= 0) throw new Error(`${id}: pause length must be a positive number of seconds`);
      return {id, idx, kind: 'pause', pauseSec};
    }
    const text = String(row.text ?? '').trim();
    if (!text) throw new Error(`${id}: speech turn has empty text`);
    const holdAfterSec = row.holdAfterSec == null ? undefined : Number(row.holdAfterSec);
    if (holdAfterSec !== undefined && (!Number.isFinite(holdAfterSec) || holdAfterSec < 0)) throw new Error(`${id}: holdAfterSec must be a non-negative number`);
    return {id, idx, kind: 'speech', speaker: norm(String(row.speaker ?? 'narrator')), text, holdAfterSec};
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

/** A forward-slash path inside public/: no scheme, drive, leading slash, backslash, empty or dot segments. */
export function isSafePublicPath(path: string): boolean {
  if (!path || /^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(path) || path.includes('\\')) return false;
  return path.split('/').every(segment => segment !== '' && segment !== '.' && segment !== '..');
}

interface FactEntry {
  id: string;
  forbid?: {pattern: string; why: string}[];
  hedge?: {trigger: string; words: string[]};
}

export function checkFacts(turns: PipelineTurn[], factsPath: string): string[] {
  const issues: string[] = [];
  if (!existsSync(factsPath)) return issues;
  try {
    const registry = JSON.parse(readFileSync(factsPath, 'utf8')) as {facts?: FactEntry[]};
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
            const hasHedge = fact.hedge.words.some(w => turn.text!.toLowerCase().includes(w.toLowerCase()));
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
  // --from render asks for the render explicitly; otherwise it still needs --full.
  return PIPELINE_STAGES.slice(i).filter(s => full || s !== 'render' || from === 'render');
}
