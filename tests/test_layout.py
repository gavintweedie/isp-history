"""Tests for the timeline layout scorer (tools/layout_score.py).

These are hermetic: they exercise the layout algorithm on small synthetic
graphs rather than the (gitignored) live database, so they run in CI without a
data file. The live-data before/after numbers are reported by running
`python3 tools/layout_score.py` directly.
"""

import importlib.util
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

_spec = importlib.util.spec_from_file_location(
    "layout_score", os.path.join(BASE, "tools", "layout_score.py"))
ls = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ls)


def test_pool_shares_rows_without_overlap():
    # three unrelated ISPs with non-overlapping-ish lives share a pool band;
    # nothing may coincide and lines never come closer than MIN_SEP.
    nodes = [
        {"id": 1, "birth": 1990, "death": 2000, "status": "inactive"},
        {"id": 2, "birth": 2005, "death": 2010, "status": "inactive"},
        {"id": 3, "birth": 1995, "death": 1998, "status": "inactive"},
    ]
    s = ls.summarize(nodes, [], track_h=34, slope=0.8, gap=6, floor=1985,
                     min_sep=6, use_components=True)
    assert s["coincident"] == 0
    assert s["close_pairs"] == 0
    assert s["rows"] == 2   # ISP 2 (2005-2010) shares row 0 with ISP 1


def test_family_parent_above_child():
    # acquisition chain: parent must sit in a row above its child.
    nodes = [
        {"id": 1, "birth": 1990, "death": 2000, "status": "inactive"},
        {"id": 2, "birth": 1996, "death": 1998, "status": "inactive"},
    ]
    edges = [{"f": 1, "t": 2, "year": 1997}]
    s = ls.summarize(nodes, edges, track_h=34, slope=0.8, gap=6, floor=1985,
                     min_sep=6, use_components=True)
    assert s["coincident"] == 0 and s["close_pairs"] == 0
    assert s["y0"][1] < s["y0"][2]


def test_min_sep_guard_adds_a_row_for_close_parallels():
    # Two concurrently-alive ISPs born 40 years apart in adjacent rows would
    # pass within MIN_SEP of each other (34 - 0.8*|x0 diff| < 6 when diff ~40).
    # The packer must push them apart so the constraint is never violated.
    nodes = [
        {"id": 1, "birth": 1980, "death": 2026, "status": "active"},
        {"id": 2, "birth": 2020, "death": 2026, "status": "active"},
        {"id": 3, "birth": 1985, "death": 1990, "status": "inactive"},
    ]
    s = ls.summarize(nodes, [], track_h=34, slope=0.8, gap=6, floor=1985,
                     min_sep=6, use_components=True)
    assert s["coincident"] == 0
    assert s["close_pairs"] == 0


def test_fan_in_connectors_staggered_per_year():
    # Five parents absorbed into one child in the same year: the vertical
    # connectors all end on the same line, so unstaggered they coincide.
    # The stagger (mirror of graph.js) must push them onto distinct tracks.
    nodes = [
        {"id": 1, "birth": 1990, "death": 2000, "status": "inactive"},
        {"id": 2, "birth": 1991, "death": 2000, "status": "inactive"},
        {"id": 3, "birth": 1992, "death": 2000, "status": "inactive"},
        {"id": 4, "birth": 1993, "death": 2000, "status": "inactive"},
        {"id": 5, "birth": 1994, "death": 2000, "status": "inactive"},
        {"id": 9, "birth": 1990, "death": 2010, "status": "inactive"},
    ]
    edges = [{"f": i, "t": 9, "year": 1998} for i in range(1, 6)]
    s = ls.summarize(nodes, edges, track_h=34, slope=0.8, gap=6, floor=1985,
                     min_sep=6, use_components=True, stagger=True)
    s0 = ls.summarize(nodes, edges, track_h=34, slope=0.8, gap=6, floor=1985,
                      min_sep=6, use_components=True, stagger=False)
    assert s0["edge_overlaps"] > 0
    assert s["edge_overlaps"] == 0


def test_connector_stagger_reuses_tracks_for_disjoint_ranges():
    # Two transitions at the same year whose vertical spans are disjoint (one
    # high, one low) can share a track: staggering must not report overlaps.
    nodes = [
        {"id": 1, "birth": 1990, "death": 1995, "status": "inactive"},
        {"id": 2, "birth": 1993, "death": 1995, "status": "inactive"},
        {"id": 3, "birth": 1998, "death": 2005, "status": "inactive"},
        {"id": 4, "birth": 2001, "death": 2005, "status": "inactive"},
    ]
    edges = [{"f": 1, "t": 2, "year": 1994}, {"f": 3, "t": 4, "year": 2002}]
    s = ls.summarize(nodes, edges, track_h=34, slope=0.8, gap=6, floor=1985,
                     min_sep=6, use_components=True, stagger=True)
    assert s["edge_overlaps"] == 0
    assert s["rows"] >= 2  # distinct life-spans stay separate


def test_death_sort_cuts_connector_crossings():
    # P (dies 2005) and Q (dies 2010) both feed C. Birth-sorting puts the
    # longer-lived Q below P, so P→C's connector at 2005 runs through Q's line.
    # Death-sorting (later death on top) puts Q above P and avoids the crossing.
    nodes = [
        {"id": 1, "birth": 1980, "death": 2005, "status": "inactive"},
        {"id": 2, "birth": 1985, "death": 2026, "status": "active"},
        {"id": 3, "birth": 1990, "death": 2010, "status": "inactive"},
    ]
    edges = [{"f": 1, "t": 2, "year": 2005}, {"f": 3, "t": 2, "year": 2010}]
    birth = ls.summarize(nodes, edges, track_h=34, slope=0.8, gap=6, floor=1985,
                         min_sep=6, use_components=True, stagger=True,
                         death_sort=False)
    death = ls.summarize(nodes, edges, track_h=34, slope=0.8, gap=6, floor=1985,
                         min_sep=6, use_components=True, stagger=True,
                         death_sort=True)
    assert birth["crossings"] > death["crossings"]
    assert death["crossings"] == 0
    assert death["close_pairs"] == 0 and death["edge_overlaps"] == 0


def test_pushdown_groups_acquisitions_below_their_acquirer():
    # C sits at depth 2 (via A→B→C) but directly acquires the depth-0 P1 in
    # 1998. Longest-path depth alone would make the P1→C connector run down
    # through B and Q's band. Pushing P1 down to sit directly above C keeps the
    # connector short, without ever inverting a parent above its child.
    nodes = [
        {"id": 1, "birth": 1988, "death": 2005, "status": "inactive"},  # A
        {"id": 2, "birth": 1992, "death": 2010, "status": "inactive"},  # B
        {"id": 3, "birth": 1990, "death": 2026, "status": "active"},   # C
        {"id": 4, "birth": 1992, "death": 1998, "status": "inactive"}, # P1
        {"id": 5, "birth": 1993, "death": 2002, "status": "inactive"}, # Q
        {"id": 6, "birth": 1999, "death": 2010, "status": "inactive"}, # W
    ]
    edges = [{"f": 1, "t": 2, "year": 2005}, {"f": 2, "t": 3, "year": 2010},
             {"f": 4, "t": 3, "year": 1998}, {"f": 5, "t": 6, "year": 2002}]
    kw = dict(track_h=34, slope=0.8, gap=6, floor=1985, min_sep=6,
              use_components=True, stagger=True, death_sort=True)
    depth_l = ls.summarize(nodes, edges, pushdown=False, **kw)
    pushed = ls.summarize(nodes, edges, pushdown=True, **kw)
    assert depth_l["crossings"] > pushed["crossings"]
    assert pushed["crossings"] == 0
    assert pushed["close_pairs"] == 0 and pushed["edge_overlaps"] == 0


def test_free_direction_splits_acquisitions_above_and_below():
    # Six ISPs acquired by E. The free-direction layering roots the family at E
    # (its highest-degree ISP) and spreads the purchases on both sides of its
    # line, so transitions may point up or down. All layout invariants still
    # hold.
    nodes = [
        {"id": i, "birth": 1990 + i, "death": 1998 + i, "status": "inactive"}
        for i in range(1, 7)]
    nodes += [
        {"id": 10, "birth": 1988, "death": 2026, "status": "active"},  # E
        {"id": 11, "birth": 1995, "death": 2026, "status": "active"},  # F
    ]
    edges = [{"f": i, "t": 10, "year": 1998 + i} for i in range(1, 7)]
    edges.append({"f": 10, "t": 11, "year": 2020})
    kw = dict(track_h=34, slope=0.8, gap=6, floor=1985, min_sep=6,
              use_components=True, stagger=True, death_sort=True)
    s = ls.summarize(nodes, edges, pushdown=True, free_direction=True, **kw)
    y0 = s["y0"]
    assert s["coincident"] == 0 and s["close_pairs"] == 0
    assert s["edge_overlaps"] == 0
    above = [i for i in range(1, 7) if y0[i] < y0[10]]
    below = [i for i in range(1, 7) if y0[i] > y0[10]]
    assert above and below  # purchases land on both sides of the acquirer


def test_barycenter_sweep_shortens_connectors():
    # The free-direction layout leaves some connectors pointing up. The
    # barycenter sweeps reorder rows within each level so every ISP sits near
    # the median row of its neighbours, which shortens those connectors without
    # touching any layout invariant.
    nodes = [
        {"id": 1, "birth": 1988, "death": 1995, "status": "inactive"},
        {"id": 2, "birth": 1993, "death": 2002, "status": "inactive"},
        {"id": 3, "birth": 1990, "death": 2000, "status": "inactive"},
        {"id": 4, "birth": 1985, "death": 1990, "status": "inactive"},
        {"id": 5, "birth": 1996, "death": 2000, "status": "inactive"},
        {"id": 6, "birth": 1985, "death": 1995, "status": "inactive"},
        {"id": 7, "birth": 1994, "death": 2006, "status": "inactive"},
    ]
    edges = [{"f": 5, "t": 7, "year": 2011}, {"f": 2, "t": 7, "year": 1993},
             {"f": 7, "t": 4, "year": 2009}, {"f": 7, "t": 2, "year": 1992},
             {"f": 5, "t": 4, "year": 1997}]
    kw = dict(track_h=34, slope=0.8, gap=6, floor=1985, min_sep=6,
              use_components=True, stagger=True, death_sort=True, pushdown=True,
              free_direction=True)
    off = ls.summarize(nodes, edges, barycenter=False, **kw)
    on = ls.summarize(nodes, edges, barycenter=True, **kw)
    assert on["crossings"] < off["crossings"]
    assert on["coincident"] == 0 and on["close_pairs"] == 0
    assert on["edge_overlaps"] == 0
    # deterministic across runs
    again = ls.summarize(nodes, edges, barycenter=True, **kw)
    assert again["y0"] == on["y0"]


def test_fan_in_orders_earliest_parent_adjacent_to_child():
    # Three parents feed the same child. On each side of the child, the
    # earliest-transitioning parent must sit closest to it, so its connector at
    # an early year never slices through a later sibling's line (the Simtex /
    # EON / Highway 1 pattern).
    nodes = [
        {"id": 1, "birth": 1992, "death": 1997, "status": "inactive"},  # P1
        {"id": 2, "birth": 1994, "death": 2002, "status": "inactive"},  # P2
        {"id": 3, "birth": 1996, "death": 2005, "status": "inactive"},  # P3
        {"id": 9, "birth": 1990, "death": 2015, "status": "inactive"},  # C
    ]
    edges = [{"f": 1, "t": 9, "year": 1997}, {"f": 2, "t": 9, "year": 2002},
             {"f": 3, "t": 9, "year": 2005}]
    kw = dict(track_h=34, slope=0.8, gap=6, floor=1985, min_sep=6,
              use_components=True, stagger=True, death_sort=True, pushdown=True,
              free_direction=True)
    s = ls.summarize(nodes, edges, **kw)
    y0 = s["y0"]
    assert s["crossings"] == 0
    assert s["coincident"] == 0 and s["close_pairs"] == 0
    assert s["edge_overlaps"] == 0
    cy = y0[9]
    years = {1: 1997, 2: 2002, 3: 2005}
    side = {p: ("above" if y0[p] < cy else "below") for p in (1, 2, 3)}
    for p in (1, 2, 3):
        peers = [q for q in (1, 2, 3) if side[q] == side[p]]
        closest = min(peers, key=lambda q: abs(y0[q] - cy))
        assert years[closest] == min(years[q] for q in peers)


def test_long_lived_family_leaf_sits_at_family_edge():
    # A family-leaf whose line spans 30+ years (e.g. Telstra) would run a
    # decades-long line straight through the family's acquisition fan if placed
    # beside its parent. It is swept to the very top of its family.
    nodes = [
        {"id": 1, "birth": 1995, "death": 2010, "status": "inactive"},  # P
        {"id": 2, "birth": 1990, "death": 2026, "status": "active"},   # L
        {"id": 3, "birth": 2000, "death": 2005, "status": "inactive"}, # S
        {"id": 4, "birth": 1992, "death": 2008, "status": "inactive"}, # Q
    ]
    edges = [{"f": 2, "t": 1, "year": 2010}, {"f": 3, "t": 1, "year": 2005},
             {"f": 4, "t": 1, "year": 2008}]
    kw = dict(track_h=34, slope=0.8, gap=6, floor=1985, min_sep=6,
              use_components=True, stagger=True, death_sort=True, pushdown=True,
              free_direction=True)
    s = ls.summarize(nodes, edges, **kw)
    y0 = s["y0"]
    assert s["coincident"] == 0 and s["close_pairs"] == 0
    assert s["edge_overlaps"] == 0
    assert y0[2] == min(y0.values())   # long-lived leaf is the family's top row
    assert y0[3] > y0[1] or y0[4] > y0[1]  # short leaves free to go below
