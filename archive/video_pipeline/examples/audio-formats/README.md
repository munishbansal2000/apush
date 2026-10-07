# Audio Format Examples — U3-L3 (Taxation Without Representation)

Four finished format prototypes for the APUSH audio curriculum, all built 2026-10-04.
Same verified historical content, four different treatments.

## The cast (3 personas, locked for the whole course)

| Persona | Fish Audio voice | Reference ID |
|---|---|---|
| Maya (host) | Friendly Podcast Host | `57785406027844b29b63a772a8477bc2` |
| Marcus (expert) | Deep | `bb742915b1fa41b389a850b11efae0c8` |
| Jay (student) | Teen (casual young male) | `23c536451dd94b70b0d4ab0e8a630e1d` |

Debate opposition is a rotating guest voice per era. Period 3 guest:
Loyalist (British formal male) `4ded85577e3243dcae310903d0ae75cc`.

## The four examples

| Dir | Format | Cast | Length |
|---|---|---|---|
| `interview/` | Interview (flagship template) | Maya hosts, Marcus expert | 4:41 |
| `debaters/` | Debate | Maya moderates, Loyalist vs Marcus-as-Patriot | 4:37 |
| `study-buddies/` | Study Buddies | Maya + Jay cramming (Jay gets the Townshend year wrong) | 4:39 |
| `story-mode/` | Story Mode | Marcus solo, cinematic | 4:06 |

Each dir holds the authored script (`.txt`, `Speaker: text` lines with Fish emotion tags)
and the finished music mix (`-full.mp3`).

## How they're made

1. **Scripted** — every turn authored by hand (reactions, jokes, interview dynamics included).
2. **Fish Audio** — each turn rendered per-speaker via `build_format.py`
   (`custom.fish-audio` connector, model `s2.1-pro-free`), concatenated with short gaps.
3. **Music** — `build_format.py` mixes with numpy: intro sting, looped bed
   (`papulina-lost-signal-coffee-371869.mp3`, ducked under dialogue),
   chapter stingers at scripted beats, acoustic outro.

```
build_format.py <script.txt> <outname> <gap_sec> <sting_anchor_1> <sting_anchor_2> <Spk=refid> [...]
```

Example:
```
build_format.py u3-l3-DEBATE.txt DEBATE 0.4 'or nothing' 'principle beat price' \
  Maya=57785406027844b29b63a772a8477bc2 \
  Loyalist=4ded85577e3243dcae310903d0ae75cc \
  Patriot=bb742915b1fa41b389a850b11efae0c8
```

Stingers land after the turn containing each anchor phrase. Output: `<outname>-mixed.mp3`
in a working dir under the script name.

## Full curriculum plan

See `CURRICULUM-LAYOUT.md` — every lesson in all 9 periods with its assigned format and rationale.
