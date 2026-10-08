import type {DirectedPlan} from '../pipeline-core';

/** Every public/ image path a plan references, with its scene. */
export const planImageRefs = (plan: DirectedPlan): {sceneId: string; path: string}[] => plan.scenes.flatMap(scene => {
  const refs: string[] = [];
  if ((scene.component === 'ken_burns' || scene.component === 'creative_clip') && typeof scene.props?.image === 'string') refs.push(scene.props.image);
  if (scene.component === 'stagger' && Array.isArray(scene.props?.panels)) {
    for (const panel of scene.props.panels as Record<string, unknown>[]) if (typeof panel?.image === 'string') refs.push(panel.image);
  }
  return refs.map(path => ({sceneId: scene.id, path}));
});
