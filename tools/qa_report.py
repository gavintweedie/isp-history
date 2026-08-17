"""Data quality report for the ISP history dataset.

Usage:
    python3 tools/qa_report.py            # report to stdout
    python3 tools/qa_report.py --json     # machine-readable JSON

Flags a range of data-quality issues so the dataset can be worked on
systematically. This is the "what needs work" checklist for the project.

Data lives in data/ (data/isps/*.json + data/transitions.json). Because
refs are nested inside the entity they back, orphan refs and transitions
with missing endpoints cannot exist in this model — the store fails to load
if a transition references an unknown slug.
"""

import argparse
import json
import os
import sys
from collections import Counter

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE)
sys.path.insert(0, os.path.join(BASE, "app"))
from app import db  # noqa: E402

CYNOSURE_MARKER = "Listed in the Cynosure"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true", help="output JSON")
    args = ap.parse_args()

    by = {r["id"]: r for r in db.all_isps()}
    edges = db.graph_edges()
    by_edges = {}
    for e in edges:
        by_edges.setdefault(e["from"], []).append(e)
        by_edges.setdefault(e["to"], []).append(e)

    def events(isp, kind):
        return [e for e in isp["events"] if e.get("kind") == kind]

    def birth(isp):
        return events(isp, "birth")

    def death(isp):
        return events(isp, "death")

    report = {"counts": {}, "issues": {}}
    report["counts"]["broken_transitions"] = 0  # structurally impossible in JSON model

    placeholders = [i for i in by.values()
                    if (i.get("summary") or "").startswith(CYNOSURE_MARKER)]
    no_birth = []
    birth_by_only = []
    inactive_no_death = []
    unknown_status = []
    leaf_nodes = []
    bad_dates = []
    no_website_active = []

    for i in by.values():
        b = birth(i)
        d = death(i)
        deg = len(by_edges.get(i["id"], []))

        if not b:
            no_birth.append(i["name"])
        elif b[0].get("precision") == "by":
            birth_by_only.append((i["name"], b[0].get("date_disp")))
        elif b[0].get("precision") == "unknown":
            birth_by_only.append((i["name"], "unknown-precision"))

        if i["status"] == "inactive" and not d:
            inactive_no_death.append(i["name"])
        if i["status"] == "unknown":
            unknown_status.append(i["name"])
        if deg == 0:
            leaf_nodes.append(i["name"])

        b_year = b[0].get("year") if b else None
        d_year = d[0].get("year") if d else None
        if b_year and d_year and b_year > d_year:
            bad_dates.append(f"{i['name']} (birth {b_year} > death {d_year})")

        if i["status"] == "active" and not i.get("website"):
            no_website_active.append(i["name"])

    name_counts = Counter(i["name"].lower() for i in by.values())
    dup_names = [n for n, c in name_counts.items() if c > 1]

    report["counts"] = {
        "total_isps": len(by),
        "total_transitions": len(edges),
        "placeholders": len(placeholders),
        "no_birth": len(no_birth),
        "birth_by_only": len(birth_by_only),
        "inactive_no_death": len(inactive_no_death),
        "status_unknown": len(unknown_status),
        "leaf_nodes": len(leaf_nodes),
        "birth_gt_death": len(bad_dates),
        "duplicate_names": len(dup_names),
        "active_no_website": len(no_website_active),
    }

    report["issues"] = {
        "placeholders": sorted(i["name"] for i in placeholders),
        "no_birth": sorted(no_birth),
        "birth_by_only": sorted(birth_by_only),
        "inactive_no_death": sorted(inactive_no_death),
        "status_unknown": sorted(unknown_status),
        "leaf_nodes": sorted(leaf_nodes),
        "birth_gt_death": sorted(bad_dates),
        "duplicate_names": sorted(dup_names),
        "active_no_website": sorted(no_website_active),
    }

    if args.json:
        print(json.dumps(report, indent=2))
        return

    c = report["counts"]
    print("=" * 70)
    print("ISP HISTORY — DATA QUALITY REPORT")
    print("=" * 70)
    print(f"Total ISPs: {c['total_isps']}   Transitions: {c['total_transitions']}")
    print(f"  placeholders (Cynosure by-2002):      {c['placeholders']}")
    print(f"  no birth date:                        {c['no_birth']}")
    print(f"  birth 'by'-only (upper bound):         {c['birth_by_only']}")
    print(f"  inactive but no death event:          {c['inactive_no_death']}")
    print(f"  status unknown:                       {c['status_unknown']}")
    print(f"  leaf nodes (no transitions):          {c['leaf_nodes']}")
    print(f"  birth year > death year:              {c['birth_gt_death']}")
    print(f"  duplicate display names:              {c['duplicate_names']}")
    print(f"  active ISPs with no website:          {c['active_no_website']}")

    def show(label, items, limit=40):
        print(f"\n--- {label} ({len(items)}) ---")
        for it in items[:limit]:
            if isinstance(it, tuple):
                print(f"  {it[0]}  [{it[1]}]")
            else:
                print(f"  {it}")
        if len(items) > limit:
            print(f"  ... and {len(items) - limit} more")

    show("PLACEHOLDERS", report["issues"]["placeholders"])
    show("NO BIRTH DATE", report["issues"]["no_birth"])
    show("BIRTH 'BY'-ONLY", report["issues"]["birth_by_only"])
    show("INACTIVE, NO DEATH", report["issues"]["inactive_no_death"])
    show("STATUS UNKNOWN", report["issues"]["status_unknown"])
    show("BIRTH > DEATH ANOMALIES", report["issues"]["birth_gt_death"])
    show("DUPLICATE NAMES", report["issues"]["duplicate_names"])


if __name__ == "__main__":
    main()