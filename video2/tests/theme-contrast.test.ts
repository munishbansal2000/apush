/**
 * Theme accessibility: paired roles stay distinguishable under color-vision deficiency, and
 * text/stroke roles meet WCAG contrast on the surface they're used on.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COLOR } from '../src/theme/tokens';

const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (hex: string) => { const [r, g, b] = rgb(hex).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// Machado et al. (2009) severity-1.0 matrices, applied in linear RGB
const CVD: Record<string, number[][]> = {
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};
const simulate = (hex: string, m: number[][]) => { const c = rgb(hex).map(lin); return m.map(row => Math.min(1, Math.max(0, row[0] * c[0] + row[1] * c[1] + row[2] * c[2]))); };
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const PAIRS: [keyof typeof COLOR, keyof typeof COLOR][] = [['free', 'slave'], ['union', 'confederate'], ['patriot', 'british'], ['maya', 'marcus']];

test('paired roles stay distinguishable under protan/deutan/tritan vision', () => {
  const bad: string[] = [];
  for (const [a, b] of PAIRS) for (const [kind, m] of Object.entries(CVD)) {
    const d = dist(simulate(COLOR[a], m), simulate(COLOR[b], m));
    if (d < 0.18) bad.push(`${a} vs ${b} under ${kind}: distance ${d.toFixed(3)} (< 0.18)`);
  }
  assert.deepEqual(bad, []);
});

test('text and stroke roles meet contrast on their surface', () => {
  const rules: [keyof typeof COLOR, keyof typeof COLOR, number][] = [
    ['ink', 'paper', 7], ['inkSoft', 'paper', 4.5], ['ink', 'paperDeep', 7],
    ['onNight', 'night', 7], ['onNightMuted', 'night', 4.5],
    ['skyOnNight', 'night', 4.5], ['mintOnNight', 'night', 4.5], ['goldOnNight', 'night', 4.5], ['redOnNight', 'night', 4.5],
    ['red', 'paper', 4.5], ['blue', 'paper', 4.5], ['green', 'paper', 4.5], ['free', 'paper', 3], ['slave', 'paper', 3],
  ];
  const bad = rules.filter(([fg, bg, min]) => contrast(COLOR[fg], COLOR[bg]) < min)
    .map(([fg, bg, min]) => `${fg} on ${bg}: ${contrast(COLOR[fg], COLOR[bg]).toFixed(2)} (< ${min})`);
  assert.deepEqual(bad, []);
});
