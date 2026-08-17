"""Tests for the JSON data store. Run with: pytest -q"""

import json
import os
import sys
import tempfile

import pytest

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE)
sys.path.insert(0, os.path.join(BASE, "app"))

_DATA_ROOT = tempfile.mkdtemp(prefix="isp-test-data-")
os.environ["ISP_HISTORY_DATA"] = _DATA_ROOT

import app.db as dbmod  # noqa: E402

IINET = {
    "name": "iiNet",
    "slug": "iinet",
    "birthplace": "Perth, WA",
    "status": "inactive",
    "website": "https://www.iinet.net.au",
    "summary": "Perth-based ISP.",
    "names": [
        {"name": "iiNet Holdings", "start_year": 1998, "start_disp": "1998"},
        {"name": "iiNet", "start_year": 1993, "start_disp": "1993"},
    ],
    "aliases": ["iiNet Enterprise"],
    "events": [
        {"kind": "birth", "year": 1993, "date_disp": "1993", "precision": "exact",
         "details": "Founded in Perth."},
        {"kind": "death", "year": 2015, "date_disp": "2015", "precision": "exact"},
    ],
    "refs": [
        {"kind": "wikipedia", "url": "https://en.wikipedia.org/wiki/iiNet", "label": "Wikipedia: iiNet"},
    ],
}

TPG = {
    "name": "TPG Telecom",
    "slug": "tpg-telecom",
    "status": "active",
    "events": [
        {"kind": "birth", "year": 2020, "date_disp": "2020", "precision": "exact"},
    ],
}


def write_isp(data):
    isp_dir = os.path.join(_DATA_ROOT, "isps")
    os.makedirs(isp_dir, exist_ok=True)
    path = os.path.join(isp_dir, data["slug"] + ".json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    return path


def write_transitions(transitions):
    path = os.path.join(_DATA_ROOT, "transitions.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"transitions": transitions}, f)
    return path


@pytest.fixture(autouse=True)
def data_store():
    """A fresh two-ISP dataset before every test."""
    for fn in os.listdir(_DATA_ROOT):
        p = os.path.join(_DATA_ROOT, fn)
        if os.path.isfile(p):
            os.remove(p)
    isp_dir = os.path.join(_DATA_ROOT, "isps")
    if os.path.isdir(isp_dir):
        for fn in os.listdir(isp_dir):
            os.remove(os.path.join(isp_dir, fn))
    write_isp(IINET)
    write_isp(TPG)
    write_transitions([{
        "type": "split", "from": "iinet", "to": "tpg-telecom",
        "arm_label": "100% sold to TPG", "year": 2015, "date_disp": "2015",
    }])
    dbmod._store = None
    yield
    dbmod._store = None


def test_load_sizes_and_ids():
    nodes = dbmod.graph_nodes()
    assert len(nodes) == 2
    assert [n["id"] for n in nodes] == [1, 2]
    assert dbmod.get_isp(1)["slug"] == "iinet"
    assert dbmod.get_isp_by_slug("tpg-telecom")["id"] == 2


def test_birth_year_in_graph_nodes():
    nodes = {r["slug"]: r for r in dbmod.graph_nodes()}
    assert nodes["iinet"]["birth_year"] == 1993
    assert nodes["iinet"]["death_year"] == 2015
    assert nodes["tpg-telecom"]["status"] == "active"


def test_transition_edges_endpoints_are_node_ids():
    nodes = {n["slug"]: n["id"] for n in dbmod.graph_nodes()}
    edges = dbmod.graph_edges()
    assert len(edges) == 1
    e = edges[0]
    assert (e["from"], e["to"]) == (nodes["iinet"], nodes["tpg-telecom"])
    assert e["arm_label"] == "100% sold to TPG"


def test_get_transitions_by_isp():
    iinet = dbmod.get_isp_by_slug("iinet")
    ts = dbmod.get_transitions(iinet["id"])
    assert len(ts) == 1
    assert ts[0]["from_isp"] == iinet["id"]
    assert dbmod.get_transitions(dbmod.get_isp_by_slug("tpg-telecom")["id"]) == ts


def test_references_polymorphic():
    iinet = dbmod.get_isp_by_slug("iinet")
    refs = dbmod.get_references("isp", iinet["id"])
    assert len(refs) == 1
    assert refs[0]["url"].startswith("https://en.wikipedia.org")
    # nested event refs resolve via the batch lookup
    write_isp({**IINET, "events": [
        {**IINET["events"][0],
         "refs": [{"kind": "news", "url": "http://example.com/birth"}]},
        IINET["events"][1],
    ]})
    dbmod._store = None
    iinet = dbmod.get_isp_by_slug("iinet")
    birth = [e for e in iinet["events"] if e["kind"] == "birth"][0]
    got = dbmod.get_references_for_entities("event", [birth["id"]])
    assert got[0]["url"] == "http://example.com/birth"
    # transition refs are isolated from event/isp refs
    write_transitions([{
        "type": "split", "from": "iinet", "to": "tpg-telecom", "year": 2015,
        "refs": [{"kind": "archive", "url": "http://example.com/trans"}],
    }])
    dbmod._store = None
    t = dbmod.graph_edges()[0]
    assert dbmod.get_references_for_entities("transition", [t["id"]])[0]["url"] == "http://example.com/trans"


def test_names_ordered_by_start_year():
    iinet = dbmod.get_isp_by_slug("iinet")
    names = dbmod.get_names(iinet["id"])
    assert [n["name"] for n in names] == ["iiNet", "iiNet Holdings"]


def test_directory_rows_sorted_and_dates():
    rows = dbmod.directory_rows()
    # case-insensitive alphabetical: "iiNet" before "TPG Telecom"
    assert [r["name"] for r in rows] == ["iiNet", "TPG Telecom"]
    assert rows == sorted(rows, key=lambda r: r["name"].lower())
    by_slug = {r["slug"]: r for r in rows}
    assert by_slug["iinet"]["birth_year"] == 1993
    assert by_slug["iinet"]["death_year"] == 2015
    assert by_slug["iinet"]["first_archive"] is None


def test_directory_primary_domain_proxy():
    write_isp({**IINET, "refs": [
        {"kind": "archive", "url": "https://web.archive.org/web/20000101000000/http://www.iinet.net.au/",
         "year": 2000},
    ]})
    dbmod._store = None
    row = next(r for r in dbmod.directory_rows() if r["slug"] == "iinet")
    assert row["first_archive"].startswith("https://web.archive.org")


def test_reload_when_data_changes():
    fp1 = dbmod.store_fingerprint()
    write_isp({**IINET, "website": "https://example.com"})
    assert dbmod.store_fingerprint() != fp1
    assert dbmod.get_isp_by_slug("iinet")["website"] == "https://example.com"


def test_missing_slug_in_transition_raises():
    write_transitions([{"type": "merge", "from": "iinet", "to": "ghost"}])
    dbmod._store = None
    with pytest.raises(KeyError):
        dbmod.graph_edges()