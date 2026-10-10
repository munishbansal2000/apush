/** Question cards for scripted pauses. */
import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLOR, FONT} from '../../theme/tokens';
import type {QuestionShot} from '../types';
import {ImageMove} from './image';

/* --------------------------------- question card --------------------------------- */

/**
 * A scripted pause: the question that was just asked, a kicker, and a countdown ring that drains over the pause, so
 * the silence reads as "your turn", not dead air. Times are local to the shot's Sequence.
 */
export const QuestionView: React.FC<{shot: QuestionShot; lead: number}> = ({shot, lead}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const t = frame / fps;
  const pauseFrom = shot.pauseStartSec - shot.startSec + lead;
  const pauseLen = Math.max(0.1, shot.pauseEndSec - shot.pauseStartSec);
  const enter = spring({frame, fps, config: {damping: 200}, durationInFrames: 14});
  const left = Math.max(0, pauseLen - Math.max(0, t - pauseFrom));
  const done = 1 - left / pauseLen;
  const r = 70;
  const circumference = 2 * Math.PI * r;
  const duration = shot.endSec - shot.startSec + lead;
  return (
    <>
      {shot.backdrop && shot.size
        ? <ImageMove image={shot.backdrop} size={shot.size} from={{x: 0.5, y: 0.5, zoom: 1.05}} to={{x: 0.5, y: 0.5, zoom: 1.12}} durationSec={duration} dim={0.72} blur={8} />
        : <div style={{position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 40%, #2a2016 0%, #0b0907 75%)`}} />}
      <div style={{position: 'absolute', left: width * 0.12, right: width * 0.12, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 44,
        opacity: enter, transform: `translateY(${(1 - enter) * 24}px)`}}>
        <div data-guard-item="question kicker" style={{fontFamily: FONT.display, fontWeight: 700, fontSize: 34, letterSpacing: 10, color: COLOR.gold}}>
          {shot.practice ? 'AP PRACTICE · YOUR TURN' : 'YOUR TURN'}
        </div>
        <div data-guard-item="question" style={{fontFamily: FONT.text, fontSize: shot.question.length > 140 ? 44 : 56, lineHeight: 1.35, color: COLOR.onNight, textAlign: 'center', textShadow: '0 6px 30px rgba(0,0,0,0.6)'}}>
          {shot.question}
        </div>
        <svg data-guard-item="countdown" width={(r + 10) * 2} height={(r + 10) * 2} viewBox={`0 0 ${(r + 10) * 2} ${(r + 10) * 2}`}>
          <circle cx={r + 10} cy={r + 10} r={r} fill="none" stroke="rgba(245,240,232,0.15)" strokeWidth={8} />
          <circle cx={r + 10} cy={r + 10} r={r} fill="none" stroke={COLOR.gold} strokeWidth={8} strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={circumference * done} transform={`rotate(-90 ${r + 10} ${r + 10})`} />
          <text x={r + 10} y={r + 10} textAnchor="middle" dominantBaseline="central" fontFamily={FONT.display} fontWeight={700} fontSize={52} fill={COLOR.onNight}>
            {Math.ceil(left)}
          </text>
        </svg>
      </div>
    </>
  );
};
