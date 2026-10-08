/**
 * U1 Practice — built entirely from data/practice/u1.json (the script is generated from the
 * same file by tools/build-practice-script.ts). Edit questions there, never here.
 */
import practice from '../../data/practice/u1.json';
import { defineEpisode } from '../kit/episode';
import type { Beat } from '../kit/types';

const X = 0.38;
const GOLD = '#ffd166';
const NUM = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const qs = practice.questions as {
  id: string; format: string; prompt: string; reveal: string; why?: string;
  card: { stem: string; source?: { title: string; text: string } };
}[];
const ask = (i: number) => ({ turn: `Question ${NUM[i]}.` });
const firstWords = (s: string, n = 5) => s.split(/\s+/).slice(0, n).join(' ');

export const u1Practice = defineEpisode({
  id: 'u1-practice',
  manifestKey: 'P1',
  script: 'script/u1-practice.md',
  title: { kicker: 'APUSH · UNIT 1', title: 'PRACTICE', subline: 'SAY IT OUT LOUD', at: { turn: 'Unit 1 practice.' } },
  sections: [{ from: { turn: 'Unit 1 practice.' }, tone: 'recap', bg: 'historic/u1e3/cantino-planisphere.jpg' }],
  traps: [],
  chapters: [
    { label: 'Intro', at: { turn: 'Unit 1 practice.' } },
    // every question is also its own vertical Short
    ...qs.map((q, i) => ({ label: `Question ${i + 1} · ${q.format}`, at: ask(i), short: true })),
  ],
  pauseCards: qs.map((q, i) => ({ after: ask(i), kind: 'selftest' as const, prompt: q.prompt, reveal: q.reveal })),
  beats: qs.flatMap((q, i): Beat[] => [
    { id: `q${i + 1}-card`, kind: 'question', at: ask(i), number: i + 1, format: q.format, stem: q.card.stem, ...(q.card.source ? { source: q.card.source } : {}) },
    ...(q.why
      ? [{ id: `q${i + 1}-why`, kind: 'text' as const, at: { turn: firstWords(q.why) }, text: 'WHY IT WORKS', level: 'subtitle' as const, position: [X, 0.2] as [number, number], color: GOLD }]
      : []),
  ]),
});
