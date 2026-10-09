/**
 * Review: mark work approved (frozen: the pipeline reuses it even when code changes) or note what needs fixing (the next
 * run fixes only that). State lives in data/<lesson>/review.json and data/library/review/*.json (commit them).
 *
 *   npm run review -- status --unit 3                     board for the unit -> docs/UNIT3_STATUS.md
 *   npm run review -- u3e1 status                         one lesson in detail (acts, notes, clips)
 *   npm run review -- u3e1 approve audio | render
 *   npm run review -- u3e1 approve storyboard [--acts 1-3] the storyboard (what is on screen per line) frozen per act
 *   npm run review -- u3e1 note --storyboard --turn 18 "show the Proclamation map here"   (or --act 3)
 *   npm run review -- treatment historic/u3e1/x.jpg approve | needs-work ["focus on the left figure"]
 *   npm run review -- u3e1 approve plan [--acts 1,2,4-8]  default: every act
 *   npm run review -- u3e1 unapprove audio | plan [--acts 3] | render
 *   npm run review -- u3e1 note --shot shot045 "wrong image: use the Proclamation map"   (ids from the contact sheet)
 *   npm run review -- u3e1 note --act 3 "too many maps in a row"
 *   npm run review -- u3e1 clip shot015 approve | reject --regenerate | reject --still ["note"]
 *   npm run review -- images u3e1                         image sheet -> out/review/u3e1-images.png (+ .txt index)
 *   npm run review -- image u3e1:12 reject "blurry scan"  (or the image path; approve | reject)
 *   npm run review -- component PontiacFortsMap approve | reject | needs-work ["note"]
 */
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join, relative} from 'node:path';
import {ROOT, arg} from './lib';
import {readJson, resolveAudioScript} from './pipeline-core';
import {CUSTOM_NAMES} from '../src/components/custom/catalog';
import {loadTreatments, saveTreatments} from './pipeline/treatments';
import {
  loadComponentReview, loadImageReview, loadLessonReview, locateShot, now, openNotes, planActs, saveComponentReview,
  saveImageReview, saveLessonReview, type LessonReview, type Status,
} from './pipeline/review';

const args = process.argv.slice(2);
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && !['--regenerate', '--still', '--storyboard'].includes(args[i - 1])));
const fail = (message: string): never => { console.error(message); process.exit(1); };
const shotsPath = (ep: string) => join(ROOT, 'data', ep, 'shots.json');
const outlinePath = (ep: string) => join(ROOT, 'out', 'pipeline', ep, 'doc-outline.accepted.json');
type Plan = {shots: {type: string; at: {turn: number}; image?: string; seed?: number; focus?: number[]; component?: string; [k: string]: unknown}[]; acts?: {title: string; turns: {from: number; to: number}}[]};
/** The lesson plan; act boundaries found only in the local saved outline are written into shots.json (commit it). */
function loadPlan(ep: string): Plan | null {
  if (!existsSync(shotsPath(ep))) return null;
  const plan = readJson<Plan>(relative(ROOT, shotsPath(ep)));
  if (!plan.acts?.length) {
    const acts = planActs(plan, outlinePath(ep));
    if (acts.length) {
      plan.acts = acts.map(a => ({title: a.title, purpose: (a as {purpose?: string}).purpose, turns: a.turns}));
      writeFileSync(shotsPath(ep), `${JSON.stringify(plan, null, 2)}\n`);
      console.log(`(${ep}: act boundaries written into data/${ep}/shots.json from the saved outline; commit it)`);
    }
  }
  return plan;
}
const shotIndex = (id: string) => { const m = /^(?:shot)?0*(\d+)$/i.exec(id); return m ? Number(m[1]) - 1 : fail(`not a shot id: ${id} (use the ids on the contact sheet, e.g. shot045)`); };
const shotId = (i: number, total: number) => `shot${String(i + 1).padStart(total >= 100 ? 3 : 2, '0')}`;
const parseActs = (spec: string | undefined, count: number): number[] => {
  if (!spec) return Array.from({length: count}, (_, i) => i + 1);
  return spec.split(',').flatMap(part => {
    const [a, b] = part.split('-').map(Number);
    return Number.isInteger(a) ? Array.from({length: (b || a) - a + 1}, (_, i) => a + i) : fail(`bad --acts ${spec}`);
  }).filter(n => n >= 1 && n <= count);
};

/** The lesson's registered images present on disk (the director's pool), in a stable order. */
function lessonImages(ep: string): string[] {
  const reg = join(ROOT, 'data', ep, 'images.json');
  if (!existsSync(reg)) return [];
  return Object.keys(readJson<Record<string, unknown>>(relative(ROOT, reg))).filter(p => existsSync(join(ROOT, 'public', p))).sort();
}

function unitLessons(unit: string): string[] {
  const dir = join(process.env.AUDIO_SCRIPTS_DIR ?? join(ROOT, '..', 'audio_scripts'), `unit${unit}`);
  const found = new Set<string>();
  for (const f of existsSync(dir) ? readdirSync(dir) : []) {
    const m = new RegExp(`apush-audio-u${unit}-(e\\d+|cram)-script`, 'i').exec(f);
    if (m) found.add(`u${unit}${m[1].toLowerCase()}`);
  }
  return [...found].sort((a, b) => (a.endsWith('cram') ? 999 : Number(a.slice(a.indexOf('e', 1) + 1))) - (b.endsWith('cram') ? 999 : Number(b.slice(b.indexOf('e', 1) + 1))));
}

const storyboardPath = (ep: string) => join(ROOT, 'data', ep, 'storyboard.json');
const loadBoard = (ep: string): {acts: {title: string; turns: {from: number; to: number}}[]} | null => (existsSync(storyboardPath(ep)) ? readJson(relative(ROOT, storyboardPath(ep))) : null);

function lessonRow(ep: string) {
  const review = loadLessonReview(ep);
  const board = loadBoard(ep);
  const sbActs = board?.acts ?? [];
  const sbApproved = sbActs.filter((_, i) => review.storyboard?.acts?.[String(i + 1)]?.status === 'approved').length;
  const sbNotes = [...openNotes(review, 'storyboard').values()].flat().length;
  const plan = loadPlan(ep);
  const acts = plan ? planActs(plan, outlinePath(ep)) : [];
  const approvedActs = acts.filter((_, i) => review.plan?.acts?.[String(i + 1)]?.status === 'approved').length;
  const notes = [...openNotes(review).values()].flat().length;
  const audioDir = join(ROOT, 'public', 'audio', ep);
  const built = existsSync(audioDir) && readdirSync(audioDir).some(f => f.endsWith('.mp3'));
  const images = lessonImages(ep);
  const imageReview = loadImageReview();
  const clipShots = (plan?.shots ?? []).map((s, i) => ({s, id: shotId(i, plan!.shots.length)})).filter(x => x.s.type === 'clip');
  const script = resolveAudioScript(process.env.AUDIO_SCRIPTS_DIR ?? join(ROOT, '..', 'audio_scripts'), ep);
  return {
    ep,
    script: script ? script.split(/[\\/]/).pop()!.replace(/^apush-audio-/, '').replace(/\.md$/, '') : '✗',
    audio: review.audio?.approved ? '✓' : built ? '◐ built' : '✗',
    storyboard: !board ? '✗' : sbActs.length ? `${sbApproved}/${sbActs.length} acts${sbNotes ? ` · ⚠ ${sbNotes}` : ''}` : '◐ (no acts)',
    images: images.length ? `${images.filter(p => imageReview[p]?.status === 'approved').length}✓ ${images.filter(p => imageReview[p]?.status === 'rejected').length}✗ / ${images.length}` : '—',
    plan: !plan ? '✗' : acts.length ? `${approvedActs}/${acts.length} acts${notes ? ` · ⚠ ${notes} note(s)` : ''}` : `◐ (no act boundaries)`,
    clips: clipShots.length ? `${clipShots.filter(c => review.clips?.[c.id]?.status === 'approved').length}/${clipShots.length}` : '—',
    explainers: plan ? String(plan.shots.filter(s => s.type === 'custom').length) : '—',
    render: review.render?.approved ? '✓' : existsSync(join(ROOT, 'out', `${ep}.mp4`)) ? '◐ built' : '✗',
  };
}

function boardStatus(unit: string) {
  const rows = unitLessons(unit).map(lessonRow);
  const comps = loadComponentReview();
  const lines = [
    `# Unit ${unit} status`,
    '',
    `Generated by \`npm run review -- status --unit ${unit}\` (${new Date().toISOString().slice(0, 16)}). ✓ approved (frozen) · ◐ built, not reviewed · ✗ not built · ⚠ open notes. Local columns (audio, images on disk, render) reflect the machine that ran it.`,
    '',
    '| Lesson | Script | Audio | Images ✓/✗/total | Storyboard | Plan | Clips ✓ | Explainers | Render |',
    '|---|---|---|---|---|---|---|---|---|',
    ...rows.map(r => `| ${r.ep} | ${r.script} | ${r.audio} | ${r.images} | ${r.storyboard} | ${r.plan} | ${r.clips} | ${r.explainers} | ${r.render} |`),
    '',
    '## Custom explainers',
    '',
    CUSTOM_NAMES.map(n => `${n}: ${comps[n]?.status ?? 'unreviewed'}${comps[n]?.note ? ` (${comps[n].note})` : ''}`).join(' · '),
    '',
    '## Open notes',
    '',
    ...rows.flatMap(r => (['storyboard', 'plan'] as const).flatMap(section => [...openNotes(loadLessonReview(r.ep), section)].flatMap(([act, notes]) => notes.map(n => `- ${r.ep} ${section} act ${act}${n.ref ? ` ${n.ref}` : ''}: ${n.text}`)))),
    '',
  ];
  const file = join(ROOT, 'docs', `UNIT${unit}_STATUS.md`);
  writeFileSync(file, lines.join('\n'));
  console.log(lines.slice(4, 6 + rows.length).join('\n'));
  console.log(`\nboard -> ${relative(ROOT, file)}`);
}

function lessonStatus(ep: string) {
  const review = loadLessonReview(ep);
  const plan = loadPlan(ep);
  const r = lessonRow(ep);
  console.log(`${ep}: script ${r.script} · audio ${r.audio} · plan ${r.plan} · clips ${r.clips} · render ${r.render}`);
  if (!plan) return;
  const acts = planActs(plan, outlinePath(ep));
  acts.forEach((a, i) => {
    const ids = plan.shots.map((s, n) => ({s, n})).filter(({s}) => s.at.turn >= a.turns.from && s.at.turn <= a.turns.to).map(({n}) => shotId(n, plan.shots.length));
    const st = review.plan?.acts?.[String(i + 1)]?.status ?? 'unreviewed';
    console.log(`  act ${i + 1} [${st}] ${a.title} — turns ${a.turns.from}-${a.turns.to}, ${ids[0] ?? '-'}..${ids.at(-1) ?? '-'}`);
    for (const n of review.plan?.notes?.[String(i + 1)] ?? []) console.log(`      ${n.done ? 'done' : 'open'}: ${n.ref ? `${n.ref} ` : ''}${n.text}`);
  });
  for (const [id, c] of Object.entries(review.clips ?? {})) console.log(`  clip ${id}: ${c.status}${c.note ? ` (${c.note})` : ''}`);
}

function main() {
  const [first, second, third, fourth] = positional;
  if (!first) { console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]); return; }
  if (first === 'status') return boardStatus(arg('unit') ?? fail('status needs --unit N (or: <lesson> status)'));
  if (first === 'images') {
    const ep = second ?? fail('images <lesson>');
    const images = lessonImages(ep);
    if (!images.length) fail(`${ep}: no registered images on disk`);
    const tmp = join(ROOT, 'out', 'review', `${ep}-thumbs`);
    rmSync(tmp, {recursive: true, force: true}); mkdirSync(tmp, {recursive: true});
    images.forEach((p, i) => execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', join(ROOT, 'public', p), '-vf', 'scale=320:240:force_original_aspect_ratio=decrease,pad=320:240:(ow-iw)/2:(oh-ih)/2:color=black', '-frames:v', '1', join(tmp, `${String(i).padStart(4, '0')}.png`)]));
    const sheet = join(ROOT, 'out', 'review', `${ep}-images.png`);
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', join(tmp, '%04d.png'), '-vf', `tile=6x${Math.ceil(images.length / 6)}:padding=4:color=gray`, '-frames:v', '1', sheet]);
    const review = loadImageReview();
    writeFileSync(sheet.replace(/\.png$/, '.txt'), images.map((p, i) => `${ep}:${i + 1}  (row ${Math.floor(i / 6) + 1}, col ${(i % 6) + 1})  ${p}  ${review[p]?.status ?? ''}`).join('\n') + '\n');
    console.log(`${images.length} images -> ${relative(ROOT, sheet)} (index: ${relative(ROOT, sheet.replace(/\.png$/, '.txt'))})`);
    return;
  }
  if (first === 'image') {
    const ref = second ?? fail('image <lesson:N | path> approve|reject ["note"]');
    const status = third as Status;
    if (!['approved', 'approve', 'reject', 'rejected'].includes(status)) fail('image ... approve | reject');
    const m = /^(u\d+(?:e\d+|cram)):(\d+)$/.exec(ref);
    const path = m ? lessonImages(m[1])[Number(m[2]) - 1] ?? fail(`${ref}: no such image (run: review images ${m[1]})`) : ref;
    const review = loadImageReview();
    review[path] = {status: status.startsWith('approve') ? 'approved' : 'rejected', at: now(), ...(fourth ? {note: fourth} : {})};
    saveImageReview(review);
    console.log(`${path}: ${review[path].status}`);
    return;
  }
  if (first === 'treatment') {
    const path = second ?? fail('treatment <image path> approve | needs-work ["note"]');
    const all = loadTreatments();
    if (!all[path]) fail(`${path}: no treatment yet (the next pipeline run proposes one for every storyboard image)`);
    const status = ({approve: 'approved', approved: 'approved', 'needs-work': 'needs-work'} as Record<string, 'approved' | 'needs-work'>)[third ?? ''] ?? fail('approve | needs-work');
    all[path] = {...all[path], status, ...(fourth ? {note: fourth} : {})};
    saveTreatments(all);
    console.log(`${path}: treatment ${status}${fourth ? ` (${fourth})` : ''}; edit its framings in data/library/treatments.json`);
    return;
  }
  if (first === 'component') {
    const name = second ?? fail('component <Name> approve|reject|needs-work');
    if (!(CUSTOM_NAMES as string[]).includes(name)) fail(`unknown component ${name} (${CUSTOM_NAMES.join(', ')})`);
    const status = ({approve: 'approved', approved: 'approved', reject: 'rejected', rejected: 'rejected', 'needs-work': 'needs-work'} as Record<string, Status>)[third ?? ''] ?? fail('approve | reject | needs-work');
    const review = loadComponentReview();
    review[name] = {status, at: now(), ...(fourth ? {note: fourth} : {})};
    saveComponentReview(review);
    console.log(`${name}: ${status}${status !== 'approved' ? ' (the director will not use it)' : ''}`);
    return;
  }

  // Lesson commands.
  const ep = first;
  const review: LessonReview = loadLessonReview(ep);
  const save = () => saveLessonReview(ep, review);
  const plan = loadPlan(ep);
  const acts = plan ? planActs(plan, outlinePath(ep)) : [];
  switch (second) {
    case 'status': return lessonStatus(ep);
    case 'approve':
    case 'unapprove': {
      const on = second === 'approve';
      if (third === 'audio' || third === 'render') {
        review[third] = on ? {approved: now()} : {};
        save();
        return console.log(`${ep} ${third}: ${on ? 'approved (frozen)' : 'unapproved (rebuilds when its inputs change)'}`);
      }
      if (third !== 'plan' && third !== 'storyboard') fail('approve audio | storyboard | plan | render');
      const sectionActs = third === 'storyboard' ? loadBoard(ep)?.acts ?? [] : acts;
      if (!sectionActs.length) fail(`${ep}: no ${third} with act boundaries yet`);
      const which = parseActs(arg('acts'), sectionActs.length);
      const section = (review[third as 'plan' | 'storyboard'] ??= {});
      section.acts ??= {};
      for (const a of which) {
        if (on) section.acts[String(a)] = {status: 'approved', at: now()};
        else delete section.acts[String(a)];
      }
      save();
      return console.log(`${ep} ${third} acts ${which.join(', ')}: ${on ? 'approved' : 'unapproved'}`);
    }
    case 'note': {
      const text = third ?? fail('note --shot <id> "text"  or  note --act <n> "text"  or  note --storyboard --turn <n> "text"');
      if (args.includes('--storyboard')) {
        const sbActs = loadBoard(ep)?.acts ?? fail(`${ep}: no storyboard yet`);
        const turn = arg('turn') !== undefined ? Number(arg('turn')) : undefined;
        const act = turn !== undefined ? sbActs.findIndex(a => turn >= a.turns.from && turn <= a.turns.to) + 1 : Number(arg('act') ?? fail('--turn <n> or --act <n>'));
        if (!(act >= 1 && act <= sbActs.length)) fail(`${turn !== undefined ? `turn ${turn}` : `act ${act}`} is not in the storyboard's acts`);
        review.storyboard ??= {};
        review.storyboard.notes ??= {};
        (review.storyboard.notes[String(act)] ??= []).push({text: turn !== undefined ? `turn ${turn}: ${text}` : text, at: now()});
        if (review.storyboard.acts) delete review.storyboard.acts[String(act)];
        save();
        return console.log(`${ep} storyboard act ${act}: noted; the next run re-boards this act only`);
      }
      if (!plan || !acts.length) fail(`${ep}: no plan with act boundaries yet`);
      let act: number;
      let shot: string | undefined;
      let ref: string | undefined;
      if (arg('shot')) {
        const index = shotIndex(arg('shot')!);
        const where = locateShot(plan!.shots, acts, index) ?? fail(`${arg('shot')}: not in the plan`);
        act = where.act + 1;
        shot = `shot index ${where.local}`;
        ref = shotId(index, plan!.shots.length);
      } else act = Number(arg('act') ?? fail('note needs --shot <id> or --act <n>'));
      if (!(act >= 1 && act <= acts.length)) fail(`act ${act} is not in the plan (1-${acts.length})`);
      review.plan ??= {};
      review.plan.notes ??= {};
      (review.plan.notes[String(act)] ??= []).push({text, ...(shot ? {shot, ref} : {}), at: now()});
      if (review.plan.acts) delete review.plan.acts[String(act)];
      save();
      return console.log(`${ep} act ${act}${ref ? ` (${ref})` : ''}: noted; the next run revises this act only`);
    }
    case 'clip': {
      const id = third ?? fail('clip <shotId> approve | reject [--regenerate|--still]');
      const index = shotIndex(id);
      const shot = plan?.shots[index];
      if (!shot || shot.type !== 'clip') fail(`${id} is not a clip shot`);
      const verdict = fourth;
      const key = shotId(index, plan!.shots.length);
      const note = positional[4];
      review.clips ??= {};
      if (verdict === 'approve') review.clips[key] = {status: 'approved', at: now(), ...(note ? {note} : {})};
      else if (verdict === 'reject') {
        // A rejected clip changes the plan itself: a new seed (new generation) or a camera move on the still.
        const p = plan!;
        if (args.includes('--still')) {
          const f = shot!.focus ?? [0.5, 0.5];
          p.shots[index] = {type: 'image_move', at: shot!.at, image: shot!.image, from: (shot!.from as object) ?? {x: f[0], y: f[1], zoom: 1}, to: (shot!.to as object) ?? {x: f[0], y: f[1], zoom: 1.08}, ...(shot!.atmosphere ? {atmosphere: shot!.atmosphere} : {})};
        } else p.shots[index] = {...shot!, seed: (shot!.seed ?? 42) + 1};
        writeFileSync(shotsPath(ep), `${JSON.stringify(p, null, 2)}\n`);
        review.clips[key] = {status: 'rejected', at: now(), note: note ?? (args.includes('--still') ? 'replaced by a camera move on the still' : `regenerate with seed ${p.shots[index].seed}`)};
      } else fail('clip <shotId> approve | reject [--regenerate|--still] ["note"]');
      save();
      return console.log(`${ep} ${key}: ${review.clips[key].status}${review.clips[key].note ? ` (${review.clips[key].note})` : ''}`);
    }
    default:
      fail(`unknown command: ${second ?? '(none)'}; run with no arguments for help`);
  }
}

main();
