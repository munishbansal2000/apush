import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {auditTurns, isPrompt} from '../tools/audit-scripts';
import {parseTranscript} from '../tools/pipeline-core';

const filler = Array.from({length: 12}, (_, i) => `Marcus: Teaching line ${i + 1}.`).join('\n');
const good = [
  'Maya: Which one buys time?', '[10-second pause]', 'Marcus: The line does.', filler,
  'Maya: Three questions, AP-shaped. Say your answer before I give it.',
  'Maya: One. Using the episode, explain the debt.', '[10-second pause]', 'Maya: The war cost a fortune.',
  'Maya: Two: name the line.', '[10-second pause]', 'Maya: The Proclamation Line.',
  'Maya: Three. Which mattered most, and why?', '[10-second pause]', 'Maya: Broken trust.',
  'Maya: One more, fast. Who led the coalition?', '[10-second pause]', 'Maya: Pontiac.',
  'Maya: Check your boxes.',
].join('\n');

describe('script audit (questions and pauses)', () => {
  it('passes a lesson that follows the convention, bonus question included', () => {
    const a = auditTurns('u9e1', 'x.md', parseTranscript(good));
    assert.deepEqual(a.issues, []);
    assert.equal(a.thinkPauses, 1);
    assert.equal(a.practiceQuestions, 3);
  });

  it('flags a pause marker written inside a spoken line (no real pause)', () => {
    const inline = good.replace("Maya: Three. Which mattered most, and why?\n[10-second pause]\nMaya: Broken trust.", 'Maya: Three. Which mattered most, and why? [10-second pause] Broken trust.');
    const a = auditTurns('u9e1', 'x.md', parseTranscript(inline));
    assert.match(a.issues.join('\n'), /R5 .* inside a spoken line/);
    assert.match(a.issues.join('\n'), /practice block has 2 question pause/);
  });

  it('flags pauses that are not the uniform 10s, missing blocks, and pauses after statements', () => {
    assert.match(auditTurns('u9e1', 'x.md', parseTranscript(good.replace('[10-second pause]', '[15-second pause]'))).issues.join('\n'), /R2 .*\(15s\): question pauses are 10s/);
    assert.match(auditTurns('u9e1', 'x.md', parseTranscript(good.replace('Maya: Two: name the line.\n[10-second pause]', 'Maya: Two: name the line.\n[18-second pause]'))).issues.join('\n'), /R2 .*\(18s\): question pauses are 10s/);
    assert.match(auditTurns('u9e1', 'x.md', parseTranscript(`Maya: Hello.\n${filler}\nMaya: Bye.`)).issues.join('\n'), /R1 no practice block/);
    assert.match(auditTurns('u9e1', 'x.md', parseTranscript(good.replace('Maya: Which one buys time?', 'Maya: The line was drawn.'))).issues.join('\n'), /R3 .* not preceded by a question/);
  });

  it('recognizes prompts phrased as instructions, not just question marks', () => {
    for (const text of ['Three: name two things the Northwest Ordinance did, and one limit.', 'Using evidence from the episode, argue it was about more than religion.', 'Sign or wait? Eight seconds.', 'Your turn.', 'A textbook prints the Proviso and asks why it mattered.'])
      assert.ok(isPrompt(text), text);
    assert.ok(!isPrompt('The Bank is gone.'));
  });
});
