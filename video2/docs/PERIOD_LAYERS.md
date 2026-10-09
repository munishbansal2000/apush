# Period layers: the agent guide

Period layers are the dated borders, claims and lines drawn on map views (docs/MAP_VIEWS.md explains views). A storyboard map with `"period": 1763` draws every approved layer that held at the end of 1763. This page is the full workflow for agents that plan, trace and check layers, and for the person who approves them.

```
plan (periods.json)  ->  trace (one geo file)  ->  validate  ->  preview  ->  verify (agent)  ->  approve (person)
```

## What exists

| File | What it is |
|---|---|
| `data/library/periods.json` | **The worklist.** `layers`: every layer the book needs (id, side, dates, units, priority, sources to trace from). `snapshots`: the years whose maps must be complete, each listing the layers that make it |
| `data/library/geo/<id>.geojson` | One file per layer: the geometry plus properties. A file fulfils the worklist entry with the same id |
| `npm run maps -- status` | Per snapshot: `[ ]` missing, `[c]` candidate, `[v]` verified, `[x]` approved. Ends with the next layers to trace, priority first |
| `npm run maps -- validate` | Every rule on this page (exit 1 on any error; `~` lines are warnings for a person) |
| `npm run maps -- layer-preview <id>` | Renders the layer, with everything else valid on its first day, on the view that fits it best → `out/review/maps/` |
| `npm run maps -- preview <view> --period <year or date>` | A whole snapshot on one view |
| `npm run maps -- review <id> verify\|approve\|reject\|candidate --note "..."` | Records a review decision in the file (`verify` and `approve` refuse a layer that doesn't validate) |

## Time rules (read these first)

- A layer holds from `validFrom` (inclusive) **to** `validTo` (exclusive). Leave `validTo` out if the layer is still true at the end of the course.
- A period that is a year means **the end of that year**: `1763` is after the Proclamation (October), and `1861` is after the eleventh state seceded (June). A period that is an ISO date means that day: `"1763-03-01"` is after the Treaty of Paris but before the Proclamation.
- **One state per file.** When a border moves, the old file gets `validTo` = the day of the change, and a new file (same slug, new year) starts that day. This is a chain: `united-states@1783 → @1803 → @1821 → …`. In a chain, `validTo` of one state equals `validFrom` of the next. A gap is allowed if nothing held the ground (it is reported as a warning). An overlap is an error.
- The id's year is the year of `validFrom`: `geo.region.mexico@1836` starts in 1836.
- Use the **legal** date (treaty signed, act passed, effective date), and say which one in the sources. When signing and taking effect differ by more than a few months (Adams-Onís: signed 1819, effective 1821), choose the one the narration will mean, and note the other.

## Space rules

- A region is a `Polygon` or `MultiPolygon` in `[lon, lat]` degrees, with west longitudes negative. Rings must be closed (the first position equals the last) and must not cross themselves.
- Use 8 to about 400 vertices per region. It must read at full frame; the renderer does not need more. Lines and routes are `LineString`.
- Winding order doesn't matter (the renderer fixes it).
- **Neighbours share a border.** Two layers that hold at the same moment must not overlap by more than a sliver (`validate` samples the overlap). Trace a shared border once and copy its vertices into both files. A real dispute (the Ohio Country in 1750, Texas's Rio Grande claim, the Confederacy over the Union) is marked `"precision": "contested"` on the claimant's layer. Contested overlaps are drawn, and the later layer draws on top.
- When a border follows a modern one (Mexico after 1853, the Confederacy as eleven states, the lower 48 after 1853), build it from Natural Earth outlines (public domain; `src/data/geo/us-states-10m.json` has the states) instead of tracing by hand.
- `layer.labelAt` must be inside the region, clear of the view's timeless labels.

## Planning agent: extend the worklist

Task: make sure the book's maps can be drawn. Add layers and snapshots to `data/library/periods.json`. Don't create geo files.

1. Read the lesson scripts (`data/<lesson>/script.json`, or the unit's scripts) and list each moment a map would show: treaties, purchases, cessions, secession, territorial acts.
2. For each moment, decide whether a **snapshot** is needed (a year whose whole map must be right), or just a **layer** in an existing snapshot.
3. Each new layer needs:
   - `id`, `name`;
   - `side` (`british`, `french`, `spanish`, `native`, `united-states`, `mexico`, `confederacy` or `other`);
   - `validFrom`, and `validTo` unless it is still true;
   - `units`;
   - `priority`: 1 if a lesson's narration needs it, 2 if it completes a snapshot, 3 for background;
   - `sources`: the treaty clause and named period maps to trace from;
   - `notes`: what's in and out, and whether it is contested.
4. Keep chains continuous: when you add `x@1830`, set the previous state's `validTo` to its `validFrom`.
5. Run `npm run maps -- validate`. The worklist must be clean before you hand off.
6. If no view covers a new layer (e.g. Pacific or overseas layers), say so; a map-view agent adds the view first (docs/MAP_VIEWS.md).

## Tracing agent: fulfil one layer

Task: one worklist id → one file, `data/library/geo/<id>.geojson`. Take the next id from `npm run maps -- status`. Work on one layer at a time, and don't take a layer another agent has open.

1. Copy the entry's `id`, `name`, `side`, `validFrom`, `validTo` and `units` **exactly** (validate compares them with the worklist).
2. Find the source (a treaty text, a named period map, the USGS "Territorial Acquisitions" map, Natural Earth for modern borders). Place vertices at the landmarks the source names: river mouths, lakes, forts, parallels.
3. For each neighbour that holds at the same time and already has a file, reuse its border vertices exactly.
4. Write the file:

```json
{
  "type": "Feature",
  "geometry": {"type": "Polygon", "coordinates": [[[-89.1, 36.5], [-88.0, 35.0], "...", [-89.1, 36.5]]]},
  "properties": {
    "id": "geo.region.united-states@1783",
    "type": "region",
    "name": "United States (Treaty of Paris)",
    "validFrom": "1783-09-03",
    "validTo": "1803-04-30",
    "precision": "approximate",
    "sources": ["Treaty of Paris 1783, article 2: ...", "USGS National Atlas, Territorial Acquisitions (public domain): vertices at ..."],
    "units": [3, 4],
    "review": {"status": "candidate", "notes": "What is approximate and why; what a reviewer should compare."},
    "layer": {"base": true, "side": "united-states", "label": "United States", "labelAt": [-82.0, 38.5]}
  }
}
```

5. Run `npx tsx tools/library.ts validate` and `npm run maps -- validate`. Fix every error that names your layer.
6. Run `npm run maps -- layer-preview <id>` and look at the sheet:
   - the shape matches the source;
   - borders with neighbours meet;
   - the label sits inside the region and is readable;
   - nothing is drawn in the sea that should be land, or the reverse.
7. Report back: the file, the sources, the preview path, and anything approximate. Leave the status as `candidate`.

## Checking agent: verify a layer

Task: an independent check by an agent that did **not** trace the layer.

1. Open the preview (`npm run maps -- layer-preview <id>`) next to the source the file names.
2. Check the dates against the treaty or act and the side, then the vertices at three or more named landmarks. Check the neighbours too: preview the snapshot with `npm run maps -- preview <view> --period <year>`.
3. If it is right, run `npm run maps -- review <id> verify --note "checked against <source>: <what>"`. If it is wrong, run `npm run maps -- review <id> candidate --note "<what is wrong>"` and leave the fix to a tracing agent.

## Approving (a person)

Agents never approve. A person looks at the snapshot preview, then runs `npm run maps -- review <id> approve` (or `reject --note "..."`). Storyboard maps draw only approved layers, except in `--draft` runs and in previews, which draw candidates too, so work in progress can be seen in context.

## Every rule `validate` enforces

| Rule | Where |
|---|---|
| Worklist id `geo.<region\|line\|route>.<slug>@<year>`, the year equals `validFrom`'s; known side; ISO dates in order; units 1-9; priority 1-3; sources | worklist |
| Chains: no overlap, no open state followed by another; gaps warned | worklist |
| Snapshots: known views; every layer listed, valid at the end of the year, at most one state per chain | worklist |
| A base-layer file is listed in the worklist and matches its side and dates | files |
| Geometry type fits the type; `[lon, lat]` in range; rings closed, at least 4 positions, not self-crossing; at least 8 vertices per region, at most 3000 in all; label inside; regions need a label | files |
| Some map view covers it | files |
| Different chains overlapping at the same moment: an error, or a warning when one is `contested` | files |
| Layer schema (`layer.base`, side, `validFrom`, `labelAt` shape, no points) | `tools/library.ts validate` |

Code: `tools/pipeline/periods.ts` (worklist and checks), `periodLayers` in `tools/pipeline/map-views.ts` (drawing), `tests/periods.test.ts`.
