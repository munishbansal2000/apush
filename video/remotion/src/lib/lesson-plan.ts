/**
 * Lesson plan: declarative episode structure adapted from apush-episode-kit's EpisodeSpec.
 *
 * Their spec is declarative (sections, beats, pause cards, traps, chapters — all
 * anchored to script text). Ours is imperative (SUB_BEATS with turnId + offset).
 * This bridges them: the plan declares the structure, SUB_BEATS provide the beats.
 *
 * The plan is the source of truth for:
 * - sections (tone + background, replacing hardcoded turn-number ladders)
 * - pause cards (prompt/reveal for every [pause] turn)
 * - traps (exam traps with myth/fact correction)
 * - chapters (labeled sections for navigation)
 *
 * Beats stay in SUB_BEATS format but gain optional `anchor` fields.
 * A build step resolves anchors → turnId + offset via lib/anchors.ts.
 */
import type { Anchor } from './anchors';

export type Tone = 'playful' | 'serious' | 'sobering' | 'recap';

export interface SectionPlan {
  /** Where this section starts (script text anchor). */
  from: Anchor;
  tone: Tone;
  /** Background image for this section. */
  bg: string;
}

export interface PauseCardPlan {
  /** The question turn immediately before the pause. */
  after: Anchor;
  kind: 'predict' | 'selftest';
  prompt: string;
  /** Shown after the pause so learners can grade themselves. */
  reveal: string;
}

export interface TrapPlan {
  /** The trap line (deliberate mistake). */
  at: Anchor;
  /** ≤40 chars: the mistake, as the student would say it. */
  myth: string;
  /** ≤48 chars: the correction. */
  fact: string;
}

export interface ChapterPlan {
  label: string;
  at: Anchor;
  /** Box number, when this chapter covers a box. */
  box?: number;
}

export interface LessonPlan {
  id: string;
  /** Manifest key prefix, e.g. 'E3'. */
  manifestKey: string;
  title: {
    kicker: string;
    title: string;
    subline: string;
    at: Anchor;
  };
  sections: SectionPlan[];
  pauseCards: PauseCardPlan[];
  traps: TrapPlan[];
  chapters: ChapterPlan[];
}

/** Identity helper for type safety and editor completion. */
export const defineLessonPlan = <T extends LessonPlan>(plan: T): T => plan;
