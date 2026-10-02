#!/usr/bin/env python3
"""Assemble the 30-set APUSH SAQ bank from staged reclaimed items + new items.

Reads:
  ~/workspace/apush/build/reclaim-merged/staged/{barrons-2027,princeton-25e,fivesteps-2024}/
  build/tests/saq-bank/new/set-NN.json   (new Q1/Q2/Q3 items, already normalized)
Writes:
  build/tests/saq-bank/set-01.json ... set-30.json

Set file schema:
  {"id": "saq-set-NN", "questions": [Q1 item, Q2 item, Q3 item]}
Item schema keys:
  difficulty, exemplar, id, inspired_by, parts, period, q, reasoning,
  skill, source_type, stimulus, themes, type
  (+ optional pd_candidate / pd_rationale on new Q3 items)

Does NOT commit anything. Does not touch staged/ or books/ (reads only).
"""
import json, re, sys
from pathlib import Path

HOME = Path.home()
STAGED = HOME / "workspace/apush/build/reclaim-merged/staged"
BANK = HOME / "workspace/apush/build/tests/saq-bank"
NEW = BANK / "new"

ITEM_KEYS = {"difficulty", "exemplar", "id", "inspired_by", "parts", "period",
             "q", "reasoning", "skill", "source_type", "stimulus", "themes", "type"}
OPTIONAL_KEYS = {"pd_candidate", "pd_rationale"}
PERIODS = {f"U{i}" for i in range(1, 10)}
QKIND = {"secondary": 1, "primary": 2, "non-text": 3,
         "secondary_text": 1, "primary_text": 2, "non_text": 3}

# reasoning assignments for fivesteps items staged with reasoning: null
REASONING_FIX = {
    "5s24-ch11-saq-01": "Comparison",
    "5s24-ch18-saq-01": "Comparison",
    "5s24-ch19-saq-01": "Comparison",
    "5s24-ch20-saq-01": "Causation",
    "5s24-ch21-saq-01": "Causation",
    "5s24-ch22-saq-01": "Comparison",
    "5s24-ch23-saq-01": "Causation",
    "5s24-ch26-saq-01": "Causation",
    "5s24-ch27-saq-01": "Continuity & Change",
    "5s24-ch28-saq-01": "Continuity & Change",
    "5s24-ch29-saq-01": "Causation",
}

# (set_no) -> [ (source, ref, selector) ... ] in Q1,Q2,Q3 order
# source 'barrons':   ref=filename, selector=question number
# source 'princeton': ref=filename, selector=q tag
# source 'fivesteps': ref=filename, selector=item id ; prefix '!' forces q=2
#                     (exam2-01: TR Winning of the West reclassified Q2)
# source 'new':       ref=set number, selector=q
PLAN = {
    1:  [("barrons","pt1-saq.json",1),("barrons","pt1-saq.json",2),("barrons","pt1-saq.json",3)],
    2:  [("barrons","pt2-saq.json",1),("barrons","pt2-saq.json",2),("barrons","pt2-saq.json",3)],
    3:  [("princeton","saq-test1.json",1),("princeton","saq-test1.json",2),("princeton","saq-test1.json",3)],
    4:  [("princeton","saq-test2.json",1),("new",4,2),("new",4,3)],
    5:  [("princeton","saq-test3.json",1),("princeton","saq-test3.json",2),("new",5,3)],
    6:  [("princeton","saq-drill.json",1),("princeton","saq-drill.json",2),("new",6,3)],
    7:  [("new",7,1),("princeton","saq-ch2.json",2),("princeton","saq-ch2.json",3)],
    8:  [("fivesteps","ch14-saq.json","5s24-ch14-saq-01"),("fivesteps","ch03-saq.json","5s24-ch03-saq-02"),("fivesteps","ch08-saq.json","5s24-ch08-saq-01")],
    9:  [("fivesteps","ch03-saq.json","5s24-ch03-saq-01"),("fivesteps","ch07-saq.json","5s24-ch07-saq-01"),("fivesteps","ch17-saq.json","5s24-ch17-saq-01")],
    10: [("fivesteps","ch09-saq.json","5s24-ch09-saq-01"),("fivesteps","ch16-saq.json","5s24-ch16-saq-01"),("fivesteps","exam2-saq.json","5s24-exam2-saq-03")],
    11: [("fivesteps","ch10-saq.json","5s24-ch10-saq-01"),("fivesteps","ch19-saq.json","5s24-ch19-saq-01"),("fivesteps","ch06-saq.json","5s24-ch06-saq-01")],
    12: [("fivesteps","ch15-saq.json","5s24-ch15-saq-01"),("fivesteps","ch20-saq.json","5s24-ch20-saq-01"),("fivesteps","ch13-saq.json","5s24-ch13-saq-01")],
    13: [("fivesteps","ch11-saq.json","5s24-ch11-saq-01"),("fivesteps","exam2-saq.json","5s24-exam2-saq-02"),("princeton","saq-drill.json",3)],
    14: [("fivesteps","ch21-saq.json","5s24-ch21-saq-01"),("new",14,2),("fivesteps","ch03-saq.json","5s24-ch03-saq-03")],
    15: [("fivesteps","ch26-saq.json","5s24-ch26-saq-01"),("new",15,2),("new",15,3)],
    16: [("fivesteps","ch22-saq.json","5s24-ch22-saq-01"),("new",16,2),("new",16,3)],
    17: [("fivesteps","ch27-saq.json","5s24-ch27-saq-01"),("new",17,2),("new",17,3)],
    18: [("fivesteps","ch23-saq.json","5s24-ch23-saq-01"),("new",18,2),("new",18,3)],
    19: [("fivesteps","ch28-saq.json","5s24-ch28-saq-01"),("new",19,2),("new",19,3)],
    20: [("fivesteps","ch18-saq.json","5s24-ch18-saq-01"),("new",20,2),("new",20,3)],
    21: [("fivesteps","ch29-saq.json","5s24-ch29-saq-01"),("new",21,2),("new",21,3)],
    22: [("fivesteps","exam1-saq.json","5s24-exam1-saq-01"),("new",22,2),("fivesteps","ch12-saq.json","5s24-ch12-saq-01")],
    23: [("princeton","saq-ch2.json",1),("fivesteps","exam2-saq.json","!5s24-exam2-saq-01"),("new",23,3)],
    24: [("new",24,1),("new",24,2),("princeton","saq-test2.json",3)],
    25: [("new",25,1),("new",25,2),("princeton","saq-test3.json",3)],
    26: [("new",26,1),("new",26,2),("new",26,3)],
    27: [("new",27,1),("new",27,2),("new",27,3)],
    28: [("new",28,1),("new",28,2),("new",28,3)],
    29: [("new",29,1),("new",29,2),("new",29,3)],
    30: [("new",30,1),("new",30,2),("fivesteps","exam1-saq.json","5s24-exam1-saq-03")],
}


def load_staged(subdir, filename):
    d = json.load(open(STAGED / subdir / filename))
    if isinstance(d, dict):
        for k in ("items", "questions"):
            if k in d:
                return d[k]
    return d


def base_item(new_id, q):
    return {"id": new_id, "type": "saq", "q": q}


def norm_barrons(raw, set_no, q):
    new_id = f"saq-set-{set_no:02d}-q{q}"
    assert raw["number"] == q, f"barrons number mismatch {raw['number']} != {q}"
    assert set(raw["parts"]) == {"a", "b", "c"} and set(raw["exemplar_points"]) == {"a", "b", "c"}
    stim = raw["stimulus"]
    stim = {"attribution": None, "text": stim} if isinstance(stim, str) else stim
    return {
        **base_item(new_id, q),
        "stimulus": stim,
        "parts": [raw["parts"]["a"], raw["parts"]["b"], raw["parts"]["c"]],
        "exemplar": [raw["exemplar_points"]["a"], raw["exemplar_points"]["b"], raw["exemplar_points"]["c"]],
        "period": raw["period"], "themes": raw["themes"], "skill": raw["skill"],
        "reasoning": raw["reasoning"], "difficulty": raw["difficulty"],
        "source_type": raw["source_type"],
        "inspired_by": f"reclaimed/barrons-2027/{raw.get('_file','?')}",
    }


def norm_princeton(raw, set_no, q):
    new_id = f"saq-set-{set_no:02d}-q{q}"
    assert raw["q"] == q, f"princeton q mismatch {raw['q']} != {q}"
    stim = raw["stimulus"]
    assert isinstance(stim, dict) and "text" in stim
    return {
        **base_item(new_id, q),
        "stimulus": stim,
        "parts": list(raw["parts"]),
        "exemplar": list(raw["exemplar"]),
        "period": raw["period"], "themes": raw["themes"], "skill": raw["skill"],
        "reasoning": raw["reasoning"], "difficulty": raw["difficulty"],
        "source_type": raw["source_type"],
        "inspired_by": raw.get("inspired_by") or f"reclaimed/princeton-25e/{raw['id']}",
    }


def norm_fivesteps(raw, set_no, q, force_q=None):
    new_id = f"saq-set-{set_no:02d}-q{q}"
    qq = force_q or QKIND[raw["source_kind"]]
    assert qq == q, f"fivesteps kind->q {raw['source_kind']}={qq} != planned q{q} for {raw['id']}"
    stim = raw["stimulus"]
    stim = {"attribution": None, "text": stim} if isinstance(stim, str) else stim
    ex = raw["exemplar"]
    if isinstance(ex, str):
        ex = [re.sub(r"^[ABC]\.\s*", "", s).strip()
              for s in ex.split("\n\n")]
    reasoning = raw["reasoning"] or REASONING_FIX.get(raw["id"])
    return {
        **base_item(new_id, q),
        "stimulus": stim,
        "parts": list(raw["parts"]),
        "exemplar": ex,
        "period": raw["period"], "themes": raw["themes"], "skill": raw["skill"],
        "reasoning": reasoning, "difficulty": raw["difficulty"],
        "source_type": raw["source_type"],
        "inspired_by": raw.get("inspired_by") or f"reclaimed/fivesteps-2024/{raw['id']}",
    }


def norm_new(raw, set_no, q):
    assert raw["q"] == q and raw["id"] == f"saq-set-{set_no:02d}-q{q}", \
        f"new item id/q mismatch: {raw['id']} q={raw['q']} for set {set_no} q{q}"
    assert raw["type"] == "saq"
    return dict(raw)


def validate_item(it, where):
    extra = set(it) - ITEM_KEYS - OPTIONAL_KEYS
    missing = ITEM_KEYS - set(it)
    assert not extra, f"{where}: extra keys {extra}"
    assert not missing, f"{where}: missing keys {missing}"
    assert it["q"] in (1, 2, 3), f"{where}: bad q"
    assert it["period"] in PERIODS, f"{where}: bad period {it['period']}"
    assert it["type"] == "saq"
    for k in ("difficulty", "reasoning", "skill", "source_type", "inspired_by"):
        assert it[k], f"{where}: empty {k}"
    assert isinstance(it["themes"], list) and it["themes"], f"{where}: bad themes"
    assert isinstance(it["parts"], list) and len(it["parts"]) == 3 \
        and all(isinstance(p, str) and p.strip() for p in it["parts"]), f"{where}: bad parts"
    assert isinstance(it["exemplar"], list) and len(it["exemplar"]) == 3 \
        and all(isinstance(p, str) and p.strip() for p in it["exemplar"]), f"{where}: bad exemplar"
    assert isinstance(it["stimulus"], dict) and it["stimulus"].get("text", "").strip(), \
        f"{where}: bad stimulus"
    st = it["source_type"]
    if it["q"] == 2:
        assert st == "pd-quote", f"{where}: Q2 must be pd-quote, got {st}"
    elif it["q"] == 3:
        assert st == "original", f"{where}: Q3 must be original, got {st}"
    else:
        assert st in ("paraphrase", "pd-quote", "original"), f"{where}: Q1 bad source_type {st}"


def main():
    cache = {}
    def staged(subdir, filename):
        key = (subdir, filename)
        if key not in cache:
            cache[key] = load_staged(subdir, filename)
        return cache[key]

    new_cache = {}
    def new_items(set_no):
        if set_no not in new_cache:
            d = json.load(open(NEW / f"set-{set_no:02d}.json"))
            new_cache[set_no] = {i["q"]: i for i in d["items"]}
        return new_cache[set_no]

    all_ids = set()
    period_counts = {}
    for set_no in range(1, 31):
        specs = PLAN[set_no]
        assert len(specs) == 3
        questions = []
        for qi, (src, ref, sel) in enumerate(specs, start=1):
            if src == "barrons":
                items = [i for i in staged("barrons-2027", ref) if i["number"] == sel]
                assert len(items) == 1
                it = norm_barrons({**items[0], "_file": ref}, set_no, qi)
            elif src == "princeton":
                items = [i for i in staged("princeton-25e", ref) if i["q"] == sel]
                assert len(items) == 1
                it = norm_princeton(items[0], set_no, qi)
            elif src == "fivesteps":
                force_q = None
                if sel.startswith("!"):
                    force_q, sel = 2, sel[1:]
                items = [i for i in staged("fivesteps-2024", ref) if i["id"] == sel]
                assert len(items) == 1, f"set {set_no}: fivesteps id {sel} not found"
                it = norm_fivesteps(items[0], set_no, qi, force_q)
            elif src == "new":
                it = norm_new(new_items(ref)[sel], set_no, qi)
            else:
                raise AssertionError(f"unknown source {src}")
            assert it["q"] == qi, f"set {set_no}: planned q{qi} but item q={it['q']}"
            validate_item(it, f"set-{set_no:02d} q{qi}")
            assert it["id"] not in all_ids, f"duplicate id {it['id']}"
            all_ids.add(it["id"])
            period_counts[it["period"]] = period_counts.get(it["period"], 0) + 1
            questions.append(it)
        periods = [q["period"] for q in questions]
        assert len(set(periods)) == 3, f"set-{set_no:02d}: periods not distinct: {periods}"
        out = {"id": f"saq-set-{set_no:02d}", "questions": questions}
        with open(BANK / f"set-{set_no:02d}.json", "w") as f:
            json.dump(out, f, indent=2, ensure_ascii=False)
            f.write("\n")
        print(f"set-{set_no:02d}: " + " / ".join(
            f"Q{q['q']} {q['period']} {q['source_type']}" for q in questions))

    print(f"\nWrote 30 sets, {len(all_ids)} unique items.")
    print("Period coverage:", {f"U{i}": period_counts.get(f"U{i}", 0) for i in range(1, 10)})
    # bank-level: every fivesteps reasoning null got a fix?
    print("All validations passed.")


if __name__ == "__main__":
    sys.exit(main())
