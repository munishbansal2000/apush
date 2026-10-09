import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {applyRenames, loadRenames, renamedHint} from '../tools/pipeline/renames';

describe('renamed library ids', () => {
  it('rewrites whole id values only, and names the new id when an old one turns up', () => {
    const renames = {'map.north-america-1763': 'map.north-america'};
    const r = applyRenames(JSON.stringify({view: 'map.north-america-1763', note: 'see map.north-america-1763 in text', image: 'historic/map.north-america-1763.jpg'}), renames);
    assert.equal(r.count, 1);
    assert.deepEqual(JSON.parse(r.text), {view: 'map.north-america', note: 'see map.north-america-1763 in text', image: 'historic/map.north-america-1763.jpg'});
    assert.match(renamedHint('map.eastern-frontier-1763', loadRenames()), /renamed to "map.eastern-north-america": run npm run maps -- migrate/);
    assert.equal(renamedHint('map.nowhere', loadRenames()), '');
  });
});
