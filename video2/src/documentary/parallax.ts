/**
 * 2.5D parallax on a still: the camera framing (framing.ts) plus a depth map. Points nearer than the focus point
 * shift with the camera move and push outward on a zoom; farther points do the opposite. Pure functions over pixel
 * arrays, so the warp is deterministic and testable without a browser.
 */
import type {Framing} from './types';
import type {ImageTransform} from './framing';

export interface PixelSource {data: Uint8ClampedArray; width: number; height: number}
export interface DepthSource {data: Float32Array; width: number; height: number}
/** Parallax for one frame: `shift` moves the nearest plane by that many output pixels; `dolly` scales it outward. */
export interface ParallaxMotion {shiftX: number; shiftY: number; dolly: number; ref: number}

/** Total parallax travel of the nearest plane over a shot, as a fraction of frame width. */
export const PARALLAX_TRAVEL = 0.022;
/** Extra outward growth of the nearest plane on a push-in, at the end of the shot. */
export const DOLLY_GAIN = 0.05;

/** Normalize a grayscale depth buffer (0..255, white = near) to 0..1 using the 2nd-98th percentile (robust to specks). */
export function normalizeDepth(gray: Uint8Array | Uint8ClampedArray, width: number, height: number, stride = 1): DepthSource {
  const n = width * height;
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) hist[gray[i * stride]]++;
  const pick = (q: number) => { let acc = 0; for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= q * n) return v; } return 255; };
  const lo = pick(0.02);
  const hi = Math.max(lo + 1, pick(0.98));
  const data = new Float32Array(n);
  for (let i = 0; i < n; i++) data[i] = Math.min(1, Math.max(0, (gray[i * stride] - lo) / (hi - lo)));
  return {data, width, height};
}

const depthAt = (depth: DepthSource, u: number, v: number, srcW: number, srcH: number) => {
  const x = Math.min(depth.width - 1, Math.max(0, Math.floor((u / srcW) * depth.width)));
  const y = Math.min(depth.height - 1, Math.max(0, Math.floor((v / srcH) * depth.height)));
  return depth.data[y * depth.width + x];
};

/**
 * Parallax motion at shot progress p (0..1, already eased) for a move from `from` to `to`. Symmetric around the
 * middle of the shot (no distortion at p = 0.5), so the maximum warp is half the travel.
 */
export function parallaxMotion(from: Framing, to: Framing, p: number, frameWidth: number, refDepth: number): ParallaxMotion {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  const centered = 2 * p - 1;
  const travel = PARALLAX_TRAVEL * frameWidth;
  // Camera moving right shows the scene sliding left; near planes slide further.
  const shiftX = len > 1e-3 ? (-dx / len) * travel * centered * 0.5 : 0;
  const shiftY = len > 1e-3 ? (-dy / len) * travel * centered * 0.5 : 0;
  const zoom = Math.log(to.zoom / from.zoom);
  // A push-in (zoom > 0) grows near planes faster; a pull-back shrinks them. Pure pans get a gentle push.
  const dolly = (Math.abs(zoom) > 0.02 ? Math.sign(zoom) : 0.4) * DOLLY_GAIN * centered * 0.5;
  return {shiftX, shiftY, dolly, ref: refDepth};
}

/** Depth at an image point (0..1 coordinates), for the focus reference. */
export const depthAtPoint = (depth: DepthSource, x: number, y: number) => depthAt(depth, x * depth.width, y * depth.height, depth.width, depth.height);

/**
 * Render one frame: for every output pixel, find its image point under the framing, read its depth, and sample the
 * image at that point displaced by the depth-weighted parallax. Nearest-neighbour sampling, edges clamped.
 */
export function warpFrame(out: Uint8ClampedArray, outW: number, outH: number, src: PixelSource, depth: DepthSource, t: ImageTransform, m: ParallaxMotion): void {
  const {data: px, width: sw, height: sh} = src;
  const cx = outW / 2;
  const cy = outH / 2;
  const inv = 1 / t.scale;
  for (let y = 0; y < outH; y++) {
    const v0 = (y - t.ty) * inv;
    for (let x = 0; x < outW; x++) {
      const u0 = (x - t.tx) * inv;
      const d = depthAt(depth, u0, v0, sw, sh) - m.ref;
      // Displacement in output pixels, then back into image coordinates.
      const ox = m.shiftX * d + (x - cx) * m.dolly * d;
      const oy = m.shiftY * d + (y - cy) * m.dolly * d;
      let u = Math.floor((x - ox - t.tx) * inv);
      let v = Math.floor((y - oy - t.ty) * inv);
      if (u < 0) u = 0; else if (u >= sw) u = sw - 1;
      if (v < 0) v = 0; else if (v >= sh) v = sh - 1;
      const s = (v * sw + u) * 4;
      const o = (y * outW + x) * 4;
      out[o] = px[s];
      out[o + 1] = px[s + 1];
      out[o + 2] = px[s + 2];
      out[o + 3] = 255;
    }
  }
}
