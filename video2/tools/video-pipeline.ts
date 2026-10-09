/**
 * The documentary pipeline, one path, resumable (checkpoints per stage):
 *   script -> pronunciations -> voices -> timing -> word alignment -> images -> storyboard -> build -> LTX clips ->
 *   contact sheet -> render            (docs/STORYBOARD.md, docs/LOOK.md)
 *
 *   npx tsx tools/video-pipeline.ts --episode u3e1 [--full] [--only <stage> | --from <stage> | --skip a,b]
 *   --mode prod      final voices (Fish); default dev (edge-tts)        --tts edge | say | fish (say = macOS, previews)
 *   --estimate-words no Vosk: phrase times estimated (previews)        --images placeholder (copies of local images; previews)
 *   --agent          storyboard prompts as files for your own agents    --editor   one editor pass after the build
 *   --director-workers 2   generate/audit independent storyboard acts in parallel (default 1, max 8)
 *   --draft          unapproved library geography allowed               --video-gen none   no LTX clips
 */
import {createContext} from './pipeline/context';
import {PendingAnswers} from './pipeline/director-io';
import {runPipeline} from './pipeline/run';

try {
  await runPipeline(createContext());
} catch (error) {
  if (!(error instanceof PendingAnswers)) throw error;
  console.log(`\n[agent] waiting for ${error.files.length} agent answer(s). Have an agent answer each prompt file with JSON only in the matching .answer.json:`);
  for (const file of error.files) console.log(`  ${file}`);
  console.log(`Then re-run ${error.rerun}.`);
}
