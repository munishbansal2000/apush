#!/usr/bin/env python3
"""Normalize skill/reasoning tags in test-*.json (finisher pass).

- '&' vs 'and' variants -> canonical '&' forms.
- reasoning value that is actually a skill (data error) -> move to skill, reasoning='?'.
- '?' / missing reasoning -> keyword inference from stem (then manual review list).
- '?' / missing skill -> keyword inference from stem+stimulus (then manual review list).
Writes normalized files back; prints items still unresolvable for hand review.
"""
import json, glob, os, re, collections

TESTS = os.path.expanduser("~/workspace/apush/build/tests")

SKILL_MAP = {
    "developments & processes": "Developments & Processes",
    "developments and processes": "Developments & Processes",
    "sourcing & situation": "Sourcing & Situation",
    "sourcing and situation": "Sourcing & Situation",
    "claims & evidence in sources": "Claims & Evidence in Sources",
    "claims and evidence in sources": "Claims & Evidence in Sources",
    "contextualization": "Contextualization",
    "making connections": "Making Connections",
    "argumentation": "Argumentation",
}
REASON_MAP = {
    "causation": "Causation",
    "comparison": "Comparison",
    "continuity & change": "Continuity & Change",
    "continuity and change": "Continuity & Change",
    "contextualization": "Contextualization",  # staged sometimes puts this in reasoning
}
SKILLS = set(SKILL_MAP.values())

def infer_reasoning(stem):
    s = stem.lower()
    if re.search(r"\bcompar|\bdiffer|\bsimilar|\bboth\b|\bcontrast|\blikewise\b|\bwhereas\b"
                 r"|\bmost directly\b.*\b(illustrates|echoes|continues|resembles)\b"
                 r"|\bbest illustrates\b|\bexemplif", s):
        return "Comparison"
    if re.search(r"\bcontinu|\bchang|\bremain|\bover time\b|\bevol|\btransform", s):
        return "Continuity & Change"
    if re.search(r"\bwhy\b|\bbecause\b|\bled to\b|\bresult|\beffect\b|\bcaus|\barose\b|\bdue to\b"
                 r"|\bprompted\b|\bcontributed\b|\bin response to\b|\bgave rise\b|\bdemonstrated that\b"
                 r"|\bshowed that\b|\breflected\b|\bevidence\b|\bexcept\b|\breason\b|\bmotivated\b", s):
        return "Causation"
    # pure identification among alternatives -> Comparison (distinguishing options)
    if re.search(r"\bbest describes\b|\bwas\b|\bwere\b|\brefers to\b|\bmeant\b|\bdescribed as\b", s):
        return "Comparison"
    return None

def infer_skill(stem, has_stimulus):
    s = stem.lower()
    if has_stimulus and re.search(r"\bcartoon\b|\bimage\b|\bmap\b|\bphotograph\b|\bpainting\b"
                                 r"|\bposter\b|\bengraving\b|\bportrait\b", s):
        # question is ABOUT the visual or uses it as evidence
        if re.search(r"\bcriticizes\b|\bportrayal\b|\bcirculate\b|\bpurpose\b|\baudience\b"
                     r"|\bpoint of view\b|\bwould\b.*\buse\b", s):
            return "Sourcing & Situation"
    if re.search(r"\bbest supported\b|\bbest describes\b|\bwhich claim\b|\bevidence\b"
                 r"|\bhistorian\b.*\buse\b|\buse\b.*\bto study\b|\brests\b.*\bargument\b", s):
        return "Claims & Evidence in Sources"
    if re.search(r"\bcontext\b|\bbroader\b", s):
        return "Contextualization"
    if re.search(r"\bsimilar\b|\bcontinued\b|\bechoed\b|\bacross\b.*\b(time|period)\b|\bcompared to\b", s):
        return "Making Connections"
    if re.search(r"\bbest describes\b|\bwas\b|\bwere\b|\bEXCEPT\b|\bwhich of the following\b", s):
        return "Developments & Processes"
    return None

need_hand = []
for f in sorted(glob.glob(os.path.join(TESTS, "test-*.json"))):
    d = json.load(open(f))
    for m in d["section_1a"]["items"]:
        # skill normalize
        sk = (m.get("skill") or "").strip()
        if sk.lower() in SKILL_MAP:
            m["skill"] = SKILL_MAP[sk.lower()]
        elif not sk or sk == "?" or sk.lower() == "none":
            inf = infer_skill(m["stem"], bool(m.get("stimulus")))
            if inf: m["skill"] = inf
            else: need_hand.append((d["id"], m["id"], "skill", m["stem"][:90]))
        # reasoning normalize
        rs = (m.get("reasoning") or "").strip()
        if rs.lower() in SKILL_MAP and rs.lower() not in REASON_MAP:
            # data error: skill value sitting in reasoning field
            m["skill"] = SKILL_MAP[rs.lower()]
            rs = ""
        if rs.lower() in REASON_MAP:
            m["reasoning"] = REASON_MAP[rs.lower()]
        elif not rs or rs == "?" or rs.lower() == "none":
            inf = infer_reasoning(m["stem"])
            if inf: m["reasoning"] = inf
            else: need_hand.append((d["id"], m["id"], "reasoning", m["stem"][:90]))
    for q in d["section_1b"]["questions"]:
        sk = (q.get("skill") or "").strip()
        if sk.lower() in SKILL_MAP: q["skill"] = SKILL_MAP[sk.lower()]
        rs = (q.get("reasoning") or "").strip()
        if rs.lower() in REASON_MAP: q["reasoning"] = REASON_MAP[rs.lower()]
        elif not rs or rs == "?":
            inf = infer_reasoning(" ".join(q.get("parts", [])))
            q["reasoning"] = inf or "?"
            if not inf: need_hand.append((d["id"], q["id"], "reasoning", " ".join(q.get("parts", []))[:90]))
    json.dump(d, open(f, "w"), indent=1)

print("items needing hand review:", len(need_hand))
for t, i, k, s in need_hand:
    print(f"  {t} {i} [{k}] {s}")
