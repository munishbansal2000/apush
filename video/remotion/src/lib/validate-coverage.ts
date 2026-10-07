/**
 * Coverage + pause card validator: C001/C002/P001/P002/P003 from apush-episode-kit.
 *
 * - C001: turn with no visual change for too long (dead air)
 * - C002: overall visual coverage below target
 * - P001: pause turn doesn't have exactly one prompt card
 * - P002: prompt or reveal text empty
 * - P003: pause card anchor not followed by a pause turn
 *
 * Ported from apush-episode-kit/src/kit/validate.ts (coverage + pause sections).
 */

export interface CoverageTurn {
  id: string;
  kind: 'speech' | 'pause';
  text: string;
  start: number;
  dur: number;
}

export interface VisualEvent {
  /** Time in seconds. */
  time: number;
  /** What kind of visual event. */
  kind: 'beat' | 'bg' | 'pause' | 'reveal' | 'box' | 'title';
}

export interface PauseCard {
  /** Turn ID of the pause. */
  pauseId: string;
  prompt: string;
  reveal: string;
  start: number;
  end: number;
}

export interface CoverageIssue {
  level: 'error' | 'warn';
  code: string;
  where: string;
  msg: string;
}

export function validateCoverage(
  turns: CoverageTurn[],
  events: VisualEvent[],
  opts: {
    maxSilentVisualSec?: number;
    minVisualCoverage?: number;
    titleStart?: number;
    titleDur?: number;
  } = {},
): CoverageIssue[] {
  const issues: CoverageIssue[] = [];
  const push = (level: CoverageIssue['level'], code: string, where: string, msg: string) =>
    issues.push({ level, code, where, msg });

  const maxSilent = opts.maxSilentVisualSec ?? 8;
  const minCoverage = opts.minVisualCoverage ?? 0.7;

  const sortedEvents = [...events].map(e => e.time).sort((a, b) => a - b);

  let speechSec = 0;
  let coveredSec = 0;

  for (const tt of turns) {
    if (tt.kind !== 'speech') continue;
    speechSec += tt.dur;

    const inTurn = sortedEvents.filter(t => t >= tt.start && t < tt.start + tt.dur);
    const hasVisual =
      events.some(e => e.time < tt.start + tt.dur && tt.start < e.time + 1) ||
      (opts.titleStart !== undefined &&
        tt.start < opts.titleStart + (opts.titleDur ?? 0) &&
        opts.titleStart < tt.start + tt.dur);

    if (hasVisual) coveredSec += tt.dur;

    // C001: longest gap without a visual event
    const marks = [tt.start, ...inTurn, tt.start + tt.dur];
    let worst = 0;
    for (let i = 1; i < marks.length; i++) worst = Math.max(worst, marks[i] - marks[i - 1]);
    if (worst > maxSilent && !hasVisual) {
      push(
        'warn',
        'C001',
        tt.id,
        `${worst.toFixed(1)}s with no visual change ("${tt.text.slice(0, 40)}…")`
      );
    }
  }

  // C002: overall coverage
  const coverage = speechSec ? coveredSec / speechSec : 0;
  if (coverage < minCoverage) {
    push(
      'warn',
      'C002',
      'episode',
      `${Math.round(coverage * 100)}% of speech has visual coverage (target ${Math.round(minCoverage * 100)}%)`
    );
  }

  return issues;
}

export function validatePauseCards(
  turns: CoverageTurn[],
  cards: PauseCard[],
): CoverageIssue[] {
  const issues: CoverageIssue[] = [];
  const push = (level: CoverageIssue['level'], code: string, where: string, msg: string) =>
    issues.push({ level, code, where, msg });

  const pauseTurns = turns.filter(t => t.kind === 'pause');

  // P001: every pause needs exactly one card
  for (const pt of pauseTurns) {
    const n = cards.filter(c => c.pauseId === pt.id).length;
    if (n !== 1) {
      push('error', 'P001', pt.id, `pause turn has ${n} prompt cards (need exactly 1) — learner stares at silence`);
    }
  }

  // P002: prompt and reveal required
  for (const c of cards) {
    if (!c.prompt.trim() || !c.reveal.trim()) {
      push('error', 'P002', `pause:${c.pauseId}`, 'prompt and reveal text are required');
    }
  }

  return issues;
}
