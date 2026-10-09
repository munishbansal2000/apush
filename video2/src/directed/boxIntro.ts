/**
 * Episode Sheet entrance: the sheet appears large in the middle of the stage while the boxes are named, holds a
 * moment after the last one, then flies into its corner rect and docks. Pure timing/geometry so it can be tested.
 */
export type Rect = [number, number, number, number];
export interface SheetTransform {phase: 'hidden' | 'big' | 'flying' | 'docked'; scale: number; tx: number; ty: number; dim: number}

export const INTRO_HOLD_SEC = 1.0;
export const INTRO_FLY_SEC = 0.9;
/** Width of the big sheet as a fraction of the frame. */
export const BIG_WIDTH = 0.42;
const STAGE_DIM = 0.55;

const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** introSec: when each box is named. Transform maps the docked sheet (trackerRect) onto its big position. */
export function sheetTransform(introSec: number[], t: number, size: {width: number; height: number}, trackerRect: Rect, stageRect: Rect): SheetTransform {
  const docked: SheetTransform = {phase: 'docked', scale: 1, tx: 0, ty: 0, dim: 0};
  if (!introSec.length) return {...docked, phase: 'hidden'};
  const first = Math.min(...introSec);
  const last = Math.max(...introSec);
  if (t < first - 0.25) return {...docked, phase: 'hidden'};
  const {width: W, height: H} = size;
  const trackerW = (trackerRect[2] - trackerRect[0]) * W;
  const big = (BIG_WIDTH * W) / trackerW;
  // Centre of the docked sheet must land on the centre of the stage: big * c + t = target.
  const cx = ((trackerRect[0] + trackerRect[2]) / 2) * W;
  const cy = ((trackerRect[1] + trackerRect[3]) / 2) * H;
  const sx = ((stageRect[0] + stageRect[2]) / 2) * W;
  const sy = ((stageRect[1] + stageRect[3]) / 2) * H;
  const flyStart = last + INTRO_HOLD_SEC;
  if (t < flyStart) return {phase: 'big', scale: big, tx: sx - big * cx, ty: sy - big * cy, dim: STAGE_DIM};
  const p = (t - flyStart) / INTRO_FLY_SEC;
  if (p >= 1 - 1e-9) return docked; // tolerate float rounding at the landing frame
  const e = easeInOutCubic(p);
  const scale = big + (1 - big) * e;
  return {phase: 'flying', scale, tx: (sx - big * cx) * (1 - e), ty: (sy - big * cy) * (1 - e), dim: STAGE_DIM * (1 - e)};
}
