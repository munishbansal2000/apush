/**
 * data/practice/<unit>.json → classroom quiz files (same questions as the practice video):
 *   out/<unit>-quiz.csv          one row per question (import into Google Forms / LMS)
 *   out/<unit>-answer-key.md     model answers, why, topic, source episode, fact ids
 *   --unit u1
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { arg, ROOT } from './lib';
import type { PracticeFile } from './build-practice-script';

const unit = arg('unit', 'u1')!;
const data = JSON.parse(readFileSync(join(ROOT, 'data/practice', `${unit}.json`), 'utf8')) as PracticeFile;
const csv = (v: string) => `"${v.replace(/"/g, '""')}"`;
const rows = [
  ['Number', 'Question', 'Source excerpt', 'Type', 'CED topic', 'Model answer'].map(csv).join(','),
  ...data.questions.map((q, i) =>
    [String(i + 1), q.card.stem, q.card.source ? `${q.card.source.title}: ${q.card.source.text}` : '', q.format, q.topic, q.answer].map(csv).join(','),
  ),
];
const key = [
  `# ${data.title}: answer key`,
  '',
  `Generated from \`data/practice/${unit}.json\` (the same questions as the practice video).`,
  '',
  ...data.questions.flatMap((q, i) => [
    `## ${i + 1}. ${q.format} (CED ${q.topic}, from ${q.episode})`,
    '',
    q.card.source ? `> **${q.card.source.title}:** ${q.card.source.text}\n` : '',
    `**Question.** ${q.card.stem}`,
    '',
    `**Model answer.** ${q.answer}`,
    '',
    q.why ? `**Why it scores.** ${q.why}\n` : '',
    `_Facts: ${q.facts.join(', ')}_`,
    '',
  ]),
];
mkdirSync(join(ROOT, 'out'), { recursive: true });
writeFileSync(join(ROOT, 'out', `${unit}-quiz.csv`), rows.join('\n') + '\n');
writeFileSync(join(ROOT, 'out', `${unit}-answer-key.md`), key.filter(l => l !== '').join('\n\n').replace(/\n\n\n+/g, '\n\n') + '\n');
console.log(`out/${unit}-quiz.csv (${data.questions.length} questions), out/${unit}-answer-key.md`);
