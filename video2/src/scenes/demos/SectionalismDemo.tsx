/**
 * Demo (~31 s, 1280×720, 30 fps): sectionalism 1820 → 1861 with the territory blocks.
 *
 * Beats: 1820 Missouri Compromise (Maine, 36°30′) → 1821 Missouri → 1850 California and
 * popular sovereignty → 1854 Kansas–Nebraska → secession Dec 1860 – June 1861 (states flip
 * in the order they seceded) → 1860 census numbers → before/after split 1820 vs 1861.
 *
 * Data: src/data/motion/statehood.json (dated timelines, sources, approximate territories).
 * Layout zones (screen, inside the 5% safe area): top-left = year counter; bottom-left =
 * legend; bottom-right of it = caption; split date tags ride the slider at the top. Each zone
 * is its own <Track>; map labels / numbers carry data-guard-item.
 */
import type { Feature, Polygon } from 'geojson';
import React from 'react';
import { ACQUISITIONS } from '../../components/geo/usGeo';
import data from '../../data/motion/statehood.json';
import { Track } from '../../kit/guard';
import { MotionScene } from '../../motion/MotionScene';
import { Slide } from '../../motion/primitives';
import {
  BeforeAfterSplit, Legend, MapLine, MapNumbers, mix, TerritoryOverTime, YearCounter,
  type MapNumber, type RegionLabel, type RegionSeries, type SliderKey, type StatusLegend, type YearKey,
} from '../../motion/territory';
import { World, type CameraKey, type LonLat, type WorldSpec } from '../../motion/world';
import { COLOR, FONT, MOTION, RADIUS, SAFE, SURFACE, TYPE } from '../../theme/tokens';

export const SECTIONALISM_DEMO_FPS = 30;
const END = 31;
export const SECTIONALISM_DEMO_FRAMES = END * SECTIONALISM_DEMO_FPS;

const SPEC: WorldSpec = { extent: [[-125, 24], [-66, 50]], projection: 'us' };
/** Status colours: theme roles, plus lighter/mixed variants derived from them (no new hexes). */
const STATUS_COLOR: Record<keyof typeof data.statuses, string> = {
  free: COLOR.free,
  slave: COLOR.slave,
  confederate: COLOR.confederate,
  border: mix(COLOR.slave, COLOR.amber, 0.55),
  closed: mix(COLOR.free, COLOR.paper, 0.55),
  open: mix(COLOR.slave, COLOR.paper, 0.55),
  popular: mix(mix(COLOR.blue, COLOR.red, 0.45), COLOR.paper, 0.35),
  other: mix(COLOR.paperDeep, COLOR.brown, 0.35),
};
export const LEGEND: StatusLegend = Object.fromEntries(
  (Object.keys(data.statuses) as (keyof typeof data.statuses)[]).map(k => [k, { label: data.statuses[k].label, color: STATUS_COLOR[k] }]),
);

/** All regions: approximate territories (drawn under) + states. */
export const SERIES: RegionSeries[] = [
  ...data.territories.map(tr => ({
    id: tr.id,
    timeline: tr.timeline,
    shape: tr.acquisition ? (ACQUISITIONS[tr.acquisition] as Feature<Polygon>) : (tr.ring as LonLat[]),
  })),
  ...data.states.map(s => ({ id: s.id, timeline: s.timeline })),
];

/* ------------------------------------ timing ------------------------------------ */

/** Beat start times (s). */
export const BEAT = { y1820: 0, y1821: 6.2, y1850: 9.6, y1854: 14.2, y1861: 18.4, census: 22.9, split: 25.8 } as const;

/** Clock: holds on each key year, ticks between (dated events flip as it passes them). */
export const YEARS: YearKey[] = [
  { t: 0, year: 1820.0 }, { t: 2.0, year: 1820.0 }, { t: 3.0, year: 1820.3 },          // Maine, Mar 15 1820
  { t: BEAT.y1821, year: 1820.3 }, { t: 7.4, year: 1821.7 },                          // Missouri, Aug 10 1821
  { t: BEAT.y1850, year: 1821.7 }, { t: 11.8, year: 1850.75 },                         // California, Sep 9 1850
  { t: BEAT.y1854, year: 1850.75 }, { t: 15.4, year: 1854.6 },                         // Kansas–Nebraska, May 30 1854
  { t: BEAT.y1861, year: 1854.6 }, { t: 19.8, year: 1860.95 }, { t: 22.6, year: 1861.45 }, // SC Dec 20 1860 … TN Jun 8 1861
];

export const CAMERA: CameraKey[] = [
  { t: 0, center: [-85.5, 39.4], zoom: 1.5 },
  { t: BEAT.y1850, center: [-97.5, 38.2], zoom: 1.05, ease: 2.0 },
  { t: BEAT.y1854, center: [-96, 39.2], zoom: 1.45, ease: 1.4 },
  { t: BEAT.y1861, center: [-87.5, 36.2], zoom: 1.5, ease: 1.4 },
  { t: BEAT.census, center: [-84.6, 34.6], zoom: 2.0, ease: 1.2 },
  { t: BEAT.split, center: [-96, 38.4], zoom: 1.05, ease: 1.2 },
];

export const LABELS: RegionLabel[] = [
  { text: 'MAINE', at: '23', from: 2.6, to: 5.9, dy: 6 },
  { text: 'MISSOURI', at: '29', from: 7.2, to: 9.5 },
  { text: 'CALIFORNIA', at: '06', from: 11.7, to: 14.1, dx: -14, dy: 20 },
  { text: 'UTAH TERR.', at: [-113.2, 40.4], from: 12.0, to: 14.1 },
  { text: 'NEW MEXICO TERR.', at: [-107.2, 34.4], from: 12.0, to: 14.1 },
  { text: 'KANSAS–NEBRASKA', at: [-100.8, 40.8], from: 15.3, to: 18.3, size: 'place' },
  { text: 'SOUTH CAROLINA', at: '45', from: 19.9, to: 21.5, dx: 30, dy: 30 },
  { text: 'BORDER STATES', at: '21', from: 21.7, to: 22.8, dy: 2 },
];

const LINE_3630: LonLat[] = data.lines[0].coords as LonLat[];
export const LINE_LABELS = [
  { text: '36°30′', at: [-97.3, 36.5] as LonLat, dy: -14, from: 3.6, to: 14.1 },
  { text: '36°30′ REPEALED', at: [-97.3, 36.5] as LonLat, dy: -14, from: 15.5, to: 18.3 },
];

const ENSLAVED = data.enslaved1860.states;
const PLACE: Record<string, LonLat> = { '51': [-78.6, 37.6], '45': [-80.9, 33.85], '13': [-83.4, 32.6], '01': [-86.8, 32.7], '28': [-89.7, 32.6] };
export const NUMBERS: MapNumber[] = ['51', '45', '13', '01', '28'].map(id => {
  const s = ENSLAVED.find(e => e.id === id)!;
  return { at: PLACE[id], value: s.value, label: s.name };
});
/** circle radius for the largest value (VA); labels sit under each circle */
const NUM_MAX = 34;
const numberData = NUMBERS.map(n => {
  const r = NUM_MAX * Math.sqrt(n.value / NUMBERS[0].value);
  // South Carolina's label goes east (over the Atlantic) so it clears Georgia's circle
  return { ...n, labelPos: n.label === 'South Carolina' ? { dx: r + 8, dy: 0, anchor: 'start' as const } : { dx: 0, dy: r + 18, anchor: 'middle' as const } };
});

export const SLIDER: SliderKey[] = [{ t: 26.6, x: 0 }, { t: 28.0, x: 0.55 }, { t: 29.0, x: 0.55 }, { t: 29.8, x: 0.45 }];

export const CAPTIONS: { text: string; from: number; to: number }[] = [
  { text: 'Maine enters free; slavery barred north of 36°30′', from: 0.4, to: 5.9 },
  { text: 'Missouri enters as a slave state: 12 free, 12 slave', from: BEAT.y1821 + 0.2, to: BEAT.y1850 - 0.1 },
  { text: 'California free; Southwest to popular sovereignty', from: BEAT.y1850 + 0.3, to: BEAT.y1854 - 0.1 },
  { text: 'Kansas–Nebraska: voters decide, 36°30′ line repealed', from: BEAT.y1854 + 0.3, to: BEAT.y1861 - 0.1 },
  { text: 'Dec 1860 – June 1861: eleven slave states secede', from: BEAT.y1861 + 0.3, to: BEAT.census - 0.1 },
  { text: '1860 census: nearly 4 million people enslaved', from: BEAT.census + 0.1, to: BEAT.split - 0.1 },
  { text: '1820 vs. 1861: from balance to secession', from: BEAT.split + 0.3, to: END },
];

/**
 * One compact legend per section (only the statuses on screen), each sliding in from the left
 * as the previous one leaves. Entries appear when their colour first shows on the map.
 */
export const LEGENDS: { at: number; out?: number; entries: { status: string; at?: number }[] }[] = [
  { at: 0.5, out: BEAT.y1850 - 0.2, entries: [{ status: 'free', at: 0.5 }, { status: 'slave', at: 0.7 }, { status: 'closed', at: 3.4 }, { status: 'open', at: 3.6 }] },
  { at: BEAT.y1850 + 0.4, out: BEAT.y1861 - 0.2, entries: [{ status: 'free' }, { status: 'slave' }, { status: 'closed' }, { status: 'other', at: 10.6 }, { status: 'popular', at: 11.9 }] },
  { at: BEAT.y1861 + 0.4, out: BEAT.split - 0.2, entries: [{ status: 'free' }, { status: 'closed' }, { status: 'popular' }, { status: 'other' }, { status: 'confederate', at: 19.9 }, { status: 'border', at: 21.6 }] },
  { at: BEAT.split + 0.4, entries: [{ status: 'free' }, { status: 'slave' }, { status: 'confederate' }, { status: 'border' }, { status: 'closed' }, { status: 'open' }, { status: 'popular' }, { status: 'other' }] },
];

/** Screen zones (px) used by the overlays — exported for the layout check. */
export const ZONES = {
  year: { left: SAFE.x, top: SAFE.y },
  legend: { left: SAFE.x, bottom: SAFE.y },
  caption: { left: 380, right: SAFE.x, bottom: SAFE.y },
} as const;

/* ------------------------------------ overlays ------------------------------------ */

const Caption: React.FC<{ text: string; from: number; to: number }> = ({ text, from, to }) => (
  <Slide at={from} out={to - MOTION.fade} from="down" distance={40} dur={MOTION.fade}>
    <div style={{ position: 'absolute', ...ZONES.caption, display: 'flex', justifyContent: 'center' }}>
      <div data-guard-item={`caption:${text.slice(0, 24)}`} style={{ background: SURFACE.night.bg, color: SURFACE.night.fg, padding: '9px 22px', borderRadius: RADIUS.md,
        fontFamily: FONT.text, fontSize: TYPE.caption, lineHeight: 1.3, textAlign: 'center', whiteSpace: 'nowrap' }}>
        {text}
      </div>
    </div>
  </Slide>
);

const CensusChip: React.FC = () => (
  <Slide at={BEAT.census + 0.2} out={BEAT.split - 0.5} from="up" distance={100}>
    <div data-guard-item="chip:census" style={{ position: 'absolute', left: ZONES.year.left, top: ZONES.year.top, background: COLOR.ink, color: COLOR.onNight,
      padding: '9px 18px', borderRadius: RADIUS.sm, fontFamily: FONT.display, fontSize: TYPE.chip, fontWeight: 700, letterSpacing: 3, whiteSpace: 'nowrap' }}>
      ENSLAVED PEOPLE · 1860 CENSUS
    </div>
  </Slide>
);

/* ------------------------------------- scene ------------------------------------- */

export const SectionalismDemo: React.FC = () => (
  <MotionScene>
    <Track id="world" role="cover">
      <World spec={SPEC} camera={CAMERA}>
        <TerritoryOverTime series={SERIES} legend={LEGEND} years={YEARS} from={0} to={BEAT.split + 1.0} labels={LABELS} />
        <MapLine coords={LINE_3630} from={3.2} to={BEAT.split + 0.6} draw={1.2} width={4} dimAt={15.3} label={LINE_LABELS} />
        <MapNumbers data={numberData} start={BEAT.census + 0.5} to={BEAT.split + 0.2} stagger={0.3} maxSize={NUM_MAX} color={COLOR.ink} />

        <BeforeAfterSplit
          from={BEAT.split + 0.6} to={END + 1} slider={SLIDER} tags={{ before: '1820', after: '1861' }} trackId="split-tags"
          before={<TerritoryOverTime series={SERIES} legend={LEGEND} year={1820.3} pulse={false} />}
          after={<TerritoryOverTime series={SERIES} legend={LEGEND} year={1861.45} pulse={false} />}
        />

        <Track id="year" role="overlay">
          <YearCounter years={YEARS} at={0.3} out={BEAT.census - 0.3} from="up" pos={ZONES.year} />
          <CensusChip />
        </Track>
        <Track id="legend" role="overlay">
          {LEGENDS.map(l => <Legend key={l.at} legend={LEGEND} entries={l.entries} at={l.at} out={l.out} from="left" pos={ZONES.legend} />)}
        </Track>
        <Track id="caption" role="text">
          {CAPTIONS.map(c => <Caption key={c.text} {...c} />)}
        </Track>
      </World>
    </Track>
  </MotionScene>
);
