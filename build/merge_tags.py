#!/usr/bin/env python3
"""Merge tagging results (skill_code/topic_code) into bank + test JSONs.

String-surgery merge: inserts the two fields right after each item's
"id" line, preserving every other byte (formatting, key order, content).
Same ids, no reordering, no content changes.

Run: python3 build/merge_tags.py [--check]
  --check : verify only -- report which ids would be tagged / are missing.
"""
import glob as g
import json
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(REPO, "build")
CHECK = "--check" in sys.argv


def target_files():
    files = []
    for f in sorted(g.glob(os.path.join(
            BUILD, "reclaim-merged", "staged", "**", "*.json"),
            recursive=True)):
        if "/_raw/" not in f:
            files.append(f)
    for f in sorted(g.glob(os.path.join(BUILD, "fresh-written", "*.json"))):
        files.append(f)
    for f in sorted(g.glob(os.path.join(BUILD, "tests", "test-*.json"))):
        files.append(f)
    for i in (4, 5, 6):
        f = os.path.join(BUILD, "reconceived", f"princeton-t{i}", "test.json")
        if os.path.isfile(f):
            files.append(f)
    return files


def items_in(path, d):
    """Return MCQ item dicts in a file (bank or test layout)."""
    if isinstance(d, list):
        if d and isinstance(d[0], dict) and "stem" in d[0]:
            return d
        return []
    if isinstance(d, dict):
        if "section_1a" in d:  # test file
            return [i for i in d["section_1a"].get("items", [])
                    if isinstance(i, dict)]
        vals = list(d.values())
        if vals and isinstance(vals[0], dict) and "stem" in vals[0] \
                and "options" in vals[0]:
            return vals
        for k in ("items", "questions", "mcqs", "bank"):
            v = d.get(k)
            if isinstance(v, list) and v and isinstance(v[0], dict) \
                    and "stem" in v[0]:
                return v
    return []


def load_tags():
    tags = {}
    for f in sorted(g.glob(os.path.join(BUILD, "tagging", "results",
                                        "batch-*-tags.json"))):
        for r in json.load(open(f)):
            iid = r.get("id")
            if not iid:
                continue
            if iid in tags and tags[iid] != (r.get("skill_code"),
                                             r.get("topic_code")):
                print(f"WARN: conflicting tags for {iid}: "
                      f"{tags[iid]} vs "
                      f"{(r.get('skill_code'), r.get('topic_code'))}")
            tags[iid] = (r.get("skill_code"), r.get("topic_code"))
    return tags


def merge_file(path, tags):
    text = open(path).read()
    try:
        d = json.load(open(path))
    except Exception as e:
        print(f"WARN: {path} not parseable ({e}); skipped")
        return 0
    need = {}
    for it in items_in(path, d):
        if it.get("id") and not it.get("skill_code") \
                and it.get("id") in tags:
            need[it["id"]] = tags[it["id"]]
    if CHECK:
        missing = [it.get("id") for it in items_in(path, d)
                   if it.get("id") and not it.get("skill_code")
                   and it.get("id") not in tags]
        if missing:
            print(f"  {os.path.relpath(path, REPO)}: {len(missing)} ids "
                  f"lack tags: {missing[:5]}")
        return len(need)
    out_lines = []
    n_tagged = 0
    for line in text.split("\n"):
        m = re.match(r'^([ \t]*)"id"\s*:\s*"([^"]+)"\s*(,?)\s*$', line)
        if m and m.group(2) in need:
            indent = m.group(1)
            sc, tc = need[m.group(2)]
            if m.group(3):
                out_lines.append(line)
                out_lines.append(f'{indent}"skill_code": "{sc}",')
                out_lines.append(f'{indent}"topic_code": "{tc}",')
            else:
                out_lines.append(line + ",")
                out_lines.append(f'{indent}"skill_code": "{sc}",')
                out_lines.append(f'{indent}"topic_code": "{tc}"')
            n_tagged += 1
        else:
            out_lines.append(line)
    if n_tagged:
        open(path, "w").write("\n".join(out_lines))
    return n_tagged


def main():
    tags = load_tags()
    print(f"tag results loaded: {len(tags)} unique ids")
    total = 0
    for path in target_files():
        n = merge_file(path, tags)
        total += n
        if n:
            print(f"  {os.path.relpath(path, REPO)}: +{n}")
    print(f"{'would tag' if CHECK else 'tagged'} {total} item occurrences "
          f"across {len(target_files())} files")


if __name__ == "__main__":
    main()
