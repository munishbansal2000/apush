/** Resumable transcript -> TTS -> timing -> images -> direction -> QA -> render pipeline. */
import {createContext} from './pipeline/context';
import {runPipeline} from './pipeline/run';

await runPipeline(createContext());
