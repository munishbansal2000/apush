/**
 * Generate the LTX hero clips a documentary shot plan asks for (on the 5090). Each clip is keyed by content
 * (still, prompt, seed, focus, generator), generated once at 16:9, and turned into a seamless forward+reverse
 * boomerang so shots of any length can loop it.
 *
 *   npx tsx tools/doc-clips.ts --episode u3e1 --plan data/u3e1/shots.sample.json [--draft] [--dry-run] [--force]
 *
 * Backend: LTX Desktop (default; start the app first; tools/ltx_desktop.py talks to its local API) or
 * LTX_BACKEND=diffusers (tools/animate_still.py loads the model itself; needs LTX_PYTHON with torch).
 * Output: public/clips/<ep>/<fingerprint>*.mp4 plus public/clips/<ep>/clips.json, which doc-render reads.
 */
import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, renameSync, unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT, arg, flag, ffprobeDuration} from './lib';
import {atomicJson, readJson} from './pipeline-core';
import {CLIP_SIZE, DESKTOP_SETTINGS, PAINTING_NEGATIVE, aspectCrop, ltxBackend} from './pipeline/clip-fingerprint';
import {DESKTOP_CLIENT, GENERATOR, clipsDirFor, loadDocInputs, resolveDocPlan, type ClipManifest} from './pipeline/doc-inputs';
import {findTool} from './pipeline/tools';

const episode = arg('episode') ?? (() => { throw new Error('--episode is required'); })();
const inputs = loadDocInputs(episode, arg('plan') ?? join(ROOT, 'data', episode, 'shots.json'), flag('draft'));
const resolved = resolveDocPlan(inputs);
const jobs = resolved.shots.flatMap(s => (s.type === 'clip' ? [s] : []));
const outDir = clipsDirFor(episode);
const manifestPath = join(outDir, 'clips.json');
const manifest: ClipManifest = existsSync(manifestPath) ? readJson<ClipManifest>(manifestPath) : {};
console.log(`[clips] ${jobs.length} clip shot(s) in the plan`);
if (!jobs.length) process.exit(0);
mkdirSync(outDir, {recursive: true});
const backend = ltxBackend();
// The Desktop client is stdlib-only (any Python 3); the diffusers path needs the LTX venv with torch.
const python = flag('dry-run') ? 'python' : findTool(['python3', 'python', 'py'], 'LTX_PYTHON');
if (backend === 'desktop' && !flag('dry-run')) {
  const check = spawnSync(python, [DESKTOP_CLIENT, '--check'], {cwd: ROOT, stdio: 'inherit'});
  if (check.status !== 0) throw new Error('LTX Desktop is not reachable: start the app, or set LTX_BACKEND=diffusers');
}

for (const shot of jobs) {
  const boomerang = join(outDir, `${shot.fingerprint}.boomerang.mp4`);
  const rel = `clips/${episode}/${shot.fingerprint}.boomerang.mp4`;
  if (!flag('force') && manifest[shot.fingerprint] && existsSync(boomerang)) {
    console.log(`[clips] ${shot.id}: current (${shot.fingerprint})`);
    continue;
  }
  const raw = join(outDir, `${shot.fingerprint}.mp4`);
  let args: string[];
  if (backend === 'desktop') {
    // Crop to 16:9 around the focus first, so the app can never stretch the painting whatever its own fit rule is.
    const input = join(outDir, `${shot.fingerprint}.input.jpg`);
    const c = aspectCrop(shot.size, CLIP_SIZE.width / CLIP_SIZE.height, shot.focus);
    if (!flag('dry-run')) execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', join(ROOT, 'public', shot.image), '-vf', `crop=${c.w}:${c.h}:${c.x}:${c.y}`, '-q:v', '2', input]);
    args = [DESKTOP_CLIENT, '--image', input, '--prompt', shot.prompt, '--out', raw, '--seed', String(shot.seed), '--duration', String(DESKTOP_SETTINGS.duration),
      '--model', DESKTOP_SETTINGS.model, '--resolution', DESKTOP_SETTINGS.resolution, '--fps', String(DESKTOP_SETTINGS.fps),
      '--camera-motion', DESKTOP_SETTINGS.cameraMotion, '--negative', PAINTING_NEGATIVE];
  } else {
    args = [GENERATOR, '--image', join(ROOT, 'public', shot.image), '--prompt', shot.prompt, '--out', raw, '--duration', '6',
      '--seed', String(shot.seed), '--width', String(CLIP_SIZE.width), '--height', String(CLIP_SIZE.height), '--focus', `${shot.focus[0]},${shot.focus[1]}`];
  }
  if (flag('dry-run')) {
    console.log(`[clips] ${shot.id}: would run (${backend}) ${python} ${args.map(a => (a.includes(' ') ? JSON.stringify(a) : a)).join(' ')}`);
    continue;
  }
  console.log(`[clips] ${shot.id}: generating with LTX ${backend} (${shot.image})`);
  const result = spawnSync(python, args, {cwd: ROOT, stdio: 'inherit'});
  if (result.status !== 0) throw new Error(`${shot.id}: animate_still.py failed with exit ${result.status}`);
  // Forward then reversed: loops without a jump, and doubles usable length for longer shots.
  const temp = `${boomerang}.tmp.mp4`;
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-filter_complex', '[0:v]split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0[out]',
    '-map', '[out]', '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-movflags', '+faststart', temp]);
  if (existsSync(boomerang)) unlinkSync(boomerang);
  renameSync(temp, boomerang);
  const durationSec = ffprobeDuration(boomerang);
  manifest[shot.fingerprint] = {path: rel, durationSec, prompt: shot.prompt, image: shot.image, seed: shot.seed, createdAt: new Date().toISOString()};
  atomicJson(manifestPath, manifest);
  console.log(`[clips] ${shot.id}: ${durationSec.toFixed(2)}s boomerang -> public/${rel}`);
}
