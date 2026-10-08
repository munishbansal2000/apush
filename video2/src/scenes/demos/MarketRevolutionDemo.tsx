/**
 * Demo (~25 s, no audio): the growth motion blocks — one year clock (1820 → 1870) drives the
 * year chip, every canal/road/railroad and every city dot.
 *   1  0.0– 6.6  New York State: the Erie Canal draws in Buffalo → Albany (opened 1825)
 *   2  6.6–12.4  the Ohio Valley: National Road to Vandalia, the B&O creeping toward Wheeling
 *   3 12.4–18.6  the 1850s: rails reach Chicago, the Illinois Central; Chicago's dot booms
 *   4 18.6–25.0  whole country: Union Pacific and Central Pacific race to Promontory Summit (1869)
 *
 * Zones: top-left year chip, top-right key, bottom caption — each its own <Track>.
 */
import { geoPath } from 'd3-geo';
import React, { useMemo } from 'react';
import { riverPaths, US_NATION } from '../../components/geo/usGeo';
import data from '../../data/motion/growth-1800s.json';
import { Track } from '../../kit/guard';
import { COLOR, FONT, RADIUS, SAFE, SURFACE, TYPE } from '../../theme/tokens';
import { CityGrowth, GrowthNetwork, KIND_STYLE, yearAt, type City, type CityLabel, type GrowthLine, type LineLabel, type YearKey } from '../../motion/growth';
import { shade, SiteLabel, type SiteLabelProps } from '../../motion/military';
import { MotionScene } from '../../motion/MotionScene';
import { Slide } from '../../motion/primitives';
import { useWorld, World, WorldLayer, type CameraKey, type LonLat, type WorldSpec } from '../../motion/world';

export const MARKET_REVOLUTION_DEMO_FPS = 30;
export const MARKET_REVOLUTION_DEMO_SEC = 25;
export const MARKET_REVOLUTION_DEMO_FRAMES = MARKET_REVOLUTION_DEMO_SEC * MARKET_REVOLUTION_DEMO_FPS;

export const MR_SPEC: WorldSpec = { extent: [[-125, 24], [-66, 50]], projection: 'us' };

export const MR_CAMERA: CameraKey[] = [
  { t: 0, center: [-75.9, 42.1], zoom: 6.2 },
  { t: 6.6, center: [-81.6, 40.2], zoom: 3.4, ease: 1.5 },
  { t: 12.4, center: [-84.6, 40.4], zoom: 3.0, ease: 1.5 },
  { t: 18.6, center: [-97.0, 39.6], zoom: 1.12, ease: 1.8 },
];

/** The one clock: year at time t. */
export const MR_YEARS: YearKey[] = [
  { t: 0, year: 1820 },
  { t: 4.4, year: 1825.8 },
  { t: 6.6, year: 1827 },
  { t: 12.2, year: 1845 },
  { t: 18.2, year: 1860 },
  { t: 19.6, year: 1863 },
  { t: 23.4, year: 1869.36 },
  { t: 25, year: 1870 },
];

export const MR_LINES = data.lines as unknown as GrowthLine[];
export const MR_CITIES = data.cities.list as unknown as City[];

export const MR_LINE_LABELS: LineLabel[] = [
  { id: 'erie-canal', u: 0.42, window: [4.9, 6.5], dy: -20 },
  { id: 'national-road', u: 0.62, window: [8.4, 12.2], dy: -20 },
  { id: 'b-and-o', u: 0.22, window: [8.6, 12.2], dy: 22 },
  { id: 'lake-shore', u: 0.35, window: [15.4, 18.3], dy: 22 },
  { id: 'illinois-central', u: 0.5, window: [17.0, 18.3], dx: 12, anchor: 'start', dy: 0 },
  { id: 'central-pacific', u: 0.42, window: [21.0, 24.6], dy: 22 },
  { id: 'union-pacific', u: 0.5, window: [21.6, 24.6], dy: 22 },
];

export const MR_CITY_LABELS: CityLabel[] = [
  { name: 'New York', window: [0.6, 6.4], anchor: 'start' },
  { name: 'Cincinnati', window: [7.8, 12.2], anchor: 'end' },
  { name: 'Chicago', window: [13.0, 18.3], anchor: 'start', dy: -16 },
  { name: 'St. Louis', window: [13.4, 18.3], anchor: 'end' },
  { name: 'New York', window: [19.6, 24.6], anchor: 'start' },
];

const lineById = (id: string) => MR_LINES.find(l => l.id === id)!;
export const MR_SITES: SiteLabelProps[] = [
  { at: lineById('erie-canal').path[0], text: 'Buffalo', from: 0.6, to: 6.4, label: { dx: -9, dy: 0, anchor: 'end' } },
  { at: lineById('erie-canal').path[11], text: 'Albany', from: 0.6, to: 6.4, label: { dx: 9, dy: 0, anchor: 'start' } },
  { at: lineById('union-pacific').path[0], text: 'Omaha', from: 20.0, to: 24.6, label: { dx: 9, dy: 0, anchor: 'start' } },
  { at: lineById('central-pacific').path[0], text: 'Sacramento', from: 19.8, to: 24.6, label: { dx: 0, dy: 18, anchor: 'middle' } },
  { at: lineById('union-pacific').path[16] as LonLat, text: 'Promontory Summit, May 10, 1869', from: 23.4, label: { dx: 0, dy: -20, anchor: 'middle' } },
];

/* ------------------------------ screen-space overlays ------------------------------ */

const YearChip: React.FC = () => {
  const { t } = useWorld();
  return (
    <Slide at={0.2} from="left">
      <div style={{ position: 'absolute', left: SAFE.x, top: SAFE.y + 4, background: COLOR.ink, color: COLOR.paper, padding: '4px 18px 6px',
        borderRadius: RADIUS.sm, fontFamily: FONT.display, fontSize: TYPE.h2, fontWeight: 700, letterSpacing: 3, minWidth: 92, textAlign: 'center' }}>
        {Math.floor(yearAt(MR_YEARS, t) + 1e-6)}
      </div>
    </Slide>
  );
};

/** Top-right key: line styles + what a dot's size means. */
const Key: React.FC = () => {
  const row = (swatch: React.ReactNode, text: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width={40} height={14} style={{ flex: 'none' }}>{swatch}</svg>
      <span style={{ fontFamily: FONT.text, fontSize: TYPE.small, fontWeight: 700, color: COLOR.ink, whiteSpace: 'nowrap' }}>{text}</span>
    </div>
  );
  return (
    <Slide at={0.9} out={18.2} from="right">
      <div style={{ position: 'absolute', right: SAFE.x, top: SAFE.y + 4, background: SURFACE.parchment.bg, border: `2px solid ${SURFACE.parchment.border}`,
        borderRadius: RADIUS.md, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {row(<><line x1={2} y1={7} x2={38} y2={7} stroke={KIND_STYLE.railroad.color} strokeWidth={7} strokeDasharray="1.6 5.4" /><line x1={2} y1={7} x2={38} y2={7} stroke={KIND_STYLE.railroad.color} strokeWidth={2.6} /></>, 'Railroad')}
        {row(<><line x1={2} y1={7} x2={38} y2={7} stroke={KIND_STYLE.canal.color} strokeWidth={6.5} /><line x1={2} y1={7} x2={38} y2={7} stroke={COLOR.paper} strokeWidth={2.4} /></>, 'Canal')}
        {row(<line x1={2} y1={7} x2={38} y2={7} stroke={KIND_STYLE.road.color} strokeWidth={4.2} />, 'Road')}
        {row(<circle cx={20} cy={7} r={6} fill={COLOR.red} fillOpacity={0.55} stroke={COLOR.red} strokeWidth={1.8} />, 'City (area = people)')}
      </div>
    </Slide>
  );
};

const CAPTIONS: { text: string; at: number; out: number }[] = [
  { text: '1825: the Erie Canal links Lake Erie to the Hudson, Buffalo to Albany.', at: 0.4, out: 6.2 },
  { text: 'Roads and rails push west: the National Road and the B&O Railroad.', at: 6.9, out: 12.0 },
  { text: 'By the 1850s, rail lines tie Chicago to the East, and Chicago booms.', at: 12.7, out: 18.2 },
  { text: 'May 10, 1869: the transcontinental railroad meets at Promontory Summit.', at: 18.9, out: 24.2 },
];

const Caption: React.FC<{ text: string; at: number; out: number }> = ({ text, at, out }) => (
  <Slide at={at} out={out} from="down" distance={140}>
    <div style={{ position: 'absolute', left: SAFE.x, right: SAFE.x, bottom: SAFE.y + 4, display: 'flex', justifyContent: 'center' }}>
      <div style={{ maxWidth: 1000, background: SURFACE.night.bg, color: SURFACE.night.fg, padding: '10px 22px', borderRadius: RADIUS.md,
        fontFamily: FONT.text, fontSize: TYPE.caption * 0.84, lineHeight: 1.3, textAlign: 'center' }}>
        {text}
      </div>
    </div>
  </Slide>
);

/** Rivers the canals and railroads follow (Hudson, Mohawk, Ohio, Mississippi, Platte…). */
const Rivers: React.FC = () => {
  const { proj, cam } = useWorld();
  const shore = useMemo(() => geoPath(proj)(US_NATION) ?? '', [proj]);   // US outline = Great Lakes shores (the base land has no lakes)
  const rivers = useMemo(() => riverPaths(geoPath(proj), ['Hudson', 'Mohawk', 'Ohio', 'Mississippi', 'Missouri', 'Platte', 'North Platte', 'Potomac', 'Susquehanna', 'Illinois', 'Sacramento', 'Humboldt', 'Allegheny', 'Monongahela', 'Niagara', 'St. Lawrence']), [proj]);
  return (
    <WorldLayer>
      <svg width={1} height={1} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <path d={shore} fill="none" stroke={COLOR.coast} strokeWidth={1.6 / cam.s} strokeLinejoin="round" opacity={0.7} />
        {rivers.map((r, i) => <path key={i} d={r.d} fill="none" stroke={shade(COLOR.oceanDeep, 0.85)} strokeWidth={1.8 / cam.s} strokeLinejoin="round" opacity={0.85} />)}
      </svg>
    </WorldLayer>
  );
};

/* ------------------------------------- scene ------------------------------------- */

export const MarketRevolutionDemo: React.FC = () => (
  <MotionScene>
    <Track id="world" role="cover">
      <World spec={MR_SPEC} camera={MR_CAMERA}>
        <Rivers />
        <GrowthNetwork lines={MR_LINES} years={MR_YEARS} labels={MR_LINE_LABELS} />
        <CityGrowth cities={MR_CITIES} years={MR_YEARS} labels={MR_CITY_LABELS} />
        {MR_SITES.map(s => <SiteLabel key={s.text} {...s} />)}

        <Track id="year" role="chrome"><YearChip /></Track>
        <Track id="key" role="overlay"><Key /></Track>
        <Track id="caption" role="text">
          {CAPTIONS.map(c => <Caption key={c.at} {...c} />)}
        </Track>
      </World>
    </Track>
  </MotionScene>
);
