/** Resumable transcript -> TTS -> timing -> images -> direction -> QA -> render pipeline. */
import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, unlinkSync, readdirSync, statSync, renameSync} from 'node:fs';
import {basename, dirname, join, resolve} from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {ROOT, arg, flag, ffprobeDuration} from './lib';
import {atomicJson, normalizePlan, normalizeTurns, parseTranscript, readJson, resolveAudioScript, selectedStages, sha256, syncIssues, type DirectedPlan, type PipelineMode, type PipelineStage, type PipelineTurn} from './pipeline-core';

interface Config {
  timing: {gapSec: number; leadSec: number; tailSec: number};
  edge: {voices: Record<string, string>; rate: string; pitch: string};
  fish: {model: string; voices: Record<string, string>};
  meta: {timeoutSec: number};
}
interface Timing {starts: number[]; durations: number[]; totalSec: number; fps: number; ttsHash: Record<string, string>}
interface State {version: 1; episode: string; mode: PipelineMode; stages: Partial<Record<PipelineStage, {hash: string; completedAt: string}>>}

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

const cleanSpeech = (text: string) => text.replace(/\{[^}]+\}/g, '').replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();
const audioHash = sha256(JSON.stringify({mode, turns, edge: cfg.edge, fish: cfg.fish}));
if (stages.includes('audio')) {
  if (current('audio', audioHash) && turns.filter(t => t.kind === 'speech').every(t => existsSync(join(audioDir, `${t.id}.mp3`)))) console.log('[audio] checkpoint current');
  else if (dryRun) console.log(`[audio] dry-run: ${mode === 'prod' ? 'Meta UI Fish direction + Fish' : 'Edge TTS'}`);
  else {
    mkdirSync(audioDir, {recursive: true}); mkdirSync(ttsDir, {recursive: true});
    const indexPath = join(ttsDir, 'index.json');
    const priorIndex = existsSync(indexPath) ? readJson<Record<string, {artifactHash?: string; hash?: string; speaker?: string; text?: string; engine?: string}>>(indexPath) : {};
    let texts = Object.fromEntries(turns.filter(t => t.kind === 'speech').map(t => [t.id, cleanSpeech(t.text ?? '')]));
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
if (stages.includes('words')) {
  if (current('words', wordsHash) && existsSync(wordsPath)) console.log('[words] checkpoint current');
  else if (dryRun) console.log('[words] dry-run');
  else {
    const python = pipelinePython();
    if (!discoveredVoskModel) throw new Error('Vosk model not found. Run: npm run setup:pipeline (or set VOSK_MODEL_PATH)');
    const args = [join(ROOT, 'tools/vosk-words.py'), '--audio-dir', audioDir, '--out', wordsPath, '--cache', join(work, 'vosk-cache.json')];
    args.push('--model', discoveredVoskModel);
    run(python, args); mark('words', wordsHash);
    console.log(`[words] -> ${wordsPath}`);
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
      const manifestPath = join(ROOT, 'data/images.json');
      const manifest = readJson<Record<string, unknown>>(manifestPath);
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
const measuredWords = existsSync(wordsPath) ? readJson<Record<string, {w: string; s: number; e: number}[]>>(wordsPath) : {};
const directHash = sha256(JSON.stringify({turns, timing, measuredWords, videoGen, images: existsSync(imagesPlanPath) ? readFileSync(imagesPlanPath, 'utf8') : ''}));
if (stages.includes('direct')) {
  if (current('direct', directHash) && existsSync(planPath)) console.log('[direct] checkpoint current');
  else {
    const images = existsSync(imagesPlanPath) ? readJson<Record<string, unknown>>(imagesPlanPath) : {};
    const creative = videoGen === 'ltx' ? ', creative_clip' : '';
    const creativeContract = videoGen === 'ltx' ? ' creative_clip {image,prompt,title,caption,seed}; use it selectively for high-value cinematic moments. Its prompt must animate only the supplied still with subtle environmental/object motion, preserve the historical composition, add no people/text/objects, and contain no camera movement.' : '';
    const prompt = `You are the senior director for a 1280x720 APUSH lesson. Build a detailed, narration-synchronized scene plan using ONLY these components: title, ken_burns, quote, compare, causal_chain, highlight, primary_source${creative}. Return JSON only with {"version":1,"episode":"${episode}","title":"...","scenes":[...]}. Every scene requires id, component, a contiguous turnIds array, props, and transition (cut|crossfade|dip). Cover every turn exactly once, in order. Do not type seconds: timing is derived from TTS. Use ken_burns props {image,title,caption,stops:[[x,y,scale],[x,y,scale]]}; title {title,kicker,subline}; quote {quote,byline}; compare {title,left:{head,sections:[{sub,points}]},right:{...}}; causal_chain {title,nodes}; highlight {title,body,highlights:[{text,note}]}; primary_source {documentTitle,authorAndDate,excerptText,highlightedPhrase,hippType,hippExplanation,documentType}.${creativeContract} Image values must be keys from AVAILABLE IMAGES. Favor a new visual idea every 1-3 turns and tie transitions to changes in narration. VOSK_WORD_TIMES are offsets within each turn and should guide the semantic moment chosen for each visual, but do not copy numeric timing into the plan.\n\nTURNS WITH MEASURED TIMES:\n${turns.map((t, i) => `${t.id} ${timing.starts[i].toFixed(2)}-${(timing.starts[i] + timing.durations[i]).toFixed(2)} ${t.speaker ?? 'PAUSE'}: ${t.text ?? `[pause ${t.pauseSec}s]`}`).join('\n')}\n\nVOSK_WORD_TIMES:\n${JSON.stringify(measuredWords)}\n\nAVAILABLE IMAGES:\n${JSON.stringify(images, null, 2)}`;
    const out = meta('director', prompt, [join(ROOT, 'director-prompt-v13-remotion.txt')].filter(existsSync));
    if (!dryRun) {
      const plan = normalizePlan(readJson<DirectedPlan>(out), turns, timing.starts, timing.durations, timing.totalSec);
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
  if (stage === 'render') {
    const output = join(ROOT, 'out', `${episode}.mp4`);
    const segmentsDir = join(work, 'segments');
    mkdirSync(segmentsDir, {recursive: true});
    const cachePath = join(work, 'render-cache.json');
    const cache = existsSync(cachePath) ? readJson<Record<string, {fingerprint: string; file: string}>>(cachePath) : {};
    const nextCache: Record<string, {fingerprint: string; file: string}> = {};
    const sourceHash = treeHash(join(ROOT, 'src'));
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
      await renderMedia({
        composition, serveUrl, codec: 'h264', outputLocation: file, inputProps,
        browserExecutable, logLevel: 'error', frameRange: [from, to],
      });
      rendered++;
      atomicJson(cachePath, nextCache);
      console.log(`[render] ${scene.id}: frames ${from}-${to}`);
    }
    for (const file of readdirSync(segmentsDir).filter(name => name.endsWith('.mp4'))) {
      const full = join(segmentsDir, file);
      if (!segmentFiles.includes(full)) unlinkSync(full);
    }
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
  const cache = existsSync(cachePath) ? readJson<Record<string, string>>(cachePath) : {};
  const nextCache: Record<string, string> = {};
  const scenes = plan.scenes;
  for (let i = 0; i < scenes.length; i++) {
    const sec = ((scenes[i].startSec ?? 0) + (scenes[i].endSec ?? 0)) / 2;
    const output = join(stillDir, `${String(i).padStart(4, '0')}.png`);
    const fingerprint = sha256(JSON.stringify({scene: scenes[i], index: i, sec, fps: composition.fps}));
    nextCache[scenes[i].id] = fingerprint;
    if (!force && existsSync(output) && cache[scenes[i].id] === fingerprint) {
      console.log(`[contact] ${scenes[i].id}: still current`);
      continue;
    }
    await renderStill({composition, serveUrl, frame: Math.min(composition.durationInFrames - 1, Math.round(sec * composition.fps)), output, scale: 0.3, inputProps, browserExecutable, logLevel: 'error'});
  }
  for (const file of readdirSync(stillDir).filter(name => /^\d{4}\.png$/.test(name))) {
    if (Number(file.slice(0, 4)) >= scenes.length) unlinkSync(join(stillDir, file));
  }
  atomicJson(cachePath, nextCache);
  const sheet = join(ROOT, 'out', `${episode}-contact.png`); rmSync(sheet, {force: true});
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', join(stillDir, '%04d.png'), '-vf', `tile=5x${Math.ceil(scenes.length / 5)}:padding=4:color=black`, '-frames:v', '1', sheet]);
  writeFileSync(sheet.replace(/\.png$/, '.txt'), scenes.map((s, i) => `${String(i).padStart(4, '0')} ${s.id} ${s.startSec?.toFixed(2)}-${s.endSec?.toFixed(2)} ${s.component}`).join('\n') + '\n');
  console.log(`[contact] ${scenes.length} scene stills -> ${sheet}`);
}

const main = async () => {
  if (stages.includes('contact')) {
    if (dryRun) console.log('[contact] dry-run');
    else {
      ensureSync();
      const h = sha256(readFileSync(planPath));
      if (current('contact', h) && existsSync(join(ROOT, 'out', `${episode}-contact.png`))) console.log('[contact] checkpoint current');
      else { await remotion('contact'); mark('contact', h); }
    }
  }
  if (stages.includes('render')) {
    if (dryRun) console.log('[render] dry-run');
    else {
      ensureSync();
      const h = sha256(`${readFileSync(planPath)}:${audioHash}`);
      if (current('render', h) && existsSync(join(ROOT, 'out', `${episode}.mp4`))) console.log('[render] checkpoint current');
      else { await remotion('render'); mark('render', h); }
    }
  }
  console.log(`pipeline complete through: ${stages.join(', ')}${flag('full') ? '' : ' (use --full for the final video)'}`);
};
await main();
