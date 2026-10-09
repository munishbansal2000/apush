/**
 * Lakes for historical maps: Natural Earth 50m minus its reservoirs. The data is today's geography, and its 52
 * reservoirs (Lake Mead, Lake Powell, Kentucky Lake, Lake Oahe, Quebec's hydro reservoirs…) are 20th-century dams
 * that would otherwise appear on a 1763 map. Natural lakes and coastlines have barely changed in the APUSH period.
 */
import type {FeatureCollection, MultiPolygon} from 'geojson';
import lakesJson from '../data/geo/lakes-50m.json';

const all = lakesJson as unknown as FeatureCollection<MultiPolygon, {featurecla?: string}>;
export const NATURAL_LAKES: FeatureCollection<MultiPolygon> = {...all, features: all.features.filter(f => f.properties?.featurecla !== 'Reservoir')};
