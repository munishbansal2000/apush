'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const reviewer = require('./review_lessons');

function validReview() {
  return {
    verdict: 'revise', summary: 'One issue.',
    scores: { grammar: 4, ai_slop: 3, factual_accuracy: 5, exaggeration_control: 4 },
    findings: [{ category: 'grammar', severity: 'minor', quote: 'bad phrase',
      problem: 'Agreement.', reason: '', sources: [],
      suggested_fix: 'Fix agreement.', confidence: 0.95 }],
  };
}

test('extractJson accepts fenced Meta output and validates contract', () => {
  const parsed = reviewer.extractJson(`\`\`\`json\n${JSON.stringify(validReview())}\n\`\`\``);
  assert.equal(parsed.findings[0].category, 'grammar');
});

test('invalid score fails closed', () => {
  const value = validReview();
  value.scores.ai_slop = 9;
  assert.throws(() => reviewer.validateReview(value), /integer from 0 to 5/);
});

test('factual dispute requires a reason and an authoritative source URL', () => {
  const value = validReview();
  value.findings[0] = { category: 'fact', severity: 'major', quote: 'Claim',
    problem: 'The claim is inaccurate.', reason: '', sources: [],
    suggested_fix: 'Correct it.', confidence: 0.9 };
  assert.throws(() => reviewer.validateReview(value), /reason is required/);
  value.findings[0].reason = 'The cited chronology contradicts it.';
  assert.throws(() => reviewer.validateReview(value), /at least one authoritative source/);
  value.findings[0].sources = [{ name: 'Britannica', url: 'https://www.britannica.com/topic/example',
    evidence: 'Provides the documented chronology.' }];
  assert.doesNotThrow(() => reviewer.validateReview(value));
});

test('requested lesson glob excludes changelogs', () => {
  const pattern = reviewer.globRegex('*lesson*.md');
  assert.equal(pattern.test('unit3-lesson4.md'), true);
  assert.equal(pattern.test('unit3-CHANGELOG.md'), false);
});

test('explicit file selection is deterministic', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'apush-meta-review-'));
  const file = path.join(dir, 'lesson.md');
  fs.writeFileSync(file, '# Lesson', 'utf8');
  const options = reviewer.parseArgs(['--file', file, '--dry-run']);
  assert.deepEqual(reviewer.selectFiles(options), [file]);
});

test('edge browser alias maps to Playwright msedge channel', () => {
  assert.equal(reviewer.parseArgs(['--file', 'x.md', '--browser', 'edge']).browser, 'msedge');
  assert.equal(reviewer.parseArgs(['--file', 'x.md', '--browser', 'chrome']).browser, 'chrome');
});

test('experienced runtime is read from the script header', () => {
  assert.equal(reviewer.extractRuntimeMinutes(
    '# Episode: 1,879 words + 63s pauses = 11.5 min at 180 WPM.'), 11.5);
  assert.equal(reviewer.extractRuntimeMinutes('# no declared runtime'), null);
});
