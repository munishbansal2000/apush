# Remotion APUSH Component Library

**Realism bar:** Photorealistic AI-generated assets. No cartoon geometry, no circles with initials, no flat SVG shapes.
**Tone system:** `serious` (real) vs `fun` (semi-cartoon) via `ToneProvider`.
**Validation:** Canvas-level object tracking on every component. No overlaps, no clipping, no bad rendering.

## Characters (Realistic + Cartoon)

### Assets in `public/`
| Asset | Description |
|-------|-------------|
| `maya-real.webp` | Photorealistic Maya (serious) |
| `maya-toon.webp` | Semi-cartoon Maya (fun, neutral) |
| `maya-toon-happy.webp` | Maya excited/happy |
| `maya-toon-serious.webp` | Maya thoughtful/serious |
| `maya-toon-surprised.webp` | Maya surprised |
| `marcus-real.webp` | Photorealistic Marcus |
| `hamilton-real.webp` | Photorealistic Hamilton |
| `hamilton-toon.webp` | Semi-cartoon Hamilton (neutral) |
| `hamilton-toon-angry.webp` | Hamilton angry/determined |
| `hamilton-toon-smug.webp` | Hamilton smug/confident |
| `jefferson-real.webp` | Photorealistic Jefferson |
| `tallship-real.webp` | Photorealistic 18th-century tall ship |
| `ocean-real.webp` | Photorealistic dramatic ocean |
| `apush-revolution-bg.webp` | Revolutionary War background |
| `apush-colonial-bg.webp` | Colonial settlement background |

## Components

### TalkingHead
Realistic talking head with life (sway, breathing, lean-in, excitement pulse).
```tsx
<ToneProvider tone="serious"> {/* or "fun" */}
  <TalkingHead
    speakerName="Maya"
    speakerColor="#c9a227"
    position="bottom-right"  // left | right | bottom-left | bottom-right | fullscreen
    size={0.32}
    speaking={true}
    showName={true}
    assetPair={{
      realistic: staticFile('maya-real.webp'),
      stylized: staticFile('maya-toon.webp'),
    }}
    // OR mood switching:
    moodAssets={{
      happy: staticFile('maya-toon-happy.webp'),
      serious: staticFile('maya-toon-serious.webp'),
      surprised: staticFile('maya-toon-surprised.webp'),
    }}
    mood="happy"
    frameStyle="circle"  // circle | rounded | full
  />
</ToneProvider>
```

### Duel
Two historical figures facing off. Real portraits, lean/bob/tilt animation.
```tsx
<Duel
  left={{
    name: 'Hamilton',
    color: '#2c5aa0',
    imageSrc: staticFile('hamilton-real.webp'),
    argument: 'Strong central government!',
  }}
  right={{
    name: 'Jefferson',
    color: '#a02c2c',
    imageSrc: staticFile('jefferson-real.webp'),
    argument: "States' rights!",
  }}
  variant="ideas"  // ideas | standoff
  climaxAt={120}
/>
```

### Ship
Photorealistic tall ship with ocean motion, cannon fire.
```tsx
<Ship
  shipName="Santa María — 1492"
  variant="sail"  // sail | battle
  fireAt={45}     // battle only
/>
```

### SpeechBubble (Heimler-style)
Comic speech bubble over historic images. Uses your 10 hand-drawn bubble art.
```tsx
<SpeechBubble
  text="Still want to be British?"
  position={[0.14, 0.88]}  // [x, y] fractions
  art="oval-hatched"  // or 'random' for variety
  randomSeed={3}      // same seed + text = same bubble (no flicker)
  width={260}
  fontSize={24}
  at={50}
/>
```
Art options: `oval-hatched`, `circular-hatched`, `circular-1/2/3`,
`cloud`, `cloud2` (thought), `rect`, `rect2`, `rounded`, `random`.

### TitleCard (Heimler-style)
Bold red banner title.
```tsx
<TitleCard
  kicker="ACT I:"
  title="CAUSES OF THE AMERICAN REVOLUTION"
  subline="SCENE III: REVOLUTIONARY IDEALS"
  bgColor="#d32f2f"
  at={10}
/>
```

### Callout
Speech/thought/label/annotation callouts for talking heads.
```tsx
<Callout
  text="The pile WAS the wealth"
  anchor={[0.68, 0.50]}
  position="top"  // top | bottom | left | right
  variant="speech"  // speech | thought | label | annotation
  at={20}
/>
```

### Argument
Two characters in heated debate (uses CharacterFace SVG — needs realistic upgrade).
```tsx
<Argument
  left={{ name: 'Federalist', color: '#2c5aa0', ... }}
  right={{ name: 'Anti-Federalist', color: '#a02c2c', ... }}
  phrases={['We need unity!', 'Tyranny!']}
  intensity={7}  // 1-10
/>
```

## Validation System

### AutoLayout (priority-based, deterministic)
The reusable auto-layout system. Wrap scenes with the provider, components declare positions.

```tsx
import { AutoLayoutProvider, useAutoLayout, Priority } from '../validation/AutoLayout';

// In scene:
<AutoLayoutProvider debug={false}>
  <TitleCard ... />
  <SpeechBubble ... />
</AutoLayoutProvider>

// In component:
const { x, y } = useAutoLayout(
  'my-element',   // unique id
  rawX, rawY,     // desired top-left
  width, height,  // size
  Priority.BUBBLE // higher = less likely to move
);
// Render at x, y — automatically nudged to avoid overlaps
```

**Priorities** (higher stays put):
- `Priority.TITLE` (100) — main titles, never move
- `Priority.SUBLINE` (90) — subtitles
- `Priority.CHARACTER` (80) — talking heads, duelists
- `Priority.BUBBLE` (50) — speech bubbles, callouts move to avoid text
- `Priority.CALLOUT` (40)
- `Priority.DECORATION` (10)
- `Priority.BACKGROUND` (0)

**How it works:**
1. Components declare desired positions via `useAutoLayout`
2. Pure `resolveLayout()` computes adjustments (no effects, deterministic)
3. Lower-priority elements move to avoid higher-priority ones
4. Everything clamped to canvas bounds
5. Debug overlay (`debug={true}`) shows all elements with priorities and adjustments

**Intentional overlaps** — sometimes overlap is fine (bubble tails over characters,
decorations over backgrounds). Declare it:
```tsx
const { x, y } = useAutoLayout('bubble-tail', x, y, w, h, Priority.BUBBLE,
  'text', text,
  { allowOverlapWith: ['duelist-left'] }  // this bubble may overlap that character
);
// Or group several elements:
const { x, y } = useAutoLayout('deco-1', x, y, w, h, Priority.DECORATION,
  'shape', undefined,
  { overlapGroup: 'background-deco' }  // never pushes against others in group
);
```

### CanvasTrackerProvider (legacy)
Cross-component overlap detection. Still available but AutoLayout is preferred.

### ToneProvider
Set narrative context for scene.
```tsx
<ToneProvider tone="serious">  {/* serious | fun | dramatic | playful */}
  {/* components auto-switch assets */}
</ToneProvider>
```
- `serious`/`dramatic` → realistic assets
- `fun`/`playful` → stylized assets

## Demo Scenes (Root.tsx)

| ID | Description |
|----|-------------|
| SceneTalkingHead | Serious Maya + callouts |
| SceneTalkingHeadFun | Fun (toon) Maya |
| SceneMayaMoods | Happy/Serious/Surprised showcase |
| SceneHeimlerStyle | TitleCard + SpeechBubble |
| SceneDuel | Hamilton vs Jefferson |
| SceneArgument | Federalist debate |
| SceneShip | Tall ship sailing |
| SceneShipBattle | Ship with cannons |

### PhotoPin
Pinned historic photo — tape corners, pin, handwritten caption. Not a frame.
```tsx
<PhotoPin
  src="apush-colonial-bg.webp"
  position={[0.22, 0.35]}
  width={380}
  rotation={-4}
  caption="Jamestown, 1607"
  at={10}
/>
```

### DocumentOverlay
Torn parchment document with wax seal resting on the scene.
```tsx
<DocumentOverlay
  src="charter.webp"
  position={[0.72, 0.62]}
  width={280}
  caption="Colonial charter"
  at={40}
/>
```

### MapArrow
Hand-drawn brushstroke arrow with draw-on animation. Not geometric.
```tsx
<MapArrow
  d="M 40,240 C 120,200 200,160 320,100"
  color="#c9a227"
  offset={[700, 80]}
  at={70}
/>
```

### TextCallout
Bold text stamped directly on the image. No box, no bubble.
```tsx
<TextCallout
  text="No taxation without representation"
  position={[0.5, 0.12]}
  entrance="stamp"  // stamp | fade | typewriter
  at={120}
/>
```

### CutoutFigure
Historical figure with torn-paper edges (not white border).
```tsx
<CutoutFigure
  src="hamilton-real.webp"
  name="Hamilton"
  side="right"  // hugs frame edge
  at={140}
/>
```

## Key Principles

1. **Never blank backgrounds** — use `DefaultBackground` or historic images
2. **Realism** — photorealistic for serious, semi-cartoon for fun. No geometric shapes.
3. **Life** — every static image gets procedural motion (sway, bob, breathe, lean)
4. **Validation** — every visual element tracked at canvas level
5. **Context** — `ToneProvider` captures serious/fun/dramatic/playful per scene
