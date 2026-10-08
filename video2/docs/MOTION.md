# Motion building blocks (src/motion)

Scenes explain a **process** with movement instead of revealing text on slides. Everything
here is frame-driven, deterministic (seeded RNG, no `Math.random`, no CSS animation), and
tracked by the runtime layout guard.

## Core

| File | What |
|---|---|
| `world.tsx` | `<World spec camera>`: one map canvas (4800×2800 world px) + keyframed camera (`{t, center:[lon,lat], zoom, ease}`). `projection: 'world'` (Natural Earth) or `'us'` (Albers-style conic + state lines). `WorldLayer` = content pinned to the map; `useWorld()` → `{proj, cam, t, fps, frameW, frameH}`; `toScreen()`. |
| `primitives.tsx` | Shared tokens (`TYPE`, `SIZE`, `INK`, `HALO`, `SERIF`), `fadeWindow`, `rng`, `arc()` routes, `Ship`, `FlowArc`, `Spread`, `Stowaways`, `PlaceLabel`, `Parallax`/`Swell`/`Clouds`, `Slide`/`slideState` (directional entrances/exits). |
| `MotionScene.tsx` | Scene wrapper: root ref + `LayoutGuard` + vignette + fades. Every motion scene uses it. |

## Rules (the guard and reviewers enforce these)

1. **Constant screen size for anything readable.** In world space multiply by `k = 1 / cam.s`
   (labels, dots, ships, stroke widths of symbols). Only geography scales with the camera.
2. **Type scale = `TYPE` tokens** (screen px at 1280×720). One serif (`SERIF`), ink `INK`,
   halo `HALO` (`paintOrder="stroke"`). No ad-hoc font sizes.
3. **One path per route.** Anything that travels a route (ship, army, particles) uses the same
   `arc()`/path as the line drawn for it.
4. **Labels live only in their time window** (`fadeWindow`). Nothing lingers into a later section.
   Panels open with their first item (never empty) and size to their longest item.
5. **Tracking.** The `<World>` sits in `<Track id="world" role="cover">`. Every readable world
   element carries `data-guard-item="kind:name"` (label, ship, pill, marker). Each screen
   overlay zone (date chip, term list, summary, caption…) is its own `<Track>`, inside the 5%
   safe area. The guard reports: `cut` (item partly off-frame), `overlap` (item×item,
   item×zone, zone×zone), `overflow` (text spilling out of its panel), `clipped`, `empty`
   (panel visible, text not yet), `unsafe`.
6. **Facts.** Historical data (dates, borders, counts) lives in `src/data/motion/*.json` with a
   `source` per entry; follow docs/FACT_STANDARDS.md. Approximations are labelled as such.
7. **Entrances/exits have direction.** Screen elements come in from and leave toward a side
   with `<Slide at from out to>` (left/right/up/down/fade; small overshoot in, accelerate out).
   Pick the side that matches the story (westward cargo from the right moving left, captions
   from the bottom). Slide marks itself `data-guard-moving` while in transit, and `World` marks
   its map layers moving during camera moves; the guard skips transit frames and judges the
   settled layout.
8. **Interpolation safety.** Never build a 4-point `interpolate` range from independent
   times; use `fadeWindow` (in/out computed separately).

## Verifying without a browser

- `npx tsc --noEmit -p tsconfig.json`, `npx eslint <files>`, `npm test`.
- Server-render every frame to catch runtime errors:
  `renderToString(<Thumbnail component={X} … frameToDisplay={f} />)` from `@remotion/player`.
- Then render in Chrome (`npm run render:<id>`) and read the guard summary it prints.
