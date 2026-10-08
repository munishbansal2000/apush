import React from 'react';
import { FONT, useFadeIn } from './util';

interface Entity { name: string; subtitle: string; points: string[]; color: string }
export const VersusPolarization: React.FC<{ clashTitle: string; periodLabel: string; entityA: Entity; entityB: Entity; verdictSummary: string }> = ({ clashTitle, periodLabel, entityA, entityB, verdictSummary }) => {
  const col = (e: Entity) => (
    <div style={{ flex: 1, borderTop: `8px solid ${e.color}`, padding: 24, background: 'rgba(0,0,0,0.55)', borderRadius: 8 }}>
      <div style={{ fontSize: 52, fontWeight: 700, color: e.color }}>{e.name}</div>
      <div style={{ fontSize: 28, opacity: 0.8, marginBottom: 16 }}>{e.subtitle}</div>
      {e.points.map(p => <div key={p} style={{ fontSize: 32, margin: '10px 0' }}>• {p}</div>)}
    </div>
  );
  return (
    <div data-kit="versus" style={{ position: 'absolute', inset: 0, opacity: useFadeIn(0, 15), color: '#f5e6c8', fontFamily: FONT }}>
      <div style={{ fontSize: 56, fontWeight: 700, textAlign: 'center' }}>{clashTitle}</div>
      <div style={{ fontSize: 26, textAlign: 'center', opacity: 0.7, marginBottom: 20 }}>{periodLabel}</div>
      <div style={{ display: 'flex', gap: 24 }}>{col(entityA)}{col(entityB)}</div>
      <div style={{ fontSize: 34, textAlign: 'center', marginTop: 20, fontStyle: 'italic' }}>{verdictSummary}</div>
    </div>
  );
};
