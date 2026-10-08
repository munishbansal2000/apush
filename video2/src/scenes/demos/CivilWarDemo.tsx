/**
 * Demo (~25 s, no audio): the military motion blocks on one Civil War map.
 *   A  0.0– 5.6  Antietam marker (Sept. 17, 1862) with a casualty count-up
 *   B  5.6–12.3  Lee's invasion of Pennsylvania (thick arrow = ≈75,000 men) → Gettysburg marker
 *                → a thinner retreat arrow (≈52,000): width IS strength
 *   C 12.3–17.3  approximate front line east of the Mississippi morphs 1861 → late 1863 → Sept. 1864
 *   D 17.3–25.0  Sherman's March, Atlanta → Savannah, dated (Nov. 15 – Dec. 21, 1864)
 *
 * Zones (screen, inside the 5% safe area): top-left date chip, top-right width legend, bottom
 * caption. Each is its own <Track>; every map label/pill/marker is a data-guard-item.
 */
import { geoPath } from 'd3-geo';
import React, { useMemo } from 'react';
import { riverPaths } from '../../components/geo/usGeo';
import data from '../../data/motion/civil-war.json';
import { Track } from '../../kit/guard';
import { COLOR, FONT, RADIUS, SAFE, SURFACE, TYPE } from '../../theme/tokens';
import { ArmyMove, BattleMarker, FrontLine, shade, SiteLabel, SIDE, type ArmyMoveProps, type BattleMarkerProps, type FrontKey, type FrontLineProps, type SiteLabelProps, type Side } from '../../motion/military';
import { MotionScene } from '../../motion/MotionScene';
import { fadeWindow, Slide } from '../../motion/primitives';
import { useWorld, World, WorldLayer, type CameraKey, type LonLat, type WorldSpec } from '../../motion/world';

export const CIVIL_WAR_DEMO_FPS = 30;
export const CIVIL_WAR_DEMO_SEC = 25;
export const CIVIL_WAR_DEMO_FRAMES = CIVIL_WAR_DEMO_SEC * CIVIL_WAR_DEMO_FPS;

export const CW_SPEC: WorldSpec = { extent: [[-92, 29], [-72, 42]], projection: 'us' };

export const CW_CAMERA: CameraKey[] = [
  { t: 0, center: [-77.55, 39.55], zoom: 6.4 },
  { t: 5.4, center: [-77.75, 39.12], zoom: 4.6, ease: 1.4 },
  { t: 12.2, center: [-83.6, 35.2], zoom: 1.75, ease: 1.6 },
  { t: 17.3, center: [-82.75, 33.0], zoom: 4.2, ease: 1.6 },
];

const camp = (id: string) => data.campaigns.find(c => c.id === id)!;
const battle = (id: string) => data.battles.find(b => b.id === id)!;
const lls = (c: { waypoints: { ll: number[] }[] }) => c.waypoints.map(w => w.ll as LonLat);

/* Sherman's schedule: day offsets from Nov. 15, 1864 at waypoint indices (dated stops from the data). */
const SHERMAN_T0 = 17.6;
const DAY = 0.15;
const SHERMAN_DAYS: { day: number; wp: number }[] = [
  { day: 0, wp: 0 },     // Nov. 15 leave Atlanta
  { day: 8, wp: 2 },     // Nov. 23 Milledgeville
  { day: 18, wp: 5 },    // Dec. 3 Millen
  { day: 25, wp: 5.85 }, // Dec. 10 at the Savannah defences
  { day: 36, wp: 6 },    // Dec. 21 Savannah occupied
];
const SHERMAN_END = SHERMAN_T0 + 36 * DAY;

const lee = camp('lee-gettysburg-advance');
const leeBack = camp('lee-gettysburg-retreat');
const sherman = camp('sherman-march');

export const CW_ARMIES: ArmyMoveProps[] = [
  { waypoints: lls(lee), start: 6.0, end: 8.8, until: 12.3, side: lee.side as Side, strength: lee.strength, label: 'Lee', labelWindow: [6.0, 8.7], labelSide: 'right' },
  { waypoints: lls(leeBack), start: 10.2, end: 11.7, until: 12.3, side: leeBack.side as Side, strength: leeBack.strength, label: 'Lee', labelWindow: [10.2, 12.2], labelSide: 'right' },
  {
    waypoints: lls(sherman), start: SHERMAN_T0, end: SHERMAN_END, side: sherman.side as Side, strength: sherman.strength, label: 'Sherman', labelWindow: [SHERMAN_T0, SHERMAN_END - 0.1],
    progress: SHERMAN_DAYS.map(d => ({ t: SHERMAN_T0 + d.day * DAY, wp: d.wp })),
  },
];

const b = (id: string, extra: Omit<BattleMarkerProps, 'at' | 'name'>): BattleMarkerProps => {
  const x = battle(id);
  return { at: x.ll as LonLat, name: x.name, date: x.date, outcome: x.outcome as Side, casualties: 'casualties' in x ? x.casualties : undefined, ...extra };
};
export const CW_BATTLES: BattleMarkerProps[] = [
  b('antietam', { start: 0.8, end: 5.5, countStart: 1.4 }),
  b('gettysburg', { start: 8.9, end: 12.3, countStart: 9.4, label: { dx: 22, dy: -8, anchor: 'start' } }),
  b('savannah', { start: SHERMAN_END, icon: 'star', label: { dx: 0, dy: 40, anchor: 'middle' } }),
];

export const CW_SITES: SiteLabelProps[] = [
  { at: lee.waypoints[0].ll as LonLat, text: 'Fredericksburg', from: 6.0, to: 12.3, label: { dx: 9, dy: 0, anchor: 'start' } },
  { at: sherman.waypoints[0].ll as LonLat, text: 'Atlanta', from: 17.4, label: { dx: -9, dy: 0, anchor: 'end' } },
  { at: sherman.waypoints[2].ll as LonLat, text: 'Milledgeville', from: SHERMAN_T0 + 8 * DAY, label: { dx: -2, dy: 20, anchor: 'end' } },
];

const FRONT_T = [12.4, 13.9, 15.6];
export const CW_FRONT: FrontLineProps = {
  keys: data.front.keys.map((k, i): FrontKey => ({ t: FRONT_T[i], line: k.line as LonLat[], ease: 1.3 })),
  from: 12.3, to: 17.3, side: 'union', hatch: 'left', label: data.front.label, labelU: 0.3, labelWindow: [12.7, 17.1],
};

/* ------------------------------ screen-space overlays ------------------------------ */

const MONTHS = ['JAN.', 'FEB.', 'MAR.', 'APR.', 'MAY', 'JUNE', 'JULY', 'AUG.', 'SEPT.', 'OCT.', 'NOV.', 'DEC.'];
/** Date on Sherman's march at time t (same schedule as the arrow). */
const shermanDate = (t: number) => {
  const day = Math.max(0, Math.min(36, Math.floor((t - SHERMAN_T0) / DAY)));
  const d = new Date(Date.UTC(1864, 10, 15 + day));
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, 1864`;
};

const chipStyle: React.CSSProperties = {
  position: 'absolute', left: SAFE.x, top: SAFE.y + 4, background: COLOR.ink, color: COLOR.paper, padding: '9px 18px',
  borderRadius: RADIUS.sm, fontFamily: FONT.display, fontSize: TYPE.chip, fontWeight: 700, letterSpacing: 2, whiteSpace: 'nowrap',
};

const Chip: React.FC<{ text: string | ((t: number) => string); at: number; out: number; minWidth?: number }> = ({ text, at, out, minWidth }) => {
  const { t } = useWorld();
  return (
    <Slide at={at} out={out} from="left">
      <div style={{ ...chipStyle, minWidth }}>{typeof text === 'string' ? text : text(t)}</div>
    </Slide>
  );
};

const CAPTIONS: { text: string; at: number; out: number }[] = [
  { text: 'Antietam, Sept. 17, 1862: the bloodiest single day in American history.', at: 0.5, out: 5.1 },
  { text: '1863: Lee invades the North. Arrow width = men; a smaller army retreats.', at: 5.9, out: 11.9 },
  { text: 'The Union front creeps south (approximate, east of the Mississippi).', at: 12.6, out: 16.9 },
  { text: "Nov.–Dec. 1864: Sherman's ≈62,000 men march from Atlanta to the sea.", at: 17.6, out: 24.0 },
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

/** Top-right legend: what an arrow's width means (bars at the same men-per-pixel as the arrows). */
const WidthLegend: React.FC<{ at: number; out: number; side: Side; rows: number[] }> = ({ at, out, side, rows }) => (
  <Slide at={at} out={out} from="right">
    <div style={{ position: 'absolute', right: SAFE.x, top: SAFE.y + 4, background: SURFACE.parchment.bg, border: `2px solid ${SURFACE.parchment.border}`,
      borderRadius: RADIUS.md, padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontFamily: FONT.display, fontSize: TYPE.small, fontWeight: 700, letterSpacing: 2, color: COLOR.ink, whiteSpace: 'nowrap' }}>ARROW WIDTH = MEN</div>
      {rows.map(m => (
        <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 54, height: m / 4000, background: SIDE[side].fill, border: `1px solid ${SIDE[side].edge}` }} />
          <span style={{ fontFamily: FONT.ui, fontSize: TYPE.town, fontWeight: 700, color: COLOR.ink, whiteSpace: 'nowrap' }}>{m.toLocaleString('en-US')}</span>
        </div>
      ))}
    </div>
  </Slide>
);

/** Rivers for orientation (Potomac, Mississippi, Tennessee, Ohio, Chattahoochee, Savannah…). */
const Rivers: React.FC = () => {
  const { proj, cam } = useWorld();
  const rivers = useMemo(() => riverPaths(geoPath(proj), ['Potomac', 'Mississippi', 'Ohio', 'Tennessee', 'Cumberland', 'Chattahoochee', 'Savannah', 'Susquehanna', 'Shenandoah', 'Oconee', 'Altamaha', 'James']), [proj]);
  return (
    <WorldLayer>
      <svg width={1} height={1} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        {rivers.map((r, i) => <path key={i} d={r.d} fill="none" stroke={shade(COLOR.oceanDeep, 0.85)} strokeWidth={1.8 / cam.s} strokeLinejoin="round" opacity={0.85} />)}
      </svg>
    </WorldLayer>
  );
};

const FrontChip: React.FC = () => {
  const { t } = useWorld();
  const labels = data.front.keys.map(k => k.label);
  const i = t < FRONT_T[1] + 0.6 ? 0 : t < FRONT_T[2] + 0.6 ? 1 : 2;
  const o = Math.min(fadeWindow(t, i === 0 ? 0 : FRONT_T[i] + 0.6, i === 2 ? 1e9 : FRONT_T[i + 1] + 0.6, 0.2), 1);
  return <div style={{ ...chipStyle, minWidth: 236 }}><span style={{ opacity: o }}>{labels[i]}</span></div>;
};

/* ------------------------------------- scene ------------------------------------- */

export const CivilWarDemo: React.FC = () => {
  return (
    <MotionScene>
      <Track id="world" role="cover">
        <World spec={CW_SPEC} camera={CW_CAMERA}>
          <Rivers />
          <FrontLine {...CW_FRONT} />
          {CW_ARMIES.map((a, i) => <ArmyMove key={i} {...a} />)}
          {CW_SITES.map(s => <SiteLabel key={s.text} {...s} />)}
          {CW_BATTLES.map(m => <BattleMarker key={m.name} {...m} />)}

          <Track id="date" role="chrome">
            <Chip text="SEPTEMBER 1862" at={0.3} out={5.2} />
            <Chip text="JUNE – JULY 1863" at={5.8} out={12.0} />
            <Slide at={12.4} out={17.0} from="left"><FrontChip /></Slide>
            <Chip text={shermanDate} at={17.5} out={24.2} minWidth={210} />
          </Track>
          <Track id="legend" role="overlay">
            <WidthLegend at={6.2} out={12.0} side="confederate" rows={[75000, 52000]} />
            <WidthLegend at={17.9} out={24.2} side="union" rows={[62000]} />
          </Track>
          <Track id="caption" role="text">
            {CAPTIONS.map(c => <Caption key={c.at} {...c} />)}
          </Track>
        </World>
      </Track>
    </MotionScene>
  );
};
