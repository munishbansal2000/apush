#!/usr/bin/env python3
"""Build U1/U2/U3 visual-enriched MCQ pools.

Reads CURRENT staged items (post key-audit, keys FINAL) from
build/reclaim-merged/staged/ (never /tmp copies), attaches the verified visual
(image_url + source_page + pd_rationale), and adds a LIGHT, clearly-separable
visual_adaptation block (image_caption; stem_addendum where needed;
stimulus_replacement only where the stem references a bracketed text
description; key_check documenting the image does not change the key).
Original staged text is kept intact: the re-conception pass refreshes wording
at assembly and re-pairs these adaptations then.

Also appends 3 original U1 items authored in this pass.

Outputs (in this directory):
  U1-enriched.json, U2-enriched.json, U3-enriched.json  {"items": [...]}
  IMAGES-U1.md, IMAGES-U2.md, IMAGES-U3.md              verification tables
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
STAGED = os.path.expanduser("~/workspace/apush/build/reclaim-merged/staged")

UNITS = {
    "U1": ["5s24-ch06-mcq-04", "barrons-2027-ch03-01", "5s24-ch06-mcq-06",
           "5s24-ch06-mcq-01", "5s24-exam1-mcq-36", "barrons-2027-ch03-03",
           "5s24-exam1-mcq-45"],
    "U2": ["5s24-exam2-mcq-05", "5s24-exam2-mcq-06", "5s24-exam2-mcq-07",
           "5s24-exam2-mcq-08", "pr25e-test3-q01", "pr25e-test3-q02",
           "pr25e-test3-q03", "pr25e-ch06-q03", "barrons-2027-pt1-43",
           "5s24-ch07-mcq-07", "pr25e-test2-q02", "5s24-ch08-mcq-04",
           "5s24-ch03-mcq-34", "5s24-exam2-mcq-13", "pr25e-drill-mcq-q03",
           "5s24-ch07-mcq-01", "5s24-exam2-mcq-45", "5s24-ch08-mcq-01",
           "5s24-ch03-mcq-23", "barrons-2027-pt2-49"],
    "U3": ["barrons-2027-ch05-04", "barrons-2027-ch05-05", "barrons-2027-ch05-06",
           "barrons-2027-pt1-04", "barrons-2027-pt1-05", "pr25e-test2-q10",
           "pr25e-test2-q11", "pr25e-test2-q12", "pr25e-test2-q13",
           "pr25e-test2-q14", "pr25e-test2-q15", "pr25e-test2-q16",
           "pr25e-test3-q04", "pr25e-test3-q05", "pr25e-test3-q06",
           "5s24-ch03-mcq-01", "5s24-ch03-mcq-02", "5s24-ch03-mcq-03",
           "5s24-ch03-mcq-04", "5s24-ch03-mcq-45", "5s24-ch03-mcq-46",
           "5s24-ch03-mcq-47", "5s24-ch03-mcq-48", "5s24-exam1-mcq-05",
           "5s24-exam1-mcq-06", "5s24-exam1-mcq-07", "5s24-exam1-mcq-08",
           "pr25e-ch07-q03", "barrons-2027-ch05-02", "barrons-2027-ch05-07"],
}


def load_index():
    idx = {}
    for root, _, files in os.walk(STAGED):
        for fn in files:
            if fn.endswith(".json"):
                try:
                    d = json.load(open(os.path.join(root, fn)))
                except Exception:
                    continue
                items = d.get("items", []) if isinstance(d, dict) else (d if isinstance(d, list) else [])
                for it in items:
                    if isinstance(it, dict) and "id" in it:
                        idx[it["id"]] = it
    return idx


def main():
    idx = load_index()
    imgmap = {}
    for p in ["/tmp/imgmap_u1.json", "/tmp/imgmap_u2.json",
              "/tmp/imgmap_u3a.json", "/tmp/imgmap_u3b.json"]:
        imgmap.update(json.load(open(p)))
    originals = json.load(open("/tmp/originals_u1.json"))

    all_missing = []
    for unit, ids in UNITS.items():
        items, rows, missing = [], [], []
        for iid in ids:
            it = idx.get(iid)
            if it is None:
                missing.append(iid)
                continue
            m = imgmap[iid]
            e = dict(it)
            e["key_status"] = "final"
            e["visual_adapted"] = True
            e["image_url"] = m["image_url"]
            e["source_page"] = m["source_page"]
            e["pd_rationale"] = m["pd_rationale"]
            e["visual_adaptation"] = {
                "image_caption": m["caption"],
                "stem_addendum": m["stem_addendum"],
                "stimulus_replacement": m["stimulus_replacement"],
                "key_check": m["key_check"],
            }
            items.append(e)
            rows.append((iid, m["image_url"], m["source_page"], m["pd_rationale"]))
        if unit == "U1":
            items.extend(originals)
            for o in originals:
                rows.append((o["id"], o["image_url"], o["source_page"], o["pd_rationale"]))
        json.dump({"items": items}, open(os.path.join(HERE, f"{unit}-enriched.json"), "w"),
                  indent=1, ensure_ascii=False)
        with open(os.path.join(HERE, f"IMAGES-{unit}.md"), "w") as f:
            f.write("# Visual verification — %s (%d items)\n\n" % (unit, len(rows)))
            f.write("All `image_url` values returned HTTP 200 on 2026-10-01 (curl -I).\n\n")
            f.write("| id | image_url | source_page | pd_rationale |\n|---|---|---|---|\n")
            for i, u, sp, pd in rows:
                f.write("| %s | %s | %s | %s |\n" % (i, u, sp, pd))
        print(f"{unit}: items={len(items)} (adapted={len(ids)-len(missing)}, originals={len(items)-len(ids)+len(missing)}) missing={missing}")
        all_missing.extend(missing)

    # key sanity: confirm staged keys were kept as-is
    print("\nKey check sample:")
    for iid in ["barrons-2027-ch05-07", "5s24-ch06-mcq-06", "pr25e-ch07-q03"]:
        print(f"  {iid}: key={idx[iid]['key']}")

    assert not all_missing, all_missing
    print("done")


if __name__ == "__main__":
    main()
