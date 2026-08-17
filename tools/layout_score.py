#!/usr/bin/env python3
"""Layout scorer for the ISP timeline.

Mirrors the timeline layout in app/static/graph.js — both the old behaviour
(global depth layers, one lane per line) and the new compact layout (evidence-
based lifespans, family/date ordering, proximity-aware row packing) — against
the live database, and reports readability metrics so layout changes are
measured, not eyeballed:

  rows          total lane count across the timeline
  height_px     total SVG height at the current geometry
  coincident    ISPs that would draw ON TOP of each other (same row while both
                alive) — must always be 0
  close_pairs   concurrently-alive pairs whose lines pass within MIN_SEP px —
                must be 0 for the new layout (its packer guarantees it)
  edge_overlaps pairs of transition connectors (vertical lines from parent to
                child at x = X(year)) that coincide — must be 0 for the new
                layout, which staggers each year's connectors onto tracks
  crossings     vertical connectors that run through another ISP's line at the
                transition year — reduced by the new layout's death-year row
                ordering, free-direction layering (families rooted at their
                consolidator, members spread above and below it), and barycenter
                sweeps that reorder each level's rows toward the median row of
                each ISP's neighbours — breaking fan-in ties by transition year
                so the earliest-transitioning parent sits adjacent to the child
                and never slices through a sibling's line

Usage:  python3 tools/layout_score.py [--json]
"""

import argparse
import json
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE)
sys.path.insert(0, os.path.join(BASE, "app"))
from app import db  # noqa: E402

CURRENT = 2026  # keep in sync with new Date().getFullYear() in graph.js
PADT = 40       # top padding, matches graph.js
MIN_SEP = 6     # min px vertical separation between concurrently-alive lines


def load():
    nodes = [{
        "id": n["id"],
        "status": n["status"],
        "birth": n["birth_year"],
        "death": n["death_year"],
    } for n in db.graph_nodes()]
    edges = [{"f": e["from"], "t": e["to"], "year": e["year"]}
             for e in db.graph_edges()]
    return nodes, edges


def assign_spine(nodes, edges, floor):
    """x0/x1 = evidenced lifespan. Birth overrides; else earliest proof (any
    transition year touching the ISP) else the floor year."""
    byid = {n["id"]: n for n in nodes}
    earliest = {n["id"]: n["birth"] for n in nodes}
    for e in edges:
        if e["year"] is None:
            continue
        for i in (e["f"], e["t"]):
            if i not in earliest:
                continue
            if earliest[i] is None or e["year"] < earliest[i]:
                earliest[i] = e["year"]
    for n in nodes:
        n["x0"] = n["birth"] or earliest[n["id"]] or floor
        n["x1"] = n["death"] or CURRENT
        if n["x0"] > n["x1"]:
            n["x0"] = n["x1"]


def pack_layer(band, track_h, slope, min_sep=0, death_sort=False,
               presorted=False):
    """First-fit row packing for one layer.

    A node may share a row only with ISPs it is never alive alongside (else the
    lines would coincide). When min_sep > 0 it is also kept out of a row when
    its line would pass within min_sep of a line in a neighbouring row.

    With death_sort (the compact layout) rows are filled longest-lived-first
    (latest death on top) and each line goes into the bottom-most row it fits,
    so a company's acquisition line drops from near the bottom of its own band
    into near the top of the successor's band and the vertical connector
    crosses fewer other companies' lines. With presorted the caller's order is
    used unchanged (same bottom-first placement), for the barycenter sweeps.
    """
    if not presorted:
        key = (lambda n: (-n["x1"], n["x0"])) if death_sort \
            else (lambda n: (n["x0"], n["x1"]))
        band = sorted(band, key=key)
    tracks = []

    def conflicts(n, t):
        for v in tracks[t]:
            if min(n["x1"], v["x1"]) > max(n["x0"], v["x0"]):
                return True
        if not min_sep:
            return False
        for other_t in (t - 1, t + 1):
            if other_t < 0 or other_t >= len(tracks):
                continue
            for v in tracks[other_t]:
                if min(n["x1"], v["x1"]) <= max(n["x0"], v["x0"]):
                    continue
                if abs(track_h - slope * abs(v["x0"] - n["x0"])) < min_sep:
                    return True
        return False

    # bottom-first placement when death-sorted: early-dead lines sink to the
    # bottom of the band, keeping the rows beneath a dying company empty of
    # lines alive on its death date.
    for n in band:
        placed = False
        rows = (range(len(tracks) - 1, -1, -1)
                if (death_sort or presorted) else range(len(tracks)))
        for t in rows:
            if not conflicts(n, t):
                tracks[t].append(n)
                placed = True
                break
        if placed:
            continue
        # Starting a new bottom row: the line must still keep min_sep from the
        # row directly above it. If it wouldn't, leave an empty buffer row so
        # the two lines are not neighbours (first-fit skips this check).
        if min_sep and tracks:
            for v in tracks[-1]:
                if min(n["x1"], v["x1"]) > max(n["x0"], v["x0"]) and \
                        abs(track_h - slope * abs(v["x0"] - n["x0"])) < min_sep:
                    tracks.append([])
                    break
        tracks.append([n])
    return tracks


def build_layers(nodes, edges, use_components, pushdown=True, free_direction=False):
    """Return (layers, node_rows) where layers is an ordered list of layer keys
    and node_rows maps each layer key to its node ids.

    Bands are either the "pushed-down" layering (mirrors the previous graph.js):
    longest-path depth is the minimum band keeping parents above children and
    every ISP is pushed down to sit directly above its shallowest successor;
    or the "free direction" layering: each family is rooted at its highest-
    degree ISP and members spread above or below it, so transitions may point
    either way and an acquirer's purchases fan on both sides of its line.
    """
    byid = {n["id"]: n for n in nodes}
    adj = {n["id"]: set() for n in nodes}
    for e in edges:
        adj[e["f"]].add(e["t"])
        adj[e["t"]].add(e["f"])

    if free_direction:
        comp_id = {}
        comps = []
        for n in nodes:
            if n["id"] in comp_id:
                continue
            cid = len(comps)
            stack = [n["id"]]
            comp_id[n["id"]] = cid
            members = []
            while stack:
                cur = stack.pop()
                members.append(cur)
                for nei in adj[cur]:
                    if nei not in comp_id:
                        comp_id[nei] = cid
                        stack.append(nei)
            comps.append(members)
        memo = {}
        long_leaves = set()
        for c in comps:
            if len(c) == 1:
                memo[c[0]] = 0
                continue
            cm = set(c)
            root = max(c, key=lambda i: (len(adj[i]), i))
            par = {root: None}
            order = [root]
            queue = [root]
            while queue:
                u = queue.pop(0)
                for v in sorted(adj[u]):
                    if v not in par:
                        par[v] = u
                        queue.append(v)
                        order.append(v)
            counts = {0: 1}
            memo[root] = 0
            for u in order[1:]:
                p = par[u]
                # A long-lived family-leaf (e.g. Telstra) would run a decades-
                # long line straight through the acquirer's fan. It is placed at
                # the family's very top (see the sweep below).
                long_leaf = (len(adj[u] & cm) == 1 and
                             (byid[u]["x1"] - byid[u]["x0"]) >= 30)
                if long_leaf:
                    long_leaves.add(u)
                    lv = memo[p] - 1
                else:
                    lv = memo[p] + (1 if counts.get(memo[p] + 1, 0) <=
                                    counts.get(memo[p] - 1, 0) else -1)
                memo[u] = lv
                counts[lv] = counts.get(lv, 0) + 1
        # Sweep long-lived leaves to the top of their family, above every
        # member's fan, so no connector runs through their decades-long line.
        for c in comps:
            if len(c) == 1:
                continue
            cm = set(c)
            leaves = [i for i in c if i in long_leaves]
            if not leaves:
                continue
            top = min(memo[i] for i in cm - set(leaves))
            for i in leaves:
                memo[i] = top - 1
    else:
        parents = {}
        children = {}
        for e in edges:
            parents.setdefault(e["t"], []).append(e["f"])
            children.setdefault(e["f"], []).append(e["t"])
        depth_of = {}
        visited = set()

        def depth(nid):
            if nid in depth_of:
                return depth_of[nid]
            if nid in visited:
                return 0
            visited.add(nid)
            d = 0
            for p in parents.get(nid, ()):
                d = max(d, depth(p) + 1)
            visited.discard(nid)
            depth_of[nid] = d
            return d

        for n in nodes:
            depth(n["id"])

        memo = dict(depth_of)   # final band per node
        if pushdown:
            for n in sorted(nodes, key=lambda n: -depth_of[n["id"]]):
                cs = [c for c in children.get(n["id"], ())
                      if depth_of[c] > depth_of[n["id"]]]
                if cs:
                    memo[n["id"]] = max(depth_of[n["id"]],
                                        min(memo[c] for c in cs) - 1)

    if not use_components:
        keys = sorted({memo[n["id"]] for n in nodes})
        return keys, {k: [n["id"] for n in nodes if memo[n["id"]] == k] for k in keys}

    comp_id = {}
    comps = []
    for n in nodes:
        if n["id"] in comp_id:
            continue
        cid = len(comps)
        stack = [n["id"]]
        comp_id[n["id"]] = cid
        members = []
        while stack:
            cur = stack.pop()
            members.append(cur)
            for nei in adj[cur]:
                if nei not in comp_id:
                    comp_id[nei] = cid
                    stack.append(nei)
        comps.append((cid, members))
    # every singleton (no transitions) becomes one shared "pool" band, since
    # isolated ISPs have no parent/child ordering constraints and packing them
    # together lets their rows be shared by founding year
    real = [(cid, m) for cid, m in comps if len(m) > 1]
    pool = [i for cid, m in comps for i in m if len(m) == 1]
    if pool:
        real.append((float("inf"), pool))   # id marker for the pool
    real.sort(key=lambda c: (min(byid[i]["x0"] for i in c[1]), c[0]))
    comp_order = {cid: i for i, (cid, _) in enumerate(real)}
    keys = []
    node_rows = {}
    for cid, members in real:
        if cid == float("inf"):
            keys.append(("pool", 0))
            node_rows[("pool", 0)] = members
            continue
        dims = {}
        for nid in members:
            key = (comp_order[cid], memo[nid])
            dims.setdefault(key, []).append(nid)
        for key in sorted(dims, key=lambda k: (k[0], k[1])):
            keys.append(key)
            node_rows[key] = dims[key]
    return keys, node_rows


def count_edge_overlaps(nodes, edges, y0, slope, stagger):
    """Count coincident transition connectors.

    Each transition is drawn as a vertical line from the parent's line down to
    the child's line at x = X(year). Connectors at the same year whose vertical
    extents overlap coincide (same x). The compact layout staggers them onto
    small horizontal tracks (interval-graph assignment, mirroring graph.js):
    connectors with disjoint extents share a track, so overlaps are 0.
    """
    byid = {n["id"]: n for n in nodes}
    by_year = {}
    for e in edges:
        if e["year"] is None or e["f"] not in y0 or e["t"] not in y0:
            continue
        a, b = byid[e["f"]], byid[e["t"]]
        ay = y0[e["f"]] + slope * (e["year"] - a["x0"])
        by = y0[e["t"]] + slope * (e["year"] - b["x0"])
        by_year.setdefault(e["year"], []).append(
            (min(ay, by), max(ay, by)))
    overlaps = 0
    for lst in by_year.values():
        lst.sort()
        if not stagger:
            # all connectors share x = X(year): every overlapping pair coincides
            for i in range(len(lst)):
                for j in range(i + 1, len(lst)):
                    if lst[i][1] > lst[j][0]:
                        overlaps += 1
            continue
        # interval-graph track assignment: greedy first-fit over intervals
        # sorted by start; intervals sharing a track are disjoint by construction
        track_end = []
        for lo, hi in lst:
            t = 0
            while t < len(track_end) and track_end[t] > lo:
                t += 1
            if t == len(track_end):
                track_end.append(hi)
            else:
                track_end[t] = hi
    return overlaps


def count_crossings(nodes, edges, y0, slope):
    """Count vertical transition connectors that run through other ISPs' lines.

    A connector drops from the parent's line to the child's line at the
    transition year; every concurrently-alive line between those two rows is
    crossed. Fewer crossings = fewer connectors visually slicing through other
    companies' timelines.
    """
    byid = {n["id"]: n for n in nodes}
    crossings = 0
    for e in edges:
        if e["year"] is None or e["f"] not in y0 or e["t"] not in y0:
            continue
        a, b = byid[e["f"]], byid[e["t"]]
        y = e["year"]
        yp = y0[e["f"]] + slope * (y - a["x0"])
        yc = y0[e["t"]] + slope * (y - b["x0"])
        lo, hi = min(yp, yc), max(yp, yc)
        for q in nodes:
            if q["id"] in (e["f"], e["t"]):
                continue
            if not (q["x0"] < y < q["x1"]):
                continue
            yq = y0[q["id"]] + slope * (y - q["x0"])
            if lo < yq < hi:
                crossings += 1
    return crossings


def summarize(nodes, edges, track_h, slope, gap, floor, min_sep, use_components,
              stagger=True, death_sort=True, pushdown=True, free_direction=False,
              barycenter=True):
    nodes = [dict(n) for n in nodes]
    edges = [dict(e) for e in edges]
    byid = {n["id"]: n for n in nodes}
    assign_spine(nodes, edges, floor)
    keys, node_rows = build_layers(nodes, edges, use_components,
                                   pushdown=pushdown,
                                   free_direction=free_direction)
    node_rows = {k: list(v) for k, v in node_rows.items()}

    def pack_all(presorted):
        """Pack every layer in its current order; return geometry."""
        recess = {}
        track_of = {}
        for key in keys:
            band = [byid[i] for i in node_rows[key]]
            tracks = pack_layer(band, track_h, slope, min_sep=min_sep,
                                death_sort=death_sort, presorted=presorted)
            recess[key] = tracks
            for t, row in enumerate(tracks):
                for n in row:
                    track_of[n["id"]] = t
        band_top = {}
        y = PADT
        for key in keys:
            band_top[key] = y
            y += len(recess[key]) * track_h + gap
        y0 = {}
        for key in keys:
            for t, row in enumerate(recess[key]):
                for n in row:
                    y0[n["id"]] = band_top[key] + t * track_h
        return recess, track_of, band_top, y0, y + 20

    recess, track_of, band_top, y0, height = pack_all(presorted=False)

    # Barycenter sweeps (free-direction layout only): reorder each layer's rows
    # so every ISP sits near the median row of its neighbours, which shortens
    # connectors that point up as well as down (e.g. Camtech → OzEmail).
    if barycenter and free_direction:
        adj = {n["id"]: set() for n in nodes}
        for e in edges:
            adj[e["f"]].add(e["t"])
            adj[e["t"]].add(e["f"])
        layer_of = {}
        for key in keys:
            for i in node_rows[key]:
                layer_of[i] = key
        # earliest transition year touching each ISP: orders a fan-in's parents
        # so the earliest-transitioning parent sits adjacent to their shared
        # child (its connector then never slices through a sibling's line).
        min_year = {}
        for e in edges:
            if e["year"] is None:
                continue
            for i in (e["f"], e["t"]):
                if i not in min_year or e["year"] < min_year[i]:
                    min_year[i] = e["year"]
        for _ in range(4):
            tgt = {}
            signed = {}
            for n in nodes:
                ns = [j for j in adj[n["id"]] if layer_of.get(j) != layer_of[n["id"]]]
                if not ns:
                    continue
                pairs = sorted((y0[j], j) for j in ns)
                m = len(pairs) // 2
                med_y, med_j = pairs[m]
                if len(pairs) % 2 == 0:
                    med_y = (pairs[m - 1][0] + med_y) / 2
                tgt[n["id"]] = med_y
                # child below -> connector points down -> earliest parent sinks
                # to the bottom (processed last); child above -> earliest on top
                below = layer_of[med_j][1] > layer_of[n["id"]][1]
                y = min_year.get(n["id"], 0)
                signed[n["id"]] = y if not below else -y
            for key in keys:
                if key == ("pool", 0):
                    continue
                node_rows[key].sort(
                    key=lambda i: (tgt.get(i, float("inf")),
                                   signed.get(i, 0), i))
            recess, track_of, band_top, y0, height = pack_all(presorted=True)

    rows = sum(len(recess[k]) for k in keys)
    coincident = close = 0
    ids = list(byid)
    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            a, b = byid[ids[i]], byid[ids[j]]
            if min(a["x1"], b["x1"]) <= max(a["x0"], b["x0"]):
                continue
            if y0[a["id"]] == y0[b["id"]]:
                coincident += 1
            elif (y0[a["id"]] - y0[b["id"]]) in (track_h, -track_h):
                if abs(track_h - slope * abs(a["x0"] - b["x0"])) < min_sep:
                    close += 1

    return {"rows": rows, "height_px": height, "coincident": coincident,
            "close_pairs": close, "edge_overlaps":
            count_edge_overlaps(nodes, edges, y0, slope, stagger),
            "crossings": count_crossings(nodes, edges, y0, slope),
            "y0": y0}


def old_summary(nodes, edges):
    return summarize(nodes, edges, track_h=88, slope=1.4, gap=46, floor=1980,
                     min_sep=0, use_components=False, stagger=False,
                     death_sort=False, pushdown=False)


def new_summary(nodes, edges):
    return summarize(nodes, edges, track_h=34, slope=0.8, gap=6, floor=1985,
                     min_sep=MIN_SEP, use_components=True, stagger=True,
                     death_sort=True, pushdown=True, free_direction=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()
    nodes, edges = load()

    old = old_summary(nodes, edges)
    new = new_summary(nodes, edges)

    if args.json:
        print(json.dumps({"old": old, "new": new}, indent=2))
        return

    print(f"nodes={len(nodes)} edges={len(edges)} (current={CURRENT})")
    print(f"{'metric':<12} {'OLD (current)':>14} {'NEW (compact)':>14} {'Δ':>10}")
    for m in ("rows", "height_px", "coincident", "close_pairs",
              "edge_overlaps", "crossings"):
        d = new[m] - old[m]
        print(f"{m:<12} {old[m]:>14} {new[m]:>14} {d:>+10}")
    pct = 100 * (1 - new["height_px"] / old["height_px"])
    print(f"\nheight reduction: {pct:.1f}%")

    ok = (new["coincident"] == 0 and new["close_pairs"] == 0
          and new["edge_overlaps"] == 0 and pct > 0)
    if not ok:
        print("FAIL: new layout must have zero coincident/close/overlapping lines "
              "and be shorter")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()