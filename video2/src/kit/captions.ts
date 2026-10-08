/** Caption chunks: one source for burned-in captions and the SRT export. */
import { wordOffset } from './anchors';
import { wrapLines } from './layout';
import type { TimelineTurn, WordTimesFile } from './types';

export interface CaptionChunk { text: string; start: number; end: number; speaker: string; turnId: string; words: { w: string; t: number }[] }

export function captionChunks(timeline: TimelineTurn[], wordTimes: WordTimesFile, maxChars: number): CaptionChunk[] {
  const out: CaptionChunk[] = [];
  for (const tt of timeline) {
    if (tt.turn.kind !== 'speech') continue;
    const turn = tt.turn;
    const lines = wrapLines(turn.text, maxChars);
    let tokenCursor = 0;
    const timed = lines.map(line => {
      const words = line.split(/\s+/).map(w => {
        const isWord = /[\p{L}\p{N}]/u.test(w);
        const t = tt.start + wordOffset(turn.text, tokenCursor, wordTimes[turn.id], tt.dur).offset;
        if (isWord) tokenCursor += Math.max(1, w.split(/[-–]/).filter(x => /[\p{L}\p{N}]/u.test(x)).length);
        return { w, t };
      });
      return { line, words, start: words[0]?.t ?? tt.start };
    });
    timed.forEach((c, i) => {
      out.push({
        text: c.line,
        start: c.start,
        end: i + 1 < timed.length ? timed[i + 1].start : tt.start + tt.dur,
        speaker: turn.speaker,
        turnId: turn.id,
        words: c.words,
      });
    });
  }
  return out;
}

const srtTime = (s: number) => {
  const ms = Math.round(s * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(h)}:${pad(m)}:${pad(sec)},${pad(ms % 1000, 3)}`;
};

export const toSrt = (chunks: CaptionChunk[]): string =>
  chunks.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`).join('\n');
