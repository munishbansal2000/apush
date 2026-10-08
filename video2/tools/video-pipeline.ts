/** Resumable transcript -> TTS -> timing -> images -> direction -> QA -> render pipeline. */
import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, unlinkSync, readdirSync, statSync, renameSync} from 'node:fs';
import {basename, dirname, join, resolve} from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {ROOT, arg, flag, ffprobeDuration} from './lib';
import {atomicJson, checkFacts, normalizePlan, normalizeTurns, parseTranscript, readJson, resolveAudioScript, selectedStages, sha256, syncIssues, wordTimingIssues, type DirectedPlan, type PipelineMode, type PipelineStage, type PipelineTurn, type WordTiming} from './pipeline-core';

interface Config {
  timing: {gapSec: number; leadSec: number; tailSec: number};
  edge: {voices: Record<string, string>; rate: string; pitch: string};
  fish: {model: string; voices: Record<string, string>};
  meta: {timeoutSec: number};
}
interface Timing {starts: number[]; durations: number[]; totalSec: number; fps: number; ttsHash: Record<string, string>}
interface State {version: 1; episode: string; mode: PipelineMode; stages: Partial<Record<PipelineStage, {hash: string; completedAt: string}>>}
interface LayoutIssue {frame: number; kind: string; id: string; other?: string; detail?: string}

const episode = (arg('episode') ?? '').toLowerCase();
if (!episode) throw new Error('--episode is required');
const mode = (arg('mode', 'dev') as PipelineMode);
if (!['dev', 'prod'].includes(mode)) throw new Error('--mode must be dev or prod');
const dryRun = flag('dry-run');
const force = flag('force');
const videoGen = arg('video-gen', 'ltx')!;
if (!['ltx', 'none'].includes(videoGen)) throw new Error('--video-gen must be ltx or none');
const stages = selectedStages(arg('only'), arg('from'), flag('full'));
const cfg = readJson<Config>(join(ROOT, 'data/pipeline.json'));
const work = join(ROOT, 'out', 'pipeline', episode);
const dataDir = join(ROOT, 'data', episode);
const audioDir = join(ROOT, 'public', 'audio', episode);
const ttsDir = join(ROOT, 'tts', episode);
const statePath = join(work, 'state.json');
mkdirSync(work, {recursive: true});
mkdirSync(dataDir, {recursive: true});
let state: State = existsSync(statePath) ? readJson<State>(statePath) : {version: 1, episode, mode, stages: {}};

const mark = (stage: PipelineStage, hash: string) => {
  state = {...state, mode, stages: {...state.stages, [stage]: {hash, completedAt: new Date().toISOString()}}};
  atomicJson(statePath, state);
};
const current = (stage: PipelineStage, hash: string) => !force && state.stages[stage]?.hash === hash;
const layoutIssuesFromLog = (text: string): LayoutIssue[] => {
  const match = /\[(?:kit-layout|layout-guard)\]\s+(\{.*\})$/s.exec(text);
  if (!match) return [];
  try {
    const payload = JSON.parse(match[1]) as {frame?: number; issues?: Omit<LayoutIssue, 'frame'>[]};
    return (payload.issues ?? []).map(issue => ({frame: Number(payload.frame ?? -1), ...issue}));
  } catch (error) {
    throw new Error(`invalid layout-guard browser log: ${error instanceof Error ? error.message : String(error)}`);
  }
};
const blockingLayoutIssues = (issues: LayoutIssue[]) => issues.filter(issue => issue.kind !== 'unsafe');
const formatLayoutIssues = (issues: LayoutIssue[]) => issues.slice(0, 12).map(issue =>
  `  - frame ${issue.frame}: ${issue.kind} ${issue.id}${issue.other ? ` x ${issue.other}` : ''}${issue.detail ? ` - ${issue.detail}` : ''}`,
).join('\n');
const run = (file: string, args: string[], env?: NodeJS.ProcessEnv) => {
  const result = spawnSync(file, args, {cwd: ROOT, stdio: 'inherit', env: {...process.env, ...env}, shell: false});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${basename(file)} failed with exit ${result.status}`);
};
const pipelinePython = () => {
  const candidates = [
    process.env.VOSK_PYTHON,
    join(ROOT, '.venv-pipeline', 'Scripts', 'python.exe'),
    process.env.FISH_PYTHON,
    'C:\\Users\\munis\\projects\\fish_exmple\\.venv\\Scripts\\python.exe',
  ].filter((item): item is string => !!item);
  return candidates.find(existsSync) ?? 'python';
};
const voskModel = () => {
  const candidates = [
    process.env.VOSK_MODEL_PATH,
    join(ROOT, 'models', 'vosk-model-small-en-us-0.15'),
    join(process.env.USERPROFILE ?? '', 'vosk-model-small-en-us-0.15'),
    join(process.env.USERPROFILE ?? '', 'workspace', 'vosk-model-small-en-us-0.15'),
  ].filter((item): item is string => !!item);
  return candidates.find(existsSync) ?? null;
};
const savePrompt = (name: string, text: string) => {
  const path = join(work, `${name}.prompt.md`);
  writeFileSync(path, text);
  return path;
};
const treeHash = (dir: string): string => {
  const rows: [string, string][] = [];
  const walk = (current: string) => {
    for (const name of readdirSync(current).sort()) {
      const path = join(current, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(?:ts|tsx|json|css)$/i.test(name)) rows.push([path.slice(dir.length), sha256(readFileSync(path))]);
    }
  };
  walk(dir);
  return sha256(JSON.stringify(rows));
};
const meta = (name: string, prompt: string, attachments: string[] = []) => {
  const out = join(work, `${name}.json`);
  const inputHash = sha256(JSON.stringify({prompt, attachments: attachments.map(file => [file, existsSync(file) ? sha256(readFileSync(file)) : 'missing'])}));
  const hashPath = `${out}.input.sha256`;
  if (dryRun) { console.log(`[${name}] dry-run: ${savePrompt(name, prompt)}`); return out; }
  if (!force && existsSync(out) && existsSync(hashPath) && readFileSync(hashPath, 'utf8').trim() === inputHash) {
    console.log(`[${name}] prompt cache current`);
    return out;
  }
  const args = [join(ROOT, 'tools/meta-ui-runner.cjs'), '--prompt-file', savePrompt(name, prompt), '--out', out, '--timeout-sec', String(cfg.meta.timeoutSec)];
  for (const file of attachments) args.push('--attachment', file);
  run(process.execPath, args);
  writeFileSync(hashPath, `${inputHash}\n`);
  return out;
};

function findExisting(name: string): string | null {
  const compact = episode.replace(/-/g, '');
  const short = /^u\d+e(\d+)$/.exec(compact)?.[1];
  const candidates = [join(ROOT, 'data', episode, name), join(ROOT, 'src/data', episode, name)];
  if (short) candidates.push(join(ROOT, 'data', `e${short}`, name), join(ROOT, 'src/data', `e${short}`, name));
  return candidates.find(existsSync) ?? null;
}

let turns: PipelineTurn[] = [];
const turnsPath = join(dataDir, 'turns.json');
function loadTurns() {
  if (!existsSync(turnsPath)) throw new Error(`missing ${turnsPath}; run the turns stage or pass --transcript`);
  turns = normalizeTurns(readJson(turnsPath));
}

if (stages.includes('turns')) {
  const audioScriptsRoot = process.env.AUDIO_SCRIPTS_DIR ?? resolve(ROOT, '..', 'audio_scripts');
  const transcript = arg('transcript') ?? resolveAudioScript(audioScriptsRoot, episode) ?? undefined;
  const source = transcript ? readFileSync(resolve(transcript), 'utf8') : null;
  const existing = findExisting('turns.json');
  const inputHash = sha256(source ?? (existing ? readFileSync(existing) : ''));
  if (current('turns', inputHash) && existsSync(turnsPath)) console.log('[turns] checkpoint current');
  else {
    turns = source ? parseTranscript(source) : existing ? normalizeTurns(readJson(existing)) : (() => { throw new Error('no transcript or existing turns.json found'); })();
    if (dryRun) console.log(`[turns] dry-run: parsed ${turns.length} turns`);
    else {
      atomicJson(turnsPath, {source: transcript ? resolve(transcript) : existing, turns});
      mark('turns', inputHash);
      console.log(`[turns] ${turns.length} turns from ${transcript ?? existing} -> ${turnsPath}`);
    }
  }
}
if (!turns.length) loadTurns();

// Fact-registry check (non-blocking warnings)
const factIssues = checkFacts(turns, join(ROOT, 'src', 'data', 'fact-registry.json'));
for (const issue of factIssues) console.log(`  ⚠ FACT: ${issue}`);

const cleanSpeech = (text: string) => text.replace(/\{[^}]+\}/g, '').replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();

/** Load approved pronunciations and substitute before TTS. */
function loadPronunciations(): {term: string; tts: string}[] {
  const p = join(ROOT, 'src', 'data', 'pronunciations.json');
  if (!existsSync(p)) return [];
  try {
    const data = JSON.parse(readFileSync(p, 'utf8'));
    return (data.terms ?? []).filter((t: any) => t.approved && t.tts).map((t: any) => ({term: t.term, tts: t.tts}));
  } catch { return []; }
}
function applyPronunciations(text: string, terms: {term: string; tts: string}[]): string {
  for (const {term, tts} of terms) {
    const pattern = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'gi');
    text = text.replace(pattern, tts);
  }
  return text;
}
const PRONUNCIATIONS = loadPronunciations();

// Pronunciation candidate generation (Meta UI identifies hard words)
const pronPath = join(ROOT, 'src', 'data', 'pronunciations.json');
const pronounceHash = sha256(JSON.stringify(turns.map(t => t.text)));
if (stages.includes('pronounce')) {
  if (current('pronounce', pronounceHash)) console.log('[pronounce] checkpoint current');
  else if (dryRun) console.log('[pronounce] dry-run: would identify difficult words via Meta UI');
  else {
    const existing = existsSync(pronPath) ? JSON.parse(readFileSync(pronPath, 'utf8')) : {terms: []};
    const knownTerms = new Set((existing.terms ?? []).map((t: any) => t.term.toLowerCase()));
    const prompt = `You are a TTS pronunciation specialist. Read the transcript below. Identify words that English TTS engines commonly mispronounce: foreign names, indigenous terms, archaic spellings, and historical figures. For each, provide the term as it appears, a human stress guide (CAPS for stressed syllable), and a phonetic TTS string (lowercase, hyphenated syllables). Skip common English words. Return JSON only: {"terms":[{"term":"...","guide":"...","tts":"..."}]}.\n\nTRANSCRIPT:\n${turns.filter(t => t.kind === 'speech').map(t => t.text).join('\n')}`;
    const out = meta('pronounce', prompt);
    const result = readJson<{terms: {term: string; guide: string; tts: string}[]}>(out);
    let added = 0;
    for (const term of result.terms ?? []) {
      if (!term.term || knownTerms.has(term.term.toLowerCase())) continue;
      existing.terms.push({term: term.term, guide: term.guide, tts: term.tts, approved: true, auto: true});
      knownTerms.add(term.term.toLowerCase());
      added++;
      console.log(`  + "${term.term}" -> "${term.tts}" (auto-approved)`);
    }
    if (added) {
      atomicJson(pronPath, existing);
      console.log(`[pronounce] ${added} new pronunciations auto-approved in ${pronPath}`);
    } else console.log('[pronounce] no new candidates');
    mark('pronounce', pronounceHash);
  }
}

const audioHash = sha256(JSON.stringify({mode, turns, edge: cfg.edge, fish: cfg.fish, pron: PRONUNCIATIONS}));
if (stages.includes('audio')) {
  if (current('audio', audioHash) && turns.filter(t => t.kind === 'speech').every(t => existsSync(join(audioDir, `${t.id}.mp3`)))) console.log('[audio] checkpoint current');
  else if (dryRun) console.log(`[audio] dry-run: ${mode === 'prod' ? 'Meta UI Fish direction + Fish' : 'Edge TTS'}`);
  else {
    mkdirSync(audioDir, {recursive: true}); mkdirSync(ttsDir, {recursive: true});
    const indexPath = join(ttsDir, 'index.json');
    const priorIndex = existsSync(indexPath) ? readJson<Record<string, {artifactHash?: string; hash?: string; speaker?: string; text?: string; engine?: string}>>(indexPath) : {};
    let texts = Object.fromEntries(turns.filter(t => t.kind === 'speech').map(t => [t.id, applyPronunciations(cleanSpeech(t.text ?? ''), PRONUNCIATIONS)]));
    if (mode === 'prod') {
      const prompt = `You are a Fish Audio S2 performance editor. Preserve every spoken word and historical claim exactly. Add only supported square-bracket performance commands where they improve delivery. Never add stage directions that could be spoken aloud. Return JSON only: {"turns":[{"id":"t00","text":"..."}]}. Include every supplied speech turn exactly once.\n\n${JSON.stringify(turns.filter(t => t.kind === 'speech').map(t => ({id: t.id, speaker: t.speaker, text: t.text})), null, 2)}`;
      const planned = readJson<{turns: {id: string; text: string}[]}>(meta('fish-direction', prompt));
      texts = Object.fromEntries(planned.turns.map(row => [row.id, row.text]));
      const missing = turns.filter(t => t.kind === 'speech' && !texts[t.id]);
      if (missing.length) throw new Error(`Meta Fish plan omitted ${missing.map(t => t.id).join(', ')}`);
      for (const turn of turns) if (turn.kind === 'speech' && cleanSpeech(texts[turn.id]) !== cleanSpeech(turn.text ?? '')) {
        throw new Error(`Meta Fish direction changed spoken wording in ${turn.id}; refusing production TTS`);
      }
      // A lesson-level Meta review may phrase performance tags differently on
      // every call. Preserve the approved directed text for unchanged source
      // turns so a one-line edit cannot churn unrelated Fish audio.
      for (const turn of turns) if (turn.kind === 'speech') {
        const prior = priorIndex[turn.id];
        const sourceHash = sha256(cleanSpeech(turn.text ?? ''));
        if (prior?.engine === 'fish' && prior.hash === sourceHash && prior.speaker === (turn.speaker ?? 'narrator') && prior.text) {
          texts[turn.id] = prior.text;
        }
      }
    }
    const index: Record<string, {speaker: string; text: string; hash: string; engine: string; artifactHash: string}> = {};
    let rendered = 0;
    let reused = 0;
    for (const turn of turns) {
      if (turn.kind !== 'speech') continue;
      const text = texts[turn.id];
      const output = join(audioDir, `${turn.id}.mp3`);
      writeFileSync(join(ttsDir, `${turn.id}.txt`), `${text}\n`);
      if (mode === 'dev') {
        const voice = cfg.edge.voices[turn.speaker ?? ''] ?? cfg.edge.voices.narrator;
        const artifactHash = sha256(JSON.stringify({engine: 'edge', text, voice, rate: cfg.edge.rate, pitch: cfg.edge.pitch}));
        if (!force && existsSync(output) && priorIndex[turn.id]?.artifactHash === artifactHash) reused++;
        else {
          const localEdge = join(ROOT, '.venv-pipeline', 'Scripts', 'edge-tts.exe');
          run(existsSync(localEdge) ? localEdge : 'edge-tts', ['--voice', voice, '--rate', cfg.edge.rate, '--pitch', cfg.edge.pitch, '--text', text, '--write-media', output]);
          rendered++;
        }
        index[turn.id] = {speaker: turn.speaker ?? 'narrator', text, hash: sha256(cleanSpeech(turn.text ?? '')), engine: 'edge', artifactHash};
      } else {
        const script = process.env.FISH_TTS_SCRIPT;
        const python = process.env.FISH_PYTHON ?? 'python';
        if (!script) throw new Error('PROD requires FISH_TTS_SCRIPT (Fish fish_tts.py path); optionally set FISH_PYTHON');
        const reference = cfg.fish.voices[turn.speaker ?? ''];
        if (!reference) throw new Error(`no Fish reference id for speaker ${turn.speaker}`);
        const artifactHash = sha256(JSON.stringify({engine: 'fish', text, reference, model: cfg.fish.model}));
        if (!force && existsSync(output) && priorIndex[turn.id]?.artifactHash === artifactHash) reused++;
        else {
          run(python, [script, '--text', text, '--out', output, '--model', cfg.fish.model, '--reference-id', reference, '--format', 'mp3']);
          rendered++;
        }
        index[turn.id] = {speaker: turn.speaker ?? 'narrator', text, hash: sha256(cleanSpeech(turn.text ?? '')), engine: 'fish', artifactHash};
      }
    }
    atomicJson(indexPath, index);
    mark('audio', audioHash);
    console.log(`[audio] ${rendered} rendered, ${reused} reused`);
  }
}

const timingPath = join(dataDir, 'timing_map.json');
let timing: Timing;
const timingHash = sha256(JSON.stringify({audioHash, timing: cfg.timing}));
if (stages.includes('timing')) {
  if (current('timing', timingHash) && existsSync(timingPath)) console.log('[timing] checkpoint current');
  else if (dryRun) console.log('[timing] dry-run');
  else {
    const durations = turns.map(t => t.kind === 'pause' ? t.pauseSec ?? 3 : ffprobeDuration(join(audioDir, `${t.id}.mp3`)));
    const starts: number[] = [];
    let cursor = cfg.timing.leadSec;
    turns.forEach((turn, i) => { starts.push(cursor); cursor += durations[i] + (turn.holdAfterSec ?? 0) + cfg.timing.gapSec; });
    timing = {starts, durations, totalSec: cursor + cfg.timing.tailSec, fps: 30, ttsHash: Object.fromEntries(turns.filter(t => t.kind === 'speech').map(t => [t.id, sha256(cleanSpeech(t.text ?? ''))]))};
    atomicJson(timingPath, timing); mark('timing', timingHash);
    console.log(`[timing] ${timing.totalSec.toFixed(1)}s -> ${timingPath}`);
  }
}
if (!existsSync(timingPath)) {
  if (!dryRun) throw new Error(`missing ${timingPath}; run timing stage without --dry-run`);
  const durations = turns.map(t => t.kind === 'pause' ? t.pauseSec ?? 3 : Math.max(1, (t.text ?? '').split(/\s+/).length / 2.6));
  const starts: number[] = [];
  let cursor = cfg.timing.leadSec;
  turns.forEach((turn, i) => { starts.push(cursor); cursor += durations[i] + (turn.holdAfterSec ?? 0) + cfg.timing.gapSec; });
  timing = {starts, durations, totalSec: cursor + cfg.timing.tailSec, fps: 30, ttsHash: {}};
} else timing = readJson<Timing>(timingPath);

const wordsPath = join(dataDir, 'word_times.json');
const discoveredVoskModel = voskModel();
const wordsHash = sha256(`${timingHash}:${discoveredVoskModel ?? ''}`);
const readCheckedWords = (): Record<string, WordTiming[]> => {
  if (!existsSync(wordsPath)) throw new Error(`word timing is required but missing: ${wordsPath}\nRun: npm run pipeline:dev -- --episode ${episode} --only words`);
  const words = readJson<Record<string, WordTiming[]>>(wordsPath);
  const issues = wordTimingIssues(turns, timing.durations, words);
  if (issues.length) throw new Error(`Vosk word timing gate failed:\n${issues.map(issue => `  - ${issue}`).join('\n')}\nDelete the affected Vosk cache or rerun the words stage with --force.`);
  return words;
};
if (stages.includes('words')) {
  if (current('words', wordsHash) && existsSync(wordsPath)) {
    readCheckedWords();
    console.log('[words] checkpoint current (validated)');
  }
  else if (dryRun) console.log('[words] dry-run');
  else {
    const python = pipelinePython();
    if (!discoveredVoskModel) throw new Error('Vosk model not found. Run: npm run setup:pipeline (or set VOSK_MODEL_PATH)');
    const args = [join(ROOT, 'tools/vosk-words.py'), '--audio-dir', audioDir, '--out', wordsPath, '--cache', join(work, 'vosk-cache.json')];
    args.push('--model', discoveredVoskModel);
    run(python, args);
    const checked = readCheckedWords();
    mark('words', wordsHash);
    console.log(`[words] ${Object.values(checked).reduce((sum, rows) => sum + rows.length, 0)} timed words across ${Object.keys(checked).length} turns -> ${wordsPath}`);
  }
}

const imagesPlanPath = join(work, 'images.manifest-patch.json');
const imagesHash = sha256(JSON.stringify({turns, episode}));
if (stages.includes('images')) {
  if (current('images', imagesHash) && existsSync(imagesPlanPath)) console.log('[images] checkpoint current');
  else {
    const prompt = `Act as an APUSH archival image researcher. Read the complete lesson transcript below. Select only images that materially teach the lesson. Prefer public-domain/CC0 Wikimedia Commons, Library of Congress, National Archives, museums, or other authoritative collections. Provide 1 primary source_url plus 1-3 exact-work alternative download URLs to survive throttling. Do not invent URLs or licenses. Return JSON only: {"images":[{"path":"historic/${episode}/slug.jpg","description":"...","license":"Public domain|CC0|CC BY...","source_url":"https://...","download_urls":["https://..."],"used_in":["${episode}:t00"]}]}. used_in must reference relevant turn IDs.\n\nTRANSCRIPT:\n${turns.map(t => `${t.id} ${t.speaker ?? 'PAUSE'}: ${t.text ?? `[pause ${t.pauseSec}s]`}`).join('\n')}`;
    const out = meta('images', prompt);
    if (!dryRun) {
      const planned = readJson<{images: Record<string, unknown>[] }>(out);
      const patch: Record<string, unknown> = {};
      for (const row of planned.images ?? []) {
        const path = String(row.path ?? '');
        if (!path.startsWith(`historic/${episode}/`) || !/\.(?:jpg|jpeg|png|webp)$/i.test(path)) throw new Error(`invalid planned image path: ${path}`);
        patch[path] = {description: row.description, license: row.license, source_url: row.source_url, download_urls: row.download_urls, used_in: row.used_in};
      }
      atomicJson(imagesPlanPath, patch);
      // Per-lesson registry: data/<episode>/images.json
      const manifestPath = join(ROOT, 'data', episode, 'images.json');
      const manifest = existsSync(manifestPath) ? readJson<Record<string, unknown>>(manifestPath) : {};
      atomicJson(manifestPath, {...manifest, ...patch});
      const tsx = join(ROOT, 'node_modules/tsx/dist/cli.mjs');
      // `fetch-images --only` does not require a compiled episode registry entry,
      // which keeps transcript-driven/ad-hoc lessons supported.
      for (const path of Object.keys(patch)) run(process.execPath, [tsx, 'tools/fetch-images.ts', '--only', path]);
      mark('images', imagesHash);
    }
  }
}

const planPath = join(dataDir, 'scene_plan.json');
const measuredWords = stages.includes('direct') && !dryRun
  ? readCheckedWords()
  : existsSync(wordsPath) ? readJson<Record<string, WordTiming[]>>(wordsPath) : {};
const directHash = sha256(JSON.stringify({turns, timing, measuredWords, videoGen, images: existsSync(imagesPlanPath) ? readFileSync(imagesPlanPath, 'utf8') : ''}));
if (stages.includes('direct')) {
  if (current('direct', directHash) && existsSync(planPath)) console.log('[direct] checkpoint current');
  else {
    const images = existsSync(imagesPlanPath) ? readJson<Record<string, unknown>>(imagesPlanPath) : {};
    const creative = videoGen === 'ltx' ? ', creative_clip' : '';
    const creativeContract = videoGen === 'ltx' ? ' creative_clip {image,prompt,title,caption,seed}; use it selectively for high-value cinematic moments. Its prompt must animate only the supplied still with subtle environmental/object motion, preserve the historical composition, add no people/text/objects, and contain no camera movement.' : '';
    // Load director component registry (rich: when, examples, constraints, props)
    const compReg = readJson<{components: {name: string; when: string; examples: string[]; constraints: string[]; props_detail: Record<string, {type: string; required: boolean; example: string}>}; image_rules?: {rules: string[]; examples: {wrong: string; right: string; why: string}[]}}>(join(ROOT, 'src', 'data', 'director-components.json'));
    const compList = compReg.components.map(c => {
      const props = Object.entries(c.props_detail).map(([k, v]) => `${k}(${v.type}${v.required ? ', required' : ''}): ${v.example}`).join('; ');
      return `${c.name}: ${c.when}\n  Examples: ${c.examples.join(' / ')}\n  Constraints: ${c.constraints.join('; ')}\n  Props: ${props}`;
    }).join('\n\n');
    const imgRules = compReg.image_rules ? `\n\nIMAGE RULES:\n${compReg.image_rules.rules.join('\n')}\n${compReg.image_rules.examples.map(e => `WRONG: ${e.wrong}\nRIGHT: ${e.right}\nWhy: ${e.why}`).join('\n')}` : '';
    // Shrink images to path + description only (director doesn't need URLs)
    const imgList = Object.entries(images as Record<string, {description?: string}>).map(([path, info]) => `${path}: ${info.description ?? ''}`).join('\n') + imgRules;
    const prompt = `You are the senior director for a 1280x720 APUSH lesson. Build a detailed, narration-synchronized scene plan using ONLY these components:\n${compList}${creative ? `\ncreative_clip: AI-generated video. Props: image(path), prompt(string, min 20 chars), title, caption` : ''}\n\nReturn JSON only with {"version":1,"episode":"${episode}","title":"...","scenes":[...]}. Every scene requires id, component, a contiguous turnIds array, props, and transition (cut|crossfade|dip). Cover every turn exactly once, in order. Do not type seconds: timing is derived from TTS. Image values must be keys from AVAILABLE IMAGES. Favor a new visual idea every 1-3 turns and tie transitions to changes in narration.${creativeContract}\n\nTURNS WITH MEASURED TIMES:\n${turns.map((t, i) => `${t.id} ${timing.starts[i].toFixed(2)}-${(timing.starts[i] + timing.durations[i]).toFixed(2)} ${t.speaker ?? 'PAUSE'}: ${t.text ?? `[pause ${t.pauseSec}s]`}`).join('\n')}\n\nAVAILABLE IMAGES (path: description):\n${imgList}`;
    const out = meta('director', prompt, [join(ROOT, 'director-prompt-v13-remotion.txt')].filter(existsSync));
    if (!dryRun) {
      const plan = normalizePlan(readJson<DirectedPlan>(out), turns, timing.starts, timing.durations, timing.totalSec, {
        imageKeys: Object.keys(images),
        episode,
        allowCreativeClip: videoGen === 'ltx',
      });
      for (const scene of plan.scenes) if (scene.component === 'creative_clip') {
        scene.props.clip = `clips/${episode}/${scene.id}.mp4`;
      }
      atomicJson(planPath, plan); mark('direct', directHash);
      console.log(`[direct] ${plan.scenes.length} scenes -> ${planPath}`);
    }
  }
}

const clipsHash = existsSync(planPath) ? sha256(`${readFileSync(planPath)}:${videoGen}`) : '';
if (stages.includes('clips')) {
  if (!existsSync(planPath)) {
    if (dryRun) console.log('[clips] dry-run');
    else throw new Error(`missing ${planPath}; run direct stage`);
  } else {
    const plan = readJson<DirectedPlan>(planPath);
    const jobs = plan.scenes.filter(scene => scene.component === 'creative_clip');
    const clipCachePath = join(work, 'clips-cache.json');
    const clipCache = existsSync(clipCachePath) ? readJson<Record<string, {fingerprint: string; output: string}>>(clipCachePath) : {};
    if (!jobs.length) console.log('[clips] no creative_clip scenes');
    else if (videoGen === 'none') {
      const missing = jobs.filter(scene => !existsSync(join(ROOT, 'public', String(scene.props.clip))));
      if (missing.length) throw new Error(`creative clips missing with --video-gen none: ${missing.map(s => s.id).join(', ')}`);
    } else if (current('clips', clipsHash) && jobs.every(scene => existsSync(join(ROOT, 'public', String(scene.props.clip))))) console.log('[clips] checkpoint current');
    else if (dryRun) console.log(`[clips] dry-run: ${jobs.length} LTX job(s)`);
    else {
      const python = process.env.LTX_PYTHON ?? process.env.FISH_PYTHON ?? 'python';
      const generator = process.env.LTX_SCRIPT ?? resolve(ROOT, '..', 'video', 'animate_still.py');
      if (!existsSync(generator)) throw new Error(`LTX generator missing: ${generator}`);
      for (const scene of jobs) {
        const image = join(ROOT, 'public', String(scene.props.image));
        if (!existsSync(image)) throw new Error(`${scene.id}: LTX base image missing: ${image}`);
        const output = join(ROOT, 'public', String(scene.props.clip));
        const seconds = (scene.endSec ?? 0) - (scene.startSec ?? 0);
        const fingerprint = sha256(JSON.stringify({
          prompt: scene.props.prompt, seed: scene.props.seed ?? 42, seconds,
          image: sha256(readFileSync(image)), generator: sha256(readFileSync(generator)),
        }));
        if (!force && existsSync(output) && clipCache[scene.id]?.fingerprint === fingerprint) {
          console.log(`[clips] ${scene.id}: fingerprint current`);
          continue;
        }
        const generatedSeconds = Math.max(3, Math.min(6, seconds));
        const temp = join(work, `.${scene.id}.ltx-source.mp4`);
        mkdirSync(dirname(output), {recursive: true});
        run(python, [generator, '--image', image, '--prompt', String(scene.props.prompt), '--out', temp, '--duration', String(generatedSeconds), '--seed', String(scene.props.seed ?? 42)]);
        run('ffmpeg', ['-y', '-v', 'error', '-stream_loop', '-1', '-i', temp, '-t', seconds.toFixed(3), '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output]);
        if (existsSync(temp)) unlinkSync(temp);
        const actual = ffprobeDuration(output);
        if (actual < seconds - 1 / timing.fps) throw new Error(`${scene.id}: clip ${actual.toFixed(3)}s is shorter than scene ${seconds.toFixed(3)}s`);
        clipCache[scene.id] = {fingerprint, output: String(scene.props.clip)};
        atomicJson(clipCachePath, clipCache);
        console.log(`[clips] ${scene.id}: ${actual.toFixed(2)}s -> ${output}`);
      }
      for (const id of Object.keys(clipCache)) if (!jobs.some(scene => scene.id === id)) delete clipCache[id];
      atomicJson(clipCachePath, clipCache);
      mark('clips', clipsHash);
    }
  }
}

function ensureSync(): void {
  const plan = readJson<DirectedPlan>(planPath);
  const issues = syncIssues(plan, turns, timing.starts, timing.durations, timing.totalSec, timing.fps);
  for (let i = 0; i < turns.length; i++) if (turns[i].kind === 'speech') {
    const actual = ffprobeDuration(join(audioDir, `${turns[i].id}.mp3`));
    if (Math.abs(actual - timing.durations[i]) > 1 / timing.fps) issues.push(`${turns[i].id}: timing/audio drift ${(actual - timing.durations[i]).toFixed(3)}s`);
  }
  for (const scene of plan.scenes) if (scene.component === 'creative_clip') {
    const clip = join(ROOT, 'public', String(scene.props.clip));
    if (!existsSync(clip)) issues.push(`${scene.id}: creative clip missing`);
    else {
      const required = (scene.endSec ?? 0) - (scene.startSec ?? 0);
      const actual = ffprobeDuration(clip);
      if (actual < required - 1 / timing.fps) issues.push(`${scene.id}: creative clip is ${(required - actual).toFixed(3)}s short`);
    }
  }
  const report = {episode, fps: timing.fps, totalSec: timing.totalSec, toleranceSec: 1 / timing.fps, issues};
  atomicJson(join(work, 'sync_report.json'), report);
  if (issues.length) throw new Error(`audio/scene sync gate failed:\n${issues.map(x => `  - ${x}`).join('\n')}`);
  console.log(`[sync] ${turns.length} turns and ${plan.scenes.length} scenes aligned within one frame`);
}

async function remotion(stage: 'contact' | 'render') {
  if (!existsSync(planPath)) throw new Error(`missing ${planPath}; run direct stage`);
  const plan = readJson<DirectedPlan>(planPath);
  const inputProps = {episode, plan, turns, timing};
  const serveUrl = await bundle({entryPoint: join(ROOT, 'src/directed-index.tsx')});
  const browserExecutable = process.env.REMOTION_BROWSER ?? null;
  const composition = await selectComposition({serveUrl, id: 'DirectedEpisode', inputProps, browserExecutable, logLevel: 'error'});
  // Includes the guard implementation/config as well as visual components, so
  // a guard change invalidates cached stills and segments and forces re-checking.
  const sourceHash = treeHash(join(ROOT, 'src'));
  if (stage === 'render') {
    const output = join(ROOT, 'out', `${episode}.mp4`);
    const segmentsDir = join(work, 'segments');
    mkdirSync(segmentsDir, {recursive: true});
    const cachePath = join(work, 'render-cache.json');
    const cache = existsSync(cachePath) ? readJson<Record<string, {fingerprint: string; file: string}>>(cachePath) : {};
    const nextCache: Record<string, {fingerprint: string; file: string}> = {};
    const layoutReportPath = join(work, 'render-layout.json');
    const renderLayoutIssues: LayoutIssue[] = [];
    const boundaries = [0, ...plan.scenes.map((scene, index) => index === plan.scenes.length - 1
      ? composition.durationInFrames
      : Math.round((scene.endSec ?? 0) * composition.fps))];
    const segmentFiles: string[] = [];
    let rendered = 0;
    let reused = 0;
    for (let i = 0; i < plan.scenes.length; i++) {
      const scene = plan.scenes[i];
      const from = boundaries[i];
      const to = boundaries[i + 1] - 1;
      if (to < from) throw new Error(`${scene.id}: empty render range ${from}-${to}`);
      const audioRows = scene.turnIds.map(id => {
        const file = join(audioDir, `${id}.mp3`);
        return [id, existsSync(file) ? sha256(readFileSync(file)) : 'pause'];
      });
      const assets = ['image', 'clip'].map(key => String(scene.props[key] ?? '')).filter(Boolean).map(file => {
        const path = join(ROOT, 'public', file);
        return [file, existsSync(path) ? sha256(readFileSync(path)) : 'missing'];
      });
      const fingerprint = sha256(JSON.stringify({scene, from, to, audioRows, assets, sourceHash, fps: composition.fps, width: composition.width, height: composition.height}));
      const file = join(segmentsDir, `${String(i).padStart(4, '0')}-${scene.id}.mp4`);
      nextCache[scene.id] = {fingerprint, file};
      segmentFiles.push(file);
      if (!force && existsSync(file) && cache[scene.id]?.fingerprint === fingerprint && cache[scene.id]?.file === file) {
        reused++;
        console.log(`[render] ${scene.id}: segment current`);
        continue;
      }
      const sceneLayoutIssues: LayoutIssue[] = [];
      await renderMedia({
        composition, serveUrl, codec: 'h264', outputLocation: file, inputProps,
        browserExecutable, logLevel: 'error', frameRange: [from, to],
        onBrowserLog: log => sceneLayoutIssues.push(...layoutIssuesFromLog(log.text)),
      });
      renderLayoutIssues.push(...sceneLayoutIssues);
      atomicJson(layoutReportPath, {episode, checkedAt: new Date().toISOString(), issues: renderLayoutIssues});
      const blocking = blockingLayoutIssues(sceneLayoutIssues);
      if (blocking.length) {
        if (existsSync(file)) unlinkSync(file);
        throw new Error(`layout guard failed while rendering ${scene.id}:\n${formatLayoutIssues(blocking)}\nFull report: ${layoutReportPath}`);
      }
      rendered++;
      atomicJson(cachePath, nextCache);
      console.log(`[render] ${scene.id}: frames ${from}-${to}`);
    }
    for (const file of readdirSync(segmentsDir).filter(name => name.endsWith('.mp4'))) {
      const full = join(segmentsDir, file);
      if (!segmentFiles.includes(full)) unlinkSync(full);
    }
    atomicJson(layoutReportPath, {episode, checkedAt: new Date().toISOString(), issues: renderLayoutIssues});
    atomicJson(cachePath, nextCache);
    const concat = join(work, 'segments.concat.txt');
    writeFileSync(concat, segmentFiles.map(file => `file '${file.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n') + '\n');
    const temp = `${output}.assembling.mp4`;
    run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', concat, '-c', 'copy', '-movflags', '+faststart', temp]);
    if (existsSync(output)) unlinkSync(output);
    renameSync(temp, output);
    const actual = ffprobeDuration(output);
    if (Math.abs(actual - timing.totalSec) > 2 / timing.fps) throw new Error(`assembled video is ${actual.toFixed(3)}s; expected ${timing.totalSec.toFixed(3)}s`);
    console.log(`[render] ${rendered} scene segment(s) rendered, ${reused} reused; assembled -> ${output}`); return;
  }
  const stillDir = join(work, 'stills'); mkdirSync(stillDir, {recursive: true});
  const cachePath = join(work, 'contact-cache.json');
  interface ContactCacheEntry {fingerprint: string; issues: LayoutIssue[]}
  const cache = existsSync(cachePath) ? readJson<Record<string, ContactCacheEntry>>(cachePath) : {};
  const nextCache: Record<string, ContactCacheEntry> = {};
  const contactLayoutIssues: LayoutIssue[] = [];
  const scenes = plan.scenes;
  const turnIndex = new Map(turns.map((turn, index) => [turn.id, index]));
  const samples = scenes.flatMap((scene, sceneIndex) => {
    const candidates = [
      {label: 'mid', sec: ((scene.startSec ?? 0) + (scene.endSec ?? 0)) / 2},
      ...scene.turnIds.map(turnId => {
        const index = turnIndex.get(turnId)!;
        return {label: turnId, sec: timing.starts[index] + Math.min(0.5, timing.durations[index] / 2)};
      }),
    ];
    const byFrame = new Map<number, {label: string; sec: number}>();
    for (const sample of candidates) byFrame.set(Math.min(composition.durationInFrames - 1, Math.max(0, Math.round(sample.sec * composition.fps))), sample);
    return [...byFrame.entries()].map(([frame, sample]) => ({...sample, frame, scene, sceneIndex}));
  });
  for (let i = 0; i < samples.length; i++) {
    const {scene, sceneIndex, sec, frame, label} = samples[i];
    const output = join(stillDir, `${String(i).padStart(4, '0')}.png`);
    const key = `${scene.id}:${label}:${frame}`;
    const fingerprint = sha256(JSON.stringify({scene, sceneIndex, label, sec, frame, fps: composition.fps, sourceHash}));
    const cached = cache[key];
    if (!force && existsSync(output) && cached?.fingerprint === fingerprint && Array.isArray(cached.issues)) {
      nextCache[key] = cached;
      contactLayoutIssues.push(...cached.issues);
      console.log(`[contact] ${scene.id}/${label}: still current`);
      continue;
    }
    const sceneIssues: LayoutIssue[] = [];
    await renderStill({
      composition, serveUrl, frame, output, scale: 0.3, inputProps, browserExecutable, logLevel: 'error',
      onBrowserLog: log => sceneIssues.push(...layoutIssuesFromLog(log.text)),
    });
    nextCache[key] = {fingerprint, issues: sceneIssues};
    contactLayoutIssues.push(...sceneIssues);
  }
  for (const file of readdirSync(stillDir).filter(name => /^\d{4}\.png$/.test(name))) {
    if (Number(file.slice(0, 4)) >= samples.length) unlinkSync(join(stillDir, file));
  }
  atomicJson(cachePath, nextCache);
  const layoutReportPath = join(ROOT, 'out', `${episode}-layout.json`);
  atomicJson(layoutReportPath, {episode, checkedAt: new Date().toISOString(), issues: contactLayoutIssues});
  const sheet = join(ROOT, 'out', `${episode}-contact.png`); rmSync(sheet, {force: true});
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', join(stillDir, '%04d.png'), '-vf', `tile=5x${Math.ceil(samples.length / 5)}:padding=4:color=black`, '-frames:v', '1', sheet]);
  writeFileSync(sheet.replace(/\.png$/, '.txt'), samples.map((sample, i) => `${String(i).padStart(4, '0')} ${sample.scene.id}/${sample.label} frame=${sample.frame} sec=${sample.sec.toFixed(2)} ${sample.scene.component}`).join('\n') + '\n');
  console.log(`[contact] ${samples.length} transition/mid-scene stills across ${scenes.length} scenes -> ${sheet}`);
  const blocking = blockingLayoutIssues(contactLayoutIssues);
  if (blocking.length) throw new Error(`contact sheet layout guard failed with ${blocking.length} issue(s):\n${formatLayoutIssues(blocking)}\nFull report: ${layoutReportPath}`);
  console.log(`[layout-guard] contact samples clean${contactLayoutIssues.length ? ` (${contactLayoutIssues.length} safe-area warning(s))` : ''}`);
}

const main = async () => {
  if (stages.includes('contact')) {
    if (dryRun) console.log('[contact] dry-run');
    else {
      ensureSync();
      const h = sha256(`${readFileSync(planPath)}:${treeHash(join(ROOT, 'src'))}`);
      if (current('contact', h) && existsSync(join(ROOT, 'out', `${episode}-contact.png`))) console.log('[contact] checkpoint current');
      else { await remotion('contact'); mark('contact', h); }
    }
  }
  if (stages.includes('render')) {
    if (dryRun) console.log('[render] dry-run');
    else {
      ensureSync();
      const h = sha256(`${readFileSync(planPath)}:${audioHash}:${treeHash(join(ROOT, 'src'))}`);
      if (current('render', h) && existsSync(join(ROOT, 'out', `${episode}.mp4`))) console.log('[render] checkpoint current');
      else { await remotion('render'); mark('render', h); }
    }
  }
  console.log(`pipeline complete through: ${stages.join(', ')}${flag('full') ? '' : ' (use --full for the final video)'}`);
};
await main();
