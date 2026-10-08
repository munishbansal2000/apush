/**
 * Shared geography for US history maps: one projection for the base map AND every overlay,
 * so territories, trails and forts line up by construction (no hand-placed 0–100 coordinates
 * guessed against a raster image).
 *
 * - Base: US states/nation (us-atlas 10m, in src/data/geo) + Canada/Mexico (world-atlas 50m).
 * - Acquisitions: historical boundaries as [lon, lat] rings sharing exact edges (Mississippi,
 *   Adams–Onís line, Continental Divide, Rio Grande, Gila), clipped to the US outline for
 *   exact coasts, Great Lakes shores and borders.
 */
import { geoArea, geoConicEqualArea, geoPath, type GeoProjection } from 'd3-geo';
import type { Feature, FeatureCollection, MultiLineString, MultiPolygon, Polygon } from 'geojson';
import React, { useId, useMemo } from 'react';
import { feature, mesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import worldTopo from 'world-atlas/countries-50m.json';
import usTopo from '../../data/geo/us-states-10m.json';
import riversJson from '../../data/geo/us-rivers-10m.json';
import { COLOR, alpha } from '../../theme/tokens';

export type LonLat = [number, number];

const US = usTopo as unknown as Topology<{ states: GeometryCollection; nation: GeometryCollection }>;
const WORLD = worldTopo as unknown as Topology<{ countries: GeometryCollection }>;

export const US_NATION = feature(US, US.objects.nation) as unknown as FeatureCollection<MultiPolygon>;
export const US_STATE_LINES = mesh(US, US.objects.states, (a, b) => a !== b) as unknown as MultiLineString;
const COUNTRIES = feature(WORLD, WORLD.objects.countries) as unknown as FeatureCollection<Polygon | MultiPolygon>;
/** Canada (124) and Mexico (484): context land around the US. */
export const NEIGHBORS: FeatureCollection<Polygon | MultiPolygon> = {
  type: 'FeatureCollection',
  features: COUNTRIES.features.filter(f => f.id === '124' || f.id === '484'),
};

/** Natural Earth 10m river centerlines within the contiguous US (name, scalerank: lower = bigger). */
export const US_RIVERS = riversJson as unknown as FeatureCollection<MultiLineString, { name: string | null; scalerank: number }>;

/** Rivers as SVG paths; pass names to show only those (e.g. ['Ohio', 'Monongahela']). */
export function riverPaths(path: ReturnType<typeof geoPath>, names?: string[], maxRank = 6): { name: string; d: string }[] {
  return US_RIVERS.features
    .filter(f => (names ? names.includes(f.properties.name ?? '') : f.properties.scalerank <= maxRank))
    .map(f => ({ name: f.properties.name ?? '', d: path(f) ?? '' }));
}

/** Contiguous US with a margin. */
export const CONUS_EXTENT: [LonLat, LonLat] = [[-125.5, 23.5], [-66, 50.5]];

/** Albers-style equal-area conic, the standard for US maps, fitted to a box. */
export function usProjection(width: number, height: number, extent: [LonLat, LonLat] = CONUS_EXTENT, pad = 0): GeoProjection {
  const [[w, s], [e, n]] = extent;
  return geoConicEqualArea()
    .parallels([29.5, 45.5])
    .rotate([96, 0])
    .fitExtent([[pad, pad], [width - pad, height - pad]], { type: 'MultiPoint', coordinates: [[w, s], [e, s], [e, n], [w, n], [(w + e) / 2, n], [(w + e) / 2, s]] });
}

/** A polygon from a ring, with winding fixed for d3's spherical rules (exterior = clockwise). */
export function ringPolygon(ring: LonLat[]): Feature<Polygon> {
  const closed = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? ring : [...ring, ring[0]];
  let f: Feature<Polygon> = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [closed] } };
  if (geoArea(f) > 2 * Math.PI) f = { ...f, geometry: { type: 'Polygon', coordinates: [[...closed].reverse()] } };
  return f;
}

/* ------------------------- historical boundary lines ------------------------- */
// Shared edges: every acquisition that borders another reuses the same points.

/** Mississippi River, source (approx.) → 31°N. */
const MISSISSIPPI: LonLat[] = [[-95.2, 47.2], [-94.4, 46.4], [-93.3, 45.0], [-92.0, 44.5], [-91.2, 42.7], [-91.4, 40.4], [-90.2, 38.6], [-89.4, 36.6], [-90.1, 35.1], [-91.1, 33.1], [-91.4, 31.9], [-91.6, 31.0]];
/** Lower Mississippi / Isle of Orleans to the Gulf (part of the Louisiana Purchase). */
const LOWER_MISS: LonLat[] = [[-91.6, 31.0], [-89.6, 30.0], [-89.0, 28.5]];
/** 1783 southern boundary: 31°N → Chattahoochee → St. Marys → Atlantic. */
const SOUTH_1783: LonLat[] = [[-91.6, 31.0], [-85.0, 31.0], [-84.86, 30.7], [-82.2, 30.6], [-81.4, 30.7]];
/** Adams–Onís line (1819): Sabine → Red River → 100°W → Arkansas River → source → 42°N. */
const SABINE: LonLat[] = [[-93.85, 29.6], [-93.9, 32.0], [-94.04, 33.55]];
const RED_RIVER: LonLat[] = [[-94.04, 33.55], [-95.5, 33.9], [-97.0, 33.8], [-98.5, 34.1], [-100.0, 34.56]];
const MERIDIAN_100: LonLat[] = [[-100.0, 34.56], [-100.0, 37.75]];
const ARKANSAS: LonLat[] = [[-100.0, 37.75], [-102.0, 38.0], [-104.0, 38.2], [-105.5, 38.5], [-106.3, 39.2]];
const TO_42: LonLat[] = [[-106.3, 39.2], [-106.3, 42.0]];
/** Continental Divide, 42°N → 49°N (approx.). */
const DIVIDE: LonLat[] = [[-107.9, 42.0], [-109.5, 43.2], [-110.5, 44.4], [-111.4, 44.7], [-112.8, 44.4], [-113.5, 45.1], [-114.1, 45.7], [-114.6, 46.6], [-114.4, 47.5], [-113.4, 48.4], [-114.07, 49.0]];
/** Rio Grande, mouth → source (approx.). */
const RIO_GRANDE: LonLat[] = [[-97.15, 25.95], [-99.5, 27.5], [-100.6, 29.2], [-101.4, 29.8], [-103.0, 29.0], [-104.5, 29.7], [-106.5, 31.78], [-106.6, 32.25], [-106.7, 33.5], [-106.8, 35.1], [-106.6, 36.9], [-107.0, 37.8]];
/** 1848 border: upper Rio Grande → southern New Mexico → Gila River → Colorado River. */
const GILA_LINE: LonLat[] = [[-106.6, 32.25], [-109.0, 32.75], [-110.6, 33.0], [-112.3, 33.3], [-113.5, 32.9], [-114.6, 32.73]];
/** 1853 border (Gadsden): Colorado River → 31.33°N → 31.78°N → Rio Grande. */
const GADSDEN_SOUTH: LonLat[] = [[-114.6, 32.73], [-114.81, 32.49], [-111.07, 31.33], [-108.21, 31.33], [-108.21, 31.78], [-106.5, 31.78]];

const rev = (l: LonLat[]) => [...l].reverse();

/** Acquisition boundaries (unclipped); render clipped to the US outline. */
export const ACQUISITIONS: Record<string, Feature<Polygon>> = {
  original_13: ringPolygon([[-95.2, 49.6], [-60, 49.6], [-60, 30.7], ...rev(SOUTH_1783), ...rev(MISSISSIPPI)]),
  louisiana: ringPolygon([
    ...MISSISSIPPI, ...LOWER_MISS.slice(1), [-91.5, 28.3], [-93.85, 28.5], ...SABINE, ...RED_RIVER.slice(1), ...MERIDIAN_100.slice(1),
    ...ARKANSAS.slice(1), ...TO_42.slice(1), ...DIVIDE, [-95.2, 49.0],
  ]),
  florida: ringPolygon([...SOUTH_1783, [-79, 30.7], [-79, 24], [-89.0, 24], ...rev(LOWER_MISS)]),
  texas: ringPolygon([
    [-93.85, 28.5], [-97.15, 25.0], ...RIO_GRANDE, [-107.0, 42.0], [-106.3, 42.0], ...rev(TO_42).slice(1), ...rev(ARKANSAS).slice(1),
    ...rev(MERIDIAN_100).slice(1), ...rev(RED_RIVER).slice(1), ...rev(SABINE).slice(1),
  ]),
  oregon: ringPolygon([[-126, 42.0], [-107.9, 42.0], ...DIVIDE.slice(1), [-123.3, 49.0], [-126, 49.0]]),
  mexican_cession: ringPolygon([
    [-126, 42.0], [-107.0, 42.0], ...rev(RIO_GRANDE.slice(RIO_GRANDE.findIndex(p => p[1] === 32.25))), ...GILA_LINE.slice(1), [-117.12, 32.53], [-118, 31.5], [-126, 31.5],
  ]),
  gadsden: ringPolygon([...GILA_LINE, ...GADSDEN_SOUTH.slice(1)]),
};

/** Where each acquisition's label sits (lon/lat), chosen inside the region. */
export const ACQUISITION_LABELS: Record<string, LonLat> = {
  original_13: [-82.5, 38.6],
  louisiana: [-99.5, 42.6],
  florida: [-82.2, 28.6],
  texas: [-99.6, 31.6],
  oregon: [-119.5, 45.3],
  mexican_cession: [-116.2, 37.6],
  gadsden: [-110.6, 31.5],
};

/* ---------------------------------- base map ---------------------------------- */

export type GeoPalette = 'parchment' | 'dark';
const PALETTES: Record<GeoPalette, { ocean: string; neighbor: string; land: string; state: string; coast: string }> = {
  parchment: { ocean: COLOR.ocean, neighbor: COLOR.paperDeep, land: COLOR.paper, state: alpha(COLOR.ink, 0.28), coast: COLOR.coast },
  dark: { ocean: COLOR.night, neighbor: alpha(COLOR.nightPanel, 0.6), land: COLOR.nightPanel, state: alpha(COLOR.paper, 0.18), coast: COLOR.onNightMuted },
};

/**
 * Base map as SVG children (render inside an <svg> sized width×height). Returns the clip id
 * for the US outline so overlays can be clipped to it.
 */
export function useUsBase(projection: GeoProjection, palette: GeoPalette = 'parchment') {
  const clipId = `us-clip-${useId().replace(/:/g, '')}`;
  const p = PALETTES[palette];
  const path = useMemo(() => geoPath(projection), [projection]);
  const base = (
    <>
      <rect x={-10000} y={-10000} width={20000} height={20000} fill={p.ocean} />
      {NEIGHBORS.features.map((f, i) => (
        <path key={i} d={path(f) ?? ''} fill={p.neighbor} stroke={p.coast} strokeWidth={0.6} strokeOpacity={0.6} />
      ))}
      <path d={path(US_NATION) ?? ''} fill={p.land} stroke={p.coast} strokeWidth={1.2} />
      <path d={path(US_STATE_LINES) ?? ''} fill="none" stroke={p.state} strokeWidth={0.7} />
      <defs>
        <clipPath id={clipId}>
          <path d={path(US_NATION) ?? ''} />
        </clipPath>
      </defs>
    </>
  );
  return { base, clipId, path };
}
