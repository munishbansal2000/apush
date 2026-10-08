/**
 * Asset catalog schema — the single list of every image the course needs, with the prompt
 * (or public-domain source) that produces it. Catalog files: data/assets/catalog/<category>.json.
 * Styles: data/assets/styles.json. Production status: data/assets/status.json (written by
 * tools/assets.ts). Index consumed by the app: src/data/assets-index.json (built by
 * `tools/assets.ts index`).
 */

export type AssetKind = 'portrait' | 'character' | 'prop' | 'vehicle' | 'flag' | 'document' | 'texture' | 'backdrop' | 'icon';

/**
 * fetch-pd           real public-domain image (required for real people & real documents)
 * fetch-pd+stylize   the public-domain image, then the house style applied by an image-edit model
 * generate           AI image from the prompt (generic people, costumes, props, vehicles, textures)
 * draw               drawn in code (SVG) — listed for completeness, no image generated
 */
export type AssetStrategy = 'fetch-pd' | 'fetch-pd+stylize' | 'generate' | 'draw';

export type Sensitivity = 'none' | 'care' | 'high';

export interface AssetVariant {
  /** appended to the id: `<id>#<variant>` */
  id: string;
  /** extra subject text for this variant (pose, expression, angle, state) */
  subject: string;
}

export interface AssetItem {
  /** `<kind>.<slug>` — stable, referenced by plans and code, e.g. "portrait.abraham-lincoln" */
  id: string;
  name: string;
  kind: AssetKind;
  /** APUSH units 1–9 that use it */
  units: number[];
  strategy: AssetStrategy;
  /** key into styles.json */
  style: string;
  /** the prompt body: WHAT to depict, concrete and visual (no style words — the style adds those) */
  subject: string;
  /** historical accuracy requirements the image must satisfy (also the review checklist) */
  details: string[];
  /** things the image must NOT contain (anachronisms, stereotypes, text, watermarks…) */
  avoid?: string[];
  /** "WxH", e.g. "1024x1024", "1024x1536", "1536x1024" */
  size: string;
  background: 'transparent' | 'opaque';
  variants?: AssetVariant[];
  /** public-domain source (for fetch-pd*): Wikimedia Commons search + preferred file */
  pd?: { query: string; preferred?: string; institution?: string; notes?: string };
  /** dates for portraits/characters, e.g. "1809–1865"; era for objects, e.g. "c. 1770s" */
  dates?: string;
  /** sensitive depictions (Indigenous peoples, enslaved people, violence) need extra review */
  sensitivity?: Sensitivity;
  sensitivityNote?: string;
  /** priority 1 (most-tested, build first) … 3 */
  priority: 1 | 2 | 3;
  tags?: string[];
}

export interface CatalogFile {
  category: string;
  description: string;
  items: AssetItem[];
}

export interface StyleDef {
  /** prepended to the subject */
  prefix: string;
  /** appended to the subject */
  suffix: string;
  /** negative prompt / "avoid" list for providers that support it */
  negative: string;
  notes?: string;
}

export interface StylesFile {
  /** applied to every prompt after the style */
  global: { suffix: string; negative: string };
  styles: Record<string, StyleDef>;
}

export type AssetStatus = 'todo' | 'generated' | 'approved' | 'rejected' | 'fetched';

export interface StatusEntry {
  status: AssetStatus;
  /** sha1 of the composed prompt (or pd query) — a change marks the asset stale */
  promptHash: string;
  /** candidate files (public/ relative) from all attempts */
  candidates: { file: string; provider: string; model: string; at: string; seed?: number; cost?: number }[];
  /** the chosen file once approved/fetched */
  file?: string;
  credit?: string;
  license?: string;
  source?: string;
  notes?: string;
  reviewedAt?: string;
}

export interface StatusFile { items: Record<string, StatusEntry> }

/** What the app consumes: one entry per asset (and variant) id. */
export interface AssetIndexEntry {
  id: string;
  name: string;
  kind: AssetKind;
  /** public/ relative, undefined until produced */
  file?: string;
  width?: number;
  height?: number;
  status: AssetStatus;
  credit?: string;
  background: 'transparent' | 'opaque';
}
