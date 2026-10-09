# Map views and period layers

A guide for building, testing, validating and using maps. Agents expanding the map set follow this page.

Maps are drawn by the renderer from data, never from a picture of a map. They come in two layers, kept apart on purpose:

| | **Map view** (`data/library/maps/<region>.json`) | **Period layer** (`data/library/geo/geo.<type>.<slug>@<year>.geojson`) |
|---|---|---|
| What | A *place*: a framing of a region (projection, extent, camera, tilt, ridges, timeless labels, named camera targets) | A *time*: one border, claim, colony or line as it was between two dates |
| Dated? | Never. Coastlines, lakes, rivers and mountains are the modern ones (reservoirs removed) | Always: `validFrom` / `validTo` |
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
  "focus": {"detroit": {"center": [-83.05, 42.33], "zoom": 2.4}}
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

3. **Validate, preview, look:** run `npm run maps -- validate`, then `npm run maps -- preview <id>`.
4. **Commit the view alone**, with the preview checked. Views need no review status: `validate` plus a looked-at preview is the bar.

## Building a period layer

A period layer is an ordinary library geo feature (docs/ASSET_LIBRARY.md) with a `layer` block:

```json
{
  "type": "Feature",
  "geometry": {"type": "Polygon", "coordinates": [[[-79.5, 46.3], [-64.3, 48.9], ...]]},
  "properties": {
    "id": "geo.region.province-of-quebec@1763",
    "type": "region",
    "name": "Province of Quebec (1763)",
    "validFrom": "1763-10-07",
    "validTo": "1774-06-22",
    "precision": "approximate",
    "sources": ["Royal Proclamation of 1763, boundary clause: ..."],
    "units": [3],
    "review": {"status": "candidate", "notes": "Verify against Kitchin 1763 before approving."},
    "layer": {"base": true, "side": "british", "label": "Province of Quebec", "labelAt": [-71.0, 48.3]}
  }
}
```

| Field | Rule |
|---|---|
| `id` | `geo.<region\|line\|route>.<slug>@<year>`, the year it begins. Points are never base layers (use places) |
| `validFrom` / `validTo` | Required, ISO dates, in order: the treaty, act or proclamation that made it true and the one that ended it. A map with `period: Y` draws it when `Y` lies between the two years, inclusive |
| `layer.side` | `british`, `french`, `spanish`, `native`, `united-states`, `mexico`, `confederacy` or `other`. The side picks the colour (`SIDE_COLORS` in `tools/pipeline/map-views.ts`), so every lesson shows the same power in the same colour |
| `layer.label`, `labelAt` | Optional name drawn at `[lon, lat]`. Put the spot inside the region and away from timeless labels |
| `precision` | `exact` (surveyed or treaty-defined), `approximate` (vertices at named landmarks) or `contested` (claims) |
| `sources` | Where every vertex comes from: the treaty text, a named period map, a historical atlas. A border without a source is not accepted |

**One state per file.** When a border moves (Quebec grows in 1774, Louisiana changes hands in 1762 and 1800), add a new file with the new dates and set the old file's `validTo`. Don't edit a geometry to a later state. Neighbouring layers in the same year shouldn't overlap unless the claim really was contested; mark that `precision: "contested"`.

**Getting it right.** Trace from a period map you can name, with vertices at landmarks the source names (river mouths, lakes, forts, parallels), at a resolution that reads at full-frame zoom: 15 to 60 vertices is plenty. Check the coordinates are `[lon, lat]`, with west negative.

**Review.** A new layer starts as `"status": "candidate"`. A storyboard map draws only `approved` layers, except in draft runs (`--draft`) and `maps preview`. To approve, a person compares the preview with the source map and sets `review.status` to `"approved"` (`verified` is the step between: an agent checked it against a source, but no person has yet). Agents never approve.

**Check it:** run `npx tsx tools/library.ts validate` and `npm run maps -- validate`. `validate` also reports a layer that no view covers. Then preview a view that covers it with `--period <a year inside its dates>`.

## Using maps in a storyboard

The director sees MAP VIEWS (id | name | focus targets) and MAP DATA (geo ids; base layers are marked with their years and "drawn by period"). A map visual:

```json
{"kind": "map", "map": {"view": "map.great-lakes", "period": 1763,
  "moves": [{"at": {"offset": 1.5}, "to": "detroit"}],
  "points": [{"at": {"offset": 2}, "place": "fort-detroit"}]},
 "at": {"phrase": "pontiac moved on detroit"}, "priority": "essential"}
```

- `period` is the year the *narration* is about, not the year of the lesson.
- `moves[].to` is a focus target of the view, or a place with a location.
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
