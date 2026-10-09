/**
 * Resumable episode pipeline: transcript -> TTS -> timing -> Vosk words -> storyboard -> treatments -> build (the direct
 * stage, docs/STORYBOARD.md) -> LTX clips -> contact sheet -> segmented render (docs/LOOK.md). --agent answers prompts
 * with your own agents, --draft allows unapproved library geography, --editor adds the editor pass to the build,
 * --legacy-director uses the previous all-in-one director instead of the storyboard flow.
 */
import {createContext} from './pipeline/context';
import {PendingAnswers} from './pipeline/director-io';
import {runPipeline} from './pipeline/run';

try {
  await runPipeline(createContext());
} catch (error) {
  if (!(error instanceof PendingAnswers)) throw error;
  console.log(`\n[direct] waiting for ${error.files.length} agent answer(s). Have an agent answer each prompt file with JSON only in the matching .answer.json:`);
  for (const file of error.files) console.log(`  ${file}`);
  console.log(`Then re-run ${error.rerun}.`);
}
