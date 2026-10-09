import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {guardHeartbeat, layoutIssuesFromLog} from '../tools/pipeline/stages/render';

describe('layout guard browser logs', () => {
  const beat = '[kit-layout-ok] {"frame":42,"tracks":{"stage":[0.06,0.13,0.7,0.775]}}';
  const issue = '[kit-layout] {"frame":42,"issues":[{"kind":"overlap","id":"chrome:captions","other":"chrome:head","detail":"overlaps"}]}';

  it('reads the per-frame heartbeat and never mistakes it for an issue', () => {
    assert.equal(guardHeartbeat(beat), 42);
    assert.deepEqual(layoutIssuesFromLog(beat), []);
  });

  it('parses issue reports and ignores unrelated logs', () => {
    assert.equal(guardHeartbeat(issue), null);
    assert.deepEqual(layoutIssuesFromLog(issue).map(i => [i.frame, i.kind, i.id, i.other]), [[42, 'overlap', 'chrome:captions', 'chrome:head']]);
    assert.equal(guardHeartbeat('some other console line'), null);
    assert.deepEqual(layoutIssuesFromLog('some other console line'), []);
  });
});
