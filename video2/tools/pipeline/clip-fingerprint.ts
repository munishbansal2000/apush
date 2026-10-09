/** Content key for an LTX hero clip: the same still, prompt, seed, size and generator always map to the same file. */
import {sha256} from '../pipeline-core';

export const CLIP_SIZE = {width: 1248, height: 704};

export function clipFingerprint(input: {imageSha: string; prompt: string; seed: number; focus: [number, number]; generatorSha: string}): string {
  return sha256(JSON.stringify({v: 1, ...input, size: CLIP_SIZE})).slice(0, 24);
}

/** Ambient-motion prompts only: the renderer does its own camera work, and nothing may be invented. */
export function clipPromptIssues(prompt: string): string[] {
  const issues: string[] = [];
  if (prompt.trim().length < 20) issues.push('prompt is too short (20+ characters)');
  if (/\b(camera|zoom|pan|tilt|dolly|tracking|crane|aerial|flyover)\b/i.test(prompt)) issues.push('prompt contains a camera-move word; LTX clips are static-camera');
  if (/\b(appear|appears|appearing|arrive|arrives|walks? in|enters?|new (?:person|people|figure))\b/i.test(prompt)) issues.push('prompt adds people or objects; animate only what is already in the still');
  return issues;
}
