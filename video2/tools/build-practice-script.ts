/**
 * data/practice/<unit>.json → script/<unit>-practice.md (generated; edit the JSON, not the script).
 * The generated script then goes through the normal pipeline (build:turns, build:tts, …).
 *   --unit u1
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { arg, ROOT } from './lib';

export interface PracticeQuestion {
  id: string;
  topic: string;
  episode: string;
  format: string;
  ask: string;
  card: { stem: string; source?: { title: string; text: string } };
  prompt: string;
  pauseSec: number;
  answer: string;
  reveal: string;
  why?: string;
  facts: string[];
}
export interface PracticeFile { unit: string; title: string; intro: string; outro: string; questions: PracticeQuestion[] }

const unit = arg('unit', 'u1')!;
const data = JSON.parse(readFileSync(join(ROOT, 'data/practice', `${unit}.json`), 'utf8')) as PracticeFile;
const words = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const problems: string[] = [];
data.questions.forEach((q, i) => {
  if (!q.ask.toLowerCase().startsWith(`question ${words[i]}.`)) problems.push(`${q.id}: ask must start with "Question ${words[i]}." (anchors and Shorts rely on it)`);
  if (![5, 10, 15, 20].includes(q.pauseSec)) problems.push(`${q.id}: pauseSec must be 5, 10, 15 or 20`);
});
if (problems.length) {
  for (const p of problems) console.error(`  ! ${p}`);
  process.exit(1);
}
const lines = [
  `# ${data.title}: GENERATED from data/practice/${unit}.json by tools/build-practice-script.ts. Do not edit; edit the JSON.`,
  `# @episode: ${unit}-practice`,
  '# @kind: practice',
  '',
  `Maya: ${data.intro}`,
  '',
];
for (const q of data.questions) {
  lines.push(`Marcus: ${q.ask}`, '', `[${q.pauseSec}-second pause]`, '', `Marcus: ${q.answer}`, '');
  if (q.why) lines.push(`Maya: ${q.why}`, '');
}
lines.push(`Maya: ${data.outro}`, '');
const out = join(ROOT, 'script', `${unit}-practice.md`);
writeFileSync(out, lines.join('\n'));
console.log(`script/${unit}-practice.md: ${data.questions.length} questions`);
