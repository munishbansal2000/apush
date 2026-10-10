/**
 * Layout pre-check without a browser: every frame of a resolved plan is simulated from the same formulas the renderer
 * uses (map projection and camera, tilt, year stamps, the docked Episode Sheet, name tags, point bullets) and pairs of
 * visible elements that would collide are reported. Text sizes are estimates, so this predicts rather than decides:
 * the build logs the predictions, and the contact sheet renders the predicted frames (and the frames where things
 * move: year stamp slams, NOW entrances, sheet transitions) so the real guard confirms or clears them early, instead
 * of the full render finding them one segment at a time.
 */
import {cameraAt, worldProjection} from '../../src/motion/world';
import {labelBox, labelVisibility, type ChromeZone} from '../../src/documentary/chrome-zones';
import {dockedOpacity} from '../../src/documentary/DocEpisode';
import {sheetTransform} from '../../src/documentary/sheet';
import {YEAR_STAMP_LEAD_SEC, yearStampSpans, yearStampVisible, yearStampZone} from '../../src/documentary/shots';
import kitConfig from '../../src/data/kit-render-config.json';
import type {DocShot, MapShot, PointShot, PortraitShot} from '../../src/documentary/types';
import type {ResolvedShotPlan} from './shots';

type Box = [number, number, number, number];
interface Item {id: string; box: Box; opacity: number}
export interface LayoutRisk {frames: [number, number]; a: string; b: string}
export interface LayoutPrediction {collisions: LayoutRisk[]; riskFrames: {frame: number; why: string}[]}

const W = 1920;
const H = 1080;
const SHEET_STAGE: Box = [0.15, 0.12, 0.85, 0.88];
const SHEET_RECT = (kitConfig as unknown as {boxTracker: {rect: Box}}).boxTracker.rect;
const TOL = (kitConfig as unknown as {guard: {clipTolerancePx: number}}).guard.clipTolerancePx;
const LABEL_STYLE = {region: {size: 46, spacing: 0.22}, ocean: {size: 40, spacing: 0.35}, town: {size: 30, spacing: 0.08}} as const;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

/** Screen position of a point on a tilted table map (CSS perspective(1.8H) rotateX(tilt) scale(1 + tilt/60), origin 50% 60%). */
function tilted([x, y]: [number, number], tilt: number): [number, number] {
  if (!tilt) return [x, y];
  const ox = W * 0.5, oy = H * 0.6, d = H * 1.8, s = 1 + tilt / 60, a = (tilt * Math.PI) / 180;
  const X = s * (x - ox), Y = s * (y - oy);
  const k = d / (d - Y * Math.sin(a));
  return [ox + X * k, oy + Y * Math.cos(a) * k];
}

/** Map labels (and point labels) of a map shot at time t, as the renderer places them. */
function mapItems(shot: MapShot, t: number, zones: ChromeZone[], cache: Map<string, unknown>): Item[] {
  const key = shot.id;
  let c = cache.get(key) as {proj: ReturnType<typeof worldProjection>; keys: {t: number; center: [number, number]; zoom: number; ease?: number}[]} | undefined;
  if (!c) {
    c = {proj: worldProjection({extent: shot.extent, projection: shot.projection, states: false} as never), keys: shot.camera.map(k => ({t: k.sec, center: k.center, zoom: k.zoom, ease: k.ease}))};
    cache.set(key, c);
  }
  const cam = cameraAt(c.keys as never, t, c.proj, W);
  const next = cameraAt(c.keys as never, t + 1 / 30, c.proj, W);
  // A moving camera puts map content in transit: the guard does not judge it (nor do we).
  if (Math.abs(next.x - cam.x) * cam.s > 0.5 || Math.abs(next.y - cam.y) * cam.s > 0.5 || Math.abs(next.s / cam.s - 1) > 0.002) return [];
  const labels = [
    ...(shot.labels ?? []).map(l => ({text: l.text, at: l.at, sec: l.sec, style: l.style ?? 'region', dy: 0})),
    ...(shot.points ?? []).filter(p => p.label).map(p => ({text: p.label!, at: p.at, sec: p.sec + 0.15, style: 'town' as const, dy: -34})),
  ];
  const out: Item[] = [];
  for (const l of labels) {
    const fade = ramp(t, l.sec, l.sec + 0.6);
    if (fade <= 0) continue;
    const p = c.proj(l.at);
    if (!p) continue;
    const st = LABEL_STYLE[l.style];
    const sx = W / 2 + (p[0] - cam.x) * cam.s;
    const sy = H / 2 + (p[1] + l.dy / cam.s - cam.y) * cam.s;
    // Visibility exactly as MapLabel computes it (untilted box), position as it lands on screen (tilted).
    const opacity = fade * labelVisibility(labelBox(sx, sy, l.text, st.size, st.spacing), W, H, zones);
    const [tx, ty] = tilted([sx, sy], shot.tilt ?? 0);
    out.push({id: `map label: ${l.text}`, box: labelBox(tx, ty, l.text, st.size, st.spacing), opacity});
  }
  if (shot.approx) out.push({id: 'approx note', box: [W - 120 - 290, H - 70 - 32, W - 120, H - 70], opacity: 1});
  return out;
}

function pointItems(shot: PointShot, t: number): Item[] {
  // Column centred vertically between 200px margins; 84px display type, 1.15 line height, 48px gaps; bar + gap 106px.
  const textW = W - 400 - 106;
  const lines = shot.bullets.map(b => Math.max(1, Math.ceil((b.text.length * 84 * 0.6) / textW)));
  const heights = lines.map(n => n * 84 * 1.15);
  const total = heights.reduce((a, b) => a + b, 0) + 48 * Math.max(0, heights.length - 1);
  let y = (H - total) / 2;
  return shot.bullets.map((b, i) => {
    const top = y;
    y += heights[i] + 48;
    const width = Math.min(textW, b.text.length * 84 * 0.6) + 106;
    return {id: `point ${i + 1}`, box: [200, top, 200 + width, top + heights[i]] as Box, opacity: ramp(t, b.sec, b.sec + 0.5)};
  }).filter(it => it.opacity > 0);
}

function nameTag(shot: PortraitShot, t: number): Item[] {
  if (!shot.name) return [];
  const local = t - shot.startSec;
  const opacity = Math.min(ramp(local, 0.35, 0.8), 1 - ramp(local, 2.6, 3.0));
  if (opacity <= 0) return [];
  const width = Math.max(shot.name.length * 64 * 0.62, (shot.role ?? '').length * 34 * 0.5);
  const height = 22 + 64 * 1.2 + (shot.role ? 8 + 34 * 1.2 : 0);
  return [{id: 'name tag', box: [120, H - 130 - height, 120 + width, H - 130], opacity}];
}

const overlaps = (a: Box, b: Box) => Math.min(a[2], b[2]) - Math.max(a[0], b[0]) > 2 * TOL && Math.min(a[3], b[3]) - Math.max(a[1], b[1]) > 2 * TOL;

export function predictLayout(resolved: Pick<ResolvedShotPlan, 'shots' | 'years' | 'boxes' | 'endSec'>, fps = 30): LayoutPrediction {
  const years = [...resolved.years].sort((a, b) => a.sec - b.sec);
  const spans = yearStampSpans(years);
  const boxes = resolved.boxes ?? [];
  const shots = resolved.shots as DocShot[];
  const cache = new Map<string, unknown>();
  const runs = new Map<string, LayoutRisk>();
  const riskFrames: {frame: number; why: string}[] = [];
  const last = Math.round(resolved.endSec * fps);
  let phase = '';
  for (let frame = 0; frame <= last; frame++) {
    const t = frame / fps;
    const shot = shots.find(s => t >= s.startSec && t < s.endSec);
    // Chrome: year stamps and the docked Episode Sheet, with the zones map labels give way to.
    const chrome: Item[] = [];
    const zones: ChromeZone[] = [];
    years.forEach((y, i) => {
      if (t < y.sec - YEAR_STAMP_LEAD_SEC || t >= y.sec + spans[i]) return;
      const f = frame - Math.round(y.sec * fps);
      const zone = yearStampZone(y.text, f, fps, W, H, spans[i]);
      zones.push(zone);
      chrome.push({id: `chrome:year-${y.text}`, box: zone.rect, opacity: yearStampVisible(f, fps, spans[i])});
    });
    const sheet = boxes.length ? sheetTransform(boxes.map(b => b.introSec), t, {width: W, height: H}, SHEET_RECT, SHEET_STAGE) : null;
    if (sheet && sheet.phase !== phase) { if (phase) riskFrames.push({frame, why: `episode sheet: ${phase} -> ${sheet.phase}`}); phase = sheet.phase; }
    const onQuestion = shot?.type === 'question';
    const sheetOpacity = sheet?.phase === 'docked' ? (onQuestion ? 0 : dockedOpacity(t, boxes)) : 0;
    if (sheetOpacity > 0) {
      const rect: Box = [SHEET_RECT[0] * W, SHEET_RECT[1] * H, SHEET_RECT[2] * W, SHEET_RECT[3] * H];
      chrome.push({id: 'chrome:box-tracker', box: rect, opacity: sheetOpacity});
      zones.push({rect, opacity: Math.min(1, sheetOpacity / 0.04)});
    }
    const content: Item[] = !shot ? [] : shot.type === 'map' ? mapItems(shot as MapShot, t, zones, cache) : shot.type === 'point' ? pointItems(shot as PointShot, t) : shot.type === 'portrait' ? nameTag(shot as PortraitShot, t) : [];
    const visible = [...chrome, ...content].filter(it => it.opacity >= 0.05);
    for (let i = 0; i < visible.length; i++) for (let j = i + 1; j < visible.length; j++) {
      const [a, b] = [visible[i], visible[j]];
      if (!overlaps(a.box, b.box)) continue;
      const key = `${a.id}|${b.id}`;
      const run = runs.get(key);
      if (run && run.frames[1] >= frame - 1) run.frames[1] = frame;
      else { if (run) runs.set(`${key}@${run.frames[0]}`, run); runs.set(key, {frames: [frame, frame], a: a.id, b: b.id}); }
    }
  }
  const collisions = [...runs.values()].sort((x, y) => x.frames[0] - y.frames[0]);
  // Frames the contact sheet renders in the browser: each predicted collision (start, middle, end) and every moment
  // something moves on screen (year stamp lead-in and slam, NOW entrances).
  for (const c of collisions) for (const f of new Set([c.frames[0], Math.round((c.frames[0] + c.frames[1]) / 2), c.frames[1]])) riskFrames.push({frame: f, why: `predicted: ${c.a} x ${c.b}`});
  years.forEach((y, i) => {
    const at = Math.round(y.sec * fps);
    for (const d of [-Math.round(YEAR_STAMP_LEAD_SEC * fps), 0, 2, 5, 9, Math.round(spans[i] * fps) - 3]) riskFrames.push({frame: at + d, why: `year ${y.text} ${d < 0 ? 'lead-in' : d <= 9 ? 'slam' : 'fade'}`});
  });
  for (const b of boxes) for (const d of [1, 4, 8]) riskFrames.push({frame: Math.round(b.startSec * fps) + d, why: `NOW entrance: ${b.label}`});
  const seen = new Set<number>();
  return {collisions, riskFrames: riskFrames.filter(r => r.frame >= 0 && r.frame <= last && !seen.has(r.frame) && seen.add(r.frame)).sort((a, b) => a.frame - b.frame)};
}
