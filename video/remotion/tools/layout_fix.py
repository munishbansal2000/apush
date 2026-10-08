#!/usr/bin/env python3
"""Self-correcting layout pass for kit beats (ported from apush-episode-kit).

Takes resolved beats (as produced by map_beats.py) and a render config, then:
- treats chrome (head, box tracker, ribbon, captions, credit) as immovable,
- treats stage components (maps, figures, documents, versus, ...) as immovable,
- moves text/bubble beats that collide or leave the safe area:
    1) other vertical slots from cfg textSlotsY (nearest first, preserving
       reading order within a turn),
    2) smaller text levels via the DOWNGRADE ladder (hero->title->subtitle->body),
    3) x-clamp into bounds.
Every correction is logged (L001/L002/L003 info). Only unfixable cases are
errors (B003/B004). Exclusive-overlay conflicts are B010 (not checked here yet
-- overlays come from the episode plan, not beats_kit.json).

Usage (as a phase inside map_beats.py):
    from layout_fix import resolve_layout
    beats, issues = resolve_layout(beats, cfg)

Or standalone:
    python3 tools/layout_fix.py   # reads/writes src/data/e3/beats_kit.json
"""
import json
import os
import re
import sys
import unicodedata

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
sys.path.insert(0, os.path.join(ROOT, 'tools'))

DOWNGRADE = {'hero': 'title', 'title': 'subtitle', 'subtitle': 'body', 'body': None}
# Stage components, split by text-friendliness:
# - backgrounds (maps/routes/tours) are backdrops: text and bubbles are *meant*
#   to overlay them, and cards sit on them. Transparent to the collision model.
# - cards carry their own text/graphics: nothing may overlap them, and text and
#   bubbles must be placed clear of them.
BACKGROUND_KINDS = {'map', 'route', 'tour'}
CARD_KINDS = {'figure', 'document', 'board', 'question', 'ledger', 'versus',
              'pictogram', 'source', 'range'}
STAGE_KINDS = BACKGROUND_KINDS | CARD_KINDS
DEFAULT_SLOTS_Y = [0.2, 0.34, 0.48, 0.62, 0.71]


def _glyph_em(ch, g):
    if ch == ' ':
        return g['space']
    cat = unicodedata.category(ch)
    if cat == 'Lu':
        return g['upper']
    if cat == 'Ll':
        return g['lower']
    if cat == 'Nd':
        return g['digit']
    return g['other']


def measure_px(text, font_px, g):
    return sum(_glyph_em(ch, g) for ch in text) * font_px


def wrap_by_width(text, max_px, font_px, g):
    out, line = [], ''
    for w in text.split():
        nxt = f'{line} {w}' if line else w
        if not line or measure_px(nxt, font_px, g) <= max_px:
            line = nxt
        else:
            out.append(line)
            line = w
    if line:
        out.append(line)
    return out


def text_rect(text, level, pos, cfg):
    t = cfg['text']
    m = t[level]
    max_px = t['maxWidthFrac'] * cfg['width']
    lines = wrap_by_width(text, max_px, m['fontPx'], t['glyphW'])
    if len(lines) > 1:
        w = t['maxWidthFrac']
    else:
        w = max([measure_px(l, m['fontPx'], t['glyphW']) for l in lines] or [1]) / cfg['width']
    h = len(lines) * m['lineHeight'] * m['fontPx'] / cfg['height']
    w = min(w, 0.9)
    return [pos[0] - w / 2, pos[1] - h / 2, pos[0] + w / 2, pos[1] + h / 2]


def bubble_rect(text, width_px, pos, cfg):
    b = cfg['bubble']
    inner = width_px - 2 * b['paddingPx']
    import math
    nlines = max(1, math.ceil(len(text) / max(1, inner / (b['fontPx'] * b['charW']))))
    # greedy wrap like the renderer
    lines, line = [], ''
    for w in text.split():
        nxt = f'{line} {w}' if line else w
        if not line or len(nxt) * b['fontPx'] * b['charW'] <= inner:
            line = nxt
        else:
            lines.append(line)
            line = w
    if line:
        lines.append(line)
    nlines = len(lines)
    h = (nlines * b['lineHeightPx'] + 2 * b['paddingPx'] + 24) / cfg['height']
    w = width_px / cfg['width']
    return [pos[0] - w / 2, pos[1] - h / 2, pos[0] + w / 2, pos[1] + h / 2]


def intersects(a, b, pad=0):
    return a[0] < b[2] - pad and b[0] < a[2] - pad and a[1] < b[3] - pad and b[1] < a[3] - pad


def inside(r, s):
    return r[0] >= s[0] and r[1] >= s[1] and r[2] <= s[2] and r[3] <= s[3]


def inflate(r, k):
    cx, cy = (r[0] + r[2]) / 2, (r[1] + r[3]) / 2
    hw, hh = (r[2] - r[0]) / 2 * k, (r[3] - r[1]) / 2 * k
    return [cx - hw, cy - hh, cx + hw, cy + hh]


def overlaps_t(a, b):
    return a['start'] < b['end'] and b['start'] < a['end']


def beat_rect(b, cfg):
    """Footprint of a beat, or None for layers that don't occupy layout (bg)."""
    kind = b['kind']
    p = b.get('props', {})
    if kind == 'text':
        return text_rect(p['text'], p.get('level', 'body'), p['position'], cfg)
    if kind == 'bubble':
        return bubble_rect(p['text'], p.get('width', 380), p['position'], cfg)
    if kind == 'bg':
        return None
    if kind == 'figure':
        return list(cfg['figureCard']['rect'])
    # stage components occupy the stage
    return list(cfg['stage'])


def _fmt_rect(r):
    return '[%s]' % ', '.join(f'{v:.2f}' for v in r)


def resolve_layout(beats, cfg):
    """Correct text/bubble beat positions. Returns (beats, issues)."""
    issues = []
    slots_y = cfg.get('textSlotsY') or DEFAULT_SLOTS_Y
    safe = cfg['safe']
    stamp_k = cfg['text'].get('stampOvershoot', 1.0)

    fixed = []
    for cid in ['head', 'boxTracker', 'ribbon', 'captions', 'credit']:
        r = cfg[cid].get('rect')
        if r:
            fixed.append({'id': f'chrome:{cid}', 'role': 'chrome',
                          'rect': list(r), 'start': 0, 'end': 1e9})
    placed = []
    out = []
    final_y = {}  # beat id -> (turn_idx, orig_y, y, start, end)

    def collides(rect, b):
        for o in fixed + placed:
            if overlaps_t(b, o) and intersects(rect, o['rect'], 0.004):
                return o
        return None

    def in_bounds(r):
        return inside(r, safe)

    # Cards first: immovable. Card-on-card overlap is a hard error (B003).
    # Backgrounds (maps/routes/tours) are backdrops: transparent to the model.
    for b in beats:
        if b['kind'] not in CARD_KINDS:
            continue
        box = {'id': f"beat:{b['id']}", 'role': 'stage',
               'rect': beat_rect(b, cfg) or list(cfg['stage']),
               'start': b['start'], 'end': b['end']}
        for o in fixed + placed:
            if o['role'] == 'chrome' or not overlaps_t(box, o):
                continue
            if intersects(box['rect'], o['rect'], 0.005):
                dur = min(box['end'], o['end']) - max(box['start'], o['start'])
                issues.append({'level': 'error', 'code': 'B003',
                               'where': box['id'],
                               'msg': f"card overlaps {o['id']} for {dur:.1f}s (cards cannot move or overlap)"})
        placed.append(box)

    def rect_for(b, pos, level=None):
        p = b.get('props', {})
        if b['kind'] == 'bubble':
            return bubble_rect(p['text'], p.get('width', 380), pos, cfg)
        r = text_rect(p['text'], level or p.get('level', 'body'), pos, cfg)
        if p.get('entrance') == 'stamp':
            r = inflate(r, stamp_k)
        return r

    def clamp_x(r, cx, cfg):
        x0, x1 = r[0], r[2]
        s0, s1 = safe[0], safe[2]
        head_x0 = cfg['head']['rect'][0]
        tracker_x0 = cfg['boxTracker']['rect'][0]
        max_right = min(s1, head_x0, tracker_x0) - 0.005
        if x0 < s0:
            return cx + (s0 - x0) + 0.005
        if x1 > max_right:
            return cx - (x1 - max_right)
        return cx

    for b in beats:
        if b['kind'] not in ('text', 'bubble'):
            out.append(b)  # bg + stage kinds pass through (stage placed above)
            continue
        p = b['props']
        where = f"beat:{b['id']}"
        original = list(p['position'])
        is_text = b['kind'] == 'text'

        def try_place(pos, level=None):
            r = rect_for(b, pos, level)
            return r if in_bounds(r) and not collides(r, b) else None

        rect = try_place(original)
        final_pos = original
        final_level = p.get('level', 'body') if is_text else None

        if rect is None:
            blocker = collides(rect_for(b, original), b)
            reason = (f"overlapped {blocker['id']}" if blocker
                      else f"left the safe area {_fmt_rect(rect_for(b, original))}")
            # reading order: never move a line above one authored above it in this turn
            floor = -1
            for bid, (tidx, orig_y, y, s, e) in final_y.items():
                if (tidx == b.get('turn_idx') and orig_y < original[1]
                        and s < b['end'] and b['start'] < e):
                    floor = max(floor, y)
            ordered_slots = [y for y in slots_y if y > floor]
            ordered_slots.sort(key=lambda y: abs(y - original[1]))
            levels = [final_level]
            l = final_level
            while l and DOWNGRADE.get(l):
                l = DOWNGRADE[l]
                levels.append(l)
            found = False
            ys = ([original[1]] if original[1] > floor else []) + ordered_slots
            for level in levels:
                if found:
                    break
                for y in ys:
                    if found:
                        break
                    right_half = (cfg['figureCard']['rect'][2] + cfg['stage'][2]) / 2
                    for x in [original[0],
                              clamp_x(rect_for(b, [original[0], y], level), original[0], cfg),
                              right_half]:
                        r = try_place([x, y], level)
                        if r:
                            rect, final_pos, final_level = r, [x, y], level
                            found = True
                            break
            if rect is not None and found:
                moved = final_pos[1] != original[1] or final_pos[0] != original[0]
                shrunk = is_text and final_level != p.get('level', 'body')
                code = 'L002' if shrunk else ('L003' if moved and final_pos[1] == original[1] else 'L001')
                issues.append({
                    'level': 'info', 'code': code, 'where': where,
                    'msg': (f"{reason}; auto-{('shrunk to ' + str(final_level) + ' and ') if shrunk else ''}"
                            f"placed at [{final_pos[0]:.2f}, {final_pos[1]:.2f}]"),
                })
            else:
                r = rect_for(b, original)
                blocker2 = collides(r, b)
                issues.append({
                    'level': 'error',
                    'code': 'B003' if blocker2 else 'B004', 'where': where,
                    'msg': f"{reason}; no free slot found at any size. End an overlapping element earlier or cut this beat",
                })
                rect = r

        new_props = dict(p)
        new_props['position'] = [round(final_pos[0], 3), round(final_pos[1], 3)]
        if is_text and final_level:
            new_props['level'] = final_level
        out.append({**b, 'props': new_props})
        placed.append({'id': where, 'role': 'text', 'rect': rect,
                       'start': b['start'], 'end': b['end']})
        final_y[b['id']] = (b.get('turn_idx'), original[1], final_pos[1],
                            b['start'], b['end'])

    return out, issues


def main():
    beats_path = os.path.join(ROOT, 'src', 'data', 'e3', 'beats_kit.json')
    cfg = json.load(open(os.path.join(ROOT, 'src', 'data', 'render-config.json'),
                         encoding='utf-8'))
    beats = json.load(open(beats_path, encoding='utf-8'))
    fixed, issues = resolve_layout(beats, cfg)
    n_moved = sum(1 for i in issues if i['code'] in ('L001', 'L002', 'L003'))
    n_err = sum(1 for i in issues if i['level'] == 'error')
    print(f"layout: {n_moved} auto-corrected, {n_err} errors")
    for i in issues:
        print(f"  [{i['level']}] {i['code']} {i['where']}: {i['msg']}")
    # Corrections always apply (they only move/shrink text that collided).
    # Errors are for the author: fix the beat choreography in map_beats.py.
    json.dump(fixed, open(beats_path, 'w', encoding='utf-8'),
              indent=1, ensure_ascii=False)
    print(f"wrote {beats_path}")
    return 1 if n_err else 0


if __name__ == '__main__':
    sys.exit(main())
