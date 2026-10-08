import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Img, staticFile } from 'remotion';
import { useElementTracker, TrackedElement } from '../validation/tracker';
import { TimingProps } from '../validation/timing';

/** URLs, data URIs and already-resolved paths pass through; bare names go through staticFile. */
const resolveSrc = (src: string) =>
  /^(https?:|data:|blob:|\/)/.test(src) ? src : staticFile(src);

interface MapMarker {
  at: [number, number]; // [cx, cy] as fractions
  zoom?: number;
  label: string;
  sub?: string;
}

interface MapZoomSlideProps extends TimingProps {
  map_image: string;
  markers: MapMarker[];
  /** Frames to hold on intro (wide view) */
  intro_hold?: number;
  /** Frames to hold on each zoom */
  zoom_hold?: number;
  /** Frames for move between markers */
  move_dur?: number;
  accent?: string;
  bg?: string;
  debug?: boolean;
}

/**
 * MapZoomSlide — ported from slideforge.
 *
 * Python: MapZoomSlide(map_image, markers=[{at, zoom, label, sub}])
 * Remotion: Same interface. GPU-accelerated transforms.
 *
 * Quality delta: PIL zooms by cropping/scaling raster (gets soft).
 * Chromium does GPU-accelerated CSS transforms — stays sharp at high zoom.
 * Pins pulse frame-by-frame (driven by useCurrentFrame, deterministic in renders).
 */
export const MapZoomSlide: React.FC<MapZoomSlideProps> = ({
  map_image,
  markers,
  intro_hold = 36,
  zoom_hold = 66,
  move_dur = 30,
  accent = '#e24a4a',
  bg = '#1a1512',
  debug = false,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  // Calculate timeline: intro -> [move -> hold] per marker
  const timeline = useMemo(() => {
    const segments: { type: 'intro' | 'move' | 'hold'; start: number; end: number; markerIndex: number }[] = [];
    let t = 0;
    segments.push({ type: 'intro', start: t, end: t + intro_hold, markerIndex: -1 });
    t += intro_hold;

    markers.forEach((_, i) => {
      if (i > 0) {
        segments.push({ type: 'move', start: t, end: t + move_dur, markerIndex: i });
        t += move_dur;
      }
      segments.push({ type: 'hold', start: t, end: t + zoom_hold, markerIndex: i });
      t += zoom_hold;
    });

    return { segments, total: t };
  }, [markers, intro_hold, zoom_hold, move_dur]);

  // Find current segment
  const current = timeline.segments.find(s => frame >= s.start && frame < s.end)
    || timeline.segments[timeline.segments.length - 1];

  // Calculate camera transform
  let scale = 1;
  let camX = 0.5;
  let camY = 0.5;
  let activeMarker: MapMarker | null = null;

  if (current.type === 'intro') {
    scale = 1;
    camX = 0.5; camY = 0.5;
  } else if (current.type === 'move') {
    const prevMarker = markers[current.markerIndex - 1];
    const nextMarker = markers[current.markerIndex];
    const progress = interpolate(frame, [current.start, current.end], [0, 1]);
    // Smooth easing
    const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    const prevZoom = prevMarker.zoom || 2.5;
    const nextZoom = nextMarker.zoom || 2.5;
    scale = prevZoom + (nextZoom - prevZoom) * eased;
    camX = prevMarker.at[0] + (nextMarker.at[0] - prevMarker.at[0]) * eased;
    camY = prevMarker.at[1] + (nextMarker.at[1] - prevMarker.at[1]) * eased;
  } else {
    const marker = markers[current.markerIndex];
    scale = marker.zoom || 2.5;
    camX = marker.at[0];
    camY = marker.at[1];
    activeMarker = marker;
  }

  // Track active marker label
  const trackedElements = useMemo((): TrackedElement[] => {
    const els: TrackedElement[] = [];
    if (activeMarker) {
      els.push({
        id: 'marker-label', type: 'text', content: activeMarker.label,
        fontSize: height * 0.035, fontWeight: 'bold',
        x: width * 0.05, y: height * 0.85,
        width: width * 0.9, height: height * 0.1,
      });
    }
    return els;
  }, [activeMarker, width, height]);

  useElementTracker(trackedElements, {
    checkOverlaps: false,
    debug,
    componentName: 'MapZoomSlide',
  });

  // Frame-driven pulse for the active pin (2 s period, same shape as the old
  // CSS keyframes: scale 0.8 -> 1.2 -> 0.8, opacity 0.8 -> 0.3 -> 0.8).
  const activeElapsed = Math.max(0, frame - current.start);
  const pulsePhase = ((activeElapsed / fps) % 2) / 2;
  const pulseCos = Math.cos(pulsePhase * Math.PI * 2);
  const pulseScale = 1 - 0.2 * pulseCos;
  const pulseOpacity = 0.55 + 0.25 * pulseCos;
  // Active pin grows to 1.2x over ~0.3 s (replaces the CSS transition).
  const activePinScale = interpolate(activeElapsed, [0, Math.max(1, 0.3 * fps)], [1, 1.2], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // CSS transform for GPU-accelerated zoom
  const transform = `scale(${scale}) translate(${(0.5 - camX) * width / scale}px, ${(0.5 - camY) * height / scale}px)`;

  return (
    <div style={{ width, height, backgroundColor: bg, position: 'relative', overflow: 'hidden' }}>
      {/* Map with GPU transform */}
      <div style={{
        position: 'absolute', width, height,
        transform,
        transformOrigin: 'center center',
        willChange: 'transform', // Hint for GPU acceleration
      }}>
        <Img src={resolveSrc(map_image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

        {/* Marker pins */}
        {markers.map((marker, i) => {
          const mx = marker.at[0] * width;
          const my = marker.at[1] * height;
          const isActive = activeMarker === marker;
          const hasAppeared = timeline.segments.some(s =>
            s.markerIndex === i && frame >= s.start
          );

          if (!hasAppeared) return null;

          return (
            <div key={i} style={{
              position: 'absolute', left: mx - 15, top: my - 15,
              zIndex: 5,
            }}>
              {/* Pulsing ring */}
              <div style={{
                position: 'absolute', left: -10, top: -10,
                width: 50, height: 50, borderRadius: '50%',
                border: `3px solid ${accent}`,
                opacity: isActive ? pulseOpacity : 0.3,
                transform: isActive ? `scale(${pulseScale})` : 'none',
              }} />
              {/* Pin */}
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                backgroundColor: accent,
                border: '3px solid #fff',
                boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
                transform: `scale(${isActive ? activePinScale : 1})`,
              }} />
            </div>
          );
        })}
      </div>

      {/* Active marker label */}
      {activeMarker && (
        <div style={{
          position: 'absolute', bottom: height * 0.06, left: width * 0.05, right: width * 0.05,
          zIndex: 10,
          opacity: interpolate(frame, [current.start, current.start + 15], [0, 1], { extrapolateRight: 'clamp' }),
        }}>
          <div style={{
            fontSize: height * 0.038, fontWeight: 'bold', color: '#fff',
            fontFamily: 'Georgia, serif', textShadow: '2px 2px 8px rgba(0,0,0,0.9)',
          }}>
            {activeMarker.label}
          </div>
          {activeMarker.sub && (
            <div style={{
              fontSize: height * 0.028, color: '#ddd',
              fontFamily: 'Georgia, serif', textShadow: '1px 1px 4px rgba(0,0,0,0.9)',
              marginTop: 4,
            }}>
              {activeMarker.sub}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
