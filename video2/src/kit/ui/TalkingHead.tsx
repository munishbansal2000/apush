import React from 'react';
import { Img, useCurrentFrame } from 'remotion';
import { FONT } from './util';

export const TalkingHead: React.FC<{
  speakerName: string;
  speakerColor: string;
  position: 'bottom-right';
  size: number;
  speaking: boolean;
  showName: boolean;
  assetPair: { realistic: string; stylized: string };
  frameStyle: 'rounded';
}> = ({ speakerName, speakerColor, size, speaking, showName, assetPair }) => {
  const f = useCurrentFrame();
  const bob = speaking ? Math.sin(f / 3) * 3 : 0;
  const px = 1080 * size;
  return (
    <div data-kit="head" data-speaker={speakerName} data-src={assetPair.stylized}
      style={{ position: 'absolute', right: 40, bottom: 40 + bob, width: px, height: px, borderRadius: 24, overflow: 'hidden',
        border: `6px solid ${speakerColor}`, background: '#222', boxShadow: speaking ? `0 0 30px ${speakerColor}` : 'none' }}>
      <Img src={assetPair.stylized} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
      {showName && (
        <div style={{ position: 'absolute', bottom: 0, width: '100%', background: speakerColor, color: '#fff', fontFamily: FONT, fontSize: 30, textAlign: 'center' }}>
          {speakerName}
        </div>
      )}
    </div>
  );
};
