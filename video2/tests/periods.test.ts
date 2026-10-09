import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {periodLayers, type MapViewDef, type PeriodFeature} from '../tools/pipeline/map-views';
import {layerGeometryIssues, periodInstant, periodStatus, validatePeriods, type PeriodEntry, type PeriodWorklist} from '../tools/pipeline/periods';

const box = (w: number, s: number, e: number, n: number) => [[[w, s], [e, s], [e, n], [w, n], [w, s]]];
const region = (id: string, coords: unknown, props: Record<string, unknown> = {}): PeriodFeature => ({
  geometry: {type: 'Polygon', coordinates: coords},
  properties: {id, type: 'region', validFrom: '1783-09-03', validTo: '1803-04-30', review: {status: 'approved'}, layer: {base: true, side: 'united-states', label: 'US', labelAt: [-85, 37]}, ...props} as PeriodFeature['properties'],
});
// A square with 8 vertices (the minimum readable resolution).
const square = (w: number, s: number, e: number, n: number) => [[[w, s], [(w + e) / 2, s], [e, s], [e, (s + n) / 2], [e, n], [(w + e) / 2, n], [w, n], [w, (s + n) / 2], [w, s]]];
const entry = (id: string, validFrom: string, validTo?: string, side = 'united-states'): PeriodEntry => ({id, name: id, side, validFrom, ...(validTo ? {validTo} : {}), units: [4], priority: 1, sources: ['treaty']});
const view = {id: 'map.east', name: 'East', projection: 'us', extent: [[-95, 25], [-60, 50]], camera: {center: [-80, 38], zoom: 1}, focus: {a: {center: [-80, 38], zoom: 2}}} as MapViewDef;
const views = {[view.id]: view};

describe('period moments', () => {
  it('a year means the end of that year; a date means that day; a chain hands over without drawing both', () => {
    assert.ok(periodInstant(1783) > periodInstant('1783-09-03'));
    const us1783 = region('geo.region.us@1783', square(-90, 30, -75, 45));
    const us1803 = region('geo.region.us@1803', square(-100, 30, -75, 45), {validFrom: '1803-04-30', validTo: undefined});
    const geo = {a: us1783, b: us1803};
    const at = (p: number | string) => periodLayers(p, view.extent, geo).fills.map(f => f.region.geo);
    assert.deepEqual(at(1803), ['geo.region.us@1803'], 'the handover year shows the new state only');
    assert.deepEqual(at('1803-01-01'), ['geo.region.us@1783'], 'a date before the treaty shows the old one');
    assert.deepEqual(at(1900), ['geo.region.us@1803'], 'no validTo: still true');
    assert.deepEqual(at(1782), []);
  });

  it('later layers draw on top of older ones (a seceded South over the Union)', () => {
    const union = region('geo.region.us@1853', square(-100, 30, -70, 45), {validFrom: '1853-12-30', validTo: undefined});
    const csa = region('geo.region.csa@1861', square(-95, 30, -80, 36), {validFrom: '1861-06-08', validTo: '1865-05-10', layer: {base: true, side: 'confederacy', label: 'CSA', labelAt: [-88, 33]}});
    assert.deepEqual(periodLayers(1862, view.extent, {b: csa, a: union}).fills.map(f => f.region.geo), ['geo.region.us@1853', 'geo.region.csa@1861']);
  });
});

describe('layer geometry', () => {
  it('rejects open, self-crossing, coarse and swapped rings, and a label outside its region', () => {
    const ok = region('geo.region.us@1783', square(-90, 30, -75, 45));
    assert.deepEqual(layerGeometryIssues(ok), []);
    const issues = (coords: unknown, props = {}) => layerGeometryIssues(region('geo.region.x@1783', coords, props)).join('\n');
    assert.match(issues([square(-90, 30, -75, 45)[0].slice(0, -1)]), /not closed/);
    assert.match(issues([[[-90, 30], [-75, 45], [-75, 30], [-90, 45], [-85, 46], [-88, 47], [-89, 46], [-90, 40], [-90, 30]]]), /crosses itself/);
    assert.match(issues(box(-90, 30, -75, 45)), /too coarse/);
    assert.match(issues(square(-100, 30, -75, 45).map(r => r.map(([x, y]) => [y, x]))), /swapped/);
    assert.match(issues(square(-90, 30, -75, 45), {layer: {base: true, side: 'united-states', label: 'US', labelAt: [-60, 20]}}), /labelAt is outside/);
    assert.match(issues(square(-90, 30, -75, 45), {layer: {base: true, side: 'united-states'}}), /needs layer\.label/);
  });
});

describe('period worklist', () => {
  const base = (): PeriodWorklist => ({
    snapshots: [{year: 1790, title: 'After independence', units: [4], views: ['map.east'], layers: ['geo.region.us@1783']}],
    layers: [entry('geo.region.us@1783', '1783-09-03', '1803-04-30'), entry('geo.region.us@1803', '1803-04-30')],
  });

  it('a clean worklist with a matching file passes', () => {
    const r = validatePeriods(base(), {u: region('geo.region.us@1783', square(-90, 30, -75, 45))}, views);
    assert.deepEqual(r.errors, []);
  });

  it('checks ids, chains and snapshots', () => {
    const errors = (mutate: (l: PeriodWorklist) => void) => { const l = base(); mutate(l); return validatePeriods(l, {}, views).errors.join('\n'); };
    assert.match(errors(l => { l.layers[0].id = 'geo.region.us@1784'; }), /id's year must be validFrom's year/);
    assert.match(errors(l => { l.layers[0].validTo = '1805-01-01'; }), /overlaps geo.region.us@1803/);
    assert.match(errors(l => { delete l.layers[0].validTo; }), /has no validTo but geo.region.us@1803 follows/);
    assert.match(errors(l => { l.snapshots[0].year = 1810; }), /not valid at the end of 1810/);
    assert.match(errors(l => { l.snapshots[0].layers.push('geo.region.nowhere@1790'); }), /not in the layers list/);
    assert.match(errors(l => { l.snapshots[0].views = ['map.west']; }), /view map.west is not in data\/library\/maps/);
    assert.match(errors(l => { l.layers[1].side = 'dutch'; }), /side must be one of/);
    const gap = base();
    gap.layers[1] = entry('geo.region.us@1804', '1804-01-01');
    assert.match(validatePeriods(gap, {}, views).warnings.join('\n'), /gap from 1803-04-30 to 1804-01-01/);
  });

  it('a file must be planned first and agree with its entry; it must be on some view', () => {
    const errors = (f: PeriodFeature) => validatePeriods(base(), {f}, views).errors.join('\n');
    assert.match(errors(region('geo.region.texas@1836', square(-100, 26, -94, 34), {validFrom: '1836-03-02'})), /must be listed in data\/library\/periods\.json first/);
    assert.match(errors(region('geo.region.us@1783', square(-90, 30, -75, 45), {validTo: '1800-01-01'})), /validTo 1800-01-01 differs from the worklist/);
    assert.match(errors(region('geo.region.us@1783', square(10, 40, 20, 50), {layer: {base: true, side: 'united-states', label: 'US', labelAt: [15, 45]}})), /no map view covers it/);
  });

  it('two sides on the same ground at once is an error, unless one is contested', () => {
    const list = base();
    list.layers.push(entry('geo.region.florida@1783', '1783-09-03', '1821-02-22', 'spanish'));
    const us = region('geo.region.us@1783', square(-90, 30, -75, 45));
    const fl = (precision: string) => region('geo.region.florida@1783', square(-88, 26, -78, 38), {validTo: '1821-02-22', precision, layer: {base: true, side: 'spanish', label: 'Florida', labelAt: [-82, 28]}});
    assert.match(validatePeriods(list, {us, fl: fl('approximate')}, views).errors.join('\n'), /overlap .* trace the shared border once/);
    const contested = validatePeriods(list, {us, fl: fl('contested')}, views);
    assert.deepEqual(contested.errors, []);
    assert.match(contested.warnings.join('\n'), /drawn as contested/);
    const neighbour = region('geo.region.florida@1783', square(-88, 25, -78, 30.02), {validTo: '1821-02-22', layer: {base: true, side: 'spanish', label: 'Florida', labelAt: [-82, 28]}});
    assert.deepEqual(validatePeriods(list, {us, fl: neighbour}, views).errors, [], 'a border traced a hair apart is not an overlap');
  });

  it('status reports each snapshot layer as missing, in review or approved', () => {
    const st = periodStatus(base(), {'geo.region.us@1783': region('geo.region.us@1783', square(-90, 30, -75, 45), {review: {status: 'candidate'}})});
    assert.deepEqual(st.snapshots[0].layers, [{id: 'geo.region.us@1783', status: 'candidate'}]);
    assert.deepEqual(st.layers.map(l => l.status), ['candidate', 'missing']);
  });
});
