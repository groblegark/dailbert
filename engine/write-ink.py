#!/usr/bin/env python3
# write-ink.py <result.json> — take the ink workflow's [{id, svg}] output,
# validate each SVG as real XML, and write the valid ones to strips/<id>.art.svg.
# Anything invalid is skipped (that strip keeps its deterministic template render).
import json, sys, re, os
from xml.dom import minidom

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
result_path = sys.argv[1]

# the task .output wraps the return value under ["result"]; accept either shape
raw = json.load(open(result_path))
items = raw["result"] if isinstance(raw, dict) and "result" in raw else raw
if isinstance(items, str):
    items = json.loads(items)

ok, bad = [], []
for it in items:
    if not it or not it.get("id") or not it.get("svg"):
        bad.append(it.get("id") if it else "?"); continue
    svg = it["svg"]
    m = re.search(r"<svg[\s\S]*</svg>", svg)
    if not m:
        bad.append(it["id"]); continue
    svg = m.group(0)
    try:
        minidom.parseString(svg)
    except Exception as e:
        bad.append(f'{it["id"]} ({e})'); continue
    with open(os.path.join(root, "strips", f'{it["id"]}.art.svg'), "w") as f:
        f.write(svg)
    ok.append(it["id"])

print(f"wrote {len(ok)} valid art.svg; skipped {len(bad)}")
if bad:
    print("skipped:", ", ".join(str(b) for b in bad))
