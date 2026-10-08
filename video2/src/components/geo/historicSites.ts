/**
 * Real-world [lon, lat] overlay data for the history map components (Oregon Trail, Louisiana
 * Purchase, Jumonville Glen). Everything here is projected with the same projection as the
 * vector base map (see usGeo.tsx), so overlays line up with the geography by construction.
 */
import type { GeoProjection } from 'd3-geo';
import { usProjection, type LonLat } from './usGeo';

type XY = [number, number];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Polyline helper: cumulative pixel lengths + point-at-length. */
export function polyline(points: XY[]) {
  const cum: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  }
  const total = cum[cum.length - 1];
  const at = (len: number): { x: number; y: number; angle: number } => {
    const l = Math.max(0, Math.min(total, len));
    let i = 1;
    while (i < cum.length - 1 && cum[i] < l) i++;
    const seg = cum[i] - cum[i - 1] || 1;
    const t = (l - cum[i - 1]) / seg;
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    return { x: lerp(x0, x1, t), y: lerp(y0, y1, t), angle: Math.atan2(y1 - y0, x1 - x0) };
  };
  const d = points.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ');
  return { points, cum, total, at, d };
}

/** Projects a [lon, lat] list (dropping points the projection rejects). */
export const projectAll = (projection: GeoProjection, pts: LonLat[]): XY[] =>
  pts.map(p => projection(p)).filter((p): p is XY => !!p);

/* ================================ OREGON TRAIL ================================ */

export const OREGON_TRAIL_EXTENT: [LonLat, LonLat] = [[-125, 37], [-92, 49]];

/** Trail waypoints east → west. `mile` marks named sites (real trail mileage, approx.). */
export const OREGON_TRAIL_ROUTE: { ll: LonLat; mile?: number; site?: string }[] = [
  { ll: [-94.42, 39.09], mile: 0, site: 'Independence, MO' },
  { ll: [-95.25, 38.95] }, // Wakarusa / Kansas River valley
  { ll: [-95.75, 39.05] }, // Kansas River crossing (Topeka)
  { ll: [-96.65, 39.8] }, // Big Blue crossing (Marysville)
  { ll: [-97.8, 40.2] }, // Little Blue
  { ll: [-98.98, 40.64], mile: 319, site: 'Fort Kearny' },
  { ll: [-99.9, 40.72] }, // up the Platte
  { ll: [-100.8, 41.05] }, // forks of the Platte
  { ll: [-101.75, 41.12] }, // along the South Platte
  { ll: [-102.12, 41.28] }, // Ash Hollow (cross to the North Platte)
  { ll: [-103.12, 41.62] }, // Courthouse Rock
  { ll: [-103.35, 41.7], mile: 552, site: 'Chimney Rock' },
  { ll: [-103.7, 41.84] }, // Scotts Bluff
  { ll: [-104.56, 42.21], mile: 640, site: 'Fort Laramie' },
  { ll: [-105.4, 42.72] }, // up the North Platte
  { ll: [-106.32, 42.86] }, // Platte crossing (Casper)
  { ll: [-107.13, 42.49], mile: 815, site: 'Independence Rock' },
  { ll: [-107.75, 42.45] }, // up the Sweetwater
  { ll: [-108.88, 42.37], mile: 914, site: 'South Pass' },
  { ll: [-109.75, 41.95] }, // Big Sandy / Green River
  { ll: [-110.39, 41.32], mile: 1026, site: 'Fort Bridger' },
  { ll: [-110.95, 42.08] }, // Bear River
  { ll: [-111.3, 42.32] },
  { ll: [-111.6, 42.65] }, // Soda Springs
  { ll: [-112.43, 43.02], mile: 1288, site: 'Fort Hall' },
  { ll: [-112.87, 42.78] }, // American Falls (down the Snake)
  { ll: [-113.8, 42.55] },
  { ll: [-114.6, 42.6] },
  { ll: [-115.3, 42.95] }, // Three Island Crossing
  { ll: [-116.2, 43.6] }, // Boise River
  { ll: [-116.92, 43.8], mile: 1514, site: 'Fort Boise' },
  { ll: [-117.23, 44.3] }, // Farewell Bend
  { ll: [-117.83, 44.78] }, // Baker valley
  { ll: [-118.09, 45.33] }, // Grande Ronde
  { ll: [-118.46, 46.04], mile: 1700, site: 'Whitman Mission' },
  { ll: [-119.3, 45.93] }, // Columbia at Umatilla
  { ll: [-120.2, 45.72] },
  { ll: [-121.18, 45.6], mile: 1930, site: 'The Dalles' },
  { ll: [-121.6, 45.25] }, // Barlow Road, south of Mount Hood
  { ll: [-122.1, 45.3] },
  { ll: [-122.61, 45.36], mile: 2170, site: 'Oregon City' },
];

export const OREGON_TRAIL_RIVERS = ['Missouri', 'Kansas', 'Platte', 'North Platte', 'South Platte', 'Snake', 'Columbia', 'Willamette', 'Green', 'Bear'];

export const OREGON_TRAIL_RIVER_LABELS: { name: string; ll: LonLat; angle: number }[] = [
  { name: 'Platte River', ll: [-97.3, 41.5], angle: -8 },
  { name: 'Snake River', ll: [-114.6, 42.38], angle: 0 },
  { name: 'Columbia River', ll: [-120.0, 45.4], angle: 0 },
  { name: 'Missouri River', ll: [-97.6, 42.95], angle: -25 },
];

/** Where the "Rocky Mountains" legend sits (clear of the trail labels). */
export const ROCKIES_LABEL: LonLat = [-108.0, 44.7];

export const OREGON_TRAIL_TOTAL_MILES = 2170;

/** Projection for the trail map: fitted to OREGON_TRAIL_EXTENT, trail centred between the HUD bands. */
export function oregonTrailProjection(width: number, height: number): GeoProjection {
  const proj = usProjection(width, height, OREGON_TRAIL_EXTENT, height * 0.06);
  const pts = projectAll(proj, OREGON_TRAIL_ROUTE.map(w => w.ll));
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const [tx, ty] = proj.translate();
  return proj.translate([tx + width / 2 - cx, ty + height * 0.5 - cy]);
}

/** Projected trail: polyline + mile→pixel-length mapping, so the line and wagon agree. */
export function oregonTrailLayout(projection: GeoProjection) {
  const pts = projectAll(projection, OREGON_TRAIL_ROUTE.map(w => w.ll));
  const line = polyline(pts);
  const anchors = OREGON_TRAIL_ROUTE.map((w, i) => ({ ...w, len: line.cum[i] })).filter(w => w.mile !== undefined) as {
    ll: LonLat; mile: number; site: string; len: number;
  }[];
  /** Pixel length along the trail for a mileage (linear between named sites). */
  const lenAtMile = (mile: number) => {
    for (let i = 1; i < anchors.length; i++) {
      const a = anchors[i - 1], b = anchors[i];
      if (mile <= b.mile) return lerp(a.len, b.len, Math.max(0, (mile - a.mile) / (b.mile - a.mile)));
    }
    return line.total;
  };
  const sites = anchors.map(a => {
    const [x, y] = projection(a.ll) ?? [0, 0];
    return { name: a.site, mile: a.mile, x, y };
  });
  return { line, lenAtMile, sites };
}

/* ============================== LOUISIANA PURCHASE ============================== */

export const LOUISIANA_EXTENT: [LonLat, LonLat] = [[-125.5, 23.5], [-66, 50.5]];

export const LOUISIANA_CITIES: { name: string; sub: string; ll: LonLat }[] = [
  { name: 'New Orleans', sub: 'Mississippi River Outlet', ll: [-90.07, 29.95] },
  { name: 'St. Louis', sub: 'Lewis & Clark (1804)', ll: [-90.2, 38.63] },
];

export const FORT_CLATSOP: LonLat = [-123.88, 46.13];
export const FORT_MANDAN: LonLat = [-101.27, 47.3];

/** Lewis & Clark outbound route (1804–05): up the Missouri, over the Divide, down the Columbia. */
export const LEWIS_CLARK_ROUTE: LonLat[] = [
  [-90.2, 38.63], [-90.48, 38.8], [-91.5, 38.7], [-92.6, 38.65], [-93.5, 39.2], [-94.6, 39.12], [-94.88, 39.75],
  [-95.55, 40.6], [-95.93, 41.26], [-96.4, 42.5], [-97.4, 42.86], [-98.4, 43.0], [-99.33, 43.78], [-100.35, 44.37],
  [-100.43, 45.54], [-100.78, 46.81], [-101.27, 47.3], [-102.4, 47.6], [-103.62, 48.12], [-104.9, 48.05],
  [-106.4, 48.0], [-107.9, 47.6], [-109.0, 47.65], [-110.0, 47.8], [-110.67, 47.82], [-111.3, 47.5],
  [-111.85, 46.9], [-111.55, 45.92], [-112.6, 45.25], [-113.45, 44.97], [-113.9, 45.6], [-114.1, 46.3],
  [-114.6, 46.63], [-115.6, 46.45], [-116.3, 46.45], [-117.03, 46.42], [-118.2, 46.55], [-119.03, 46.23],
  [-120.2, 45.72], [-121.18, 45.6], [-122.2, 45.6], [-122.8, 45.9], [-123.2, 46.17], [-123.88, 46.13],
];

/* ================================ JUMONVILLE GLEN ================================ */

/** Regional (Ohio Country) extent, the opening view. */
export const OHIO_COUNTRY_EXTENT: [LonLat, LonLat] = [[-81.2, 39.3], [-78.3, 42.1]];

export const OHIO_COUNTRY_SITES: { name: string; sub: string; ll: LonLat; side: 'french' | 'british' | 'native' }[] = [
  { name: 'Fort Duquesne', sub: 'Forks of the Ohio · French', ll: [-80.01, 40.44], side: 'french' },
  { name: 'Fort Le Boeuf', sub: 'French post (1753)', ll: [-80.0, 41.88], side: 'french' },
  { name: 'Logstown', sub: 'Seneca–Mingo town', ll: [-80.24, 40.6], side: 'native' },
  { name: "Gist's Plantation", sub: 'Frontier settlement', ll: [-79.57, 40.03], side: 'british' },
  { name: 'Wills Creek', sub: 'Virginia supply base', ll: [-78.76, 39.65], side: 'british' },
];

export const GREAT_MEADOWS: LonLat = [-79.59, 39.81];
export const JUMONVILLE_GLEN: LonLat = [-79.65, 39.88];
/** Half-King's camp, about a mile north-west of the glen. */
export const HALF_KING_CAMP: LonLat = [-79.668, 39.898];

/** Washington's night march, Great Meadows → north-west through the woods → rocky crest above the glen. */
export const WASHINGTON_MARCH: LonLat[] = [
  GREAT_MEADOWS, [-79.603, 39.838], [-79.62, 39.862], [-79.634, 39.879], [-79.642, 39.885],
];
/** Washington's firing line on the crest north-east of the glen. */
export const WASHINGTON_LINE: LonLat = [-79.642, 39.885];
/** Seneca warriors circle from Half-King's camp to block the glen's western escape route. */
export const SENECA_PINCER: LonLat[] = [
  HALF_KING_CAMP, [-79.676, 39.892], [-79.672, 39.884], [-79.661, 39.881],
];
export const SENECA_BLOCK: LonLat = [-79.661, 39.881];

/** (Youghiogheny / French Creek are not in the Natural Earth set; Potomac shows Wills Creek's river.) */
export const OHIO_RIVERS = ['Ohio', 'Monongahela', 'Allegheny', 'Potomac'];
export const OHIO_RIVER_LABELS: { name: string; ll: LonLat; angle: number }[] = [
  { name: 'Ohio R.', ll: [-80.66, 40.12], angle: 80 },
  { name: 'Allegheny R.', ll: [-79.55, 40.95], angle: -60 },
  { name: 'Monongahela R.', ll: [-79.9, 40.22], angle: 75 },
  { name: 'Potomac R.', ll: [-77.55, 39.3], angle: 10 },
];

/** Tactical (close-up) view around the glen and Great Meadows. */
export const JUMONVILLE_TACTICAL_EXTENT: [LonLat, LonLat] = [[-79.72, 39.8], [-79.55, 39.905]];

/**
 * Camera that zooms from the regional view (projection fitted to OHIO_COUNTRY_EXTENT) into the
 * tactical extent. Returns scale k and the projected-space centre; screen = (p - c) * k + (W/2, H/2).
 */
export function jumonvilleCamera(projection: GeoProjection, width: number, height: number, t: number) {
  const [[w, s], [e, n]] = JUMONVILLE_TACTICAL_EXTENT;
  const a = projection([w, n]) ?? [0, 0];
  const b = projection([e, s]) ?? [width, height];
  const tw = Math.abs(b[0] - a[0]), th = Math.abs(b[1] - a[1]);
  // fit into the band between the top HUD and the lower-third (screen y ≈ 13%–85%)
  const kEnd = Math.min((width * 0.8) / tw, (height * 0.66) / th);
  const cEnd: XY = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const cStart: XY = [width / 2, height / 2];
  const screenY = lerp(height / 2, height * 0.49, t);
  // log-scale zoom; centre follows so the target stays steady in screen space
  const k = Math.exp(lerp(0, Math.log(kEnd), t));
  const f = kEnd === 1 ? t : (1 - 1 / k) / (1 - 1 / kEnd);
  const c: XY = [lerp(cStart[0], cEnd[0], f), lerp(cStart[1], cEnd[1], f)];
  const toScreen = (p: XY): XY => [(p[0] - c[0]) * k + width / 2, (p[1] - c[1]) * k + screenY];
  /** SVG transform equivalent to toScreen, for a <g> holding projected geometry. */
  const transform = `translate(${width / 2} ${screenY}) scale(${k}) translate(${-c[0]} ${-c[1]})`;
  return { k, c, toScreen, transform };
}

