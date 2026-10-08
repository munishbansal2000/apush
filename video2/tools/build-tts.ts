/**
 * turns.json → tts/<ep>/tNN.txt (exact text for Fish Audio) + index.json with hashes.
 * Generate audio from these files, never from the script directly.
 *   --emotion   emit {emotion} tags as Fish (emotion) markers
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { hash } from '../src/kit/text';
import { toTtsText } from '../src/kit/tts';
import { flag, loadEpisode, ROOT } from './lib';

const ep = loadEpisode();
const turns = ep.turns().turns;
const dir = join(ROOT, 'tts', ep.spec.id);
mkdirSync(dir, { recursive: true });
const index: Record<string, { speaker: string; hash: string; text: string }> = {};
for (const t of turns) {
  if (t.kind !== 'speech') continue;
  const text = toTtsText(t, ep.pron, { emotion: flag('emotion') });
  writeFileSync(join(dir, `${t.id}.txt`), text + '\n');
  index[t.id] = { speaker: t.speaker, hash: hash(toTtsText(t, ep.pron, { emotion: false })), text };
}
writeFileSync(join(dir, 'index.json'), JSON.stringify(index, null, 2) + '\n');
console.log(`tts/${ep.spec.id}: ${Object.keys(index).length} lines`);
