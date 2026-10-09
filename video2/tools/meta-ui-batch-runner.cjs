#!/usr/bin/env node
'use strict';

/** Run independent meta-ui-runner jobs with a bounded worker pool. */
const {spawn} = require('node:child_process');
const fs = require('node:fs');

const value = name => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const manifestPath = value('manifest');
const resultPath = value('result');
const workers = Math.max(1, Number(value('workers') || 1));
if (!manifestPath || !resultPath) throw new Error('usage: meta-ui-batch-runner.cjs --manifest FILE --result FILE --workers N');
const jobs = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const results = Array(jobs.length);
let next = 0;
let completed = 0;

const pipeLines = (stream, target, prefix) => {
  let pending = '';
  stream.on('data', chunk => {
    pending += chunk.toString();
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() || '';
    for (const line of lines) target.write(`${prefix}${line}\n`);
  });
  stream.on('end', () => { if (pending) target.write(`${prefix}${pending}\n`); });
};

const runJob = (job, index, slot) => new Promise(resolve => {
  console.log(`[storyboard] ${job.label} generating (worker ${slot}/${Math.min(workers, jobs.length)}); ${jobs.length - completed - 1} queued/running`);
  const child = spawn(process.execPath, job.args, {cwd: job.cwd, env: process.env, stdio: ['ignore', 'pipe', 'pipe']});
  pipeLines(child.stdout, process.stdout, `[${job.label}] `);
  pipeLines(child.stderr, process.stderr, `[${job.label}] `);
  child.on('error', error => {
    results[index] = {code: 1, error: error.message};
    completed++;
    console.error(`[storyboard] ${job.label} failed; ${jobs.length - completed} generation(s) remaining`);
    resolve();
  });
  child.on('close', code => {
    if (results[index]) return;
    results[index] = {code: code ?? 1};
    completed++;
    console.log(`[storyboard] ${job.label} ${code === 0 ? 'generated + LLM-audited' : `failed (exit ${code})`}; ${jobs.length - completed} generation(s) remaining`);
    resolve();
  });
});

async function main() {
  const active = Array.from({length: Math.min(workers, jobs.length)}, async (_, slot) => {
    while (true) {
      const index = next++;
      if (index >= jobs.length) return;
      await runJob(jobs[index], index, slot + 1);
    }
  });
  await Promise.all(active);
  fs.writeFileSync(resultPath, `${JSON.stringify(results, null, 2)}\n`);
}

main().catch(error => { console.error(error.stack || error.message); process.exit(1); });
