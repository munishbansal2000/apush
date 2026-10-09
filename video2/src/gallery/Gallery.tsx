/**
 * ComponentGallery — every component in src/components, one labeled slot each, at the repo's
 * native 1280×720. Doubles as a visual audit: each slot sits in its own guard <Track>, so the
 * runtime layout guard reports cut-off, off-safe and clipped elements per component.
 * Slots live in partA/B/C.tsx (props taken from real usage in the episodes where possible).
 */
import React, { useRef } from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { LayoutGuard, Track } from '../kit/guard';
import { AutoLayoutProvider } from '../validation/AutoLayout';
import { ToneProvider } from '../validation/ToneContext';
import renderConfig from '../data/kit-render-config.json';
import type { RenderConfig } from '../kit/layout';
import { PART_A } from './partA';
import { PART_B } from './partB';
import { PART_C } from './partC';
import type { GallerySlot } from './types';

export const GALLERY_SLOTS: GallerySlot[] = [...PART_A, ...PART_B, ...PART_C];

/** Start frame of each slot (cumulative). */
export const GALLERY_STARTS: number[] = GALLERY_SLOTS.reduce<number[]>((acc, s, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + GALLERY_SLOTS[i - 1].durationInFrames);
  return acc;
}, []);

export const GALLERY_FRAMES = GALLERY_SLOTS.reduce((n, s) => n + s.durationInFrames, 0);

// guard thresholds from the kit config, frame-independent (fractions)
const guardCfg = renderConfig as unknown as RenderConfig;

const Label: React.FC<{ index: number; slot: GallerySlot }> = ({ index, slot }) => (
  <div
    style={{
      position: 'absolute', left: 12, bottom: 10, padding: '3px 10px', borderRadius: 6,
      background: 'rgba(0,0,0,0.72)', color: '#f5e6c8', fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 14, zIndex: 500,
    }}
  >
    {index + 1}/{GALLERY_SLOTS.length} · <b>{slot.name}</b> <span style={{ opacity: 0.6 }}>({slot.file})</span>
    {slot.notes ? <span style={{ color: '#ffd166' }}> · note</span> : null}
  </div>
);

export const ComponentGallery: React.FC = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  return (
    <AbsoluteFill ref={rootRef} data-kit-root style={{ background: '#15120f' }}>
      {GALLERY_SLOTS.map((slot, i) => (
        <Sequence key={slot.name} from={GALLERY_STARTS[i]} durationInFrames={slot.durationInFrames} name={slot.name}>
          <ToneProvider tone="playful">
            <AutoLayoutProvider>
              <Track id={`gallery:${slot.name}`} role="stage" allowUnsafe={false}>
                <AbsoluteFill>{slot.render()}</AbsoluteFill>
              </Track>
            </AutoLayoutProvider>
          </ToneProvider>
          <Track id="gallery:label" role="chrome" allowOverlap>
            <Label index={i} slot={slot} />
          </Track>
        </Sequence>
      ))}
      <LayoutGuard cfg={guardCfg} rootRef={rootRef} />
    </AbsoluteFill>
  );
};
