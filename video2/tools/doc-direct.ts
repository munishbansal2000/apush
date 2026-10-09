/**
 * Documentary director on its own: lesson script -> data/<ep>/shots.json (the pipeline's `direct` stage).
 *
 *   npx tsx tools/doc-direct.ts --episode u3e1 [--draft] [--force]          Meta UI (cached prompts)
 *   npx tsx tools/doc-direct.ts --episode u3e1 --agent [--draft]            prompt files for your agents; re-run to continue
 *
 * Agent mode writes out/pipeline/<ep>/agent/<name>.<hash>.prompt.md; answer each with JSON only in the matching
 * .answer.json and re-run. Without Vosk words, phrase times are estimated (fine for samples).
 */
import {createContext} from './pipeline/context';
import {PendingAnswers} from './pipeline/director-io';
import {docDirectStage} from './pipeline/stages/doc';

const ctx = createContext();
try {
  docDirectStage(ctx, {allowEstimated: true});
} catch (error) {
  if (!(error instanceof PendingAnswers)) throw error;
  console.log(`\n[direct] waiting for ${error.files.length} answer(s). Have an agent answer each prompt file with JSON only in the matching .answer.json:`);
  for (const file of error.files) console.log(`  ${file}`);
  console.log(`Then re-run: npx tsx tools/doc-direct.ts --episode ${ctx.episode} --agent${ctx.draft ? ' --draft' : ''}`);
}
