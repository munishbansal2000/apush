/**
 * Pre-render validator CLI. Runs all ported checks against an episode.
 *
 * Usage: npx tsx tools/validate-episode.ts --episode E3 [--strict]
 *
 * Checks:
 * - Beats (B001/B002/B005/B006/B007/B008) via lib/validate-beats.ts
 * - Images (I001-I006) via lib/validate-images.ts
 * - Image provenance (I011) via lib/validate-images.ts validateProvenance
 * - Heads (H001/H002) via lib/validate-heads.ts
 * - Coverage (C001/C002) + pause cards (P001/P002) via lib/validate-coverage.ts
 * - Sync (T001-T005/T007) via lib/validate-sync.ts (T006 has no repo equivalent)
 * - Anchors (A003) via lib/validate-anchors.ts
 * - Assets (X001/X002) via lib/validate-assets.ts
 * - Layout collisions (B003/B010) via lib/layout-engine.ts
 *
 * Exit 1 on any error. Warnings don't fail (unless --strict).
 */
import { readFileSync, existsSync, readdirSync } from 'fs';
import { execFileSync } from 'node:child_process';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { validateBeats } from '../src/lib/validate-beats';
import { validateImages, extractImageRefs, validateProvenance } from '../src/lib/validate-images';
import { validateHeads } from '../src/lib/validate-heads';
import { validateCoverage, validatePauseCards } from '../src/lib/validate-coverage';
import { validateSync } from '../src/lib/validate-sync';
import { validateAnchors } from '../src/lib/validate-anchors';
import { validateAssets } from '../src/lib/validate-assets';
import { collectImageRefs } from '../src/lib/episode-image-refs';
import { textRect, bubbleRect, checkCollisions, checkHeadCollisions, TimedRect } from '../src/lib/layout-engine';
import { resolveAnchor } from '../src/lib/anchors';

const ROOT = join(__dirname, '..');

function parseArgs() {
  const ep = process.argv.find((a, i) => process.argv[i - 1] === '--episode') ?? 'E3';
  const strict = process.argv.includes('--strict');
  return { episode: ep.toUpperCase(), epLower: ep.toLowerCase(), strict };
}

function extractBeats(src: string, epLower: string) {
  const beats: any[] = [];
  const kitBeats: any[] = [];
  const re = /\{\s*turnId:\s*'(t\d+)',\s*offset:\s*([\d.]+),\s*kind:\s*'(\w+)'(?:,\s*text:\s*'((?:[^'\\]|\\.)*)')?(?:,\s*level:\s*'(\w+)')?(?:,\s*position:\s*\[([\d.]+),\s*([\d.]+)\])?(?:,\s*width:\s*(\d+))?[^}]*?\}/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    beats.push({
      turnId: m[1],
      offset: parseFloat(m[2]),
      kind: m[3],
      text: m[4]?.replace(/\\'/g, "'"),
      level: m[5],
      position: m[6] ? [parseFloat(m[6]), parseFloat(m[7])] : undefined,
      width: m[8] ? parseInt(m[8]) : undefined,
    });
  }
  // Data-driven beats (new format): src/data/<ep>/beats_kit.json
  // Resolved at build time by tools/map_beats.py; carries absolute start/end.
  const kitPath = join(ROOT, 'src', 'data', epLower, 'beats_kit.json');
  const kitBeatsRaw: any[] = existsSync(kitPath) ? JSON.parse(readFileSync(kitPath, 'utf8')) : [];
  {
    const kit = kitBeatsRaw;
    kitBeats.push(...kit);
    for (const b of kit) {
      const p = b.props ?? {};
      beats.push({
        turnId: b.turn_id,
        offset: b.offset,
        kind: b.kind,
        text: p.text,
        level: p.level,
        position: p.position,
        width: p.width,
        image: p.image, // for extractImageRefs
        props: p, // for B008 (quoteStatus) and I011 (marksVerified)
        start: b.start,
        end: b.end,
      });
    }
  }
  return { beats, kitBeats };
}

async function main() {
  const { episode, epLower, strict } = parseArgs();
  let errors = 0;
  let warnings = 0;

  const report = (level: 'error' | 'warn', code: string, where: string, msg: string) => {
    console.log(`  [${level}] ${code} ${where}: ${msg.slice(0, 100)}`);
    if (level === 'error') errors++;
    else warnings++;
  };

  // Load data: out/data is canonical (pipeline output); src/data is the transition fallback.
  const dataDir = (name: string) => {
    const out = join(ROOT, 'out', 'data', epLower, name);
    return existsSync(out) ? out : join(ROOT, 'src', 'data', epLower, name);
  };
  const turnsPath = dataDir('turns.json');
  const timingPath = dataDir('timing_map.json');
  const manifestPath = join(ROOT, 'src', 'data', 'images.json');
  const factsPath = join(ROOT, 'src', 'data', 'fact-registry.json');
  const compPath = join(ROOT, 'src', 'components', `U1${episode}Episode.tsx`);

  if (!existsSync(turnsPath)) {
    console.error(`Missing ${turnsPath}`);
    process.exit(1);
  }

  const turnsData = JSON.parse(readFileSync(turnsPath, 'utf8'));
  const turns = Array.isArray(turnsData) ? turnsData : turnsData.turns;
  const timing = JSON.parse(readFileSync(timingPath, 'utf8'));
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
  const facts = existsSync(factsPath) ? JSON.parse(readFileSync(factsPath, 'utf8')) : { facts: [] };
  const src = existsSync(compPath) ? readFileSync(compPath, 'utf8') : '';
  const { beats, kitBeats } = extractBeats(src, epLower);

  console.log(`\n${episode}: ${turns.length} turns, ${beats.length} beats`);

  // Load the lesson plan once (sections for B005 tone, pause cards, plan bgs).
  // Hoisted: the old code imported it twice further down.
  let plan: any = null;
  const planFiles = [`u1${epLower}-plan`, `u${epLower}-plan`];
  for (const pf of planFiles) {
    const planPath = join(ROOT, 'src', 'data', `${pf}.ts`);
    if (!existsSync(planPath)) continue;
    try {
      const planMod = await import(pathToFileURL(planPath).href);
      plan = Object.values(planMod).find(
        (v: any) => v && typeof v === 'object' && Array.isArray(v.sections),
      ) as any;
    } catch { /* plan not importable */ }
    break;
  }
  const actx = { turns, starts: timing.starts, durations: timing.durations, wordTimes: {} };
  const planSections = (plan?.sections ?? []).map((s: any) => {
    try {
      return { start: resolveAnchor(s.from, actx).time, tone: s.tone, bg: s.bg };
    } catch {
      return null;
    }
  }).filter(Boolean).sort((a: any, b: any) => a.start - b.start);

  // 1. Beat checks
  console.log('\n[Beats]');
  // B005 tone from the lesson-plan sections (kit strength), not a hard-coded
  // turn threshold. Falls back to the legacy E3 heuristic when no plan.
  const getTone = (turnId: string) => {
    const ti = turns.findIndex((t: any) => t.id === turnId);
    const t = ti >= 0 ? timing.starts[ti] : 0;
    if (planSections.length) {
      let tone = planSections[0].tone ?? 'playful';
      for (const s of planSections) if (t >= s.start) tone = s.tone;
      return tone;
    }
    const n = parseInt(turnId.slice(1), 10);
    return n >= 27 ? 'serious' : 'playful';
  };
  for (const i of validateBeats(beats, turns, timing.durations, facts, getTone)) {
    report(i.level, i.code, i.where, i.msg);
  }

  // 2. Image checks (I001-I006) + provenance (I011)
  console.log('\n[Images]');
  const legacyRefs = extractImageRefs(beats, episode);
  const refs = collectImageRefs({
    kitBeats,
    planSections: (plan?.sections ?? [])
      .filter((s: any) => typeof s.bg === 'string' && s.bg.startsWith('historic/'))
      .map((s: any) => ({ bg: s.bg, from: s.from })),
    legacy: legacyRefs.map(r => ({ image: r.image, turnId: r.beatId })),
    turns,
    starts: timing.starts,
    durations: timing.durations,
  }).map(r => ({ beatId: r.turnId, image: r.image, episodeKey: episode }));
  const publicDir = join(ROOT, 'public');
  for (const i of validateImages(refs, manifest, {
    strict,
    fileExists: (p) => existsSync(join(publicDir, p)),
  })) {
    report(i.level, i.code, i.where, i.msg);
  }
  const docBeats = beats
    .filter((b: any) => b.kind === 'document' && b.props)
    .map((b: any) => ({
      beatId: b.turnId,
      hasMarks: Array.isArray(b.props.marks) && b.props.marks.length > 0,
      marksVerified: b.props.marksVerified,
    }));
  for (const i of validateProvenance(docBeats, { strict })) {
    report(i.level, i.code, i.where, i.msg);
  }

  // 3. Head checks
  console.log('\n[Heads]');
  // Extract speaker config from component (best-effort)
  const speakers = ['maya', 'marcus', 'jay'];
  const speakerCfg: Record<string, any> = {};
  for (const s of speakers) {
    // Asset naming matches EpisodeShell: <speaker>-real.webp / <speaker>-toon.webp
    speakerCfg[s] = { name: s, color: '#fff', real: `${s}-real.webp`, toon: `${s}-toon.webp` };
  }
  // Check for the toon bug: both branches using same file
  const toonBugRe = /speaker === '(\w+)' \? '([\w-]+\.webp)' : '([\w-]+\.webp)'/g;
  let tm;
  while ((tm = toonBugRe.exec(src)) !== null) {
    if (tm[2] === tm[3]) {
      report('error', 'H002', tm[1], `ternary returns same file for both branches: ${tm[2]} (the Marcus/Maya bug)`);
    }
  }
  const turnSpeakers = [...new Set(turns.map((t: any) => t.speaker as string).filter((s: string) => s !== 'pause'))] as string[];
  // H001 file-existence checks restored to kit strength (no suppression):
  // they catch real missing-art bugs at build time.
  for (const i of validateHeads(speakerCfg, turnSpeakers, {
    fileExists: (p) => existsSync(join(publicDir, p)),
  })) {
    report(i.level, i.code, i.where, i.msg);
  }

  // 4. Coverage + pause cards
  console.log('\n[Coverage]');
  const covTurns = turns.map((t: any, i: number) => ({
    id: t.id,
    kind: t.speaker === 'pause' ? 'pause' as const : 'speech' as const,
    text: t.text ?? '',
    start: timing.starts[i],
    dur: timing.durations[i],
  }));
  const events = beats.map((b: any) => {
    const ti = turns.findIndex((t: any) => t.id === b.turnId);
    // beats_kit.json carries absolute start; legacy beats are turnId+offset
    const time = b.start ?? (timing.starts[ti] + b.offset);
    return { time, kind: 'beat' as const };
  });
  for (const i of validateCoverage(covTurns, events)) {
    report(i.level, i.code, i.where, i.msg);
  }

  // Pause cards: resolve from the episode's lesson plan (src/data/u1<N>-plan.ts).
  // Each plan pauseCard.after anchors the speech turn; the card shows on the next (pause) turn.
  // (Plan already imported above for B005 tone.)
  const pauseCards: any[] = [];
  if (plan && Array.isArray(plan.pauseCards)) {
    for (const pc of plan.pauseCards) {
      try {
        const r = resolveAnchor(pc.after, actx);
        const pauseIdx = r.turnIdx + 1;
        if (turns[pauseIdx] && turns[pauseIdx].speaker === 'pause') {
          pauseCards.push({ pauseId: turns[pauseIdx].id, prompt: pc.prompt, reveal: pc.reveal });
        }
      } catch { /* unresolvable anchor — validator will flag via beats */ }
    }
  }
  for (const i of validatePauseCards(covTurns, pauseCards)) {
    report(i.level, i.code, i.where, i.msg);
  }

  // 5. Pronunciations (S008/S009/S021)
  console.log('\n[Pronunciations]');
  const pronPath = join(ROOT, 'src', 'data', 'pronunciations.json');
  if (existsSync(pronPath)) {
    const pron = JSON.parse(readFileSync(pronPath, 'utf8'));
    const termList: string[] = pron.terms.map((x: any) => x.term);
    const allText = turns.map((t: any) => t.text ?? '').join('\n');
    const watched = new Set<string>();
    for (const w of allText.match(/[\p{L}'-]+/gu) ?? []) {
      if (/[^\x00-\x7F]/.test(w) || (pron.watch?.patterns ?? []).some((p: string) => new RegExp(p, 'u').test(w))) {
        watched.add(w.replace(/'s$/, ''));
      }
    }
    for (const w of watched) {
      if (!termList.some(term => term === w || term.split(' ').includes(w))) {
        report(strict ? 'error' : 'warn', 'S008', 'script', `"${w}" needs a pronunciation entry in data/pronunciations.json`);
      }
    }
    for (const term of pron.terms) {
      if (!term.approved && new RegExp(`\\b${term.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'iu').test(allText)) {
        report(strict ? 'error' : 'warn', 'S021', 'pronunciations', `"${term.term}" (${term.guide}) not yet auditioned/approved`);
      }
    }
    // S009: number rules
    for (const t of turns) {
      const text = t.text ?? '';
      if (/\b\d{3,4}s\b/.test(text) && !(pron.numbers ?? []).some((n: any) => new RegExp(n.pattern).test(text))) {
        report('error', 'S009', t.id, `"${/\b\d{3,4}s\b/.exec(text)![0]}" has no TTS number rule in pronunciations.json`);
      }
    }
  }

  // 6. Layout collisions
  console.log('\n[Layout]');
  const rects: TimedRect[] = [];
  for (const b of beats) {
    if (!b.position || !b.text) continue;
    const ti = turns.findIndex((t: any) => t.id === b.turnId);
    if (ti < 0) continue;
    const start = b.start ?? (timing.starts[ti] + b.offset);
    const end = b.end ?? (timing.starts[ti] + timing.durations[ti]);
    let rect;
    if (b.kind === 'bubble') {
      rect = bubbleRect(b.text, b.width ?? 380, b.position);
    } else {
      rect = textRect(b.text, b.level ?? 'body', b.position);
    }
    rects.push({ id: `${b.turnId}@${b.offset}s`, rect, start, end });
  }
  for (const i of checkCollisions(rects)) report(i.level, i.code, i.where, i.msg);
  for (const i of checkHeadCollisions(rects)) report(i.level, i.code, i.where, i.msg);

  // 7. Sync: turns / timing / audio consistency (T001-T005, T007)
  // T006 (script-changed-after-audio) has no repo equivalent: the pipeline
  // stores no TTS text hash, so it is deliberately not implemented.
  console.log('\n[Sync]');
  const audioDir = join(ROOT, 'public', 'audio', epLower);
  let audioFiles: string[] | null = null;
  let audioDurations: Record<string, number> | undefined;
  if (existsSync(audioDir)) {
    audioFiles = readdirSync(audioDir).filter(f => f.endsWith('.mp3'));
    try {
      audioDurations = {};
      for (const t of turns) {
        const p = join(audioDir, `${t.id}.mp3`);
        if (!existsSync(p)) continue;
        const d = parseFloat(
          execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], { encoding: 'utf8' }).trim(),
        );
        if (Number.isFinite(d)) audioDurations[t.id] = d;
      }
    } catch {
      audioDurations = undefined; // ffprobe unavailable — T004a skipped
    }
  }
  for (const i of validateSync(turns, timing, { audioFiles, audioDurations })) {
    report(i.level, i.code, i.where, i.msg);
  }

  // 8. Anchors: estimated (non-Vosk) beat timing (A003)
  console.log('\n[Anchors]');
  for (const i of validateAnchors(
    beats.map((b: any) => ({ id: `${b.turnId}@${b.offset}s`, turnId: b.turnId, offset: b.offset ?? 0 })),
    { strict },
  )) {
    report(i.level, i.code, i.where, i.msg);
  }

  // 9. Assets: SFX (X001) and music timeline (X002)
  console.log('\n[Assets]');
  const timelinePath = dataDir('music_timeline.json');
  const timeline = existsSync(timelinePath) ? JSON.parse(readFileSync(timelinePath, 'utf8')) : null;
  // SFX referenced by the episode component (non-empty paths in the sfx block)
  const sfxFiles: string[] = [];
  const sfxBlock = /sfx:\s*\{([^}]*)\}/.exec(src)?.[1] ?? '';
  for (const m of sfxBlock.matchAll(/['"]([^'"]+\.(wav|mp3))['"]/g)) {
    if (m[1].trim()) sfxFiles.push(m[1].trim());
  }
  for (const i of validateAssets({
    musicEvents: timeline ? (timeline.events ?? []) : null,
    sfxFiles,
    fileExists: (p) => existsSync(join(publicDir, p)),
  })) {
    report(i.level, i.code, i.where, i.msg);
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${episode}: ${errors} errors, ${warnings} warnings`);
  if (errors > 0 || (strict && warnings > 0)) {
    console.log('VALIDATION FAILED');
    process.exit(1);
  } else {
    console.log('VALIDATION PASSED');
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
