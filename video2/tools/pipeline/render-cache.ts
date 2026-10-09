/** Cache keys for rendered segments and contact-sheet stills. Anything that changes pixels must be in here. */
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {sha256, type DirectedPlan, type DirectedScene} from '../pipeline-core';
import {sceneAssetRefs} from './plan-refs';

export interface RenderEnv {sourceHash: string; fps: number; width: number; height: number}

/** Content hash of every public/ file a scene draws (images, stagger panels, clips). */
export function sceneAssetHashes(scene: DirectedScene, publicDir: string): [string, string][] {
  return sceneAssetRefs(scene).map(file => {
    const path = join(publicDir, file);
    return [file, existsSync(path) ? sha256(readFileSync(path)) : 'missing'];
  });
}

/**
 * Visual inputs of scene `index`: the scene, its neighbours (transitions blend across the cut), and
 * plan-level overlays (Episode Sheet boxes, episode title).
 */
function visualInputs(plan: DirectedPlan, index: number, publicDir: string) {
  const neighbour = (i: number) => {
    const scene = plan.scenes[i];
    return scene ? {scene, assets: sceneAssetHashes(scene, publicDir)} : null;
  };
  return {
    title: plan.title,
    boxes: plan.boxes ?? null,
    previous: neighbour(index - 1),
    current: neighbour(index),
    next: neighbour(index + 1),
  };
}

export function segmentFingerprint(plan: DirectedPlan, index: number, range: {from: number; to: number}, env: RenderEnv, publicDir: string): string {
  return sha256(JSON.stringify({kind: 'segment-v2', ...visualInputs(plan, index, publicDir), range, env}));
}

export function stillFingerprint(plan: DirectedPlan, index: number, sample: {label: string; frame: number}, env: RenderEnv, publicDir: string): string {
  return sha256(JSON.stringify({kind: 'still-v2', ...visualInputs(plan, index, publicDir), sample, env}));
}

/** Stills are stored by content key, so a cache hit can never point at another scene's image. */
export const stillFileName = (fingerprint: string) => `${fingerprint.slice(0, 32)}.png`;
