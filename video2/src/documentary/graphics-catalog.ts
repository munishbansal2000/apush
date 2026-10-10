/**
 * Graphics a storyboard can put on screen as a "graphic" shot: reusable components from src/components, driven by
 * data the storyboard writes (text, numbers) and revealed on spoken cues ("beats"). Pure data and checks, no React:
 * the director's prompt, the storyboard checks and the resolver read it; views/graphic.tsx maps names to components.
 * Limits keep text inside each layout (it is never shrunk to fit).
 */

export interface GraphicEntry {
  /** When the storyboard should use it. */
  use: string;
  /** What each beat (spoken cue phrase, in order) reveals; empty: no beats. */
  beats: string;
  /** The props, as the storyboard writes them. */
  example: Record<string, unknown>;
  /** Problems with a storyboard's props (empty when fine). */
  check: (props: Record<string, unknown>) => string[];
  /** Lesson images it shows (they come from the act's ASSETS and count toward each image's uses). */
  images?: (props: Record<string, unknown>) => string[];
}

type P = Record<string, unknown>;
const str = (v: unknown, name: string, max: number, required = true): string[] =>
  v === undefined && !required ? [] : typeof v !== 'string' || !v.trim() ? [`${name} is required (text)`] : v.length > max ? [`${name} is ${v.length} characters; at most ${max}`] : [];
const list = (v: unknown, name: string, min: number, max: number): unknown[] | string =>
  !Array.isArray(v) ? `${name} must be a list` : v.length < min || v.length > max ? `${name} has ${v.length} item(s); ${min}-${max}` : v;

export const GRAPHICS: Record<string, GraphicEntry> = {
  QuoteSlide: {
    use: 'A primary-source quote read aloud: the words themselves are the point (a speech, a pamphlet, a petition).',
    beats: '',
    example: {quote: 'No taxation without representation.', byline: 'James Otis, 1761'},
    check: (p: P) => [...str(p.quote, 'quote', 220), ...str(p.byline, 'byline', 60, false)],
  },
  PrimarySourceSpotlight: {
    use: 'A document the narration analyses (APUSH sourcing): the excerpt, the phrase that matters highlighted, and one HIPP note.',
    beats: '1: the highlight sweeps the phrase; 2: the HIPP note appears',
    example: {documentTitle: 'The Rights of the British Colonies', authorAndDate: 'James Otis, 1764', documentType: 'Political Pamphlet',
      excerptText: 'The colonists are by the law of nature freeborn, as indeed all men are.', highlightedPhrase: 'freeborn',
      hippType: 'Point of View', hippExplanation: 'A Boston lawyer arguing colonists hold the full rights of Englishmen.'},
    check: (p: P) => {
      const out = [...str(p.documentTitle, 'documentTitle', 60), ...str(p.authorAndDate, 'authorAndDate', 50), ...str(p.excerptText, 'excerptText', 280),
        ...str(p.highlightedPhrase, 'highlightedPhrase', 60), ...str(p.hippExplanation, 'hippExplanation', 120), ...str(p.documentType, 'documentType', 30, false)];
      if (typeof p.excerptText === 'string' && typeof p.highlightedPhrase === 'string' && !p.excerptText.includes(p.highlightedPhrase)) out.push('highlightedPhrase must be copied exactly from excerptText');
      if (!['Historical Context', 'Intended Audience', 'Purpose', 'Point of View'].includes(String(p.hippType))) out.push('hippType is Historical Context | Intended Audience | Purpose | Point of View');
      return out;
    },
  },
  HighlightSlide: {
    use: 'Close reading of a short passage: the key phrases marked one by one as the narration names them, each with a margin note.',
    beats: 'one per highlight, in order',
    example: {title: 'The Stamp Act, 1765', body: 'There shall be raised, levied, collected and paid unto His Majesty a stamp duty on every skin or piece of vellum or parchment, or sheet or piece of paper.', highlights: [{text: 'unto His Majesty', note: 'paid to London'}, {text: 'every', note: 'no exceptions'}]},
    check: (p: P) => {
      const out = [...str(p.title, 'title', 50, false), ...str(p.body, 'body', 320)];
      const hs = list(p.highlights, 'highlights', 1, 3);
      if (typeof hs === 'string') return [...out, hs];
      for (const [i, h] of (hs as {text?: unknown; note?: unknown}[]).entries()) {
        out.push(...str(h?.text, `highlights[${i}].text`, 60), ...str(h?.note, `highlights[${i}].note`, 40, false));
        if (typeof h?.text === 'string' && typeof p.body === 'string' && !p.body.includes(h.text)) out.push(`highlights[${i}].text must be copied exactly from body`);
      }
      return out;
    },
  },
  CompareSlide: {
    use: 'Two sides set against each other (London vs the colonists, before vs after, two plans).',
    beats: '1: the left side; 2: the right side',
    example: {title: 'Who decides taxes?', left: {head: 'Parliament', sections: [{sub: 'Claim', points: ['Virtual representation', 'Taxes for defense']}]},
      right: {head: 'Colonists', sections: [{sub: 'Claim', points: ['Only their assemblies', 'No seats in London']}]}},
    check: (p: P) => {
      const out = str(p.title, 'title', 50, false);
      for (const side of ['left', 'right'] as const) {
        const s = p[side] as {head?: unknown; sections?: unknown} | undefined;
        if (!s || typeof s !== 'object') { out.push(`${side} is required ({head, sections})`); continue; }
        out.push(...str(s.head, `${side}.head`, 24));
        const secs = list(s.sections, `${side}.sections`, 1, 2);
        if (typeof secs === 'string') { out.push(secs); continue; }
        for (const [i, sec] of (secs as {sub?: unknown; points?: unknown}[]).entries()) {
          out.push(...str(sec?.sub, `${side}.sections[${i}].sub`, 24));
          const pts = list(sec?.points, `${side}.sections[${i}].points`, 1, 3);
          if (typeof pts === 'string') out.push(pts);
          else (pts as unknown[]).forEach((pt, j) => out.push(...str(pt, `${side}.sections[${i}].points[${j}]`, 40)));
        }
      }
      return out;
    },
  },
  CausalChainSlide: {
    use: 'A chain of causes the narration walks through (debt -> new taxes -> protest -> repeal).',
    beats: 'one per node, in order',
    example: {title: 'From war to protest', nodes: [['War debt', '£133 million'], 'Stamp Act', 'Boycotts', 'Repeal']},
    check: (p: P) => {
      const out = str(p.title, 'title', 50, false);
      const nodes = list(p.nodes, 'nodes', 2, 5);
      if (typeof nodes === 'string') return [...out, nodes];
      (nodes as unknown[]).forEach((n, i) => out.push(...(Array.isArray(n) ? [...str(n[0], `nodes[${i}][0]`, 24), ...str(n[1], `nodes[${i}][1]`, 36)] : str(n, `nodes[${i}]`, 24))));
      return out;
    },
  },
  AnimatedChart: {
    use: 'Numbers the narration compares (debt before and after a war, colonial imports by year): 2-6 bars.',
    beats: 'one per bar, in order (optional)',
    example: {type: 'bar', title: 'British national debt (£ millions)', data: [{label: '1755', value: 72}, {label: '1763', value: 133}]},
    check: (p: P) => {
      const out = str(p.title, 'title', 50, false);
      if (p.type !== 'bar') out.push('type is "bar"');
      const bars = list(p.data, 'data', 2, 6);
      if (typeof bars === 'string') return [...out, bars];
      (bars as {label?: unknown; value?: unknown; display?: unknown}[]).forEach((b, i) => {
        out.push(...str(b?.label, `data[${i}].label`, 18), ...str(b?.display, `data[${i}].display`, 10, false));
        if (typeof b?.value !== 'number' || !Number.isFinite(b.value) || b.value < 0) out.push(`data[${i}].value must be a number >= 0`);
      });
      return out;
    },
  },
  KeyTerm: {
    use: 'A key term the narration defines (salutary neglect, virtual representation, mercantilism): the term lands, then its one-line definition.',
    beats: '1: the definition appears',
    example: {term: 'Salutary neglect', definition: 'London looked the other way, and the colonies prospered.'},
    check: (p: P) => [...str(p.term, 'term', 32), ...str(p.definition, 'definition', 90)],
  },
  SpectrumSlide: {
    use: 'Where people or groups stood on a scale (Loyalist to Patriot, moderate to radical): 2-5 markers dropped on an axis.',
    beats: 'one per marker, in order',
    example: {title: 'Where colonists stood, 1765', axis: ['Loyal to the Crown', 'Ready to resist'], markers: [{at: 0.15, label: 'Royal governors'}, {at: 0.55, label: 'Merchants'}, {at: 0.9, label: 'Sons of Liberty'}]},
    check: (p: P) => {
      const out = str(p.title, 'title', 50, false);
      if (!Array.isArray(p.axis) || p.axis.length !== 2) out.push('axis is [left label, right label]');
      else p.axis.forEach((a, i) => out.push(...str(a, `axis[${i}]`, 28)));
      const ms = list(p.markers, 'markers', 2, 5);
      if (typeof ms === 'string') return [...out, ms];
      (ms as {at?: unknown; label?: unknown}[]).forEach((m, i) => {
        out.push(...str(m?.label, `markers[${i}].label`, 24));
        if (typeof m?.at !== 'number' || m.at < 0 || m.at > 1) out.push(`markers[${i}].at is a position from 0 to 1`);
      });
      return out;
    },
  },
  StaggerSlide: {
    use: '2-4 pictures the narration names one after another (the people at a congress, the objects taxed): each panel slides in, labelled.',
    beats: 'one per panel, in order',
    example: {title: 'Taxed by the stamp', panels: [{image: '<asset path>', label: 'Newspapers'}, {image: '<asset path>', label: 'Playing cards'}]},
    check: (p: P) => {
      const out = str(p.title, 'title', 50, false);
      const ps = list(p.panels, 'panels', 2, 4);
      if (typeof ps === 'string') return [...out, ps];
      (ps as {image?: unknown; label?: unknown}[]).forEach((x, i) => out.push(...str(x?.image, `panels[${i}].image`, 200), ...str(x?.label, `panels[${i}].label`, 24, false)));
      return out;
    },
    images: (p: P) => (Array.isArray(p.panels) ? (p.panels as {image?: unknown}[]).map(x => x?.image).filter((x): x is string => typeof x === 'string') : []),
  },
  CollageSlide: {
    use: 'Many examples of one thing at once (protests across the colonies, the goods boycotted): a labelled grid of 3-6 pictures.',
    beats: '',
    example: {title: 'Protest spreads', columns: 3, items: [{image: '<asset path>', label: 'Boston'}, {image: '<asset path>', label: 'New York'}, {image: '<asset path>', label: 'Charleston'}]},
    check: (p: P) => {
      const out = str(p.title, 'title', 50, false);
      if (p.columns !== undefined && ![2, 3].includes(p.columns as number)) out.push('columns is 2 or 3');
      const items = list(p.items, 'items', 3, 6);
      if (typeof items === 'string') return [...out, items];
      (items as {image?: unknown; label?: unknown}[]).forEach((x, i) => out.push(...str(x?.image, `items[${i}].image`, 200), ...str(x?.label, `items[${i}].label`, 24, false)));
      return out;
    },
    images: (p: P) => (Array.isArray(p.items) ? (p.items as {image?: unknown}[]).map(x => x?.image).filter((x): x is string => typeof x === 'string') : []),
  },
  PersonCard: {
    use: 'Introducing a person who matters to the lesson: their portrait behind a card with name, dates, role and one note. Say when the likeness is not from life.',
    beats: '',
    example: {name: 'George Grenville', dates: '1712-1770', role: 'Prime Minister, 1763-1765', note: 'Ended the era of looking the other way', image: '<asset path>', likeness: 'from life'},
    check: (p: P) => {
      const out = [...str(p.name, 'name', 32), ...str(p.dates, 'dates', 20), ...str(p.role, 'role', 48), ...str(p.note, 'note', 60, false), ...str(p.image, 'image', 200, false)];
      if (p.likeness !== undefined && !['from life', 'later likeness', 'none'].includes(String(p.likeness))) out.push('likeness is "from life" | "later likeness" | "none"');
      return out;
    },
    images: (p: P) => (typeof p.image === 'string' ? [p.image] : []),
  },
};

export const GRAPHIC_NAMES = Object.keys(GRAPHICS);

/** The lesson images a graphic shows. */
export function graphicImages(component: unknown, props: unknown): string[] {
  if (typeof component !== 'string' || !props || typeof props !== 'object') return [];
  return GRAPHICS[component]?.images?.(props as P) ?? [];
}

/** Problems with a graphic visual: an unknown component, bad props, or more beats than it reveals. */
export function graphicIssues(component: unknown, props: unknown, beats: unknown[] = []): string[] {
  const entry = typeof component === 'string' ? GRAPHICS[component] : undefined;
  if (!entry) return [`unknown graphic "${String(component)}" (${GRAPHIC_NAMES.join(', ')})`];
  if (!props || typeof props !== 'object') return [`${component}: props are required`];
  const out = entry.check(props as P).map(i => `${component}: ${i}`);
  if (!entry.beats && beats.length) out.push(`${component}: takes no beats`);
  return out;
}
