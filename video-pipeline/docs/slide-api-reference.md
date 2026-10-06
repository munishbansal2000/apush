# Slide API Reference (auto-generated from code)

> DO NOT EDIT MANUALLY. Regenerate with:
> `python3 tools/gen_slide_docs.py`

## BulletSlide
_Title + bullets that reveal one by one._

- **title** (required)
- **bullets** (required)
- *duration* = `None`
- *accent* = `(255, 176, 66)`
- *bg* = `None`
- *stagger* = `1.25`

## CalloutSlide
_Hold the full image, then zoom into labeled regions one by one._

- **image** (required)
- **callouts** (required)
- *intro_hold* = `1.0`
- *zoom_hold* = `1.8`
- *move_dur* = `0.9`
- *duration* = `None`
- *accent* = `(255, 176, 66)`
- *start_wide* = `True`

## CausalChainSlide
_Cause-and-effect chain: node cards pop in left to right while hand-drawn_

- **nodes** (required)
- *title* = `''`
- *duration* = `None`
- *accent* = `(255, 176, 66)`
- *bg* = `None`
- *stagger* = `0.9`
- *arrow_dur* = `0.7`

## CollageSlide
_Scrapbook layout: photo cards + center banner + marker text notes._

- *cards* = `()`
- *banner* = `''`
- *notes* = `()`
- *duration* = `None`
- *stagger* = `0.7`
- *banner_fill* = `(211, 47, 47)`
- *bg* = `None`

## CompareSlide
_Banner header + two-column comparison, review-video style._

- **title** (required)
- **left** (required)
- **right** (required)
- *duration* = `None`
- *stagger* = `1.0`
- *banner_fill* = `(211, 47, 47)`
- *bg* = `None`

## DisplayPointsSlide
_Huge punchy display points over a drifting background._

- **points** (required)
- *title* = `''`
- *bg* = `None`
- *duration* = `None`
- *stagger* = `1.7`

## DuoSlide
_Two panels side by side — the classic "we will look at two people"._

- **left** (required)
- **right** (required)
- *bg* = `None`
- *duration* = `None`
- *stagger* = `0.8`

## EraCardSlide
_Design title card contextualized by APUSH unit._

- **title** (required)
- *kicker* = `''`
- *subtitle* = `''`
- *boxes* = `()`
- *footer* = `''`
- *unit* = `1`
- *duration* = `6.0`

## HighlightSlide
_Bold paper-style statement with red marker highlights._

- **text** (required)
- *card* = `None`
- *duration* = `None`
- *bg* = `None`
- *stagger* = `0.8`
- *ink* = `None`

## ImageSlide
_Full-bleed image with a slow drift, title + caption over scrims._

- **image** (required)
- *caption* = `''`
- *title* = `''`
- *duration* = `5.0`
- *drift* = `((0.5, 0.5, 1.0), (0.52, 0.5, 0.82))`

## KenBurnsSlide
_Full-bleed camera tour through a list of views, with title + caption._

- **image** (required)
- **stops** (required)
- *hold* = `1.2`
- *title* = `''`
- *caption* = `''`
- *duration* = `None`

## MapZoomSlide
_Zoom-to-location tour over a map, with pulsing map pins._

- **map_image** (required)
- **markers** (required)
- *intro_hold* = `1.2`
- *zoom_hold* = `2.2`
- *move_dur* = `1.0`
- *duration* = `None`
- *accent* = `(226, 74, 74)`
- *start_wide* = `True`

## QuoteSlide
_Centered serif pull-quote._

- **quote** (required)
- *byline* = `''`
- *duration* = `4.5`
- *accent* = `(255, 176, 66)`
- *bg* = `None`

## RecallSlide
_Self-test beat: a question up top, answers rendered blurred that sharpen_

- **question** (required)
- **answers** (required)
- *duration* = `None`
- *bg* = `None`
- *stagger* = `1.4`
- *blur_px* = `14`

## RevealSlide
_Heimler-style reveal slide: title banner + numbered points that_

- **title** (required)
- **points** (required)
- *duration* = `10.0`
- *chars_per_sec* = `28`
- *banner_fill* = `(211, 47, 47)`
- *bg* = `None`

## RouteSlide
_Animated travel route over a map._

- **map_image** (required)
- **waypoints** (required)
- *zoom* = `2.6`
- *hold* = `1.6`
- *move_dur* = `1.8`
- *duration* = `None`
- *accent* = `(255, 176, 66)`
- *line_width* = `6`
- *curvature* = `0.16`
- *start_wide* = `False`

## SpectrumSlide
_Position-on-a-spectrum visualizer: an axis with end labels, markers that_

- **axis** (required)
- **markers** (required)
- *title* = `''`
- *duration* = `None`
- *bg* = `None`
- *stagger* = `1.0`

## SplitSlide
_Image on one half, text panel on the other._

- **image** (required)
- **heading** (required)
- **body** (required)
- *side* = `'left'`
- *duration* = `5.5`
- *accent* = `(255, 176, 66)`
- *bg* = `None`

## StaggerSlide
_Panels slide in at timed cues — generic staggered entrance._

- **panels** (required)
- *title* = `''`
- *entrance_dur* = `0.6`
- *duration* = `5.0`
- *bg* = `None`

## StatSlide
_Big animated count-up number._

- **value** (required)
- **label** (required)
- *prefix* = `''`
- *suffix* = `''`
- *decimals* = `0`
- *duration* = `4.0`
- *accent* = `(255, 176, 66)`
- *bg* = `None`

## StepsSlide
_Numbered points: big accent numerals, staggered reveal._

- **title** (required)
- **steps** (required)
- *duration* = `None`
- *accent* = `(255, 176, 66)`
- *bg* = `None`
- *banner* = `None`
- *banner_fill* = `(211, 47, 47)`
- *stagger* = `1.6`

## TacticalSlide
_Animated tactical diagram: two forces, one closing in on the other._

- *title* = `''`
- *blue_label* = `''`
- *red_label* = `''`
- *red_start* = `1.0`
- *red_end* = `4.0`
- *n_blue* = `12`
- *n_red* = `28`
- *duration* = `10.0`
- *bg* = `None`

## TerritorySlide
_One map, borders filling in over time: territories appear in sequence_

- **map_image** (required)
- **territories** (required)
- *title* = `''`
- *duration* = `None`
- *bg* = `None`
- *stagger* = `1.6`
- *drift* = `False`

## TitleCardSlide
_Postcard title: script kicker + giant heavy title over full-bleed art._

- **image** (required)
- **title** (required)
- *kicker* = `''`
- *title_fill* = `(18, 18, 20)`
- *kicker_fill* = `(52, 130, 120)`
- *duration* = `4.5`
- *drift* = `((0.5, 0.5, 1.0), (0.52, 0.5, 0.85))`

## TitleSlide
_Big centered title, staggered word entrance, breathing glow._

- **title** (required)
- *subtitle* = `''`
- *duration* = `4.5`
- *accent* = `(255, 176, 66)`
- *bg* = `None`
