/**
 * Overnight: build every lesson of a unit end to end, unattended, and leave a report in the morning.
 *
 *   npx tsx tools/overnight-unit.ts --unit 3                 images -> depth maps -> every lesson (final videos)
 *   npx tsx tools/overnight-unit.ts --unit 3 --lessons u3e1,u3e4
 *   npx tsx tools/overnight-unit.ts --unit 3 --list          show the plan and exit
 *   npx tsx tools/overnight-unit.ts --unit 3 --mode prod      final Fish voices (default: dev, edge-tts)
 *   options: --skip-images  --skip-depth  --no-clips (no LTX)  --no-draft (approved geography only)  --preview (no final render)
 *
 * 1. images   python tools/download-u3-images.py --all: polite downloads of the unit's catalogs, registered for the director
 * 2. depth    python tools/depth-maps.py per lesson folder (2.5D parallax; skipped with a warning if torch is missing)
 * 3. lessons  tools/video-pipeline.ts --episode <ep> --full --draft --skip images for each lesson, one at a time
 * 4. retry    each failed lesson once more; when LTX was the problem, the retry renders without clips (stills move instead)
 * Every step is resumable (checkpoints), so re-running the same command after a crash continues where it stopped.
 * A failing lesson never stops the others. Logs and summary.md go to out/overnight/<timestamp>/.
 * Prod (Fish): set FISH_API_KEYS="k1,k2,..." or FISH_API_KEYS_FILE (one per line); tools/fish_tts.py calls the Fish
 * cloud API (FISH_TTS_SCRIPT swaps in another script). Keys go
 * round-robin per lesson (lesson 1 key 1, lesson 2 key 2, ...); the key reaches the Fish script as FISH_API_KEY.
 * Needs: Meta UI login (director), LTX Desktop running (clips), Fish/edge-tts set up (audio). Keep the PC awake.
 */
import {spawn} from 'node:child_process';
import {createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, relative} from 'node:path';
import {ROOT, arg} from './lib';
import {findTool, pipelinePython} from './pipeline/tools';
import {keyTag, loadFishKeys} from './pipeline/fish-keys';
import {parseTranscript, resolveAudioScript} from './pipeline-core';

const flag = (name: string) => process.argv.includes(`--${name}`);
/** --name value, --name=value; --lesson is accepted for --lessons (a typo used to fall back to the whole unit). */
const opt = (name: string, ...aliases: string[]): string | undefined => {
  for (const n of [name, ...aliases]) {
    const eq = process.argv.find(a => a.startsWith(`--${n}=`));
    if (eq) return eq.slice(n.length + 3);
    const v = arg(n);
    if (v !== undefined) return v;
  }
  return undefined;
};
const KNOWN = new Set(['unit', 'lessons', 'lesson', 'mode', 'list', 'skip-images', 'skip-depth', 'no-clips', 'no-draft', 'preview']);
for (const a of process.argv.slice(2)) {
  const m = /^--([^=]+)/.exec(a);
  if (m && !KNOWN.has(m[1])) { console.error(`unknown option --${m[1]} (known: ${[...KNOWN].map(k => `--${k}`).join(' ')})`); process.exit(1); }
}
const unit = opt('unit');
if (!unit || !/^\d+$/.test(unit)) {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]);
  process.exit(1);
}
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const logDir = join(ROOT, 'out', 'overnight', `u${unit}-${stamp}`);

/** Lessons of the unit that have a canonical script, in teaching order (cram last). */
function unitLessons(): string[] {
  const scripts = join(process.env.AUDIO_SCRIPTS_DIR ?? join(ROOT, '..', 'audio_scripts'), `unit${unit}`);
  const found = new Set<string>();
  for (const f of existsSync(scripts) ? readdirSync(scripts) : []) {
    const m = new RegExp(`apush-audio-u${unit}-(e\\d+|cram)-script`, 'i').exec(f);
    if (m) found.add(`u${unit}${m[1].toLowerCase()}`);
  }
  const order = (e: string) => (e.endsWith('cram') ? 999 : Number(e.slice(e.indexOf('e', 1) + 1)));
  return [...found].sort((a, b) => order(a) - order(b));
}

/** Runs a command, teeing output to the console and a log file; resolves with the exit code. */
function run(label: string, cmd: string, args: string[], logName: string, extraEnv: NodeJS.ProcessEnv = {}): Promise<{code: number; log: string}> {
  const log = join(logDir, logName);
  const out = createWriteStream(log, {flags: 'a'});
  out.write(`\n$ ${cmd} ${args.join(' ')}\n`);
  console.log(`\n[${label}] ${new Date().toLocaleTimeString()}  ${cmd.split(/[\\/]/).pop()} ${args.join(' ')}`);
  return new Promise(resolve => {
    const child = spawn(cmd, args, {cwd: ROOT, env: {...process.env, ...extraEnv}});
    const tee = (chunk: Buffer) => { process.stdout.write(chunk); out.write(chunk); };
    child.stdout.on('data', tee);
    child.stderr.on('data', tee);
    child.on('error', error => { out.write(`\n${error.message}\n`); out.end(); resolve({code: 1, log}); });
    child.on('close', code => { out.end(); resolve({code: code ?? 1, log}); });
  });
}

const tail = (log: string, n = 12) => (existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').slice(-n).join('\n') : '');
const minutes = (ms: number) => `${Math.round(ms / 60000)} min`;
const tsx = join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');

interface Result {lesson: string; ok: boolean; took: string; attempt: number; note: string; video?: string; log: string}

async function main() {
  const lessonArg = opt('lessons', 'lesson');
  // "--lessons u3e1,u3e2", "--lessons u3e1 u3e2" (PowerShell may split on commas), or "--lessons=u3e1,u3e2".
  const flagAt = process.argv.findIndex(a => a === '--lessons' || a === '--lesson');
  const extra: string[] = [];
  for (let i = flagAt + 2; flagAt >= 0 && i < process.argv.length && !process.argv[i].startsWith('--'); i++) extra.push(process.argv[i]);
  const lessons = lessonArg === undefined ? unitLessons() : [lessonArg, ...extra].flatMap(a => a.split(/[,\s]+/)).map(s => s.trim().toLowerCase()).filter(Boolean);
  const known = new Set(unitLessons());
  const unknown = lessons.filter(l => !known.has(l));
  if (unknown.length) { console.error(`no unit ${unit} script for: ${unknown.join(', ')} (lessons: ${[...known].join(', ')})`); process.exit(1); }
  if (!lessons.length) throw new Error(`no lessons found for unit ${unit}`);
  if (flag('list')) {
    console.log(`unit ${unit}: ${lessons.length} lessons: ${lessons.join(', ')}`);
    for (const l of lessons) console.log(`  ${l}: ${existsSync(join(ROOT, 'out', `${l}.mp4`)) ? 'video exists (checkpoints decide what re-runs)' : 'no video yet'}`);
    return;
  }
  mkdirSync(logDir, {recursive: true});
  const started = Date.now();
  const steps: string[] = [];
  console.log(`[overnight] unit ${unit}: ${lessons.join(', ')}${lessonArg === undefined ? ' (all; use --lessons u3e1,u3e2 for some)' : ''}\n[overnight] logs: ${relative(ROOT, logDir)}`);

  // 1. Images from the unit catalogs (polite; skips what is already on disk).
  const downloader = join(ROOT, 'tools', `download-u${unit}-images.py`);
  if (!flag('skip-images') && existsSync(downloader)) {
    let code = 0;
    // Only the listed lessons' catalogs; a failed lesson does not stop the others.
    if (lessonArg !== undefined) for (const l of lessons) { const c = (await run('images', pipelinePython(), [downloader, '--lesson', l], 'images.log')).code; code = code || c; }
    else code = (await run('images', pipelinePython(), [downloader, '--all'], 'images.log')).code;
    steps.push(`images: ${code === 0 ? 'ok' : `exit ${code} (see images.log); continuing with what downloaded`}`);
  } else steps.push(`images: skipped${existsSync(downloader) ? '' : ` (no tools/download-u${unit}-images.py)`}`);

  // 2. Depth maps per lesson folder (torch lives in the LTX/diffusers Python more often than the pipeline one).
  if (!flag('skip-depth')) {
    let python: string;
    try { python = findTool(['python3', 'python'], process.env.DEPTH_PYTHON ? 'DEPTH_PYTHON' : process.env.LTX_PYTHON ? 'LTX_PYTHON' : undefined); } catch { python = pipelinePython(); }
    const notes: string[] = [];
    for (const lesson of lessons) {
      const dir = join(ROOT, 'public', 'historic', lesson);
      const files = existsSync(dir) ? readdirSync(dir).filter(f => /\.(jpe?g|png|webp)$/i.test(f)).map(f => join('public', 'historic', lesson, f)) : [];
      if (!files.length) continue;
      const {code, log} = await run('depth', python, [join('tools', 'depth-maps.py'), ...files], 'depth.log');
      if (code !== 0) {
        notes.push(`${lesson}: exit ${code}`);
        if (/missing dependency/.test(tail(log, 3))) { notes.push('torch/transformers missing: set DEPTH_PYTHON or pip install -r requirements-depth.txt; shots stay flat'); break; }
      }
    }
    steps.push(`depth maps: ${notes.length ? notes.join('; ') : 'ok'}`);
  } else steps.push('depth maps: skipped');

  // Prod preflight: the Fish script, keys, and a voice for every speaker (lessons missing one will fail at audio).
  const mode = opt('mode') ?? 'dev';
  const noVoice = new Set<string>();
  const keys = mode === 'prod' ? loadFishKeys() : [];
  if (mode === 'prod') {
    if (!keys.length && !process.env.FISH_API_KEY && !process.env.FISH_TTS_SCRIPT) throw new Error('--mode prod needs Fish API keys: set FISH_API_KEYS="k1,k2" or FISH_API_KEYS_FILE');
    const voices = (JSON.parse(readFileSync(join(ROOT, 'data', 'pipeline.json'), 'utf8')) as {fish: {voices: Record<string, string>}}).fish.voices;
    const scripts = process.env.AUDIO_SCRIPTS_DIR ?? join(ROOT, '..', 'audio_scripts');
    const missing = lessons.flatMap(l => {
      // Collected as "<lesson> (<speakers>)"; the lesson itself goes into `noVoice` and is skipped below.
      const f = resolveAudioScript(scripts, l);
      if (!f) return [];
      const speakers = [...new Set(parseTranscript(readFileSync(f, 'utf8')).filter(t => t.kind === 'speech').map(t => t.speaker ?? 'narrator'))];
      const without = speakers.filter(s => !voices[s]);
      if (without.length) noVoice.add(l);
      return without.length ? [`${l} (${without.join(', ')})`] : [];
    });
    steps.push(`Fish: ${keys.length} key(s)${keys.length ? `, round-robin per lesson (${keys.map(keyTag).join(', ')})` : ' (none set: the Fish script uses its own key)'}`);
    if (missing.length) steps.push(`skipped, no Fish voice in data/pipeline.json for: ${missing.join('; ')}`);
    console.log(`[overnight] ${steps.slice(-2).join('\n[overnight] ')}`);
  }

  // 3 + 4. Lessons, one at a time; failed ones retried once at the end.
  const base = ['--mode', mode, '--full', '--skip', 'images', ...(flag('no-draft') ? [] : ['--draft']), ...(flag('no-clips') ? ['--video-gen', 'none'] : [])];
  if (flag('preview')) base.splice(base.indexOf('--full'), 1);
  const results = new Map<string, Result>();
  const build = async (lesson: string, attempt: number, extra: string[] = []) => {
    const t0 = Date.now();
    const {code, log} = await run(`${lesson}${attempt > 1 ? ' retry' : ''}`, process.execPath, [tsx, join('tools', 'video-pipeline.ts'), '--episode', lesson, ...base, ...extra], `${lesson}.log`);
    const text = tail(log, 40);
    const waiting = /waiting for \d+ agent answer/.test(text);
    const video = join(ROOT, 'out', `${lesson}.mp4`);
    const ok = code === 0 && !waiting && (flag('preview') || existsSync(video));
    const note = ok ? (extra.includes('none') ? 'rendered without LTX clips' : '') : waiting ? 'director is waiting for agent answers (agent mode?)' : (text.split('\n').reverse().find(l => /error|failed|not reachable|invalid|missing/i.test(l)) ?? `exit ${code}`).trim().slice(0, 200);
    results.set(lesson, {lesson, ok, took: minutes(Date.now() - t0), attempt, note, video: ok && !flag('preview') ? relative(ROOT, video) : undefined, log: relative(ROOT, log)});
  };
  for (const lesson of lessons) {
    if (noVoice.has(lesson)) results.set(lesson, {lesson, ok: false, took: '0 min', attempt: 0, note: 'skipped: a speaker has no Fish voice id (data/pipeline.json fish.voices)', log: '-'});
    else await build(lesson, 1);
  }
  for (const lesson of lessons.filter(l => !results.get(l)!.ok && !noVoice.has(l))) {
    const ltx = /LTX|ltx_desktop|\[clips\]/i.test(tail(join(logDir, `${lesson}.log`), 60));
    await build(lesson, 2, ltx && !flag('no-clips') ? ['--video-gen', 'none'] : []);
  }

  // Report.
  const rows = lessons.map(l => results.get(l)!);
  const done = rows.filter(r => r.ok).length;
  const summary = [
    `# Overnight unit ${unit}: ${done}/${rows.length} lessons built (${minutes(Date.now() - started)})`,
    '',
    `Started ${new Date(started).toLocaleString()}. Re-run the same command to continue; finished lessons are checkpointed.`,
    '',
    ...steps.map(s => `- ${s}`),
    '',
    '| Lesson | Result | Time | Attempt | Video / problem | Log |',
    '|---|---|---|---|---|---|',
    ...rows.map(r => `| ${r.lesson} | ${r.ok ? 'ok' : 'FAILED'} | ${r.took} | ${r.attempt} | ${(r.ok ? [r.video, r.note].filter(Boolean).join(' · ') : r.note).replace(/\|/g, '/')} | ${r.log} |`),
    '',
  ].join('\n');
  writeFileSync(join(logDir, 'summary.md'), summary);
  console.log(`\n${summary}\nsummary -> ${relative(ROOT, join(logDir, 'summary.md'))}`);
  process.exitCode = done === rows.length ? 0 : 1;
}

await main();
