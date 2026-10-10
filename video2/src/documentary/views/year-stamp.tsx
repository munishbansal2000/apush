/** Year stamps: slam in large, settle to a corner chip, give way to the next year. */
import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLOR, FONT} from '../../theme/tokens';
import {type ChromeZone} from '../chrome-zones';
import {clamp} from './common';

/* ---------------------------------- year stamp ---------------------------------- */

/** A year that slams in large, holds, and settles to a small top-left chip. Local frame 0 = the spoken cue. */
/** How long a year stamp stays up; one gives way early (fading out) when the next year is spoken sooner. */
export const YEAR_STAMP_SEC = 5;
// Never past the next stamp's start (a floor here once kept two on screen when two years were said 0.17s apart).
export const yearStampSpans = (years: {sec: number}[]) => years.map((y, i) => Math.max(1 / 30, Math.min(YEAR_STAMP_SEC, (years[i + 1]?.sec ?? Infinity) - y.sec - 1 / 30)));

function yearStampState(frame: number, fps: number, width: number, height: number, holdSec = YEAR_STAMP_SEC, text = '1763') {
  const slam = spring({frame, fps, config: {damping: 12, stiffness: 160}, durationInFrames: 12});
  const settle = spring({frame: frame - Math.round(1.6 * fps), fps, config: {damping: 200}, durationInFrames: 18});
  const end = Math.round(holdSec * fps);
  const fade = interpolate(frame, [end - Math.min(Math.round(0.5 * fps), Math.round(end / 2)), end], [1, 0], clamp);
  // Sized for a four-digit year; longer text ("1760–1761") scales down to the same width.
  const size = interpolate(settle, [0, 1], [260, 72]) * Math.min(1, 4 / Math.max(4, text.length));
  const x = interpolate(settle, [0, 1], [width / 2, 120]);
  const y = interpolate(settle, [0, 1], [height / 2, 110]);
  return {slam, settle, fade, size, x, y};
}

/** How visible the stamp itself is at local frame `frame`. */
export function yearStampVisible(frame: number, fps: number, holdSec = YEAR_STAMP_SEC): number {
  const {slam, fade} = yearStampState(Math.max(0, frame), fps, 1920, 1080, holdSec);
  return frame < 0 ? 0 : Math.min(slam, fade);
}

/** Map labels start stepping aside this long before a year stamp slams in. */
export const YEAR_STAMP_LEAD_SEC = 0.3;

/**
 * Where the year stamp is on screen at local frame `frame` (an estimate from its type size; generous), and how much
 * labels under it must give way: fully from YEAR_STAMP_LEAD_SEC before it appears until it has all but faded, so a
 * label and the stamp are never both visible (negative frames = the lead-in).
 */
export function yearStampZone(text: string, frame: number, fps: number, width: number, height: number, holdSec = YEAR_STAMP_SEC): ChromeZone {
  const lead = Math.round(YEAR_STAMP_LEAD_SEC * fps);
  const {slam, settle, fade, size, x, y} = yearStampState(Math.max(0, frame), fps, width, height, holdSec, text);
  const scale = 1.6 - 0.6 * slam;
  const w0 = text.length * size * 0.62 + 6 * text.length;
  const left = x - 0.5 * (1 - settle) * w0;
  const h = size * 1.2 * scale;
  const away = frame < 0 ? Math.max(0, 1 + frame / lead) : fade < 1 ? Math.min(1, fade / 0.04) : 1;
  return {rect: [left, y - h / 2, left + w0 * scale, y + h / 2], opacity: away};
}

export const YearStampView: React.FC<{text: string; holdSec?: number}> = ({text, holdSec = YEAR_STAMP_SEC}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const {slam, settle, fade, size, x, y} = yearStampState(frame, fps, width, height, holdSec, text);
  return (
    <div data-guard-item="year" style={{position: 'absolute', left: x, top: y, transform: `translate(${-50 * (1 - settle)}%, -50%) scale(${1.6 - 0.6 * slam})`, transformOrigin: 'left center',
      opacity: Math.min(slam, fade), fontFamily: FONT.display, fontWeight: 700, fontSize: size, color: COLOR.paper, letterSpacing: 6,
      textShadow: '0 10px 40px rgba(0,0,0,0.75)'}}>
      {text}
    </div>
  );
};
