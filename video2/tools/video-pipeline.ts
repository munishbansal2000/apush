/** Resumable transcript -> TTS -> timing -> images -> direction -> QA -> render pipeline. */
import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, unlinkSync, readdirSync, statSync, renameSync} from 'node:fs';
import {basename, dirname, join, resolve} from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {ROOT, arg, flag, ffprobeDuration} from './lib';
import {atomicJson, checkFacts, normalizePlan, normalizeTurns, parseTranscript, readJson, resolveAudioScript, selectedStages, sha256, syncIssues, validateCanvas, wordTimingIssues, type DirectedPlan, type PipelineMode, type PipelineStage, type PipelineTurn, type WordTiming} from './pipeline-core';

interface Config {
  timing: {gapSec: number; leadSec: number; tailSec: number};
  edge: {voices: Record<string, string>; rate: string; pitch: string};
  fish: {model: string; voices: Record<string, string>};
  meta: {timeoutSec: number};
}
interface Timing {starts: number[]; durations: number[]; totalSec: number; fps: number; ttsHash: Record<string, string>}
interface State {version: 1; episode: string; mode: PipelineMode; stages: Partial<Record<PipelineStage, {hash: string; completedAt: string}>>}
interface LayoutIssue {frame: number; kind: string; id: string; other?: string; detail?: string}

const planImageRefs = (plan: DirectedPlan): {sceneId: string; path: string}[] => plan.scenes.flatMap(scene => {
  const refs: string[] = [];
  if ((scene.component === 'ken_burns' || scene.component === 'creative_clip') && typeof scene.props?.image === 'string') refs.push(scene.props.image);
  if (scene.component === 'stagger' && Array.isArray(scene.props?.panels)) {
    for (const panel of scene.props.panels as Record<string, unknown>[]) if (typeof panel?.image === 'string') refs.push(panel.image);
  }
  return refs.map(path => ({sceneId: scene.id, path}));
});

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
const meta = (name: string, prompt: string, attachments: string[] = [], followupPrompt?: string) => {
  const out = join(work, `${name}.json`);
  const inputHash = sha256(JSON.stringify({prompt, followupPrompt, attachments: attachments.map(file => [file, existsSync(file) ? sha256(readFileSync(file)) : 'missing'])}));
  const hashPath = `${out}.input.sha256`;
  if (dryRun) {
    const promptPath = savePrompt(name, prompt);
    const reviewPath = followupPrompt ? savePrompt(`${name}.review`, followupPrompt) : null;
    console.log(`[${name}] dry-run: ${promptPath}${reviewPath ? ` + ${reviewPath}` : ''}`);
    return out;
  }
  if (!force && existsSync(out) && existsSync(hashPath) && readFileSync(hashPath, 'utf8').trim() === inputHash) {
    try {
      const cached = readJson<unknown>(out);
      if (!cached || typeof cached !== 'object' || Array.isArray(cached)) throw new Error('top-level value is not an object');
      console.log(`[${name}] prompt cache current`);
      return out;
    } catch (error) {
      console.warn(`[${name}] ignoring invalid prompt cache: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  // A failed forced refresh must not leave the old input hash looking current.
  if (existsSync(hashPath)) unlinkSync(hashPath);
  const args = [join(ROOT, 'tools/meta-ui-runner.cjs'), '--prompt-file', savePrompt(name, prompt), '--out', out, '--timeout-sec', String(cfg.meta.timeoutSec)];
  if (followupPrompt) args.push('--followup-prompt-file', savePrompt(`${name}.review`, followupPrompt));
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
      const planned = readJson<{images?: Record<string, unknown>[] }>(out);
      if (!Array.isArray(planned.images) || !planned.images.length) throw new Error('Meta UI image plan must contain a non-empty images array');
      // Per-lesson registry: data/<episode>/images.json. Reviewed entries are
      // creative source-of-truth and must not be replaced by a later Meta run.
      const manifestPath = join(ROOT, 'data', episode, 'images.json');
      const manifest = existsSync(manifestPath) ? readJson<Record<string, Record<string, unknown>>>(manifestPath) : {};
      const patch: Record<string, unknown> = {};
      for (const row of planned.images) {
        const path = String(row.path ?? '');
        if (!path.startsWith(`historic/${episode}/`) || !/\.(?:jpg|jpeg|png|webp)$/i.test(path)) throw new Error(`invalid planned image path: ${path}`);
        const reviewed = manifest[path]?.verified ? manifest[path] : null;
        patch[path] = reviewed
          ? {...reviewed, used_in: [...new Set([...(reviewed.used_in as string[] ?? []), ...(row.used_in as string[] ?? [])])]}
          : {description: row.description, license: row.license, source_url: row.source_url, download_urls: row.download_urls, used_in: row.used_in};
      }
      atomicJson(imagesPlanPath, patch);
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
const imageManifestPath = join(dataDir, 'images.json');
type DirectorImage = {description?: string; used_in?: string[]};
const imageManifest = existsSync(imageManifestPath) ? readJson<Record<string, DirectorImage>>(imageManifestPath) : {};
// Direction uses turn durations, not Vosk's word dump: the scene schema can
// only bind to whole turns. Only registered files that actually exist may be
// selected; download URLs and license metadata do not help scene selection.
const readyImages = Object.fromEntries(Object.entries(imageManifest).filter(([path]) => existsSync(join(ROOT, 'public', path))));
const directorRegistryPath = join(ROOT, 'src', 'data', 'director-components.json');
const directorRubricPath = join(ROOT, 'director-prompt-v13-remotion.txt');
const directorContractPath = join(ROOT, 'src', 'data', 'director-output-contract.json');
const directHash = sha256(JSON.stringify({
  contract: 'turn-range-object-v1+same-chat-review-v1',
  turns,
  timing: {starts: timing.starts, durations: timing.durations, totalSec: timing.totalSec, fps: timing.fps},
  videoGen,
  images: readyImages,
  registry: readFileSync(directorRegistryPath, 'utf8'),
  rubric: readFileSync(directorRubricPath, 'utf8'),
  outputSchema: readFileSync(directorContractPath, 'utf8'),
}));
if (stages.includes('direct')) {
  const imageKeys = Object.keys(readyImages);
  type TransportScene = Omit<DirectedPlan['scenes'][number], 'turnIds'> & {turnIds?: string[]; turnRange?: unknown};
  type TransportPlan = Omit<DirectedPlan, 'scenes'> & {scenes: TransportScene[]};
  const validateTransportContract = (raw: TransportPlan): void => {
    const topKeys = new Set(['version', 'episode', 'title', 'scenes']);
    const extraTop = Object.keys(raw as object).filter(key => !topKeys.has(key));
    if (extraTop.length) throw new Error(`director output has unsupported top-level fields: ${extraTop.join(', ')}`);
    if (raw.version !== 1 || typeof raw.episode !== 'string' || !raw.episode || typeof raw.title !== 'string' || !raw.title || !Array.isArray(raw.scenes) || !raw.scenes.length) {
      throw new Error('director output must contain version=1, non-empty episode/title, and non-empty scenes');
    }
    const sceneKeys = new Set(['id', 'component', 'turnRange', 'props', 'transition']);
    for (const [index, scene] of raw.scenes.entries()) {
      if (!scene || typeof scene !== 'object') throw new Error(`scene ${index}: must be an object`);
      const extra = Object.keys(scene).filter(key => !sceneKeys.has(key));
      if (extra.length) throw new Error(`scene ${index}: unsupported fields: ${extra.join(', ')}`);
      if (typeof scene.id !== 'string' || !scene.id.trim()) throw new Error(`scene ${index}: id is required`);
      if (!scene.props || typeof scene.props !== 'object' || Array.isArray(scene.props)) throw new Error(`${scene.id}: props must be an object`);
      if (!['cut', 'crossfade', 'dip'].includes(String(scene.transition))) throw new Error(`${scene.id}: transition must be cut, crossfade, or dip`);
      const range = scene.turnRange as Record<string, unknown> | undefined;
      if (!range || typeof range !== 'object' || Array.isArray(range) || Object.keys(range).sort().join(',') !== 'from,to') {
        throw new Error(`${scene.id}: turnRange must be exactly {"from":integer,"to":integer}`);
      }
    }
  };
  const materializeTurnIds = (raw: TransportPlan): DirectedPlan => {
    for (const scene of raw.scenes ?? []) {
      if (!Array.isArray(scene.turnIds)) {
        const range = scene.turnRange as Record<string, unknown> | undefined;
        if (!range || typeof range !== 'object' || Array.isArray(range)) throw new Error(`${scene.id}: requires turnRange {"from":firstIndex,"to":lastIndex}`);
        const first = range.from;
        const last = range.to;
        if (!Number.isInteger(first) || !Number.isInteger(last) || Number(first) < 0 || Number(last) < Number(first) || Number(last) >= turns.length) {
          throw new Error(`${scene.id}: invalid turnRange ${JSON.stringify(scene.turnRange)} for ${turns.length} turns`);
        }
        scene.turnIds = turns.slice(Number(first), Number(last) + 1).map(turn => turn.id);
      }
      delete scene.turnRange;
    }
    return raw as DirectedPlan;
  };
  const validateCandidate = (path: string, requireStoredTiming = false): {plan?: DirectedPlan; issues: string[]} => {
    const issues: string[] = [];
    try {
      const transport = readJson<TransportPlan>(path);
      if (!requireStoredTiming) validateTransportContract(transport);
      const raw = materializeTurnIds(transport);
      const allowedImages = new Set(imageKeys);
      for (const ref of planImageRefs(raw)) if (!allowedImages.has(ref.path)) {
        issues.push(`${ref.sceneId}: image "${ref.path}" is not a downloaded AVAILABLE IMAGES asset`);
      }
      const turnById = new Map(turns.map(turn => [turn.id, cleanSpeech(turn.text ?? '')]));
      const comparable = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
      for (const scene of raw.scenes ?? []) if (scene.component === 'quote') {
        const spoken = comparable((scene.turnIds ?? []).map(id => turnById.get(id) ?? '').join(' '));
        if (!spoken.includes(comparable(scene.props?.quote))) issues.push(`${scene.id}: quote is not verbatim narration from its assigned turns`);
      }
      const plan = normalizePlan(raw, turns, timing.starts, timing.durations, timing.totalSec, {
        imageKeys,
        episode,
        allowCreativeClip: videoGen === 'ltx',
      });
      issues.push(
        ...syncIssues(plan, turns, timing.starts, timing.durations, timing.totalSec, timing.fps),
        ...validateCanvas(plan),
      );
      if (requireStoredTiming) issues.push(...syncIssues(raw, turns, timing.starts, timing.durations, timing.totalSec, timing.fps));
      return issues.length ? {issues: [...new Set(issues)]} : {plan, issues: []};
    } catch (error) {
      issues.push(error instanceof Error ? error.message : String(error));
      return {issues: [...new Set(issues)]};
    }
  };
  const checkpoint = existsSync(planPath) ? validateCandidate(planPath, true) : {issues: ['scene plan is missing']};
  if (current('direct', directHash) && checkpoint.plan) {
    atomicJson(join(work, 'director-validation.json'), {episode, accepted: true, source: planPath, attempts: [{source: 'checkpoint', issues: []}]});
    console.log(`[direct] checkpoint current (${checkpoint.plan.scenes.length} validated scenes)`);
  } else {
    if (current('direct', directHash) && checkpoint.issues.length) {
      console.warn(`[direct] checkpoint rejected:\n${checkpoint.issues.map(issue => `  - ${issue}`).join('\n')}`);
    }
    const creative = videoGen === 'ltx' ? ', creative_clip' : '';
    const creativeContract = videoGen === 'ltx' ? ' creative_clip {image,prompt,title,caption,seed}; use it selectively for high-value cinematic moments. Its prompt must animate only the supplied still with subtle environmental/object motion, preserve the historical composition, add no people/text/objects. NEVER use the words camera, zoom, pan, tilt, dolly, tracking, crane, or any camera-movement term — the factory does its own camera work and rejects such prompts.' : '';
    // Send every renderer-supported tool, but only its selection guidance,
    // prop schema, and hard constraints. Lesson-specific examples add tokens
    // and tend to anchor the model to filenames from another episode.
    const compReg = readJson<{components: {name: string; when: string; examples: string[]; constraints: string[]; props_detail: Record<string, {type: string; required: boolean; example: string}>}[]; image_rules?: {rules: string[]}}>(directorRegistryPath);
    const compList = compReg.components.map(c => {
      const props = Object.entries(c.props_detail).map(([key, value]) => `${key}${value.required ? '*' : '?'}:${value.type}`).join(', ');
      return `${c.name} | use: ${c.when} | props: ${props} | hard: ${c.constraints.join(' ')}`;
    }).join('\n');
    const imageRules = (compReg.image_rules?.rules ?? []).join(' ');
    const imgList = Object.entries(readyImages).map(([path, info]) => {
      const relevantTurns = (info.used_in ?? []).map(value => value.replace(/^.*:/, '')).filter(Boolean).join(',');
      const description = String(info.description ?? '').replace(/\s+/g, ' ').trim().slice(0, 220);
      return `${path} | turns=${relevantTurns || '-'} | ${description}`;
    }).join('\n') || '(none; use non-image components only)';
    const rubric = readFileSync(directorRubricPath, 'utf8').trim();
    const outputSchema = readFileSync(directorContractPath, 'utf8').trim();
    const prompt = `${rubric}\n\nCOMPACT OUTPUT SHAPE\nReturn JSON shaped like this example:\n{"version":1,"episode":"${episode}","title":"Lesson title","scenes":[{"id":"s00","component":"title","turnRange":{"from":0,"to":1},"props":{"title":"Act title"},"transition":"cut"}]}\nturnRange is inclusive and refers to numeric indices in TURNS. Always use the object form {"from":number,"to":number}; numeric bracket arrays are forbidden because Meta renders them as citations. Never output any bare-number array: use labeled {label,value} rows for chart data and omit ken_burns stops. Every scene uses exactly id, component, turnRange, props, and transition. Never emit turnIds, startSec, or endSec. Use ONLY the component palette below${creative}.${creativeContract}\n\nCOMPLETE COMPONENT PALETTE\n${compList}${videoGen === 'ltx' ? '\ncreative_clip | use: selected still-image animation | props: image*:registry path, prompt*:string >=20 chars, title?:string, caption?:string, seed?:number | hard: obey the creative constraints in OUTPUT CONTRACT.' : ''}\n\nIMAGE RULE\n${imageRules}\n\nTURNS (index:id | measured duration | speaker | locked narration)\n${turns.map((turn, index) => `${index}:${turn.id} | ${timing.durations[index].toFixed(2)}s | ${turn.speaker ?? 'PAUSE'} | ${turn.text ?? `[pause ${turn.pauseSec}s]`}`).join('\n')}\n\nAVAILABLE IMAGES (exact path | relevant turns | short description)\n${imgList}`;
    const reviewPrompt = `Switch roles now. Act as an independent, skeptical senior editor reviewing the scene plan you just produced. The draft may contain malformed JSON or fields stripped by citation rendering; repair it rather than repeating the defect. Do not defend or merely summarize the draft. Re-read the original locked narration, measured turn durations, component contracts, image catalog, and output rules already present in this chat.\n\nAudit the draft across every dimension below:\n1. COMPLETENESS: inclusive turnRange {from,to} objects cover every turn index exactly once, in order, with no gaps or overlaps; every required prop exists.\n2. CORRECTNESS AND GROUNDING: visible facts, numbers, quotations, labels, document text, and captions are supported by the assigned narration; quotes are verbatim; nothing is invented.\n3. COHERENCE: scenes form a clear thesis-driven lesson with sensible acts and conceptual transitions; adjacent turns that form one thought are not needlessly fragmented.\n4. TTS SYNCHRONIZATION AND PACING: grouping fits the measured turn durations, short scenes remain readable, long scenes remain visually useful, and transitions occur at semantic turn boundaries. Never add seconds.\n5. VISUAL DIRECTION: each component is the best tool for its idea, the full palette is considered, repetition is controlled, text density fits 1280x720, and title cards are reserved for true act boundaries.\n6. IMAGE AND VIDEO SAFETY: every image path is copied exactly from AVAILABLE IMAGES and is relevant to its assigned turns; creative_clip obeys every prompt restriction.\n7. RENDERABILITY: schema, component names, nested props, transitions, and primary-source highlights satisfy the supplied contracts.\n\nYour response MUST validate against this JSON Schema:\n${outputSchema}\n\nSilently fix every issue you find and reformat the result. Return ONLY the complete corrected scene-plan JSON object. Every scene must use turnRange:{"from":firstIndex,"to":lastIndex}; never use a numeric range array or turnIds. Never output bare-number arrays: chart data uses labeled objects and ken_burns stops is omitted. Return the full plan even if no changes are needed. Do not return an audit report, markdown, commentary, or an envelope around the plan.`;
    let candidatePath = meta('director', prompt, [], reviewPrompt);
    if (!dryRun) {
      const attempts: {source: string; issues: string[]}[] = [];
      const maxRepairs = Math.max(0, Number(process.env.DIRECTOR_REPAIR_ATTEMPTS ?? 2));
      let plan: DirectedPlan | undefined;
      for (let attempt = 0; attempt <= maxRepairs; attempt++) {
        const checked = validateCandidate(candidatePath);
        attempts.push({source: candidatePath, issues: checked.issues});
        if (checked.plan) { plan = checked.plan; break; }
        console.warn(`[direct] candidate ${attempt + 1} rejected:\n${checked.issues.map(issue => `  - ${issue}`).join('\n')}`);
        if (attempt === maxRepairs) break;
        const invalid = readFileSync(candidatePath, 'utf8');
        const repairPrompt = `Repair the scene-plan JSON below. Return the complete corrected JSON object only. Preserve good creative choices, but satisfy every validation error and the full contract. Do not explain changes.\n\nVALIDATION ERRORS\n${checked.issues.map(issue => `- ${issue}`).join('\n')}\n\nFULL CONTRACT AND SOURCE DATA\n${prompt}\n\nINVALID CANDIDATE\n${invalid}`;
        candidatePath = meta(`director-repair-${attempt + 1}`, repairPrompt);
      }
      atomicJson(join(work, 'director-validation.json'), {episode, accepted: !!plan, attempts});
      if (!plan) throw new Error(`director failed validation after ${attempts.length} candidate(s); see ${join(work, 'director-validation.json')}`);
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
      const generator = process.env.LTX_SCRIPT ?? join(ROOT, 'tools', 'animate_still.py');
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
  const issues: string[] = [];
  const registeredImageKeys = Object.keys(existsSync(imageManifestPath) ? readJson<Record<string, unknown>>(imageManifestPath) : {});
  for (const ref of planImageRefs(plan)) {
    if (!registeredImageKeys.includes(ref.path)) issues.push(`${ref.sceneId}: image is not registered: ${ref.path}`);
    else if (!existsSync(join(ROOT, 'public', ref.path))) issues.push(`${ref.sceneId}: image file is missing: public/${ref.path}`);
  }
  try {
    const normalized = normalizePlan(plan, turns, timing.starts, timing.durations, timing.totalSec, {
      imageKeys: registeredImageKeys,
      episode,
      allowCreativeClip: videoGen === 'ltx',
    });
    issues.push(...validateCanvas(normalized));
  } catch (error) {
    issues.push(`scene plan validation: ${error instanceof Error ? error.message : String(error)}`);
  }
  // Check the stored times too. normalizePlan proves that the turn grouping can
  // produce a valid timeline; this catches stale/manual startSec/endSec edits.
  issues.push(...syncIssues(plan, turns, timing.starts, timing.durations, timing.totalSec, timing.fps));
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
