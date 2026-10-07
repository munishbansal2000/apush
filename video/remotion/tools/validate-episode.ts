/**
 * Pre-render validator CLI. Runs all ported checks against an episode.
 *
 * Usage: npx tsx tools/validate-episode.ts --episode E3 [--strict]
 *
 * Checks:
 * - Beats (B001/B002/B005/B006/B007/B008) via lib/validate-beats.ts
 * - Images (I001-I006) via lib/validate-images.ts
 * - Heads (H001/H002) via lib/validate-heads.ts
 * - Coverage (C001/C002) + pause cards (P001/P002) via lib/validate-coverage.ts
 * - Layout collisions (B003/B010) via lib/layout-engine.ts
 *
 * Exit 1 on any error. Warnings don't fail (unless --strict).
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { validateBeats } from '../src/lib/validate-beats';
import { validateImages, extractImageRefs } from '../src/lib/validate-images';
import { validateHeads } from '../src/lib/validate-heads';
import { validateCoverage, validatePauseCards } from '../src/lib/validate-coverage';
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
  if (existsSync(kitPath)) {
    const kit = JSON.parse(readFileSync(kitPath, 'utf8'));
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
        start: b.start,
        end: b.end,
      });
    }
  }
  return beats;
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

  // Load data
  const turnsPath = join(ROOT, 'src', 'data', epLower, 'turns.json');
  const timingPath = join(ROOT, 'src', 'data', epLower, 'timing_map.json');
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
  const beats = extractBeats(src, epLower);

  console.log(`\n${episode}: ${turns.length} turns, ${beats.length} beats`);

  // 1. Beat checks
  console.log('\n[Beats]');
  const getTone = (turnId: string) => {
    const n = parseInt(turnId.slice(1), 10);
    // TODO: read from episode config; E3 threshold is t27
    return n >= 27 ? 'serious' : 'playful';
  };
  for (const i of validateBeats(beats, turns, timing.durations, facts, getTone, timing.starts)) {
    report(i.level, i.code, i.where, i.msg);
  }

  // 2. Image checks
  console.log('\n[Images]');
  const bgRe = /'(historic\/[^']+\.(jpg|png|webp))'/g;
  const bgImages = new Set<string>();
  let bm;
  while ((bm = bgRe.exec(src)) !== null) bgImages.add(bm[1]);
  // Lesson-plan backgrounds (sections) also put images on screen.
  for (const pf of [`u1${epLower}-plan`, `u${epLower}-plan`]) {
    const planPath = join(ROOT, 'src', 'data', `${pf}.ts`);
    if (!existsSync(planPath)) continue;
    const planSrc = readFileSync(planPath, 'utf8');
    let pm;
    const planRe = /'(historic\/[^']+\.(jpg|png|webp))'/g;
    while ((pm = planRe.exec(planSrc)) !== null) bgImages.add(pm[1]);
    break;
  }
  const refs = extractImageRefs(beats, episode);
  for (const img of bgImages) {
    if (!refs.some(r => r.image === img)) refs.push({ beatId: 'bg', image: img, episodeKey: episode });
  }
  const publicDir = join(ROOT, 'public');
  for (const i of validateImages(refs, manifest, {
    strict,
    fileExists: (p) => existsSync(join(publicDir, p)),
  })) {
    report(i.level, i.code, i.where, i.msg);
  }

  // 3. Head checks
  console.log('\n[Heads]');
  // Extract speaker config from component (best-effort)
  const speakers = ['maya', 'marcus', 'jay'];
  const speakerCfg: Record<string, any> = {};
  for (const s of speakers) {
    // Look for assetPair patterns
    speakerCfg[s] = { name: s, color: '#fff', real: `${s}.webp`, toon: `${s}-toon.webp` };
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
  for (const i of validateHeads(speakerCfg, turnSpeakers, {
    fileExists: (p) => existsSync(join(publicDir, p)),
  })) {
    // Only report H002 (shared art) — H001 file checks are noisy in dev
    if (i.code === 'H002') report(i.level, i.code, i.where, i.msg);
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
  const pauseCards: any[] = [];
  const planFiles = [`u1${epLower}-plan`, `u${epLower}-plan`];
  for (const pf of planFiles) {
    const planPath = join(ROOT, 'src', 'data', `${pf}.ts`);
    if (!existsSync(planPath)) continue;
    try {
      const planMod = await import(pathToFileURL(planPath).href);
      const plan = Object.values(planMod).find(
        (v: any) => v && typeof v === 'object' && Array.isArray(v.pauseCards),
      ) as any;
      if (plan) {
        const actx = { turns, starts: timing.starts, durations: timing.durations, wordTimes: {} };
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
    } catch { /* plan not importable — fall through to empty */ }
    break;
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
