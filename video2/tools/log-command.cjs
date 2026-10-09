#!/usr/bin/env node
/** Cross-platform equivalent of tools/log.sh for npm scripts. */
const {execFileSync, spawn} = require('node:child_process');
const {copyFileSync, createWriteStream, mkdirSync} = require('node:fs');
const {join, resolve} = require('node:path');

const [, , name, command, ...commandArgs] = process.argv;
if (!name || !command) {
  console.error('usage: node tools/log-command.cjs <name> <command> [args...]');
  process.exit(2);
}

const root = resolve(__dirname, '..');
const logDir = join(root, 'out', 'logs');
mkdirSync(logDir, {recursive: true});
const now = new Date();
const stamp = now.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
const logPath = join(logDir, `${name}-${stamp}.log`);
const latestPath = join(logDir, `${name}-latest.log`);
const log = createWriteStream(logPath, {encoding: 'utf8'});
let git = 'n/a';
try {
  git = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
} catch {}
log.write(`# ${name}  ${now.toISOString()}\n# cmd: ${[command, ...commandArgs].join(' ')}\n# git: ${git}\n`);

// Every logged npm script currently invokes tsx. Calling its JS entry through
// the current Node process avoids .cmd lookup on Windows and prevents WSL from
// mixing Linux Node with Windows native dependencies such as esbuild.
let executable = command;
let args = commandArgs;
if (command === 'tsx') {
  executable = process.execPath;
  args = [join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs'), ...commandArgs];
}

const clock = () => new Date().toLocaleTimeString('en-US', {
  hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
});
const emit = (line, target) => {
  const formatted = `${clock()} ${line}\n`;
  target.write(formatted);
  log.write(formatted);
};
const pipeLines = (stream, target) => {
  let pending = '';
  stream.setEncoding('utf8');
  stream.on('data', chunk => {
    pending += chunk;
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? '';
    for (const line of lines) emit(line, target);
  });
  stream.on('end', () => { if (pending) emit(pending, target); });
};

const child = spawn(executable, args, {cwd: root, env: process.env, windowsHide: true});
pipeLines(child.stdout, process.stdout);
pipeLines(child.stderr, process.stderr);
const forward = signal => { if (!child.killed) child.kill(signal); };
process.on('SIGINT', () => forward('SIGINT'));
process.on('SIGTERM', () => forward('SIGTERM'));
child.on('error', error => emit(`failed to start: ${error.message}`, process.stderr));
child.on('close', code => {
  const status = Number.isInteger(code) ? code : 1;
  log.end(`# exit ${status}\n`, () => {
    copyFileSync(logPath, latestPath);
    console.log(`log -> ${logPath}`);
    process.exitCode = status;
  });
});
