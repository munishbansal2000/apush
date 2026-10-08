/**
 * KitLayer — renders kit components (cards, maps, tracker, kinetic text…) in the 1920×1080
 * space they were designed for, scaled to the composition (1280×720 here). Without it their
 * fixed pixel sizes (fonts, labels, padding) are 1.5× too large for their boxes and overflow.
 *
 * Positions are fractions, so they land in the same place in either space; the runtime guard
 * measures real DOM rects relative to the root, so its fractions are unaffected by the scale.
 */
import React from 'react';
import { useVideoConfig } from 'remotion';
import { GUARD_WRAPPER } from '../lib/guard';
import renderConfig from '../data/render-config.json';

export const KIT_W: number = (renderConfig as { kitSpace?: { width: number } }).kitSpace?.width ?? 1920;
export const KIT_H: number = (renderConfig as { kitSpace?: { height: number } }).kitSpace?.height ?? 1080;

export const KitLayer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { width, height } = useVideoConfig();
  const s = Math.min(width / KIT_W, height / KIT_H);
  return (
    <div
      {...GUARD_WRAPPER}
      style={{ position: 'absolute', left: 0, top: 0, width: KIT_W, height: KIT_H, transform: `scale(${s})`, transformOrigin: 'top left', pointerEvents: 'none' }}
    >
      {children}
    </div>
  );
};
