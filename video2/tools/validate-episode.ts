/**
 * Pre-render gate. Run before every render and in CI.
 *   npm run validate              dev: estimated anchors and unapproved pronunciations warn
 *   npm run validate:prod         --strict: they fail, plus credits required
 *   --json                        machine-readable output
 *   --no-audio                    skip ffprobe checks
 * Exit code 1 on any error.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Issue } from '../src/kit/types';
import { validateEpisode } from '../src/kit/validate';
import { audioPath, ffprobeDuration, flag, listFiles, loadEpisode, PUBLIC, readJsonOr } from './lib';

const ep = loadEpisode();
const strict = flag('strict');
const turns = ep.turns();

const audioDurations: Record<string, number> | undefined = flag('no-audio')
  ? undefined
  : Object.fromEntries(
      turns.turns
        .filter(t => t.kind === 'speech')
        .map(t => [t.id, audioPath(ep.spec.id, t.id)] as const)
        .filter(([, f]) => existsSync(f))
        .map(([id, f]) => [id, ffprobeDuration(f)]),
    );

const { issues, stats } = validateEpisode({
  spec: ep.spec,
  scriptSrc: ep.scriptSrc,
  turns,
  timing: ep.timing(),
  wordTimes: ep.wordTimes(),
  manifest: ep.manifest,
  config: ep.config,
  style: ep.style,
  facts: ep.facts,
  pron: ep.pron,
  strict,
  audioDurations,
  publicFileExists: rel => existsSync(join(PUBLIC, rel)),
  publicImages: listFiles(join(PUBLIC, 'historic'), /\.(jpe?g|png|webp)$/i),
  terms: ep.terms,
  places: ep.places,
  imageLock: readJsonOr('data/images.lock.json', {}),
  publicFileSha: rel => (existsSync(join(PUBLIC, rel)) ? createHash('sha256').update(readFileSync(join(PUBLIC, rel))).digest('hex') : null),
});

if (flag('json')) {
  console.log(JSON.stringify({ stats, issues }, null, 2));
} else {
  const order: Record<Issue['level'], number> = { error: 0, warn: 1, info: 2 };
  const tty = process.stdout.isTTY;
  const color = tty ? ({ error: '\x1b[31m', warn: '\x1b[33m', info: '\x1b[90m' } as const) : { error: '', warn: '', info: '' };
  for (const i of [...issues].sort((a, b) => order[a.level] - order[b.level] || a.code.localeCompare(b.code))) {
    console.log(`${color[i.level]}${i.level.padEnd(5)}${tty ? "\x1b[0m" : ""} ${i.code} ${i.where}: ${i.msg}`);
  }
  const n = (l: Issue['level']) => issues.filter(i => i.level === l).length;
  console.log(`\n${ep.spec.id} ${strict ? '[strict]' : '[dev]'}  ${Object.entries(stats).map(([k, v]) => `${k}=${v}`).join('  ')}`);
  console.log(`${n('error')} errors, ${n('warn')} warnings, ${n('info')} info`);
}
process.exit(issues.some(i => i.level === 'error') ? 1 : 0);
