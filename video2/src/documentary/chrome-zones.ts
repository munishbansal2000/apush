/**
 * Screen areas that chrome (the year stamp) occupies at this frame, so map labels underneath can step aside, and the
 * visibility rule for map labels: fade out near the frame edge instead of being cut, and under chrome while it is up.
 */
import {createContext} from 'react';

type Box = [number, number, number, number];
export interface ChromeZone {rect: Box; opacity: number}
export const ChromeZones = createContext<ChromeZone[]>([]);

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const PAD = 24;

/** 0..1 for a label's on-screen box: 0 at or past the frame edge (ramping in over `edge` px), and 0 under opaque chrome. */
export function labelVisibility(box: Box, frameW: number, frameH: number, zones: ChromeZone[], edge = 40): number {
  const inside = Math.min(box[0], box[1], frameW - box[2], frameH - box[3]);
  const inFrame = clamp01(inside / edge);
  const under = zones.reduce((m, z) => {
    const hit = box[0] < z.rect[2] + PAD && box[2] > z.rect[0] - PAD && box[1] < z.rect[3] + PAD && box[3] > z.rect[1] - PAD;
    return hit ? Math.max(m, z.opacity) : m;
  }, 0);
  return inFrame * (1 - under);
}

/** A map label's on-screen box from its centre and type size (uppercase display caps, letter-spaced; generous). */
export function labelBox(cx: number, cy: number, text: string, size: number, spacing: number): Box {
  const half = (text.length * size * (0.72 + spacing)) / 2;
  const halfH = size * 0.75;
  return [cx - half, cy - halfH, cx + half, cy + halfH];
}
