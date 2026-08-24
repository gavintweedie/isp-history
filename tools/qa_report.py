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
import re
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
    active_with_death = []
    year_disp_mismatch = []
    death_disp_mismatch = []
    bad_summary_type = []

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

        # active ISP carrying a death event = contradiction
        if i["status"] == "active" and death(i):
            active_with_death.append(f"{i['name']} (death {death(i)[0].get('date_disp')})")

        # --- start_year / start_disp consistency ---
        for n in i.get("names", []):
            sy = n.get("start_year")
            sd = str(n.get("start_disp", ""))
            if sy is None or not sd:
                continue
            years = re.findall(r"(19\d\d|20[012]\d)", sd)
            if years:
                disp_yr = int(years[-1])
                if abs(sy - disp_yr) >= 2:
                    year_disp_mismatch.append(
                        f"{i['name']} names.start: year={sy} vs disp='{sd}' (gap {abs(sy-disp_yr)}yrs)"
                    )

        # --- birth event year vs date_disp consistency ---
        for e in birth(i):
            b_year = e.get("year")
            bd = str(e.get("date_disp", ""))
            if b_year is None or not bd:
                continue
            years = re.findall(r"(19\d\d|20[012]\d)", bd)
            if years:
                disp_yr = int(years[-1])
                if abs(b_year - disp_yr) >= 2:
                    year_disp_mismatch.append(
                        f"{i['name']} birth: year={b_year} vs disp='{bd}' (gap {abs(b_year-disp_yr)}yrs)"
                    )

        # --- death event year vs date_disp consistency (higher threshold for vague ranges) ---
        for e in death(i):
            dy = e.get("year")
            dd = str(e.get("date_disp", ""))
            if dy is None or not dd:
                continue
            years = re.findall(r"(19\d\d|20[012]\d)", dd)
            if years:
                disp_yr = int(years[-1])
                if abs(dy - disp_yr) >= 5:
                    death_disp_mismatch.append(
                        f"{i['name']} death: year={dy} vs disp='{dd}' (gap {abs(dy-disp_yr)}yrs)"
                    )

    # --- summary type validation ---
    bad_summary_type = []
    for i in by.values():
        s = i.get("summary")
        if s is not None and not isinstance(s, str):
            bad_summary_type.append(f"{i['name']} — summary is {type(s).__name__}, expected str")

    # --- transition ref URL validation ---
    fake_transition_urls = []
    cynosure_as_transition_ref = []
    for t in edges:
        for r in t.get("refs", []):
            url = r.get("url", "")
            if not url:
                continue
            # wildcard URLs that aren't valid Wayback patterns
            if "*" in url and "/cdx/search" not in url and not re.match(
                r"https://web\.archive\.org/web/\*/https?://", url
            ):
                fake_transition_urls.append(url[:80])
            # Cynosure ISP directory used as transition evidence (proves existence, not transition)
            if "cynosure.com.au/isp" in url:
                cynosure_as_transition_ref.append(url[:80])

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
        "year_disp_mismatch": len(year_disp_mismatch),
        "death_disp_mismatch": len(death_disp_mismatch),
        "bad_summary_type": len(bad_summary_type),
        "fake_transition_urls": len(fake_transition_urls),
        "cynosure_as_transition_ref": len(cynosure_as_transition_ref),
        "active_with_death": len(active_with_death),
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
        "year_disp_mismatch": year_disp_mismatch,
        "death_disp_mismatch": death_disp_mismatch,
        "bad_summary_type": bad_summary_type,
        "fake_transition_urls": fake_transition_urls,
        "cynosure_as_transition_ref": cynosure_as_transition_ref,
        "active_with_death": sorted(active_with_death),
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
    print(f"  active ISPs with a death event:       {c['active_with_death']}")
    print(f"  year/date_disp mismatches (birth):    {c['year_disp_mismatch']}")
    print(f"  death date_disp mismatches (≥5yrs):   {c['death_disp_mismatch']}")
    print(f"  bad summary type (not string):        {c['bad_summary_type']}")
    print(f"  fake URLs in transition refs:         {c['fake_transition_urls']}")
    print(f"  Cynosure used as transition ref:      {c['cynosure_as_transition_ref']}")

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

    if year_disp_mismatch:
        show("YEAR/DATE_DISP MISMATCH (birth/names, ≥2yrs)", year_disp_mismatch)
    if death_disp_mismatch:
        show("DEATH DATE_DISP MISMATCH (≥5yrs)", death_disp_mismatch)
    if bad_summary_type:
        show("BAD SUMMARY TYPE", bad_summary_type)
    if fake_transition_urls:
        print(f"\n--- FAKE URLS IN TRANSITION REFS ({len(fake_transition_urls)}) ---")
        for u in fake_transition_urls[:20]:
            print(f"  {u}")
    if cynosure_as_transition_ref:
        print(f"\n--- CYNOSURE USED AS TRANSITION REF ({len(cynosure_as_transition_ref)}) ---")
        for u in cynosure_as_transition_ref[:10]:
            print(f"  {u}")


if __name__ == "__main__":
    main()