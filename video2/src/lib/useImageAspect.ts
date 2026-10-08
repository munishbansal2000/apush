/**
 * Real width/height of an image, read before the frame renders (delayRender), so documents
 * and camera tours map image-fraction coordinates correctly. Replaces hard-coded aspects
 * (which squashed the Codex scan and pushed marks/callouts off target).
 */
import { useEffect, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';

const cache = new Map<string, number>();

export function useImageAspect(path: string | undefined, fallback = 4 / 3): number {
  const [aspect, setAspect] = useState<number>(() => (path && cache.get(path)) || fallback);
  const [handle] = useState(() => (path && !cache.has(path) ? delayRender(`image aspect: ${path}`) : null));
  useEffect(() => {
    if (!path || handle === null) return;
    const img = new Image();
    img.onload = () => {
      const a = img.naturalWidth / img.naturalHeight;
      cache.set(path, a);
      setAspect(a);
      continueRender(handle);
    };
    img.onerror = () => {
      // keep the fallback, but never hang the render
      console.warn(`[kit] could not load ${path} to read its aspect; using ${fallback.toFixed(2)}`);
      continueRender(handle);
    };
    img.src = staticFile(path);
  }, [path, handle, fallback]);
  return aspect;
}
