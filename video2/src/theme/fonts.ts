/**
 * Loads the self-hosted fonts (public/fonts) before any frame is captured. Without this,
 * Chrome silently falls back to another font: the look changes and measured/fitted text
 * (layout-utils) is computed against the wrong glyph widths.
 * Imported once by src/Root.tsx.
 */
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';

const FACES: { family: string; file: string; weight: string; style?: string }[] = [
  { family: 'Cinzel', file: 'cinzel-400-normal.woff2', weight: '400' },
  { family: 'Cinzel', file: 'cinzel-700-normal.woff2', weight: '700' },
  { family: 'Libre Baskerville', file: 'libre-baskerville-400-normal.woff2', weight: '400' },
  { family: 'Libre Baskerville', file: 'libre-baskerville-700-normal.woff2', weight: '700' },
  { family: 'Libre Baskerville', file: 'libre-baskerville-400-italic.woff2', weight: '400', style: 'italic' },
  { family: 'Plus Jakarta Sans', file: 'plus-jakarta-sans-400-normal.woff2', weight: '400' },
  { family: 'Plus Jakarta Sans', file: 'plus-jakarta-sans-700-normal.woff2', weight: '700' },
  { family: 'JetBrains Mono', file: 'jetbrains-mono-400-normal.woff2', weight: '400' },
  { family: 'JetBrains Mono', file: 'jetbrains-mono-700-normal.woff2', weight: '700' },
];

let started = false;
export function loadThemeFonts(): void {
  if (started || typeof document === 'undefined' || typeof FontFace === 'undefined') return;
  started = true;
  const handle = delayRender('theme fonts');
  // Parallel render tabs all fetch the fonts at once; the local file server can drop a connection under that load
  // (net::ERR_CONNECTION_RESET on Windows). Retry with a short backoff before calling a font missing.
  const load = async (f: (typeof FACES)[number]) => {
    for (let attempt = 1; ; attempt++) {
      try {
        const face = await new FontFace(f.family, `url(${staticFile(`fonts/${f.file}`)}) format('woff2')`, { weight: f.weight, style: f.style ?? 'normal' }).load();
        document.fonts.add(face);
        return;
      } catch (err) {
        if (attempt >= 5) throw err;
        await new Promise(resolve => setTimeout(resolve, 250 * attempt));
      }
    }
  };
  Promise.all(FACES.map(load))
    .then(() => continueRender(handle))
    // a font still missing after the retries must fail the render loudly, not silently fall back
    .catch(err => cancelRender(err));
}

loadThemeFonts();
