/** Camera framing on a still image: cover-fit, zoom, and centre a chosen point without ever showing an edge. */
import type {Framing} from './types';

export interface ImageTransform {scale: number; tx: number; ty: number}

/** Where to draw an image of `size` so `framing` fills a `frame` (scale applied to the image's own pixels). */
export function frameImage(size: {width: number; height: number}, framing: Framing, frame: {width: number; height: number}): ImageTransform {
  const cover = Math.max(frame.width / size.width, frame.height / size.height);
  const scale = cover * Math.max(1, framing.zoom);
  const w = size.width * scale;
  const h = size.height * scale;
  // Put the focus point at the frame centre, then clamp so the image always covers the frame.
  const tx = Math.min(0, Math.max(frame.width - w, frame.width / 2 - framing.x * w));
  const ty = Math.min(0, Math.max(frame.height - h, frame.height / 2 - framing.y * h));
  return {scale, tx, ty};
}

export const easeInOut = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

/** Framing at progress p (0..1) between two framings, eased. Zoom interpolates in log space so pushes feel even. */
export function framingAt(from: Framing, to: Framing, p: number): Framing {
  const e = easeInOut(Math.min(1, Math.max(0, p)));
  return {
    x: from.x + (to.x - from.x) * e,
    y: from.y + (to.y - from.y) * e,
    zoom: Math.exp(Math.log(from.zoom) + (Math.log(to.zoom) - Math.log(from.zoom)) * e),
  };
}

/**
 * How much an image is upscaled beyond its native pixels at the tightest framing (1 = native). Above ~1.6 the shot
 * looks soft; the planner rejects such shots.
 */
export function upscaleAt(size: {width: number; height: number}, framings: Framing[], frame: {width: number; height: number}): number {
  return Math.max(...framings.map(f => frameImage(size, f, frame).scale));
}
