/**
 * Scene PLAN schema: a lesson scene is a JSON file (src/plan/plans/*.json), not code.
 *
 *   { id, format, narration, map?, places?, routes?, beats: Beat[], style? }
 *
 * A Beat starts on words in the narration (`on`) and carries the blocks that act in it.
 * Times inside a beat are TimeRefs, relative to the beat — never absolute seconds:
 *   3.2                      → 3.2 s after the beat starts
 *   "invisible"              → when that phrase is spoken (first occurrence after the beat start)
 *   { on, offset, dur }      → phrase (or keyword) + offset; `dur` on a block's `at` sets its end
 * Keywords for `on`: "start" (beat start, default), "end" (beat end = next beat's start),
 * "scene-end", "@N" (start of narration sentence N), "@N.end" (end of sentence N).
 * Data is referenced by name (`"statehood"` → src/data/motion/statehood.json) with an optional
 * JSON path (`"statehood#enslaved1860.states"`), or given inline.
 *
 * Runtime validation uses zod (present in node_modules as a dependency of remotion; add
 * "zod" to package.json dependencies to make it explicit). `parsePlan()` returns the typed
 * plan or issues with codes PL001 (schema) / PL002 (unknown block type).
 */
import { z } from 'zod';

/* ------------------------------------ primitives ------------------------------------ */

const LonLat = z.tuple([z.number(), z.number()]);
/** [lon, lat] or a name from plan.places (territory labels also accept a state id/name). */
const Place = z.union([LonLat, z.string()]);
const TimeObj = z.object({ on: z.string().optional(), offset: z.number().optional(), dur: z.number().optional() }).strict();
export const TimeRefSchema = z.union([z.number(), z.string(), TimeObj]);
export type ColorSpec = string | { mix: [ColorSpec, ColorSpec, number] };
/** A theme COLOR role name ("free", "brown"…) or { mix: [a, b, p] } of two of them. */
const ColorRef: z.ZodType<ColorSpec> = z.lazy(() => z.union([z.string(), z.object({ mix: z.tuple([ColorRef, ColorRef, z.number()]) }).strict()]));
/** "name" or "name#path.to.entry" (src/data/motion/<name>.json). */
const DataRef = z.string().min(1);
const TextAnchor = z.enum(['start', 'middle', 'end']);
const LabelPlace = z.object({ dx: z.number(), dy: z.number(), anchor: TextAnchor }).strict();
const Side = z.enum(['union', 'confederate', 'patriot', 'british', 'inconclusive']);
const Window = { at: TimeRefSchema.optional(), until: TimeRefSchema.optional() };
const RouteObj = z.object({ from: Place, to: Place, bend: z.number() }).strict();
/** a route id from plan.routes, or inline */
const Route = z.union([z.string(), RouteObj]);
const Rect = z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }).strict();

const base = {
  /** id (for references: stowaways.with, split.territory; storyboard element names) */
  id: z.string().optional(),
  /** start (default: beat start) */
  at: TimeRefSchema.optional(),
  /** end (default: beat end) */
  until: TimeRefSchema.optional(),
  /** automatic sound cue: false = silent, { volume } = louder/quieter */
  sound: z.union([z.literal(false), z.object({ volume: z.number() }).strict()]).optional(),
  /** citation for inline factual data */
  source: z.string().optional(),
  note: z.string().optional(),
};

/* ------------------------------------ blocks ------------------------------------ */

const Ship = z.object({ type: z.literal('ship'), ...base, route: Route, src: z.string().optional(), facesRight: z.boolean().optional(), dock: z.boolean().optional() }).strict();

const Flow = z.object({
  type: z.literal('flow'), ...base, route: Route, color: ColorRef,
  /** thickens on each item: "terms" = the beat's term times, or explicit times */
  grow: z.union([z.literal('terms'), z.array(TimeRefSchema)]).optional(),
  maxWidth: z.number().optional(), label: z.string(), labelU: z.number().optional(),
  /** windows the label shows in */
  labels: z.array(z.object(Window).strict()).optional(),
}).strict();

const Town = z.object({ name: z.string(), where: Place, label: LabelPlace.optional() }).strict();
const Spread = z.object({
  type: z.literal('spread'), ...base, origin: Place, towns: z.union([DataRef, z.array(Town)]),
  perTown: z.number().optional(), color: ColorRef.optional(), labelsUntil: TimeRefSchema.optional(),
}).strict();

const Stowaways = z.object({ type: z.literal('stowaways'), ...base, with: z.string().optional(), route: Route.optional(), reveal: TimeRefSchema, color: ColorRef.optional() }).strict();

const PlaceB = z.object({ type: z.literal('place'), ...base, text: z.string(), where: Place, dx: z.number().optional(), dy: z.number().optional(), anchor: TextAnchor.optional(), dot: z.boolean().optional() }).strict();

const Site = z.object({ type: z.literal('site'), ...base, text: z.string(), where: Place, label: LabelPlace.optional() }).strict();

const RegionLabel = z.object({ text: z.string(), where: Place, ...Window, dx: z.number().optional(), dy: z.number().optional(), anchor: TextAnchor.optional(), size: z.enum(['town', 'place']).optional() }).strict();
const LegendSection = z.object({ ...Window, statuses: z.array(z.string()) }).strict();
const Territory = z.object({
  type: z.literal('territory'), ...base, data: DataRef,
  /** status → colour */
  colors: z.record(z.string(), ColorRef),
  labels: z.array(RegionLabel).optional(),
  /** "auto" (default): one legend per run of beats whose visible statuses only grow */
  legend: z.union([z.literal('auto'), z.literal(false), z.array(LegendSection)]).optional(),
  /** big year counter in the chip zone */
  counter: z.union([z.literal(false), z.object(Window).strict()]).optional(),
  fillOpacity: z.number().optional(), crossfade: z.number().optional(), pulse: z.boolean().optional(),
}).strict();

const LineB = z.object({
  type: z.literal('line'), ...base, data: DataRef.optional(), coords: z.array(LonLat).optional(),
  draw: z.number().optional(), color: ColorRef.optional(), width: z.number().optional(), dashed: z.boolean().optional(),
  dimAt: TimeRefSchema.optional(), dimTo: z.number().optional(),
  labels: z.array(z.object({ text: z.string(), where: Place, ...Window, dx: z.number().optional(), dy: z.number().optional(), anchor: TextAnchor.optional() }).strict()).optional(),
}).strict();

const Numbers = z.object({
  type: z.literal('numbers'), ...base,
  /** array of { id, name, value } entries */
  data: DataRef.optional(), pick: z.array(z.string()).optional(), places: z.record(z.string(), LonLat).optional(),
  items: z.array(z.object({ where: Place, value: z.number(), label: z.string() }).strict()).optional(),
  mode: z.enum(['circle', 'bar']).optional(), maxSize: z.number().optional(), stagger: z.number().optional(), grow: z.number().optional(), color: ColorRef.optional(),
  /** label placement around each symbol (per label override) */
  labelPlace: z.enum(['below', 'right', 'left', 'above']).optional(),
  labelOverrides: z.record(z.string(), z.enum(['below', 'right', 'left', 'above'])).optional(),
}).strict();

const Split = z.object({
  type: z.literal('split'), ...base, territory: z.string(), before: z.union([z.number(), z.string()]), after: z.union([z.number(), z.string()]),
  tags: z.object({ before: z.string(), after: z.string() }).strict().optional(),
  slider: z.array(z.object({ at: TimeRefSchema, x: z.number() }).strict()).min(1),
}).strict();

const Army = z.object({
  type: z.literal('army'), ...base, data: DataRef.optional(), ref: z.string().optional(), waypoints: z.array(LonLat).optional(),
  /** arrival (default: 70% of the window) */
  arrive: TimeRefSchema.optional(),
  schedule: z.array(z.object({ at: TimeRefSchema, wp: z.number() }).strict()).optional(),
  side: Side.optional(), color: ColorRef.optional(), strength: z.array(z.object({ u: z.number(), men: z.number() }).strict()).optional(), menPerPx: z.number().optional(),
  label: z.string().optional(), showMen: z.boolean().optional(), labelAt: TimeRefSchema.optional(), labelUntil: TimeRefSchema.optional(),
  labelSide: z.enum(['left', 'right']).optional(), showPlanned: z.boolean().optional(),
}).strict();

const Front = z.object({
  type: z.literal('front'), ...base, data: DataRef.optional(),
  keys: z.array(z.object({ at: TimeRefSchema, line: z.array(LonLat).optional(), index: z.number().optional(), ease: z.number().optional() }).strict()).min(1),
  side: Side.optional(), color: ColorRef.optional(), hatch: z.enum(['left', 'right']).optional(), depth: z.number().optional(),
  label: z.string().optional(), labelU: z.number().optional(), labelAt: TimeRefSchema.optional(), labelUntil: TimeRefSchema.optional(),
}).strict();

const Battle = z.object({
  type: z.literal('battle'), ...base, data: DataRef.optional(), ref: z.string().optional(),
  where: Place.optional(), name: z.string().optional(), date: z.string().optional(), outcome: Side.optional(), color: ColorRef.optional(),
  icon: z.enum(['swords', 'star']).optional(), casualties: z.number().optional(), casualtiesLabel: z.string().optional(),
  countAt: TimeRefSchema.optional(), countDur: z.number().optional(), label: LabelPlace.optional(),
}).strict();

const Growth = z.object({
  type: z.literal('growth'), ...base, data: DataRef, drawSec: z.number().optional(),
  labels: z.array(z.object({ id: z.string(), u: z.number().optional(), ...Window, dx: z.number().optional(), dy: z.number().optional(), anchor: TextAnchor.optional() }).strict()).optional(),
}).strict();

const Cities = z.object({
  type: z.literal('cities'), ...base, data: DataRef, rScale: z.number().optional(), color: ColorRef.optional(),
  labels: z.array(z.object({ name: z.string(), ...Window, dx: z.number().optional(), dy: z.number().optional(), anchor: TextAnchor.optional() }).strict()).optional(),
}).strict();

const Rivers = z.object({ type: z.literal('rivers'), ...base, names: z.array(z.string()), shore: z.boolean().optional() }).strict();

const DotGroup = z.object({
  id: z.string(), label: z.string(), color: ColorRef,
  /** cohorts whose fields match all of these */
  select: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  cohorts: z.array(z.string()).optional(), count: z.union([z.number(), z.string()]).optional(),
  /** number shown (a number, or a "{path}" into the block's data) */
  value: z.union([z.number(), z.string()]).optional(), unit: z.string().optional(),
  weight: z.object({ keep: z.number(), of: z.number() }).strict().optional(), shuffle: z.number().optional(),
}).strict();
const Dots = z.object({
  type: z.literal('dots'), ...base,
  /** root object for "{path}" templates in labels/values */
  data: DataRef.optional(),
  cohorts: z.union([DataRef, z.array(z.object({ id: z.string(), count: z.number(), color: ColorRef.optional() }).passthrough())]).optional(),
  /** colour cohorts by one of their fields */
  cohortColor: z.object({ key: z.string(), map: z.record(z.string(), ColorRef) }).strict().optional(),
  formations: z.array(z.object({ at: TimeRefSchema, layout: z.enum(['blocks', 'hemicycle', 'bars', 'clusters']), colorBy: z.enum(['group', 'cohort']).optional(), groups: z.array(DotGroup).min(1) }).strict()).min(1),
  fly: z.number().optional(), stagger: z.number().optional(),
}).strict();

const Chain = z.object({
  type: z.literal('chain'), ...base, data: DataRef.optional(),
  cards: z.array(z.object({ title: z.string(), year: z.string(), because: z.string().optional(), source: z.string().optional() }).strict()).optional(),
  layout: z.enum(['snake', 'line']).optional(),
  /** land time per card (phrases), or a fixed step */
  land: z.array(TimeRefSchema).optional(), step: z.number().optional(), travel: z.number().optional(), accent: ColorRef.optional(),
  minCardW: z.number().optional(), maxCardW: z.number().optional(), gap: z.number().optional(), pillMaxW: z.number().optional(),
}).strict();

const RectRef = z.union([Rect, z.string()]);
const DocumentB = z.object({
  type: z.literal('document'), ...base, src: z.string(), imgW: z.number(), imgH: z.number(),
  rects: z.record(z.string(), Rect).optional(),
  camera: z.array(z.object({ at: TimeRefSchema, x: z.number(), y: z.number(), w: z.number(), ease: z.number().optional() }).strict()).min(1),
  highlights: z.array(z.object({ id: z.string(), rect: RectRef, ...Window, dur: z.number().optional(), kind: z.enum(['marker', 'box', 'underline']).optional() }).strict()).optional(),
  notes: z.array(z.object({ id: z.string(), text: z.string(), ...Window, x: z.number(), y: z.number(), width: z.number(), target: RectRef.optional(), tilt: z.number().optional() }).strict()).optional(),
  quote: z.object({
    rect: RectRef, ...Window, text: z.string(), cite: z.string(), width: z.number().optional(), top: z.number().optional(),
    hipp: z.array(z.object({ key: z.enum(['H', 'I', 'P', 'POV']), text: z.string(), at: TimeRefSchema }).strict()),
  }).strict().optional(),
}).strict();

const Costume = z.enum(['gentleman', 'continental', 'redcoat', 'woman', 'farmer']);
const Action = z.enum(['idle', 'walk', 'point', 'speak', 'cheer', 'argue']);
const ActionKey = z.object({ at: TimeRefSchema, action: Action, face: z.enum(['left', 'right']).optional(), target: z.tuple([z.number(), z.number()]).optional() }).strict();
const Characters = z.object({
  type: z.literal('characters'), ...base,
  backdrop: z.enum(['street', 'none']).optional(),
  sign: z.object({ lines: z.array(z.string()), x: z.number(), top: z.number() }).strict().optional(),
  cast: z.array(z.object({
    costume: Costume, x: z.union([z.number(), z.array(z.object({ at: TimeRefSchema, x: z.number() }).strict())]), baseline: z.number().optional(), height: z.number(),
    actions: z.array(ActionKey).optional(), face: z.enum(['left', 'right']).optional(), skin: z.number().optional(), phase: z.number().optional(),
    tag: z.object({ text: z.string(), ...Window }).strict().optional(), ...Window,
  }).strict()).min(1),
}).strict();

const Crowd = z.object({
  type: z.literal('crowd'), ...base, count: z.number(), x0: z.number(), x1: z.number(), baseline: z.number(), height: z.number(),
  seed: z.number().optional(), costumes: z.array(Costume).optional(), actions: z.array(ActionKey).optional(), stagger: z.number().optional(),
  rows: z.union([z.literal(1), z.literal(2)]).optional(), faceX: z.number().optional(),
}).strict();

const SummaryB = z.object({
  type: z.literal('summary'), ...base,
  rows: z.array(z.object({ left: z.string().optional(), arrow: z.string().optional(), right: z.string().optional(), text: z.string().optional(), color: ColorRef, at: TimeRefSchema.optional() }).strict()).min(1),
}).strict();

export const BLOCK_SCHEMAS = {
  ship: Ship, flow: Flow, spread: Spread, stowaways: Stowaways, place: PlaceB, site: Site, territory: Territory, line: LineB,
  numbers: Numbers, split: Split, army: Army, front: Front, battle: Battle, growth: Growth, cities: Cities, rivers: Rivers,
  dots: Dots, chain: Chain, document: DocumentB, characters: Characters, crowd: Crowd, summary: SummaryB,
} as const;
export type BlockType = keyof typeof BLOCK_SCHEMAS;
export const BLOCK_TYPES = Object.keys(BLOCK_SCHEMAS) as BlockType[];

const BlockSchema = z.discriminatedUnion('type', [
  Ship, Flow, Spread, Stowaways, PlaceB, Site, Territory, LineB, Numbers, Split, Army, Front, Battle, Growth, Cities, Rivers,
  Dots, Chain, DocumentB, Characters, Crowd, SummaryB,
]);

/* ------------------------------------ beats + plan ------------------------------------ */

const CameraKeySpec = z.object({ at: TimeRefSchema.optional(), center: Place, zoom: z.number().positive(), ease: z.number().optional() }).strict();
const TermItemSpec = z.union([z.string(), z.object({ text: z.string(), on: z.string() }).strict()]);

const BeatSchema = z.object({
  /** words in the narration that start the beat (first occurrence after the previous beat) */
  on: z.string().min(1),
  offset: z.number().optional(),
  /** date chip text for this beat (consecutive beats with the same date share one chip) */
  date: z.string().optional(),
  camera: z.union([z.literal('hold'), CameraKeySpec, z.array(CameraKeySpec)]).optional(),
  /** year-clock keys (drive territory / growth / cities / year counter); a number = reach that year over the first 1.2 s */
  clock: z.union([z.number(), z.string(), z.array(z.object({ at: TimeRefSchema.optional(), year: z.union([z.number(), z.string()]) }).strict())]).optional(),
  blocks: z.array(BlockSchema),
  terms: z.object({ heading: z.string(), items: z.array(TermItemSpec).min(1), color: ColorRef.optional(), until: TimeRefSchema.optional() }).strict().optional(),
  /** false: no captions for sentences that start in this beat */
  caption: z.literal(false).optional(),
  note: z.string().optional(),
}).strict();

const Speaker = z.string().min(1);
const NarrationSchema = z.union([
  z.object({ sentences: z.array(z.object({ speaker: Speaker, text: z.string().min(1) }).strict()).min(1) }).strict(),
  z.object({ file: z.string().min(1) }).strict(),
]);

export const PlanSchema = z.object({
  $schema: z.string().optional(),
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'lowercase letters, digits and dashes'),
  title: z.string().optional(),
  format: z.enum(['16:9', '9:16', '1:1']),
  fps: z.number().int().positive().optional(),
  narration: NarrationSchema,
  map: z.object({ projection: z.enum(['world', 'us']), extent: z.tuple([LonLat, LonLat]), states: z.boolean().optional() }).strict().optional(),
  places: z.record(z.string(), LonLat).optional(),
  routes: z.record(z.string(), RouteObj).optional(),
  beats: z.array(BeatSchema).min(1),
  style: z.object({ surface: z.enum(['parchment', 'night']) }).strict().optional(),
  /** music bed under public/ (default music/bed.mp3), false = none */
  music: z.union([z.string(), z.literal(false)]).optional(),
  /** narration captions (default true) */
  captions: z.boolean().optional(),
  note: z.string().optional(),
}).strict();

export type Plan = z.infer<typeof PlanSchema>;
export type Beat = z.infer<typeof BeatSchema>;
export type Block = z.infer<typeof BlockSchema>;
export type BlockOf<T extends BlockType> = Extract<Block, { type: T }>;
export type TimeRef = z.infer<typeof TimeRefSchema>;
export type CameraKeySpec = z.infer<typeof CameraKeySpec>;
export type PlaceSpec = z.infer<typeof Place>;
export type RouteSpec = z.infer<typeof Route>;

/* ------------------------------------ validation ------------------------------------ */

export interface PlanIssue { level: 'error' | 'warn' | 'info'; code: string; where: string; msg: string }

const pathStr = (p: readonly PropertyKey[]) => p.map(k => (typeof k === 'number' ? `[${k}]` : `.${String(k)}`)).join('').replace(/^\./, '') || '(plan)';

/** Validate a parsed JSON value. Unknown block types get PL002; everything else PL001. */
export function parsePlan(json: unknown): { plan?: Plan; issues: PlanIssue[] } {
  const r = PlanSchema.safeParse(json);
  if (r.success) return { plan: r.data, issues: [] };
  const issues: PlanIssue[] = [];
  for (const i of r.error.issues) {
    const where = pathStr(i.path);
    const unknownType = i.code === 'invalid_union' && i.path[i.path.length - 1] === 'type' && 'discriminator' in i;
    if (unknownType) {
      const got = getAt(json, i.path);
      issues.push({ level: 'error', code: 'PL002', where, msg: `unknown block type ${JSON.stringify(got)} (known: ${BLOCK_TYPES.join(', ')})` });
    } else {
      issues.push({ level: 'error', code: 'PL001', where, msg: i.message });
    }
  }
  return { issues };
}

function getAt(v: unknown, path: readonly PropertyKey[]): unknown {
  let cur = v;
  for (const k of path) cur = cur && typeof cur === 'object' ? (cur as Record<PropertyKey, unknown>)[k] : undefined;
  return cur;
}
