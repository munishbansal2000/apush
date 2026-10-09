import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, it} from 'node:test';
import {expandMapViews, loadMapViews, periodLayers, SIDE_COLORS, validateMapView, type MapViewDef, type PeriodFeature} from '../tools/pipeline/map-views';
import {validateGeo} from '../src/library/validate';
import type {GeoProperties} from '../src/library/types';
import type {ShotPlan} from '../tools/pipeline/shots';

const root = new URL('..', import.meta.url).pathname;
const LIB = join(root, 'data', 'library');
const feature = (id: string, type: string, coordinates: unknown, props: Partial<PeriodFeature['properties']> = {}): PeriodFeature => ({
  geometry: {type, coordinates},
  properties: {id, validFrom: '1763-10-07', validTo: '1774-06-22', review: {status: 'approved'}, layer: {base: true, side: 'british', label: 'Quebec', labelAt: [-71, 48]}, ...props},
});
const quebec = feature('geo.region.quebec@1763', 'Polygon', [[[-80, 45], [-64, 45], [-64, 52], [-80, 52], [-80, 45]]]);
const line = feature('geo.line.proclamation-1763', 'LineString', [[-84, 34], [-78, 40], [-72, 45]], {layer: {base: true, side: 'british'}, validTo: '1768-11-05'});
const louisiana = feature('geo.region.spanish-louisiana@1763', 'Polygon', [[[-110, 29], [-90, 29], [-90, 49], [-110, 49], [-110, 29]]], {layer: {base: true, side: 'spanish'}, validTo: '1800-10-01'});
const geo = {[quebec.properties.id]: quebec, [line.properties.id]: line, [louisiana.properties.id]: louisiana};
const east: [[number, number], [number, number]] = [[-88, 30], [-62, 50]];

describe('period layers', () => {
  it('draws the base layers valid that year and inside the view: regions tinted by side, lines dashed, labels where given', () => {
    const l = periodLayers(1765, east, geo);
    assert.deepEqual(l.fills.map(f => [f.region.geo, f.color]), [[quebec.properties.id, SIDE_COLORS.british]], 'Louisiana lies outside the view');
    assert.deepEqual(l.lines.map(x => [x.geo, x.dashed]), [[line.properties.id, true]]);
    assert.deepEqual(l.labels.map(x => x.text), ['Quebec']);
  });

  it('respects the year window (inclusive, by year) and skips unapproved layers unless drafting', () => {
    assert.equal(periodLayers(1762, east, geo).fills.length, 0, 'before validFrom');
    assert.equal(periodLayers(1763, east, geo).fills.length, 1, 'the year it starts');
    assert.equal(periodLayers(1770, east, geo).lines.length, 0, 'the line ended in 1768');
    const draft = {x: feature('geo.region.x@1763', 'Polygon', quebec.geometry.coordinates, {review: {status: 'candidate'}})};
    assert.equal(periodLayers(1765, east, draft).fills.length, 0);
    assert.equal(periodLayers(1765, east, draft, true).fills.length, 1);
    assert.equal(periodLayers(1765, east, {y: feature('geo.region.y', 'Polygon', quebec.geometry.coordinates, {layer: undefined})}).fills.length, 0, 'plain geo is not a base layer');
  });

  it('a map shot with a period gets that year\'s layers under its own fills', () => {
    const views = loadMapViews(LIB);
    const plan = {episode: 'x', shots: [{type: 'map', at: {turn: 0}, view: 'map.eastern-north-america', period: 1765, fills: [{at: {offset: 1}, region: {geo: 'geo.region.other'}, color: 'gold'}]}]} as unknown as ShotPlan;
    const {plan: out, issues} = expandMapViews(plan, views, {}, geo);
    assert.deepEqual(issues, []);
    const shot = out.shots[0] as unknown as {fills: {region: {geo: string}; color: string}[]; labels: {text: string}[]};
    assert.deepEqual(shot.fills.map(f => f.region.geo), [quebec.properties.id, louisiana.properties.id, 'geo.region.other'], 'the view reaches 95°W: Louisiana is in it');
    assert.equal(shot.fills[2].color, '#c9a227', 'colour names are mapped');
    assert.ok(shot.labels.some(l => l.text === 'Quebec'));
    const plain = expandMapViews({...plan, shots: [{...plan.shots[0], period: undefined}]} as unknown as ShotPlan, views, {}, geo).plan.shots[0] as unknown as {fills: unknown[]};
    assert.equal(plain.fills.length, 1, 'no period, no layers');
  });
});

describe('map view validation', () => {
  const geoLib = {'geo.line.appalachian-crest': feature('geo.line.appalachian-crest', 'LineString', [[-84, 34], [-72, 45]])};
  const good: MapViewDef = {id: 'map.test-region', name: 'A test region', projection: 'us', extent: [[-90, 30], [-70, 45]], camera: {center: [-80, 38], zoom: 1.1}, tilt: 20,
    terrain: {ridges: ['geo.line.appalachian-crest']}, labels: [{text: 'Atlantic Ocean', lonlat: [-72, 33], style: 'ocean'}], focus: {coast: {center: [-76, 37], zoom: 1.8}}} as MapViewDef;

  it('every view in the library passes, with unique ids', () => {
    const lib = Object.fromEntries(readdirSync(join(LIB, 'geo')).map(f => JSON.parse(readFileSync(join(LIB, 'geo', f), 'utf8'))).map(g => [g.properties.id, g]));
    const files = readdirSync(join(LIB, 'maps')).filter(f => f.endsWith('.json'));
    const views = files.map(f => [f, JSON.parse(readFileSync(join(LIB, 'maps', f), 'utf8'))] as const);
    assert.deepEqual(views.flatMap(([f, v]) => validateMapView(v, f, lib)), []);
    assert.equal(new Set(views.map(([, v]) => v.id)).size, files.length);
  });

  it('rejects dated ids, mismatched files, framings outside the extent, missing ridges and dated base labels', () => {
    assert.deepEqual(validateMapView(good, 'test-region.json', geoLib), []);
    const bad = (patch: Partial<MapViewDef>, file = 'test-region.json') => validateMapView({...good, ...patch} as MapViewDef, file, geoLib).join('\n');
    assert.match(bad({id: 'map.test-region-1763'}, 'test-region-1763.json'), /must not carry a year/);
    assert.match(bad({}, 'other.json'), /file name must be test-region\.json/);
    assert.match(bad({camera: {center: [-60, 38], zoom: 1}}), /camera\.center must be/);
    assert.match(bad({focus: {coast: {center: [-76, 37], zoom: 6}}}), /zoom must be 1-4/);
    assert.match(bad({focus: {}}), /at least one named camera target/);
    assert.match(bad({terrain: {ridges: ['geo.line.nowhere']}}), /not in data\/library\/geo/);
    assert.match(bad({labels: [{text: 'New France 1750', lonlat: [-80, 40], style: 'region'}]}), /dated names belong to period layers/);
    assert.match(bad({extent: [[-70, 30], [-90, 45]]}), /west < east/);
  });
});

describe('geo layer validation', () => {
  const props = (layer: unknown, extra: Partial<GeoProperties> = {}) => ({id: 'geo.region.quebec@1763', type: 'region', name: 'Quebec', validFrom: '1763-10-07', validTo: '1774-06-22',
    precision: 'approximate', sources: ['x'], units: [3], review: {status: 'candidate'}, layer, ...extra}) as unknown as GeoProperties;
  const taxonomy = JSON.parse(readFileSync(join(LIB, 'taxonomy.json'), 'utf8'));
  const issues = (p: GeoProperties) => validateGeo(p, taxonomy).join('\n');

  it('a base layer needs a known side, both dates in order, and a [lon, lat] label spot; points cannot be layers', () => {
    assert.equal(issues(props({base: true, side: 'british', label: 'Quebec', labelAt: [-71, 48]})), '');
    assert.match(issues(props({base: true, side: 'dutch'})), /layer\.side must be one of/);
    assert.match(issues(props({base: true, side: 'british'}, {validTo: undefined})), /needs validFrom and validTo/);
    assert.match(issues(props({base: true, side: 'british'}, {validTo: '1760-01-01'})), /validFrom is after validTo/);
    assert.match(issues(props({base: true, side: 'british', labelAt: [48]})), /layer\.labelAt must be/);
    assert.match(issues(props({base: true, side: 'british'}, {id: 'geo.point.detroit', type: 'point'})), /points are not base layers/);
  });
});

describe('period layers and the storyboard', () => {
  it('a base layer the storyboard fills itself is drawn once, in the storyboard\'s colour', () => {
    const plan = {episode: 'x', shots: [{type: 'map', at: {turn: 0}, view: 'map.eastern-north-america', period: 1765, fills: [{at: {offset: 1}, region: {geo: quebec.properties.id}, color: 'blue'}]}]} as unknown as ShotPlan;
    const shot = expandMapViews(plan, loadMapViews(LIB), {}, geo).plan.shots[0] as unknown as {fills: {region: {geo: string}; color: string}[]};
    assert.deepEqual(shot.fills.filter(f => f.region.geo === quebec.properties.id).map(f => f.color), ['#2c5aa0']);
  });
});
