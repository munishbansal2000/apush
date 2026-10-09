/**
 * Find external programs the same way on Windows, macOS and Linux: an env override, the project venv
 * (.venv-pipeline/Scripts on Windows, .venv-pipeline/bin elsewhere), common install dirs (Miniconda/Anaconda,
 * Homebrew), then PATH. Fails with the list of places it looked instead of a bare ENOENT.
 */
import {existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {delimiter, join} from 'node:path';
import {ROOT} from '../lib';

const isWindows = process.platform === 'win32';
const home = process.env.USERPROFILE ?? process.env.HOME ?? homedir();

/** Directories searched after the env override and before PATH. */
export function toolDirs(root = ROOT): string[] {
  return [
    join(root, '.venv-pipeline', isWindows ? 'Scripts' : 'bin'),
    ...['miniconda3', 'anaconda3', 'mambaforge', 'miniforge3'].map(d => join(home, d, isWindows ? 'Scripts' : 'bin')),
    ...(isWindows ? [] : ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin']),
  ];
}

/**
 * Absolute path of the first match. `names` are tried in order in every directory (e.g. python3 then python);
 * `.exe` is added on Windows. Set `envVar` (e.g. EDGE_TTS) to force a path.
 */
export function findTool(names: string[], envVar?: string, opts: {dirs?: string[]; pathEnv?: string} = {}): string {
  const forced = envVar ? process.env[envVar] : undefined;
  if (forced) {
    if (!existsSync(forced)) throw new Error(`${envVar}=${forced} does not exist`);
    return forced;
  }
  const dirs = [...(opts.dirs ?? toolDirs()), ...(opts.pathEnv ?? process.env.PATH ?? '').split(delimiter).filter(Boolean)];
  const files = names.flatMap(name => (isWindows && !name.endsWith('.exe') ? [`${name}.exe`, name] : [name]));
  for (const dir of dirs) for (const file of files) {
    const candidate = join(dir, file);
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`${names[0]} not found. Looked for ${files.join('/')} in:\n${dirs.map(d => `  ${d}`).join('\n')}${envVar ? `\nSet ${envVar} to its full path.` : ''}`);
}

/** Python with the pipeline's packages: VOSK_PYTHON/FISH_PYTHON override, then the venv, then common installs. */
export const pipelinePython = (): string => {
  for (const envVar of ['VOSK_PYTHON', 'FISH_PYTHON']) if (process.env[envVar]) return findTool(['python3', 'python'], envVar);
  return findTool(['python3', 'python']);
};

/** Vosk model directory: VOSK_MODEL_PATH, the project models/ folder, or the home folder. */
export function voskModel(root = ROOT): string | null {
  const candidates = [
    process.env.VOSK_MODEL_PATH,
    join(root, 'models', 'vosk-model-small-en-us-0.15'),
    join(home, 'vosk-model-small-en-us-0.15'),
    join(home, 'workspace', 'vosk-model-small-en-us-0.15'),
  ].filter((item): item is string => !!item);
  return candidates.find(existsSync) ?? null;
}
