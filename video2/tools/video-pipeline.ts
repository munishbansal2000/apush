/**
 * Resumable episode pipeline: transcript -> TTS -> timing -> Vosk words -> documentary director -> LTX clips ->
 * contact sheet -> segmented render (docs/LOOK.md, docs/PIPELINE.md). Add --agent to answer director prompts with
 * your own agents, --draft to allow unapproved library geography.
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
