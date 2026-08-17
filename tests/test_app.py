"""Flask route tests using the test client against a temp data dir.
Run with: pytest -q"""

import json
import os
import sys
import tempfile

import pytest

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE)
sys.path.insert(0, os.path.join(BASE, "app"))

_DATA_ROOT = tempfile.mkdtemp(prefix="isp-test-app-")
os.environ["ISP_HISTORY_DATA"] = _DATA_ROOT
os.environ["ISP_HISTORY_BASE_PATH"] = "/isp-history"

import server  # noqa: E402
import db as dbmod  # noqa: E402

AARNET = {
    "name": "AARNet",
    "slug": "aarnet",
    "birthplace": "Australia (national)",
    "status": "active",
    "website": "https://www.aarnet.edu.au",
    "events": [
        {"kind": "birth", "year": 1990, "date_disp": "1990", "precision": "exact",
         "details": "Australia's first ISP."},
    ],
}

INTERNODE = {
    "name": "Internode",
    "slug": "internode",
    "status": "inactive",
    "events": [
        {"kind": "birth", "year": 1991, "date_disp": "1991", "precision": "exact"},
        {"kind": "death", "year": 2011, "date_disp": "Dec 2011", "precision": "exact"},
    ],
}


def write_isp(data):
    isp_dir = os.path.join(_DATA_ROOT, "isps")
    os.makedirs(isp_dir, exist_ok=True)
    with open(os.path.join(isp_dir, data["slug"] + ".json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def write_transitions(transitions):
    with open(os.path.join(_DATA_ROOT, "transitions.json"), "w", encoding="utf-8") as f:
        json.dump({"transitions": transitions}, f)


@pytest.fixture(autouse=True)
def fresh_data():
    isp_dir = os.path.join(_DATA_ROOT, "isps")
    os.makedirs(isp_dir, exist_ok=True)
    for fn in os.listdir(isp_dir):
        os.remove(os.path.join(isp_dir, fn))
    write_isp(AARNET)
    write_isp(INTERNODE)
    write_transitions([
        {"type": "acquisition", "from": "aarnet", "to": "internode",
         "year": 2005, "date_disp": "2005",
         "refs": [{"kind": "news", "url": "http://example.com/trans"}]},
    ])
    dbmod._store = None
    yield
    dbmod._store = None


@pytest.fixture
def client():
    server.app.config["TESTING"] = True
    return server.app.test_client()


def test_index_and_graph(client):
    assert client.get("/").status_code == 200
    data = client.get("/api/graph").get_json()
    assert "nodes" in data and "edges" in data
    assert len(data["nodes"]) == 2
    for n in data["nodes"]:
        assert n["url"].startswith("/isp-history/")


def test_graph_api_date_precision(client):
    write_isp({
        **AARNET,
        "events": [
            {"kind": "birth", "year": 1990, "date_disp": "c. 1990", "precision": "approx"},
            {"kind": "death", "year": 2001, "date_disp": "by 2001", "precision": "by"},
        ],
    })
    dbmod._store = None
    n = next(n for n in client.get("/api/graph").get_json()["nodes"]
             if n["slug"] == "aarnet")
    assert n["birth"] == 1990
    assert n["birth_precision"] == "approx" and n["birth_disp"] == "c. 1990"
    assert n["death"] == 2001
    assert n["death_precision"] == "by" and n["death_disp"] == "by 2001"


def test_index_tabs_and_vendor_assets(client):
    html = client.get("/").data.decode()
    assert 'id="tab-tree"' in html and 'id="tab-timeline"' in html
    assert 'id="tree-view"' in html and 'id="graph"' in html
    for asset in ("vendor/cytoscape.min.js", "vendor/dagre.min.js",
                  "vendor/cytoscape-dagre.js", "tabs.js", "tree.js", "graph.js"):
        assert asset in html
        assert client.get(f"/static/{asset}").status_code == 200


def test_index_era_overlay_assets(client):
    html = client.get("/").data.decode()
    assert 'id="era-btn"' in html
    assert 'id="era-menu"' in html
    assert "eras.js" in html
    assert client.get("/static/eras.js").status_code == 200


def test_index_tree_toolbar_focus_controls(client):
    html = client.get("/").data.decode()
    assert 'data-isolated' in html
    assert 'id="tree-hint"' in html
    assert 'Enter to focus' in html
    assert 'data-status="active"' in html


def test_tree_toolbar_status_checkbox_group(client):
    html = client.get("/").data.decode()
    assert 'class="checkgroup"' in html
    assert 'data-status="active"' in html
    assert 'data-status="inactive"' in html
    assert 'data-status="unknown"' in html
    assert 'data-isolated' in html


def test_isp_detail_and_404(client):
    assert client.get("/isp/aarnet").status_code == 200
    assert client.get("/isp/does-not-exist").status_code == 404


def test_isp_detail_shows_other_party_and_refs(client):
    html = client.get("/isp/aarnet").data.decode()
    assert "Internode" in html          # the "other" party on the transition
    assert "http://example.com/trans" in html
    # read-only: no edit forms or login controls
    assert "action=" not in html
    assert "/login" not in html


def test_directory_listing(client):
    html = client.get("/directory").data.decode()
    assert 'href="/isp-history/directory"' in client.get("/").data.decode()
    assert 'href="/isp-history/#tree"' in html
    assert 'href="/isp-history/#timeline"' in html
    assert 'href="/isp-history/isp/aarnet"' in html
    assert 'href="/isp-history/isp/internode"' in html
    names = [line.strip() for line in html.splitlines() if 'data-name="' in line]
    keys = [n.split('data-name="')[1].split('"')[0] for n in names]
    assert keys == sorted(keys, key=str.lower), "directory must be alphabetised ignoring case"
    assert "/static/directory.js" in html
    assert client.get("/static/directory.js").status_code == 200


def test_no_admin_or_auth_routes(client):
    for path in ("/login", "/logout", "/isp/new", "/transition/new"):
        assert client.get(path).status_code == 404, f"{path} should be gone"


def test_security_headers_present(client):
    r = client.get("/")
    assert r.headers.get("X-Content-Type-Options") == "nosniff"
    assert r.headers.get("X-Frame-Options") == "DENY"
    assert r.headers.get("Referrer-Policy") == "no-referrer"
    assert "default-src 'self'" in r.headers.get("Content-Security-Policy", "")
    assert "style-src 'self' 'unsafe-inline'" in r.headers["Content-Security-Policy"]