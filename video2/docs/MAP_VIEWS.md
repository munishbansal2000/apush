# Map views and period layers

A guide for building, testing, validating and using maps. Agents expanding the map set follow this page.

Maps are drawn by the renderer from data, never from a picture of a map. They come in two layers, kept apart on purpose:

| | **Map view** (`data/library/maps/<region>.json`) | **Period layer** (`data/library/geo/geo.<type>.<slug>@<year>.geojson`) |
|---|---|---|
| What | A *place*: a framing of a region (projection, extent, camera, tilt, ridges, timeless labels, named camera targets) | A *time*: one border, claim, colony or line as it was between two dates |
| Dated? | Never. Coastlines, lakes, rivers and mountains are the modern ones (reservoirs removed) | Always: from `validFrom` to `validTo` (see PERIOD_LAYERS.md) |
| Reused by | Every lesson set in that region, 1491 to 1980 | Every map whose `period` falls inside its dates and whose view overlaps it |
| Example | `map.great-lakes` | `geo.region.province-of-quebec@1763` (1763-10-07 to 1774-06-22) |

A storyboard map names a view and, optionally, a year: `{"view": "map.eastern-north-america", "period": 1763}`. The build then draws every **approved** base layer valid in 1763 that overlaps the view: regions tinted by side, lines dashed, labels at their label spot. Whatever the storyboard adds (`fills`, `lines`, `points`, `labels`, `moves`) is drawn on top. If the storyboard fills a base layer itself, only the storyboard's copy is drawn.

## Commands

```bash
npm run maps -- list                                  # views (with focus targets) and period layers (with years and review status)
npm run maps -- validate                              # every rule below; exit 1 on any problem
npm run maps -- preview map.great-lakes               # stills of the opening framing and each focus target
npm run maps -- preview map.eastern-north-america --period 1763   # the same, with that year's layers (drafts included)
npm run maps -- preview all
npm run maps -- status                                # period layers: missing / in review / approved, per snapshot year
npm run maps -- layer-preview geo.region.province-of-quebec@1763
npx tsx tools/library.ts validate                     # geo schema, including the layer fields
npm test                                              # tests/map-views.test.ts runs validate on the whole library
```

`preview` renders with the real renderer (Chrome; set `REMOTION_BROWSER` like any render). It writes `out/review/maps/<region>[-<year>].png`, a tiled sheet, with a `.txt` legend (still 1 = opening, then one still per focus target). **Look at the sheet.** A view passes when the opening framing reads at a glance, every focus target lands on what it names, labels don't collide, and nothing important is cut off at the frame edge.

## Building a map view

1. **Pick a region, not a lesson.** Ask: "which lessons, across all nine units, are set here?" A good view serves at least three. Before you add one, check `npm run maps -- list`: widen or add focus targets to an existing view rather than making a near-duplicate.
2. **Write `data/library/maps/<region>.json`:**

```json
{
  "id": "map.great-lakes",
  "name": "The Great Lakes and their forts",
  "projection": "us",
  "extent": [[-92, 39.5], [-73.5, 48]],
  "camera": {"center": [-82.5, 43.5], "zoom": 1.1},
  "tilt": 20,
  "terrain": {"ridges": ["geo.line.appalachian-crest"], "rivers": true},
  "labels": [{"text": "Lake Erie", "lonlat": [-81.2, 42.2], "style": "ocean"}],
  "focus": {
    "detroit": {"center": [-83.05, 42.33], "zoom": 2.4},
    "lakes": {"center": [-82, 44], "zoom": 1.5, "region": {"states": ["MI"], "label": "Michigan", "labelAt": [-84.6, 43.6], "color": "gold"}}
  }
}
```

| Field | Rule |
|---|---|
| `id` | `map.<region>`: lowercase, hyphens, **no year**. The file name is the id without `map.` plus `.json` |
| `name` | What the region is, at most 100 characters. The director reads it to choose a view, so name what is in the frame ("Champlain-Hudson corridor, Montreal to New York") |
| `projection` | `us` (conic, North America) or `world` (Atlantic and beyond) |
| `extent` | `[[west, south], [east, north]]` in degrees, at least 0.5° by 0.3°. Leave a margin: the camera tilts and zooms inside it |
| `camera` | The opening framing: `center` inside the extent, `zoom` 1 to 3 (1 = the whole extent) |
| `tilt` | 0 to 35 degrees. Around 20 gives the "table map" look; 0 is flat |
| `terrain.ridges` | LineString geo ids drawn as relief (they must exist in `data/library/geo`). `rivers: true` draws the major rivers |
| `labels` | **Timeless only**: oceans, lakes, rivers, mountain ranges. `style` is `region`, `ocean` or `town`; each label sits inside the extent. No dated names ("New France", "Province of Quebec", "Indian Reserve"): those are period layers |
| `focus` | Named camera targets for `moves`: lowercase-hyphen names, centres inside the extent, zoom 1 to 4. Name them after what a narrator says ("fort-pitt", "bay-mouth", "frontier"). At least one |
| `focus.<name>.region` | Optional: what a move with `"highlight": true` fills and names. Either `{"states": ["MA", "NH"], ...}` (US postal codes, `us` projection) or `{"geo": "<library polygon id>", ...}`, plus `label` (timeless, no year), `labelAt` inside the extent, and an optional `color` (a map colour name or `#rrggbb`). Give a region to every target a narrator names as a region ("New England", "the Ohio Valley") |

3. **Validate, preview, look:** run `npm run maps -- validate`, then `npm run maps -- preview <id>`.
4. **Commit the view alone**, with the preview checked. Views need no review status: `validate` plus a looked-at preview is the bar.

## Building a period layer

Period layers have their own guide: **[PERIOD_LAYERS.md](PERIOD_LAYERS.md)**. It covers the worklist (`data/library/periods.json`), the planning, tracing and checking roles, the time and space rules, and review. In short:
- a layer is a library geo feature with a `layer` block (`side`, `label`, `labelAt`);
- each file holds one state, from `validFrom` (inclusive) to `validTo` (exclusive, or omitted if still true);
- it must be planned in the worklist first;
- only `approved` layers are drawn outside `--draft`.

## Using maps in a storyboard

The director sees MAP VIEWS (id | name | focus targets) and MAP DATA (geo ids; base layers are marked with their years and "drawn by period"). A map visual:

```json
{"kind": "map", "map": {"view": "map.great-lakes", "period": 1763,
  "moves": [{"at": {"offset": 1.5}, "to": "detroit"}],
  "points": [{"at": {"offset": 2}, "place": "fort-detroit"}]},
 "at": {"phrase": "pontiac moved on detroit"}, "priority": "essential"}
```

- `period` is the moment the *narration* is about, not the year of the lesson: a year means the map at the end of that year, and `"1763-03-01"` is a precise day inside a year of change.
- `moves[].to` is a focus target of the view, or a place with a location. On a target with a region (marked `*` in the director's list), `"highlight": true` fills and labels it as the camera arrives; a colour name instead of `true` overrides its colour.
- Add only what the words point at. The era's borders arrive with `period`.
- Variety rules (enforced): the same view at most twice per act and three times per lesson (the lesson limit is a warning); at most 3 maps in a row.

## Scanned period maps

A real 1755 Mitchell map or 1763 Kitchin map is a **picture**, not a map view. It enters the lesson like any other image (the image catalog, `images.json`), and the storyboard uses it as `kind: "image"`, framed and moved like a painting. That suits "this is what Londoners looked at". For "here is where the line ran", use a drawn map with `period`: it is legible, consistent across lessons, and can be animated.

## Where things are

| | |
|---|---|
| `tools/pipeline/map-views.ts` | `validateMapView`, `periodLayers`, `expandMapViews`, `SIDE_COLORS` |
| `tools/maps.ts` | the `maps` command |
| `src/library/validate.ts` | `validateGeo` (layer fields) |
| `src/motion/natural-lakes.ts` | Natural Earth lakes minus modern reservoirs |
| `tests/map-views.test.ts` | tests for the rules on this page |
