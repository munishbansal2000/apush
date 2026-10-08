import {existsSync, readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {ROOT, arg} from '../../lib';
import {atomicJson, normalizeTurns, parseTranscript, readJson, resolveAudioScript, sha256, type PipelineTurn} from '../../pipeline-core';
import type {PipelineContext} from '../context';

function findExisting(episode: string, name: string): string | null {
  const compact = episode.replace(/-/g, '');
  const short = /^u\d+e(\d+)$/.exec(compact)?.[1];
  const candidates = [join(ROOT, 'data', episode, name), join(ROOT, 'src/data', episode, name)];
  if (short) candidates.push(join(ROOT, 'data', `e${short}`, name), join(ROOT, 'src/data', `e${short}`, name));
  return candidates.find(existsSync) ?? null;
}

/** Parse the transcript (or an existing turns.json) into data/<episode>/turns.json; returns the turns. */
export function turnsStage(ctx: PipelineContext): PipelineTurn[] {
  const turnsPath = join(ctx.dataDir, 'turns.json');
  let turns: PipelineTurn[] = [];
  if (ctx.stages.includes('turns')) {
    const audioScriptsRoot = process.env.AUDIO_SCRIPTS_DIR ?? resolve(ROOT, '..', 'audio_scripts');
    const transcript = arg('transcript') ?? resolveAudioScript(audioScriptsRoot, ctx.episode) ?? undefined;
    const source = transcript ? readFileSync(resolve(transcript), 'utf8') : null;
    const existing = findExisting(ctx.episode, 'turns.json');
    const inputHash = sha256(source ?? (existing ? readFileSync(existing) : ''));
    if (ctx.current('turns', inputHash) && existsSync(turnsPath)) console.log('[turns] checkpoint current');
    else {
      turns = source ? parseTranscript(source) : existing ? normalizeTurns(readJson(existing)) : (() => { throw new Error('no transcript or existing turns.json found'); })();
      if (ctx.dryRun) console.log(`[turns] dry-run: parsed ${turns.length} turns`);
      else {
        atomicJson(turnsPath, {source: transcript ? resolve(transcript) : existing, turns});
        ctx.mark('turns', inputHash);
        console.log(`[turns] ${turns.length} turns from ${transcript ?? existing} -> ${turnsPath}`);
      }
    }
  }
  if (!turns.length) {
    if (!existsSync(turnsPath)) throw new Error(`missing ${turnsPath}; run the turns stage or pass --transcript`);
    turns = normalizeTurns(readJson(turnsPath));
  }
  return turns;
}
