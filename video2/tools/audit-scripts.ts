/**
 * Audit every canonical lesson script against the question/pause convention (docs/LOOK.md, "Questions"):
 *   R1  lessons end with a practice block: "<N> questions, AP-shaped", then 3 questions, each followed by a pause;
 *       an optional "One more, fast." bonus question may follow
 *   R2  every question pause is the uniform PAUSE_SEC (10s; audio_scripts/apush-final-guidelines.md: "one uniform 10s
 *       timeout across the fleet") — think-pauses, practice questions and the bonus alike
 *   R3  every pause of 5s or more comes right after a question or prompt ("?", "Your turn.", "Give both reasons." …)
 *   R4  every pause is followed by speech (the answer)
 *   R5  pause markers sit on their own line; a marker inside a spoken line is read straight through (no pause)
 * Crams are reported separately (their rapid-fire rhythm is deliberate). 2s pauses are beats and are ignored.
 *
 *   npx tsx tools/audit-scripts.ts            print the report and write docs/SCRIPT_AUDIT.md
 */
import {readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {basename, join, resolve} from 'node:path';
import {ROOT} from './lib';
import {parseTranscript, resolveAudioScript, type PipelineTurn} from './pipeline-core';

/** A question or an instruction to answer: "?" near the end, or a last sentence that is an imperative / a cue like "Eight seconds." */
const PROMPT_VERBS = 'name|give|list|explain|argue|defend|refute|prove|walk|think|reason|use|compare|contrast|identify|describe|pick|choose|say|tell|rank|decide|predict|imagine|make|answer|show|support|evaluate|connect';
export function isPrompt(text: string): boolean {
  const sentences = text.replace(/\[[^\]]*\]/g, '').trim().split(/(?<=[.?!])\s+/).filter(Boolean);
  const last = sentences[sentences.length - 1] ?? '';
  const tail = sentences.slice(-2).join(' ');
  if (tail.includes('?')) return true;
  // "Three: name two things…", "Using evidence from the episode, argue…": the instruction may follow a number or a clause.
  const instruction = last.replace(/^(?:one|two|three|four|five|six|\d+)[.:]\s*/i, '');
  if (new RegExp(`(?:^|,\\s+)(?:now\\s+|so\\s+|then\\s+)?(?:${PROMPT_VERBS})\\b`, 'i').test(instruction)) return true;
  // Stimulus questions: "…and asks why a bill that never became law mattered."
  if (/\basks (?:why|what|how|whether|which|who)\b/i.test(last)) return true;
  return /\b(?:your turn|make your case|defend or refute|\w+ seconds|go|one difference, one similarity|both reasons)[.!"”]*$/i.test(last);
}
const INLINE_PAUSE = /\[(?:(?:pause|silence)\s+[\d.]+[^\]]*|[\d.]+[- ]second pause)\]/i;
const BONUS_OPEN = /\bone more, fast\b/i;
/** The fleet-wide pause length for every question (apush-final-guidelines.md §self-test, §5). */
export const PAUSE_SEC = 10;
const PRACTICE_OPEN = /\b(?:three|two|four|five|\d)\s+questions\b/i;

export interface ScriptAudit {episode: string; file: string; kind: 'lesson' | 'cram'; thinkPauses: number; practiceQuestions: number; issues: string[]}

export function auditTurns(episode: string, file: string, turns: PipelineTurn[]): ScriptAudit {
  const kind = /cram$/.test(episode) ? 'cram' : 'lesson';
  const issues: string[] = [];
  const practiceStart = turns.findIndex((t, i) => t.kind === 'speech' && PRACTICE_OPEN.test(t.text ?? '') && i > turns.length * 0.5);
  let thinkPauses = 0;
  let practiceQuestions = 0;
  turns.forEach((t, i) => {
    if (t.kind !== 'pause' || (t.pauseSec ?? 0) < 5) return;
    const prev = turns[i - 1];
    const next = turns[i + 1];
    const where = `${t.id} (${t.pauseSec}s)`;
    if (!prev || prev.kind !== 'speech' || !isPrompt(prev.text ?? '')) issues.push(`R3 ${where}: not preceded by a question or prompt (…${(prev?.text ?? '').slice(-50)})`);
    if (!next || next.kind !== 'speech') issues.push(`R4 ${where}: not followed by an answer`);
    if (kind === 'cram') return;
    if (t.pauseSec !== PAUSE_SEC) issues.push(`R2 ${where}: question pauses are ${PAUSE_SEC}s (uniform, fleet-wide)`);
    const inPractice = practiceStart >= 0 && i > practiceStart;
    // "One more, fast." is a quick bonus, not a fourth AP question.
    if (inPractice && !BONUS_OPEN.test(prev?.text ?? '')) practiceQuestions++;
    else if (!inPractice) thinkPauses++;
  });
  for (const t of turns) {
    const inline = t.kind === 'speech' ? INLINE_PAUSE.exec(t.text ?? '') : null;
    if (inline) issues.push(`R5 ${t.id}: pause marker ${inline[0]} is inside a spoken line, so there is no pause; put it on its own line`);
  }
  if (kind === 'lesson') {
    if (practiceStart < 0) issues.push('R1 no practice block ("Three questions, AP-shaped." near the end)');
    else if (practiceQuestions !== 3) issues.push(`R1 practice block has ${practiceQuestions} question pause(s); expected 3`);
  }
  return {episode, file, kind, thinkPauses, practiceQuestions, issues};
}

function main() {
  const root = resolve(process.env.AUDIO_SCRIPTS_DIR ?? join(ROOT, '..', 'audio_scripts'));
  const episodes = new Set<string>();
  for (const unit of readdirSync(root).filter(d => d.startsWith('unit'))) for (const f of readdirSync(join(root, unit))) {
    const m = /apush-audio-(u\d+)-(e\d+|cram)-script/i.exec(f);
    if (m) episodes.add(`${m[1]}${m[2]}`.toLowerCase());
  }
  const order = (e: string) => { const m = /u(\d+)(?:e(\d+)|cram)/.exec(e)!; return Number(m[1]) * 1000 + (m[2] ? Number(m[2]) : 999); };
  const audits = [...episodes].sort((a, b) => order(a) - order(b)).flatMap(ep => {
    const file = resolveAudioScript(root, ep);
    if (!file) return [];
    return [auditTurns(ep, basename(file), parseTranscript(readFileSync(file, 'utf8')))];
  });
  const failing = audits.filter(a => a.kind === 'lesson' && a.issues.length);
  const crams = audits.filter(a => a.kind === 'cram');
  const lines = [
    '# Script audit: questions and pauses',
    '',
    `Generated by \`tools/audit-scripts.ts\` from the canonical scripts in \`../audio_scripts\`. Rules: R1 practice block (3 questions), R2 every question pause is ${PAUSE_SEC}s, R3 pause follows a question/prompt, R4 pause followed by an answer, R5 pause markers on their own line.`,
    '',
    `**${audits.filter(a => a.kind === 'lesson').length - failing.length} of ${audits.filter(a => a.kind === 'lesson').length} lessons follow the convention; ${failing.length} need fixes.**`,
    '',
    '| Lesson | Think pauses | Practice questions | Issues |',
    '|---|---|---|---|',
    ...audits.filter(a => a.kind === 'lesson').map(a => `| ${a.episode} | ${a.thinkPauses} | ${a.practiceQuestions} | ${a.issues.length ? a.issues.map(i => i.replace(/\|/g, '/')).join('<br>') : 'ok'} |`),
    '',
    '## Crams (reported, rhythm is deliberate)',
    '',
    ...crams.map(a => `- ${a.episode}: ${a.issues.length ? a.issues.join('; ') : 'ok'}`),
    '',
  ];
  writeFileSync(join(ROOT, 'docs', 'SCRIPT_AUDIT.md'), lines.join('\n'));
  console.log(lines.slice(4, 5).join('\n'));
  for (const a of failing) console.log(`  ${a.episode}: ${a.issues.join(' | ')}`);
  console.log('report -> docs/SCRIPT_AUDIT.md');
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) main();
