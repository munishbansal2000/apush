import React from 'react';
import { FONT, useFadeIn } from './util';

export const PrimarySourceSpotlight: React.FC<{
  documentTitle: string;
  authorAndDate: string;
  excerptText: string;
  highlightedPhrase: string;
  hippType: string;
  hippExplanation: string;
}> = ({ documentTitle, authorAndDate, excerptText, highlightedPhrase, hippType, hippExplanation }) => {
  const parts = excerptText.split(highlightedPhrase);
  return (
    <div data-kit="source" style={{ position: 'absolute', inset: 0, opacity: useFadeIn(0, 15),
      background: 'rgba(245,230,200,0.95)', color: '#2a2018', borderRadius: 12, padding: 48, boxSizing: 'border-box', fontFamily: FONT }}>
      <div style={{ fontSize: 48, fontWeight: 700 }}>{documentTitle}</div>
      <div style={{ fontSize: 28, opacity: 0.75, marginBottom: 28 }}>{authorAndDate}</div>
      <div style={{ fontSize: 38, lineHeight: 1.35 }}>
        {parts[0]}
        {parts.length > 1 && <mark style={{ background: '#e9c46a' }}>{highlightedPhrase}</mark>}
        {parts.slice(1).join(highlightedPhrase)}
      </div>
      <div style={{ marginTop: 32, fontSize: 28 }}><b>{hippType}:</b> {hippExplanation}</div>
    </div>
  );
};
