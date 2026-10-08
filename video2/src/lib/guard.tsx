/**
 * Runtime layout guard — ONE implementation, in src/kit/guard.tsx. This module re-exports it
 * for the legacy components (EpisodeShell, Kit*), so every scene reports `[kit-layout]` lines
 * that tools/render.ts, preview.ts, contact-sheet.ts and gallery-sheet.ts collect.
 * (A separate copy used to log `[layout-guard]`, which no tool read: its findings were lost.)
 */
import type { GuardCfg } from '../kit/guard';

export { GUARD_WRAPPER, LayoutGuard, measureTracks, Track } from '../kit/guard';
export type { GuardCfg, GuardIssue, TrackRole } from '../kit/guard';
export type { Rect } from '../kit/layout';

export type GuardConfig = GuardCfg;

/** Default config: 5% safe margins, sensible tolerances. Prefer render-config.json. */
export const DEFAULT_GUARD_CONFIG: GuardConfig = {
  safe: [0.05, 0.05, 0.95, 0.95],
  guard: { overlapMinArea: 0.0001, clipTolerancePx: 2, epsilon: 0.001 },
};

/** Load GuardConfig from render-config.json (subset of the full config). */
export function guardConfigFromRenderConfig(rc: GuardConfig): GuardConfig {
  return { safe: rc.safe, guard: rc.guard };
}
