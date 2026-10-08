/**
 * Script parser. The markdown script is the source of truth for turns.
 *
 * Line grammar (everything else is an error):
 *   # comment / production note        (# @key: value lines are metadata)
 *   Maya: text {trap}                   speech turn; {tags} are production-only
 *   Marcus: {soft tone} text            leading {tag} is an emotion marker
 *   [10-second pause]                   pause turn (silence + on-screen prompt card)
 *   [hold 1.0s]                         held silence after the previous turn (no card)
 *   ## Sources                          everything after this is ignored
 */
import type { Issue, PauseTurn, ScriptMeta, ScriptTurn, SpeakerId, SpeechTurn } from './types';

const SPEECH_RE = /^([A-Z][a-z]+):\s+(.*)$/;
const PAUSE_RE = /^\[(\d+)-second pause\]$/;
const HOLD_RE = /^\[hold (\d+(?:\.\d+)?)s\]$/;
const META_RE = /^#\s*@(\w[\w-]*):\s*(.*)$/;
const TAG_RE = /\{([^}]+)\}/g;
const LEADING_TAG_RE = /^\{([^}]+)\}\s*/;

export interface ParsedScript {
  meta: ScriptMeta;
  turns: ScriptTurn[];
  issues: Issue[];
}

export const turnId = (idx: number): string => `t${String(idx).padStart(2, '0')}`;

export function parseScript(src: string, knownSpeakers: readonly string[]): ParsedScript {
  const issues: Issue[] = [];
  const turns: ScriptTurn[] = [];
  const meta: ScriptMeta = { episode: '', kind: 'episode', boxes: [], midcheck: null };
  const lines = src.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    const where = `script:${i + 1}`;
    if (/^##\s/.test(line)) break;
    if (!line) continue;

    const m = META_RE.exec(line);
    if (m) {
      const [, key, value] = m;
      if (key === 'episode') meta.episode = value.trim();
      else if (key === 'boxes') meta.boxes = value.split('|').map(s => s.trim()).filter(Boolean);
      else if (key === 'midcheck') meta.midcheck = Number(value.trim());
      else if (key === 'kind') {
        const k = value.trim();
        if (k === 'episode' || k === 'practice') meta.kind = k;
        else issues.push({ level: 'error', code: 'S001', where, msg: `@kind must be episode or practice, not "${k}"` });
      }
      else issues.push({ level: 'warn', code: 'S001', where, msg: `unknown metadata key @${key}` });
      continue;
    }
    if (line.startsWith('#')) continue;

    const pause = PAUSE_RE.exec(line);
    if (pause) {
      const t: PauseTurn = { id: turnId(turns.length), idx: turns.length, kind: 'pause', pauseSec: Number(pause[1]), line: i + 1 };
      turns.push(t);
      continue;
    }

    const hold = HOLD_RE.exec(line);
    if (hold) {
      const prev = turns[turns.length - 1];
      if (!prev || prev.kind !== 'speech') {
        issues.push({ level: 'error', code: 'S001', where, msg: '[hold] must follow a speech line' });
      } else {
        prev.holdAfterSec = Number(hold[1]);
      }
      continue;
    }

    const sp = SPEECH_RE.exec(line);
    if (sp) {
      const speaker = sp[1].toLowerCase();
      if (!knownSpeakers.includes(speaker)) {
        issues.push({ level: 'error', code: 'S002', where, msg: `unknown speaker "${sp[1]}"` });
        continue;
      }
      let body = sp[2];
      let emotion: string | undefined;
      const lead = LEADING_TAG_RE.exec(body);
      if (lead && lead[1] !== 'trap') {
        emotion = lead[1].trim();
        body = body.slice(lead[0].length);
      }
      const tags = [...body.matchAll(TAG_RE)].map(x => x[1].trim());
      const text = body.replace(TAG_RE, '').replace(/\s+/g, ' ').trim();
      if (!text) {
        issues.push({ level: 'error', code: 'S001', where, msg: 'empty speech line' });
        continue;
      }
      const t: SpeechTurn = {
        id: turnId(turns.length),
        idx: turns.length,
        kind: 'speech',
        speaker: speaker as SpeakerId,
        text,
        tags,
        ...(emotion ? { emotion } : {}),
        line: i + 1,
      };
      turns.push(t);
      continue;
    }

    issues.push({ level: 'error', code: 'S001', where, msg: `unparseable line: "${line.slice(0, 60)}"` });
  }

  if (!meta.episode) issues.push({ level: 'error', code: 'S001', where: 'script', msg: 'missing # @episode: metadata' });
  return { meta, turns, issues };
}

export const speechTurns = (turns: ScriptTurn[]): SpeechTurn[] =>
  turns.filter((t): t is SpeechTurn => t.kind === 'speech');
