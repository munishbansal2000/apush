/**
 * Documentary director: lesson script -> data/<ep>/shots.json (docs/LOOK.md format), then render with doc-render.
 *
 *   npx tsx tools/doc-direct.ts --episode u3e1 [--draft]            Meta UI (tools/meta-ui-runner.cjs), cached prompts
 *   npx tsx tools/doc-direct.ts --episode u3e1 --agent [--draft]    write prompts for your own agents; re-run to continue
 *
 * Agent mode: pending prompts are written to out/pipeline/<ep>/agent/<name>.<hash>.prompt.md. An agent answers each by
 * writing JSON only to the matching <name>.<hash>.answer.json. Re-run the same command: answers are validated, the next
 * stage's prompts are written (all acts at once, so agents can work in parallel), and only failing acts get repair
 * prompts. The hash ties each answer to its exact prompt, so an edited script can never reuse a stale answer.
 */
import {existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {join, relative} from 'node:path';
import {ROOT, arg, flag} from './lib';
import {atomicJson, readJson, sha256} from './pipeline-core';
import {createContext} from './pipeline/context';
import {loadDocInputs} from './pipeline/doc-inputs';
import {buildCatalog, directDocumentary, type DirectorIO, type Outline} from './pipeline/doc-director';

const episode = arg('episode') ?? (() => { throw new Error('--episode is required'); })();
const agent = flag('agent');
const draft = flag('draft');
const inputs = loadDocInputs(episode, null, draft);
const work = join(ROOT, 'out', 'pipeline', episode);
mkdirSync(work, {recursive: true});

// Catalog: approved library assets + this lesson's downloaded images (descriptions from data/<ep>/images.json).
const registryPath = join(ROOT, 'data', episode, 'images.json');
const registry = existsSync(registryPath) ? readJson<Record<string, {description?: string}>>(registryPath) : {};
const lessonImages = Object.fromEntries(Object.entries(inputs.options.imageSizes).filter(([path]) => path in registry));
const libraryIndexPath = join(ROOT, 'src', 'data', 'library-index.json');
const library = existsSync(libraryIndexPath)
  ? readJson<{entries: {kind: string; path: string; description: string; width?: number; height?: number; focus: string[]; retrospective?: boolean; date?: string}[]}>(libraryIndexPath).entries.filter(e => e.kind !== 'geo')
  : [];
const catalog = buildCatalog(lessonImages, Object.fromEntries(Object.entries(registry).map(([k, v]) => [k, v.description ?? ''])), library);
const maps = {
  geo: Object.values(inputs.options.geo ?? {}).filter(g => draft || g.properties.review.status === 'approved')
    .map(g => ({id: g.properties.id, name: (g.properties as unknown as {name?: string}).name ?? g.properties.id, type: g.geometry.type, precision: g.properties.precision})),
  places: Object.entries(inputs.options.places ?? {}).map(([id, p]) => ({id, name: p.name})),
};
const outlinePath = join(work, 'doc-outline.accepted.json');
const previousOutline = existsSync(outlinePath) ? readJson<Outline>(outlinePath) : undefined;

let io: DirectorIO;
const agentDir = join(work, 'agent');
if (agent) {
  mkdirSync(agentDir, {recursive: true});
  io = {
    meta: (name, prompt, _attachments, followupPrompt) => {
      // One file per exact prompt; the review step is folded in as a final self-check for single-pass agents.
      const text = followupPrompt ? `${prompt}\n\n---\nBEFORE YOU ANSWER: ${followupPrompt}` : prompt;
      const stem = join(agentDir, `${name}.${sha256(text).slice(0, 10)}`);
      if (!existsSync(`${stem}.prompt.md`)) writeFileSync(`${stem}.prompt.md`, `${text}\n`);
      const answer = `${stem}.answer.json`;
      if (!existsSync(answer)) return null;
      try {
        JSON.parse(readFileSync(answer, 'utf8'));
      } catch (error) {
        throw new Error(`${relative(ROOT, answer)} is not valid JSON (${error instanceof Error ? error.message : String(error)}); fix or delete it`);
      }
      return answer;
    },
  };
} else {
  const ctx = createContext();
  io = {meta: (name, prompt, attachments, followupPrompt) => ctx.meta(name, prompt, attachments, followupPrompt)};
}

console.log(`[direct] ${episode}: ${inputs.turns.length} turns, ${catalog.length} usable images, ${maps.geo.length} geo features${inputs.estimated ? ' (phrase times ESTIMATED: no Vosk words)' : ''}`);
const result = directDocumentary(io, {episode, turns: inputs.turns, timing: inputs.timing, words: inputs.words, options: inputs.options, catalog, maps, previousOutline});
atomicJson(join(work, 'doc-director.json'), {episode, at: new Date().toISOString(), pending: result.pending ?? [], log: result.log});
for (const entry of result.log) if (entry.issues.length) console.log(`  [${entry.stage}] ${entry.issues.length} problem(s):\n${entry.issues.slice(0, 8).map(i => `    - ${i}`).join('\n')}`);

if (result.pending?.length) {
  console.log(`\n[direct] waiting for ${result.pending.length} answer(s). For each prompt file below, have an agent write JSON only to the matching .answer.json:`);
  for (const name of result.pending) {
    const prompt = readdirPrompt(name);
    console.log(`  ${prompt ? relative(ROOT, prompt) : name}`);
  }
  console.log(`Then re-run: npx tsx tools/doc-direct.ts --episode ${episode} --agent${draft ? ' --draft' : ''}`);
  process.exit(0);
}
if (result.outline) atomicJson(outlinePath, result.outline);
if (!result.plan) {
  console.error(`[direct] no valid plan after repairs; see ${relative(ROOT, join(work, 'doc-director.json'))}`);
  process.exit(1);
}
const out = join(ROOT, 'data', episode, 'shots.json');
atomicJson(out, {_doc: `Generated by tools/doc-direct.ts ${new Date().toISOString()}; render with tools/doc-render.ts --plan ${relative(ROOT, out)}`, ...result.plan});
console.log(`[direct] ${result.plan.shots.length} shots -> ${relative(ROOT, out)}`);

/** Newest prompt file for a pending prompt name (agent mode). */
function readdirPrompt(name: string): string | null {
  if (!existsSync(agentDir)) return null;
  const files = readdirSync(agentDir).filter(f => f.startsWith(`${name}.`) && f.endsWith('.prompt.md'));
  if (!files.length) return null;
  return join(agentDir, files.map(f => ({f, t: statSync(join(agentDir, f)).mtimeMs})).sort((a, b) => b.t - a.t)[0].f);
}
