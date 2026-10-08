import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT} from '../../lib';
import {atomicJson, normalizePlan, readJson, sha256, syncIssues, validateCanvas, type DirectedPlan, type PipelineTurn} from '../../pipeline-core';
import type {PipelineContext, Timing} from '../context';
import {planImageRefs} from '../plan-refs';
import {cleanSpeech} from '../speech';
import {readCheckedWords} from './words';

export const planPathFor = (ctx: PipelineContext) => join(ctx.dataDir, 'scene_plan.json');
export const imageManifestPathFor = (ctx: PipelineContext) => join(ctx.dataDir, 'images.json');

/** Meta UI director + same-chat review → validated data/<episode>/scene_plan.json. */
export function directStage(ctx: PipelineContext, turns: PipelineTurn[], timing: Timing): void {
  const {episode, videoGen, dryRun, work, dataDir, stages, current, mark, meta} = ctx;
  const planPath = join(dataDir, 'scene_plan.json');
  const imageManifestPath = join(dataDir, 'images.json');
  type DirectorImage = {description?: string; used_in?: string[]};
  const imageManifest = existsSync(imageManifestPath) ? readJson<Record<string, DirectorImage>>(imageManifestPath) : {};
  // Direction uses turn durations, not Vosk's word dump: the scene schema can
  // only bind to whole turns. Only registered files that actually exist may be
  // selected; download URLs and license metadata do not help scene selection.
  const readyImages = Object.fromEntries(Object.entries(imageManifest).filter(([path]) => existsSync(join(ctx.publicDir, path))));
  const directorRegistryPath = join(ROOT, 'src', 'data', 'director-components.json');
  const directorRubricPath = join(ROOT, 'director-prompt-v13-remotion.txt');
  const directorContractPath = join(ROOT, 'src', 'data', 'director-output-contract.json');
  const directHash = sha256(JSON.stringify({
    contract: 'turn-range-object-v1+same-chat-review-v1',
    turns,
    timing: {starts: timing.starts, durations: timing.durations, totalSec: timing.totalSec, fps: timing.fps},
    videoGen,
    images: readyImages,
    registry: readFileSync(directorRegistryPath, 'utf8'),
    rubric: readFileSync(directorRubricPath, 'utf8'),
    outputSchema: readFileSync(directorContractPath, 'utf8'),
  }));
  if (stages.includes('direct')) {
    // Hard gate: direction never runs on missing or invalid Vosk word timing (even with --from direct).
    if (!dryRun) readCheckedWords(ctx, turns, timing);
    const imageKeys = Object.keys(readyImages);
    type TransportScene = Omit<DirectedPlan['scenes'][number], 'turnIds'> & {turnIds?: string[]; turnRange?: unknown};
    type TransportPlan = Omit<DirectedPlan, 'scenes'> & {scenes: TransportScene[]};
    const validateTransportContract = (raw: TransportPlan): void => {
      const topKeys = new Set(['version', 'episode', 'title', 'roadmap', 'scenes']);
      const extraTop = Object.keys(raw as object).filter(key => !topKeys.has(key));
      if (extraTop.length) throw new Error(`director output has unsupported top-level fields: ${extraTop.join(', ')}`);
      if (raw.version !== 1 || typeof raw.episode !== 'string' || !raw.episode || typeof raw.title !== 'string' || !raw.title || !Array.isArray(raw.scenes) || !raw.scenes.length) {
        throw new Error('director output must contain version=1, non-empty episode/title, and non-empty scenes');
      }
      const sceneKeys = new Set(['id', 'component', 'turnRange', 'props', 'transition', 'roadmapIndex']);
      for (const [index, scene] of raw.scenes.entries()) {
        if (!scene || typeof scene !== 'object') throw new Error(`scene ${index}: must be an object`);
        const extra = Object.keys(scene).filter(key => !sceneKeys.has(key));
        if (extra.length) throw new Error(`scene ${index}: unsupported fields: ${extra.join(', ')}`);
        if (typeof scene.id !== 'string' || !scene.id.trim()) throw new Error(`scene ${index}: id is required`);
        if (!scene.props || typeof scene.props !== 'object' || Array.isArray(scene.props)) throw new Error(`${scene.id}: props must be an object`);
        if (!['cut', 'crossfade', 'dip'].includes(String(scene.transition))) throw new Error(`${scene.id}: transition must be cut, crossfade, or dip`);
        const range = scene.turnRange as Record<string, unknown> | undefined;
        if (!range || typeof range !== 'object' || Array.isArray(range) || Object.keys(range).sort().join(',') !== 'from,to') {
          throw new Error(`${scene.id}: turnRange must be exactly {"from":integer,"to":integer}`);
        }
      }
    };
    const materializeTurnIds = (raw: TransportPlan): DirectedPlan => {
      for (const scene of raw.scenes ?? []) {
        if (!Array.isArray(scene.turnIds)) {
          const range = scene.turnRange as Record<string, unknown> | undefined;
          if (!range || typeof range !== 'object' || Array.isArray(range)) throw new Error(`${scene.id}: requires turnRange {"from":firstIndex,"to":lastIndex}`);
          const first = range.from;
          const last = range.to;
          if (!Number.isInteger(first) || !Number.isInteger(last) || Number(first) < 0 || Number(last) < Number(first) || Number(last) >= turns.length) {
            throw new Error(`${scene.id}: invalid turnRange ${JSON.stringify(scene.turnRange)} for ${turns.length} turns`);
          }
          scene.turnIds = turns.slice(Number(first), Number(last) + 1).map(turn => turn.id);
        }
        delete scene.turnRange;
      }
      return raw as DirectedPlan;
    };
    const validateCandidate = (path: string, requireStoredTiming = false): {plan?: DirectedPlan; issues: string[]} => {
      const issues: string[] = [];
      try {
        const transport = readJson<TransportPlan>(path);
        if (!requireStoredTiming) validateTransportContract(transport);
        const raw = materializeTurnIds(transport);
        const allowedImages = new Set(imageKeys);
        for (const ref of planImageRefs(raw)) if (!allowedImages.has(ref.path)) {
          issues.push(`${ref.sceneId}: image "${ref.path}" is not a downloaded AVAILABLE IMAGES asset`);
        }
        const turnById = new Map(turns.map(turn => [turn.id, cleanSpeech(turn.text ?? '')]));
        const comparable = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
        for (const scene of raw.scenes ?? []) if (scene.component === 'quote') {
          const spoken = comparable((scene.turnIds ?? []).map(id => turnById.get(id) ?? '').join(' '));
          if (!spoken.includes(comparable(scene.props?.quote))) issues.push(`${scene.id}: quote is not verbatim narration from its assigned turns`);
        }
        const plan = normalizePlan(raw, turns, timing.starts, timing.durations, timing.totalSec, {
          imageKeys,
          episode,
          allowCreativeClip: videoGen === 'ltx',
        });
        issues.push(
          ...syncIssues(plan, turns, timing.starts, timing.durations, timing.totalSec, timing.fps),
          ...validateCanvas(plan),
        );
        if (requireStoredTiming) issues.push(...syncIssues(raw, turns, timing.starts, timing.durations, timing.totalSec, timing.fps));
        return issues.length ? {issues: [...new Set(issues)]} : {plan, issues: []};
      } catch (error) {
        issues.push(error instanceof Error ? error.message : String(error));
        return {issues: [...new Set(issues)]};
      }
    };
    const checkpoint = existsSync(planPath) ? validateCandidate(planPath, true) : {issues: ['scene plan is missing']};
    if (current('direct', directHash) && checkpoint.plan) {
      atomicJson(join(work, 'director-validation.json'), {episode, accepted: true, source: planPath, attempts: [{source: 'checkpoint', issues: []}]});
      console.log(`[direct] checkpoint current (${checkpoint.plan.scenes.length} validated scenes)`);
    } else {
      if (current('direct', directHash) && checkpoint.issues.length) {
        console.warn(`[direct] checkpoint rejected:\n${checkpoint.issues.map(issue => `  - ${issue}`).join('\n')}`);
      }
      const creative = videoGen === 'ltx' ? ', creative_clip' : '';
      const creativeContract = videoGen === 'ltx' ? ' creative_clip {image,prompt,title,caption,seed}; REQUIRED: include at least 2 creative_clip scenes for high-value cinematic moments (battles, dramatic reveals, atmospheric shots). Its prompt must animate only the supplied still with subtle environmental/object motion, preserve the historical composition, add no people/text/objects. NEVER use the words camera, zoom, pan, tilt, dolly, tracking, crane, or any camera-movement term — the factory does its own camera work and rejects such prompts.' : '';
      // Send every renderer-supported tool, but only its selection guidance,
      // prop schema, and hard constraints. Lesson-specific examples add tokens
      // and tend to anchor the model to filenames from another episode.
      const compReg = readJson<{components: {name: string; when: string; examples: string[]; constraints: string[]; props_detail: Record<string, {type: string; required: boolean; example: string}>}[]; image_rules?: {rules: string[]}}>(directorRegistryPath);
      const compList = compReg.components.map(c => {
        const props = Object.entries(c.props_detail).map(([key, value]) => `${key}${value.required ? '*' : '?'}:${value.type}`).join(', ');
        return `${c.name} | use: ${c.when} | props: ${props} | hard: ${c.constraints.join(' ')}`;
      }).join('\n');
      const imageRules = (compReg.image_rules?.rules ?? []).join(' ');
      const imgList = Object.entries(readyImages).map(([path, info]) => {
        const relevantTurns = (info.used_in ?? []).map(value => value.replace(/^.*:/, '')).filter(Boolean).join(',');
        const description = String(info.description ?? '').replace(/\s+/g, ' ').trim().slice(0, 220);
        return `${path} | turns=${relevantTurns || '-'} | ${description}`;
      }).join('\n') || '(none; use non-image components only)';
      const rubric = readFileSync(directorRubricPath, 'utf8').trim();
      const outputSchema = readFileSync(directorContractPath, 'utf8').trim();
      const prompt = `${rubric}\n\nCOMPACT OUTPUT SHAPE\nReturn JSON shaped like this example:\n{"version":1,"episode":"${episode}","title":"Lesson title","scenes":[{"id":"s00","component":"title","turnRange":{"from":0,"to":1},"props":{"title":"Act title"},"transition":"cut"}]}\nturnRange is inclusive and refers to numeric indices in TURNS. Always use the object form {"from":number,"to":number}; numeric bracket arrays are forbidden because Meta renders them as citations. Never output any bare-number array: use labeled {label,value} rows for chart data and omit ken_burns stops. Every scene uses exactly id, component, turnRange, props, and transition. Never emit turnIds, startSec, or endSec. Use ONLY the component palette below${creative}.${creativeContract}\n\nCOMPLETE COMPONENT PALETTE\n${compList}${videoGen === 'ltx' ? '\ncreative_clip | use: selected still-image animation | props: image*:registry path, prompt*:string >=20 chars, title?:string, caption?:string, seed?:number | hard: obey the creative constraints in OUTPUT CONTRACT.' : ''}\n\nIMAGE RULE\n${imageRules}\n\nTURNS (index:id | measured duration | speaker | locked narration)\n${turns.map((turn, index) => `${index}:${turn.id} | ${timing.durations[index].toFixed(2)}s | ${turn.speaker ?? 'PAUSE'} | ${turn.text ?? `[pause ${turn.pauseSec}s]`}`).join('\n')}\n\nAVAILABLE IMAGES (exact path | relevant turns | short description)\n${imgList}`;
      const reviewPrompt = `Switch roles now. Act as an independent, skeptical senior editor reviewing the scene plan you just produced. The draft may contain malformed JSON or fields stripped by citation rendering; repair it rather than repeating the defect. Do not defend or merely summarize the draft. Re-read the original locked narration, measured turn durations, component contracts, image catalog, and output rules already present in this chat.\n\nAudit the draft across every dimension below:\n1. COMPLETENESS: inclusive turnRange {from,to} objects cover every turn index exactly once, in order, with no gaps or overlaps; every required prop exists.\n2. CORRECTNESS AND GROUNDING: visible facts, numbers, quotations, labels, document text, and captions are supported by the assigned narration; quotes are verbatim; nothing is invented.\n3. COHERENCE: scenes form a clear thesis-driven lesson with sensible acts and conceptual transitions; adjacent turns that form one thought are not needlessly fragmented.\n4. TTS SYNCHRONIZATION AND PACING: scenes target 8-15s; NO scene exceeds 25s on a static component. If you find a 40s+ scene covering 3 turns, SPLIT IT into 2-3 scenes. Grouping fits the measured turn durations, short scenes remain readable, and transitions occur at semantic turn boundaries. Never add seconds.\n5. VISUAL DIRECTION: each component is the best tool for its idea, the full palette is considered, repetition is controlled, text density fits 1280x720, and title cards are reserved for true act boundaries.\n6. IMAGE AND VIDEO SAFETY: every image path is copied exactly from AVAILABLE IMAGES and is relevant to its assigned turns; creative_clip obeys every prompt restriction.\n7. RENDERABILITY: schema, component names, nested props, transitions, and primary-source highlights satisfy the supplied contracts.\n\nYour response MUST validate against this JSON Schema:\n${outputSchema}\n\nSilently fix every issue you find and reformat the result. Return ONLY the complete corrected scene-plan JSON object. Every scene must use turnRange:{"from":firstIndex,"to":lastIndex}; never use a numeric range array or turnIds. Never output bare-number arrays: chart data uses labeled objects and ken_burns stops is omitted. Return the full plan even if no changes are needed. Do not return an audit report, markdown, commentary, or an envelope around the plan.`;
      let candidatePath = meta('director', prompt, [], reviewPrompt);
      if (!dryRun) {
        const attempts: {source: string; issues: string[]}[] = [];
        const maxRepairs = Math.max(0, Number(process.env.DIRECTOR_REPAIR_ATTEMPTS ?? 2));
        let plan: DirectedPlan | undefined;
        for (let attempt = 0; attempt <= maxRepairs; attempt++) {
          const checked = validateCandidate(candidatePath);
          attempts.push({source: candidatePath, issues: checked.issues});
          if (checked.plan) { plan = checked.plan; break; }
          console.warn(`[direct] candidate ${attempt + 1} rejected:\n${checked.issues.map(issue => `  - ${issue}`).join('\n')}`);
          if (attempt === maxRepairs) break;
          const invalid = readFileSync(candidatePath, 'utf8');
          const repairPrompt = `Repair the scene-plan JSON below. Return the complete corrected JSON object only. Preserve good creative choices, but satisfy every validation error and the full contract. Do not explain changes.\n\nVALIDATION ERRORS\n${checked.issues.map(issue => `- ${issue}`).join('\n')}\n\nFULL CONTRACT AND SOURCE DATA\n${prompt}\n\nINVALID CANDIDATE\n${invalid}`;
          candidatePath = meta(`director-repair-${attempt + 1}`, repairPrompt);
        }
        atomicJson(join(work, 'director-validation.json'), {episode, accepted: !!plan, attempts});
        if (!plan) throw new Error(`director failed validation after ${attempts.length} candidate(s); see ${join(work, 'director-validation.json')}`);
        for (const scene of plan.scenes) if (scene.component === 'creative_clip') {
          scene.props.clip = `clips/${episode}/${scene.id}.mp4`;
        }
        atomicJson(planPath, plan); mark('direct', directHash);
        console.log(`[direct] ${plan.scenes.length} scenes -> ${planPath}`);
      }
    }
  }
}
