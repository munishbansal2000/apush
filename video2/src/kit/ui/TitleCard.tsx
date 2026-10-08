import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FONT, useFadeIn } from './util';

export const TitleCard: React.FC<{ kicker: string; title: string; subline: string; at: number }> = ({ kicker, title, subline, at }) => (
  <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', background: 'rgba(10,8,6,0.78)', opacity: useFadeIn(at), fontFamily: FONT, color: '#f5e6c8' }}>
    <div style={{ fontSize: 34, letterSpacing: 6, opacity: 0.8 }}>{kicker}</div>
    <div style={{ fontSize: 150, fontWeight: 700 }}>{title}</div>
    <div style={{ fontSize: 40, letterSpacing: 4, color: '#ffd166' }}>{subline}</div>
  </AbsoluteFill>
);
