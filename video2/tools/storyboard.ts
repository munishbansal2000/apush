/**
 * Storyboard tools (docs/STORYBOARD.md, stage S1).
 *
 *   npm run storyboard -- u3e1 bootstrap [--force]   data/u3e1/shots.json -> data/u3e1/storyboard.json
 *   npm run storyboard -- u3e1 check                 anchors, stale turns, image budget, thin coverage
 *   npm run storyboard -- u3e1 sheet                 out/review/u3e1-storyboard.html (line, visuals, thumbnails, problems)
 */
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {join, relative} from 'node:path';
import {ROOT} from './lib';
import {normalizeTurns, readJson, type PipelineTurn} from './pipeline-core';
import type {ShotPlan} from './pipeline/shots';
import {loadImageReview, planActs, rejectedKeys} from './pipeline/review';
import {bootstrapStoryboard, checkStoryboard, normWords, turnKeys, type Storyboard, type StoryVisual} from './pipeline/storyboard';
import {cleanSpeech} from './pipeline/speech';

const [ep, cmd] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const fail = (m: string): never => { console.error(m); process.exit(1); };
if (!ep || !cmd) { console.log('usage: npm run storyboard -- <lesson> bootstrap [--force] | check | sheet'); process.exit(1); }

const dataDir = join(ROOT, 'data', ep);
const sbPath = join(dataDir, 'storyboard.json');
const turns = existsSync(join(dataDir, 'turns.json')) ? normalizeTurns(readJson(relative(ROOT, join(dataDir, 'turns.json')))) as PipelineTurn[] : fail(`${ep}: no data/${ep}/turns.json (run the turns stage)`);
const timing = existsSync(join(dataDir, 'timing_map.json')) ? readJson<{starts: number[]; durations: number[]}>(relative(ROOT, join(dataDir, 'timing_map.json'))) : {starts: [], durations: turns.map(() => 0)};
const loadBoard = () => (existsSync(sbPath) ? readJson<Storyboard>(relative(ROOT, sbPath)) : fail(`${ep}: no storyboard yet (npm run storyboard -- ${ep} bootstrap)`));
const check = (sb: Storyboard) => checkStoryboard(sb, turns, timing.durations, {rejectedImages: rejectedKeys(loadImageReview())});

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** The line with each visual's anchor phrase marked. */
function markLine(text: string, visuals: StoryVisual[]): string {
  let html = esc(cleanSpeech(text));
  for (const [n, v] of visuals.entries()) {
    const words = normWords(v.at.phrase).split(' ').filter(Boolean);
    if (!words.length) continue;
    const re = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join("[^a-z0-9']+")})`, 'i');
    html = html.replace(re, `<mark title="visual ${n + 1}">$1</mark><sup>${n + 1}</sup>`);
  }
  return html;
}
function visualCell(v: StoryVisual, n: number): string {
  const label = `<b>${n + 1}</b> ${v.kind}${v.framing ? ` · ${v.framing}` : ''}${v.pace ? ` · ${v.pace}` : ''}${v.priority === 'optional' ? ' · optional' : ''}${v.span ? ` · spans ${v.span}` : ''}`;
  const image = v.kind === 'point' ? v.backdrop : v.image;
  const thumb = image ? `<img src="../../public/${esc(image)}" loading="lazy" title="${esc(image)}">` : '';
  const detail = v.kind === 'map' ? esc(JSON.stringify(v.map).slice(0, 160))
    : v.kind === 'point' ? esc((v.bullets ?? []).map(b => b.text).join(' / '))
      : v.kind === 'custom' ? esc(v.component ?? '')
        : v.kind === 'clip' ? `LTX: ${esc(v.prompt ?? '')}`
          : v.name ? esc(`${v.name}${v.role ? ` · ${v.role}` : ''}`) : esc((image ?? '').split('/').pop() ?? '');
  return `<div class="v">${thumb}<div>${label}<br><small>${detail}</small></div></div>`;
}

function sheet(sb: Storyboard) {
  const c = check(sb);
  const keys = turnKeys(turns);
  const byKey = new Map(sb.turns.map(t => [t.key, t]));
  const acts = sb.acts.length ? sb.acts : [{title: 'Lesson', turns: {from: 0, to: turns.length - 1}}];
  const rows = acts.map((a, ai) => {
    const body = turns.slice(a.turns.from, a.turns.to + 1).map((t, k) => {
      const i = a.turns.from + k;
      const st = byKey.get(keys[i]);
      const visuals = st?.visuals ?? [];
      if (t.kind === 'pause') return `<tr class="pause"><td>${i}</td><td colspan="3">pause ${t.pauseSec}s → question card</td></tr>`;
      return `<tr><td>${i}</td><td>${esc(t.speaker ?? '')}<br><small>${(timing.durations[i] ?? 0).toFixed(1)}s</small></td><td>${markLine(t.text ?? '', visuals)}</td><td>${visuals.map(visualCell).join('') || '<i>(continues)</i>'}</td></tr>`;
    }).join('\n');
    return `<h2>Act ${ai + 1}: ${esc(a.title)} <small>turns ${a.turns.from}-${a.turns.to}</small></h2>\n<table>${body}</table>`;
  }).join('\n');
  const overused = [...c.uses].filter(([, n]) => n > 2).sort((x, y) => y[1] - x[1]).map(([p, n]) => `${esc(p.split('/').pop()!)} ×${n}`).join(', ');
  const html = `<!doctype html><meta charset="utf-8"><title>${ep} storyboard</title>
<style>body{font:14px system-ui;margin:24px;max-width:1400px}table{border-collapse:collapse;width:100%}td{border-top:1px solid #ddd;padding:6px;vertical-align:top}
td:nth-child(3){width:45%}mark{background:#ffe08a}.v{display:flex;gap:8px;margin-bottom:6px}.v img{width:160px;height:96px;object-fit:cover;border:1px solid #ccc}
tr.pause td{color:#888;font-style:italic}.issues{background:#fff3f3;padding:8px 16px}.warn{background:#fffbe8;padding:8px 16px}</style>
<h1>${ep} storyboard</h1>
<p>${sb.turns.reduce((n, t) => n + t.visuals.length, 0)} visuals over ${turns.length} turns · images used more than twice: ${overused || 'none'}</p>
${c.issues.length ? `<div class="issues"><b>${c.issues.length} problem(s)</b><ul>${c.issues.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>` : ''}
${c.warnings.length ? `<div class="warn"><b>${c.warnings.length} warning(s)</b><ul>${c.warnings.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>` : ''}
${rows}`;
  const out = join(ROOT, 'out', 'review', `${ep}-storyboard.html`);
  mkdirSync(join(ROOT, 'out', 'review'), {recursive: true});
  writeFileSync(out, html);
  console.log(`storyboard sheet -> ${relative(ROOT, out)} (${c.issues.length} problem(s), ${c.warnings.length} warning(s))`);
}

switch (cmd) {
  case 'bootstrap': {
    if (existsSync(sbPath) && !process.argv.includes('--force')) fail(`${relative(ROOT, sbPath)} exists; --force to replace it`);
    const planPath = join(dataDir, 'shots.json');
    if (!existsSync(planPath)) fail(`${ep}: no data/${ep}/shots.json to bootstrap from`);
    const plan = readJson<ShotPlan & {acts?: {title: string; turns: {from: number; to: number}}[]}>(relative(ROOT, planPath));
    const acts = planActs(plan, join(ROOT, 'out', 'pipeline', ep, 'doc-outline.accepted.json'));
    const sb = bootstrapStoryboard(plan, turns, acts);
    writeFileSync(sbPath, `${JSON.stringify(sb, null, 2)}\n`);
    const c = check(sb);
    console.log(`${ep}: storyboard with ${sb.turns.reduce((n, t) => n + t.visuals.length, 0)} visuals over ${turns.length} turns${acts.length ? `, ${acts.length} acts` : ' (no act boundaries found)'} -> ${relative(ROOT, sbPath)}`);
    console.log(`  ${c.issues.length} problem(s), ${c.warnings.length} warning(s); see: npm run storyboard -- ${ep} sheet`);
    break;
  }
  case 'check': {
    const c = check(loadBoard());
    for (const i of c.issues) console.log(`  problem: ${i}`);
    for (const w of c.warnings) console.log(`  warning: ${w}`);
    console.log(`${ep}: ${c.issues.length} problem(s), ${c.warnings.length} warning(s)`);
    process.exitCode = c.issues.length ? 1 : 0;
    break;
  }
  case 'sheet': sheet(loadBoard()); break;
  default: fail(`unknown command ${cmd}`);
}
