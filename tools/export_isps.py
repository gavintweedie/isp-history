"""Export the legacy SQLite database into per-ISP JSON data files.

This is the one-time migration (and re-import tool) from the old
db/seed.json -> SQLite pipeline to the git-first data layout:

    data/isps/<slug>.json   one file per ISP (names, aliases, events, refs)
    data/transitions.json   all transitions (from/to reference isp slugs)

Usage:
    python3 tools/export_isps.py                     # uses isp_history.db -> data/
    python3 tools/export_isps.py --db old.db --out data/
"""

import argparse
import json
import os
import sqlite3

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _clean(d, keys):
    """Return {k: v for k in keys if v is not None and v != ''}."""
    return {k: d[k] for k in keys if d[k] is not None and d[k] != ""}


def export_isps(db_path, out_dir):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    isps = conn.execute("SELECT * FROM isps ORDER BY slug").fetchall()
    names = conn.execute("SELECT * FROM names ORDER BY isp_id, id").fetchall()
    aliases = conn.execute("SELECT * FROM aliases ORDER BY isp_id, id").fetchall()
    events = conn.execute("SELECT * FROM events ORDER BY isp_id, id").fetchall()
    transitions = conn.execute("SELECT * FROM transitions ORDER BY id").fetchall()
    refs = conn.execute("SELECT * FROM refs ORDER BY id").fetchall()

    name_rows = {}
    for n in names:
        name_rows.setdefault(n["isp_id"], []).append(n)
    alias_rows = {}
    for a in aliases:
        alias_rows.setdefault(a["isp_id"], []).append(a)
    event_rows = {}
    for e in events:
        event_rows.setdefault(e["isp_id"], []).append(e)
    ref_rows = {}
    for r in refs:
        ref_rows.setdefault((r["entity_type"], r["entity_id"]), []).append(r)

    isp_dir = os.path.join(out_dir, "isps")
    os.makedirs(isp_dir, exist_ok=True)

    slug_by_id = {}
    for isp in isps:
        slug_by_id[isp["id"]] = isp["slug"]

    def ref_obj(r):
        return _clean(r, ("kind", "url", "label", "archive_url", "year"))

    for isp in isps:
        obj = {
            "name": isp["name"],
            "slug": isp["slug"],
            "birthplace": isp["birthplace"],
            "status": isp["status"],
            "website": isp["website"],
            "summary": isp["summary"],
        }
        obj = {k: v for k, v in obj.items() if v is not None and v != ""}

        nrows = name_rows.get(isp["id"], [])
        if nrows:
            obj["names"] = [_clean(n, ("name", "start_year", "start_disp", "end_year", "end_disp")) for n in nrows]

        arows = alias_rows.get(isp["id"], [])
        if arows:
            obj["aliases"] = [a["name"] for a in arows]

        erows = event_rows.get(isp["id"], [])
        if erows:
            evs = []
            for e in erows:
                ev = _clean(e, ("kind", "year", "date_disp", "precision", "details"))
                er = ref_rows.get(("event", e["id"]), [])
                if er:
                    ev["refs"] = [ref_obj(r) for r in er]
                evs.append(ev)
            obj["events"] = evs

        irefs = ref_rows.get(("isp", isp["id"]), [])
        if irefs:
            obj["refs"] = [ref_obj(r) for r in irefs]

        path = os.path.join(isp_dir, isp["slug"] + ".json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(obj, f, indent=2, ensure_ascii=False)
            f.write("\n")

    trans_list = []
    for t in transitions:
        to = _clean(t, ("type", "arm_label", "year", "date_disp", "notes"))
        to["from"] = slug_by_id[t["from_isp"]]
        to["to"] = slug_by_id[t["to_isp"]]
        tr = ref_rows.get(("transition", t["id"]), [])
        if tr:
            to["refs"] = [ref_obj(r) for r in tr]
        trans_list.append(to)

    with open(os.path.join(out_dir, "transitions.json"), "w", encoding="utf-8") as f:
        json.dump({"transitions": trans_list}, f, indent=2, ensure_ascii=False)
        f.write("\n")

    conn.close()
    return len(isps), len(trans_list), len(refs)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=os.path.join(BASE_DIR, "isp_history.db"))
    ap.add_argument("--out", default=os.path.join(BASE_DIR, "data"))
    args = ap.parse_args()
    n_isps, n_trans, n_refs = export_isps(args.db, args.out)
    print(f"Exported {n_isps} ISPs, {n_trans} transitions, {n_refs} refs "
          f"to {args.out}")


if __name__ == "__main__":
    main()
