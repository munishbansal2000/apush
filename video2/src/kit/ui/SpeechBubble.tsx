import React from 'react';
import { FONT, useFadeIn } from './util';

export const SpeechBubble: React.FC<{ text: string; position: [number, number]; width: number; at: number }> = ({ text, position, width, at }) => (
  <div
    data-kit="bubble"
    style={{
      position: 'absolute', left: `${position[0] * 100}%`, top: `${position[1] * 100}%`, width,
      transform: 'translate(-50%, -50%)', opacity: useFadeIn(at), background: '#fffaf0', color: '#222',
      borderRadius: 28, padding: 28, fontFamily: FONT, fontSize: 34, lineHeight: '44px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    }}
  >
    {text}
  </div>
);
