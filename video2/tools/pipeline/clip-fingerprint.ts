/** Content key for an LTX hero clip: the same still, prompt, seed, size and generator always map to the same file. */
import {sha256} from '../pipeline-core';

export const CLIP_SIZE = {width: 1248, height: 704};

/** Which LTX runs the clips: the LTX Desktop app over its local API (default), or diffusers in-process. */
export type LtxBackend = 'desktop' | 'diffusers';
export const ltxBackend = (): LtxBackend => (process.env.LTX_BACKEND === 'diffusers' ? 'diffusers' : 'desktop');

/** Settings sent to LTX Desktop; part of every desktop clip's fingerprint. */
export const DESKTOP_SETTINGS = {model: 'fast', resolution: '1080p', duration: 5, fps: 24, cameraMotion: 'none'} as const;

/**
 * Avoid-prompt for animating historical paintings: protect the figures that are already there (the Desktop script's
 * default, written for ship scenes, lists "people, faces", which would erase or warp the soldiers in a battle scene).
 */
export const PAINTING_NEGATIVE = 'text, watermark, letters, numbers, warping faces, distorted faces, extra limbs, morphing, new people appearing, modern objects, camera movement';

/** 16:9 (or any aspect) crop of a still around a focus point, in source pixels; never stretches. */
export function aspectCrop(size: {width: number; height: number}, aspect: number, focus: [number, number]): {x: number; y: number; w: number; h: number} {
  if (size.width / size.height > aspect) {
    const w = Math.round(size.height * aspect);
    const x = Math.round(Math.min(Math.max(focus[0] * size.width - w / 2, 0), size.width - w));
    return {x, y: 0, w, h: size.height};
  }
  const h = Math.round(size.width / aspect);
  const y = Math.round(Math.min(Math.max(focus[1] * size.height - h / 2, 0), size.height - h));
  return {x: 0, y, w: size.width, h};
}

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
