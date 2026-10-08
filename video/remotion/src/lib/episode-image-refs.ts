/**
 * Shared image-reference collection for an episode.
 *
 * tools/validate-episode.ts (I004) and tools/sync-manifest.ts must agree on
 * the expected `used_in` convention `<EP>:<turnId>`, so both build it here.
 *
 * Sources, in order:
 *  1. kit beats (beats_kit.json): props.image -> beat turn_id
 *  2. lesson-plan sections: bg -> resolved section-start turn
 *     (anchors resolved with src/lib/anchors; unresolvable ones are skipped)
 *  3. legacy component beats (hand-built episodes): image fields -> turnId
 */
import { resolveAnchor, type TurnLike } from './anchors';

export interface ImageRef {
  image: string;
  turnId: string;
}

export interface KitBeatImage {
  turn_id: string;
  props?: { image?: string };
}

export interface PlanSectionImage {
  bg?: string;
  from?: unknown;
}

export function collectImageRefs(args: {
  kitBeats?: KitBeatImage[];
  planSections?: PlanSectionImage[];
  legacy?: ImageRef[];
  turns: TurnLike[];
  starts: number[];
  durations: number[];
}): ImageRef[] {
  const out = new Map<string, Set<string>>();
  const add = (image: string, turnId: string) => {
    if (!image || !image.startsWith('historic/')) return;
    const s = out.get(image) ?? new Set<string>();
    s.add(turnId);
    out.set(image, s);
  };

  for (const b of args.kitBeats ?? []) {
    const img = b.props?.image;
    if (img) add(img, b.turn_id);
  }

  const ctx = { turns: args.turns, starts: args.starts, durations: args.durations, wordTimes: {} };
  for (const s of args.planSections ?? []) {
    if (!s.bg || !s.from) continue;
    try {
      const r = resolveAnchor(s.from as { turn: string; word?: string }, ctx);
      add(s.bg, r.turnId);
    } catch {
      // Unresolvable anchor: the anchor checks flag it; skip here.
    }
  }

  for (const r of args.legacy ?? []) add(r.image, r.turnId);

  return [...out.entries()].flatMap(([image, turnIds]) =>
    [...turnIds].map(turnId => ({ image, turnId })),
  );
}
