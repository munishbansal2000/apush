/** Text normalization shared by the parser, anchors, linters, and captions. */

export const norm = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const tokens = (s: string): string[] => {
  const n = norm(s);
  return n ? n.split(' ') : [];
};

export const wordCount = (s: string): number => s.split(/\s+/).filter(Boolean).length;

export const sentences = (s: string): string[] =>
  s
    .split(/(?<=[.?!])\s+/)
    .map(x => x.trim())
    .filter(Boolean);

/** Emoji / pictographic characters (render as tofu without a color-emoji font). */
export const EMOJI_RE = /\p{Extended_Pictographic}/u;

export const hasEmoji = (s: string): boolean => EMOJI_RE.test(s);

/** Stable short hash (FNV-1a) for change detection. */
export const hash = (s: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
};
